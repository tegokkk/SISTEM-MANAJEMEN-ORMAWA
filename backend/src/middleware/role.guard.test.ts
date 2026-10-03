import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../utils/ApiError';
import { requireGlobalRole, requireTenantRole } from './role.guard';

function request(globalRoles: string[] = [], tenantRoles?: string[]) {
  return { authContext: { user: { roles: globalRoles }, activeTenant: tenantRoles ? { roles: tenantRoles } : undefined } } as Request;
}

describe('role guards', () => {
  it('enforces global and active-tenant roles while preserving the super-admin override', () => {
    const response = {} as Response;
    const denied = vi.fn();
    requireTenantRole(['HMJ_ADMIN'])(request([], ['HIMA_ADMIN']), response, denied as NextFunction);
    expect(denied.mock.calls[0][0]).toBeInstanceOf(ApiError);
    expect((denied.mock.calls[0][0] as ApiError).statusCode).toBe(403);

    const tenantAllowed = vi.fn();
    requireTenantRole(['HMJ_ADMIN'])(request([], ['HMJ_ADMIN']), response, tenantAllowed as NextFunction);
    expect(tenantAllowed).toHaveBeenCalledWith();

    const globalAllowed = vi.fn();
    requireGlobalRole(['AUDITOR'])(request(['SUPER_ADMIN']), response, globalAllowed as NextFunction);
    expect(globalAllowed).toHaveBeenCalledWith();
  });
});
