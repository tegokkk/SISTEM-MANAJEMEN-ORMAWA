import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireTenantRole } from '../../middleware/role.guard';
import { prisma } from '../../core/prisma';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { paginationFrom, parseId, requireTenantContext } from '../../utils/request';
import { serialize } from '../../utils/serialize';
import { writeAudit } from '../../services/audit.service';
import { privateUpload, withPrivateFile } from '../../services/private-file.service';
import { moneySummary } from '../../utils/money';
import { csvCell } from '../../utils/csv';

const router = Router();
router.use(requireAuth, requireTenantRole(['ORMAWA_ADMIN', 'HMJ_ADMIN', 'HIMA_ADMIN']));

const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(['INCOME', 'EXPENSE', 'BOTH']),
  description: z.string().trim().max(255).optional().or(z.literal('')),
});
const transactionSchema = z.object({
  transactionNumber: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .transform((v) => v.toUpperCase()),
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().regex(/^\d+$/),
  workProgramId: z.string().regex(/^\d+$/).optional().nullable(),
  transactionDate: z.coerce.date(),
  amount: z.coerce.number().positive().max(9999999999999999),
  description: z.string().trim().min(3).max(500),
  paymentMethod: z.string().trim().max(60).optional().or(z.literal('')),
});
const transactionFilterSchema = z
  .object({
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
    status: z.enum(['DRAFT', 'POSTED', 'VOID']).optional(),
    categoryId: z.string().regex(/^\d+$/).optional(),
    workProgramId: z.string().regex(/^\d+$/).optional(),
    dateFrom: z.iso.date().optional(),
    dateTo: z.iso.date().optional(),
  })
  .refine(({ dateFrom, dateTo }) => !dateFrom || !dateTo || dateFrom <= dateTo, {
    message: 'Tanggal awal tidak boleh melewati tanggal akhir',
    path: ['dateTo'],
  });
type TransactionFilters = z.infer<typeof transactionFilterSchema>;

function transactionWhere(tenantId: bigint, filters: TransactionFilters) {
  return {
    tenant_id: tenantId,
    transaction_type: filters.type,
    status: filters.status,
    category_id: filters.categoryId ? BigInt(filters.categoryId) : undefined,
    work_program_id: filters.workProgramId ? BigInt(filters.workProgramId) : undefined,
    transaction_date: transactionDateFilter(filters.dateFrom, filters.dateTo),
  };
}

export function transactionDateFilter(dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return undefined;
  const range: { gte?: Date; lt?: Date } = {};
  if (dateFrom) range.gte = new Date(`${dateFrom}T00:00:00.000Z`);
  if (dateTo) {
    range.lt = new Date(`${dateTo}T00:00:00.000Z`);
    range.lt.setUTCDate(range.lt.getUTCDate() + 1);
  }
  return range;
}

router.get('/categories', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const items = await prisma.transaction_categories.findMany({
    where: { tenant_id: BigInt(tenant.id) },
    orderBy: { name: 'asc' },
  });
  res.json(ApiResponse.success(serialize(items)));
});

router.post('/categories', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const input = categorySchema.parse(req.body);
  const item = await prisma.transaction_categories.create({
    data: {
      tenant_id: BigInt(tenant.id),
      name: input.name,
      transaction_type: input.type,
      description: input.description || null,
    },
  });
  res.status(201).json(ApiResponse.success(serialize(item), 'Kategori berhasil dibuat'));
});

router.patch('/categories/:id', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const input = categorySchema
    .partial()
    .extend({ isActive: z.boolean().optional() })
    .parse(req.body);
  const current = await prisma.transaction_categories.findFirst({
    where: { id, tenant_id: BigInt(tenant.id) },
  });
  if (!current) throw new ApiError(404, 'Kategori tidak ditemukan');
  const item = await prisma.transaction_categories.update({
    where: { id },
    data: {
      name: input.name,
      transaction_type: input.type,
      description: input.description === '' ? null : input.description,
      is_active: input.isActive,
    },
  });
  res.json(ApiResponse.success(serialize(item), 'Kategori berhasil diperbarui'));
});

router.get('/transactions', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const { page, limit, skip } = paginationFrom(req);
  const filters = transactionFilterSchema.parse(req.query);
  const where = transactionWhere(BigInt(tenant.id), filters);
  const [items, total] = await Promise.all([
    prisma.financial_transactions.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ transaction_date: 'desc' }, { id: 'desc' }],
      include: {
        transaction_categories: { select: { name: true } },
        work_programs: { select: { name: true } },
      },
    }),
    prisma.financial_transactions.count({ where }),
  ]);
  res.json(
    ApiResponse.success(serialize(items), 'Transaksi berhasil dimuat', {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }),
  );
});

router.get('/transactions/export', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const filters = transactionFilterSchema.parse(req.query);
  const items = await prisma.financial_transactions.findMany({
    where: { ...transactionWhere(BigInt(tenant.id), filters), status: 'POSTED' },
    take: 10001,
    orderBy: [{ transaction_date: 'desc' }, { id: 'desc' }],
    include: {
      transaction_categories: { select: { name: true } },
      work_programs: { select: { name: true } },
    },
  });
  if (items.length > 10000)
    throw new ApiError(422, 'Terlalu banyak transaksi; persempit rentang tanggal sebelum ekspor');
  const header = [
    'Nomor',
    'Tanggal',
    'Jenis',
    'Status',
    'Kategori',
    'Program kerja',
    'Nominal',
    'Keterangan',
  ];
  const lines = items.map((item) =>
    [
      item.transaction_number,
      item.transaction_date.toISOString().slice(0, 10),
      item.transaction_type,
      item.status,
      item.transaction_categories.name,
      item.work_programs?.name ?? '',
      item.amount.toFixed(2),
      item.description,
    ]
      .map(csvCell)
      .join(','),
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="transaksi.csv"');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(`\uFEFF${header.map(csvCell).join(',')}\r\n${lines.join('\r\n')}`);
});

router.get('/report', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const filters = transactionFilterSchema.parse(req.query);
  const where = { ...transactionWhere(BigInt(tenant.id), filters), status: 'POSTED' as const };
  const [income, expense, groups, categories] = await Promise.all([
    filters.type === 'EXPENSE'
      ? Promise.resolve({ _sum: { amount: null }, _count: 0 })
      : prisma.financial_transactions.aggregate({
          where: { ...where, transaction_type: 'INCOME' },
          _sum: { amount: true },
          _count: true,
        }),
    filters.type === 'INCOME'
      ? Promise.resolve({ _sum: { amount: null }, _count: 0 })
      : prisma.financial_transactions.aggregate({
          where: { ...where, transaction_type: 'EXPENSE' },
          _sum: { amount: true },
          _count: true,
        }),
    prisma.financial_transactions.groupBy({
      by: ['transaction_type', 'category_id'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction_categories.findMany({
      where: { tenant_id: BigInt(tenant.id) },
      select: { id: true, name: true },
    }),
  ]);
  const names = new Map(categories.map((category) => [category.id.toString(), category.name]));
  res.json(
    ApiResponse.success({
      ...moneySummary(income._sum.amount, expense._sum.amount),
      transactionCount: income._count + expense._count,
      categories: groups.map((group) => ({
        type: group.transaction_type,
        categoryId: group.category_id.toString(),
        name: names.get(group.category_id.toString()) ?? 'Kategori tidak ditemukan',
        amount: group._sum.amount?.toFixed(2) ?? '0.00',
        count: group._count,
      })),
    }),
  );
});

router.post('/transactions', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const input = transactionSchema.parse(req.body);
  const tenantId = BigInt(tenant.id);
  const [category, program] = await Promise.all([
    prisma.transaction_categories.findFirst({
      where: { id: BigInt(input.categoryId), tenant_id: tenantId, is_active: true },
    }),
    input.workProgramId
      ? prisma.work_programs.findFirst({
          where: { id: BigInt(input.workProgramId), tenant_id: tenantId, deleted_at: null },
        })
      : Promise.resolve(true),
  ]);
  if (
    !category ||
    !program ||
    (category.transaction_type !== 'BOTH' && category.transaction_type !== input.type)
  ) {
    throw new ApiError(422, 'Kategori atau program kerja tidak sesuai transaksi');
  }
  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.financial_transactions.create({
      data: {
        tenant_id: tenantId,
        transaction_number: input.transactionNumber,
        transaction_type: input.type,
        category_id: category.id,
        work_program_id: input.workProgramId ? BigInt(input.workProgramId) : null,
        transaction_date: input.transactionDate,
        amount: input.amount.toFixed(2),
        description: input.description,
        payment_method: input.paymentMethod || null,
        created_by_user_id: BigInt(auth.user.id),
      },
    });
    await writeAudit(
      {
        actorUserId: BigInt(auth.user.id),
        actorTenantId: tenantId,
        action: 'FINANCIAL_TRANSACTION_CREATED',
        objectType: 'financial_transaction',
        objectId: created.id,
        objectTenantId: tenantId,
        after: input,
      },
      tx,
    );
    return created;
  });
  res
    .status(201)
    .json(ApiResponse.success(serialize(item), 'Transaksi berhasil dibuat sebagai draf'));
});

router.post('/transactions/:id/receipt', privateUpload, async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const tenantId = BigInt(tenant.id);
  const transaction = await prisma.financial_transactions.findFirst({
    where: { id, tenant_id: tenantId },
  });
  if (!transaction) throw new ApiError(404, 'Transaksi tidak ditemukan');
  if (transaction.attachment_file_id || transaction.status === 'VOID')
    throw new ApiError(409, 'Bukti transaksi tidak dapat ditambahkan');
  const receipt = await withPrivateFile(
    req.file,
    tenantId,
    BigInt(auth.user.id),
    async (tx, fileId) => {
      const updated = await tx.financial_transactions.updateMany({
        where: {
          id,
          tenant_id: tenantId,
          attachment_file_id: null,
          status: { in: ['DRAFT', 'POSTED'] },
        },
        data: { attachment_file_id: fileId },
      });
      if (!updated.count) throw new ApiError(409, 'Transaksi telah berubah');
      await writeAudit(
        {
          actorUserId: BigInt(auth.user.id),
          actorTenantId: tenantId,
          action: 'TRANSACTION_RECEIPT_UPLOADED',
          objectType: 'financial_transaction',
          objectId: id,
          objectTenantId: tenantId,
          after: { fileId: fileId.toString() },
        },
        tx,
      );
      return { fileId: fileId.toString() };
    },
  );
  res.status(201).json(ApiResponse.success(receipt, 'Bukti transaksi berhasil diunggah'));
});

router.post('/transactions/:id/post', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const item = await prisma.financial_transactions.findFirst({
    where: { id, tenant_id: BigInt(tenant.id) },
  });
  if (!item) throw new ApiError(404, 'Transaksi tidak ditemukan');
  if (item.status !== 'DRAFT') throw new ApiError(409, 'Hanya transaksi draf yang dapat diposting');
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.financial_transactions.update({
      where: { id },
      data: { status: 'POSTED', posted_by_user_id: BigInt(auth.user.id), posted_at: new Date() },
    });
    await writeAudit(
      {
        actorUserId: BigInt(auth.user.id),
        actorTenantId: BigInt(tenant.id),
        action: 'FINANCIAL_TRANSACTION_POSTED',
        objectType: 'financial_transaction',
        objectId: id,
        objectTenantId: BigInt(tenant.id),
        before: { status: item.status },
        after: { status: 'POSTED' },
      },
      tx,
    );
    return result;
  });
  res.json(ApiResponse.success(serialize(updated), 'Transaksi berhasil diposting'));
});

router.post('/transactions/:id/void', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const { reason } = z.object({ reason: z.string().trim().min(10).max(500) }).parse(req.body);
  const item = await prisma.financial_transactions.findFirst({
    where: { id, tenant_id: BigInt(tenant.id) },
  });
  if (!item) throw new ApiError(404, 'Transaksi tidak ditemukan');
  if (item.status !== 'POSTED')
    throw new ApiError(409, 'Hanya transaksi posted yang dapat dibatalkan');
  await prisma.$transaction(async (tx) => {
    await tx.financial_transactions.update({
      where: { id },
      data: {
        status: 'VOID',
        voided_by_user_id: BigInt(auth.user.id),
        voided_at: new Date(),
        void_reason: reason,
      },
    });
    await writeAudit(
      {
        actorUserId: BigInt(auth.user.id),
        actorTenantId: BigInt(tenant.id),
        action: 'FINANCIAL_TRANSACTION_VOIDED',
        objectType: 'financial_transaction',
        objectId: id,
        objectTenantId: BigInt(tenant.id),
        metadata: { reason },
      },
      tx,
    );
  });
  res.json(ApiResponse.success(null, 'Transaksi berhasil dibatalkan'));
});

router.get('/summary', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const tenantId = BigInt(tenant.id);
  const [income, expense] = await Promise.all([
    prisma.financial_transactions.aggregate({
      where: { tenant_id: tenantId, status: 'POSTED', transaction_type: 'INCOME' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.financial_transactions.aggregate({
      where: { tenant_id: tenantId, status: 'POSTED', transaction_type: 'EXPENSE' },
      _sum: { amount: true },
      _count: true,
    }),
  ]);
  res.json(
    ApiResponse.success({
      ...moneySummary(income._sum.amount, expense._sum.amount),
      transactionCount: income._count + expense._count,
    }),
  );
});

export default router;
