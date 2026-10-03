'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
  Plus,
  ReceiptText,
  Tags,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Select, Textarea } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useApiResource } from '@/hooks/useApiResource';
import { apiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/errors';
import { formatCurrency, formatDate } from '@/lib/format';
import { env } from '@/config/env';

interface Category {
  id: string;
  name: string;
  transaction_type: string;
  is_active: boolean;
}
interface Program {
  id: string;
  name: string;
  code: string;
}
interface Summary {
  income: string;
  expense: string;
  balance: string;
  transactionCount: number;
}
interface Report extends Summary {
  categories: { categoryId: string; name: string; type: string; amount: string; count: number }[];
}
interface Transaction {
  id: string;
  transaction_number: string;
  transaction_type: string;
  category_id: string;
  work_program_id?: string | null;
  attachment_file_id?: string | null;
  transaction_date: string;
  amount: string;
  description: string;
  payment_method?: string | null;
  status: string;
  transaction_categories?: { name: string };
  work_programs?: { name: string } | null;
}
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function FinancePage({
  initialType = '',
  initialStatus = '',
}: {
  initialType?: string;
  initialStatus?: string;
}) {
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState(initialStatus);
  const [categoryId, setCategoryId] = useState('');
  const [workProgramId, setWorkProgramId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'category' | 'transaction' | 'void' | null>(null);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [postItem, setPostItem] = useState<Transaction | null>(null);
  const [receiptItem, setReceiptItem] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const filterParams = useMemo(() => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (categoryId) params.set('categoryId', categoryId);
    if (workProgramId) params.set('workProgramId', workProgramId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString();
  }, [categoryId, dateFrom, dateTo, status, type, workProgramId]);
  const endpoint = useMemo(
    () => `/finance/transactions?page=${page}&limit=10${filterParams ? `&${filterParams}` : ''}`,
    [filterParams, page],
  );
  const transactions = useApiResource<Transaction[], PaginationMeta>(endpoint);
  const categories = useApiResource<Category[]>('/finance/categories');
  const programs = useApiResource<Program[]>('/work-programs?limit=100');
  const summary = useApiResource<Summary>('/finance/summary');
  const report = useApiResource<Report>(`/finance/report${filterParams ? `?${filterParams}` : ''}`);

  function errorMessage(error: unknown, fallback: string) {
    setMessage({ kind: 'error', text: getApiErrorMessage(error, fallback) });
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const data = new FormData(event.currentTarget);
    try {
      await apiClient.post('/finance/categories', {
        name: data.get('name'),
        type: data.get('type'),
        description: data.get('description'),
      });
      setModal(null);
      setMessage({ kind: 'success', text: 'Kategori transaksi berhasil dibuat.' });
      categories.reload();
    } catch (error) {
      errorMessage(error, 'Kategori gagal dibuat.');
    } finally {
      setSaving(false);
    }
  }

  async function createTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const workProgramId = String(data.get('workProgramId') ?? '');
    try {
      await apiClient.post('/finance/transactions', {
        transactionNumber: data.get('transactionNumber'),
        type: data.get('type'),
        categoryId: data.get('categoryId'),
        workProgramId: workProgramId || null,
        transactionDate: data.get('transactionDate'),
        amount: Number(data.get('amount')),
        description: data.get('description'),
        paymentMethod: data.get('paymentMethod'),
      });
      setModal(null);
      setMessage({ kind: 'success', text: 'Transaksi disimpan sebagai draf.' });
      transactions.reload();
    } catch (error) {
      errorMessage(error, 'Transaksi gagal dibuat.');
    } finally {
      setSaving(false);
    }
  }

  async function postTransaction() {
    if (!postItem) return;
    setSaving(true);
    try {
      await apiClient.post(`/finance/transactions/${postItem.id}/post`, {});
      setPostItem(null);
      setMessage({ kind: 'success', text: 'Transaksi berhasil dibukukan.' });
      transactions.reload();
      summary.reload();
    } catch (error) {
      errorMessage(error, 'Transaksi gagal dibukukan.');
    } finally {
      setSaving(false);
    }
  }

  async function voidTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    try {
      await apiClient.post(`/finance/transactions/${selected.id}/void`, {
        reason: data.get('reason'),
      });
      setModal(null);
      setSelected(null);
      setMessage({ kind: 'success', text: 'Transaksi berhasil dibatalkan.' });
      transactions.reload();
      summary.reload();
    } catch (error) {
      errorMessage(error, 'Transaksi gagal dibatalkan.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receiptItem) return;
    setSaving(true);
    const form = event.currentTarget;
    try {
      await apiClient.postForm(
        `/finance/transactions/${receiptItem.id}/receipt`,
        new FormData(form),
      );
      setReceiptItem(null);
      setMessage({ kind: 'success', text: 'Bukti transaksi berhasil diunggah.' });
      transactions.reload();
    } catch (error) {
      errorMessage(error, 'Bukti transaksi gagal diunggah.');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<Transaction>[] = [
    {
      header: 'Nomor',
      cell: (item) => (
        <div>
          <p className="font-semibold text-gray-900">{item.transaction_number}</p>
          <p className="text-xs text-gray-500">{formatDate(item.transaction_date)}</p>
        </div>
      ),
    },
    { header: 'Jenis', cell: (item) => <StatusBadge status={item.transaction_type} /> },
    {
      header: 'Kategori',
      cell: (item) => (
        <div>
          <p>{item.transaction_categories?.name ?? '—'}</p>
          <p className="text-xs text-gray-500">{item.work_programs?.name ?? 'Non-program'}</p>
        </div>
      ),
    },
    {
      header: 'Keterangan',
      cell: (item) => (
        <div>
          <p className="max-w-xs truncate">{item.description}</p>
          <p className="text-xs text-gray-500">{item.payment_method || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Nominal',
      cell: (item) => (
        <span
          className={
            item.transaction_type === 'INCOME'
              ? 'font-semibold text-emerald-700'
              : 'font-semibold text-red-600'
          }
        >
          {item.transaction_type === 'INCOME' ? '+' : '−'}
          {formatCurrency(item.amount)}
        </span>
      ),
    },
    { header: 'Status', cell: (item) => <StatusBadge status={item.status} /> },
    {
      header: 'Aksi',
      className: 'text-right',
      cell: (item) => (
        <div className="flex justify-end gap-1">
          {item.attachment_file_id ? (
            <a
              href={`${env.NEXT_PUBLIC_API_URL}/files/${item.attachment_file_id}/download`}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-brand-700 underline"
            >
              Bukti
            </a>
          ) : (
            item.status !== 'VOID' && (
              <Button size="sm" variant="outline" onClick={() => setReceiptItem(item)}>
                Unggah bukti
              </Button>
            )
          )}
          {item.status === 'DRAFT' && (
            <Button size="sm" onClick={() => setPostItem(item)}>
              Posting
            </Button>
          )}
          {item.status === 'POSTED' && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600"
              onClick={() => {
                setSelected(item);
                setModal('void');
              }}
            >
              Batalkan
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keuangan"
        description="Catat pemasukan dan pengeluaran, lalu bukukan transaksi agar masuk ke perhitungan saldo."
        breadcrumbs={[{ label: 'Portal' }, { label: 'Keuangan' }]}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setModal('category')}
              leftIcon={<Tags className="h-4 w-4" />}
            >
              Kategori
            </Button>
            <Button
              onClick={() => setModal('transaction')}
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={!categories.data?.some((item) => item.is_active)}
            >
              Tambah transaksi
            </Button>
          </>
        }
      />
      {message && (
        <Alert variant={message.kind} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={ArrowDownLeft}
          label="Pemasukan posted"
          value={formatCurrency(summary.data?.income)}
          color="bg-emerald-100 text-emerald-700"
        />
        <Metric
          icon={ArrowUpRight}
          label="Pengeluaran posted"
          value={formatCurrency(summary.data?.expense)}
          color="bg-red-100 text-red-700"
        />
        <Metric
          icon={CircleDollarSign}
          label="Saldo"
          value={formatCurrency(summary.data?.balance)}
          color="bg-blue-100 text-blue-700"
        />
        <Metric
          icon={ReceiptText}
          label="Transaksi posted"
          value={String(summary.data?.transactionCount ?? 0)}
          color="bg-violet-100 text-violet-700"
        />
      </div>
      <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-6">
        <Select
          id="finance-filter-type"
          label="Jenis"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua transaksi</option>
          <option value="INCOME">Pemasukan</option>
          <option value="EXPENSE">Pengeluaran</option>
        </Select>
        <Select
          id="finance-filter-status"
          label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua status</option>
          <option value="DRAFT">Draf</option>
          <option value="POSTED">Posted</option>
          <option value="VOID">Dibatalkan</option>
        </Select>
        <Select
          id="finance-filter-category"
          label="Kategori"
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua kategori</option>
          {categories.data
            ?.filter((item) => item.is_active)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </Select>
        <Select
          id="finance-filter-program"
          label="Program kerja"
          value={workProgramId}
          onChange={(event) => {
            setWorkProgramId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua program</option>
          {programs.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} · {item.name}
            </option>
          ))}
        </Select>
        <Input
          id="finance-filter-date-from"
          label="Dari tanggal"
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(event) => {
            setDateFrom(event.target.value);
            setPage(1);
          }}
        />
        <Input
          id="finance-filter-date-to"
          label="Sampai tanggal"
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(event) => {
            setDateTo(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-gray-900">
              Laporan transaksi posted
            </h2>
            <p className="text-sm text-gray-500">
              Mengikuti filter di atas; transaksi draf dan VOID tidak masuk perhitungan.
            </p>
          </div>
          <a
            href={`${env.NEXT_PUBLIC_API_URL}/finance/transactions/export${filterParams ? `?${filterParams}` : ''}`}
            className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Ekspor CSV
          </a>
        </div>
        {report.error ? (
          <Alert variant="error">{report.error}</Alert>
        ) : report.isLoading ? (
          <p className="mt-4 text-sm text-gray-500">Menghitung laporan...</p>
        ) : (
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <p>
              Pemasukan: <strong>{formatCurrency(report.data?.income)}</strong>
            </p>
            <p>
              Pengeluaran: <strong>{formatCurrency(report.data?.expense)}</strong>
            </p>
            <p>
              Saldo: <strong>{formatCurrency(report.data?.balance)}</strong>
            </p>
            <p>
              Transaksi: <strong>{report.data?.transactionCount ?? 0}</strong>
            </p>
          </div>
        )}
        {Boolean(report.data?.categories.length) && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Per kategori
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {report.data?.categories.map((item) => (
                <span
                  key={`${item.type}-${item.categoryId}`}
                  className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700"
                >
                  {item.name} · {item.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}:{' '}
                  {formatCurrency(item.amount)}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>
      {transactions.error && <Alert variant="error">{transactions.error}</Alert>}
      <DataTable
        data={transactions.data ?? []}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={transactions.isLoading}
        emptyMessage="Belum ada transaksi"
        page={page}
        total={transactions.meta?.total}
        totalPages={transactions.meta?.totalPages}
        onPageChange={setPage}
      />

      <Modal isOpen={modal === 'category'} onClose={() => setModal(null)} title="Tambah kategori">
        <form className="space-y-4" onSubmit={createCategory}>
          <Input id="category-name" name="name" label="Nama kategori" required />
          <Select id="category-type" name="type" label="Berlaku untuk" required>
            <option value="BOTH">Pemasukan & pengeluaran</option>
            <option value="INCOME">Pemasukan</option>
            <option value="EXPENSE">Pengeluaran</option>
          </Select>
          <Textarea id="category-description" name="description" label="Deskripsi" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Batal
            </Button>
            <Button type="submit" isLoading={saving}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={modal === 'transaction'}
        onClose={() => setModal(null)}
        title="Tambah transaksi"
        maxWidth="2xl"
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={createTransaction}>
          <Input
            id="transaction-number"
            name="transactionNumber"
            label="Nomor transaksi"
            placeholder="TRX-2026-001"
            required
          />
          <Select id="transaction-type" name="type" label="Jenis" required>
            <option value="INCOME">Pemasukan</option>
            <option value="EXPENSE">Pengeluaran</option>
          </Select>
          <Select id="transaction-category" name="categoryId" label="Kategori" required>
            <option value="">Pilih kategori</option>
            {categories.data
              ?.filter((item) => item.is_active)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.transaction_type}
                </option>
              ))}
          </Select>
          <Select id="transaction-program" name="workProgramId" label="Program kerja">
            <option value="">Non-program</option>
            {programs.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} · {item.name}
              </option>
            ))}
          </Select>
          <Input
            id="transaction-date"
            name="transactionDate"
            type="date"
            label="Tanggal"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
          <Input
            id="transaction-amount"
            name="amount"
            type="number"
            min="1"
            step="1000"
            label="Nominal"
            required
          />
          <Input
            id="transaction-method"
            name="paymentMethod"
            label="Metode pembayaran"
            placeholder="Tunai / Transfer"
          />
          <div className="sm:col-span-2">
            <Textarea
              id="transaction-description"
              name="description"
              label="Keterangan"
              required
              minLength={3}
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Batal
            </Button>
            <Button type="submit" isLoading={saving}>
              Simpan draf
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={modal === 'void'}
        onClose={() => {
          setModal(null);
          setSelected(null);
        }}
        title="Batalkan transaksi"
      >
        <form className="space-y-4" onSubmit={voidTransaction}>
          <Alert variant="warning">
            Pembatalan tidak menghapus transaksi. Status akan menjadi VOID dan alasannya masuk audit
            log.
          </Alert>
          <Textarea
            id="void-reason"
            name="reason"
            label="Alasan pembatalan"
            required
            minLength={10}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Kembali
            </Button>
            <Button type="submit" variant="danger" isLoading={saving}>
              Batalkan transaksi
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={Boolean(receiptItem)}
        onClose={() => setReceiptItem(null)}
        title={`Bukti · ${receiptItem?.transaction_number ?? 'Transaksi'}`}
      >
        <form className="space-y-4" onSubmit={uploadReceipt}>
          <Input
            name="file"
            type="file"
            label="Berkas PDF, PNG, atau JPEG"
            accept=".pdf,.png,.jpg,.jpeg"
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setReceiptItem(null)}>
              Batal
            </Button>
            <Button type="submit" isLoading={saving}>
              Unggah bukti
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(postItem)}
        title="Bukukan transaksi?"
        description={`${postItem?.transaction_number ?? 'Transaksi'} akan masuk ke perhitungan saldo dan tidak dapat diedit.`}
        confirmLabel="Posting transaksi"
        isLoading={saving}
        onClose={() => setPostItem(null)}
        onConfirm={postTransaction}
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      <span className={`rounded-xl p-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 font-heading text-xl font-bold text-gray-950">{value}</p>
      </div>
    </Card>
  );
}
