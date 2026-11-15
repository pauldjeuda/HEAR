import { expect, test } from '@playwright/test';

test('shows the French Hear foundation screen', async ({ page }) => {
  const consoleErrors: string[] = [];
  const uncaughtErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => uncaughtErrors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle('Hear — musique personnelle');
  await expect(page.getByRole('heading', { name: 'HEAR' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SOCLE TECHNIQUE' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'VÉRIFIER SQLITE' })).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(uncaughtErrors).toEqual([]);
});

test('creates the schema and reads back an SQLite value in the browser', async ({ page }) => {
  const consoleErrors: string[] = [];
  const uncaughtErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => uncaughtErrors.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'VÉRIFIER SQLITE' }).click();

  await expect(page.getByText('PRÊTE', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('status')).toContainText('Lecture et écriture SQLite vérifiées');
  expect(consoleErrors).toEqual([]);
  expect(uncaughtErrors).toEqual([]);
});
