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
import { createNotification } from '../../services/notification.service';
import { resolveReviewTarget } from '../../policies/tenant.policy';
import { assertRequestEditable } from '../../policies/workflow.policy';

const router = Router();
router.use(requireAuth, requireTenantRole(['ORMAWA_ADMIN', 'HMJ_ADMIN', 'HIMA_ADMIN']));

const requestSchema = z.object({
  workProgramId: z.string().regex(/^\d+$/), targetTenantId: z.string().regex(/^\d+$/).optional().nullable(),
  requestNumber: z.string().trim().min(3).max(60).transform((v) => v.toUpperCase()),
  title: z.string().trim().min(3).max(180), description: z.string().trim().max(5000).optional().or(z.literal('')),
  items: z.array(z.object({ description: z.string().trim().min(2).max(255), quantity: z.coerce.number().positive().max(999999999999),
    unit: z.string().trim().min(1).max(30).default('item'), requestedUnitPrice: z.coerce.number().min(0).max(9999999999999999),
    note: z.string().trim().max(500).optional().or(z.literal('')) })).min(1).max(100),
});
const reviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']), note: z.string().trim().max(2000).optional(),
  approvedItems: z.array(z.object({ id: z.string().regex(/^\d+$/), quantity: z.coerce.number().min(0), unitPrice: z.coerce.number().min(0) })).optional(),
}).superRefine((data, ctx) => {
  if (data.decision !== 'APPROVED' && !data.note) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: 'Catatan wajib diisi' });
});

router.get('/', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const { page, limit, skip } = paginationFrom(req);
  const where = req.query.queue === 'review' ? { target_tenant_id: BigInt(tenant.id) } : { source_tenant_id: BigInt(tenant.id) };
  const [items, total] = await Promise.all([
    prisma.finance_requests.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: {
      finance_request_items: true, work_programs: { select: { name: true, code: true } },
      tenants_finance_requests_source_tenant_idTotenants: { select: { name: true, tenant_type: true } },
    } }),
    prisma.finance_requests.count({ where }),
  ]);
  res.json(ApiResponse.success(serialize(items), 'Pengajuan dana berhasil dimuat', { page, limit, total, totalPages: Math.ceil(total / limit) }));
});

router.post('/', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const input = requestSchema.parse(req.body);
  const tenantId = BigInt(tenant.id);
  const [program, source] = await Promise.all([
    prisma.work_programs.findFirst({ where: { id: BigInt(input.workProgramId), tenant_id: tenantId, deleted_at: null } }),
    prisma.tenants.findUnique({ where: { id: tenantId } }),
  ]);
  if (!program) throw new ApiError(422, 'Program kerja tidak sesuai tenant');
  if (!source) throw new ApiError(422, 'Tenant sumber tidak valid');
  const resolvedTargetId = resolveReviewTarget({ id: source.id.toString(), type: source.tenant_type,
    parentTenantId: source.parent_tenant_id?.toString() }, input.targetTenantId);
  if (!resolvedTargetId) throw new ApiError(422, 'Tenant tujuan tidak valid');
  const targetId = BigInt(resolvedTargetId);
  if (tenant.type === 'HIMA') {
    const parent = await prisma.tenants.findFirst({ where: { id: targetId, tenant_type: 'HMJ', status: 'ACTIVE' } });
    if (!parent) throw new ApiError(422, 'HMJ induk tidak aktif');
  }
  const requestedAmount = input.items.reduce((sum, line) => sum + line.quantity * line.requestedUnitPrice, 0);
  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.finance_requests.create({ data: {
      source_tenant_id: tenantId, target_tenant_id: targetId, work_program_id: BigInt(input.workProgramId),
      request_number: input.requestNumber, title: input.title, description: input.description || null,
      requested_amount: requestedAmount.toFixed(2), created_by_user_id: BigInt(auth.user.id),
      finance_request_items: { create: input.items.map((line) => ({ description: line.description,
        quantity: line.quantity.toFixed(2), unit: line.unit, requested_unit_price: line.requestedUnitPrice.toFixed(2), note: line.note || null })) },
    }, include: { finance_request_items: true } });
    await tx.finance_request_status_history.create({ data: { finance_request_id: created.id, to_status: 'DRAFT',
      actor_user_id: BigInt(auth.user.id), actor_tenant_id: tenantId, note: 'Pengajuan dana dibuat' } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: 'FINANCE_REQUEST_CREATED',
      objectType: 'finance_request', objectId: created.id, objectTenantId: tenantId, after: { ...input, requestedAmount } }, tx);
    return created;
  });
  res.status(201).json(ApiResponse.success(serialize(item), 'Pengajuan dana berhasil dibuat'));
});

router.patch('/:id', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const input = requestSchema.parse(req.body);
  const tenantId = BigInt(tenant.id);
  const [existing, program, source] = await Promise.all([
    prisma.finance_requests.findFirst({ where: { id, source_tenant_id: tenantId } }),
    prisma.work_programs.findFirst({ where: { id: BigInt(input.workProgramId), tenant_id: tenantId, deleted_at: null } }),
    prisma.tenants.findUnique({ where: { id: tenantId } }),
  ]);
  if (!existing) throw new ApiError(404, 'Pengajuan dana tidak ditemukan');
  assertRequestEditable(existing.status);
  if (!program || !source) throw new ApiError(422, 'Program kerja atau tenant sumber tidak valid');
  const resolvedTargetId = resolveReviewTarget({ id: source.id.toString(), type: source.tenant_type,
    parentTenantId: source.parent_tenant_id?.toString() }, input.targetTenantId);
  if (!resolvedTargetId) throw new ApiError(422, 'Tenant tujuan tidak valid');
  const targetId = BigInt(resolvedTargetId);
  if (tenant.type === 'HIMA') {
    const parent = await prisma.tenants.findFirst({ where: { id: targetId, tenant_type: 'HMJ', status: 'ACTIVE' } });
    if (!parent) throw new ApiError(422, 'HMJ induk tidak aktif');
  }
  const requestedAmount = input.items.reduce((sum, line) => sum + line.quantity * line.requestedUnitPrice, 0);
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.finance_requests.update({ where: { id }, data: {
      target_tenant_id: targetId, work_program_id: BigInt(input.workProgramId), request_number: input.requestNumber,
      title: input.title, description: input.description || null, requested_amount: requestedAmount.toFixed(2),
      finance_request_items: { deleteMany: {}, create: input.items.map((line) => ({ description: line.description,
        quantity: line.quantity.toFixed(2), unit: line.unit, requested_unit_price: line.requestedUnitPrice.toFixed(2), note: line.note || null })) },
    }, include: { finance_request_items: true } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: 'FINANCE_REQUEST_UPDATED',
      objectType: 'finance_request', objectId: id, objectTenantId: tenantId,
      before: { requestNumber: existing.request_number, status: existing.status }, after: { ...input, requestedAmount } }, tx);
    return item;
  });
  res.json(ApiResponse.success(serialize(updated), 'Pengajuan dana berhasil diperbarui'));
});

router.get('/:id', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const item = await prisma.finance_requests.findFirst({ where: { id: parseId(req.params.id), OR: [
    { source_tenant_id: BigInt(tenant.id) }, { target_tenant_id: BigInt(tenant.id) },
  ] }, include: { finance_request_items: true, finance_request_status_history: { include: { users: { select: { full_name: true } } }, orderBy: { created_at: 'asc' } } } });
  if (!item) throw new ApiError(404, 'Pengajuan dana tidak ditemukan');
  res.json(ApiResponse.success(serialize(item)));
});

router.post('/:id/submit', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const item = await prisma.finance_requests.findFirst({ where: { id, source_tenant_id: BigInt(tenant.id) } });
  if (!item) throw new ApiError(404, 'Pengajuan dana tidak ditemukan');
  if (!['DRAFT', 'REVISION_REQUESTED'].includes(item.status)) throw new ApiError(409, 'Status pengajuan tidak dapat diajukan');
  await prisma.$transaction(async (tx) => {
    await tx.finance_requests.update({ where: { id }, data: { status: 'SUBMITTED', submitted_at: new Date() } });
    await tx.finance_request_status_history.create({ data: { finance_request_id: id, from_status: item.status, to_status: 'SUBMITTED',
      actor_user_id: BigInt(auth.user.id), actor_tenant_id: BigInt(tenant.id) } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: 'FINANCE_REQUEST_SUBMITTED',
      objectType: 'finance_request', objectId: id, objectTenantId: BigInt(tenant.id) }, tx);
  });
  res.json(ApiResponse.success(null, 'Pengajuan dana berhasil dikirim'));
});

router.post('/:id/review', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const input = reviewSchema.parse(req.body);
  const item = await prisma.finance_requests.findFirst({ where: { id, target_tenant_id: BigInt(tenant.id), status: 'SUBMITTED' }, include: { finance_request_items: true } });
  if (!item) throw new ApiError(404, 'Pengajuan dana tidak tersedia untuk direview');
  const approved = new Map(input.approvedItems?.map((line) => [line.id, line]));
  let approvedAmount = 0;
  await prisma.$transaction(async (tx) => {
    if (input.decision === 'APPROVED') {
      for (const line of item.finance_request_items) {
        const value = approved.get(line.id.toString());
        const quantity = value?.quantity ?? Number(line.quantity);
        const price = value?.unitPrice ?? Number(line.requested_unit_price);
        approvedAmount += quantity * price;
        await tx.finance_request_items.update({ where: { id: line.id }, data: { approved_quantity: quantity.toFixed(2), approved_unit_price: price.toFixed(2) } });
      }
    }
    await tx.finance_requests.update({ where: { id }, data: { status: input.decision,
      approved_amount: input.decision === 'APPROVED' ? approvedAmount.toFixed(2) : null,
      reviewer_user_id: BigInt(auth.user.id), reviewer_note: input.note, reviewed_at: new Date() } });
    await tx.finance_request_status_history.create({ data: { finance_request_id: id, from_status: item.status, to_status: input.decision,
      actor_user_id: BigInt(auth.user.id), actor_tenant_id: BigInt(tenant.id), note: input.note } });
    if (input.decision === 'APPROVED') {
      let category = await tx.transaction_categories.findFirst({ where: { tenant_id: item.source_tenant_id, name: 'Dana program kerja' } });
      category ??= await tx.transaction_categories.create({ data: { tenant_id: item.source_tenant_id, transaction_type: 'INCOME', name: 'Dana program kerja',
        description: 'Kategori otomatis dari persetujuan pengajuan dana' } });
      const existingTransaction = await tx.financial_transactions.findFirst({ where: { finance_request_id: id, tenant_id: item.source_tenant_id } });
      if (!existingTransaction) {
        await tx.financial_transactions.create({ data: { tenant_id: item.source_tenant_id,
          transaction_number: `FR-${id.toString()}`, transaction_type: 'INCOME', category_id: category.id,
          work_program_id: item.work_program_id, finance_request_id: id, transaction_date: new Date(),
          amount: approvedAmount.toFixed(2), description: `Dana disetujui: ${item.title}`, status: 'DRAFT', created_by_user_id: BigInt(auth.user.id) } });
      }
    }
    await createNotification({ recipientUserId: item.created_by_user_id, tenantId: item.source_tenant_id, type: `FINANCE_REQUEST_${input.decision}`,
      title: `Pengajuan dana ${input.decision === 'APPROVED' ? 'disetujui' : input.decision === 'REJECTED' ? 'ditolak' : 'perlu revisi'}`,
      body: input.note ?? item.title, targetUrl: `/portal/pengajuan-dana/${id}`, objectType: 'finance_request', objectId: id }, tx);
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: `FINANCE_REQUEST_${input.decision}`,
      objectType: 'finance_request', objectId: id, objectTenantId: item.source_tenant_id,
      before: { status: item.status }, after: { status: input.decision, approvedAmount } }, tx);
  });
  res.json(ApiResponse.success(null, 'Review pengajuan dana berhasil disimpan'));
});

export default router;
