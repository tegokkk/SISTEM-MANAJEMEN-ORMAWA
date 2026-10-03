import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../core/prisma';
import { errorHandler } from '../middleware/error.middleware';
import inventoryRoutes from './inventory/inventory.routes';
import requirementRoutes from './requirements/requirements.routes';
import workProgramRoutes from './work-programs/work-programs.routes';

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
    inventory_items: { findFirst: vi.fn() },
    requirement_requests: { findFirst: vi.fn(), updateMany: vi.fn() },
    work_programs: { findFirst: vi.fn(), update: vi.fn() },
    tenants: { findUnique: vi.fn(), findFirst: vi.fn() },
    work_program_status_history: { create: vi.fn() },
    requirement_request_status_history: { create: vi.fn() },
    audit_logs: { create: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
  },
}));

const app = express();
app.use('/inventory', inventoryRoutes);
app.use('/requirements', requirementRoutes);
app.use('/work-programs', workProgramRoutes);
app.use(errorHandler);

describe('tenant-scoped resource routes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not expose another tenant inventory item by id', async () => {
    vi.mocked(prisma.inventory_items.findFirst).mockResolvedValue(null);
    const response = await request(app).get('/inventory/42');
    expect(response.status).toBe(404);
    expect(prisma.inventory_items.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42n, tenant_id: 11n, deleted_at: null },
      }),
    );
  });

  it('does not expose another tenant requirement by id', async () => {
    vi.mocked(prisma.requirement_requests.findFirst).mockResolvedValue(null);
    const response = await request(app).get('/requirements/42');
    expect(response.status).toBe(404);
    expect(prisma.requirement_requests.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42n, OR: [{ source_tenant_id: 11n }, { target_tenant_id: 11n }] },
      }),
    );
  });

  it('does not expose another tenant work program by id', async () => {
    vi.mocked(prisma.work_programs.findFirst).mockResolvedValue(null);
    const response = await request(app).get('/work-programs/42');
    expect(response.status).toBe(404);
    expect(prisma.work_programs.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 42n, OR: [{ tenant_id: 11n }, { reviewer_tenant_id: 11n }] },
      }),
    );
  });

  it('cancels only an editable requirement owned by the active tenant', async () => {
    vi.mocked(prisma.requirement_requests.findFirst).mockResolvedValue({
      id: 42n,
      status: 'DRAFT',
    } as never);
    vi.mocked(prisma.requirement_requests.updateMany).mockResolvedValue({ count: 1 });
    const response = await request(app).delete('/requirements/42');
    expect(response.status).toBe(200);
    expect(prisma.requirement_requests.updateMany).toHaveBeenCalledWith({
      where: { id: 42n, source_tenant_id: 11n, status: 'DRAFT' },
      data: { status: 'CANCELLED' },
    });
  });

  it('submits a HIMA program only to its parent HMJ', async () => {
    vi.mocked(prisma.work_programs.findFirst).mockResolvedValue({
      id: 42n,
      status: 'DRAFT',
      reviewer_tenant_id: null,
    } as never);
    vi.mocked(prisma.tenants.findUnique).mockResolvedValue({ parent_tenant_id: 10n } as never);
    vi.mocked(prisma.tenants.findFirst).mockResolvedValue({ id: 10n } as never);
    vi.mocked(prisma.work_programs.update).mockResolvedValue({
      id: 42n,
      status: 'SUBMITTED',
      reviewer_tenant_id: 10n,
    } as never);
    const response = await request(app).post('/work-programs/42/submit');
    expect(response.status).toBe(200);
    expect(prisma.work_programs.update).toHaveBeenCalledWith({
      where: { id: 42n },
      data: expect.objectContaining({ reviewer_tenant_id: 10n }),
    });
  });

  it('rejects a HIMA program when its parent HMJ is inactive', async () => {
    vi.mocked(prisma.work_programs.findFirst).mockResolvedValue({
      id: 42n,
      status: 'DRAFT',
      reviewer_tenant_id: null,
    } as never);
    vi.mocked(prisma.tenants.findUnique).mockResolvedValue({ parent_tenant_id: 10n } as never);
    vi.mocked(prisma.tenants.findFirst).mockResolvedValue(null);
    const response = await request(app).post('/work-programs/42/submit');
    expect(response.status).toBe(422);
    expect(prisma.work_programs.update).not.toHaveBeenCalled();
  });

  it('rejects disguised proposal content before storing it', async () => {
    vi.mocked(prisma.work_programs.findFirst).mockResolvedValue({
      id: 42n,
      status: 'DRAFT',
    } as never);
    const response = await request(app)
      .post('/work-programs/42/proposals')
      .field('title', 'Proposal Demo')
      .attach('file', Buffer.from('<script>alert(1)</script>'), 'proposal.pdf');
    expect(response.status).toBe(422);
    expect(response.body.message).toContain('PDF, PNG, atau JPEG');
  });
});
