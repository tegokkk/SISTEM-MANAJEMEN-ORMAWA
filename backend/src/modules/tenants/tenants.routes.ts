import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireGlobalRole, requireTenantRole } from '../../middleware/role.guard';
import { prisma } from '../../core/prisma';
import { ApiResponse } from '../../utils/ApiResponse';
import { paginationFrom, requireTenantContext } from '../../utils/request';
import { serialize } from '../../utils/serialize';

const router = Router();
router.use(requireAuth);

router.get('/admin-list', requireGlobalRole(['SUPER_ADMIN']), async (req, res) => {
  const { page, limit, skip } = paginationFrom(req, 100);
  const type = typeof req.query.type === 'string' && ['ORMAWA', 'HMJ', 'HIMA'].includes(req.query.type)
    ? req.query.type as 'ORMAWA' | 'HMJ' | 'HIMA' : undefined;
  const status = typeof req.query.status === 'string' && ['PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'INACTIVE'].includes(req.query.status)
    ? req.query.status as 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED' | 'INACTIVE' : undefined;
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const where = { deleted_at: null, tenant_type: type, status,
    OR: query ? [{ name: { contains: query } }, { code: { contains: query } }] : undefined };
  const [items, total] = await Promise.all([
    prisma.tenants.findMany({ where, skip, take: limit, orderBy: [{ tenant_type: 'asc' }, { name: 'asc' }],
      include: { departments: { select: { name: true } }, study_programs: { select: { name: true } }, tenants: { select: { name: true } },
        _count: { select: { members: true, user_roles: true } } } }),
    prisma.tenants.count({ where }),
  ]);
  res.json(ApiResponse.success(serialize(items), 'Tenant berhasil dimuat', { page, limit, total, totalPages: Math.ceil(total / limit) }));
});

router.use(requireTenantRole(['HMJ_ADMIN', 'HIMA_ADMIN']));

router.get('/communication-peers', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const tenantId = BigInt(tenant.id);
  const where = tenant.type === 'HMJ'
    ? { parent_tenant_id: tenantId, tenant_type: 'HIMA' as const, status: 'ACTIVE' as const, deleted_at: null }
    : tenant.type === 'HIMA'
      ? { id: (await prisma.tenants.findUnique({ where: { id: tenantId }, select: { parent_tenant_id: true } }))?.parent_tenant_id ?? BigInt(0), tenant_type: 'HMJ' as const, status: 'ACTIVE' as const, deleted_at: null }
      : null;
  if (!where) return res.status(403).json(ApiResponse.error('Pesan hanya tersedia untuk HMJ dan HIMA'));
  const items = await prisma.tenants.findMany({ where, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true, tenant_type: true } });
  res.json(ApiResponse.success(serialize(items)));
});

router.get('/children', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  if (tenant.type !== 'HMJ') return res.status(403).json(ApiResponse.error('Hanya HMJ yang dapat melihat tenant anak'));
  const items = await prisma.tenants.findMany({ where: { parent_tenant_id: BigInt(tenant.id), tenant_type: 'HIMA', deleted_at: null },
    orderBy: { name: 'asc' }, include: { study_programs: { select: { code: true, name: true } }, _count: { select: { members: true, work_programs_work_programs_tenant_idTotenants: true } } } });
  res.json(ApiResponse.success(serialize(items)));
});

router.get('/children/accounts', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  if (tenant.type !== 'HMJ') return res.status(403).json(ApiResponse.error('Hanya HMJ yang dapat melihat akun HIMA'));
  const roles = await prisma.user_roles.findMany({ where: { is_active: true, revoked_at: null, tenants: { parent_tenant_id: BigInt(tenant.id), tenant_type: 'HIMA' } },
    select: { id: true, assigned_at: true, roles: { select: { code: true, name: true } },
      tenants: { select: { id: true, name: true, code: true } }, users_user_roles_user_idTousers: { select: { id: true, full_name: true, email: true, status: true } } } });
  res.json(ApiResponse.success(serialize(roles)));
});

export default router;
