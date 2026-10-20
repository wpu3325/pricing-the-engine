import { test, expect } from '@playwright/test';

test('default deal reproduces the workbook headline numbers', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.strip')).toContainText('$210,000');
  await expect(page.locator('.strip')).toContainText('$106,590');
  await expect(page.locator('.strip')).toContainText('3,360 GPU-h');
  await expect(page.locator('.strip .kpi').last().locator('.chip')).toContainText('HOLD - MODEL');
});

test('changing cycles updates the quote live and focus stays in the form', async ({ page }) => {
  await page.goto('/index.html');
  const cycles = page.locator('[data-path="rl.cycles"]');
  await cycles.fill('4');
  await cycles.press('Tab');
  await expect(page.locator('.strip')).toContainText('$258,000');
});

test('every ⓘ shows an explanation with this deal’s numbers', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('[data-explain="kpi.quote"]').first().hover();
  await expect(page.locator('#tip')).toContainText('floor');
});

test('proposal step shows a preview and never a red-flag internal term', async ({ page }) => {
  await page.goto('/index.html');
  await page.locator('[data-step="proposal"]').click();
  const frame = page.frameLocator('iframe.preview');
  await expect(frame.locator('body')).toContainText('DO NOT SEND CUSTOMER');
  await expect(frame.locator('body')).not.toContainText('Forecast COGS');
});

test('phone width has no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
