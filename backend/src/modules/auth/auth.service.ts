import { prisma } from '../../core/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ApiError } from '../../utils/ApiError';
import { LoginRequest, AuthUser, AuthTenant, LoginResponse, RegisterRequest } from '@sim-ormawa/contracts';
import { users_status } from '../../generated/prisma';

export class AuthService {
  async register(input: RegisterRequest) {
    const existing = await prisma.users.findUnique({ where: { email: input.email } });
    if (existing) throw new ApiError(409, 'Email sudah terdaftar', undefined, 'EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.users.create({
      data: {
        email: input.email,
        full_name: input.fullName,
        phone: input.phone || null,
        password_hash: passwordHash,
        status: 'ACTIVE',
        email_verified_at: new Date(),
      },
      select: { id: true, email: true, full_name: true },
    });
    return { id: user.id.toString(), email: user.email, fullName: user.full_name };
  }

  /**
   * Performs login using email and password, returning the user and generating a session token.
   */
  async login(credentials: LoginRequest, ipAddress?: string, userAgent?: string): Promise<{ sessionToken: string; response: LoginResponse }> {
    const user = await prisma.users.findUnique({
      where: { email: credentials.email },
      include: {
        user_roles: {
          include: { roles: true },
        },
      },
    });

    if (!user) {
      throw new ApiError(401, 'Email atau password salah');
    }

    if (user.status !== users_status.ACTIVE) {
      throw new ApiError(403, `Akun Anda berstatus ${user.status}. Silakan hubungi administrator.`);
    }

    if (!user.password_hash) {
      throw new ApiError(401, 'Akun ini tidak menggunakan login password lokal. Silakan gunakan SSO.');
    }

    const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Email atau password salah');
    }

    // Generate secure opaque token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Create session (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Retrieve active tenant if any (from the first tenant-scoped role they have, or null)
    const firstTenantRole = user.user_roles.find(ur => ur.tenant_id !== null && ur.is_active && !ur.revoked_at);
    const activeTenantId = firstTenantRole ? firstTenantRole.tenant_id : null;

    await prisma.auth_sessions.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        active_tenant_id: activeTenantId,
        // IP storage needs canonical IPv4/IPv6 bytes. Keep it null rather than storing invalid UTF-8 bytes.
        ip_address: undefined,
        user_agent: userAgent,
        expires_at: expiresAt,
      },
    });

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    // Determine global roles
    const globalRoles = user.user_roles
      .filter(ur => ur.roles.scope === 'SYSTEM' && ur.is_active && !ur.revoked_at && ur.roles.is_active)
      .map(ur => ur.roles.code);

    const authUser: AuthUser = {
      id: user.id.toString(),
      email: user.email,
      fullName: user.full_name,
      roles: globalRoles,
    };

    let authTenant: AuthTenant | undefined;
    if (activeTenantId) {
      const tenant = await prisma.tenants.findUnique({
        where: { id: activeTenantId },
      });
      if (tenant?.status === 'ACTIVE' && !tenant.deleted_at) {
        // Find tenant-specific roles for this user
        const tenantRoles = user.user_roles
          .filter(ur => ur.tenant_id === activeTenantId && ur.is_active && !ur.revoked_at && ur.roles.is_active)
          .map(ur => ur.roles.code);

        authTenant = {
          id: tenant.id.toString(),
          type: tenant.tenant_type,
          name: tenant.name,
          roles: tenantRoles,
        };
      }
    }

    return {
      sessionToken: token, // Sent via cookie
      response: {
        user: authUser,
        activeTenant: authTenant,
      },
    };
  }

  /**
   * Revokes the given session token.
   */
  async logout(sessionToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

    await prisma.auth_sessions.updateMany({
      where: {
        token_hash: tokenHash,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
  }

  async switchTenant(sessionId: string, userId: string, tenantId: string): Promise<void> {
    const assignment = await prisma.user_roles.findFirst({
      where: {
        user_id: BigInt(userId),
        tenant_id: BigInt(tenantId),
        is_active: true,
        revoked_at: null,
        roles: { is_active: true },
        tenants: { status: 'ACTIVE', deleted_at: null },
      },
    });
    if (!assignment) throw new ApiError(403, 'Anda tidak memiliki akses ke tenant tersebut');
    await prisma.auth_sessions.update({
      where: { id: BigInt(sessionId) },
      data: { active_tenant_id: BigInt(tenantId) },
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') return;
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.password_reset_tokens.create({
      data: { user_id: user.id, token_hash: tokenHash, expires_at: new Date(Date.now() + 30 * 60 * 1000) },
    });
    // Token delivery belongs to the configured email provider and is deliberately never logged.
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const reset = await prisma.password_reset_tokens.findUnique({ where: { token_hash: tokenHash } });
    if (!reset || reset.used_at || reset.expires_at < new Date()) {
      throw new ApiError(400, 'Tautan reset password tidak valid atau kedaluwarsa');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction([
      prisma.users.update({ where: { id: reset.user_id }, data: { password_hash: passwordHash } }),
      prisma.password_reset_tokens.update({ where: { id: reset.id }, data: { used_at: new Date() } }),
      prisma.auth_sessions.updateMany({ where: { user_id: reset.user_id, revoked_at: null }, data: { revoked_at: new Date() } }),
    ]);
  }
}

export const authService = new AuthService();
