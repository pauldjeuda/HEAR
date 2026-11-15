import { expect, test } from '@playwright/test';

function makeWaveFile(durationSeconds = 4): Buffer {
  const sampleRate = 8000;
  const sampleCount = sampleRate * durationSeconds;
  const dataSize = sampleCount;
  const wave = Buffer.alloc(44 + dataSize);
  wave.write('RIFF', 0);
  wave.writeUInt32LE(36 + dataSize, 4);
  wave.write('WAVE', 8);
  wave.write('fmt ', 12);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(sampleRate, 24);
  wave.writeUInt32LE(sampleRate, 28);
  wave.writeUInt16LE(1, 32);
  wave.writeUInt16LE(8, 34);
  wave.write('data', 36);
  wave.writeUInt32LE(dataSize, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    wave[44 + index] = 128 + Math.round(Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 24);
  }
  return wave;
}

test('opens the Hear home screen with its logo and usable navigation', async ({ page }) => {
  const consoleErrors: string[] = [];
  const uncaughtErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => uncaughtErrors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle('Hear — musique personnelle');
  await expect(page.getByRole('img', { name: 'Hear' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Votre musique, à vous.' })).toBeVisible();
  const mainNavigation = page.getByRole('navigation', { name: 'Navigation principale' });
  await expect(mainNavigation).toBeVisible();
  await mainNavigation.getByRole('button', { name: 'RECHERCHE' }).click();
  await expect(page.getByRole('heading', { name: 'Recherche' })).toBeVisible();
  await mainNavigation.getByRole('button', { name: 'COLLECTION' }).click();
  await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible();
  await page.getByRole('button', { name: /destinations secondaires/ }).click();
  await page.getByRole('button', { name: /Hors ligne/ }).click();
  await expect(page.getByRole('heading', { name: 'Hors ligne' })).toBeVisible();
  await page.getByRole('button', { name: /RETOUR/ }).click();
  await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible();
  await page.getByRole('button', { name: /destinations secondaires/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('navigation', { name: 'Menu' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(uncaughtErrors).toEqual([]);
});

test('creates a local playlist and verifies SQLite from settings', async ({ page }) => {
  const consoleErrors: string[] = [];
  const uncaughtErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => uncaughtErrors.push(error.message));

  await page.goto('/');
  const mainNavigation = page.getByRole('navigation', { name: 'Navigation principale' });
  await mainNavigation.getByRole('button', { name: 'COLLECTION' }).click();
  await page.getByRole('button', { name: 'CRÉER UNE PLAYLIST' }).click();
  await page.getByLabel('NOM DE LA PLAYLIST').fill('Mes écoutes');
  await page.getByRole('button', { name: 'CRÉER', exact: true }).click();
  await expect(page.getByText('Mes écoutes', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /destinations secondaires/ }).click();
  await page.getByRole('button', { name: /Réglages/ }).click();
  await page.getByRole('button', { name: /RETOUR/ }).click();
  await expect(page.getByRole('heading', { name: 'Collection' })).toBeVisible();
  await page.getByRole('button', { name: /destinations secondaires/ }).click();
  await page.getByRole('button', { name: /Réglages/ }).click();
  await page.getByRole('button', { name: 'VÉRIFIER SQLITE' }).click();
  await expect(page.getByText('PRÊTE', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText('Lecture et écriture SQLite vérifiées sur cet appareil.'),
  ).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(uncaughtErrors).toEqual([]);
});

test('scrolls the app content with the mouse wheel on a small viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');

  const screen = page.locator('.screen');
  const bounds = await screen.boundingBox();
  expect(bounds).not.toBeNull();
  const dimensions = await screen.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + bounds!.height / 2);
  await page.mouse.wheel(0, 450);
  await expect.poll(() => screen.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
});

test('imports and plays a phone audio file, then keeps it in the local library', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'IMPORTER MA MUSIQUE' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'Piste locale.wav',
    mimeType: 'audio/wav',
    buffer: makeWaveFile(),
  });

  const localTrack = page.getByText('Piste locale', { exact: true }).first();
  await expect(localTrack).toBeVisible();
  await page.getByRole('button', { name: 'Lire Piste locale' }).click();
  await expect(page.getByRole('region', { name: 'Lecteur audio local' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mettre en pause la lecture' })).toBeVisible();

  await page.reload();
  await mainNavigation.getByRole('button', { name: 'COLLECTION' }).click();
  await page.getByRole('tab', { name: 'Titres locaux' }).click();
  await expect(page.getByText('Piste locale', { exact: true })).toBeVisible();
});
