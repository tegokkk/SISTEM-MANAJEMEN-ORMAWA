import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const apiUrl = 'http://localhost:4000/api/v1';
const frontendUrl = 'http://localhost:3000';

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return;

  const contents = readFileSync(resolve(process.cwd(), 'backend', '.env'), 'utf8');
  const match = contents.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
  if (!match) throw new Error('DATABASE_URL tidak ditemukan di backend/.env');
  process.env.DATABASE_URL = match[1];
}

async function login(page: Page, email: string, password: string, forwardedFor: string) {
  await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': forwardedFor });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Kata Sandi').fill(password);
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

test('QA-006 pengajuan ORMAWA disetujui Super Admin dan mengaktifkan tenant', async ({
  page,
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'Workflow mutasi database cukup dijalankan sekali pada Chromium desktop',
  );
  test.setTimeout(90_000);

  const runId = `${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
  const applicantEmail = `qa006.${runId}@example.test`;
  const password = 'Qa006Password123';
  const organizationCode = `Q6${runId}`.toUpperCase();
  const organizationName = `ORMAWA QA-006 ${runId}`;
  const applicantIpSuffix = crypto.randomBytes(4).toString('hex');
  const adminIpSuffix = crypto.randomBytes(4).toString('hex');
  const applicantIp = `2001:db8:6::${applicantIpSuffix.slice(0, 4)}:${applicantIpSuffix.slice(4)}`;
  const adminIp = `2001:db8:a::${adminIpSuffix.slice(0, 4)}:${adminIpSuffix.slice(4)}`;

  const registration = await request.post(`${apiUrl}/auth/register`, {
    headers: {
      Origin: frontendUrl,
      'X-Forwarded-For': applicantIp,
    },
    data: {
      fullName: `Pemohon QA-006 ${runId}`,
      email: applicantEmail,
      phone: '081234567890',
      password,
      passwordConfirmation: password,
    },
  });
  expect(registration, await registration.text()).toBeOK();

  try {
    await login(page, applicantEmail, password, applicantIp);
    await expect(page).toHaveURL(/\/status-pengajuan$/);

    await page.goto('/daftar/ormawa');
    await page.getByPlaceholder('Contoh: BEM KBM Polinela').fill(organizationName);
    await page.getByPlaceholder('Contoh: BEM', { exact: true }).fill(organizationCode);
    await page.getByPlaceholder('opsional@polinela.ac.id').fill(applicantEmail);
    await page.getByPlaceholder('081234567890').fill('081234567890');
    await page
      .getByPlaceholder('Jelaskan secara singkat mengenai organisasi ini...')
      .fill('Fixture E2E pengajuan tenant QA-006.');
    await page
      .getByPlaceholder(/Jelaskan mengapa organisasi ini perlu didirikan/i)
      .fill('Memverifikasi alur pengajuan dan persetujuan tenant secara menyeluruh.');
    const [createApplicationResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' && response.url() === `${apiUrl}/applications`,
      ),
      page.getByRole('button', { name: 'Kirim Pengajuan' }).click(),
    ]);
    expect(
      createApplicationResponse.status(),
      JSON.stringify({
        body: await createApplicationResponse.text(),
        requestHeaders: await createApplicationResponse.request().allHeaders(),
      }),
    ).toBe(201);

    await expect(page.getByRole('heading', { name: 'Pengajuan Terkirim!' })).toBeVisible();
    await page.getByRole('button', { name: 'Cek Status Pengajuan' }).click();
    const submittedCard = page.locator('div.border').filter({ hasText: organizationName }).first();
    await expect(submittedCard).toContainText('Menunggu Review');

    await logout(page);
    await login(page, 'admin@polinela.ac.id', 'password123', adminIp);
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await page.goto('/admin/pengajuan-akun');

    const applicationRow = page.getByRole('row').filter({ hasText: organizationName });
    await expect(applicationRow).toBeVisible();
    await applicationRow.getByTitle('Lihat Detail & Review').click();

    const reviewDialog = page.getByRole('dialog', { name: 'Detail Pengajuan' });
    await expect(reviewDialog).toContainText(organizationName);
    await reviewDialog.getByText('Setujui', { exact: true }).click();
    await reviewDialog.getByRole('button', { name: 'Simpan Keputusan' }).click();
    await expect(reviewDialog).toBeHidden();
    await expect(applicationRow).toBeHidden();

    await logout(page);
    await login(page, applicantEmail, password, `${applicantIp}:1`);
    await expect(page).toHaveURL(/\/ormawa\/dashboard$/);
    await expect(page.getByRole('heading', { name: organizationName })).toBeVisible();
  } finally {
    await page.context().clearCookies();
    loadDatabaseUrl();
    const { PrismaClient } = await import('../backend/src/generated/prisma/index.js');
    const prisma = new PrismaClient();
    const application = await prisma.tenant_applications.findFirst({
      where: { organization_code: organizationCode },
    });
    const applicant = await prisma.users.findUnique({ where: { email: applicantEmail } });
    const applicationId = application?.id;
    const tenantId = application?.approved_tenant_id;

    if (applicationId) {
      await prisma.notifications.deleteMany({
        where: { object_type: 'tenant_application', object_id: applicationId },
      });
      await prisma.audit_logs.deleteMany({
        where: { object_type: 'tenant_application', object_id: applicationId },
      });
      await prisma.tenant_application_files.deleteMany({
        where: { tenant_application_id: applicationId },
      });
      await prisma.tenant_application_status_history.deleteMany({
        where: { tenant_application_id: applicationId },
      });
      await prisma.tenant_applications.delete({ where: { id: applicationId } });
    }

    if (applicant) {
      await prisma.notifications.deleteMany({ where: { recipient_user_id: applicant.id } });
      await prisma.audit_logs.deleteMany({ where: { actor_user_id: applicant.id } });
      await prisma.auth_sessions.deleteMany({ where: { user_id: applicant.id } });
      await prisma.password_reset_tokens.deleteMany({ where: { user_id: applicant.id } });
      await prisma.user_roles.deleteMany({ where: { user_id: applicant.id } });
      await prisma.users.delete({ where: { id: applicant.id } });
    }

    if (tenantId) {
      await prisma.notifications.deleteMany({ where: { tenant_id: tenantId } });
      await prisma.audit_logs.deleteMany({ where: { object_tenant_id: tenantId } });
      await prisma.transaction_categories.deleteMany({ where: { tenant_id: tenantId } });
      await prisma.tenants.delete({ where: { id: tenantId } });
    }

    await prisma.$disconnect();
  }
});
