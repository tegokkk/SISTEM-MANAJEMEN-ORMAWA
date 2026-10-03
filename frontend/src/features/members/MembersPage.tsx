'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { apiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/errors';
import { useApiResource } from '@/hooks/useApiResource';

interface StudyProgram {
  id: string;
  code: string;
  name: string;
}
interface Member {
  id: string;
  student_number: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  study_program_id?: string | null;
  study_programs?: StudyProgram | null;
  cohort_year?: number | null;
  gender: string;
  joined_at?: string | null;
  status: string;
}
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function MembersPage({ initialStatus = '' }: { initialStatus?: string }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Member | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (search) params.set('q', search);
    if (status) params.set('status', status);
    return `/members?${params}`;
  }, [page, search, status]);
  const members = useApiResource<Member[], PaginationMeta>(endpoint);
  const programs = useApiResource<StudyProgram[]>('/references/study-programs');

  const columns: Column<Member>[] = [
    {
      header: 'Anggota',
      cell: (item) => (
        <div>
          <p className="font-semibold text-gray-900">{item.full_name}</p>
          <p className="text-xs text-gray-500">{item.student_number}</p>
        </div>
      ),
    },
    {
      header: 'Kontak',
      cell: (item) => (
        <div>
          <p>{item.email || '—'}</p>
          <p className="text-xs text-gray-500">{item.phone || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Program Studi',
      cell: (item) =>
        item.study_programs ? `${item.study_programs.code} · ${item.study_programs.name}` : '—',
    },
    { header: 'Angkatan', cell: (item) => item.cohort_year ?? '—' },
    { header: 'Status', cell: (item) => <StatusBadge status={item.status} /> },
    {
      header: 'Aksi',
      className: 'text-right',
      cell: (item) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Edit ${item.full_name}`}
            onClick={() => {
              setSelected(item);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600"
            aria-label={`Nonaktifkan ${item.full_name}`}
            onClick={() => setToDelete(item)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  async function submitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    const data = new FormData(event.currentTarget);
    const cohort = String(data.get('cohortYear') ?? '');
    const studyProgramId = String(data.get('studyProgramId') ?? '');
    const joinedAt = String(data.get('joinedAt') ?? '');
    const payload = {
      studentNumber: String(data.get('studentNumber') ?? ''),
      fullName: String(data.get('fullName') ?? ''),
      email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''),
      studyProgramId: studyProgramId || null,
      cohortYear: cohort ? Number(cohort) : null,
      gender: String(data.get('gender') ?? 'UNSPECIFIED'),
      joinedAt: joinedAt || null,
      ...(selected ? { status: String(data.get('status') ?? selected.status) } : {}),
    };
    try {
      if (selected) await apiClient.patch(`/members/${selected.id}`, payload);
      else await apiClient.post('/members', payload);
      setMessage({
        kind: 'success',
        text: selected ? 'Data anggota berhasil diperbarui.' : 'Anggota berhasil ditambahkan.',
      });
      setFormOpen(false);
      setSelected(null);
      members.reload();
    } catch (error) {
      setMessage({
        kind: 'error',
        text: getApiErrorMessage(error, 'Data anggota gagal disimpan.'),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivateMember() {
    if (!toDelete) return;
    setIsSaving(true);
    try {
      await apiClient.delete(`/members/${toDelete.id}`);
      setMessage({ kind: 'success', text: `${toDelete.full_name} berhasil dinonaktifkan.` });
      setToDelete(null);
      members.reload();
    } catch (error) {
      setMessage({
        kind: 'error',
        text: getApiErrorMessage(error, 'Anggota gagal dinonaktifkan.'),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Anggota"
        description="Kelola anggota dalam tenant aktif. Seluruh data otomatis dibatasi oleh tenant pada server."
        breadcrumbs={[{ label: 'Portal' }, { label: 'Anggota' }]}
        actions={
          <Button
            onClick={() => {
              setSelected(null);
              setFormOpen(true);
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Tambah anggota
          </Button>
        }
      />
      {message && (
        <Alert variant={message.kind} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {members.error && <Alert variant="error">{members.error}</Alert>}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setSearch(query.trim());
          }}
        >
          <Input
            aria-label="Cari anggota"
            placeholder="Cari nama, NIM, atau email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" variant="outline">
            Cari
          </Button>
        </form>
        <Select
          aria-label="Filter status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          className="sm:w-44"
        >
          <option value="">Semua status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Tidak aktif</option>
          <option value="ALUMNI">Alumni</option>
        </Select>
      </div>
      <DataTable
        data={members.data ?? []}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={members.isLoading}
        emptyMessage="Belum ada anggota pada tenant ini"
        page={page}
        total={members.meta?.total}
        totalPages={members.meta?.totalPages}
        onPageChange={setPage}
      />

      <Modal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelected(null);
        }}
        title={selected ? 'Edit anggota' : 'Tambah anggota'}
        maxWidth="2xl"
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitMember}>
          <Input
            id="member-number"
            name="studentNumber"
            label="NIM / Nomor anggota"
            defaultValue={selected?.student_number}
            required
            minLength={3}
          />
          <Input
            id="member-name"
            name="fullName"
            label="Nama lengkap"
            defaultValue={selected?.full_name}
            required
            minLength={3}
          />
          <Input
            id="member-email"
            name="email"
            type="email"
            label="Email"
            defaultValue={selected?.email ?? ''}
          />
          <Input
            id="member-phone"
            name="phone"
            label="Nomor telepon"
            defaultValue={selected?.phone ?? ''}
          />
          <Select
            id="member-program"
            name="studyProgramId"
            label="Program studi"
            defaultValue={selected?.study_program_id ?? ''}
          >
            <option value="">Tidak ditentukan</option>
            {programs.data?.map((program) => (
              <option key={program.id} value={program.id}>
                {program.code} · {program.name}
              </option>
            ))}
          </Select>
          <Input
            id="member-cohort"
            name="cohortYear"
            type="number"
            min="1990"
            max="2100"
            label="Tahun angkatan"
            defaultValue={selected?.cohort_year ?? ''}
          />
          <Select
            id="member-gender"
            name="gender"
            label="Jenis kelamin"
            defaultValue={selected?.gender ?? 'UNSPECIFIED'}
          >
            <option value="UNSPECIFIED">Tidak disebutkan</option>
            <option value="MALE">Laki-laki</option>
            <option value="FEMALE">Perempuan</option>
          </Select>
          <Input
            id="member-joined"
            name="joinedAt"
            type="date"
            label="Tanggal bergabung"
            defaultValue={selected?.joined_at?.slice(0, 10) ?? ''}
          />
          {selected && (
            <Select id="member-status" name="status" label="Status" defaultValue={selected.status}>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Tidak aktif</option>
              <option value="ALUMNI">Alumni</option>
            </Select>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        title="Nonaktifkan anggota?"
        description={`Data ${toDelete?.full_name ?? 'anggota'} akan dinonaktifkan dan tidak tampil pada daftar aktif.`}
        confirmLabel="Nonaktifkan"
        danger
        isLoading={isSaving}
        onClose={() => setToDelete(null)}
        onConfirm={deactivateMember}
      />
    </div>
  );
}
