import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.middleware';
import { requireTenantRole } from '../../middleware/role.guard';
import { prisma } from '../../core/prisma';
import { ApiResponse } from '../../utils/ApiResponse';
import { ApiError } from '../../utils/ApiError';
import { parseId, requireTenantContext } from '../../utils/request';
import { serialize } from '../../utils/serialize';
import { isHmjHimaPair } from '../../policies/tenant.policy';
import { createNotification } from '../../services/notification.service';
import { writeAudit } from '../../services/audit.service';

const router = Router();
router.use(requireAuth, requireTenantRole(['HMJ_ADMIN', 'HIMA_ADMIN']));

async function loadPair(actorId: bigint, counterpartId: bigint) {
  const [actor, counterpart] = await Promise.all([
    prisma.tenants.findFirst({ where: { id: actorId, status: 'ACTIVE', deleted_at: null } }),
    prisma.tenants.findFirst({ where: { id: counterpartId, status: 'ACTIVE', deleted_at: null } }),
  ]);
  if (!actor || !counterpart || !isHmjHimaPair(
    { id: actor.id.toString(), type: actor.tenant_type, parentTenantId: actor.parent_tenant_id?.toString() },
    { id: counterpart.id.toString(), type: counterpart.tenant_type, parentTenantId: counterpart.parent_tenant_id?.toString() },
  )) throw new ApiError(403, 'Percakapan hanya diizinkan antara HMJ dan HIMA anaknya');
  return actor.tenant_type === 'HMJ'
    ? { hmjId: actor.id, himaId: counterpart.id }
    : { hmjId: counterpart.id, himaId: actor.id };
}

async function accessibleConversation(id: bigint, tenantId: bigint) {
  const conversation = await prisma.conversations.findFirst({ where: { id, OR: [{ hmj_tenant_id: tenantId }, { hima_tenant_id: tenantId }] } });
  if (!conversation) throw new ApiError(404, 'Percakapan tidak ditemukan');
  return conversation;
}

router.get('/conversations', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const tenantId = BigInt(tenant.id);
  const items = await prisma.conversations.findMany({
    where: { OR: [{ hmj_tenant_id: tenantId }, { hima_tenant_id: tenantId }] }, orderBy: [{ last_message_at: 'desc' }, { created_at: 'desc' }],
    include: {
      tenants_conversations_hmj_tenant_idTotenants: { select: { id: true, name: true, slug: true } },
      tenants_conversations_hima_tenant_idTotenants: { select: { id: true, name: true, slug: true } },
      messages: { where: { deleted_at: null }, orderBy: { sent_at: 'desc' }, take: 1 },
    },
  });
  const unread = await prisma.messages.groupBy({ by: ['conversation_id'], where: {
    conversation_id: { in: items.map((item) => item.id) }, sender_tenant_id: { not: tenantId }, deleted_at: null,
    message_reads: { none: { user_id: BigInt(auth.user.id) } },
  }, _count: true });
  const unreadMap = new Map(unread.map((row) => [row.conversation_id.toString(), row._count]));
  res.json(ApiResponse.success(serialize(items.map((item) => ({ ...item, unreadCount: unreadMap.get(item.id.toString()) ?? 0 })))));
});

router.post('/conversations', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const input = z.object({ counterpartTenantId: z.string().regex(/^\d+$/), subject: z.string().trim().max(180).optional() }).parse(req.body);
  const pair = await loadPair(BigInt(tenant.id), BigInt(input.counterpartTenantId));
  const conversation = await prisma.conversations.upsert({
    where: { hmj_tenant_id_hima_tenant_id: { hmj_tenant_id: pair.hmjId, hima_tenant_id: pair.himaId } },
    create: { hmj_tenant_id: pair.hmjId, hima_tenant_id: pair.himaId, subject: input.subject, created_by_user_id: BigInt(auth.user.id) },
    update: { status: 'ACTIVE', subject: input.subject || undefined },
  });
  res.status(201).json(ApiResponse.success(serialize(conversation), 'Percakapan siap digunakan'));
});

router.get('/conversations/:id/messages', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const conversation = await accessibleConversation(parseId(req.params.id), BigInt(tenant.id));
  const items = await prisma.messages.findMany({ where: { conversation_id: conversation.id, deleted_at: null },
    orderBy: { sent_at: 'asc' }, take: 200, include: { users: { select: { full_name: true } } } });
  res.json(ApiResponse.success(serialize(items)));
});

router.post('/conversations/:id/messages', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const body = z.object({ body: z.string().trim().min(1).max(10000) }).parse(req.body).body;
  const tenantId = BigInt(tenant.id);
  const conversation = await accessibleConversation(parseId(req.params.id), tenantId);
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.messages.create({ data: { conversation_id: conversation.id, sender_user_id: BigInt(auth.user.id), sender_tenant_id: tenantId, body } });
    await tx.conversations.update({ where: { id: conversation.id }, data: { last_message_at: created.sent_at } });
    const recipientTenantId = conversation.hmj_tenant_id === tenantId ? conversation.hima_tenant_id : conversation.hmj_tenant_id;
    const recipients = await tx.user_roles.findMany({ where: { tenant_id: recipientTenantId, is_active: true, revoked_at: null }, select: { user_id: true } });
    await Promise.all(recipients.map((recipient) => createNotification({ recipientUserId: recipient.user_id, tenantId: recipientTenantId,
      type: 'MESSAGE_RECEIVED', title: 'Pesan baru', body: body.slice(0, 160), targetUrl: `/portal/pesan/${conversation.id}`,
      objectType: 'conversation', objectId: conversation.id }, tx)));
    await writeAudit({ actorUserId: BigInt(auth.user.id), actorTenantId: tenantId, action: 'MESSAGE_SENT', objectType: 'conversation',
      objectId: conversation.id, objectTenantId: tenantId, metadata: { messageId: created.id.toString() } }, tx);
    return created;
  });
  res.status(201).json(ApiResponse.success(serialize(message), 'Pesan berhasil dikirim'));
});

router.post('/conversations/:id/read', async (req, res) => {
  const { auth, tenant } = requireTenantContext(req);
  const conversation = await accessibleConversation(parseId(req.params.id), BigInt(tenant.id));
  const unread = await prisma.messages.findMany({ where: { conversation_id: conversation.id, sender_tenant_id: { not: BigInt(tenant.id) },
    deleted_at: null, message_reads: { none: { user_id: BigInt(auth.user.id) } } }, select: { id: true } });
  if (unread.length) await prisma.message_reads.createMany({ data: unread.map((message) => ({ message_id: message.id, user_id: BigInt(auth.user.id) })), skipDuplicates: true });
  res.json(ApiResponse.success({ marked: unread.length }, 'Pesan ditandai telah dibaca'));
});

export default router;
