/**
 * رگرسیون پیکربندی دامنهی اختصاصی.
 *
 * ⚠️ هدف: جلوگیری از بازگشت خاموش خطای 404 منابع (basePath قدیمی) یا
 *    ارجاع به آدرس قدیمی Worker. بدون باندلر و بدون jsdom اجرا میشود.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('Next.js دیگر basePath تعریف نمیکند و خروجی استاتیک است', () => {
  const next = read('next.config.mjs');
  assert.match(next, /output:\s*'export'/);
  assert.match(next, /trailingSlash:\s*true/);
  assert.doesNotMatch(next, /^\s*basePath\s*:/m);
  assert.doesNotMatch(next, /assetPrefix\s*:/);
});

test('مرجع واحد نشانیها، دامنهی اختصاصی و API را درست میدهد', () => {
  const config = read('src/lib/config.ts');
  assert.match(config, /BASE_PATH\s*=\s*''/);
  assert.match(config, /SITE_ORIGIN\s*=\s*'https:\/\/arasanad\.ir'/);
  assert.match(config, /DEFAULT_API_BASE_URL\s*=\s*'https:\/\/api\.arasanad\.ir\/api\/v1'/);
});

test('api.ts آدرس پیشفرض را از config میگیرد، نه workers.dev', () => {
  const api = read('src/lib/api.ts');
  assert.match(api, /import\s*\{ DEFAULT_API_BASE_URL \}\s*from\s*'\.\/config'/);
  assert.match(api, /const DEFAULT_BASE = DEFAULT_API_BASE_URL;/);

  // فقط کد اجرایی بررسی میشود؛ اشارهی توضیحی به `workers.dev` در کامنت مجاز است.
  // نگاهبانی `[^:]` جلوی برداشتن `//` درون `https://` را میگیرد.
  const code = api
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  assert.doesNotMatch(code, /workers\.dev/);
  assert.doesNotMatch(code, /https:\/\/api\.arasanad\.ir/);
});

test('manifest و service worker از ریشه استفاده میکنند', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.equal(manifest.start_url, '/');
  assert.equal(manifest.scope, '/');
  for (const icon of manifest.icons) assert.ok(icon.src.startsWith('/icons/'));

  const sw = read('public/sw.js');
  assert.match(sw, /const BASE\s*=\s*''/);
  assert.doesNotMatch(sw, /arasanad_frontend/);
});

test('نمونهی متغیر محیطی به API دامنهی اختصاصی اشاره میکند', () => {
  assert.match(
    read('.env.example'),
    /NEXT_PUBLIC_API_BASE_URL=https:\/\/api\.arasanad\.ir\/api\/v1/,
  );
});

test('ورکفلوی استقرار، نشانی API را از متغیر پنهان مخزن نمیگیرد', () => {
  const workflow = read('.github/workflows/deploy.yml');
  assert.match(workflow, /npm run build/);
  // تزریق متغیر قدیمی و غیرقابلمشاهدهی مخزن، بیلد production را بیصدا خراب میکند.
  assert.doesNotMatch(workflow, /vars\.NEXT_PUBLIC_API_BASE_URL/);
});

test('هیچ ارجاع قدیمی در src/ و public/ باقی نمانده است', () => {
  const LEGACY = ['/arasanad_frontend/', 'arasanad-api.arasanad-for-type.workers.dev', 'mahdi-amouzegar.github.io'];
  const offenders = [];

  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx|mjs|js|json|webmanifest|css)$/.test(entry.name)) continue;
      let text;
      try {
        text = readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      for (const needle of LEGACY) {
        if (text.includes(needle)) offenders.push(`${full}: ${needle}`);
      }
    }
  }

  walk(join(ROOT, 'src'));
  walk(join(ROOT, 'public'));
  assert.deepEqual(offenders, []);
});
