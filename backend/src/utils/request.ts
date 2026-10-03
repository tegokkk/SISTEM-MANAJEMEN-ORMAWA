import { Request } from 'express';
import { AuthContextDTO } from '@sim-ormawa/contracts';
import { ApiError } from './ApiError';

export function requireAuthContext(req: Request): AuthContextDTO {
  if (!req.authContext) throw new ApiError(401, 'Silakan login terlebih dahulu', undefined, 'UNAUTHENTICATED');
  return req.authContext;
}

export function requireTenantContext(req: Request) {
  const auth = requireAuthContext(req);
  if (!auth.activeTenant) throw new ApiError(403, 'Pilih tenant aktif terlebih dahulu', undefined, 'TENANT_REQUIRED');
  return { auth, tenant: auth.activeTenant };
}

export function parseId(value: string | string[] | undefined, label = 'ID'): bigint {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw) || raw === '0') {
    throw new ApiError(400, `${label} tidak valid`, undefined, 'INVALID_ID');
  }
  return BigInt(raw);
}

export function paginationFrom(req: Request, maxLimit = 100) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}
