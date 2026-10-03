import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { prisma } from '../../core/prisma';
import bcrypt from 'bcrypt';

// Mock dependencies
vi.mock('../../core/prisma', () => ({
  prisma: {
    users: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auth_sessions: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    password_reset_tokens: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tenants: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

describe('AuthService', () => {
  const authService = new AuthService();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  describe('login', () => {
    it('should throw error if user not found', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      await expect(
        authService.login({ email: 'test@test.com', password: 'password' }),
      ).rejects.toThrow('Email atau password salah');
    });

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 1n,
        email: 'test@test.com',
        full_name: 'Test User',
        password_hash: 'hashed_password',
        status: 'ACTIVE',
        user_roles: [
          {
            tenant_id: null,
            is_active: true,
            revoked_at: null,
            roles: {
              code: 'SUPER_ADMIN',
              scope: 'SYSTEM',
              is_active: true,
            },
          },
        ],
      } as any;

      vi.mocked(prisma.users.findUnique).mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(prisma.auth_sessions.create).mockResolvedValue({} as any);
      vi.mocked(prisma.users.update).mockResolvedValue({} as any);

      const result = await authService.login({ email: 'test@test.com', password: 'password' });

      expect(result.sessionToken).toBeDefined();
      expect(result.response.user.email).toBe('test@test.com');
      expect(result.response.user.roles).toContain('SUPER_ADMIN');
    });
  });

  describe('password reset', () => {
    it('returns silently for an unknown email without creating a token', async () => {
      vi.mocked(prisma.users.findUnique).mockResolvedValue(null);

      await authService.requestPasswordReset('missing@example.com');

      expect(prisma.password_reset_tokens.create).not.toHaveBeenCalled();
    });

    it('hashes the new password, consumes the token, and revokes active sessions atomically', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-28T12:00:00.000Z'));
      vi.mocked(prisma.password_reset_tokens.findUnique).mockResolvedValue({
        id: 9n,
        user_id: 3n,
        used_at: null,
        expires_at: new Date('2026-09-28T12:10:00.000Z'),
      } as never);
      vi.mocked(bcrypt.hash).mockResolvedValue('new-password-hash' as never);
      vi.mocked(prisma.users.update).mockResolvedValue({} as never);
      vi.mocked(prisma.password_reset_tokens.update).mockResolvedValue({} as never);
      vi.mocked(prisma.auth_sessions.updateMany).mockResolvedValue({ count: 2 });

      await authService.resetPassword('a'.repeat(64), 'SecurePass123');

      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123', 12);
      expect(prisma.users.update).toHaveBeenCalledWith({
        where: { id: 3n },
        data: { password_hash: 'new-password-hash' },
      });
      expect(prisma.password_reset_tokens.update).toHaveBeenCalledWith({
        where: { id: 9n },
        data: { used_at: new Date('2026-09-28T12:00:00.000Z') },
      });
      expect(prisma.auth_sessions.updateMany).toHaveBeenCalledWith({
        where: { user_id: 3n, revoked_at: null },
        data: { revoked_at: new Date('2026-09-28T12:00:00.000Z') },
      });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
