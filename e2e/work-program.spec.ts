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

test('QA-007 program kerja HIMA berjalan sampai selesai setelah disetujui HMJ', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'Workflow mutasi database cukup dijalankan sekali pada Chromium desktop',
  );
  test.setTimeout(90_000);

  const runId = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
  const programCode = `Q7${runId}`.toUpperCase();
  const programName = `Program QA-007 ${runId}`;

  try {
    await login(page, 'hima.demo@example.test', uniqueIp('7:1'));
    await expect(page).toHaveURL(/\/hima\/dashboard$/);
    await page.goto('/portal/program-kerja');
    await page.getByRole('button', { name: 'Buat program' }).click();

    const createDialog = page.getByRole('dialog', { name: 'Buat program kerja' });
    await expect(createDialog).toBeVisible();
    const period = createDialog.getByLabel('Periode');
    await expect(period.getByRole('option', { name: 'Periode Demo 2026' })).toHaveCount(1);
    await period.selectOption({ label: 'Periode Demo 2026' });
    await createDialog.getByLabel('Kode program').fill(programCode);
    await createDialog.getByLabel('Nama program').fill(programName);
    await createDialog.getByLabel('Tanggal mulai').fill('2026-10-20');
    await createDialog.getByLabel('Tanggal selesai').fill('2026-10-21');
    await createDialog.getByLabel('Lokasi').fill('Kampus Polinela');
    await createDialog.getByLabel('Anggaran diajukan').fill('1750000');
    await createDialog.getByLabel('Deskripsi').fill('Fixture E2E program kerja QA-007.');
    await createDialog.getByLabel('Tujuan').fill('Memvalidasi workflow program kerja HIMA.');
    await createDialog.getByRole('button', { name: 'Simpan draf' }).click();
    await expect(createDialog).toBeHidden();

    let programRow = page.getByRole('row').filter({ hasText: programName });
    await expect(programRow).toContainText('Draf');
    await programRow.getByRole('button', { name: 'Ajukan' }).click();
    await page.getByRole('dialog', { name: 'Konfirmasi perubahan status' })
      .getByRole('button', { name: 'Ya, lanjutkan' })
      .click();
    await expect(programRow).toContainText('Menunggu Review');

    await logout(page);
    await login(page, 'hmjpangan@polinela.ac.id', uniqueIp('7:2'));
    await expect(page).toHaveURL(/\/hmj\/dashboard$/);
    await page.goto('/portal/program-kerja');
    await page.getByRole('button', { name: 'Antrian review HIMA' }).click();

    programRow = page.getByRole('row').filter({ hasText: programName });
    await expect(programRow).toContainText('Menunggu Review');
    await programRow.getByRole('button', { name: 'Review' }).click();
    const reviewDialog = page.getByRole('dialog', { name: 'Review program kerja' });
    await reviewDialog.getByLabel('Keputusan').selectOption('APPROVED');
    await reviewDialog.getByLabel('Catatan').fill('Disetujui melalui E2E QA-007.');
    await reviewDialog.getByRole('button', { name: 'Simpan keputusan' }).click();
    await expect(reviewDialog).toBeHidden();
    await expect(programRow).toContainText('Disetujui');

    await logout(page);
    await login(page, 'hima.demo@example.test', uniqueIp('7:3'));
    await expect(page).toHaveURL(/\/hima\/dashboard$/);
    await page.goto('/portal/program-kerja');
    programRow = page.getByRole('row').filter({ hasText: programName });
    await expect(programRow).toContainText('Disetujui');

    await programRow.getByRole('button', { name: 'Mulai' }).click();
    await page.getByRole('dialog', { name: 'Konfirmasi perubahan status' })
      .getByRole('button', { name: 'Ya, lanjutkan' })
      .click();
    await expect(programRow).toContainText('Berjalan');

    await programRow.getByRole('button', { name: 'Selesai' }).click();
    await page.getByRole('dialog', { name: 'Konfirmasi perubahan status' })
      .getByRole('button', { name: 'Ya, lanjutkan' })
      .click();
    await expect(programRow).toContainText('Selesai');

    await programRow.getByRole('button', { name: `Riwayat ${programName}` }).click();
    const historyDialog = page.getByRole('dialog', { name: `Riwayat · ${programName}` });
    for (const status of ['Draf', 'Menunggu Review', 'Disetujui', 'Berjalan', 'Selesai']) {
      await expect(historyDialog.getByText(status, { exact: true })).toBeVisible();
    }
  } finally {
    await page.context().clearCookies();
    loadDatabaseUrl();
    const { PrismaClient } = await import('../backend/src/generated/prisma/index.js');
    const prisma = new PrismaClient();
    const program = await prisma.work_programs.findFirst({ where: { code: programCode } });

    if (program) {
      await prisma.notifications.deleteMany({
        where: { object_type: 'work_program', object_id: program.id },
      });
      await prisma.audit_logs.deleteMany({
        where: { object_type: 'work_program', object_id: program.id },
      });
      await prisma.work_program_status_history.deleteMany({
        where: { work_program_id: program.id },
      });
      await prisma.work_programs.delete({ where: { id: program.id } });
    }

    await prisma.$disconnect();
  }
});
