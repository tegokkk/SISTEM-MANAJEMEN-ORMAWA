import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../core/prisma';
import { errorHandler } from '../../middleware/error.middleware';
import financeRoutes from './finance.routes';

vi.mock('../../middleware/auth.middleware', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.authContext = { user: { id: '1', email: 'test@example.com', fullName: 'Tester', roles: [] },
      activeTenant: { id: '11', type: 'HIMA', name: 'HIMA', roles: ['HIMA_ADMIN'] }, sessionId: '1' };
    next();
  },
}));
vi.mock('../../middleware/role.guard', () => ({ requireTenantRole: () => (_req: Request, _res: Response, next: NextFunction) => next() }));
vi.mock('../../core/prisma', () => ({ prisma: {
  financial_transactions: { aggregate: vi.fn(), groupBy: vi.fn() }, transaction_categories: { findMany: vi.fn() },
} }));

const app = express();
app.use('/finance', financeRoutes);
app.use(errorHandler);

describe('finance report', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses posted transactions within the tenant and reconciles exact cents', async () => {
    vi.mocked(prisma.financial_transactions.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: '100.10' }, _count: 2 } as never)
      .mockResolvedValueOnce({ _sum: { amount: '19.01' }, _count: 1 } as never);
    vi.mocked(prisma.financial_transactions.groupBy).mockResolvedValue([] as never);
    vi.mocked(prisma.transaction_categories.findMany).mockResolvedValue([]);
    const response = await request(app).get('/finance/report?dateFrom=2026-09-01&dateTo=2026-09-30');
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ income: '100.10', expense: '19.01', balance: '81.09', transactionCount: 3 });
    expect(prisma.financial_transactions.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenant_id: 11n, status: 'POSTED', transaction_date: {
        gte: new Date('2026-09-01T00:00:00.000Z'), lt: new Date('2026-10-01T00:00:00.000Z'),
      } }),
    }));
  });
});
