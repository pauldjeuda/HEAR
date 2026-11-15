import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const androidRoot = resolve(projectRoot, 'android');
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf8'));
const windows = process.platform === 'win32';
const versionParts = packageJson.version.match(/^(\d+)\.(\d+)\.(\d+)$/);

if (!versionParts) {
  throw new Error(`La version ${packageJson.version} doit respecter MAJEUR.MINEUR.CORRECTIF.`);
}

const [, majorText, minorText, patchText] = versionParts;
const [major, minor, patch] = [majorText, minorText, patchText].map(Number);
if (
  minor >= 1000 ||
  patch >= 1000 ||
  major * 1_000_000 + minor * 1000 + patch + 1 > 2_147_483_647
) {
  throw new Error(
    `La version ${packageJson.version} ne tient pas dans un versionCode Android valide.`,
  );
}
const versionCode = major * 1_000_000 + minor * 1000 + patch + 1;

function run(command, args, cwd = projectRoot) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    shell: windows,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`La commande ${command} s’est terminée avec le code ${result.status}.`);
  }
}

try {
  console.log('1/4 — Build web de production');
  run(windows ? 'npm.cmd' : 'npm', ['run', 'build', '--', '--configuration', 'production']);

  console.log('2/4 — Synchronisation Capacitor Android');
  run(windows ? 'npx.cmd' : 'npx', ['cap', 'sync', 'android']);

  console.log('3/4 — Assemblage APK debug installable');
  run(
    windows ? 'gradlew.bat' : 'bash',
    [
      ...(windows ? [] : ['gradlew']),
      '--no-daemon',
      '--build-cache',
      '--parallel',
      `-PhearVersion=${packageJson.version}`,
      `-PhearVersionCode=${versionCode}`,
      'assembleDebug',
    ],
    androidRoot,
  );

  const sourcePath = resolve(androidRoot, 'app/build/outputs/apk/debug/app-debug.apk');
  const sourceStats = await stat(sourcePath);
  if (!sourceStats.isFile() || sourceStats.size === 0) {
    throw new Error(`APK absent ou vide : ${sourcePath}`);
  }

  const releaseDir = resolve(projectRoot, 'release');
  const targetPath = resolve(releaseDir, `hear-${packageJson.version}-debug.apk`);
  await mkdir(releaseDir, { recursive: true });
  await copyFile(sourcePath, targetPath);

  console.log('4/4 — APK prêt');
  console.log(`${targetPath} (${(sourceStats.size / 1024 / 1024).toFixed(2)} MiB)`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
