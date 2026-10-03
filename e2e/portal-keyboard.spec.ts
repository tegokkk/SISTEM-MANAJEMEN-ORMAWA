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

async function unnamedControls(page: Page) {
  return page
    .locator(
      'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="link"]',
    )
    .evaluateAll((elements) => {
      const textOf = (element: Element) => element.textContent?.trim() ?? '';
      return elements.flatMap((element) => {
        if (!(element instanceof HTMLElement) || element.getClientRects().length === 0) return [];
        const labelledBy = element
          .getAttribute('aria-labelledby')
          ?.split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ');
        const labels =
          'labels' in element && element.labels
            ? Array.from(element.labels).map(textOf).join(' ')
            : '';
        const imageAlt = element.querySelector('img')?.getAttribute('alt') ?? '';
        const tagName = element.tagName.toLowerCase();
        const isTextControl = ['input', 'select', 'textarea'].includes(tagName);
        const accessibleName = [
          element.getAttribute('aria-label'),
          labelledBy,
          labels,
          element.getAttribute('title'),
          isTextControl ? '' : textOf(element),
          imageAlt,
          tagName === 'input' &&
          ['button', 'submit', 'reset', 'image'].includes((element as HTMLInputElement).type)
            ? element.getAttribute('value')
            : '',
        ].find((value) => value?.trim());
        return accessibleName
          ? []
          : [`${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`];
      });
    });
}

for (const actor of actors) {
  test(`QA-010 kontrol keyboard dan struktur semantik dasar ${actor.name}`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Navigasi keyboard perangkat keras dijalankan sekali pada Chromium desktop',
    );

    await login(page, actor.email);
    await expect(page).toHaveURL(new RegExp(`${actor.dashboard.replaceAll('/', '\\/')}$`));

    for (const route of actor.pages) {
      await page.goto(route);
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect
        .poll(() => unnamedControls(page), {
          message: `Kontrol tanpa nama aksesibel pada ${route}`,
        })
        .toEqual([]);
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
      await expect
        .poll(() => focused.evaluate((element) => element.matches(':focus-visible')))
        .toBe(true);
    }
  });
}
