import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../core/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { AuthUser, AuthTenant, AuthContextDTO } from '@sim-ormawa/contracts';
import { users_status } from '../generated/prisma';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = req.cookies[env.COOKIE_NAME];
    if (!sessionToken) {
      throw new ApiError(401, 'Silakan login terlebih dahulu');
    }

    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

    const session = await prisma.auth_sessions.findUnique({
      where: { token_hash: tokenHash },
      include: {
        users: {
          include: {
            user_roles: {
              where: { is_active: true, revoked_at: null, roles: { is_active: true } },
              include: { roles: true },
            },
          },
        },
      },
    });

    if (!session || session.revoked_at || session.expires_at < new Date()) {
      res.clearCookie(env.COOKIE_NAME);
      throw new ApiError(401, 'Sesi telah berakhir, silakan login kembali');
    }

    const user = session.users;
    if (user.status !== users_status.ACTIVE) {
      res.clearCookie(env.COOKIE_NAME);
      throw new ApiError(403, `Akun Anda berstatus ${user.status}.`);
    }

    const globalRoles = user.user_roles
      .filter(ur => ur.roles.scope === 'SYSTEM' && ur.is_active)
      .map(ur => ur.roles.code);

    const authUser: AuthUser = {
      id: user.id.toString(),
      email: user.email,
      fullName: user.full_name,
      roles: globalRoles,
    };

    let authTenant: AuthTenant | undefined;
    if (session.active_tenant_id) {
      const tenant = await prisma.tenants.findUnique({
        where: { id: session.active_tenant_id },
      });
      if (tenant?.status === 'ACTIVE' && !tenant.deleted_at) {
        const tenantRoles = user.user_roles
          .filter(ur => ur.tenant_id === session.active_tenant_id && ur.is_active)
          .map(ur => ur.roles.code);

        authTenant = {
          id: tenant.id.toString(),
          type: tenant.tenant_type,
          name: tenant.name,
          roles: tenantRoles,
        };
      }
    }

    req.authContext = {
      user: authUser,
      activeTenant: authTenant,
      sessionId: session.id.toString(),
    };

    next();
  } catch (error) {
    next(error);
  }
};
