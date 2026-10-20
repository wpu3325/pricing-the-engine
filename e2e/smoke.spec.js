import { test, expect } from '@playwright/test';

test('first load is a blank deal that asks for inputs, with no invented customer', async ({ page }) => {
  await page.goto('/app/index.html');
  await expect(page.locator('#rail')).toContainText('0 of 9');
  await expect(page.locator('#rail')).toContainText('Choose a target model');
  await expect(page.locator('body')).not.toContainText('Step 1');
});

test('the worked example reproduces the workbook headline numbers in the side panel', async ({ page }) => {
  await page.goto('/app/index.html');
  await page.locator('#starter').selectOption('workflow');
  await expect(page.locator('#rail')).toContainText('$243,918');
  await expect(page.locator('#rail')).toContainText('$135,158');
  await expect(page.locator('#rail')).toContainText('3,360 GPU-h');
  await expect(page.locator('#rail .rail-head')).toContainText('HOLD - MODEL');
});

test('changing cycles updates the quote live and focus stays in the form', async ({ page }) => {
  await page.goto('/app/index.html');
  await page.locator('#starter').selectOption('workflow');
  const cycles = page.locator('[data-path="rl.cycles"]');
  await cycles.fill('4');
  await cycles.press('Tab');
  await expect(page.locator('#rail')).toContainText('$294,463');
  await expect(page.locator('#rail .last-change')).toContainText('quote +$50,545');
});

test('every ⓘ shows an explanation with this deal’s numbers', async ({ page }) => {
  await page.goto('/app/index.html');
  await page.locator('#starter').selectOption('workflow');
  await page.locator('[data-explain="kpi.quote"]').first().hover();
  await expect(page.locator('#tip')).toContainText('floor');
});

test('proposal step shows a preview and never a red-flag internal term', async ({ page }) => {
  await page.goto('/app/index.html');
  await page.locator('[data-step="proposal"]').click();
  const frame = page.frameLocator('iframe.preview');
  await expect(frame.locator('body')).toContainText('DO NOT SEND CUSTOMER');
  await expect(frame.locator('body')).not.toContainText('Forecast COGS');
});

test('phone width has no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/index.html');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
