import { Router } from 'express';
import { prisma } from '../../core/prisma';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';

const router = Router();
const publicSelect = {
  id: true,
  tenant_type: true,
  code: true,
  name: true,
  slug: true,
  description: true,
  departments: { select: { code: true, name: true } },
  study_programs: { select: { code: true, name: true, degree_level: true } },
  tenants: { select: { slug: true, name: true } },
  tenant_public_profiles: {
    select: { vision: true, mission: true, website_url: true, instagram_url: true, public_email: true, is_published: true },
  },
} as const;

function mapOrganization(item: Awaited<ReturnType<typeof findPublicOrganization>>) {
  if (!item) return null;
  const profile = item.tenant_public_profiles?.is_published ? item.tenant_public_profiles : null;
  return {
    id: item.id.toString(),
    type: item.tenant_type,
    code: item.code,
    name: item.name,
    slug: item.slug,
    description: item.description,
    department: item.departments,
    studyProgram: item.study_programs,
    parent: item.tenants,
    profile: profile ? {
      vision: profile.vision,
      mission: profile.mission,
      websiteUrl: profile.website_url,
      instagramUrl: profile.instagram_url,
      publicEmail: profile.public_email,
    } : null,
  };
}

function findPublicOrganization(slug: string) {
  return prisma.tenants.findFirst({
    where: { slug, status: 'ACTIVE', deleted_at: null },
    select: publicSelect,
  });
}

router.get('/organizations', async (req, res) => {
  const type = typeof req.query.type === 'string' && ['ORMAWA', 'HMJ', 'HIMA'].includes(req.query.type)
    ? req.query.type as 'ORMAWA' | 'HMJ' | 'HIMA'
    : undefined;
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const departmentId = typeof req.query.departmentId === 'string' && /^\d+$/.test(req.query.departmentId)
    ? BigInt(req.query.departmentId)
    : undefined;
  const studyProgramId = typeof req.query.studyProgramId === 'string' && /^\d+$/.test(req.query.studyProgramId)
    ? BigInt(req.query.studyProgramId)
    : undefined;

  const organizations = await prisma.tenants.findMany({
    where: {
      status: 'ACTIVE',
      deleted_at: null,
      tenant_type: type,
      department_id: departmentId,
      study_program_id: studyProgramId,
      OR: query ? [
        { name: { contains: query } },
        { code: { contains: query } },
        { description: { contains: query } },
      ] : undefined,
    },
    select: publicSelect,
    orderBy: [{ tenant_type: 'asc' }, { name: 'asc' }],
    take: 100,
  });
  res.json(ApiResponse.success(organizations.map((item) => mapOrganization(item))));
});

router.get('/organizations/:slug', async (req, res) => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const organization = await findPublicOrganization(slug);
  if (!organization) throw new ApiError(404, 'Profil organisasi tidak ditemukan');
  res.json(ApiResponse.success(mapOrganization(organization)));
});

router.get('/stats', async (_req, res) => {
  const [organizations, departments, studyPrograms] = await Promise.all([
    prisma.tenants.groupBy({ by: ['tenant_type'], where: { status: 'ACTIVE', deleted_at: null }, _count: true }),
    prisma.departments.count({ where: { is_active: true } }),
    prisma.study_programs.count({ where: { is_active: true } }),
  ]);
  res.json(ApiResponse.success({
    organizations: Object.fromEntries(organizations.map((row) => [row.tenant_type, row._count])),
    departments,
    studyPrograms,
  }));
});

export default router;
