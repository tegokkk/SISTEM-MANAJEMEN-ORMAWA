'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ApplicationSummary } from '@sim-ormawa/contracts';
import { Logo } from '@/components/ui/Logo';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Link from 'next/link';
import { ArrowLeft, Clock, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StatusPengajuanPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/status-pengajuan');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      api.get('/applications')
        .then(res => {
          setApplications(res.data.data);
          setLoadingData(false);
        })
        .catch(err => {
          console.error('Failed to load applications', err);
          setLoadingData(false);
        });
    }
  }, [user]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse flex flex-col items-center"><div className="h-12 w-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-gray-500 text-sm font-medium">Memuat data...</p></div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <Link href="/daftar" className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center">
            <ArrowLeft className="h-4 w-4 mr-1" /> Kembali ke Pendaftaran
          </Link>
          <Logo />
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-2xl font-bold font-heading text-gray-900">Status Pengajuan Anda</h2>
            <p className="text-sm text-gray-500 mt-1">Pantau perkembangan status pendaftaran organisasi Anda.</p>
          </div>

          <div className="p-6">
            {loadingData ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="animate-pulse bg-gray-100 h-24 rounded-xl"></div>
                ))}
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-sm font-semibold text-gray-900">Belum ada pengajuan</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Anda belum pernah mengajukan pendaftaran organisasi.
                </p>
                <div className="mt-6">
                  <Link href="/daftar" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-primary-dark">
                    Ajukan Sekarang
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    key={app.id}
                    className="border border-gray-200 rounded-xl p-5 hover:border-brand-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {app.requested_type}
                          </span>
                          <span className="text-sm font-medium text-gray-400">
                            ID: #{app.id}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{app.organization_name}</h3>
                        <p className="text-sm text-gray-500">{app.organization_code}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <StatusBadge status={app.status} />
                        {app.submitted_at && (
                          <div className="flex items-center text-xs text-gray-400">
                            <Clock className="h-3 w-3 mr-1" />
                            Diajukan: {new Date(app.submitted_at).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
