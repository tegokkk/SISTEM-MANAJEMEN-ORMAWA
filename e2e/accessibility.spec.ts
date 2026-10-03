import { expect, test } from '@playwright/test';

test('public pages fit the viewport and login is keyboard accessible', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const portal = page.getByRole('link', { name: /Masuk Portal/i }).first();
  await portal.focus();
  await expect(portal).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const email = page.getByRole('textbox', { name: 'Email' });
  await email.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Kata Sandi')).toBeFocused();
});

test('primary login action has readable text contrast', async ({ page }) => {
  await page.goto('/login');
  const ratio = await page.getByRole('button', { name: 'Masuk' }).evaluate((element) => {
    const parse = (color: string) =>
      color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number);
    const luminance = (rgb: number[]) => {
      const linear = rgb.map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const style = getComputedStyle(element);
    const foreground = luminance(parse(style.color));
    const background = luminance(parse(style.backgroundColor));
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
});

test('public and authentication pages remain responsive with semantic headings', async ({
  page,
}) => {
  for (const route of ['/', '/login', '/daftar', '/lupa-password', '/reset-password']) {
    await page.goto(route);
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
});

test('password recovery flow is keyboard reachable and exposes labeled controls', async ({
  page,
}) => {
  await page.goto('/login');
  const forgotLink = page.getByRole('link', { name: 'Lupa kata sandi?' });
  await forgotLink.focus();
  await expect(forgotLink).toBeFocused();
  await Promise.all([
    page.waitForURL(/\/lupa-password$/),
    forgotLink.press('Enter'),
  ]);

  const email = page.getByRole('textbox', { name: 'Email' });
  await email.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Kirim instruksi reset' })).toBeFocused();

  await page.goto('/reset-password');
  await expect(page.getByText(/Token reset tidak ditemukan/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Simpan kata sandi' })).toBeDisabled();
});
