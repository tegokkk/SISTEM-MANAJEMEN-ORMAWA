import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { ForgotPasswordSchema, LoginSchema, RegisterSchema, ResetPasswordSchema, SwitchTenantSchema } from '@sim-ormawa/contracts';
import { ApiResponse } from '../../utils/ApiResponse';
import { env } from '../../config/env';

export class AuthController {
  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = RegisterSchema.parse(req.body);
      const user = await authService.register(data);
      res.status(201).json(ApiResponse.success(user, 'Akun berhasil dibuat. Silakan masuk untuk mengajukan organisasi.'));
    } catch (error) { next(error); }
  }

  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json(ApiResponse.error('Data input tidak valid', parsed.error.format()));
        return;
      }

      // IP and User-Agent
      const ip = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(parsed.data, ip, userAgent);

      // Set HttpOnly Cookie
      res.cookie(env.COOKIE_NAME, result.sessionToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });

      res.status(200).json(ApiResponse.success(result.response, 'Login berhasil'));
    } catch (error) {
      next(error);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionToken = req.cookies[env.COOKIE_NAME];
      if (sessionToken) {
        await authService.logout(sessionToken);
      }

      // Clear cookie
      res.clearCookie(env.COOKIE_NAME, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: 'lax',
        path: '/',
      });

      res.status(200).json(ApiResponse.success(null, 'Logout berhasil'));
    } catch (error) {
      next(error);
    }
  }

  public async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // The auth middleware will attach req.authContext if valid
      if (!req.authContext) {
        res.status(401).json(ApiResponse.error('Unauthorized'));
        return;
      }

      res.status(200).json(
        ApiResponse.success(
          {
            user: req.authContext.user,
            activeTenant: req.authContext.activeTenant,
          },
          'Profile fetched successfully'
        )
      );
    } catch (error) {
      next(error);
    }
  }

  public async switchTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.authContext) return next(new Error('Auth context missing'));
      const data = SwitchTenantSchema.parse(req.body);
      await authService.switchTenant(req.authContext.sessionId, req.authContext.user.id, data.tenantId);
      res.json(ApiResponse.success(null, 'Tenant aktif berhasil diubah'));
    } catch (error) { next(error); }
  }

  public async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = ForgotPasswordSchema.parse(req.body);
      await authService.requestPasswordReset(data.email);
      res.json(ApiResponse.success(null, 'Jika email terdaftar, instruksi reset akan dikirim.'));
    } catch (error) { next(error); }
  }

  public async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = ResetPasswordSchema.parse(req.body);
      await authService.resetPassword(data.token, data.password);
      res.json(ApiResponse.success(null, 'Password berhasil diubah. Silakan masuk kembali.'));
    } catch (error) { next(error); }
  }
}

export const authController = new AuthController();
