import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../core/prisma';
import { errorHandler } from '../../middleware/error.middleware';
import fileRoutes from './files.routes';

vi.mock('../../middleware/auth.middleware', () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.authContext = { user: { id: '1', email: 'test@example.com', fullName: 'Tester', roles: [] },
      activeTenant: { id: '11', type: 'HIMA', name: 'HIMA', roles: ['HIMA_ADMIN'] }, sessionId: '1' };
    next();
  },
}));
vi.mock('../../core/prisma', () => ({ prisma: {
  proposals: { findFirst: vi.fn() }, financial_transactions: { findFirst: vi.fn() }, files: { findFirst: vi.fn() },
} }));

const app = express();
app.use('/files', fileRoutes);
app.use(errorHandler);

describe('private file download', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects an unrelated tenant before reading file metadata or bytes', async () => {
    vi.mocked(prisma.proposals.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.financial_transactions.findFirst).mockResolvedValue(null);
    const response = await request(app).get('/files/99/download');
    expect(response.status).toBe(404);
    expect(prisma.proposals.findFirst).toHaveBeenCalledWith({ where: { file_id: 99n, OR: [
      { tenant_id: 11n }, { work_programs: { reviewer_tenant_id: 11n, deleted_at: null } },
    ] }, select: { id: true } });
    expect(prisma.files.findFirst).not.toHaveBeenCalled();
  });
});
