import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireTenantRole } from '../../middleware/role.guard';
import { prisma } from '../../core/prisma';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { paginationFrom, parseId, requireTenantContext } from '../../utils/request';
import { serialize } from '../../utils/serialize';
import { assertWorkProgramDeletable, assertWorkProgramTransition, WorkProgramStatus } from '../../policies/workflow.policy';
import { writeAudit } from '../../services/audit.service';
import { createNotification } from '../../services/notification.service';
import { privateUpload, withPrivateFile } from '../../services/private-file.service';

const router = Router();
router.use(requireAuth, requireTenantRole(['ORMAWA_ADMIN', 'HMJ_ADMIN', 'HIMA_ADMIN']));

const programSchema = z.object({
  periodId: z.string().regex(/^\d+$/),
  responsibleMemberId: z.string().regex(/^\d+$/).optional().nullable(),
  code: z.string().trim().min(2).max(60).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(3).max(180),
  description: z.string().trim().max(5000).optional().or(z.literal('')),
  objective: z.string().trim().max(5000).optional().or(z.literal('')),
  location: z.string().trim().max(255).optional().or(z.literal('')),
  startDate: z.coerce.date(), endDate: z.coerce.date(),
  proposedBudget: z.coerce.number().min(0).max(9999999999999999),
}).refine((data) => data.endDate >= data.startDate, { path: ['endDate'], message: 'Tanggal akhir harus setelah tanggal mulai' });
const reviewSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']), note: z.string().trim().max(2000).optional(),
}).superRefine((data, ctx) => {
  if (data.decision !== 'APPROVED' && !data.note) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['note'], message: 'Catatan wajib diisi' });
});

async function assertProgramRelations(tenantId: bigint, periodId: bigint, memberId?: bigint | null) {
  const [period, member] = await Promise.all([
    prisma.periods.findFirst({ where: { id: periodId, tenant_id: tenantId } }),
    memberId ? prisma.members.findFirst({ where: { id: memberId, tenant_id: tenantId, deleted_at: null } }) : Promise.resolve(true),
  ]);
  if (!period || !member) throw new ApiError(422, 'Periode atau penanggung jawab tidak sesuai tenant');
}

router.get('/', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const { page, limit, skip } = paginationFrom(req);
  const reviewQueue = req.query.queue === 'review';
  const status = typeof req.query.status === 'string' ? req.query.status as WorkProgramStatus : undefined;
  const where = reviewQueue
    ? { reviewer_tenant_id: BigInt(tenant.id), tenant_id: { not: BigInt(tenant.id) }, status }
    : { tenant_id: BigInt(tenant.id), deleted_at: null, status };
  const [items, total] = await Promise.all([
    prisma.work_programs.findMany({ where, skip, take: limit, orderBy: { created_at: 'desc' }, include: {
      periods: { select: { name: true } }, members: { select: { full_name: true } },
      tenants_work_programs_tenant_idTotenants: { select: { id: true, name: true, tenant_type: true } },
    } }),
    prisma.work_programs.count({ where }),
  ]);
  res.json(ApiResponse.success(serialize(items), 'Program kerja berhasil dimuat', { page, limit, total, totalPages: Math.ceil(total / limit) }));
});

router.post('/', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const input = programSchema.parse(req.body);
  const tenantId = BigInt(tenant.id);
  await assertProgramRelations(tenantId, BigInt(input.periodId), input.responsibleMemberId ? BigInt(input.responsibleMemberId) : null);
  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.work_programs.create({ data: {
      tenant_id: tenantId, period_id: BigInt(input.periodId),
      responsible_member_id: input.responsibleMemberId ? BigInt(input.responsibleMemberId) : null,
      code: input.code, name: input.name, description: input.description || null, objective: input.objective || null,
      location: input.location || null, start_date: input.startDate, end_date: input.endDate,
      proposed_budget: input.proposedBudget, created_by_user_id: BigInt(auth.user.id),
    } });
    await tx.work_program_status_history.create({ data: { work_program_id: created.id, tenant_id: tenantId,
      to_status: 'DRAFT', actor_user_id: BigInt(auth.user.id), actor_tenant_id: tenantId, note: 'Program kerja dibuat' } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: 'WORK_PROGRAM_CREATED',
      objectType: 'work_program', objectId: created.id, objectTenantId: tenantId, after: input }, tx);
    return created;
  });
  res.status(201).json(ApiResponse.success(serialize(item), 'Program kerja berhasil dibuat'));
});

router.get('/:id', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID program kerja');
  const item = await prisma.work_programs.findFirst({
    where: { id, OR: [{ tenant_id: BigInt(tenant.id) }, { reviewer_tenant_id: BigInt(tenant.id) }] },
    include: { periods: true, members: true, proposals: { include: { files: { select: { id: true, original_name: true, mime_type: true, size_bytes: true, created_at: true } } }, orderBy: { version_number: 'desc' } },
      work_program_status_history: { include: {
        users: { select: { full_name: true } }, tenants: { select: { name: true } },
      }, orderBy: { created_at: 'asc' } } },
  });
  if (!item) throw new ApiError(404, 'Program kerja tidak ditemukan');
  res.json(ApiResponse.success(serialize(item)));
});

router.get('/:id/proposals', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID program kerja');
  const program = await prisma.work_programs.findFirst({ where: { id, deleted_at: null,
    OR: [{ tenant_id: BigInt(tenant.id) }, { reviewer_tenant_id: BigInt(tenant.id) }] }, select: { id: true } });
  if (!program) throw new ApiError(404, 'Program kerja tidak ditemukan');
  const versions = await prisma.proposals.findMany({ where: { work_program_id: id }, orderBy: { version_number: 'desc' },
    include: { files: { select: { id: true, original_name: true, mime_type: true, size_bytes: true, created_at: true } } } });
  res.json(ApiResponse.success(serialize(versions)));
});

router.post('/:id/proposals', privateUpload, async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID program kerja');
  const input = z.object({ title: z.string().trim().min(3).max(180), note: z.string().trim().max(2000).optional() }).parse(req.body);
  const tenantId = BigInt(tenant.id);
  const program = await prisma.work_programs.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null } });
  if (!program) throw new ApiError(404, 'Program kerja tidak ditemukan');
  if (!['DRAFT', 'REVISION_REQUESTED'].includes(program.status)) throw new ApiError(409, 'Proposal hanya dapat ditambahkan pada program yang dapat diedit');
  const proposal = await withPrivateFile(req.file, tenantId, BigInt(auth.user.id), async (tx, fileId) => {
    const latest = await tx.proposals.findFirst({ where: { work_program_id: id }, orderBy: { version_number: 'desc' }, select: { version_number: true } });
    const created = await tx.proposals.create({ data: { tenant_id: tenantId, work_program_id: id, file_id: fileId,
      version_number: (latest?.version_number ?? 0) + 1, title: input.title, note: input.note || null,
      uploaded_by_user_id: BigInt(auth.user.id) } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: 'PROPOSAL_UPLOADED',
      objectType: 'proposal', objectId: created.id, objectTenantId: tenantId,
      after: { workProgramId: id.toString(), version: created.version_number } }, tx);
    return created;
  });
  res.status(201).json(ApiResponse.success(serialize(proposal), 'Versi proposal berhasil diunggah'));
});

router.patch('/:id', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID program kerja');
  const input = programSchema.partial().parse(req.body);
  const existing = await prisma.work_programs.findFirst({ where: { id, tenant_id: BigInt(tenant.id), deleted_at: null } });
  if (!existing) throw new ApiError(404, 'Program kerja tidak ditemukan');
  if (!['DRAFT', 'REVISION_REQUESTED'].includes(existing.status)) throw new ApiError(409, 'Program kerja tidak dapat diubah pada status ini');
  const periodId = input.periodId ? BigInt(input.periodId) : existing.period_id;
  const memberId = input.responsibleMemberId === undefined ? existing.responsible_member_id : input.responsibleMemberId ? BigInt(input.responsibleMemberId) : null;
  await assertProgramRelations(BigInt(tenant.id), periodId, memberId);
  const updated = await prisma.work_programs.update({ where: { id }, data: {
    period_id: periodId, responsible_member_id: memberId, code: input.code, name: input.name,
    description: input.description === '' ? null : input.description, objective: input.objective === '' ? null : input.objective,
    location: input.location === '' ? null : input.location, start_date: input.startDate, end_date: input.endDate,
    proposed_budget: input.proposedBudget,
  } });
  await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: 'WORK_PROGRAM_UPDATED',
    objectType: 'work_program', objectId: id, objectTenantId: BigInt(tenant.id), before: existing, after: input });
  res.json(ApiResponse.success(serialize(updated), 'Program kerja berhasil diperbarui'));
});

router.delete('/:id', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID program kerja');
  const tenantId = BigInt(tenant.id);
  const existing = await prisma.work_programs.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null } });
  if (!existing) throw new ApiError(404, 'Program kerja tidak ditemukan');
  assertWorkProgramDeletable(existing.status);
  await prisma.$transaction(async (tx) => {
    await tx.work_programs.update({ where: { id }, data: { deleted_at: new Date() } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: 'WORK_PROGRAM_DELETED',
      objectType: 'work_program', objectId: id, objectTenantId: tenantId, before: existing }, tx);
  });
  res.json(ApiResponse.success(null, 'Program kerja berhasil dihapus'));
});

async function transitionOwnedProgram(req: Parameters<typeof requireTenantContext>[0], id: bigint, to: WorkProgramStatus, note?: string) {
  const { auth, tenant } = requireTenantContext(req);
  const tenantId = BigInt(tenant.id);
  const item = await prisma.work_programs.findFirst({ where: { id, tenant_id: tenantId, deleted_at: null } });
  if (!item) throw new ApiError(404, 'Program kerja tidak ditemukan');
  assertWorkProgramTransition(item.status, to);
  let reviewerTenantId = item.reviewer_tenant_id;
  if (to === 'SUBMITTED') {
    if (tenant.type === 'HIMA') {
      const source = await prisma.tenants.findUnique({ where: { id: tenantId } });
      if (!source?.parent_tenant_id) throw new ApiError(422, 'HIMA tidak memiliki HMJ induk aktif');
      const parent = await prisma.tenants.findFirst({ where: { id: source.parent_tenant_id, tenant_type: 'HMJ', status: 'ACTIVE', deleted_at: null } });
      if (!parent) throw new ApiError(422, 'HIMA tidak memiliki HMJ induk aktif');
      reviewerTenantId = source.parent_tenant_id;
    } else reviewerTenantId = tenantId;
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.work_programs.update({ where: { id }, data: {
      status: to, reviewer_tenant_id: reviewerTenantId,
      submitted_at: to === 'SUBMITTED' ? new Date() : undefined,
      started_at: to === 'RUNNING' ? new Date() : undefined,
      completed_at: to === 'COMPLETED' ? new Date() : undefined,
    } });
    await tx.work_program_status_history.create({ data: { work_program_id: id, tenant_id: tenantId,
      from_status: item.status, to_status: to, actor_user_id: BigInt(auth.user.id), actor_tenant_id: tenantId, note } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: `WORK_PROGRAM_${to}`,
      objectType: 'work_program', objectId: id, objectTenantId: tenantId, before: { status: item.status }, after: { status: to } }, tx);
    return updated;
  });
}

router.post('/:id/submit', async (req, res) => {
  const item = await transitionOwnedProgram(req, parseId(req.params.id), 'SUBMITTED');
  res.json(ApiResponse.success(serialize(item), 'Program kerja berhasil diajukan'));
});
router.post('/:id/start', async (req, res) => {
  const item = await transitionOwnedProgram(req, parseId(req.params.id), 'RUNNING');
  res.json(ApiResponse.success(serialize(item), 'Program kerja mulai berjalan'));
});
router.post('/:id/complete', async (req, res) => {
  const item = await transitionOwnedProgram(req, parseId(req.params.id), 'COMPLETED');
  res.json(ApiResponse.success(serialize(item), 'Program kerja ditandai selesai'));
});
router.post('/:id/cancel', async (req, res) => {
  const note = z.object({ note: z.string().trim().min(5).max(2000) }).parse(req.body).note;
  const item = await transitionOwnedProgram(req, parseId(req.params.id), 'CANCELLED', note);
  res.json(ApiResponse.success(serialize(item), 'Program kerja dibatalkan'));
});

router.post('/:id/review', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID program kerja');
  const input = reviewSchema.parse(req.body);
  const item = await prisma.work_programs.findFirst({ where: { id, reviewer_tenant_id: BigInt(tenant.id), status: 'SUBMITTED' } });
  if (!item) throw new ApiError(404, 'Program kerja tidak tersedia untuk direview');
  assertWorkProgramTransition(item.status, input.decision);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.work_programs.update({ where: { id }, data: {
      status: input.decision, approved_at: input.decision === 'APPROVED' ? new Date() : null,
      approved_budget: input.decision === 'APPROVED' ? item.proposed_budget : null,
    } });
    await tx.work_program_status_history.create({ data: { work_program_id: id, tenant_id: item.tenant_id,
      from_status: item.status, to_status: input.decision, actor_user_id: BigInt(auth.user.id), actor_tenant_id: BigInt(tenant.id), note: input.note } });
    await createNotification({ recipientUserId: item.created_by_user_id, tenantId: item.tenant_id,
      type: `WORK_PROGRAM_${input.decision}`, title: `Program kerja ${input.decision === 'APPROVED' ? 'disetujui' : input.decision === 'REJECTED' ? 'ditolak' : 'perlu revisi'}`,
      body: input.note ?? item.name, targetUrl: `/${item.tenant_id.toString()}/proker/${id.toString()}`, objectType: 'work_program', objectId: id }, tx);
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: `WORK_PROGRAM_${input.decision}`,
      objectType: 'work_program', objectId: id, objectTenantId: item.tenant_id, before: { status: item.status }, after: { status: input.decision } }, tx);
    return result;
  });
  res.json(ApiResponse.success(serialize(updated), 'Keputusan review berhasil disimpan'));
});

export default router;
