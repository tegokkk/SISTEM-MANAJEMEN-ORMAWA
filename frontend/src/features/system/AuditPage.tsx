'use client';

import { useMemo, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { useApiResource } from '@/hooks/useApiResource';

interface AuditEntry {
  id: string;
  action: string;
  objectType: string;
  objectId?: string | null;
  actorName: string;
  metadata?: unknown;
  createdAt: string;
}
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function AuditPage({ initialSinceHours }: { initialSinceHours?: number }) {
  const [filter, setFilter] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const endpoint = useMemo(
    () =>
      `/audit?page=${page}&limit=20${action ? `&action=${encodeURIComponent(action)}` : ''}${initialSinceHours ? `&sinceHours=${initialSinceHours}` : ''}`,
    [page, action, initialSinceHours],
  );
  const audit = useApiResource<AuditEntry[], PaginationMeta>(endpoint);
  const columns: Column<AuditEntry>[] = [
    {
      header: 'Waktu',
      cell: (item) => (
        <span className="whitespace-nowrap text-xs">
          {new Date(item.createdAt).toLocaleString('id-ID')}
        </span>
      ),
    },
    {
      header: 'Aktor',
      cell: (item) => <span className="font-medium text-gray-900">{item.actorName}</span>,
    },
    {
      header: 'Aksi',
      cell: (item) => (
        <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{item.action}</code>
      ),
    },
    {
      header: 'Objek',
      cell: (item) => (
        <div>
          <p>{item.objectType}</p>
          <p className="text-xs text-gray-400">{item.objectId ? `#${item.objectId}` : '—'}</p>
        </div>
      ),
    },
    {
      header: 'Metadata',
      cell: (item) => (
        <span className="block max-w-sm truncate text-xs text-gray-500">
          {item.metadata ? JSON.stringify(item.metadata) : '—'}
        </span>
      ),
    },
  ];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Jejak perubahan penting sistem. Metadata sensitif telah disanitasi oleh audit writer pada backend."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Audit log' }]}
        actions={<ShieldCheck className="h-7 w-7 text-brand-600" />}
      />
      {audit.error && <Alert variant="error">{audit.error}</Alert>}
      <form
        className="flex max-w-lg gap-2 rounded-xl border border-gray-200 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setAction(filter.trim());
          setPage(1);
        }}
      >
        <Input
          aria-label="Filter aksi audit"
          placeholder="Contoh: WORK_PROGRAM"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <button
          className="rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
          type="submit"
        >
          Filter
        </button>
      </form>
      <DataTable
        data={audit.data ?? []}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={audit.isLoading}
        emptyMessage="Belum ada audit log"
        page={page}
        total={audit.meta?.total}
        totalPages={audit.meta?.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
