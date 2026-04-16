import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envValue = (process.env.API_URL || '').trim().replace(/\/+$/, '');

if (!envValue) {
  console.error('Falta la variable API_URL para generar environment.prod.ts');
  process.exit(1);
}

const looksValid = /^https?:\/\/.+/i.test(envValue);
if (!looksValid) {
  console.error(`API_URL invalida: ${envValue}`);
  process.exit(1);
}

const templatePath = resolve('src/environment.prod.template.ts');
const targetPath = resolve('src/environment.prod.ts');
const source = readFileSync(templatePath, 'utf8');
const next = source.replace('__API_URL__', envValue);

writeFileSync(targetPath, next, 'utf8');
console.log(`API_URL configurada para build: ${envValue}`);
