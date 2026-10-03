import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

/**
 * Creates a middleware that requires the user to have ANY of the specified GLOBAL roles.
 * If requireAll is true, the user must have ALL of the specified roles.
 */
export const requireGlobalRole = (roles: string[], requireAll: boolean = false) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.authContext) {
        throw new ApiError(401, 'Unauthorized');
      }

      const userRoles = req.authContext.user.roles;
      let hasAccess = false;

      if (requireAll) {
        hasAccess = roles.every(role => userRoles.includes(role));
      } else {
        hasAccess = roles.some(role => userRoles.includes(role));
      }

      // SUPER_ADMIN overrides
      if (userRoles.includes('SUPER_ADMIN')) {
        hasAccess = true;
      }

      if (!hasAccess) {
        throw new ApiError(403, 'Anda tidak memiliki hak akses untuk resource ini');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Creates a middleware that requires the user to have ANY of the specified TENANT roles
 * within their currently active tenant.
 */
export const requireTenantRole = (roles: string[], requireAll: boolean = false) => {
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
        throw new ApiError(403, 'Aksi ini membutuhkan konteks tenant yang aktif');
      }

      const tenantRoles = req.authContext.activeTenant.roles;
      let hasAccess = false;

      if (requireAll) {
        hasAccess = roles.every(role => tenantRoles.includes(role));
      } else {
        hasAccess = roles.some(role => tenantRoles.includes(role));
      }

      if (!hasAccess) {
        throw new ApiError(403, 'Anda tidak memiliki hak akses tenant untuk aksi ini');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
