'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateApplicationSchema, CreateApplicationRequest } from '@sim-ormawa/contracts';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import Link from 'next/link';
import { GraduationCap, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';

export default function HmjRegistrationPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    // Fetch departments
    api.get('/references/departments')
      .then(res => setDepartments(res.data.data))
      .catch(err => console.error('Gagal memuat jurusan', err));
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateApplicationRequest>({
    resolver: zodResolver(CreateApplicationSchema),
    defaultValues: {
      requested_type: 'HMJ',
    },
  });

  const onSubmit = async (data: CreateApplicationRequest) => {
    try {
      setError(null);
      const res = await api.post('/applications', data);
      
      // Submit langsung
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
            Pengajuan pendaftaran HMJ Anda telah berhasil dikirim ke Super Admin. Anda dapat memantau status pengajuan ini kapan saja.
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
            <div className="p-3 bg-emerald-600/10 rounded-xl">
              <GraduationCap className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-heading text-gray-900">Form Pendaftaran HMJ</h2>
              <p className="text-sm text-gray-500">Isi data lengkap Himpunan Mahasiswa Jurusan.</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <input type="hidden" {...register('requested_type')} value="HMJ" />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jurusan Induk *</label>
              <select
                {...register('requested_department_id')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-shadow bg-white"
              >
                <option value="">-- Pilih Jurusan --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {errors.requested_department_id && <p className="mt-1 text-sm text-red-500">{errors.requested_department_id.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Organisasi *</label>
                <input
                  {...register('organization_name')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-shadow"
                  placeholder="Contoh: HMJ Budidaya Tanaman Pangan"
                />
                {errors.organization_name && <p className="mt-1 text-sm text-red-500">{errors.organization_name.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Singkatan / Kode *</label>
                <input
                  {...register('organization_code')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-shadow uppercase"
                  placeholder="Contoh: HMJ-PANGAN"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Alasan Pengajuan *</label>
              <textarea
                {...register('reason')}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-shadow"
                placeholder="Jelaskan secara singkat mengenai organisasi ini..."
              />
              {errors.reason && <p className="mt-1 text-sm text-red-500">{errors.reason.message}</p>}
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <Button type="submit" isLoading={isSubmitting} size="lg" className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white">
                Kirim Pengajuan
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
