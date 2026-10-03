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

const router = Router();
router.use(requireAuth, requireTenantRole(['ORMAWA_ADMIN', 'HMJ_ADMIN', 'HIMA_ADMIN']));

const memberSchema = z.object({
  studentNumber: z.string().trim().min(3).max(50),
  fullName: z.string().trim().min(3).max(150),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  studyProgramId: z.string().regex(/^\d+$/).optional().nullable(),
  cohortYear: z.coerce.number().int().min(1990).max(2100).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']).default('UNSPECIFIED'),
  joinedAt: z.coerce.date().optional().nullable(),
});
const memberUpdateSchema = memberSchema.partial().extend({ status: z.enum(['ACTIVE', 'INACTIVE', 'ALUMNI']).optional() });

router.get('/', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const { page, limit, skip } = paginationFrom(req);
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const status = typeof req.query.status === 'string' && ['ACTIVE', 'INACTIVE', 'ALUMNI'].includes(req.query.status)
    ? req.query.status as 'ACTIVE' | 'INACTIVE' | 'ALUMNI' : undefined;
  const where = {
    tenant_id: BigInt(tenant.id), deleted_at: null, status,
    OR: query ? [{ full_name: { contains: query } }, { student_number: { contains: query } }, { email: { contains: query } }] : undefined,
  };
  const [items, total] = await Promise.all([
    prisma.members.findMany({
      where, skip, take: limit, orderBy: { full_name: 'asc' },
      include: { study_programs: { select: { id: true, code: true, name: true } } },
    }),
    prisma.members.count({ where }),
  ]);
  res.json(ApiResponse.success(serialize(items), 'Data anggota berhasil dimuat', { page, limit, total, totalPages: Math.ceil(total / limit) }));
});

router.post('/', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const input = memberSchema.parse(req.body);
  if (input.studyProgramId) {
    const program = await prisma.study_programs.findFirst({ where: { id: BigInt(input.studyProgramId), is_active: true } });
    if (!program) throw new ApiError(422, 'Program studi tidak valid');
  }
  const member = await prisma.$transaction(async (tx) => {
    const created = await tx.members.create({ data: {
      tenant_id: BigInt(tenant.id), student_number: input.studentNumber, full_name: input.fullName,
      email: input.email || null, phone: input.phone || null,
      study_program_id: input.studyProgramId ? BigInt(input.studyProgramId) : null,
      cohort_year: input.cohortYear, gender: input.gender, joined_at: input.joinedAt,
    } });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: 'MEMBER_CREATED',
      objectType: 'member', objectId: created.id, objectTenantId: BigInt(tenant.id), after: input }, tx);
    return created;
  });
  res.status(201).json(ApiResponse.success(serialize(member), 'Anggota berhasil ditambahkan'));
});

router.get('/:id', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const member = await prisma.members.findFirst({
    where: { id: parseId(req.params.id, 'ID anggota'), tenant_id: BigInt(tenant.id), deleted_at: null },
    include: { study_programs: true, organization_assignments: { include: { periods: true, positions: true } } },
  });
  if (!member) throw new ApiError(404, 'Anggota tidak ditemukan');
  res.json(ApiResponse.success(serialize(member)));
});

router.patch('/:id', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID anggota');
  const input = memberUpdateSchema.parse(req.body);
  const existing = await prisma.members.findFirst({ where: { id, tenant_id: BigInt(tenant.id), deleted_at: null } });
  if (!existing) throw new ApiError(404, 'Anggota tidak ditemukan');
  const data = {
    student_number: input.studentNumber, full_name: input.fullName, email: input.email === '' ? null : input.email,
    phone: input.phone === '' ? null : input.phone, study_program_id: input.studyProgramId === undefined ? undefined : input.studyProgramId ? BigInt(input.studyProgramId) : null,
    cohort_year: input.cohortYear, gender: input.gender, status: input.status, joined_at: input.joinedAt,
    left_at: input.status && input.status !== 'ACTIVE' ? new Date() : undefined,
  };
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.members.update({ where: { id }, data });
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: 'MEMBER_UPDATED',
      objectType: 'member', objectId: id, objectTenantId: BigInt(tenant.id), before: existing, after: data }, tx);
    return result;
  });
  res.json(ApiResponse.success(serialize(updated), 'Perubahan anggota berhasil disimpan'));
});

router.delete('/:id', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID anggota');
  const result = await prisma.$transaction(async (tx) => {
    const changed = await tx.members.updateMany({ where: { id, tenant_id: BigInt(tenant.id), deleted_at: null },
      data: { status: 'INACTIVE', left_at: new Date(), deleted_at: new Date() } });
    if (!changed.count) throw new ApiError(404, 'Anggota tidak ditemukan');
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: BigInt(tenant.id), action: 'MEMBER_DEACTIVATED',
      objectType: 'member', objectId: id, objectTenantId: BigInt(tenant.id) }, tx);
    return changed;
  });
  res.json(ApiResponse.success({ affected: result.count }, 'Anggota berhasil dinonaktifkan'));
});

export default router;
