'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateApplicationSchema, CreateApplicationRequest } from '@sim-ormawa/contracts';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import Link from 'next/link';
import { Building2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';

export default function OrmawaRegistrationPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateApplicationRequest>({
    resolver: zodResolver(CreateApplicationSchema),
    defaultValues: {
      requested_type: 'ORMAWA',
    },
  });

  const onSubmit = async (data: CreateApplicationRequest) => {
    try {
      setError(null);
      // Panggil API (membutuhkan Auth, karena ini halaman publik tapi user sudah punya akun? 
      // Tunggu, form pengajuan butuh auth. Jika user belum login, lempar ke /login dulu
      const res = await api.post('/applications', data);
      
      // Jika butuh submit langsung dari DRAFT -> SUBMITTED
      if (res.data.data.id) {
        await api.patch(`/applications/${res.data.data.id}/submit`, {});
      }
      
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Terjadi kesalahan saat mengirim pengajuan.'));
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 rounded-2xl shadow-xl text-center border border-gray-100">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pengajuan Terkirim!</h2>
          <p className="text-gray-500 mb-8">
            Pengajuan pendaftaran ORMAWA Anda telah berhasil dikirim ke Super Admin. Anda dapat memantau status pengajuan ini kapan saja.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/status-pengajuan">
              <Button className="w-full">Cek Status Pengajuan</Button>
            </Link>
            <Link href="/daftar">
              <Button variant="outline" className="w-full">Kembali</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <Link href="/daftar" className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
          </Link>
          <Logo />
        </div>

        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-brand-primary/10 rounded-xl">
              <Building2 className="h-6 w-6 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-heading text-gray-900">Form Pendaftaran ORMAWA</h2>
              <p className="text-sm text-gray-500">Isi data lengkap organisasi tingkat Politeknik.</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <input type="hidden" {...register('requested_type')} value="ORMAWA" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Organisasi *</label>
                <input
                  {...register('organization_name')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-shadow"
                  placeholder="Contoh: BEM KBM Polinela"
                />
                {errors.organization_name && <p className="mt-1 text-sm text-red-500">{errors.organization_name.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Singkatan / Kode *</label>
                <input
                  {...register('organization_code')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-shadow uppercase"
                  placeholder="Contoh: BEM"
                />
                {errors.organization_code && <p className="mt-1 text-sm text-red-500">{errors.organization_code.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Organisasi</label>
                <input
                  {...register('organization_email')}
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-shadow"
                  placeholder="opsional@polinela.ac.id"
                />
                {errors.organization_email && <p className="mt-1 text-sm text-red-500">{errors.organization_email.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon / WhatsApp</label>
                <input
                  {...register('organization_phone')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-shadow"
                  placeholder="081234567890"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Singkat</label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-shadow"
                placeholder="Jelaskan secara singkat mengenai organisasi ini..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Pengajuan *</label>
              <textarea
                {...register('reason')}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-shadow"
                placeholder="Jelaskan mengapa organisasi ini perlu didirikan atau diregistrasikan ke sistem..."
              />
              {errors.reason && <p className="mt-1 text-sm text-red-500">{errors.reason.message}</p>}
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Button type="submit" isLoading={isSubmitting} size="lg" className="w-full md:w-auto">
                Kirim Pengajuan
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
