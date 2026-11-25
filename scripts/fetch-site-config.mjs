/**
 * Build-time snapshot of public site config.
 *
 * Phase 12.3.A: the browser no longer calls api.arasanad.ir for this config,
 * because that host is unreachable for visitors inside Iran without a VPN.
 * This script refreshes public/site-config.json during `npm run build`; if the
 * API is unreachable in CI, the committed snapshot is kept as a safe fallback.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUTPUT = fileURLToPath(new URL('../public/site-config.json', import.meta.url));
const API_URL = 'https://api.arasanad.ir/api/v1/site/config';

// فاز ۱۲٫۳۱: هنگام دردسترس نبودن API، اسنپشات موجود (شامل `order`) دقیقاً
// حفظ می‌شود. مقدارهای پیش‌فرض خروجی فقط از بکند می‌آیند و در فرانت تکرار
// نمی‌شوند؛ نوشتن Fallback بدون `order` چکباکسهای تیزپا را ناپدید می\u200cکرد.
async function committedSnapshot() {
  try {
    const parsed = JSON.parse(await readFile(OUTPUT, 'utf8'));
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    /* فایل موجود نیست یا قابلخواندن نیست */
  }
  return { adminTelegram: 'mehdi_amouz', botUsername: 'ArasanadBot' };
}

/** fetch فقط هدرها را پوشش می‌دهد؛ خواندن بدنه هم نیاز به مهلت جدا دارد. */
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

function isHandle(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_]{3,32}$/.test(value);
}

let next = await committedSnapshot();
try {
  const response = await withTimeout(
    fetch(API_URL, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(6000) }),
    6000,
    'fetch',
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = JSON.parse(await withTimeout(response.text(), 6000, 'body'));
  const data = payload?.data ?? {};
  const adminTelegram = String(data.adminTelegram ?? '').replace(/^@/, '');
  const botUsername = String(data.botUsername ?? '').replace(/^@/, '');
  const allowed = Array.isArray(data.order?.allowedOutputFormats)
    ? data.order.allowedOutputFormats.filter((value) => typeof value === 'string')
    : [];
  const preferred = data.order?.defaultOutputFormat;
  if (isHandle(adminTelegram) && isHandle(botUsername) && allowed.length > 0
      && typeof preferred === 'string' && allowed.includes(preferred)) {
    next = {
      adminTelegram,
      botUsername,
      order: { defaultOutputFormat: preferred, allowedOutputFormats: allowed },
    };
  } else {
    console.warn('[site-config] unexpected API payload; keeping committed snapshot');
  }
} catch (error) {
  console.warn(`[site-config] API unavailable, keeping committed snapshot: ${error.message}`);
}

await writeFile(OUTPUT, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(`[site-config] wrote ${OUTPUT} for @${next.adminTelegram} (default ${next.order?.defaultOutputFormat ?? 'from snapshot'})`);
