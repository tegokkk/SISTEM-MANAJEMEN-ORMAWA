import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/components/PasswordResetForms';

export const metadata: Metadata = {
  title: 'Lupa Kata Sandi',
  description: 'Minta tautan reset kata sandi SIM ORMAWA.',
};

export default function Page() {
  return <ForgotPasswordForm />;
}
