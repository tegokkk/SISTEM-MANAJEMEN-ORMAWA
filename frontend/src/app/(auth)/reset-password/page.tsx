import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/features/auth/components/PasswordResetForms';

export const metadata: Metadata = {
  title: 'Reset Kata Sandi',
  description: 'Buat kata sandi baru untuk akun SIM ORMAWA.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const rawToken = (await searchParams).token;
  const token =
    typeof rawToken === 'string' && /^[a-f0-9]{64}$/i.test(rawToken) ? rawToken : undefined;
  return <ResetPasswordForm token={token} />;
}
