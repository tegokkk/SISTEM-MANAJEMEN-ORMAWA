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
  workProgramId: z.string().regex(/^\d+$/).optional().nullable(),
  targetTenantId: z.string().regex(/^\d+$/).optional().nullable(),
  requestNumber: z.string().trim().min(3).max(60).transform((v) => v.toUpperCase()),
  title: z.string().trim().min(3).max(180), description: z.string().trim().max(5000).optional().or(z.literal('')),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  items: z.array(z.object({
    itemName: z.string().trim().min(2).max(180), itemType: z.enum(['GOODS', 'SERVICE', 'FACILITY', 'OTHER']),
    quantity: z.coerce.number().positive().max(999999999999), unit: z.string().trim().min(1).max(30),
    estimatedUnitPrice: z.coerce.number().min(0).max(9999999999999999), note: z.string().trim().max(500).optional().or(z.literal('')),
  })).min(1).max(100),
});
const reviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']), note: z.string().trim().max(2000).optional(),
  approvedItems: z.array(z.object({ id: z.string().regex(/^\d+$/), quantity: z.coerce.number().min(0), unitPrice: z.coerce.number().min(0) })).optional(),
}).superRefine((data, ctx) => {
  if (data.decision !== 'APPROVED' && !data.note) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: 'Catatan wajib diisi' });
});

async function resolveTarget(tenantId: bigint, tenantType: string, requested?: string | null) {
  const source = await prisma.tenants.findUnique({ where: { id: tenantId } });
  if (!source) throw new ApiError(422, 'Tenant sumber tidak valid');
  const resolved = resolveReviewTarget({ id: source.id.toString(), type: source.tenant_type,
    parentTenantId: source.parent_tenant_id?.toString() }, requested);
  if (!resolved) throw new ApiError(422, tenantType === 'HIMA' ? 'HIMA tidak memiliki HMJ induk' : 'Tenant tujuan tidak valid');
  const targetId = BigInt(resolved);
  if (targetId) {
    const target = await prisma.tenants.findFirst({ where: { id: targetId, status: 'ACTIVE', deleted_at: null } });
    if (!target || (tenantType === 'HIMA' && target.tenant_type !== 'HMJ')) throw new ApiError(422, 'Tenant tujuan tidak valid');
  }
  return targetId;
}

router.get('/', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const { page, limit, skip } = paginationFrom(req);
  const queue = req.query.queue === 'review';
  const where = queue ? { target_tenant_id: BigInt(tenant.id) } : { source_tenant_id: BigInt(tenant.id) };
  const [items, total] = await Promise.all([
    prisma.requirement_requests.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' },
      include: { requirement_request_items: true, tenants_requirement_requests_source_tenant_idTotenants: { select: { name: true, tenant_type: true } } } }),
    prisma.requirement_requests.count({ where }),
  ]);
  res.json(ApiResponse.success(serialize(items), 'Pengajuan kebutuhan berhasil dimuat', { page, limit, total, totalPages: Math.ceil(total / limit) }));
});

router.post('/', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const input = requestSchema.parse(req.body);
  const tenantId = BigInt(tenant.id);
  const targetId = await resolveTarget(tenantId, tenant.type, input.targetTenantId);
  if (input.workProgramId) {
    const program = await prisma.work_programs.findFirst({ where: { id: BigInt(input.workProgramId), tenant_id: tenantId, deleted_at: null } });
    if (!program) throw new ApiError(422, 'Program kerja tidak sesuai tenant');
  }
  const total = input.items.reduce((sum, item) => sum + item.quantity * item.estimatedUnitPrice, 0);
  const created = await prisma.$transaction(async (tx) => {
    const item = await tx.requirement_requests.create({ data: {
      source_tenant_id: tenantId, target_tenant_id: targetId,
      work_program_id: input.workProgramId ? BigInt(input.workProgramId) : null,
      request_number: input.requestNumber, title: input.title, description: input.description || null,
      priority: input.priority, estimated_total: total.toFixed(2), created_by_user_id: BigInt(auth.user.id),
      requirement_request_items: { create: input.items.map((line) => ({ item_name: line.itemName, item_type: line.itemType,
        quantity: line.quantity.toFixed(2), unit: line.unit, estimated_unit_price: line.estimatedUnitPrice.toFixed(2), note: line.note || null })) },
    }, include: { requirement_request_items: true } });
    await tx.requirement_request_status_history.create({ data: { requirement_request_id: item.id, to_status: 'DRAFT',
      actor_user_id: BigInt(auth.user.id), actor_tenant_id: tenantId, note: 'Pengajuan kebutuhan dibuat' } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: 'REQUIREMENT_CREATED', objectType: 'requirement_request',
      objectId: item.id, objectTenantId: tenantId, after: { ...input, estimatedTotal: total } }, tx);
    return item;
  });
  res.status(201).json(ApiResponse.success(serialize(created), 'Pengajuan kebutuhan berhasil dibuat'));
});

router.patch('/:id', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const input = requestSchema.parse(req.body);
  const tenantId = BigInt(tenant.id);
  const existing = await prisma.requirement_requests.findFirst({ where: { id, source_tenant_id: tenantId } });
  if (!existing) throw new ApiError(404, 'Pengajuan kebutuhan tidak ditemukan');
  assertRequestEditable(existing.status);
  const targetId = await resolveTarget(tenantId, tenant.type, input.targetTenantId);
  if (input.workProgramId) {
    const program = await prisma.work_programs.findFirst({ where: { id: BigInt(input.workProgramId), tenant_id: tenantId, deleted_at: null } });
    if (!program) throw new ApiError(422, 'Program kerja tidak sesuai tenant');
  }
  const total = input.items.reduce((sum, item) => sum + item.quantity * item.estimatedUnitPrice, 0);
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.requirement_requests.update({ where: { id }, data: {
      target_tenant_id: targetId, work_program_id: input.workProgramId ? BigInt(input.workProgramId) : null,
      request_number: input.requestNumber, title: input.title, description: input.description || null,
      priority: input.priority, estimated_total: total.toFixed(2),
      requirement_request_items: { deleteMany: {}, create: input.items.map((line) => ({ item_name: line.itemName,
        item_type: line.itemType, quantity: line.quantity.toFixed(2), unit: line.unit,
        estimated_unit_price: line.estimatedUnitPrice.toFixed(2), note: line.note || null })) },
    }, include: { requirement_request_items: true } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: 'REQUIREMENT_UPDATED',
      objectType: 'requirement_request', objectId: id, objectTenantId: tenantId,
      before: { requestNumber: existing.request_number, status: existing.status }, after: { ...input, estimatedTotal: total } }, tx);
    return item;
  });
  res.json(ApiResponse.success(serialize(updated), 'Pengajuan kebutuhan berhasil diperbarui'));
});

router.delete('/:id', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const tenantId = BigInt(tenant.id);
  const existing = await prisma.requirement_requests.findFirst({ where: { id, source_tenant_id: tenantId } });
  if (!existing) throw new ApiError(404, 'Pengajuan kebutuhan tidak ditemukan');
  assertRequestEditable(existing.status);
  await prisma.$transaction(async (tx) => {
    const result = await tx.requirement_requests.updateMany({
      where: { id, source_tenant_id: tenantId, status: existing.status }, data: { status: 'CANCELLED' },
    });
    if (!result.count) throw new ApiError(409, 'Status pengajuan telah berubah');
    await tx.requirement_request_status_history.create({ data: { requirement_request_id: id,
      from_status: existing.status, to_status: 'CANCELLED', actor_user_id: BigInt(auth.user.id), actor_tenant_id: tenantId,
      note: 'Pengajuan dibatalkan oleh pemilik' } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: 'REQUIREMENT_CANCELLED',
      objectType: 'requirement_request', objectId: id, objectTenantId: tenantId, before: { status: existing.status },
      after: { status: 'CANCELLED' } }, tx);
  });
  res.json(ApiResponse.success(null, 'Pengajuan kebutuhan berhasil dibatalkan'));
});

router.get('/:id', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const item = await prisma.requirement_requests.findFirst({ where: { id: parseId(req.params.id), OR: [
    { source_tenant_id: BigInt(tenant.id) }, { target_tenant_id: BigInt(tenant.id) },
  ] }, include: { requirement_request_items: true, requirement_request_status_history: { include: { users: { select: { full_name: true } } }, orderBy: { created_at: 'asc' } } } });
  if (!item) throw new ApiError(404, 'Pengajuan kebutuhan tidak ditemukan');
  res.json(ApiResponse.success(serialize(item)));
});

router.post('/:id/submit', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const item = await prisma.requirement_requests.findFirst({ where: { id, source_tenant_id: BigInt(tenant.id) } });
  if (!item) throw new ApiError(404, 'Pengajuan kebutuhan tidak ditemukan');
  if (!['DRAFT', 'REVISION_REQUESTED'].includes(item.status)) throw new ApiError(409, 'Status pengajuan tidak dapat diajukan');
  if (!item.target_tenant_id) throw new ApiError(422, 'Tenant tujuan wajib ditentukan sebelum pengajuan');
  await prisma.$transaction(async (tx) => {
    await tx.requirement_requests.update({ where: { id }, data: { status: 'SUBMITTED', submitted_at: new Date() } });
    await tx.requirement_request_status_history.create({ data: { requirement_request_id: id, from_status: item.status, to_status: 'SUBMITTED',
      actor_user_id: BigInt(auth.user.id), actor_tenant_id: BigInt(tenant.id) } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: 'REQUIREMENT_SUBMITTED',
      objectType: 'requirement_request', objectId: id, objectTenantId: BigInt(tenant.id) }, tx);
  });
  res.json(ApiResponse.success(null, 'Pengajuan kebutuhan berhasil dikirim'));
});

router.post('/:id/review', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id);
  const input = reviewSchema.parse(req.body);
  const item = await prisma.requirement_requests.findFirst({ where: { id, target_tenant_id: BigInt(tenant.id), status: 'SUBMITTED' },
    include: { requirement_request_items: true } });
  if (!item) throw new ApiError(404, 'Pengajuan tidak tersedia untuk direview');
  const approved = new Map(input.approvedItems?.map((line) => [line.id, line]));
  let approvedTotal = 0;
  await prisma.$transaction(async (tx) => {
    if (input.decision === 'APPROVED') {
      for (const line of item.requirement_request_items) {
        const value = approved.get(line.id.toString());
        const quantity = value?.quantity ?? Number(line.quantity);
        const unitPrice = value?.unitPrice ?? Number(line.estimated_unit_price);
        approvedTotal += quantity * unitPrice;
        await tx.requirement_request_items.update({ where: { id: line.id }, data: { approved_quantity: quantity.toFixed(2), approved_unit_price: unitPrice.toFixed(2) } });
      }
    }
    await tx.requirement_requests.update({ where: { id }, data: { status: input.decision, approved_total: input.decision === 'APPROVED' ? approvedTotal.toFixed(2) : null,
      reviewer_user_id: BigInt(auth.user.id), reviewer_note: input.note, reviewed_at: new Date() } });
    await tx.requirement_request_status_history.create({ data: { requirement_request_id: id, from_status: item.status, to_status: input.decision,
      actor_user_id: BigInt(auth.user.id), actor_tenant_id: BigInt(tenant.id), note: input.note } });
    await createNotification({ recipientUserId: item.created_by_user_id, tenantId: item.source_tenant_id, type: `REQUIREMENT_${input.decision}`,
      title: `Pengajuan kebutuhan ${input.decision === 'APPROVED' ? 'disetujui' : input.decision === 'REJECTED' ? 'ditolak' : 'perlu revisi'}`,
      body: input.note ?? item.title, targetUrl: `/portal/kebutuhan/${id}`, objectType: 'requirement_request', objectId: id }, tx);
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: `REQUIREMENT_${input.decision}`,
      objectType: 'requirement_request', objectId: id, objectTenantId: item.source_tenant_id, before: { status: item.status }, after: { status: input.decision, approvedTotal } }, tx);
  });
  res.json(ApiResponse.success(null, 'Review pengajuan kebutuhan berhasil disimpan'));
});

export default router;
