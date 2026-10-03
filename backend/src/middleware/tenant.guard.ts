import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * Ensures the user's active tenant matches the tenantId specified in the route parameters
 * e.g., /api/v1/tenants/:tenantId/programs
 */
export const requireTenantContext = (paramName: string = 'tenantId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.authContext) {
        throw new ApiError(401, 'Unauthorized');
      }

      // Global Super Admin has access
      if (req.authContext.user.roles.includes('SUPER_ADMIN')) {
        return next();
      }

      if (!req.authContext.activeTenant) {
        throw new ApiError(403, 'Anda tidak berada dalam konteks tenant yang aktif');
      }

      const routeTenantId = req.params[paramName];
      if (!routeTenantId) {
        // If the route doesn't have the param, this middleware shouldn't be used, but we let it pass if global
        return next();
      }

      if (req.authContext.activeTenant.id !== routeTenantId) {
        throw new ApiError(403, 'Akses ditolak: Anda tidak dapat mengakses data tenant lain');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
