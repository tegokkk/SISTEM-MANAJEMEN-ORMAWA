'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { LoginSchema, type LoginRequest } from '@sim-ormawa/contracts';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { apiClient, ApiClientError } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import type { LoginResponse } from '@sim-ormawa/contracts';

export function LoginForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginRequest) => {
    setServerError(null);
    try {
      const result = await apiClient.post<LoginResponse>('/auth/login', data);

      setIsSuccess(true);
      await refresh();

      // Redirect based on role
      const roles = result.user.roles;
      let destination = '/status-pengajuan';

      if (roles.includes('SUPER_ADMIN')) {
        destination = '/admin/dashboard';
      } else if (result.activeTenant?.type === 'ORMAWA') {
        destination = '/ormawa/dashboard';
      } else if (result.activeTenant?.type === 'HMJ') {
        destination = '/hmj/dashboard';
      } else if (result.activeTenant?.type === 'HIMA') {
        destination = '/hima/dashboard';
      }

      const requestedRedirect = new URLSearchParams(window.location.search).get('redirect');
      if (requestedRedirect?.startsWith('/') && !requestedRedirect.startsWith('//')) {
        destination = requestedRedirect;
      }

      router.replace(destination);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else {
        setServerError('Terjadi kesalahan koneksi, silakan coba lagi.');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-600/10 mb-5">
          <Shield size={22} className="text-brand-600" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-gray-900">Selamat Datang</h1>
        <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
          Masuk ke portal SIM ORMAWA menggunakan akun yang telah terdaftar.
        </p>
      </div>

      {/* Error/Success Alerts */}
      {serverError && (
        <Alert variant="error" onDismiss={() => setServerError(null)}>
          {serverError}
        </Alert>
      )}
      {isSuccess && <Alert variant="success">Berhasil masuk! Mengalihkan halaman...</Alert>}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          id="login-email"
          type="email"
          label="Email"
          placeholder="contoh@polinela.ac.id"
          autoComplete="email"
          leftIcon={<Mail size={15} />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          id="login-password"
          type="password"
          label="Kata Sandi"
          placeholder="••••••••"
          autoComplete="current-password"
          leftIcon={<Lock size={15} />}
          error={errors.password?.message}
          {...register('password')}
        />

        {/* Forgot password link */}
        <div className="flex justify-end">
          <Link
            href="/lupa-password"
            className="text-xs text-brand-600 hover:text-brand-500 font-medium transition-colors"
          >
            Lupa kata sandi?
          </Link>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isSubmitting}
          rightIcon={<ArrowRight size={18} />}
          className="mt-2"
          id="btn-login-submit"
        >
          {isSubmitting ? 'Memverifikasi...' : 'Masuk'}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">INFORMASI</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Info boxes */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'ORMAWA', color: 'bg-blue-50 border-blue-100 text-blue-700' },
          { label: 'HMJ', color: 'bg-emerald-50 border-emerald-100 text-emerald-700' },
          { label: 'HIMA', color: 'bg-amber-50 border-amber-100 text-amber-700' },
        ].map(({ label, color }) => (
          <div key={label} className={`${color} border rounded-xl p-3 text-center`}>
            <p className="text-xs font-semibold">{label}</p>
            <p className="text-xs opacity-70 mt-0.5">Portal masuk satu pintu</p>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-gray-400">
        Belum memiliki akun organisasi?{' '}
        <Link
          href="/daftar"
          className="text-brand-600 hover:text-brand-500 font-semibold transition-colors"
        >
          Ajukan pendaftaran
        </Link>
      </p>
    </motion.div>
  );
}
