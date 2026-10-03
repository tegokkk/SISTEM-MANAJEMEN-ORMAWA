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

async function login(page: Page) {
  const suffix = crypto.randomBytes(6).toString('hex');
  await page.context().setExtraHTTPHeaders({
    'X-Forwarded-For': `2001:db8:${suffix.slice(0, 4)}:${suffix.slice(4, 6)}00::${suffix.slice(6, 10)}:${suffix.slice(10, 12)}00`,
  });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill('hima.demo@example.test');
  await page.getByLabel('Kata Sandi').fill('password123');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page).toHaveURL(/\/hima\/dashboard$/);
}

test('QA-011 daftar anggota tetap paginasi dan merespons dengan 500 data tambahan', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium',
    'Seed performa MySQL dijalankan sekali pada Chromium desktop',
  );
  test.setTimeout(90_000);

  loadDatabaseUrl();
  const { PrismaClient } = await import('../backend/src/generated/prisma/index.js');
  const prisma = new PrismaClient();
  const tenant = await prisma.tenants.findUniqueOrThrow({
    where: { code: 'HIMA-TBN-DEMO' },
    select: { id: true },
  });
  const runId = crypto.randomBytes(5).toString('hex').toUpperCase();
  const studentPrefix = `Q11${runId}`;

  try {
    await prisma.members.createMany({
      data: Array.from({ length: 500 }, (_, index) => {
        const serial = String(index + 1).padStart(4, '0');
        return {
          tenant_id: tenant.id,
          student_number: `${studentPrefix}${serial}`,
          full_name: `Perf QA-011 ${runId} ${serial}`,
          cohort_year: 2024,
        };
      }),
    });

    await login(page);
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/v1/members?') && response.status() === 200,
    );
    const startedAt = Date.now();
    await page.goto('/portal/anggota');
    const response = await responsePromise;
    const elapsedMs = Date.now() - startedAt;
    const result = await response.json();

    expect(response.status()).toBe(200);
    expect(result.data).toHaveLength(10);
    expect(result.meta.total).toBeGreaterThanOrEqual(500);
    expect(result.meta.totalPages).toBeGreaterThanOrEqual(50);
    expect(elapsedMs).toBeLessThan(5_000);
    await expect(page.getByRole('button', { name: 'Halaman berikutnya' })).toBeVisible();
  } finally {
    await prisma.members.deleteMany({
      where: { tenant_id: tenant.id, student_number: { startsWith: studentPrefix } },
    });
    await prisma.$disconnect();
    await page
      .context()
      .clearCookies()
      .catch(() => undefined);
  }
});
