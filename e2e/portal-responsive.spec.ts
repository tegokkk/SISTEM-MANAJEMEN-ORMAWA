import crypto from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';

const actors = [
  {
    name: 'Super Admin',
    email: 'admin@polinela.ac.id',
    dashboard: '/admin/dashboard',
    pages: ['/admin/dashboard', '/admin/tenant', '/admin/pengajuan-akun', '/admin/audit'],
  },
  {
    name: 'ORMAWA',
    email: 'bem@polinela.ac.id',
    dashboard: '/ormawa/dashboard',
    pages: [
      '/ormawa/dashboard',
      '/portal/anggota',
      '/portal/organisasi',
      '/portal/program-kerja',
      '/portal/kebutuhan',
      '/portal/pengajuan-dana',
      '/portal/keuangan',
      '/portal/inventaris',
      '/portal/notifikasi',
    ],
  },
  {
    name: 'HMJ',
    email: 'hmjpangan@polinela.ac.id',
    dashboard: '/hmj/dashboard',
    pages: [
      '/hmj/dashboard',
      '/hmj/review',
      '/portal/anggota',
      '/portal/organisasi',
      '/portal/program-kerja',
      '/portal/kebutuhan',
      '/portal/pengajuan-dana',
      '/portal/keuangan',
      '/portal/inventaris',
      '/portal/pesan',
      '/portal/notifikasi',
    ],
  },
  {
    name: 'HIMA',
    email: 'hima.demo@example.test',
    dashboard: '/hima/dashboard',
    pages: [
      '/hima/dashboard',
      '/portal/anggota',
      '/portal/organisasi',
      '/portal/program-kerja',
      '/portal/kebutuhan',
      '/portal/pengajuan-dana',
      '/portal/keuangan',
      '/portal/inventaris',
      '/portal/pesan',
      '/portal/notifikasi',
    ],
  },
] as const;

async function login(page: Page, email: string) {
  const suffix = crypto.randomBytes(6).toString('hex');
  await page.context().setExtraHTTPHeaders({
    'X-Forwarded-For': `2001:db8:${suffix.slice(0, 4)}:${suffix.slice(4, 6)}00::${suffix.slice(6, 10)}:${suffix.slice(10, 12)}00`,
  });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Kata Sandi').fill('password123');
  await page.getByRole('button', { name: 'Masuk' }).click();
}

for (const actor of actors) {
  test(`QA-009 halaman ${actor.name} tidak meluber secara horizontal`, async ({ page }) => {
    await login(page, actor.email);
    await expect(page).toHaveURL(new RegExp(`${actor.dashboard.replaceAll('/', '\\/')}$`));

    for (const route of actor.pages) {
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
              window.innerWidth,
          ),
        )
        .toBeLessThanOrEqual(0);
    }
  });
}
