import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../core/prisma';
import { errorHandler } from '../middleware/error.middleware';
import financeRequestRoutes from './finance-requests/finance-requests.routes';
import financeRoutes from './finance/finance.routes';
import memberRoutes from './members/members.routes';
import messagingRoutes from './messaging/messaging.routes';
import organizationRoutes from './organization/organization.routes';

vi.mock('../middleware/auth.middleware', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.authContext = {
      user: { id: '1', email: 'test@example.com', fullName: 'Tester', roles: [] },
      activeTenant: { id: '11', type: 'HIMA', name: 'HIMA A', roles: ['HIMA_ADMIN'] },
      sessionId: '1',
    };
    next();
  },
}));
vi.mock('../middleware/role.guard', () => ({
  requireTenantRole: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));
vi.mock('../core/prisma', () => ({
  prisma: {
    members: { findFirst: vi.fn() },
    finance_requests: { findFirst: vi.fn() },
    conversations: { findFirst: vi.fn() },
    financial_transactions: { findFirst: vi.fn() },
    organization_assignments: { deleteMany: vi.fn() },
  },
}));

const app = express();
app.use(express.json());
app.use('/members', memberRoutes);
app.use('/finance-requests', financeRequestRoutes);
app.use('/messaging', messagingRoutes);
app.use('/finance', financeRoutes);
app.use('/organization', organizationRoutes);
app.use(errorHandler);

describe('IDOR protection across tenant resource routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('hides a member outside the active tenant', async () => {
    vi.mocked(prisma.members.findFirst).mockResolvedValue(null);
    await request(app).get('/members/42').expect(404);
    expect(prisma.members.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42n, tenant_id: 11n, deleted_at: null },
      }),
    );
  });

  it('hides a finance request outside source and target tenant scope', async () => {
    vi.mocked(prisma.finance_requests.findFirst).mockResolvedValue(null);
    await request(app).get('/finance-requests/42').expect(404);
    expect(prisma.finance_requests.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42n, OR: [{ source_tenant_id: 11n }, { target_tenant_id: 11n }] },
      }),
    );
  });

  it('hides messages for a conversation outside the active tenant', async () => {
    vi.mocked(prisma.conversations.findFirst).mockResolvedValue(null);
    await request(app).get('/messaging/conversations/42/messages').expect(404);
    expect(prisma.conversations.findFirst).toHaveBeenCalledWith({
      where: { id: 42n, OR: [{ hmj_tenant_id: 11n }, { hima_tenant_id: 11n }] },
    });
  });

  it('cannot post another tenant financial transaction', async () => {
    vi.mocked(prisma.financial_transactions.findFirst).mockResolvedValue(null);
    await request(app).post('/finance/transactions/42/post').expect(404);
    expect(prisma.financial_transactions.findFirst).toHaveBeenCalledWith({
      where: { id: 42n, tenant_id: 11n },
    });
  });

  it('cannot delete another tenant organization assignment', async () => {
    vi.mocked(prisma.organization_assignments.deleteMany).mockResolvedValue({ count: 0 });
    await request(app).delete('/organization/assignments/42').expect(404);
    expect(prisma.organization_assignments.deleteMany).toHaveBeenCalledWith({
      where: { id: 42n, tenant_id: 11n },
    });
  });
});
