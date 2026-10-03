import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { prisma } from '../../core/prisma';
import { ApiResponse } from '../../utils/ApiResponse';
import { paginationFrom, requireAuthContext } from '../../utils/request';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const auth = requireAuthContext(req);
  const { page, limit, skip } = paginationFrom(req, 100);
  const isSuperAdmin = auth.user.roles.includes('SUPER_ADMIN');
  const tenantId = auth.activeTenant?.id;
  if (!isSuperAdmin && !tenantId) return res.status(403).json(ApiResponse.error('Akses ditolak'));
  const action = typeof req.query.action === 'string' ? req.query.action.slice(0, 100) : undefined;
  const sinceHoursRaw =
    typeof req.query.sinceHours === 'string' ? Number(req.query.sinceHours) : undefined;
  const sinceHours =
    Number.isInteger(sinceHoursRaw) && sinceHoursRaw! >= 1 && sinceHoursRaw! <= 720
      ? sinceHoursRaw
      : undefined;
  const where = {
    object_tenant_id: isSuperAdmin ? undefined : BigInt(tenantId!),
    action: action ? { contains: action } : undefined,
    created_at: sinceHours
      ? { gte: new Date(Date.now() - sinceHours * 60 * 60 * 1000) }
      : undefined,
  };
  const [items, total] = await Promise.all([
    prisma.audit_logs.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip,
      take: limit,
      include: { users: { select: { full_name: true } } },
    }),
    prisma.audit_logs.count({ where }),
  ]);
  res.json(
    ApiResponse.success(
      items.map((item) => ({
        id: item.id.toString(),
        action: item.action,
        objectType: item.object_type,
        objectId: item.object_id?.toString(),
        actorName: item.users?.full_name ?? 'Sistem',
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
        createdAt: item.created_at.toISOString(),
      })),
      'Audit log berhasil dimuat',
      { page, limit, total, totalPages: Math.ceil(total / limit) },
    ),
  );
});

export default router;
