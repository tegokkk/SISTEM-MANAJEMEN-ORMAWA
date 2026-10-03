'use client';

import { FormEvent, useState } from 'react';
import { MessageSquarePlus, Send } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FeedbackState } from '@/components/ui/FeedbackState';
import { Select, Textarea } from '@/components/ui/FormControls';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { useApiResource } from '@/hooks/useApiResource';
import { apiClient } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/errors';

interface TenantPeer {
  id: string;
  code: string;
  name: string;
  tenant_type: string;
}
interface Message {
  id: string;
  body: string;
  sender_tenant_id: string;
  sent_at: string;
  users?: { full_name: string };
}
interface Conversation {
  id: string;
  subject?: string | null;
  hmj_tenant_id: string;
  hima_tenant_id: string;
  last_message_at?: string | null;
  unreadCount: number;
  tenants_conversations_hmj_tenant_idTotenants: TenantPeer;
  tenants_conversations_hima_tenant_idTotenants: TenantPeer;
  messages?: Message[];
}

export function MessagingPage({ unreadOnly = false }: { unreadOnly?: boolean }) {
  const { activeTenant } = useAuth();
  const conversations = useApiResource<Conversation[]>('/messaging/conversations');
  const peers = useApiResource<TenantPeer[]>('/tenants/communication-peers');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visibleConversations = unreadOnly
    ? conversations.data?.filter((item) => item.unreadCount > 0)
    : conversations.data;
  const activeConversationId = selectedId ?? visibleConversations?.[0]?.id ?? null;
  const messages = useApiResource<Message[]>(
    activeConversationId ? `/messaging/conversations/${activeConversationId}/messages` : null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = conversations.data?.find((item) => item.id === activeConversationId);
  const unreadCount = conversations.data?.reduce((total, item) => total + item.unreadCount, 0) ?? 0;
  const counterpart = current
    ? current.hmj_tenant_id === activeTenant?.id
      ? current.tenants_conversations_hima_tenant_idTotenants
      : current.tenants_conversations_hmj_tenant_idTotenants
    : null;

  async function selectConversation(id: string) {
    setSelectedId(id);
    try {
      await apiClient.post(`/messaging/conversations/${id}/read`, {});
      conversations.reload();
    } catch {
      /* daftar pesan tetap dapat dibuka */
    }
  }

  async function createConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const created = await apiClient.post<Conversation>('/messaging/conversations', {
        counterpartTenantId: data.get('counterpartTenantId'),
        subject: data.get('subject'),
      });
      setCreateOpen(false);
      setSelectedId(created.id);
      conversations.reload();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Percakapan gagal dibuat.'));
    } finally {
      setSaving(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeConversationId) return;
    setSaving(true);
    setError(null);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await apiClient.post(`/messaging/conversations/${activeConversationId}/messages`, {
        body: data.get('body'),
      });
      form.reset();
      messages.reload();
      conversations.reload();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Pesan gagal dikirim.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pesan HMJ–HIMA"
        description="Kanal komunikasi privat yang hanya dapat dibuat antara HMJ dan HIMA dalam hubungan induk–anak yang sah."
        breadcrumbs={[{ label: 'Portal' }, { label: 'Pesan' }]}
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            leftIcon={<MessageSquarePlus className="h-4 w-4" />}
          >
            Percakapan baru
          </Button>
        }
      />
      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {unreadOnly && <Alert variant="info">Menampilkan {unreadCount} pesan belum dibaca.</Alert>}
      <div className="grid min-h-[560px] overflow-hidden rounded-2xl border border-gray-200 bg-white lg:grid-cols-[320px_1fr]">
        <aside className="border-b border-gray-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-gray-100 p-4">
            <p className="text-sm font-semibold text-gray-900">Percakapan</p>
            <p className="text-xs text-gray-500">{visibleConversations?.length ?? 0} kanal aktif</p>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {conversations.isLoading ? (
              <p className="p-5 text-sm text-gray-500">Memuat…</p>
            ) : visibleConversations?.length ? (
              visibleConversations.map((item) => {
                const peer =
                  item.hmj_tenant_id === activeTenant?.id
                    ? item.tenants_conversations_hima_tenant_idTotenants
                    : item.tenants_conversations_hmj_tenant_idTotenants;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void selectConversation(item.id)}
                    className={`w-full border-b border-gray-100 p-4 text-left transition ${activeConversationId === item.id ? 'bg-brand-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                        {peer.name}
                      </p>
                      {item.unreadCount > 0 && (
                        <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {item.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-500">
                      {item.subject || 'Percakapan organisasi'}
                    </p>
                  </button>
                );
              })
            ) : (
              <p className="p-5 text-sm text-gray-500">Belum ada percakapan.</p>
            )}
          </div>
        </aside>
        <section className="flex min-h-[560px] flex-col">
          {!activeConversationId ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <FeedbackState
                kind="empty"
                title="Pilih percakapan"
                description="Pilih kanal di sebelah kiri atau buat percakapan baru."
              />
            </div>
          ) : (
            <>
              <header className="border-b border-gray-100 px-5 py-4">
                <p className="font-semibold text-gray-950">{counterpart?.name ?? 'Percakapan'}</p>
                <p className="text-xs text-gray-500">
                  {current?.subject || 'Komunikasi resmi organisasi'}
                </p>
              </header>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto bg-gray-50/60 p-5">
                {messages.isLoading ? (
                  <p className="text-center text-sm text-gray-500">Memuat pesan…</p>
                ) : messages.data?.length ? (
                  messages.data.map((message) => {
                    const mine = message.sender_tenant_id === activeTenant?.id;
                    return (
                      <div
                        key={message.id}
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? 'ml-auto rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md border border-gray-200 bg-white text-gray-800'}`}
                      >
                        <p className="text-sm leading-6">{message.body}</p>
                        <p
                          className={`mt-1 text-[10px] ${mine ? 'text-brand-100' : 'text-gray-400'}`}
                        >
                          {message.users?.full_name} ·{' '}
                          {new Date(message.sent_at).toLocaleString('id-ID')}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <p className="m-auto text-sm text-gray-500">
                    Belum ada pesan. Mulai percakapan di bawah.
                  </p>
                )}
              </div>
              <form
                onSubmit={sendMessage}
                className="flex items-end gap-3 border-t border-gray-100 p-4"
              >
                <Textarea
                  id="message-body"
                  name="body"
                  aria-label="Isi pesan"
                  placeholder="Tulis pesan…"
                  className="min-h-12"
                  required
                />
                <Button type="submit" isLoading={saving} aria-label="Kirim pesan">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Percakapan baru">
        <form className="space-y-4" onSubmit={createConversation}>
          <Select
            id="message-peer"
            name="counterpartTenantId"
            label={activeTenant?.type === 'HMJ' ? 'HIMA tujuan' : 'HMJ induk'}
            required
          >
            <option value="">Pilih organisasi</option>
            {peers.data?.map((peer) => (
              <option key={peer.id} value={peer.id}>
                {peer.name}
              </option>
            ))}
          </Select>
          <Input id="message-subject" name="subject" label="Subjek" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button type="submit" isLoading={saving}>
              Buat percakapan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
