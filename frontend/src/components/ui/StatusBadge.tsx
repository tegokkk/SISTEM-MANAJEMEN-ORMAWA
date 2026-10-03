import React from 'react';
import { cn } from '@/lib/utils';
interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: {
    label: 'Draf',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  SUBMITTED: {
    label: 'Menunggu Review',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  REVISION_REQUESTED: {
    label: 'Perlu Revisi',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  APPROVED: {
    label: 'Disetujui',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Ditolak',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  ACTIVE: { label: 'Aktif', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  INACTIVE: { label: 'Tidak Aktif', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  ALUMNI: { label: 'Alumni', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  RUNNING: { label: 'Berjalan', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'Selesai', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  CANCELLED: { label: 'Dibatalkan', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  CLOSED: { label: 'Ditutup', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  POSTED: { label: 'Dibukukan', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  VOID: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700 border-red-200' },
  GOOD: { label: 'Baik', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  MINOR_DAMAGE: { label: 'Rusak Ringan', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  MAJOR_DAMAGE: { label: 'Rusak Berat', className: 'bg-red-100 text-red-700 border-red-200' },
  LOST: { label: 'Hilang', className: 'bg-red-100 text-red-700 border-red-200' },
  DISPOSED: { label: 'Dihapuskan', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  INCOME: { label: 'Pemasukan', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  EXPENSE: { label: 'Pengeluaran', className: 'bg-red-100 text-red-700 border-red-200' },
  PENDING: { label: 'Menunggu', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  PLANNED: { label: 'Direncanakan', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  SUSPENDED: { label: 'Ditangguhkan', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  DISABLED: { label: 'Dinonaktifkan', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  ARCHIVED: { label: 'Diarsipkan', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  CLEAN: { label: 'Aman', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  FAILED: { label: 'Gagal', className: 'bg-red-100 text-red-700 border-red-200' },
  DISBURSED: { label: 'Dicairkan', className: 'bg-violet-100 text-violet-700 border-violet-200' },
  FULFILLED: { label: 'Terpenuhi', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-gray-100 text-gray-700', className)}>
        {status}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
