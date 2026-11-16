import { expect, test } from '@playwright/test';

function makeWaveFile(durationSeconds = 8): Buffer {
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

test('opens with no seeded songs and navigates every local-music screen', async ({ page }) => {
  const consoleErrors: string[] = [];
  const uncaughtErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => uncaughtErrors.push(error.message));

  await page.goto('/');
  await expect(page).toHaveTitle('Hear — musique personnelle');
  await expect(page.getByRole('img', { name: 'Hear' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'HEAR' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Votre collection commence ici.' })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
  await expect(navigation).toBeVisible();

  await navigation.getByRole('button', { name: 'RECHERCHE' }).click();
  await expect(page.getByRole('heading', { name: 'RECHERCHE' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Votre index est vide.' })).toBeVisible();
  await navigation.getByRole('button', { name: 'ARTISTES' }).click();
  await expect(page.getByRole('heading', { name: 'ARTISTES' })).toBeVisible();
  await navigation.getByRole('button', { name: 'BIBLIOTHÈQUE' }).click();
  await expect(page.getByRole('heading', { name: 'BIBLIOTHÈQUE' })).toBeVisible();

  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await expect(page.getByRole('heading', { name: 'Navigation' })).toBeVisible();
  await page.getByRole('button', { name: /HORS LIGNE/ }).click();
  await expect(page.getByRole('heading', { name: 'HORS LIGNE' })).toBeVisible();
  await page.getByRole('button', { name: 'Retour' }).click();
  await expect(page.getByRole('heading', { name: 'Navigation' })).toBeVisible();
  await page.getByRole('button', { name: /RÉGLAGES/ }).click();
  await expect(page.getByRole('heading', { name: 'RÉGLAGES' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Navigation' })).toBeVisible();
  await page.getByRole('button', { name: /ACCUEIL/ }).click();
  await expect(page.getByRole('heading', { name: 'HEAR' })).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(uncaughtErrors).toEqual([]);
});

test('scrolls the home page with the mouse wheel on a small viewport', async ({ page }) => {
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

test('indexes, searches, favorites, plays and keeps local audio in the browser preview', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'AJOUTER DES FICHIERS À L’APERÇU' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'Piste locale.wav',
    mimeType: 'audio/wav',
    buffer: makeWaveFile(),
  });

  const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
  await navigation.getByRole('button', { name: 'RECHERCHE' }).click();
  await page
    .getByRole('searchbox', { name: 'Rechercher dans la musique locale' })
    .fill('Piste locale');
  await expect(page.getByRole('button', { name: 'Lire Piste locale' })).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter Piste locale aux favoris' }).click();

  await navigation.getByRole('button', { name: 'BIBLIOTHÈQUE' }).click();
  await page.getByRole('tab', { name: /FAVORIS/ }).click();
  await expect(page.getByRole('button', { name: 'Lire Piste locale' })).toBeVisible();
  await page.getByRole('tab', { name: 'PLAYLISTS' }).click();
  await page.getByRole('button', { name: /NOUVELLE PLAYLIST/ }).click();
  await page.getByLabel('NOM DE LA PLAYLIST').fill('Mes écoutes');
  await page.getByRole('button', { name: 'CRÉER', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Playlist créée sur ce téléphone.');
  await expect(page.locator('.playlist-row').filter({ hasText: 'Mes écoutes' })).toBeVisible();

  await page.getByRole('tab', { name: 'TITRES' }).click();
  await page.getByRole('button', { name: 'Ajouter Piste locale à une playlist' }).click();
  await page.getByRole('button', { name: 'Mes écoutes', exact: true }).last().click();
  await page.getByRole('tab', { name: 'PLAYLISTS' }).click();
  await page.locator('.playlist-row').filter({ hasText: 'Mes écoutes' }).click();
  await expect(page.getByRole('button', { name: 'Lire Piste locale' })).toBeVisible();
  await page.getByRole('button', { name: 'Lire Piste locale' }).click();
  await expect(page.getByRole('heading', { name: 'Piste locale' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mettre en pause la lecture' })).toBeVisible();

  await page.reload();
  await page
    .getByRole('navigation', { name: 'Navigation principale' })
    .getByRole('button', { name: 'BIBLIOTHÈQUE' })
    .click();
  await expect(page.getByRole('button', { name: 'Lire Piste locale' })).toBeVisible();
  await page.getByRole('tab', { name: /FAVORIS/ }).click();
  await expect(page.getByRole('button', { name: 'Lire Piste locale' })).toBeVisible();
});

test('saves real local-library, display and playback settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('button', { name: /RÉGLAGES/ }).click();
  await expect(page.getByRole('heading', { name: 'RÉGLAGES' })).toBeVisible();

  const indexingSettings = page.getByRole('region', { name: 'INDEXATION AUDIO' });
  const autoScan = indexingSettings.getByRole('checkbox');
  await expect(autoScan).toBeChecked();
  await indexingSettings.locator('label.switch-control').click();
  await expect(autoScan).not.toBeChecked();
  await page.getByRole('button', { name: 'SOMBRE (VINYLE)' }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'vinyl');
  await page.getByRole('button', { name: 'UN TITRE' }).click();
  await expect(page.getByRole('button', { name: 'UN TITRE' })).toHaveClass(/is-selected/);

  await page.reload();
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
  await page.getByRole('button', { name: /RÉGLAGES/ }).click();
  await expect(
    page.getByRole('region', { name: 'INDEXATION AUDIO' }).getByRole('checkbox'),
  ).not.toBeChecked();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-theme', 'vinyl');
  await expect(page.getByRole('button', { name: 'UN TITRE' })).toHaveClass(/is-selected/);
});

test('displays waveform scrubber, opens lyrics screen and returns to player', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'AJOUTER DES FICHIERS À L’APERÇU' }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: 'Piste test.wav',
    mimeType: 'audio/wav',
    buffer: makeWaveFile(),
  });

  const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
  await navigation.getByRole('button', { name: 'BIBLIOTHÈQUE' }).click();
  await page.getByRole('button', { name: 'Lire Piste test' }).click();

  await expect(page.getByRole('heading', { name: 'Piste test' })).toBeVisible();
  const scrubber = page.locator('.waveform-scrubber');
  await expect(scrubber).toBeVisible();
  const bars = scrubber.locator('.waveform-bar');
  expect(await bars.count()).toBeGreaterThan(30);

  // Click on the lyrics button
  await page.getByRole('button', { name: 'Afficher les paroles' }).click();
  await expect(page.locator('.lyrics-screen')).toBeVisible();

  // Return to player
  await page.getByRole('button', { name: 'Retour au lecteur' }).click();
  await expect(page.getByRole('heading', { name: 'Piste test' })).toBeVisible();
});
