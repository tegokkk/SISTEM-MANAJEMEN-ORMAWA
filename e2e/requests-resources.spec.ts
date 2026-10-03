import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const apiUrl = 'http://localhost:4000/api/v1';

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;
  const contents = readFileSync(resolve(process.cwd(), 'backend', '.env'), 'utf8');
  const match = contents.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
  if (!match) throw new Error('DATABASE_URL tidak ditemukan di backend/.env');
  process.env.DATABASE_URL = match[1];
}

function uniqueIp(network: string) {
  const suffix = crypto.randomBytes(4).toString('hex');
  return `2001:db8:${network}::${suffix.slice(0, 4)}:${suffix.slice(4)}`;
}

async function login(page: Page, email: string, forwardedFor: string) {
  await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': forwardedFor });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Kata Sandi').fill('password123');
  await page.getByRole('button', { name: 'Masuk' }).click();
}

async function logout(page: Page) {
  await page.evaluate(async (url) => {
    await fetch(`${url}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  }, apiUrl);
  await page.context().clearCookies();
}

async function createAndSubmitRequest(
  page: Page,
  kind: 'kebutuhan' | 'dana',
  requestNumber: string,
  title: string,
) {
  await page.goto(`/portal/${kind === 'dana' ? 'pengajuan-dana' : 'kebutuhan'}`);
  await page.getByRole('button', { name: 'Buat pengajuan' }).click();

  const dialog = page.getByRole('dialog', { name: `Buat pengajuan ${kind}` });
  await dialog.getByLabel('Nomor pengajuan').fill(requestNumber);
  await dialog.getByLabel('Judul').fill(title);
  if (kind === 'dana') {
    await dialog
      .getByLabel('Program kerja')
      .selectOption({ label: 'PROJA-DEMO-001 · Lokakarya Benih Demo' });
  } else {
    await dialog.getByLabel('Prioritas').selectOption('HIGH');
  }
  await dialog.getByLabel('Deskripsi').fill(`Fixture E2E ${kind} QA-008.`);
  await dialog
    .getByPlaceholder(kind === 'dana' ? 'Uraian anggaran' : 'Nama kebutuhan')
    .fill(kind === 'dana' ? 'Konsumsi kegiatan QA-008' : 'Kertas kegiatan QA-008');
  await dialog.getByLabel('Jumlah item 1').fill('2');
  await dialog.getByLabel('Satuan item 1').fill('pak');
  await dialog.getByLabel('Harga item 1').fill('25000');
  await dialog.getByRole('button', { name: 'Simpan draf' }).click();

  const row = page.getByRole('row').filter({ hasText: title });
  await expect(row).toContainText('Draf');
  await row.getByRole('button', { name: 'Kirim' }).click();
  await page
    .getByRole('dialog', { name: `Kirim pengajuan ${kind}?` })
    .getByRole('button', { name: 'Kirim pengajuan' })
    .click();
  await expect(row).toContainText('Menunggu Review');
}

test('QA-008 kebutuhan, dana, inventaris, dan pesan HIMA–HMJ berjalan end-to-end', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'Workflow mutasi database cukup dijalankan sekali pada Chromium desktop',
  );
  test.setTimeout(150_000);

  const runId = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
  const requirementNumber = `Q8K${runId}`;
  const financeNumber = `Q8F${runId}`;
  const inventoryCode = `Q8I${runId}`;
  const requirementTitle = `Kebutuhan QA-008 ${runId}`;
  const financeTitle = `Dana QA-008 ${runId}`;
  const inventoryName = `Inventaris QA-008 ${runId}`;
  const messageBody = `Pesan QA-008 ${runId}`;
  let originalConversation: {
    id: bigint;
    subject: string | null;
    last_message_at: Date | null;
  } | null = null;
  let conversationId: bigint | null = null;
  let hmjUserId: bigint | null = null;
  let previouslyUnreadMessageIds: bigint[] = [];

  try {
    await login(page, 'hima.demo@example.test', uniqueIp('8:1'));
    await expect(page).toHaveURL(/\/hima\/dashboard$/);

    await createAndSubmitRequest(page, 'kebutuhan', requirementNumber, requirementTitle);
    await createAndSubmitRequest(page, 'dana', financeNumber, financeTitle);

    await page.goto('/portal/inventaris');
    await page.getByRole('button', { name: 'Tambah item' }).click();
    const itemDialog = page.getByRole('dialog', { name: 'Tambah item inventaris' });
    await itemDialog.getByLabel('Kode item').fill(inventoryCode);
    await itemDialog.getByLabel('Nama item').fill(inventoryName);
    await itemDialog.getByLabel('Kategori').fill('Perlengkapan E2E');
    await itemDialog.getByLabel('Lokasi').fill('Gudang QA');
    await itemDialog.getByLabel('Stok awal').fill('5');
    await itemDialog.getByLabel('Stok minimum').fill('1');
    await itemDialog.getByLabel('Satuan').fill('unit');
    await itemDialog.getByRole('button', { name: 'Simpan item' }).click();

    let inventoryRow = page.getByRole('row').filter({ hasText: inventoryName });
    await expect(inventoryRow).toContainText('5 unit');
    await inventoryRow.getByRole('button', { name: 'Stok' }).click();
    const movementDialog = page.getByRole('dialog', { name: `Pergerakan stok · ${inventoryName}` });
    await movementDialog.getByLabel('Jenis pergerakan').selectOption('OUT');
    await movementDialog.getByLabel('Jumlah perubahan').fill('1');
    await movementDialog.getByLabel('Catatan').fill('Pemakaian fixture QA-008.');
    await movementDialog.getByRole('button', { name: 'Catat stok' }).click();
    inventoryRow = page.getByRole('row').filter({ hasText: inventoryName });
    await expect(inventoryRow).toContainText('4 unit');

    loadDatabaseUrl();
    const { PrismaClient } = await import('../backend/src/generated/prisma/index.js');
    const prisma = new PrismaClient();
    try {
      const [hmj, hima] = await Promise.all([
        prisma.tenants.findUniqueOrThrow({ where: { code: 'HMJ-PANGAN' } }),
        prisma.tenants.findUniqueOrThrow({ where: { code: 'HIMA-TBN-DEMO' } }),
      ]);
      const hmjUser = await prisma.users.findUniqueOrThrow({
        where: { email: 'hmjpangan@polinela.ac.id' },
        select: { id: true },
      });
      originalConversation = await prisma.conversations.findUnique({
        where: { hmj_tenant_id_hima_tenant_id: { hmj_tenant_id: hmj.id, hima_tenant_id: hima.id } },
        select: { id: true, subject: true, last_message_at: true },
      });
      if (originalConversation) {
        conversationId = originalConversation.id;
        hmjUserId = hmjUser.id;
        previouslyUnreadMessageIds = (
          await prisma.messages.findMany({
            where: {
              conversation_id: conversationId,
              sender_tenant_id: hima.id,
              message_reads: { none: { user_id: hmjUser.id } },
            },
            select: { id: true },
          })
        ).map((message) => message.id);
      }
    } finally {
      await prisma.$disconnect();
    }

    await page.goto('/portal/pesan');
    await page.getByRole('button', { name: 'Percakapan baru' }).click();
    const conversationDialog = page.getByRole('dialog', { name: 'Percakapan baru' });
    await conversationDialog
      .getByLabel('HMJ induk')
      .selectOption({ label: 'HMJ Budidaya Tanaman Pangan' });
    await conversationDialog.getByRole('button', { name: 'Buat percakapan' }).click();
    await page.getByLabel('Isi pesan').fill(messageBody);
    await page.getByRole('button', { name: 'Kirim pesan' }).click();
    await expect(page.getByText(messageBody, { exact: true })).toBeVisible();

    await logout(page);
    await login(page, 'hmjpangan@polinela.ac.id', uniqueIp('8:2'));
    await expect(page).toHaveURL(/\/hmj\/dashboard$/);

    await page.goto('/portal/kebutuhan');
    await page.getByRole('button', { name: 'Antrian review' }).click();
    let requestRow = page.getByRole('row').filter({ hasText: requirementTitle });
    await expect(requestRow).toContainText('Menunggu Review');
    await requestRow.getByRole('button', { name: 'Review' }).click();
    let reviewDialog = page.getByRole('dialog', { name: 'Review pengajuan kebutuhan' });
    await reviewDialog.getByLabel('Keputusan').selectOption('APPROVED');
    await reviewDialog.getByLabel('Catatan reviewer').fill('Disetujui melalui E2E QA-008.');
    await reviewDialog.getByRole('button', { name: 'Simpan keputusan' }).click();
    await expect(requestRow).toContainText('Disetujui');

    await page.goto('/portal/pengajuan-dana');
    await page.getByRole('button', { name: 'Antrian review' }).click();
    requestRow = page.getByRole('row').filter({ hasText: financeTitle });
    await expect(requestRow).toContainText('Menunggu Review');
    await requestRow.getByRole('button', { name: 'Review' }).click();
    reviewDialog = page.getByRole('dialog', { name: 'Review pengajuan dana' });
    await reviewDialog.getByLabel('Keputusan').selectOption('APPROVED');
    await reviewDialog.getByLabel('Catatan reviewer').fill('Disetujui melalui E2E QA-008.');
    await reviewDialog.getByRole('button', { name: 'Simpan keputusan' }).click();
    await expect(requestRow).toContainText('Disetujui');

    await page.goto('/portal/pesan');
    await page.getByRole('button', { name: 'HIMA Teknologi Perbenihan (Demo)' }).click();
    await expect(page.getByText(messageBody, { exact: true })).toBeVisible();
  } finally {
    await page
      .context()
      .clearCookies()
      .catch(() => undefined);
    loadDatabaseUrl();
    const { PrismaClient } = await import('../backend/src/generated/prisma/index.js');
    const prisma = new PrismaClient();
    try {
      const [hima, hmj] = await Promise.all([
        prisma.tenants.findUnique({ where: { code: 'HIMA-TBN-DEMO' } }),
        prisma.tenants.findUnique({ where: { code: 'HMJ-PANGAN' } }),
      ]);
      const requirements = await prisma.requirement_requests.findMany({
        where: { request_number: requirementNumber },
        select: { id: true },
      });
      const requirementIds = requirements.map((item) => item.id);
      if (requirementIds.length) {
        await prisma.notifications.deleteMany({
          where: { object_type: 'requirement_request', object_id: { in: requirementIds } },
        });
        await prisma.audit_logs.deleteMany({
          where: { object_type: 'requirement_request', object_id: { in: requirementIds } },
        });
        await prisma.requirement_requests.deleteMany({ where: { id: { in: requirementIds } } });
      }

      const finances = await prisma.finance_requests.findMany({
        where: { request_number: financeNumber },
        select: { id: true },
      });
      const financeIds = finances.map((item) => item.id);
      if (financeIds.length) {
        const transactions = await prisma.financial_transactions.findMany({
          where: { finance_request_id: { in: financeIds } },
          select: { id: true },
        });
        const transactionIds = transactions.map((item) => item.id);
        await prisma.notifications.deleteMany({
          where: { object_type: 'finance_request', object_id: { in: financeIds } },
        });
        await prisma.audit_logs.deleteMany({
          where: { object_type: 'finance_request', object_id: { in: financeIds } },
        });
        if (transactionIds.length) {
          await prisma.audit_logs.deleteMany({
            where: { object_type: 'financial_transaction', object_id: { in: transactionIds } },
          });
          await prisma.financial_transactions.deleteMany({ where: { id: { in: transactionIds } } });
        }
        await prisma.finance_requests.deleteMany({ where: { id: { in: financeIds } } });
      }

      const inventory = await prisma.inventory_items.findFirst({
        where: { code: inventoryCode },
        select: { id: true },
      });
      if (inventory) {
        await prisma.audit_logs.deleteMany({
          where: { object_type: 'inventory_item', object_id: inventory.id },
        });
        await prisma.inventory_movements.deleteMany({ where: { inventory_item_id: inventory.id } });
        await prisma.inventory_items.delete({ where: { id: inventory.id } });
      }

      const conversation =
        hima && hmj
          ? await prisma.conversations.findUnique({
              where: {
                hmj_tenant_id_hima_tenant_id: { hmj_tenant_id: hmj.id, hima_tenant_id: hima.id },
              },
              select: { id: true },
            })
          : null;
      if (conversation) {
        if (previouslyUnreadMessageIds.length && hmjUserId) {
          await prisma.message_reads.deleteMany({
            where: { user_id: hmjUserId, message_id: { in: previouslyUnreadMessageIds } },
          });
        }
        const testMessages = await prisma.messages.findMany({
          where: { conversation_id: conversation.id, body: { startsWith: 'Pesan QA-008 ' } },
          select: { id: true, body: true },
        });
        for (const testMessage of testMessages) {
          await prisma.notifications.deleteMany({
            where: {
              object_type: 'conversation',
              object_id: conversation.id,
              body: testMessage.body,
            },
          });
          const messageAudits = await prisma.audit_logs.findMany({
            where: {
              object_type: 'conversation',
              object_id: conversation.id,
              action: 'MESSAGE_SENT',
            },
            select: { id: true, metadata: true },
          });
          const auditIds = messageAudits
            .filter((audit) => {
              try {
                return JSON.parse(audit.metadata ?? '{}').messageId === testMessage.id.toString();
              } catch {
                return false;
              }
            })
            .map((audit) => audit.id);
          if (auditIds.length)
            await prisma.audit_logs.deleteMany({ where: { id: { in: auditIds } } });
          await prisma.messages.delete({ where: { id: testMessage.id } });
        }
        if (originalConversation && conversationId) {
          await prisma.conversations.update({
            where: { id: conversation.id },
            data: {
              subject: originalConversation.subject,
              last_message_at: originalConversation.last_message_at,
            },
          });
        } else if (!originalConversation) {
          await prisma.notifications.deleteMany({
            where: { object_type: 'conversation', object_id: conversation.id },
          });
          await prisma.audit_logs.deleteMany({
            where: { object_type: 'conversation', object_id: conversation.id },
          });
          await prisma.conversations.delete({ where: { id: conversation.id } });
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  }
});
