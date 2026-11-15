import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const paper = [250, 249, 246];
const ink = [26, 28, 26];
const groove = [68, 71, 72];
const red = [184, 17, 32];

function recordColor(x, y, width, height, transparent) {
  const size = Math.min(width, height);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = size * (transparent ? 0.34 : 0.37);
  const distance = Math.hypot(x - centerX, y - centerY);
  if (distance > radius) return transparent ? [0, 0, 0, 0] : [...paper, 255];

  const line = Math.max(0.8, size * 0.0045);
  if (Math.abs(distance - radius * 0.77) < line || Math.abs(distance - radius * 0.55) < line) {
    return [...groove, 255];
  }
  if (distance < radius * 0.075) return [...paper, 255];
  if (distance < radius * 0.36) return [...red, 255];
  return [...ink, 255];
}

function pixel(x, y, width, height, background) {
  const count = 4;
  const channels = [0, 0, 0, 0];
  for (let sy = 0; sy < count; sy += 1) {
    for (let sx = 0; sx < count; sx += 1) {
      const sampleX = x + (sx + 0.5) / count;
      const sampleY = y + (sy + 0.5) / count;
      const color = recordColor(sampleX, sampleY, width, height, background === 'transparent');
      for (let channel = 0; channel < 4; channel += 1) channels[channel] += color[channel];
    }
  }
  return channels.map((channel) => Math.round(channel / (count * count)));
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let value = n;
  for (let k = 0; k < 8; k += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[n] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const body = Buffer.concat([name, data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(width, height, background = 'paper') {
  const colorType = background === 'transparent' ? 6 : 2;
  const components = colorType === 6 ? 4 : 3;
  const rows = Buffer.alloc((width * components + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    rows[offset++] = 0;
    for (let x = 0; x < width; x += 1) {
      const rgba = pixel(x, y, width, height, background);
      for (let channel = 0; channel < components; channel += 1) rows[offset++] = rgba[channel];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = colorType;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function save(relativePath, width, height, background) {
  const path = resolve(root, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, png(width, height, background));
}

for (const [folder, size] of Object.entries({
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
})) {
  await save(`android/app/src/main/res/${folder}/ic_launcher.png`, size, size, 'paper');
  await save(`android/app/src/main/res/${folder}/ic_launcher_round.png`, size, size, 'paper');
}

for (const [folder, size] of Object.entries({
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
})) {
  await save(
    `android/app/src/main/res/${folder}/ic_launcher_foreground.png`,
    size,
    size,
    'transparent',
  );
}
