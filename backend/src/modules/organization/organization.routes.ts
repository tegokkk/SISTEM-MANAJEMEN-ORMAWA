import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireTenantRole } from '../../middleware/role.guard';
import { prisma } from '../../core/prisma';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { parseId, requireTenantContext } from '../../utils/request';
import { serialize } from '../../utils/serialize';
import { writeAudit } from '../../services/audit.service';
import { csvCell } from '../../utils/csv';

const router = Router();
router.use(requireAuth, requireTenantRole(['ORMAWA_ADMIN', 'HMJ_ADMIN', 'HIMA_ADMIN']));

const periodSchema = z.object({
  name: z.string().trim().min(3).max(120), startDate: z.coerce.date(), endDate: z.coerce.date(),
}).refine((data) => data.endDate >= data.startDate, { path: ['endDate'], message: 'Tanggal akhir harus setelah tanggal mulai' });
const positionSchema = z.object({
  code: z.string().trim().min(2).max(50).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(2).max(120), level: z.coerce.number().int().min(1).max(65535).default(100),
  description: z.string().trim().max(255).optional().or(z.literal('')),
});
const assignmentSchema = z.object({
  periodId: z.string().regex(/^\d+$/), memberId: z.string().regex(/^\d+$/), positionId: z.string().regex(/^\d+$/),
  reportsToAssignmentId: z.string().regex(/^\d+$/).optional().nullable(), sortOrder: z.coerce.number().int().min(0).default(0),
});

router.get('/periods', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const items = await prisma.periods.findMany({ where: { tenant_id: BigInt(tenant.id) }, orderBy: { start_date: 'desc' } });
  res.json(ApiResponse.success(serialize(items)));
});

router.post('/periods', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const input = periodSchema.parse(req.body);
  const item = await prisma.periods.create({ data: { tenant_id: BigInt(tenant.id), name: input.name,
    start_date: input.startDate, end_date: input.endDate, created_by_user_id: BigInt(auth.user.id) } });
  res.status(201).json(ApiResponse.success(serialize(item), 'Periode berhasil dibuat'));
});

router.patch('/periods/:id/activate', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID periode');
  const current = await prisma.periods.findFirst({ where: { id, tenant_id: BigInt(tenant.id) } });
  if (!current) throw new ApiError(404, 'Periode tidak ditemukan');
  await prisma.$transaction(async (tx) => {
    await tx.periods.updateMany({ where: { tenant_id: BigInt(tenant.id), status: 'ACTIVE' }, data: { status: 'CLOSED', active_tenant_id: null } });
    await tx.periods.update({ where: { id }, data: { status: 'ACTIVE', active_tenant_id: BigInt(tenant.id) } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: 'PERIOD_ACTIVATED',
      objectType: 'period', objectId: id, objectTenantId: BigInt(tenant.id) }, tx);
  });
  res.json(ApiResponse.success(null, 'Periode aktif berhasil diubah'));
});

router.get('/positions', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const items = await prisma.positions.findMany({ where: { tenant_id: BigInt(tenant.id) }, orderBy: [{ level: 'asc' }, { name: 'asc' }] });
  res.json(ApiResponse.success(serialize(items)));
});

router.post('/positions', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const input = positionSchema.parse(req.body);
  const item = await prisma.positions.create({ data: { tenant_id: BigInt(tenant.id), code: input.code, name: input.name,
    level: input.level, description: input.description || null } });
  res.status(201).json(ApiResponse.success(serialize(item), 'Jabatan berhasil dibuat'));
});

router.patch('/positions/:id', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID jabatan');
  const input = positionSchema.partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
  const found = await prisma.positions.findFirst({ where: { id, tenant_id: BigInt(tenant.id) } });
  if (!found) throw new ApiError(404, 'Jabatan tidak ditemukan');
  const item = await prisma.positions.update({ where: { id }, data: { code: input.code, name: input.name,
    level: input.level, description: input.description === '' ? null : input.description, is_active: input.isActive } });
  res.json(ApiResponse.success(serialize(item), 'Jabatan berhasil diperbarui'));
});

router.get('/structure/export', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const periodId = req.query.periodId ? parseId(req.query.periodId as string, 'ID periode') : undefined;
  const period = await prisma.periods.findFirst({ where: { tenant_id: BigInt(tenant.id),
    ...(periodId ? { id: periodId } : { status: 'ACTIVE' }) } });
  if (!period) throw new ApiError(404, 'Periode tidak ditemukan');
  const assignments = await prisma.organization_assignments.findMany({ where: { tenant_id: BigInt(tenant.id), period_id: period.id },
    orderBy: [{ sort_order: 'asc' }, { positions: { level: 'asc' } }],
    include: { members: { select: { full_name: true, student_number: true } }, positions: { select: { name: true } } } });
  const names = new Map(assignments.map((item) => [item.id.toString(), item.members.full_name]));
  const header = ['Periode', 'Jabatan', 'Nama', 'Nomor anggota', 'Atasan langsung'];
  const lines = assignments.map((item) => [period.name, item.positions.name, item.members.full_name,
    item.members.student_number, item.reports_to_assignment_id ? names.get(item.reports_to_assignment_id.toString()) : '']
    .map(csvCell).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="struktur-organisasi.csv"');
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(`\uFEFF${header.map(csvCell).join(',')}\r\n${lines.join('\r\n')}`);
});

router.get('/structure', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const periodId = req.query.periodId ? parseId(req.query.periodId as string, 'ID periode') : undefined;
  const period = periodId
    ? await prisma.periods.findFirst({ where: { id: periodId, tenant_id: BigInt(tenant.id) } })
    : await prisma.periods.findFirst({ where: { tenant_id: BigInt(tenant.id), status: 'ACTIVE' } });
  if (!period) return res.json(ApiResponse.success([], 'Belum ada periode aktif'));
  const items = await prisma.organization_assignments.findMany({
    where: { tenant_id: BigInt(tenant.id), period_id: period.id }, orderBy: [{ sort_order: 'asc' }, { positions: { level: 'asc' } }],
    include: { members: true, positions: true },
  });
  res.json(ApiResponse.success({ period: serialize(period), assignments: serialize(items) }));
});

router.post('/assignments', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const input = assignmentSchema.parse(req.body);
  const scope = { tenant_id: BigInt(tenant.id) };
  const [period, member, position, parent] = await Promise.all([
    prisma.periods.findFirst({ where: { id: BigInt(input.periodId), ...scope } }),
    prisma.members.findFirst({ where: { id: BigInt(input.memberId), ...scope, deleted_at: null } }),
    prisma.positions.findFirst({ where: { id: BigInt(input.positionId), ...scope, is_active: true } }),
    input.reportsToAssignmentId ? prisma.organization_assignments.findFirst({ where: { id: BigInt(input.reportsToAssignmentId), ...scope } }) : Promise.resolve(true),
  ]);
  if (!period || !member || !position || !parent) throw new ApiError(422, 'Periode, anggota, jabatan, atau atasan tidak sesuai tenant');
  const item = await prisma.organization_assignments.create({ data: {
    tenant_id: BigInt(tenant.id), period_id: period.id, member_id: member.id, position_id: position.id,
    reports_to_assignment_id: input.reportsToAssignmentId ? BigInt(input.reportsToAssignmentId) : null, sort_order: input.sortOrder,
  } });
  res.status(201).json(ApiResponse.success(serialize(item), 'Penugasan berhasil dibuat'));
});

router.delete('/assignments/:id', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID penugasan');
  const result = await prisma.organization_assignments.deleteMany({ where: { id, tenant_id: BigInt(tenant.id) } });
  if (!result.count) throw new ApiError(404, 'Penugasan tidak ditemukan');
  res.json(ApiResponse.success(null, 'Penugasan berhasil dihapus'));
});

export default router;
