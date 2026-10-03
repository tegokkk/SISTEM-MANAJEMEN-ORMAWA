"use client";

import { FormEvent, useMemo, useState } from "react";
import { Eye, Pencil, Plus, Send, SquareCheckBig, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Select, Textarea } from "@/components/ui/FormControls";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useApiResource } from "@/hooks/useApiResource";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/errors";
import { formatCurrency, formatDate } from "@/lib/format";

type RequestKind = "requirements" | "finance";
interface Program { id: string; code: string; name: string }
interface RequestLine { id?: string; item_name?: string; item_type?: string; description?: string; quantity: string; unit: string; estimated_unit_price?: string; requested_unit_price?: string; approved_quantity?: string | null; approved_unit_price?: string | null; note?: string | null }
interface RequestRecord { id: string; work_program_id?: string | null; request_number: string; title: string; description?: string | null; priority?: string; status: string; estimated_total?: string; requested_amount?: string; approved_total?: string | null; approved_amount?: string | null; created_at: string; work_programs?: Program | null; requirement_request_items?: RequestLine[]; finance_request_items?: RequestLine[]; tenants_requirement_requests_source_tenant_idTotenants?: { name: string }; tenants_finance_requests_source_tenant_idTotenants?: { name: string } }
interface PaginationMeta { page: number; limit: number; total: number; totalPages: number }
interface DraftLine { name: string; type: string; quantity: string; unit: string; price: string; note: string }

const emptyLine = (): DraftLine => ({ name: "", type: "GOODS", quantity: "1", unit: "unit", price: "0", note: "" });

export function RequestManagementPage({ kind }: { kind: RequestKind }) {
  const finance = kind === "finance";
  const endpointRoot = finance ? "/finance-requests" : "/requirements";
  const { activeTenant } = useAuth();
  const [view, setView] = useState<"owned" | "review">("owned");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RequestRecord | null>(null);
  const [detail, setDetail] = useState<RequestRecord | null>(null);
  const [review, setReview] = useState<RequestRecord | null>(null);
  const [submitItem, setSubmitItem] = useState<RequestRecord | null>(null);
  const [cancelItem, setCancelItem] = useState<RequestRecord | null>(null);
  const [decision, setDecision] = useState("APPROVED");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const endpoint = useMemo(() => `${endpointRoot}?page=${page}&limit=10${view === "review" ? "&queue=review" : ""}`, [endpointRoot, page, view]);
  const requests = useApiResource<RequestRecord[], PaginationMeta>(endpoint);
  const programs = useApiResource<Program[]>("/work-programs?limit=100");
  const noun = finance ? "pengajuan dana" : "pengajuan kebutuhan";

  function updateLine(index: number, field: keyof DraftLine, value: string) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line));
  }
  function fail(error: unknown, fallback: string) { setMessage({ kind: "error", text: getApiErrorMessage(error, fallback) }); }
  function openEdit(item: RequestRecord) {
    const currentLines = item.requirement_request_items ?? item.finance_request_items ?? [];
    setEditing(item);
    setLines(currentLines.map((line) => ({ name: line.description ?? line.item_name ?? "", type: line.item_type ?? "GOODS",
      quantity: line.quantity, unit: line.unit, price: line.requested_unit_price ?? line.estimated_unit_price ?? "0", note: line.note ?? "" })));
    setFormOpen(true);
  }

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(null); const data = new FormData(event.currentTarget);
    const items = lines.map((line) => finance
      ? { description: line.name, quantity: Number(line.quantity), unit: line.unit, requestedUnitPrice: Number(line.price), note: line.note }
      : { itemName: line.name, itemType: line.type, quantity: Number(line.quantity), unit: line.unit, estimatedUnitPrice: Number(line.price), note: line.note });
    const payload = { workProgramId: String(data.get("workProgramId") || "") || null, requestNumber: data.get("requestNumber"), title: data.get("title"), description: data.get("description"), ...(finance ? {} : { priority: data.get("priority") }), items };
    try { if (editing) await apiClient.patch(`${endpointRoot}/${editing.id}`, payload); else await apiClient.post(endpointRoot, payload); setFormOpen(false); setEditing(null); setLines([emptyLine()]); setMessage({ kind: "success", text: `${finance ? "Pengajuan dana" : "Pengajuan kebutuhan"} berhasil ${editing ? "diperbarui" : "disimpan sebagai draf"}.` }); requests.reload(); }
    catch (error) { fail(error, `${noun} gagal dibuat.`); } finally { setSaving(false); }
  }

  async function submitRequest() {
    if (!submitItem) return; setSaving(true);
    try { await apiClient.post(`${endpointRoot}/${submitItem.id}/submit`, {}); setSubmitItem(null); setMessage({ kind: "success", text: `${noun} berhasil dikirim.` }); requests.reload(); }
    catch (error) { fail(error, `${noun} gagal dikirim.`); } finally { setSaving(false); }
  }

  async function cancelRequest() {
    if (!cancelItem) return; setSaving(true);
    try { await apiClient.delete(`/requirements/${cancelItem.id}`); setCancelItem(null); setMessage({ kind: "success", text: "Pengajuan kebutuhan berhasil dibatalkan." }); requests.reload(); }
    catch (error) { fail(error, "Pengajuan kebutuhan gagal dibatalkan."); } finally { setSaving(false); }
  }

  async function reviewRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!review) return; setSaving(true); const data = new FormData(event.currentTarget);
    try { await apiClient.post(`${endpointRoot}/${review.id}/review`, { decision, note: data.get("note") }); setReview(null); setMessage({ kind: "success", text: `Review ${noun} berhasil disimpan.` }); requests.reload(); }
    catch (error) { fail(error, `Review ${noun} gagal disimpan.`); } finally { setSaving(false); }
  }

  const columns: Column<RequestRecord>[] = [
    { header: "Pengajuan", cell: (item) => <div><p className="font-semibold text-gray-900">{item.title}</p><p className="text-xs text-gray-500">{item.request_number} · {formatDate(item.created_at)}</p>{view === "review" && <p className="mt-1 text-xs font-medium text-brand-700">{item.tenants_requirement_requests_source_tenant_idTotenants?.name ?? item.tenants_finance_requests_source_tenant_idTotenants?.name}</p>}</div> },
    { header: "Program", cell: (item) => item.work_programs ? `${item.work_programs.code} · ${item.work_programs.name}` : "Non-program" },
    ...(!finance ? [{ header: "Prioritas", cell: (item: RequestRecord) => <span className="text-xs font-semibold">{item.priority}</span> } satisfies Column<RequestRecord>] : []),
    { header: "Nilai", cell: (item) => <div><p className="font-medium text-gray-900">{formatCurrency(item.requested_amount ?? item.estimated_total)}</p>{(item.approved_amount || item.approved_total) && <p className="text-xs text-emerald-700">Disetujui {formatCurrency(item.approved_amount ?? item.approved_total)}</p>}</div> },
    { header: "Status", cell: (item) => <StatusBadge status={item.status} /> },
    { header: "Aksi", className: "text-right", cell: (item) => <div className="flex justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => setDetail(item)} aria-label={`Lihat ${item.title}`}><Eye className="h-4 w-4" /></Button>{view === "owned" && ["DRAFT", "REVISION_REQUESTED"].includes(item.status) && <><Button size="sm" variant="ghost" onClick={() => openEdit(item)} aria-label={`Edit ${item.title}`}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => setSubmitItem(item)} leftIcon={<Send className="h-3.5 w-3.5" />}>Kirim</Button>{!finance && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setCancelItem(item)} aria-label={`Batalkan ${item.title}`}><Trash2 className="h-4 w-4" /></Button>}</>}{view === "review" && item.status === "SUBMITTED" && <Button size="sm" onClick={() => { setDecision("APPROVED"); setReview(item); }} leftIcon={<SquareCheckBig className="h-3.5 w-3.5" />}>Review</Button>}</div> },
  ];

  const detailLines = detail?.requirement_request_items ?? detail?.finance_request_items ?? [];
  return <div className="space-y-6">
    <PageHeader title={finance ? "Pengajuan Dana" : "Pengajuan Kebutuhan"} description={finance ? "Ajukan rincian anggaran program kerja dan pantau nominal yang disetujui." : "Ajukan barang, jasa, atau fasilitas dengan estimasi biaya yang terukur."} breadcrumbs={[{ label: "Portal" }, { label: finance ? "Pengajuan dana" : "Kebutuhan" }]} actions={view === "owned" ? <Button onClick={() => { setEditing(null); setLines([emptyLine()]); setFormOpen(true); }} leftIcon={<Plus className="h-4 w-4" />}>Buat pengajuan</Button> : undefined} />
    {message && <Alert variant={message.kind} onDismiss={() => setMessage(null)}>{message.text}</Alert>}
    <div className="flex gap-2 rounded-xl border border-gray-200 bg-white p-4"><Button size="sm" variant={view === "owned" ? "primary" : "ghost"} onClick={() => { setView("owned"); setPage(1); }}>Pengajuan saya</Button>{activeTenant?.type !== "HIMA" && <Button size="sm" variant={view === "review" ? "primary" : "ghost"} onClick={() => { setView("review"); setPage(1); }}>Antrian review</Button>}</div>
    {requests.error && <Alert variant="error">{requests.error}</Alert>}
    <DataTable data={requests.data ?? []} columns={columns} keyExtractor={(item) => item.id} isLoading={requests.isLoading} emptyMessage={view === "review" ? "Tidak ada pengajuan yang menunggu review" : "Belum ada pengajuan"} page={page} total={requests.meta?.total} totalPages={requests.meta?.totalPages} onPageChange={setPage} />

    <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title={`${editing ? "Edit" : "Buat"} ${noun}`} maxWidth="2xl"><form className="space-y-5" onSubmit={createRequest}><div className="grid gap-4 sm:grid-cols-2"><Input id={`${kind}-number`} name="requestNumber" label="Nomor pengajuan" defaultValue={editing?.request_number} required /><Input id={`${kind}-title`} name="title" label="Judul" defaultValue={editing?.title} required />{finance ? <Select id={`${kind}-program`} name="workProgramId" label="Program kerja" defaultValue={editing?.work_program_id ?? ""} required><option value="">Pilih program</option>{programs.data?.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</Select> : <><Select id={`${kind}-program`} name="workProgramId" label="Program kerja" defaultValue={editing?.work_program_id ?? ""}><option value="">Tidak terkait program</option>{programs.data?.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</Select><Select id={`${kind}-priority`} name="priority" label="Prioritas" defaultValue={editing?.priority ?? "NORMAL"}><option value="LOW">Rendah</option><option value="NORMAL">Normal</option><option value="HIGH">Tinggi</option><option value="URGENT">Mendesak</option></Select></>}<div className="sm:col-span-2"><Textarea id={`${kind}-description`} name="description" label="Deskripsi" defaultValue={editing?.description ?? ""} /></div></div><div><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-gray-900">Rincian item</h3><Button type="button" size="sm" variant="outline" onClick={() => setLines((current) => [...current, emptyLine()])} leftIcon={<Plus className="h-3.5 w-3.5" />}>Tambah item</Button></div><div className="space-y-3">{lines.map((line, index) => <div key={index} className="grid gap-3 rounded-xl border border-gray-200 p-4 sm:grid-cols-6"><div className="sm:col-span-2"><Input aria-label={`Nama item ${index + 1}`} placeholder={finance ? "Uraian anggaran" : "Nama kebutuhan"} value={line.name} onChange={(event) => updateLine(index, "name", event.target.value)} required /></div>{!finance && <Select aria-label={`Jenis item ${index + 1}`} value={line.type} onChange={(event) => updateLine(index, "type", event.target.value)}><option value="GOODS">Barang</option><option value="SERVICE">Jasa</option><option value="FACILITY">Fasilitas</option><option value="OTHER">Lainnya</option></Select>}<Input aria-label={`Jumlah item ${index + 1}`} type="number" min="0.01" step="0.01" placeholder="Jumlah" value={line.quantity} onChange={(event) => updateLine(index, "quantity", event.target.value)} required /><Input aria-label={`Satuan item ${index + 1}`} placeholder="Satuan" value={line.unit} onChange={(event) => updateLine(index, "unit", event.target.value)} required /><Input aria-label={`Harga item ${index + 1}`} type="number" min="0" step="1000" placeholder="Harga satuan" value={line.price} onChange={(event) => updateLine(index, "price", event.target.value)} required /><Button type="button" variant="ghost" className="text-red-600" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} aria-label={`Hapus item ${index + 1}`}><Trash2 className="h-4 w-4" /></Button></div>)}</div></div><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Batal</Button><Button type="submit" isLoading={saving}>{editing ? "Simpan perubahan" : "Simpan draf"}</Button></div></form></Modal>
    <Modal isOpen={Boolean(detail)} onClose={() => setDetail(null)} title={detail?.title ?? "Detail pengajuan"} maxWidth="2xl"><div className="space-y-4"><div className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-3"><div><p className="text-xs text-gray-500">Nomor</p><p className="font-semibold">{detail?.request_number}</p></div><div><p className="text-xs text-gray-500">Status</p>{detail && <StatusBadge status={detail.status} />}</div><div><p className="text-xs text-gray-500">Total diajukan</p><p className="font-semibold">{formatCurrency(detail?.requested_amount ?? detail?.estimated_total)}</p></div></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="p-3">Item</th><th className="p-3">Jumlah</th><th className="p-3">Harga</th><th className="p-3">Subtotal</th></tr></thead><tbody className="divide-y">{detailLines.map((line, index) => { const price = Number(line.requested_unit_price ?? line.estimated_unit_price ?? 0); return <tr key={line.id ?? index}><td className="p-3 font-medium">{line.description ?? line.item_name}</td><td className="p-3">{Number(line.quantity).toLocaleString("id-ID")} {line.unit}</td><td className="p-3">{formatCurrency(price)}</td><td className="p-3">{formatCurrency(Number(line.quantity) * price)}</td></tr>; })}</tbody></table></div></div></Modal>
    <Modal isOpen={Boolean(review)} onClose={() => setReview(null)} title={`Review ${noun}`}><form className="space-y-4" onSubmit={reviewRequest}><Select id={`${kind}-decision`} label="Keputusan" value={decision} onChange={(event) => setDecision(event.target.value)}><option value="APPROVED">Setujui</option><option value="REVISION_REQUESTED">Minta revisi</option><option value="REJECTED">Tolak</option></Select><Textarea id={`${kind}-review-note`} name="note" label="Catatan reviewer" required={decision !== "APPROVED"} /><Alert variant="info">Jika disetujui, jumlah dan harga yang diajukan digunakan sebagai nilai persetujuan.</Alert><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setReview(null)}>Batal</Button><Button type="submit" isLoading={saving}>Simpan keputusan</Button></div></form></Modal>
    <ConfirmDialog isOpen={Boolean(submitItem)} title={`Kirim ${noun}?`} description={`${submitItem?.title ?? "Pengajuan"} akan masuk ke antrian reviewer dan tidak dapat diedit pada status submitted.`} confirmLabel="Kirim pengajuan" isLoading={saving} onClose={() => setSubmitItem(null)} onConfirm={submitRequest} />
    <ConfirmDialog isOpen={Boolean(cancelItem)} title="Batalkan pengajuan kebutuhan?" description={`${cancelItem?.title ?? "Pengajuan"} akan berstatus dibatalkan dan tidak dapat diajukan kembali. Riwayat tetap tersimpan.`} confirmLabel="Batalkan pengajuan" danger isLoading={saving} onClose={() => setCancelItem(null)} onConfirm={cancelRequest} />
  </div>;
}
