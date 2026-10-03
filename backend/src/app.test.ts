import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./core/prisma', () => ({ prisma: { $queryRaw: vi.fn() } }));
vi.mock('./utils/logger', () => ({ logger: { error: vi.fn() } }));

import { prisma } from './core/prisma';
import { app } from './app';

describe('health checks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports liveness and database readiness without exposing failures', async () => {
    const live = await request(app).get('/health').expect(200);
    expect(live.headers['x-content-type-options']).toBe('nosniff');
    expect(live.headers['content-security-policy']).toBeDefined();
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ ok: 1 }] as never);
    await request(app).get('/health/ready').expect(200);
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('mysql://secret'));
    const unavailable = await request(app).get('/health/ready').expect(503);
    expect(JSON.stringify(unavailable.body)).not.toContain('mysql://secret');
  });
});
