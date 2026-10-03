import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../utils/logger', () => ({ logger: { error: vi.fn() } }));

import { errorHandler } from './error.middleware';

describe('error handler', () => {
  it('returns a generic response for unexpected errors', () => {
    const json = vi.fn();
    const response = { locals: { requestId: 'req-1' }, status: vi.fn().mockReturnThis(), json } as unknown as Response;
    errorHandler(new Error('DATABASE_URL=mysql://secret'), { method: 'GET', originalUrl: '/boom' } as Request, response, vi.fn() as NextFunction);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('mysql://secret');
  });
});
