import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { prisma } from '../../core/prisma';
import { ApiError } from '../../utils/ApiError';
import { parseId, requireTenantContext } from '../../utils/request';
import { readPrivateFile } from '../../services/private-file.service';

const router = Router();
router.use(requireAuth);

router.get('/:id/download', async (req, res) => {
  const { tenant } = requireTenantContext(req);
  const id = parseId(req.params.id, 'ID berkas');
  const tenantId = BigInt(tenant.id);
  const [proposal, receipt] = await Promise.all([
    prisma.proposals.findFirst({ where: { file_id: id, OR: [
      { tenant_id: tenantId }, { work_programs: { reviewer_tenant_id: tenantId, deleted_at: null } },
    ] }, select: { id: true } }),
    prisma.financial_transactions.findFirst({ where: { attachment_file_id: id, tenant_id: tenantId }, select: { id: true } }),
  ]);
  if (!proposal && !receipt) throw new ApiError(404, 'Berkas tidak ditemukan');
  const file = await prisma.files.findFirst({ where: { id, visibility: 'PRIVATE', deleted_at: null } });
  if (!file || file.storage_driver !== 'local') throw new ApiError(404, 'Berkas tidak ditemukan');
  const content = await readPrivateFile(file.storage_key);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.attachment(file.original_name);
  res.type('application/octet-stream');
  res.send(content);
});

export default router;
