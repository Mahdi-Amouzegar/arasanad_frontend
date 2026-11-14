// ═══════════════════════════════════════════════════════════════════════════
// postbuild.mjs — بررسی و تکمیل خروجی استاتیک
//
// پس از `next build` اجرا می‌شود و:
//   ۱. اطمینان از وجود .nojekyll (بدون آن GitHub Pages پوشه‌ی _next را نادیده می‌گیرد)
//   ۲. جلوگیری از انتشار فایل‌های داخلی (*.md و پوشههای ممنوع)
//   ۳. بررسی مسیر داراییها و manifest/favicon
//   ۴. بررسی اینکه هیچ پیشوند قدیمی /arasanad_frontend/ و هیچ آدرس
//      قدیمی workers.dev / github.io در خروجی نمانده باشد
//   ۵. تولید sitemap.xml و robots.txt با مبدأ دامنه‌ی اختصاصی
//   ۶. پایش نیمفاصله (U+200C) در HTML و JS خروجی (استاندارد ۸٫۶)
//
// ⚠️ دامنه‌ی اختصاصی `https://arasanad.ir` از ریشه سرو می‌شود، پس BASE_PATH
//    خالی است. گارد زیر عمداً سختگیر است تا خطای 404 منابع یا تزریق
//    Repository Variable قدیمی، بیلد را بیصدا عبور نکند.
// ═══════════════════════════════════════════════════════════════════════════

import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const OUT_DIR = 'out';
const SITE_URL = 'https://arasanad.ir';
const BASE_PATH = '';

/** فقط صفحات عمومی و ایندکسپذیر؛ `/panel` و `/admin` و `/dev` عمداً حذف شدهاند. */
const ROUTES = [
  '/',
  '/services/',
  '/pricing/',
  '/portfolio/',
  '/faq/',
  '/start/',
  '/about/',
  '/contact/',
  '/login/',
  '/profile/',
  '/terms/',
  '/privacy/',
];

/** الگوهایی که نباید در خروجی نهایی باشند. */
const FORBIDDEN = [
  { test: (p) => p.endsWith('.md'), label: 'فایل Markdown' },
  { test: (p) => p.split(sep).includes('docs'), label: 'پوشه‌ی docs' },
  { test: (p) => p.split(sep).includes('_legacy'), label: 'پوشه‌ی _legacy' },
  { test: (p) => p.split(sep).includes('backup'), label: 'پوشه‌ی backup' },
];

/** رشتههای ممنوع در خروجی متنی — نشانه‌ی استقرار نادرست یا تنظیم قدیمی. */
const LEGACY_STRINGS = [
  { needle: '/arasanad_frontend/', label: 'پیشوند قدیمی basePath' },
  { needle: 'arasanad-api.arasanad-for-type.workers.dev', label: 'آدرس قدیمی Worker (workers.dev)' },
  { needle: 'mahdi-amouzegar.github.io', label: 'مبدأ قدیمی GitHub Pages' },
];

const TEXT_EXTENSIONS = new Set(['.html', '.js', '.css', '.json', '.xml', '.txt', '.webmanifest']);

const failures = [];

/** پیمایش بازگشتی مسیرها. */
async function walk(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      acc.push(full + sep);
      await walk(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

// ─── ۱. بررسی وجود خروجی ───
if (!(await exists(OUT_DIR))) {
  console.error(`[postbuild] ✗ پوشه‌ی ${OUT_DIR} وجود ندارد. آیا next build اجرا شد؟`);
  process.exit(1);
}
if (!(await exists(join(OUT_DIR, 'index.html')))) {
  failures.push('out/index.html ساخته نشده است');
}

// ─── ۲. جلوگیری از انتشار فایل‌های داخلی ───
const files = await walk(OUT_DIR);
for (const file of files) {
  const rel = relative(OUT_DIR, file);
  for (const rule of FORBIDDEN) {
    if (rule.test(rel)) {
      failures.push(`${rule.label} در خروجی پیدا شد: ${rel}`);
    }
  }
}

// ─── ۳. اطمینان از .nojekyll ───
const nojekyll = join(OUT_DIR, '.nojekyll');
if (!(await exists(nojekyll))) {
  await writeFile(nojekyll, '', 'utf8');
  console.log('[postbuild] .nojekyll ساخته شد');
}

// ─── ۴. بررسی مسیر داراییها ───
const homeHtml = await readFile(join(OUT_DIR, 'index.html'), 'utf8');
const assetPrefix = `${BASE_PATH}/_next/`; // '/_next/'

if (!homeHtml.includes(assetPrefix)) {
  failures.push(
    `مسیر داراییها در out/index.html شامل "${assetPrefix}" نیست؛ خروجی از ریشه ساخته نشده است`,
  );
}
if (BASE_PATH && homeHtml.includes(`${BASE_PATH}${BASE_PATH}`)) {
  failures.push('basePath دو بار اعمال شده است (مسیر تکراری در HTML)');
}

// ⚠️ Next مسیر basePath را برای metadata (manifest و icons) اعمال نمی‌کند؛
//    `asset()` در layout مسئول ساخت آنهاست.
for (const required of ['manifest.webmanifest', 'favicon.svg']) {
  if (!homeHtml.includes(`${BASE_PATH}/${required}`)) {
    failures.push(`مسیر ${required} نادرست است (باید با asset() ساخته شود)`);
  }
}

// ─── ۵. تولید sitemap.xml ───
const today = new Date().toISOString().slice(0, 10);
const urls = ROUTES.map((route) => {
  const loc = `${SITE_URL}${BASE_PATH}${route}`;
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`;
}).join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
await writeFile(join(OUT_DIR, 'sitemap.xml'), sitemap, 'utf8');

// ─── ۶. robots.txt ───
// دامنه‌ی اختصاصی از ریشه سرو می‌شود، پس robots.txt و sitemap در جای درستاند.
const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}${BASE_PATH}/sitemap.xml
`;
await writeFile(join(OUT_DIR, 'robots.txt'), robots, 'utf8');

// ─── ۷. پویش تمام فایل‌های متنی برای رشتههای قدیمی ───
const outputFiles = await walk(OUT_DIR);
const legacyHits = new Map();
for (const file of outputFiles) {
  if (!TEXT_EXTENSIONS.has(extname(file))) continue;
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    continue;
  }
  for (const rule of LEGACY_STRINGS) {
    if (text.includes(rule.needle)) {
      const rel = relative(OUT_DIR, file);
      if (!legacyHits.has(rule.label)) legacyHits.set(rule.label, []);
      legacyHits.get(rule.label).push(rel);
    }
  }
}

for (const [label, paths] of legacyHits) {
  const preview = paths.slice(0, 3).join(', ');
  failures.push(
    `${label} در ${paths.length} فایل خروجی باقی مانده است (${preview}). ` +
      `اگر مربوط به API است، نشانی قدیمی از طریق NEXT_PUBLIC_API_BASE_URL در محیط بیلد تزریق شده؛ آنرا حذف یا اصلاح کنید.`,
  );
}

// ─── ۸. پایش نیمفاصله در خروجی بیلد ───
// استاندارد نگارش فارسی (بخش ۸٫۶): U+200C بخشی از متن است و نباید در
// HTML یا JS نهایی حذف شود. این گارد صرفاً خواندنی است (read-only).
const ZWNJ = '\u200C';
let zwnjHtml = 0;
let zwnjJs = 0;
for (const file of outputFiles) {
  const ext = extname(file);
  if (ext !== '.html' && ext !== '.js') continue;
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    continue;
  }
  const count = text.split(ZWNJ).length - 1;
  if (ext === '.html') zwnjHtml += count;
  else zwnjJs += count;
}
if (zwnjHtml === 0) {
  failures.push(
    'هیچ نیمفاصله (U+200C) در HTML خروجی یافت نشد؛ ابزار بیلد نیمفاصله را حذف کرده است',
  );
}
if (zwnjHtml + zwnjJs === 0) {
  failures.push('نیمفاصله (U+200C) کاملاً از خروجی بیلد حذف شده است');
}

// ─── نتیجه ───
if (failures.length > 0) {
  console.error('\n[postbuild] ✗ بررسی خروجی شکست خورد:\n');
  for (const f of failures) console.error(`  - ${f}`);
  console.error('');
  process.exit(1);
}

const pages = files.filter((f) => f.endsWith('.html')).length;
const assets = files.filter((f) => !f.endsWith('.html') && !f.endsWith(sep)).length;

console.log('\n[postbuild] ✓ خروجی استاتیک سالم است');
console.log(`  صفحه‌های HTML : ${pages}`);
console.log(`  داراییها      : ${assets}`);
console.log(`  مسیر پایه     : ${BASE_PATH || '/ (ریشه‌ی دامنه)'}`);
console.log(`  مبدأ          : ${SITE_URL}`);
console.log(`  sitemap       : ${ROUTES.length} مسیر`);
console.log('  .nojekyll     : موجود');
console.log(`  نیمفاصله    : HTML ${zwnjHtml} / JS ${zwnjJs}`);
console.log('  رشته‌ی قدیمی  : هیچ');
console.log('  فایل داخلی    : هیچ\n');
