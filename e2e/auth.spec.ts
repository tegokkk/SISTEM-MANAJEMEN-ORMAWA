import crypto from 'node:crypto';
import { expect, test } from '@playwright/test';

const ipRunId = crypto.randomBytes(6).toString('hex');
const actorIp = (actorNumber: number) =>
  `2001:db8:5:${actorNumber}::${ipRunId.slice(0, 4)}:${ipRunId.slice(4, 8)}:${ipRunId.slice(8)}`;

const actors = [
  {
    name: 'Super Admin',
    email: 'admin@polinela.ac.id',
    destination: '/admin/dashboard',
    heading: 'Dashboard Super Admin',
    e2eIp: actorIp(1),
  },
  {
    name: 'Admin ORMAWA',
    email: 'bem@polinela.ac.id',
    destination: '/ormawa/dashboard',
    heading: 'Dashboard BEM Polinela',
    e2eIp: actorIp(2),
  },
  {
    name: 'Admin HMJ',
    email: 'hmjpangan@polinela.ac.id',
    destination: '/hmj/dashboard',
    heading: 'Dashboard HMJ Budidaya Tanaman Pangan',
    e2eIp: actorIp(3),
  },
  {
    name: 'Admin HIMA',
    email: 'hima.demo@example.test',
    destination: '/hima/dashboard',
    heading: 'Dashboard HIMA Teknologi Perbenihan (Demo)',
    e2eIp: actorIp(4),
  },
] as const;

test.describe('QA-005 login seluruh aktor', () => {
  test.describe.configure({ mode: 'serial' });

  for (const actor of actors) {
    test(`${actor.name} masuk ke dashboard yang sesuai`, async ({ page }, testInfo) => {
      test.skip(
        testInfo.project.name !== 'chromium',
        'Login seluruh aktor cukup dijalankan sekali pada Chromium desktop',
      );

      await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': actor.e2eIp });
      await page.goto('/login');
      await page.getByRole('textbox', { name: 'Email' }).fill(actor.email);
      await page.getByLabel('Kata Sandi').fill('password123');
      await page.getByRole('button', { name: 'Masuk' }).click();

      await expect(page).toHaveURL(new RegExp(`${actor.destination.replaceAll('/', '\\/')}$`));
      await expect(page.getByRole('heading', { level: 1, name: actor.heading })).toBeVisible();
      await expect(page.getByText(actor.email)).toBeVisible();
    });
  }
});
