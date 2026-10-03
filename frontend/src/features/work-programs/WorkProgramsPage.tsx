"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, FileText, History, Pencil, Play, Plus, Send, SquareCheckBig, Trash2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Timeline } from "@/components/ui/DataDisplays";
import { Select, Textarea } from "@/components/ui/FormControls";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { useApiResource } from "@/hooks/useApiResource";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/errors";
import { formatCurrency, formatDate } from "@/lib/format";
import { env } from "@/config/env";

interface Period { id: string; name: string; status: string }
interface Member { id: string; full_name: string }
interface Program {
  id: string; period_id: string; responsible_member_id?: string | null; code: string; name: string;
  description?: string | null; objective?: string | null; location?: string | null; start_date: string; end_date: string;
  proposed_budget: string; approved_budget?: string | null; status: string;
  periods?: { name: string }; members?: { full_name: string } | null;
  tenants_work_programs_tenant_idTotenants?: { name: string };
}
interface ProgramHistory { id: string; from_status?: string | null; to_status: string; note?: string | null; created_at: string; users: { full_name: string }; tenants?: { name: string } | null }
interface ProgramDetail extends Program { work_program_status_history: ProgramHistory[] }
interface ProposalVersion { id: string; version_number: number; title: string; note?: string | null; created_at: string; files: { id: string; original_name: string; size_bytes: string } }
interface PaginationMeta { page: number; limit: number; total: number; totalPages: number }
type Command = "submit" | "start" | "complete";

export function WorkProgramsPage() {
  const { activeTenant } = useAuth();
  const [view, setView] = useState<"owned" | "review">("owned");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Program | null>(null);
  const [command, setCommand] = useState<{ program: Program; command: Command } | null>(null);
  const [workflowProgram, setWorkflowProgram] = useState<Program | null>(null);
  const [deleteProgram, setDeleteProgram] = useState<Program | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Program | null>(null);
  const [history, setHistory] = useState<ProgramHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [proposalTarget, setProposalTarget] = useState<Program | null>(null);
  const [proposals, setProposals] = useState<ProposalVersion[]>([]);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "10" });
    if (status) params.set("status", status);
    if (view === "review") params.set("queue", "review");
    return `/work-programs?${params}`;
  }, [page, status, view]);
  const programs = useApiResource<Program[], PaginationMeta>(endpoint);
  const periods = useApiResource<Period[]>("/organization/periods");
  const members = useApiResource<Member[]>("/members?limit=100&status=ACTIVE");

  function fail(error: unknown, fallback: string) {
    setMessage({ kind: "error", text: getApiErrorMessage(error, fallback) });
  }

  async function saveProgram(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(null);
    const data = new FormData(event.currentTarget);
    const responsible = String(data.get("responsibleMemberId") ?? "");
    const payload = { periodId: data.get("periodId"), responsibleMemberId: responsible || null, code: data.get("code"), name: data.get("name"), description: data.get("description"), objective: data.get("objective"), location: data.get("location"), startDate: data.get("startDate"), endDate: data.get("endDate"), proposedBudget: Number(data.get("proposedBudget")) };
    try {
      if (selected) await apiClient.patch(`/work-programs/${selected.id}`, payload); else await apiClient.post("/work-programs", payload);
      setFormOpen(false); setSelected(null); setMessage({ kind: "success", text: selected ? "Program kerja berhasil diperbarui." : "Program kerja berhasil dibuat sebagai draf." }); programs.reload();
    } catch (error) { fail(error, "Program kerja gagal disimpan."); } finally { setSaving(false); }
  }

  async function executeCommand() {
    if (!command) return; setSaving(true);
    try {
      await apiClient.post(`/work-programs/${command.program.id}/${command.command}`, {});
      setMessage({ kind: "success", text: `Status ${command.program.name} berhasil diperbarui.` }); setCommand(null); programs.reload();
    } catch (error) { fail(error, "Status program kerja gagal diperbarui."); } finally { setSaving(false); }
  }

  async function submitWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!workflowProgram) return; setSaving(true);
    const data = new FormData(event.currentTarget);
    const isReview = view === "review";
    try {
      if (isReview) await apiClient.post(`/work-programs/${workflowProgram.id}/review`, { decision: data.get("decision"), note: data.get("note") });
      else await apiClient.post(`/work-programs/${workflowProgram.id}/cancel`, { note: data.get("note") });
      setWorkflowProgram(null); setMessage({ kind: "success", text: isReview ? "Keputusan review berhasil disimpan." : "Program kerja berhasil dibatalkan." }); programs.reload();
    } catch (error) { fail(error, "Keputusan workflow gagal disimpan."); } finally { setSaving(false); }
  }

  async function removeProgram() {
    if (!deleteProgram) return; setSaving(true);
    try { await apiClient.delete(`/work-programs/${deleteProgram.id}`); setMessage({ kind: "success", text: "Program kerja berhasil dihapus." }); setDeleteProgram(null); programs.reload(); }
    catch (error) { fail(error, "Program kerja gagal dihapus."); } finally { setSaving(false); }
  }

  async function openHistory(program: Program) {
    setHistoryTarget(program); setHistory([]); setHistoryLoading(true);
    try { const detail = await apiClient.get<ProgramDetail>(`/work-programs/${program.id}`); setHistory(detail.work_program_status_history); }
    catch (error) { setHistoryTarget(null); fail(error, "Riwayat program kerja gagal dimuat."); }
    finally { setHistoryLoading(false); }
  }

  async function openProposals(program: Program) {
    setProposalTarget(program); setProposals([]); setProposalLoading(true);
    try { setProposals(await apiClient.get<ProposalVersion[]>(`/work-programs/${program.id}/proposals`)); }
    catch (error) { setProposalTarget(null); fail(error, "Proposal gagal dimuat."); }
    finally { setProposalLoading(false); }
  }

  async function uploadProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!proposalTarget) return; setSaving(true);
    const form = event.currentTarget;
    try {
      await apiClient.postForm(`/work-programs/${proposalTarget.id}/proposals`, new FormData(form));
      setProposals(await apiClient.get<ProposalVersion[]>(`/work-programs/${proposalTarget.id}/proposals`));
      setMessage({ kind: "success", text: "Versi proposal berhasil diunggah." });
      form.reset();
    } catch (error) { fail(error, "Proposal gagal diunggah."); } finally { setSaving(false); }
  }

  const columns: Column<Program>[] = [
    { header: "Program Kerja", cell: (item) => <div><p className="font-semibold text-gray-900">{item.name}</p><p className="text-xs text-gray-500">{item.code} · {item.periods?.name ?? "Tanpa periode"}</p>{view === "review" && <p className="mt-1 text-xs font-medium text-brand-600">{item.tenants_work_programs_tenant_idTotenants?.name}</p>}</div> },
    { header: "Jadwal", cell: (item) => <span className="whitespace-nowrap">{formatDate(item.start_date)}<br /><span className="text-xs text-gray-400">s.d. {formatDate(item.end_date)}</span></span> },
    { header: "Penanggung Jawab", cell: (item) => item.members?.full_name ?? "—" },
    { header: "Anggaran", cell: (item) => <div><p className="font-medium text-gray-900">{formatCurrency(item.proposed_budget)}</p>{item.approved_budget && <p className="text-xs text-emerald-600">Disetujui {formatCurrency(item.approved_budget)}</p>}</div> },
    { header: "Status", cell: (item) => <StatusBadge status={item.status} /> },
    { header: "Aksi", className: "text-right", cell: (item) => <div className="flex flex-wrap justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => openHistory(item)} aria-label={`Riwayat ${item.name}`}><History className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => openProposals(item)} aria-label={`Proposal ${item.name}`}><FileText className="h-4 w-4" /></Button>{view === "review" && item.status === "SUBMITTED" ? <Button size="sm" onClick={() => setWorkflowProgram(item)} leftIcon={<SquareCheckBig className="h-4 w-4" />}>Review</Button> : <>{["DRAFT", "REVISION_REQUESTED"].includes(item.status) && <><Button size="sm" variant="ghost" aria-label={`Edit ${item.name}`} onClick={() => { setSelected(item); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => setCommand({ program: item, command: "submit" })} leftIcon={<Send className="h-3.5 w-3.5" />}>Ajukan</Button></>}{item.status === "APPROVED" && <Button size="sm" onClick={() => setCommand({ program: item, command: "start" })} leftIcon={<Play className="h-3.5 w-3.5" />}>Mulai</Button>}{item.status === "RUNNING" && <Button size="sm" onClick={() => setCommand({ program: item, command: "complete" })} leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}>Selesai</Button>}{!["COMPLETED", "CANCELLED", "REJECTED"].includes(item.status) && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setWorkflowProgram(item)} aria-label={`Batalkan ${item.name}`}><XCircle className="h-4 w-4" /></Button>}{["DRAFT", "REVISION_REQUESTED", "REJECTED", "CANCELLED"].includes(item.status) && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleteProgram(item)} aria-label={`Hapus ${item.name}`}><Trash2 className="h-4 w-4" /></Button>}</>}</div> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Program Kerja" description="Rencanakan kegiatan, ajukan review, dan pantau status pelaksanaan program kerja." breadcrumbs={[{ label: "Portal" }, { label: "Program kerja" }]} actions={view === "owned" ? <Button onClick={() => { setSelected(null); setFormOpen(true); }} leftIcon={<Plus className="h-4 w-4" />}>Buat program</Button> : undefined} />
      {message && <Alert variant={message.kind} onDismiss={() => setMessage(null)}>{message.text}</Alert>}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex gap-2"><Button size="sm" variant={view === "owned" ? "primary" : "ghost"} onClick={() => { setView("owned"); setPage(1); }}>Program saya</Button>{activeTenant?.type === "HMJ" && <Button size="sm" variant={view === "review" ? "primary" : "ghost"} onClick={() => { setView("review"); setPage(1); }}>Antrian review HIMA</Button>}</div>
        <Select aria-label="Filter status program" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="sm:w-52"><option value="">Semua status</option>{["DRAFT", "SUBMITTED", "REVISION_REQUESTED", "APPROVED", "RUNNING", "COMPLETED", "REJECTED", "CANCELLED"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</Select>
      </div>
      {programs.error && <Alert variant="error">{programs.error}</Alert>}
      <DataTable data={programs.data ?? []} columns={columns} keyExtractor={(item) => item.id} isLoading={programs.isLoading} emptyMessage={view === "review" ? "Tidak ada program HIMA yang menunggu review" : "Belum ada program kerja"} page={page} total={programs.meta?.total} totalPages={programs.meta?.totalPages} onPageChange={setPage} />

      <Modal isOpen={formOpen} onClose={() => { setFormOpen(false); setSelected(null); }} title={selected ? "Edit program kerja" : "Buat program kerja"} maxWidth="2xl"><form className="grid gap-4 sm:grid-cols-2" onSubmit={saveProgram}><Select id="program-period" name="periodId" label="Periode" defaultValue={selected?.period_id ?? periods.data?.find((item) => item.status === "ACTIVE")?.id} required><option value="">Pilih periode</option>{periods.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select id="program-member" name="responsibleMemberId" label="Penanggung jawab" defaultValue={selected?.responsible_member_id ?? ""}><option value="">Belum ditentukan</option>{members.data?.map((item) => <option key={item.id} value={item.id}>{item.full_name}</option>)}</Select><Input id="program-code" name="code" label="Kode program" defaultValue={selected?.code} required /><Input id="program-name" name="name" label="Nama program" defaultValue={selected?.name} required /><Input id="program-start" name="startDate" type="date" label="Tanggal mulai" defaultValue={selected?.start_date.slice(0, 10)} required /><Input id="program-end" name="endDate" type="date" label="Tanggal selesai" defaultValue={selected?.end_date.slice(0, 10)} required /><Input id="program-location" name="location" label="Lokasi" defaultValue={selected?.location ?? ""} /><Input id="program-budget" name="proposedBudget" type="number" min="0" step="1000" label="Anggaran diajukan" defaultValue={selected?.proposed_budget ?? "0"} required /><div className="sm:col-span-2"><Textarea id="program-description" name="description" label="Deskripsi" defaultValue={selected?.description ?? ""} /></div><div className="sm:col-span-2"><Textarea id="program-objective" name="objective" label="Tujuan" defaultValue={selected?.objective ?? ""} /></div><div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Batal</Button><Button type="submit" isLoading={saving}>Simpan draf</Button></div></form></Modal>
      <Modal isOpen={Boolean(workflowProgram)} onClose={() => setWorkflowProgram(null)} title={view === "review" ? "Review program kerja" : "Batalkan program kerja"}><form className="space-y-4" onSubmit={submitWorkflow}>{view === "review" && <Select id="review-decision" name="decision" label="Keputusan" required><option value="APPROVED">Setujui</option><option value="REVISION_REQUESTED">Minta revisi</option><option value="REJECTED">Tolak</option></Select>}<Textarea id="workflow-note" name="note" label="Catatan" required={view !== "review"} minLength={view !== "review" ? 5 : undefined} hint="Catatan wajib untuk pembatalan, penolakan, atau permintaan revisi." /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setWorkflowProgram(null)}>Kembali</Button><Button type="submit" isLoading={saving} variant={view === "review" ? "primary" : "danger"}>{view === "review" ? "Simpan keputusan" : "Batalkan program"}</Button></div></form></Modal>
      <Modal isOpen={Boolean(historyTarget)} onClose={() => setHistoryTarget(null)} title={`Riwayat · ${historyTarget?.name ?? "Program kerja"}`} maxWidth="lg">
        {historyLoading ? <p className="py-8 text-center text-sm text-gray-500">Memuat riwayat...</p> : <Timeline items={history.map((entry) => ({ id: entry.id,
          title: <StatusBadge status={entry.to_status} />, meta: <time className="text-xs text-gray-500">{formatDate(entry.created_at)}</time>,
          body: <><p>{entry.users.full_name}{entry.tenants?.name ? ` · ${entry.tenants.name}` : ""}</p>{entry.note && <p className="mt-2 rounded-lg bg-gray-50 p-3">{entry.note}</p>}</>,
        }))} />}
      </Modal>
      <Modal isOpen={Boolean(proposalTarget)} onClose={() => setProposalTarget(null)} title={`Proposal · ${proposalTarget?.name ?? "Program kerja"}`} maxWidth="lg">
        <div className="space-y-4">
          {proposalLoading ? <p className="text-sm text-gray-500">Memuat proposal...</p> : proposals.length ? <ol className="space-y-2">{proposals.map((item) => <li key={item.id} className="rounded-xl border border-gray-200 p-3 text-sm"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">Versi {item.version_number} · {item.title}</p><p className="text-gray-500">{item.files.original_name} · {formatDate(item.created_at)}</p></div><a href={`${env.NEXT_PUBLIC_API_URL}/files/${item.files.id}/download`} className="font-semibold text-brand-700 underline">Unduh</a></div>{item.note && <p className="mt-2 text-gray-600">{item.note}</p>}</li>)}</ol> : <p className="text-sm text-gray-500">Belum ada proposal.</p>}
          {view === "owned" && proposalTarget && ["DRAFT", "REVISION_REQUESTED"].includes(proposalTarget.status) && <form className="space-y-3 border-t pt-4" onSubmit={uploadProposal}><Input name="title" label="Judul proposal" required minLength={3} /><Input name="file" type="file" label="Berkas PDF, PNG, atau JPEG" accept=".pdf,.png,.jpg,.jpeg" required /><Textarea name="note" label="Catatan versi" /><Button type="submit" isLoading={saving}>Unggah versi baru</Button></form>}
        </div>
      </Modal>
      <ConfirmDialog isOpen={Boolean(command)} title="Konfirmasi perubahan status" description={`${command?.program.name ?? "Program kerja"} akan diproses ke tahap ${command?.command === "submit" ? "pengajuan" : command?.command === "start" ? "berjalan" : "selesai"}.`} confirmLabel="Ya, lanjutkan" isLoading={saving} onClose={() => setCommand(null)} onConfirm={executeCommand} />
      <ConfirmDialog isOpen={Boolean(deleteProgram)} title="Hapus program kerja?" description={`${deleteProgram?.name ?? "Program kerja"} akan dihapus dari daftar. Histori audit tetap dipertahankan.`} confirmLabel="Hapus" danger isLoading={saving} onClose={() => setDeleteProgram(null)} onConfirm={removeProgram} />
    </div>
  );
}
