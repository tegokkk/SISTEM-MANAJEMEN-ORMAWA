'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/errors';

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    const form = event.currentTarget;
    const email = String(new FormData(form).get('email') ?? '').trim();
    try {
      await apiClient.post('/auth/forgot-password', { email });
      setMessage({ kind: 'success', text: 'Jika email terdaftar, instruksi reset akan dikirim.' });
      form.reset();
    } catch (error) {
      setMessage({
        kind: 'error',
        text: getApiErrorMessage(error, 'Permintaan reset gagal dikirim.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Lupa kata sandi"
      description="Masukkan email akun aktif. Tautan reset berlaku selama 30 menit."
    >
      {message && <Alert variant={message.kind}>{message.text}</Alert>}
      <form className="space-y-5" onSubmit={submit}>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />
        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
          Kirim instruksi reset
        </Button>
      </form>
    </AuthCard>
  );
}

export function ResetPasswordForm({ token }: { token?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get('password') ?? '');
    const confirmation = String(data.get('confirmation') ?? '');
    if (
      password.length > 72 ||
      !/[a-z]/.test(password) ||
      !/[A-Z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      setMessage({
        kind: 'error',
        text: 'Kata sandi harus berisi huruf kecil, huruf besar, dan angka.',
      });
      return;
    }
    if (password !== confirmation) {
      setMessage({ kind: 'error', text: 'Konfirmasi kata sandi tidak sama.' });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      await apiClient.post('/auth/reset-password', { token, password });
      setMessage({ kind: 'success', text: 'Kata sandi berhasil diubah. Silakan masuk kembali.' });
      form.reset();
    } catch (error) {
      setMessage({
        kind: 'error',
        text: getApiErrorMessage(error, 'Tautan reset tidak valid atau kedaluwarsa.'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="Buat kata sandi baru"
      description="Gunakan minimal 8 karakter dan jangan gunakan ulang kata sandi lama."
    >
      {!token && (
        <Alert variant="error">
          Token reset tidak ditemukan. Minta tautan baru dari halaman lupa kata sandi.
        </Alert>
      )}
      {message && <Alert variant={message.kind}>{message.text}</Alert>}
      <form className="space-y-5" onSubmit={submit}>
        <Input
          id="reset-password"
          name="password"
          type="password"
          label="Kata sandi baru"
          autoComplete="new-password"
          minLength={8}
          leftIcon={<KeyRound className="h-4 w-4" />}
          required
          disabled={!token}
        />
        <Input
          id="reset-confirmation"
          name="confirmation"
          type="password"
          label="Ulangi kata sandi"
          autoComplete="new-password"
          minLength={8}
          leftIcon={<KeyRound className="h-4 w-4" />}
          required
          disabled={!token}
        />
        <Button type="submit" fullWidth size="lg" isLoading={isSubmitting} disabled={!token}>
          Simpan kata sandi
        </Button>
      </form>
    </AuthCard>
  );
}

function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section
        className="w-full max-w-md space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8"
        aria-labelledby="auth-card-title"
      >
        <div>
          <span className="mb-4 inline-flex rounded-2xl bg-brand-50 p-3 text-brand-700">
            <KeyRound aria-hidden="true" className="h-6 w-6" />
          </span>
          <h1 id="auth-card-title" className="text-2xl font-bold">
            {title}
          </h1>
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        </div>
        {children}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke halaman masuk
        </Link>
      </section>
    </main>
  );
}
