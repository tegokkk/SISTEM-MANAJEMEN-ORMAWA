import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../core/prisma';
import { errorHandler } from '../../middleware/error.middleware';
import notificationRoutes from './notifications.routes';

vi.mock('../../middleware/auth.middleware', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.authContext = { user: { id: '1', email: 'test@example.com', fullName: 'Tester', roles: [] },
      activeTenant: { id: '10', type: 'HMJ', name: 'HMJ', roles: ['HMJ_ADMIN'] }, sessionId: '1' };
    next();
  },
}));
vi.mock('../../core/prisma', () => ({ prisma: {
  notifications: { findFirst: vi.fn() }, work_programs: { findFirst: vi.fn() },
} }));

const app = express();
app.use('/notifications', notificationRoutes);
app.use(errorHandler);

describe('notification destination', () => {
  beforeEach(() => vi.clearAllMocks());

  it('denies another tenant even when the recipient owns the notification', async () => {
    vi.mocked(prisma.notifications.findFirst).mockResolvedValue({ object_id: 5n, object_type: 'work_program', tenant_id: 20n } as never);
    const response = await request(app).get('/notifications/1/destination');
    expect(response.status).toBe(403);
    expect(prisma.work_programs.findFirst).not.toHaveBeenCalled();
  });

  it('returns a canonical route after checking object ownership', async () => {
    vi.mocked(prisma.notifications.findFirst).mockResolvedValue({ object_id: 5n, object_type: 'work_program', tenant_id: 10n } as never);
    vi.mocked(prisma.work_programs.findFirst).mockResolvedValue({ id: 5n } as never);
    const response = await request(app).get('/notifications/1/destination');
    expect(response.status).toBe(200);
    expect(response.body.data.url).toBe('/portal/program-kerja');
    expect(prisma.work_programs.findFirst).toHaveBeenCalledWith({ where: { id: 5n, tenant_id: 10n, deleted_at: null }, select: { id: true } });
  });
});
