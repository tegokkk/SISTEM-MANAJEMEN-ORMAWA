'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeftRight, Boxes, MapPin, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react';
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
import { formatCurrency } from '@/lib/format';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  quantity: string;
  minimum_quantity: string;
  unit: string;
  item_condition: string;
  location?: string | null;
  acquisition_source?: string | null;
  acquisition_date?: string | null;
  acquisition_value?: string | null;
  status: string;
}
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function InventoryPage({ initialStatus = '' }: { initialStatus?: string }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<'item' | 'movement' | null>(null);
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (search) params.set('q', search);
    if (condition) params.set('condition', condition);
    if (location) params.set('location', location);
    if (status) params.set('status', status);
    return `/inventory?${params}`;
  }, [page, search, condition, location, status]);
  const inventory = useApiResource<InventoryItem[], PaginationMeta>(endpoint);
  const lowStock =
    inventory.data?.filter((item) => Number(item.quantity) <= Number(item.minimum_quantity))
      .length ?? 0;

  function fail(error: unknown, fallback: string) {
    setMessage({ kind: 'error', text: getApiErrorMessage(error, fallback) });
  }

  async function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const data = new FormData(event.currentTarget);
    const date = String(data.get('acquisitionDate') ?? '');
    const value = String(data.get('acquisitionValue') ?? '');
    const details = {
      code: data.get('code'),
      name: data.get('name'),
      description: data.get('description'),
      category: data.get('category'),
      minimumQuantity: Number(data.get('minimumQuantity')),
      unit: data.get('unit'),
      condition: data.get('condition'),
      location: data.get('location'),
      acquisitionSource: data.get('acquisitionSource'),
      acquisitionDate: date || null,
      acquisitionValue: value ? Number(value) : null,
    };
    try {
      if (editing) await apiClient.patch(`/inventory/${editing.id}`, details);
      else
        await apiClient.post('/inventory', { ...details, quantity: Number(data.get('quantity')) });
      setModal(null);
      setEditing(null);
      setMessage({
        kind: 'success',
        text: `Item inventaris berhasil ${editing ? 'diperbarui' : 'dibuat'}.`,
      });
      inventory.reload();
    } catch (error) {
      fail(error, 'Item inventaris gagal dibuat.');
    } finally {
      setSaving(false);
    }
  }

  async function recordMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    const data = new FormData(event.currentTarget);
    try {
      await apiClient.post(`/inventory/${selected.id}/movements`, {
        type: data.get('type'),
        quantityDelta: Number(data.get('quantityDelta')),
        note: data.get('note'),
      });
      setModal(null);
      setSelected(null);
      setMessage({ kind: 'success', text: 'Pergerakan stok berhasil dicatat.' });
      inventory.reload();
    } catch (error) {
      fail(error, 'Pergerakan stok gagal dicatat.');
    } finally {
      setSaving(false);
    }
  }

  async function archiveItem() {
    if (!deleteItem) return;
    setSaving(true);
    try {
      await apiClient.delete(`/inventory/${deleteItem.id}`);
      setDeleteItem(null);
      setMessage({ kind: 'success', text: 'Item inventaris berhasil diarsipkan.' });
      inventory.reload();
    } catch (error) {
      fail(error, 'Item inventaris gagal diarsipkan.');
    } finally {
      setSaving(false);
    }
  }

  const columns: Column<InventoryItem>[] = [
    {
      header: 'Item',
      cell: (item) => (
        <div>
          <p className="font-semibold text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-500">
            {item.code} · {item.category || 'Tanpa kategori'}
          </p>
        </div>
      ),
    },
    {
      header: 'Stok',
      cell: (item) => (
        <div>
          <p
            className={
              Number(item.quantity) <= Number(item.minimum_quantity)
                ? 'font-bold text-amber-700'
                : 'font-medium text-gray-900'
            }
          >
            {Number(item.quantity).toLocaleString('id-ID')} {item.unit}
          </p>
          <p className="text-xs text-gray-500">
            Minimum {Number(item.minimum_quantity).toLocaleString('id-ID')}
          </p>
        </div>
      ),
    },
    { header: 'Kondisi', cell: (item) => <StatusBadge status={item.item_condition} /> },
    {
      header: 'Lokasi',
      cell: (item) => (
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          {item.location || '—'}
        </span>
      ),
    },
    {
      header: 'Nilai',
      cell: (item) => (item.acquisition_value ? formatCurrency(item.acquisition_value) : '—'),
    },
    {
      header: 'Aksi',
      className: 'text-right',
      cell: (item) => (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(item);
              setModal('item');
            }}
            aria-label={`Edit ${item.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelected(item);
              setModal('movement');
            }}
            leftIcon={<ArrowLeftRight className="h-3.5 w-3.5" />}
          >
            Stok
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600"
            onClick={() => setDeleteItem(item)}
            aria-label={`Arsipkan ${item.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventaris"
        description="Kelola aset organisasi dan catat setiap perubahan stok agar histori tetap dapat diaudit."
        breadcrumbs={[{ label: 'Portal' }, { label: 'Inventaris' }]}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModal('item');
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Tambah item
          </Button>
        }
      />
      {message && (
        <Alert variant={message.kind} onDismiss={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          icon={Boxes}
          label="Item pada halaman"
          value={String(inventory.data?.length ?? 0)}
        />
        <Metric
          icon={TriangleAlert}
          label="Stok minimum"
          value={String(lowStock)}
          warning={lowStock > 0}
        />
        <Metric
          icon={MapPin}
          label="Lokasi tercatat"
          value={String(new Set(inventory.data?.map((item) => item.location).filter(Boolean)).size)}
        />
      </div>
      <form
        className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-[2fr_1.25fr_1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(query.trim());
          setLocation(locationQuery.trim());
          setPage(1);
        }}
      >
        <Input
          aria-label="Cari inventaris"
          placeholder="Cari kode, nama, atau kategori"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <Input
          aria-label="Filter lokasi"
          placeholder="Lokasi"
          value={locationQuery}
          onChange={(event) => setLocationQuery(event.target.value)}
        />
        <Select
          aria-label="Filter kondisi"
          value={condition}
          onChange={(event) => {
            setCondition(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua kondisi</option>
          <option value="GOOD">Baik</option>
          <option value="MINOR_DAMAGE">Rusak ringan</option>
          <option value="MAJOR_DAMAGE">Rusak berat</option>
          <option value="LOST">Hilang</option>
          <option value="DISPOSED">Dihapuskan</option>
        </Select>
        <Select
          aria-label="Filter status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
          <option value="ARCHIVED">Diarsipkan</option>
        </Select>
        <Button type="submit" variant="outline">
          Terapkan
        </Button>
      </form>
      {inventory.error && <Alert variant="error">{inventory.error}</Alert>}
      <DataTable
        data={inventory.data ?? []}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={inventory.isLoading}
        emptyMessage="Belum ada inventaris"
        page={page}
        total={inventory.meta?.total}
        totalPages={inventory.meta?.totalPages}
        onPageChange={setPage}
      />

      <Modal
        isOpen={modal === 'item'}
        onClose={() => setModal(null)}
        title={`${editing ? 'Edit' : 'Tambah'} item inventaris`}
        maxWidth="2xl"
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={createItem}>
          <Input
            id="item-code"
            name="code"
            label="Kode item"
            defaultValue={editing?.code}
            required
          />
          <Input
            id="item-name"
            name="name"
            label="Nama item"
            defaultValue={editing?.name}
            required
          />
          <Input
            id="item-category"
            name="category"
            label="Kategori"
            defaultValue={editing?.category ?? ''}
          />
          <Input
            id="item-location"
            name="location"
            label="Lokasi"
            defaultValue={editing?.location ?? ''}
          />
          {!editing && (
            <Input
              id="item-quantity"
              name="quantity"
              type="number"
              min="0"
              step="0.01"
              label="Stok awal"
              defaultValue="0"
              required
            />
          )}
          <Input
            id="item-minimum"
            name="minimumQuantity"
            type="number"
            min="0"
            step="0.01"
            label="Stok minimum"
            defaultValue={editing?.minimum_quantity ?? '0'}
            required
          />
          <Input
            id="item-unit"
            name="unit"
            label="Satuan"
            defaultValue={editing?.unit ?? 'unit'}
            required
          />
          <Select
            id="item-condition"
            name="condition"
            label="Kondisi"
            defaultValue={editing?.item_condition ?? 'GOOD'}
          >
            <option value="GOOD">Baik</option>
            <option value="MINOR_DAMAGE">Rusak ringan</option>
            <option value="MAJOR_DAMAGE">Rusak berat</option>
            <option value="LOST">Hilang</option>
            <option value="DISPOSED">Dihapuskan</option>
          </Select>
          <Input
            id="item-source"
            name="acquisitionSource"
            label="Sumber perolehan"
            defaultValue={editing?.acquisition_source ?? ''}
          />
          <Input
            id="item-date"
            name="acquisitionDate"
            type="date"
            label="Tanggal perolehan"
            defaultValue={editing?.acquisition_date?.slice(0, 10) ?? ''}
          />
          <Input
            id="item-value"
            name="acquisitionValue"
            type="number"
            min="0"
            step="1000"
            label="Nilai perolehan"
            defaultValue={editing?.acquisition_value ?? ''}
          />
          <div className="sm:col-span-2">
            <Textarea
              id="item-description"
              name="description"
              label="Deskripsi"
              defaultValue={editing?.description ?? ''}
            />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Batal
            </Button>
            <Button type="submit" isLoading={saving}>
              {editing ? 'Simpan perubahan' : 'Simpan item'}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={modal === 'movement'}
        onClose={() => {
          setModal(null);
          setSelected(null);
        }}
        title={`Pergerakan stok · ${selected?.name ?? 'Item'}`}
      >
        <form className="space-y-4" onSubmit={recordMovement}>
          <Alert variant="info">
            Stok saat ini:{' '}
            <strong>
              {Number(selected?.quantity ?? 0).toLocaleString('id-ID')} {selected?.unit}
            </strong>
          </Alert>
          <Select id="movement-type" name="type" label="Jenis pergerakan" required>
            <option value="IN">Stok masuk</option>
            <option value="OUT">Stok keluar</option>
            <option value="ADJUSTMENT">Penyesuaian</option>
            <option value="DAMAGED">Rusak</option>
            <option value="LOST">Hilang</option>
            <option value="DISPOSED">Dihapuskan</option>
          </Select>
          <Input
            id="movement-quantity"
            name="quantityDelta"
            type="number"
            step="0.01"
            label="Jumlah perubahan"
            hint="Isi nilai positif. Sistem otomatis mengurangi untuk keluar, hilang, atau dihapuskan."
            required
          />
          <Textarea id="movement-note" name="note" label="Catatan" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>
              Batal
            </Button>
            <Button type="submit" isLoading={saving}>
              Catat stok
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        isOpen={Boolean(deleteItem)}
        title="Arsipkan item inventaris?"
        description={`${deleteItem?.name ?? 'Item'} tidak akan tampil pada daftar aktif. Histori stok dan audit tetap disimpan.`}
        confirmLabel="Arsipkan"
        danger
        isLoading={saving}
        onClose={() => setDeleteItem(null)}
        onConfirm={archiveItem}
      />
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <Card className="flex items-center gap-4">
      <span
        className={`rounded-xl p-3 ${warning ? 'bg-amber-100 text-amber-700' : 'bg-brand-50 text-brand-700'}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="font-heading text-2xl font-bold text-gray-950">{value}</p>
      </div>
    </Card>
  );
}
