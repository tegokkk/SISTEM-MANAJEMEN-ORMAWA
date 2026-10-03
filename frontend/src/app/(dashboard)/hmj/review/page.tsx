'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ApplicationDetail, ApplicationSummary } from '@sim-ormawa/contracts';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Radio } from '@/components/ui/FormControls';
import { Eye, Check, X, MessageSquareWarning } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getApiErrorMessage } from '@/lib/errors';

const ReviewFormSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REVISION_REQUESTED']),
  note: z.string().optional(),
}).superRefine((data, ctx) => {
  if ((data.decision === 'REJECTED' || data.decision === 'REVISION_REQUESTED') && (!data.note || !data.note.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Catatan wajib diisi saat menolak atau meminta revisi',
      path: ['note'],
    });
  }
});

type ReviewFormData = z.infer<typeof ReviewFormSchema>;

export default function HmjReviewPengajuanPage() {
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ApplicationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchApplications = () => {
    setLoading(true);
    api.get('/applications')
      .then(res => setApplications(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    api.get('/applications')
      .then((res) => {
        if (!cancelled) setApplications(res.data.data);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openDetail = async (id: string) => {
    setSelectedAppId(id);
    setIsModalOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/applications/${id}`);
      setDetailData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ReviewFormData>({
    resolver: zodResolver(ReviewFormSchema),
    defaultValues: { decision: 'APPROVED', note: '' }
  });

  const decision = useWatch({ control, name: 'decision' });

  const onSubmitReview = async (data: ReviewFormData) => {
    if (!selectedAppId) return;
    try {
      await api.post(`/applications/${selectedAppId}/review`, data);
      setIsModalOpen(false);
      reset();
      fetchApplications();
    } catch (err: unknown) {
      alert(getApiErrorMessage(err, 'Gagal menyimpan review'));
    }
  };

  const columns = [
    {
      header: 'Organisasi',
      cell: (item: ApplicationSummary) => (
        <div>
          <p className="font-semibold text-gray-900">{item.organization_name}</p>
          <p className="text-xs text-gray-500">{item.organization_code}</p>
        </div>
      ),
    },
    {
      header: 'Pemohon',
      cell: (item: ApplicationSummary) => (
        <div>
          <p className="text-sm text-gray-900">{item.applicant.fullName}</p>
          <p className="text-xs text-gray-500">{item.applicant.email}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (item: ApplicationSummary) => <StatusBadge status={item.status} />,
    },
    {
      header: 'Aksi',
      className: 'text-right',
      cell: (item: ApplicationSummary) => (
        <button
          onClick={() => openDetail(item.id)}
          className="inline-flex items-center justify-center p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-brand-primary/10 hover:text-brand-primary transition-colors"
          title="Lihat Detail & Review"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-gray-900">Review Pengajuan HIMA</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tinjau dan setujui pendaftaran Himpunan Mahasiswa Program Studi (HIMA) di bawah jurusan Anda.
        </p>
      </div>

      <DataTable
        data={applications}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        emptyMessage="Tidak ada pengajuan HIMA saat ini."
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setDetailData(null); reset(); }}
        title="Detail Pengajuan HIMA"
        maxWidth="2xl"
      >
        {loadingDetail ? (
          <div className="py-12 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-brand-primary border-t-transparent rounded-full"></div></div>
        ) : detailData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-gray-500">Nama HIMA</p>
                <p className="font-semibold text-gray-900">{detailData.organization_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Singkatan / Kode</p>
                <p className="font-semibold text-gray-900">{detailData.organization_code}</p>
              </div>
              <div>
                <p className="text-gray-500">Program Studi</p>
                <p className="font-semibold text-gray-900">{detailData.study_program?.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Status Saat Ini</p>
                <div className="mt-1"><StatusBadge status={detailData.status} /></div>
              </div>
              <div className="col-span-2">
                <p className="text-gray-500">Alasan Pengajuan</p>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100 mt-1">{detailData.reason}</p>
              </div>
            </div>

            {/* Review Form (Hanya jika status SUBMITTED) */}
            {detailData.status === 'SUBMITTED' && (
              <form onSubmit={handleSubmit(onSubmitReview)} className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Berikan Keputusan</h3>
                
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <label className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-offset-2 ${decision === 'APPROVED' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Radio value="APPROVED" {...register('decision')} className="sr-only" />
                    <Check className="h-6 w-6" />
                    <span className="text-sm font-medium">Setujui</span>
                  </label>
                  
                  <label className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-offset-2 ${decision === 'REVISION_REQUESTED' ? 'border-amber-500 bg-amber-50 text-amber-700 ring-1 ring-amber-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Radio value="REVISION_REQUESTED" {...register('decision')} className="sr-only" />
                    <MessageSquareWarning className="h-6 w-6" />
                    <span className="text-sm font-medium">Minta Revisi</span>
                  </label>
                  
                  <label className={`border rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-offset-2 ${decision === 'REJECTED' ? 'border-red-500 bg-red-50 text-red-700 ring-1 ring-red-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <Radio value="REJECTED" {...register('decision')} className="sr-only" />
                    <X className="h-6 w-6" />
                    <span className="text-sm font-medium">Tolak</span>
                  </label>
                </div>

                {decision !== 'APPROVED' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Wajib) *</label>
                    <textarea
                      {...register('note')}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                      placeholder={`Berikan alasan mengapa pengajuan ini ${decision === 'REJECTED' ? 'ditolak' : 'perlu direvisi'}...`}
                    />
                    {errors.note && <p className="mt-1 text-sm text-red-500">{errors.note.message}</p>}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                  <Button type="submit" isLoading={isSubmitting}>Simpan Keputusan</Button>
                </div>
              </form>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
