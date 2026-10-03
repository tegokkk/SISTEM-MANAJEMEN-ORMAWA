'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useApiResource } from '@/hooks/useApiResource';

interface Tenant {
  id: string;
  code: string;
  name: string;
  tenant_type: string;
  status: string;
  departments?: { name: string } | null;
  study_programs?: { name: string } | null;
  tenants?: { name: string } | null;
  _count: { members: number; user_roles: number };
}
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function TenantMonitorPage({
  initialType = '',
  initialStatus = '',
}: {
  initialType?: string;
  initialStatus?: string;
}) {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '15' });
    if (query) params.set('q', query);
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    return `/tenants/admin-list?${params}`;
  }, [page, query, type, status]);
  const tenants = useApiResource<Tenant[], PaginationMeta>(endpoint);
  const columns: Column<Tenant>[] = [
    {
      header: 'Tenant',
      cell: (item) => (
        <div>
          <p className="font-semibold text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-500">{item.code}</p>
        </div>
      ),
    },
    {
      header: 'Jenis',
      cell: (item) => (
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {item.tenant_type}
        </span>
      ),
    },
    {
      header: 'Afiliasi',
      cell: (item) =>
        item.study_programs?.name ?? item.departments?.name ?? item.tenants?.name ?? 'Institusi',
    },
    { header: 'Anggota', cell: (item) => item._count.members },
    { header: 'Akun', cell: (item) => item._count.user_roles },
    { header: 'Status', cell: (item) => <StatusBadge status={item.status} /> },
  ];
  function search(event: FormEvent) {
    event.preventDefault();
    setQuery(input.trim());
    setPage(1);
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Tenant"
        description="Monitor ORMAWA, HMJ, dan HIMA yang terdaftar beserta afiliasi dan jumlah akun aktifnya."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Master tenant' }]}
        actions={<Building2 className="h-7 w-7 text-brand-600" />}
      />
      {tenants.error && <Alert variant="error">{tenants.error}</Alert>}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 lg:flex-row">
        <form onSubmit={search} className="flex flex-1 gap-2">
          <Input
            aria-label="Cari tenant"
            placeholder="Cari nama atau kode tenant"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <Button type="submit" variant="outline">
            Cari
          </Button>
        </form>
        <Select
          aria-label="Filter jenis tenant"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua jenis</option>
          <option value="ORMAWA">ORMAWA</option>
          <option value="HMJ">HMJ</option>
          <option value="HIMA">HIMA</option>
        </Select>
        <Select
          aria-label="Filter status tenant"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="PENDING">Menunggu</option>
          <option value="SUSPENDED">Ditangguhkan</option>
          <option value="REJECTED">Ditolak</option>
          <option value="INACTIVE">Tidak aktif</option>
        </Select>
      </div>
      <DataTable
        data={tenants.data ?? []}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={tenants.isLoading}
        emptyMessage="Tidak ada tenant yang sesuai filter"
        page={page}
        total={tenants.meta?.total}
        totalPages={tenants.meta?.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
