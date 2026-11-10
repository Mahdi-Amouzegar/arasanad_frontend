// ═══════════════════════════════════════════════════════════════════════════
// postbuild.mjs — بررسی و تکمیل خروجی استاتیک
//
// این اسکریپت پس از `next build` اجرا می‌شود و سه کار انجام می‌دهد:
//   ۱. اطمینان از وجود .nojekyll (بدون آن، GitHub Pages پوشه‌ی _next را نادیده می‌گیرد)
//   ۲. تولید sitemap.xml با آدرس‌های کامل
//   ۳. جلوگیری از انتشار فایل‌های داخلی (هر *.md یا پوشه‌ی docs / _legacy)
//
// اگر یکی از بررسی‌ها شکست بخورد، فرآیند Build با خطا متوقف می‌شود.
// ═══════════════════════════════════════════════════════════════════════════

import { access, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const OUT_DIR = 'out';
const SITE_URL = 'https://mahdi-amouzegar.github.io';
const BASE_PATH = '/arasanad_frontend';

/** مسیرهای عمومی سایت. با افزودن صفحه‌ی جدید، اینجا اضافه شود. */
const ROUTES = [
  '/',
  '/pricing/',
  '/portfolio/',
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

// ─── ۴. بررسی مسیر پایه در HTML ───
const homeHtml = await readFile(join(OUT_DIR, 'index.html'), 'utf8');
if (!homeHtml.includes(`${BASE_PATH}/_next/`)) {
  failures.push(
    `مسیر دارایی‌ها در out/index.html شامل "${BASE_PATH}/_next/" نیست؛ basePath درست اعمال نشده است`
  );
}
if (homeHtml.includes(`${BASE_PATH}${BASE_PATH}`)) {
  failures.push('basePath دو بار اعمال شده است (مسیر تکراری در HTML)');
}

// ⚠️ Next مسیر basePath را برای metadata (manifest و icons) اعمال نمی‌کند.
//    بدون این بررسی، آدرس‌ها بی‌صدا ۴۰۴ می‌دهند.
for (const required of ['manifest.webmanifest', 'favicon.svg']) {
  if (!homeHtml.includes(`${BASE_PATH}/${required}`)) {
    failures.push(`مسیر ${required} بدون basePath است (باید با asset() ساخته شود)`);
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
// ⚠️ روی GitHub Pages با Project Site، robots.txt در ریشه‌ی دامنه قابل سرو نیست
//    و فقط زیر مسیر مخزن در دسترس است. تا اتصال دامنه‌ی اختصاصی، اثر محدودی دارد.
const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}${BASE_PATH}/sitemap.xml
`;
await writeFile(join(OUT_DIR, 'robots.txt'), robots, 'utf8');

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
console.log(`  دارایی‌ها      : ${assets}`);
console.log(`  مسیر پایه     : ${BASE_PATH}`);
console.log(`  sitemap       : ${ROUTES.length} مسیر`);
console.log('  .nojekyll     : موجود');
console.log('  فایل داخلی    : هیچ\n');
