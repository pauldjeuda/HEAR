import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const checkedRoots = ['src', 'public'];
const checkedFiles = ['capacitor.config.ts', 'package.json'];
const textExtensions = new Set(['.html', '.ts', '.scss', '.css', '.svg', '.json', '.js', '.cjs']);
const forbidden = [
  ['Tailwind CDN', /cdn\.tailwindcss\.com/i],
  ['Google Fonts host', /fonts\.googleapis\.com/i],
  ['Google Fonts asset host', /fonts\.gstatic\.com/i],
  ['Google-hosted cover image', /lh3\.googleusercontent\.com/i],
  ['Unsupported lossless claim', /FLAC\s+24/i],
  ['Unsupported mastering claim', /BIT\s*-?\s*PERFECT/i],
  ['Unsupported distortion claim', /\bTHD\b/i],
  ['Unsupported format claim', /\bDSD\b/i],
  ['Invented monthly audience', /AUDITEURS\s+MENSUELS/i],
  ['Invented edition numbering', /ÉDITION\s+01\/500/i],
  ['Invented serial numbering', /042\/500/i],
  ['Invented product hardware label', /HEAR-DAC/i],
  ['Invented storage slot count', /5\/12\s+SLOTS/i],
  ['Browser vibration outside the haptics service', /navigator\.vibrate\s*\(/i],
  ['User state stored in localStorage', /\blocalStorage\b/i],
];

const files = [...checkedFiles.map((file) => join(root, file))];

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
    } else if (entry.isFile() && textExtensions.has(extname(entry.name))) {
      files.push(path);
    }
  }
}

for (const directory of checkedRoots) {
  await visit(join(root, directory));
}

const violations = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  const label = relative(root, file).replaceAll('\\', '/');
  for (const [description, pattern] of forbidden) {
    if (pattern.test(content)) {
      if (
        description.startsWith('Browser vibration') &&
        label === 'src/app/core/system/haptics.service.ts'
      ) {
        continue;
      }
      violations.push(`${label}: ${description}`);
    }
  }
}

if (violations.length > 0) {
  process.stderr.write(
    `Vérification HEAR échouée :\n${violations.map((item) => `- ${item}`).join('\n')}\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(`Vérification HEAR réussie (${files.length} fichiers examinés).\n`);
}
