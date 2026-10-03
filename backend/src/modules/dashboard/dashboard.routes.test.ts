import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../core/prisma';
import { errorHandler } from '../../middleware/error.middleware';
import dashboardRoutes from './dashboard.routes';

const state = vi.hoisted(() => ({
  authContext: {
    user: { id: '1', email: 'admin@example.com', fullName: 'Admin', roles: ['SUPER_ADMIN'] },
    activeTenant: undefined as
      { id: string; type: 'ORMAWA' | 'HMJ' | 'HIMA'; name: string; roles: string[] } | undefined,
    sessionId: '1',
  },
}));

vi.mock('../../middleware/auth.middleware', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.authContext = state.authContext;
    next();
  },
}));
vi.mock('../../core/prisma', () => ({
  prisma: {
    tenants: { count: vi.fn() },
    tenant_applications: { count: vi.fn() },
    audit_logs: { count: vi.fn() },
    members: { count: vi.fn() },
    work_programs: { count: vi.fn() },
    inventory_items: { count: vi.fn() },
    messages: { count: vi.fn() },
    financial_transactions: { aggregate: vi.fn() },
  },
}));

const app = express();
app.use('/dashboard', dashboardRoutes);
app.use(errorHandler);

describe('dashboard summary reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.authContext.user.roles = ['SUPER_ADMIN'];
    state.authContext.activeTenant = undefined;
  });

  afterEach(() => vi.useRealTimers());

  it('uses the same active and pending filters exposed by admin drill-down links', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
    vi.mocked(prisma.tenants.count).mockResolvedValueOnce(12).mockResolvedValueOnce(7);
    vi.mocked(prisma.tenant_applications.count).mockResolvedValue(3);
    vi.mocked(prisma.audit_logs.count).mockResolvedValue(9);

    const response = await request(app).get('/dashboard/summary').expect(200);

    expect(response.body.data.metrics).toEqual({
      tenants: 12,
      pendingApplications: 3,
      activeHima: 7,
      auditEvents: 9,
    });
    expect(prisma.tenants.count).toHaveBeenNthCalledWith(1, {
      where: { status: 'ACTIVE', deleted_at: null },
    });
    expect(prisma.tenants.count).toHaveBeenNthCalledWith(2, {
      where: { tenant_type: 'HIMA', status: 'ACTIVE', deleted_at: null },
    });
    expect(prisma.tenant_applications.count).toHaveBeenCalledWith({
      where: { requested_type: { in: ['ORMAWA', 'HMJ'] }, status: 'SUBMITTED' },
    });
    expect(prisma.audit_logs.count).toHaveBeenCalledWith({
      where: { created_at: { gte: new Date('2026-09-27T12:00:00.000Z') } },
    });
  });

  it('reconciles tenant metrics with tenant-scoped detail filters and exact decimal totals', async () => {
    state.authContext.user.roles = [];
    state.authContext.activeTenant = {
      id: '11',
      type: 'HIMA',
      name: 'HIMA A',
      roles: ['HIMA_ADMIN'],
    };
    vi.mocked(prisma.members.count).mockResolvedValue(8);
    vi.mocked(prisma.work_programs.count).mockResolvedValue(5);
    vi.mocked(prisma.inventory_items.count).mockResolvedValue(4);
    vi.mocked(prisma.messages.count).mockResolvedValue(6);
    vi.mocked(prisma.financial_transactions.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: '100.10' } } as never)
      .mockResolvedValueOnce({ _sum: { amount: '19.01' } } as never);

    const response = await request(app).get('/dashboard/summary').expect(200);

    expect(response.body.data.metrics).toMatchObject({
      members: 8,
      programs: 5,
      inventory: 4,
      unreadMessages: 6,
      income: '100.10',
      expense: '19.01',
      balance: '81.09',
    });
    expect(prisma.members.count).toHaveBeenCalledWith({
      where: { tenant_id: 11n, deleted_at: null, status: 'ACTIVE' },
    });
    expect(prisma.work_programs.count).toHaveBeenCalledWith({
      where: { tenant_id: 11n, deleted_at: null },
    });
    expect(prisma.inventory_items.count).toHaveBeenCalledWith({
      where: { tenant_id: 11n, deleted_at: null, status: 'ACTIVE' },
    });
    expect(prisma.financial_transactions.aggregate).toHaveBeenNthCalledWith(1, {
      where: { tenant_id: 11n, status: 'POSTED', transaction_type: 'INCOME' },
      _sum: { amount: true },
    });
    expect(prisma.financial_transactions.aggregate).toHaveBeenNthCalledWith(2, {
      where: { tenant_id: 11n, status: 'POSTED', transaction_type: 'EXPENSE' },
      _sum: { amount: true },
    });
  });
});
