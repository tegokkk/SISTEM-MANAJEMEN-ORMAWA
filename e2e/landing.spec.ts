import { expect, test } from '@playwright/test';

test('landing page exposes the portal and organization directory', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kelola organisasi');
  await expect(page.getByRole('link', { name: /Masuk Portal/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Temukan organisasi mahasiswa/i })).toBeVisible();
});

test('portal button navigates to login', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Masuk Portal/i }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /Selamat Datang/i })).toBeVisible();
});
