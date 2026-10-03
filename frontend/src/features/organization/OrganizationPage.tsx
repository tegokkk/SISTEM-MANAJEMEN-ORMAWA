"use client";

import { FormEvent, useState } from "react";
import { CalendarRange, Crown, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select, Textarea } from "@/components/ui/FormControls";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useApiResource } from "@/hooks/useApiResource";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/errors";
import { env } from "@/config/env";

interface Period { id: string; name: string; start_date: string; end_date: string; status: string }
interface Position { id: string; code: string; name: string; level: number; is_active: boolean }
interface Member { id: string; full_name: string; student_number: string }
interface Assignment { id: string; reports_to_assignment_id?: string | null; sort_order: number; members: Member; positions: Position }
interface Structure { period: Period; assignments: Assignment[] }

export function OrganizationPage() {
  const periods = useApiResource<Period[]>("/organization/periods");
  const positions = useApiResource<Position[]>("/organization/positions");
  const members = useApiResource<Member[]>("/members?limit=100&status=ACTIVE");
  const structure = useApiResource<Structure | []>("/organization/structure");
  const [modal, setModal] = useState<"period" | "position" | "assignment" | null>(null);
  const [activation, setActivation] = useState<Period | null>(null);
  const [removeAssignment, setRemoveAssignment] = useState<Assignment | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const activeStructure = Array.isArray(structure.data) ? null : structure.data;

  function showError(error: unknown, fallback: string) {
    setMessage({ kind: "error", text: getApiErrorMessage(error, fallback) });
  }

  async function createPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const data = new FormData(event.currentTarget);
    try {
      await apiClient.post("/organization/periods", { name: data.get("name"), startDate: data.get("startDate"), endDate: data.get("endDate") });
      setModal(null); setMessage({ kind: "success", text: "Periode kepengurusan berhasil dibuat." }); periods.reload();
    } catch (error) { showError(error, "Periode gagal dibuat."); } finally { setSaving(false); }
  }

  async function createPosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const data = new FormData(event.currentTarget);
    try {
      await apiClient.post("/organization/positions", { code: data.get("code"), name: data.get("name"), level: Number(data.get("level")), description: data.get("description") });
      setModal(null); setMessage({ kind: "success", text: "Jabatan berhasil dibuat." }); positions.reload();
    } catch (error) { showError(error, "Jabatan gagal dibuat."); } finally { setSaving(false); }
  }

  async function createAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    const data = new FormData(event.currentTarget);
    const parent = String(data.get("reportsToAssignmentId") ?? "");
    try {
      await apiClient.post("/organization/assignments", { periodId: data.get("periodId"), memberId: data.get("memberId"), positionId: data.get("positionId"), reportsToAssignmentId: parent || null, sortOrder: Number(data.get("sortOrder")) });
      setModal(null); setMessage({ kind: "success", text: "Anggota berhasil ditempatkan pada struktur." }); structure.reload();
    } catch (error) { showError(error, "Penugasan gagal dibuat."); } finally { setSaving(false); }
  }

  async function activatePeriod() {
    if (!activation) return; setSaving(true);
    try {
      await apiClient.patch(`/organization/periods/${activation.id}/activate`, {});
      setActivation(null); setMessage({ kind: "success", text: "Periode aktif berhasil diubah." }); periods.reload(); structure.reload();
    } catch (error) { showError(error, "Periode gagal diaktifkan."); } finally { setSaving(false); }
  }

  async function deleteAssignment() {
    if (!removeAssignment) return; setSaving(true);
    try {
      await apiClient.delete(`/organization/assignments/${removeAssignment.id}`);
      setRemoveAssignment(null); setMessage({ kind: "success", text: "Penugasan berhasil dihapus." }); structure.reload();
    } catch (error) { showError(error, "Penugasan gagal dihapus."); } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Kepengurusan & Struktur" description="Atur periode, jabatan, dan susunan pengurus organisasi untuk tenant aktif." breadcrumbs={[{ label: "Portal" }, { label: "Struktur organisasi" }]} actions={<><Button variant="outline" onClick={() => setModal("period")} leftIcon={<CalendarRange className="h-4 w-4" />}>Periode</Button><Button variant="outline" onClick={() => setModal("position")} leftIcon={<Crown className="h-4 w-4" />}>Jabatan</Button><Button onClick={() => setModal("assignment")} leftIcon={<Plus className="h-4 w-4" />} disabled={!periods.data?.some((item) => item.status === "ACTIVE")}>Tambah pengurus</Button></>} />
      {message && <Alert variant={message.kind} onDismiss={() => setMessage(null)}>{message.text}</Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><div className="mb-4 flex items-center justify-between"><div><h2 className="font-heading text-lg font-bold text-gray-900">Periode kepengurusan</h2><p className="text-sm text-gray-500">Satu periode aktif untuk setiap tenant.</p></div><CalendarRange className="h-5 w-5 text-brand-600" /></div><div className="space-y-2">{periods.data?.map((period) => <div key={period.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3"><div className="flex-1"><p className="font-medium text-gray-900">{period.name}</p><p className="text-xs text-gray-500">{new Date(period.start_date).toLocaleDateString("id-ID")} – {new Date(period.end_date).toLocaleDateString("id-ID")}</p></div><StatusBadge status={period.status} />{period.status !== "ACTIVE" && <Button size="sm" variant="ghost" onClick={() => setActivation(period)}>Aktifkan</Button>}</div>)}{!periods.isLoading && !periods.data?.length && <p className="py-6 text-center text-sm text-gray-500">Belum ada periode.</p>}</div></Card>
        <Card><div className="mb-4 flex items-center justify-between"><div><h2 className="font-heading text-lg font-bold text-gray-900">Master jabatan</h2><p className="text-sm text-gray-500">Urutan level menentukan tampilan struktur.</p></div><Crown className="h-5 w-5 text-amber-500" /></div><div className="grid gap-2 sm:grid-cols-2">{positions.data?.map((position) => <div key={position.id} className="rounded-xl bg-gray-50 p-3"><p className="font-medium text-gray-900">{position.name}</p><p className="text-xs text-gray-500">{position.code} · Level {position.level}</p></div>)}{!positions.isLoading && !positions.data?.length && <p className="py-6 text-center text-sm text-gray-500 sm:col-span-2">Belum ada jabatan.</p>}</div></Card>
      </div>
      <Card><div className="mb-5 flex items-center justify-between"><div><h2 className="font-heading text-lg font-bold text-gray-900">Struktur organisasi</h2><p className="text-sm text-gray-500">{activeStructure ? `Periode ${activeStructure.period.name}` : "Aktifkan periode untuk membentuk struktur."}</p></div>{activeStructure && <a href={`${env.NEXT_PUBLIC_API_URL}/organization/structure/export?periodId=${activeStructure.period.id}`} className="rounded-lg border border-brand-600 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-50">Ekspor CSV</a>}</div>{structure.isLoading ? <p className="py-10 text-center text-sm text-gray-500">Memuat struktur…</p> : activeStructure?.assignments.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{activeStructure.assignments.map((assignment) => <div key={assignment.id} className="group relative rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4"><button type="button" aria-label={`Hapus ${assignment.members.full_name} dari struktur`} className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-600" onClick={() => setRemoveAssignment(assignment)}><Trash2 className="h-4 w-4" /></button><p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{assignment.positions.name}</p><p className="mt-2 font-semibold text-gray-950">{assignment.members.full_name}</p><p className="text-xs text-gray-500">{assignment.members.student_number}</p></div>)}</div> : <p className="py-10 text-center text-sm text-gray-500">Belum ada pengurus pada periode aktif.</p>}</Card>

      <Modal isOpen={modal === "period"} onClose={() => setModal(null)} title="Tambah periode"><form className="space-y-4" onSubmit={createPeriod}><Input id="period-name" name="name" label="Nama periode" placeholder="2026/2027" required /><div className="grid grid-cols-2 gap-3"><Input id="period-start" name="startDate" type="date" label="Mulai" required /><Input id="period-end" name="endDate" type="date" label="Selesai" required /></div><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(null)}>Batal</Button><Button type="submit" isLoading={saving}>Simpan</Button></div></form></Modal>
      <Modal isOpen={modal === "position"} onClose={() => setModal(null)} title="Tambah jabatan"><form className="space-y-4" onSubmit={createPosition}><div className="grid grid-cols-2 gap-3"><Input id="position-code" name="code" label="Kode" placeholder="KETUA" required /><Input id="position-level" name="level" label="Level" type="number" min="1" defaultValue="100" required /></div><Input id="position-name" name="name" label="Nama jabatan" required /><Textarea id="position-description" name="description" label="Deskripsi" /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(null)}>Batal</Button><Button type="submit" isLoading={saving}>Simpan</Button></div></form></Modal>
      <Modal isOpen={modal === "assignment"} onClose={() => setModal(null)} title="Tambah pengurus"><form className="space-y-4" onSubmit={createAssignment}><Select id="assignment-period" name="periodId" label="Periode" required defaultValue={periods.data?.find((item) => item.status === "ACTIVE")?.id}><option value="">Pilih periode</option>{periods.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select id="assignment-member" name="memberId" label="Anggota" required><option value="">Pilih anggota</option>{members.data?.map((item) => <option key={item.id} value={item.id}>{item.full_name} · {item.student_number}</option>)}</Select><Select id="assignment-position" name="positionId" label="Jabatan" required><option value="">Pilih jabatan</option>{positions.data?.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Select id="assignment-parent" name="reportsToAssignmentId" label="Atasan langsung"><option value="">Tidak ada</option>{activeStructure?.assignments.map((item) => <option key={item.id} value={item.id}>{item.positions.name} · {item.members.full_name}</option>)}</Select><Input id="assignment-order" name="sortOrder" label="Urutan" type="number" min="0" defaultValue="0" required /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(null)}>Batal</Button><Button type="submit" isLoading={saving}>Simpan</Button></div></form></Modal>
      <ConfirmDialog isOpen={Boolean(activation)} title="Aktifkan periode?" description={`Periode aktif sebelumnya akan ditutup dan ${activation?.name ?? "periode ini"} menjadi periode aktif.`} confirmLabel="Aktifkan" isLoading={saving} onClose={() => setActivation(null)} onConfirm={activatePeriod} />
      <ConfirmDialog isOpen={Boolean(removeAssignment)} title="Hapus dari struktur?" description={`${removeAssignment?.members.full_name ?? "Anggota"} akan dilepas dari jabatan pada periode aktif.`} confirmLabel="Hapus" danger isLoading={saving} onClose={() => setRemoveAssignment(null)} onConfirm={deleteAssignment} />
    </div>
  );
}
