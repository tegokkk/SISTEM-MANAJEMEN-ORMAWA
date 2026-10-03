import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  fullName: z.string().trim().min(3).max(150),
  email: z.string().trim().email().max(191).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  password: z.string().min(8).max(72)
    .regex(/[a-z]/, 'Password harus memuat huruf kecil')
    .regex(/[A-Z]/, 'Password harus memuat huruf besar')
    .regex(/[0-9]/, 'Password harus memuat angka'),
  passwordConfirmation: z.string(),
}).superRefine((data, ctx) => {
  if (data.password !== data.passwordConfirmation) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['passwordConfirmation'], message: 'Konfirmasi password tidak sama' });
  }
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8).max(72)
    .regex(/[a-z]/).regex(/[A-Z]/).regex(/[0-9]/),
});

export const SwitchTenantSchema = z.object({ tenantId: z.string().regex(/^\d+$/) });

export type RegisterRequest = z.infer<typeof RegisterSchema>;

export interface AuthUser {
  id: string; // BigInt serialized as string for JSON
  email: string;
  fullName: string;
  roles: string[]; // Global roles mapped to strings like 'SUPER_ADMIN'
}

export interface AuthTenant {
  id: string; // BigInt serialized as string
  type: 'ORMAWA' | 'HMJ' | 'HIMA';
  name: string;
  roles: string[]; // Roles specific to this tenant
}

export interface AuthContextDTO {
  user: AuthUser;
  activeTenant?: AuthTenant; // Might be undefined if not switched to any tenant, but normally present
  sessionId: string;
}

export interface LoginResponse {
  user: AuthUser;
  // If user has an active tenant, return it
  activeTenant?: AuthTenant;
}
