import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { prisma } from '../../core/prisma';
import { ApiResponse } from '../../utils/ApiResponse';
import { parseId, requireAuthContext } from '../../utils/request';
import { ApiError } from '../../utils/ApiError';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const auth = requireAuthContext(req);
  const unreadOnly = req.query.unread === 'true';
  const items = await prisma.notifications.findMany({
    where: { recipient_user_id: BigInt(auth.user.id), read_at: unreadOnly ? null : undefined },
    orderBy: { created_at: 'desc' },
    take: 50,
  });
  const unreadCount = await prisma.notifications.count({
    where: { recipient_user_id: BigInt(auth.user.id), read_at: null },
  });
  res.json(ApiResponse.success(items.map((item) => ({
    id: item.id.toString(), type: item.notification_type, title: item.title, body: item.body,
    targetUrl: item.target_url, objectType: item.object_type, objectId: item.object_id?.toString(),
    readAt: item.read_at?.toISOString(), createdAt: item.created_at.toISOString(),
  })), 'Notifikasi berhasil dimuat', { unreadCount }));
});

router.get('/:id/destination', async (req, res) => {
  const auth = requireAuthContext(req);
  const notification = await prisma.notifications.findFirst({ where: {
    id: parseId(req.params.id, 'ID notifikasi'), recipient_user_id: BigInt(auth.user.id),
  } });
  if (!notification?.object_id) throw new ApiError(404, 'Tujuan notifikasi tidak ditemukan');

  const objectId = notification.object_id;
  if (notification.object_type === 'tenant_application') {
    const application = await prisma.tenant_applications.findFirst({ where: { id: objectId, applicant_user_id: BigInt(auth.user.id) } });
    if (!application) throw new ApiError(404, 'Tujuan notifikasi tidak ditemukan');
    return res.json(ApiResponse.success({ url: '/status-pengajuan' }));
  }

  const tenantId = auth.activeTenant?.id ? BigInt(auth.activeTenant.id) : null;
  if (!tenantId || notification.tenant_id !== tenantId) throw new ApiError(403, 'Pilih tenant penerima notifikasi terlebih dahulu');
  let url: string | undefined;
  let accessible = false;
  switch (notification.object_type) {
    case 'work_program':
      accessible = Boolean(await prisma.work_programs.findFirst({ where: { id: objectId, tenant_id: tenantId, deleted_at: null }, select: { id: true } }));
      url = '/portal/program-kerja';
      break;
    case 'requirement_request':
      accessible = Boolean(await prisma.requirement_requests.findFirst({ where: { id: objectId, OR: [{ source_tenant_id: tenantId }, { target_tenant_id: tenantId }] }, select: { id: true } }));
      url = '/portal/kebutuhan';
      break;
    case 'finance_request':
      accessible = Boolean(await prisma.finance_requests.findFirst({ where: { id: objectId, OR: [{ source_tenant_id: tenantId }, { target_tenant_id: tenantId }] }, select: { id: true } }));
      url = '/portal/pengajuan-dana';
      break;
    case 'conversation':
      accessible = Boolean(await prisma.conversations.findFirst({ where: { id: objectId, OR: [{ hmj_tenant_id: tenantId }, { hima_tenant_id: tenantId }] }, select: { id: true } }));
      url = '/portal/pesan';
      break;
  }
  if (!accessible || !url) throw new ApiError(404, 'Tujuan notifikasi tidak ditemukan');
  res.json(ApiResponse.success({ url }));
});

router.patch('/:id/read', async (req, res) => {
  const auth = requireAuthContext(req);
  const id = parseId(req.params.id, 'ID notifikasi');
  const result = await prisma.notifications.updateMany({
    where: { id, recipient_user_id: BigInt(auth.user.id) },
    data: { read_at: new Date() },
  });
  if (!result.count) return res.status(404).json(ApiResponse.error('Notifikasi tidak ditemukan'));
  res.json(ApiResponse.success(null, 'Notifikasi ditandai telah dibaca'));
});

router.patch('/read-all', async (req, res) => {
  const auth = requireAuthContext(req);
  await prisma.notifications.updateMany({
    where: { recipient_user_id: BigInt(auth.user.id), read_at: null },
    data: { read_at: new Date() },
  });
  res.json(ApiResponse.success(null, 'Semua notifikasi ditandai telah dibaca'));
});

export default router;
