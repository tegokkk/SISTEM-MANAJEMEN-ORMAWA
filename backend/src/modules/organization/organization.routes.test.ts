import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../core/prisma';
import { errorHandler } from '../../middleware/error.middleware';
import organizationRoutes from './organization.routes';

vi.mock('../../middleware/auth.middleware', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.authContext = {
      user: { id: '1', email: 'test@example.com', fullName: 'Tester', roles: [] },
      activeTenant: { id: '11', type: 'HIMA', name: 'HIMA A', roles: ['HIMA_ADMIN'] },
      sessionId: '1',
    };
    next();
  },
}));
vi.mock('../../middleware/role.guard', () => ({
  requireTenantRole: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));
vi.mock('../../core/prisma', () => ({
  prisma: {
    periods: { findMany: vi.fn(), findFirst: vi.fn() },
    positions: { findMany: vi.fn() },
    organization_assignments: { findMany: vi.fn() },
  },
}));

const app = express();
app.use('/organization', organizationRoutes);
app.use(errorHandler);

describe('organization tenant query scope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.periods.findMany).mockResolvedValue([]);
    vi.mocked(prisma.positions.findMany).mockResolvedValue([]);
    vi.mocked(prisma.periods.findFirst).mockResolvedValue({ id: 23n, name: '2026' } as never);
    vi.mocked(prisma.organization_assignments.findMany).mockResolvedValue([]);
  });

  it('scopes period and position lists to the active tenant', async () => {
    await request(app).get('/organization/periods').expect(200);
    await request(app).get('/organization/positions').expect(200);

    expect(prisma.periods.findMany).toHaveBeenCalledWith({
      where: { tenant_id: 11n },
      orderBy: { start_date: 'desc' },
    });
    expect(prisma.positions.findMany).toHaveBeenCalledWith({
      where: { tenant_id: 11n },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
  });

  it('scopes structure and export queries to both tenant and requested period', async () => {
    await request(app).get('/organization/structure?periodId=23').expect(200);
    await request(app).get('/organization/structure/export?periodId=23').expect(200);

    expect(prisma.periods.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 23n, tenant_id: 11n },
    });
    expect(prisma.periods.findFirst).toHaveBeenNthCalledWith(2, {
      where: { tenant_id: 11n, id: 23n },
    });
    expect(prisma.organization_assignments.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { tenant_id: 11n, period_id: 23n } }),
    );
    expect(prisma.organization_assignments.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ where: { tenant_id: 11n, period_id: 23n } }),
    );
  });
});
