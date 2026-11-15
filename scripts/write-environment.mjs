import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = process.cwd();
const envPath = resolve(projectRoot, '.env.local');
const generatedPath = resolve(projectRoot, 'src/environments/environment.local.ts');
let jamendoClientId = '';

if (existsSync(envPath)) {
  const envText = readFileSync(envPath, 'utf8');
  const match = envText.match(/^\s*JAMENDO_CLIENT_ID\s*=\s*(.*?)\s*$/m);
  if (match) {
    jamendoClientId = match[1].replace(
      /^(?:"(.*)"|'(.*)')$/,
      (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted,
    );
  }
}

const contents = `export const environment = ${JSON.stringify({ jamendoClientId }, null, 2)} as const;\n`;
writeFileSync(generatedPath, contents, 'utf8');
