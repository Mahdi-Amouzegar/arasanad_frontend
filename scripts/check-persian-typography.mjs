#!/usr/bin/env node
/**
 * اعتبارسنج نگارش فارسی — «فقط خواندنی» (read-only)
 *
 * هدف: شناسایی واژههایی که نیمفاصلهٔ لازم (U+200C) را ندارند، پیش از آنکه
 * وارد خروجی Build شوند. این ابزار هیچ فایل متنیای را نمی‌خواند و نمی‌نویسد؛
 * تنها پروندههای منبع را می‌خواند و نتیجه را چاپ می‌کند.
 *
 * خروجی: file:line:column | ERROR / WARN | قانون | واژه | پیشنهاد
 *   ERROR  → موارد قطعی (شکست تست/CI)
 *   WARN   → موارد مبهم (فقط هشدار، بیلد را متوقف نمی‌کند)
 *
 * گریز: هر خطی که شامل «fa-ignore» باشد از بررسی کنار گذاشته میشود
 *       (برای مثالهای عمداً نادرست در تست‌ها).
 *
 * گزینهها:
 *   --json             خروجی ماشینی (برای اسکریپتهای اصلاح و تست‌ها)
 *   --print-baseline   چاپ شمارش ZWNJ هر فایل (بدون نوشتن هیچ پرونده‌ای)
 *   --root=<dir>       پوشهٔ ریشهٔ سنجش (پیش‌فرض: پوشهٔ مخزن فرانت‌اند)
 *
 * قواعد بر پایهٔ ریختشناسی و «سازگاری با سبک موجود پروژه» هستند، نه یک
 * فهرست جایگزینی گسترده؛ بنابراین واژههای درست (تنها، دانشگاهی، بازگشت و…)
 * هرگز بهاشتباه اصلاح یا خطا گرفته نمی‌شوند.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ZWNJ = '\u200C';

// حروف فارسی/عربیِ مورد استفاده در متن پروژه. نشانههای سجاوندی عربی
// (U+060C «،»، U+061B «؛»، U+061F «؟») عمداً حذف شده‌اند تا واژهشکنی دقیق باشد.
const L = '\\u0621-\\u063A\\u0641-\\u064A\\u067E\\u0686\\u0698\\u06A9\\u06AF\\u06BE\\u06CC';
export const WORD_RE = new RegExp(
  `(?<![${L}\\w])[${L}](?:[${L}${ZWNJ}]*[${L}])?(?![${L}\\w])`,
  'gu',
);

// ───────────────────────── قواعد قطعی ─────────────────────────

// ۱. پیشوند فعلی «می» / «نمی» همیشه با نیمفاصله از ستاک فعل جدا می‌شود.
//    این فهرست، ستاکهای فعلی است (ریختشناسی)، نه فهرست عبارت یا جایگزینی متن.
export const VERB_STEMS = new Set([
  'شود', 'شوند', 'شویم', 'شوید', 'شوم', 'شوی', 'شد', 'شدند', 'شدیم', 'شدید',
  'تواند', 'توانند', 'توانیم', 'توانید', 'توانم', 'توانی',
  'کند', 'کنند', 'کنم', 'کنی', 'کنیم', 'کنید', 'کرد', 'کردند', 'کردیم', 'کردید',
  'رود', 'روند', 'روم', 'روی', 'رویم', 'روید', 'رفت', 'رفتند',
  'آید', 'آیند', 'آیم', 'آیی', 'آییم', 'آیید', 'آمد', 'آمدند',
  'دهد', 'دهند', 'دهم', 'دهی', 'دهیم', 'دهید', 'داد', 'دادند',
  'گیرد', 'گیرند', 'گیرم', 'گیری', 'گیریم', 'گیرید', 'گرفت', 'گرفتند',
  'باشد', 'باشند', 'باشم', 'باشی', 'باشیم', 'باشید', 'بود', 'بودند',
  'دانم', 'داند', 'دانیم', 'دانید', 'دانند', 'دانست',
  'بینم', 'بیند', 'بینیم', 'بینید', 'بینند', 'دید',
  'گذارد', 'گذارند', 'گذاریم', 'گذاشت',
  'خواهد', 'خواهند', 'خواهیم', 'خواهید', 'خواهم', 'خواست',
  'پردازد', 'پردازند', 'پرداخت', 'رسد', 'رسند', 'رسید',
  'نماید', 'نمایند', 'گردد', 'گردند', 'آورد', 'آورند',
  'سازد', 'سازند', 'ساخت', 'ساختند', 'فرستد', 'فرستند', 'فرستاد',
  'ماند', 'مانند', 'ریزد', 'ریزند', 'بندد', 'بندند', 'خواند', 'خوانند',
  'نویسد', 'نویسند', 'بردارد', 'بردارند', 'گرداند', 'گردانند',
]);

// ۲. حرف اضافهٔ «به» پیش از این واژههای دستوری، با نیمفاصله می‌آید.
//    واژههای تکواژ درست (بهداشت، بهینه، بهتر، بهار، به‌روز…) در فهرست نیستند.
export const BE_FOLLOWERS = new Set([
  'صورت', 'عنوان', 'طور', 'جای', 'جایگزین', 'دلیل', 'همراه', 'اندازه',
  'وسیله', 'کمک', 'شرط', 'منظور', 'قصد', 'نحوه', 'سرعت', 'دقت',
  'سادگی', 'راحتی', 'تدریج', 'خصوص', 'علاوه', 'صرفه', 'کارگیری',
  'اشتراک', 'یادگیری', 'همین', 'این', 'آن', 'ازای', 'ویژه', 'زودی',
]);

// ۳. واژگان تکواژِ درست که هرگز نباید خطا یا هشدار بگیرند.
//    «فهرست مجاز» است، نه فهرست جایگزینی؛ هیچ متنی با آن بازنویسی نمی‌شود.
export const SAFE_WORDS = new Set([
  'تنها', 'اینها', 'آنها', 'صدها', 'همه', 'دانشگاهی', 'دستگاهی',
  'همراهی', 'توجهی', 'گروهی', 'آماده', 'بیعانه', 'ناوبری', 'بازگشت',
  'همیشه', 'همراه', 'میلادی', 'ناموفق', 'نامشخص', 'همچنان', 'همچنین',
  'پیشوند', 'بیشتر', 'غیرفعال', 'بازیابی', 'بازنشانی', 'همخوان',
  'ناهمخوان', 'میانی', 'سرستون', 'سرصفحه', 'زیردرخت', 'همشکل',
  'سرویس', 'بازبینی', 'همگام', 'کاربری', 'دسترسی', 'دستگاه',
]);

const SCAN_EXT = new Set(['.ts', '.tsx', '.mjs', '.js', '.cjs', '.css', '.json', '.webmanifest', '.md', '.mts']);
const SKIP_DIRS = new Set([
  'node_modules', '.next', 'out', 'backup', '.git', '.test-build',
  '.wrangler', 'dry-run-out', '.deploy-cors', 'coverage', 'dist',
]);
const SCAN_ROOTS = ['src', 'public', 'tests', 'scripts'];

export function collectFiles(root) {
  const files = [];
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(p);
      } else if (SCAN_EXT.has(path.extname(e.name).toLowerCase())) {
        files.push(p);
      }
    }
  };
  for (const r of SCAN_ROOTS) walk(path.join(root, r));
  // پروندههای پیکربندی و راهنمای ریشهٔ مخزن
  for (const name of ['README.md', 'next.config.mjs', 'eslint.config.mjs', 'package.json']) {
    const p = path.join(root, name);
    if (fs.existsSync(p)) files.push(p);
  }
  return [...new Set(files)].sort();
}

/** شمارش ZWNJ به تفکیک پرونده — مبنای هشدار «حذف نیمفاصله». */
export function zwnjCounts(root) {
  const counts = {};
  for (const file of collectFiles(root)) {
    const text = fs.readFileSync(file, 'utf8');
    const n = (text.match(/\u200C/gu) || []).length;
    if (n > 0) counts[path.relative(root, file).split(path.sep).join('/')] = n;
  }
  return counts;
}

/** واژههای ZWNJدار موجود در پیکرهٔ پروژه → مرجع سبک نگارشی. */
function buildPrecedent(files) {
  const variants = new Map(); // واژهٔ بدون ZWNJ → { فرم درست، بسامد }
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(WORD_RE)) {
      const w = m[0];
      if (!w.includes(ZWNJ)) continue;
      const bare = w.replaceAll(ZWNJ, '');
      if (bare.length < 3) continue;
      const prev = variants.get(bare);
      if (!prev || prev.count < 1) variants.set(bare, { word: w, count: 1 });
      else prev.count += 1;
    }
  }
  return variants;
}

/**
 * دسته‌بندی یک واژه. خروجی: null یا { severity, rule, suggestion, reason }
 * precedent یک Map اختیاری است (برای قاعدهٔ «سازگاری با سبک پروژه»).
 */
export function classifyWord(word, precedent = new Map()) {
  if (!word || word.includes(ZWNJ) || SAFE_WORDS.has(word) || word.length < 3) return null;

  // قانون ۱: پیشوند فعلی
  const mv = /^(ن?می)(.+)$/u.exec(word);
  if (mv && VERB_STEMS.has(mv[2])) {
    return {
      severity: 'ERROR', rule: 'verb-prefix',
      suggestion: mv[1] + ZWNJ + mv[2],
      reason: 'پیشوند فعلی «می/نمی» بدون نیمفاصله به ستاک چسبیده است',
    };
  }

  // قانون ۲: حرف اضافهٔ «به»
  if (word.startsWith('به') && BE_FOLLOWERS.has(word.slice(2))) {
    return {
      severity: 'ERROR', rule: 'be-preposition',
      suggestion: 'به' + ZWNJ + word.slice(2),
      reason: 'حرف اضافهٔ «به» بدون نیمفاصله به واژهٔ بعد چسبیده است',
    };
  }

  // قانون ۳: همان واژه با ZWNJ در خود پروژه وجود دارد → ناسازگاری قطعی
  const known = precedent.get(word);
  if (known) {
    return {
      severity: 'ERROR', rule: 'project-precedent',
      suggestion: known.word,
      reason: 'همین واژه در پروژه با نیمفاصله نوشته شده است؛ این نسخه ناهماهنگ است',
    };
  }
  // قانون ۴: پس از حرف پایانی «ه»، واژهبست «ی / تر / ترین» حتماً با نیمفاصله
  // جدا می‌شود، وگرنه «ه» به شکل میانی تبدیل می‌شود و دو واژه به هم می‌چسبند.
  // الگو‌های «...ها / ...های» عمداً مستثنیاند: تشخیص جمع+اضافه به متن نیاز دارد.
  // صفتهای نسبی واژگانی (دانشگاهی، دستگاهی، همراهی…) در SAFE_WORDS مستثنی شده‌اند.
  const mh = /^([\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06BE\u06CC]{2,18}ه)(ی|تر|ترین)$/u.exec(word);
  if (mh) {
    return {
      severity: 'ERROR', rule: 'heh-suffix',
      suggestion: mh[1] + ZWNJ + mh[2],
      reason: 'پس از حرف پایانی «ه»، واژهبست بدون نیمفاصله چسبیده است',
    };
  }

  // ─────────── موارد مبهم: فقط هشدار ───────────
  // پسوند جمع پس از همخوان: هر دو شیوهٔ نگارش (چسبیده و با نیمفاصله)
  // در فارسی رایج و مجاز است؛ بنابراین هرگز خودکار اصلاح نمی‌شود.
  // الگو فقط از escapeهای یونیکد ساخته شده تا ابزار نتواند درون آن چیزی درج کند.
  if (/^[\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06BE\u06CC]{2,18}\u0647\u0627\u06CC?$/u.test(word)) {
    return {
      severity: 'WARN', rule: 'ambiguous-plural', suggestion: null,
      reason: 'پسوند جمع بدون نیمفاصله؛ بسته به سبک نگارش ممکن است درست باشد — نیاز به بازبینی انسانی',
    };
  }
  return null;
}

/** سنجش کل پیکرهٔ پروژه. */
export function scan(root, baseline = null) {
  const files = collectFiles(root);
  const precedent = buildPrecedent(files);
  const issues = [];
  const counts = {};

  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join('/');
    const text = fs.readFileSync(file, 'utf8');
    counts[rel] = (text.match(/\u200C/gu) || []).length;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.includes('fa-ignore')) continue;
      for (const m of line.matchAll(WORD_RE)) {
        const verdict = classifyWord(m[0], precedent);
        if (!verdict) continue;
        issues.push({
          file: rel, line: i + 1, column: m.index + 1,
          word: m[0], ...verdict,
        });
      }
    }
  }

  // هشدار «کاهش شمار ZWNJ» — نشانهٔ مشکوک به حذف نیمفاصله در ویرایشهای آینده
  if (baseline) {
    for (const [file, expected] of Object.entries(baseline)) {
      if (!Object.hasOwn(counts, file)) continue; // پرونده حذف شده؛ هشدار بیهوده نیست
      if (counts[file] < expected) {
        issues.push({
          file, line: 0, column: 0, word: '(file)',
          severity: 'WARN', rule: 'zwnj-count-drop', suggestion: null,
          reason: `شمار نیمفاصله از ${expected} به ${counts[file]} کاهش یافته است؛ احتمال حذف ناخواستهٔ ZWNJ`,
        });
      }
    }
  }
  return { issues, counts, files: files.length, precedentSize: precedent.size };
}

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(here, '..');
  const argRoot = process.argv.find((a) => a.startsWith('--root='));
  const effectiveRoot = argRoot ? path.resolve(argRoot.slice(7)) : root;

  if (process.argv.includes('--print-baseline')) {
    process.stdout.write(`${JSON.stringify(zwnjCounts(effectiveRoot), null, 2)}\n`);
    return;
  }

  const baselinePath = path.join(here, 'persian-typography-baseline.json');
  let baseline = null;
  try { baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')); } catch { /* اختیاری */ }

  const result = scan(effectiveRoot, baseline);
  const errors = result.issues.filter((x) => x.severity === 'ERROR');
  const warns = result.issues.filter((x) => x.severity === 'WARN');

  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = errors.length ? 1 : 0;
    return;
  }

  const fmt = (x) => `  ${x.file}:${x.line}:${x.column}  ${x.severity}  [${x.rule}]  «${x.word}»`
    + (x.suggestion ? `  →  «${x.suggestion}»` : '') + `\n      ${x.reason}`;
  console.log(`بررسی نگارش فارسی: ${result.files} پرونده | ${result.precedentSize} واژهٔ مرجع ZWNJدار`);
  if (errors.length) {
    console.log(`\nخطاهای قطعی (${errors.length}):`);
    for (const x of errors) console.log(fmt(x));
  }
  if (warns.length) {
    console.log(`\nهشدارهای مبهم (${warns.length}) — بیلد را متوقف نمی‌کنند:`);
    for (const x of warns.slice(0, 40)) console.log(fmt(x));
    if (warns.length > 40) console.log(`  … و ${warns.length - 40} هشدار دیگر (--json برای فهرست کامل)`);
  }
  console.log(`\nخلاصه: ${errors.length} خطای قطعی | ${warns.length} هشدار | ZWNJ کل: ${Object.values(result.counts).reduce((a, b) => a + b, 0)}`);
  if (errors.length) {
    console.log('برای رفع: نیمفاصلهٔ واقعی (U+200C) را در محل اعلام‌شده درج کنید؛ این ابزار خودکار چیزی تغییر نمی‌دهد.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
