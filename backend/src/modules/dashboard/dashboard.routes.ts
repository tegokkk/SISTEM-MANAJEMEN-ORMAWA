import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { prisma } from '../../core/prisma';
import { ApiResponse } from '../../utils/ApiResponse';
import { requireAuthContext } from '../../utils/request';
import { ApiError } from '../../utils/ApiError';
import { moneySummary } from '../../utils/money';

const router = Router();
router.use(requireAuth);

router.get('/summary', async (req, res) => {
  const auth = requireAuthContext(req);
  if (auth.user.roles.includes('SUPER_ADMIN') && !auth.activeTenant) {
    const [tenants, pendingApplications, activeHima, auditEvents] = await Promise.all([
      prisma.tenants.count({ where: { status: 'ACTIVE', deleted_at: null } }),
      prisma.tenant_applications.count({
        where: { requested_type: { in: ['ORMAWA', 'HMJ'] }, status: 'SUBMITTED' },
      }),
      prisma.tenants.count({ where: { tenant_type: 'HIMA', status: 'ACTIVE', deleted_at: null } }),
      prisma.audit_logs.count({
        where: { created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);
    return res.json(
      ApiResponse.success({
        actor: 'SUPER_ADMIN',
        metrics: { tenants, pendingApplications, activeHima, auditEvents },
      }),
    );
  }

  if (!auth.activeTenant) throw new ApiError(403, 'Tenant aktif diperlukan');
  const tenantId = BigInt(auth.activeTenant.id);
  const childFilter =
    auth.activeTenant.type === 'HMJ' ? { parent_tenant_id: tenantId, deleted_at: null } : undefined;
  const [members, programs, inventory, unreadMessages, children] = await Promise.all([
    prisma.members.count({ where: { tenant_id: tenantId, deleted_at: null, status: 'ACTIVE' } }),
    prisma.work_programs.count({ where: { tenant_id: tenantId, deleted_at: null } }),
    prisma.inventory_items.count({
      where: { tenant_id: tenantId, deleted_at: null, status: 'ACTIVE' },
    }),
    prisma.messages.count({
      where: {
        deleted_at: null,
        sender_tenant_id: { not: tenantId },
        conversations:
          auth.activeTenant.type === 'HMJ'
            ? { hmj_tenant_id: tenantId }
            : { hima_tenant_id: tenantId },
        message_reads: { none: { user_id: BigInt(auth.user.id) } },
      },
    }),
    childFilter ? prisma.tenants.count({ where: childFilter }) : Promise.resolve(0),
  ]);
  const [income, expense] = await Promise.all([
    prisma.financial_transactions.aggregate({
      where: { tenant_id: tenantId, status: 'POSTED', transaction_type: 'INCOME' },
      _sum: { amount: true },
    }),
    prisma.financial_transactions.aggregate({
      where: { tenant_id: tenantId, status: 'POSTED', transaction_type: 'EXPENSE' },
      _sum: { amount: true },
    }),
  ]);
  res.json(
    ApiResponse.success({
      actor: auth.activeTenant.type,
      metrics: {
        members,
        programs,
        inventory,
        unreadMessages,
        children,
        ...moneySummary(income._sum.amount, expense._sum.amount),
      },
    }),
  );
});

export default router;
