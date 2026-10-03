"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Checkbox } from "@/components/ui/FormControls";
import { useApiResource } from "@/hooks/useApiResource";
import { apiClient } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/errors";

interface Notification { id: string; type: string; title: string; body?: string | null; targetUrl?: string | null; readAt?: string | null; createdAt: string }
interface NotificationMeta { unreadCount: number }

export function NotificationsPage() {
  const router = useRouter();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const notifications = useApiResource<Notification[], NotificationMeta>(`/notifications${unreadOnly ? "?unread=true" : ""}`);
  async function markRead(id: string) { await apiClient.patch(`/notifications/${id}/read`, {}); notifications.reload(); }
  async function markAll() { await apiClient.patch("/notifications/read-all", {}); notifications.reload(); }
  async function openNotification(id: string) {
    setOpenError(null);
    try {
      const destination = await apiClient.get<{ url: string }>(`/notifications/${id}/destination`);
      await markRead(id);
      router.push(destination.url);
    } catch (error) { setOpenError(getApiErrorMessage(error, "Tujuan notifikasi tidak dapat dibuka.")); }
  }

  return <div className="space-y-6">
    <PageHeader title="Notifikasi" description={`${notifications.meta?.unreadCount ?? 0} notifikasi belum dibaca.`} breadcrumbs={[{ label: "Portal" }, { label: "Notifikasi" }]} actions={<Button variant="outline" onClick={() => void markAll()} disabled={!notifications.meta?.unreadCount} leftIcon={<CheckCheck className="h-4 w-4" />}>Tandai semua dibaca</Button>} />
    <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-gray-700"><Checkbox checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />Tampilkan yang belum dibaca saja</label>
    {openError && <Alert variant="error" onDismiss={() => setOpenError(null)}>{openError}</Alert>}
    {notifications.error && <Alert variant="error">{notifications.error}</Alert>}
    {notifications.isLoading ? <FeedbackState kind="loading" /> : !notifications.data?.length ? <FeedbackState kind="empty" title="Belum ada notifikasi" description="Keputusan review, pesan, dan perubahan workflow akan tampil di sini." /> : <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">{notifications.data.map((item) => <article key={item.id} className={`flex gap-4 border-b border-gray-100 p-5 last:border-b-0 ${item.readAt ? "bg-white" : "bg-brand-50/50"}`}><span className={`mt-1 rounded-xl p-2.5 ${item.readAt ? "bg-gray-100 text-gray-500" : "bg-brand-100 text-brand-700"}`}><Bell className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-gray-950">{item.title}</h2>{!item.readAt && <span className="h-2 w-2 rounded-full bg-brand-500" aria-label="Belum dibaca" />}</div>{item.body && <p className="mt-1 text-sm leading-6 text-gray-600">{item.body}</p>}<p className="mt-2 text-xs text-gray-400">{new Date(item.createdAt).toLocaleString("id-ID")}</p></div><div className="flex shrink-0 items-start gap-1">{!item.readAt && <Button size="sm" variant="ghost" onClick={() => void markRead(item.id)}>Dibaca</Button>}{item.targetUrl && <Button size="sm" variant="ghost" onClick={() => void openNotification(item.id)} aria-label={`Buka ${item.title}`}><ExternalLink className="h-4 w-4" /></Button>}</div></article>)}</div>}
  </div>;
}

export function NotificationBell() {
  const notifications = useApiResource<Notification[], NotificationMeta>("/notifications?unread=true");
  const count = notifications.meta?.unreadCount ?? 0;
  return <Link href="/portal/notifikasi" className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label={`${count} notifikasi belum dibaca`}><Bell className="h-5 w-5" />{count > 0 && <span className="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{count > 9 ? "9+" : count}</span>}</Link>;
}
