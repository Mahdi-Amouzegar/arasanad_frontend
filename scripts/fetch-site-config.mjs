/**
 * Build-time snapshot of public site config.
 *
 * Phase 12.3.A: the browser no longer calls api.arasanad.ir for this config,
 * because that host is unreachable for visitors inside Iran without a VPN.
 * This script refreshes public/site-config.json during `npm run build`; if the
 * API is unreachable in CI, the committed snapshot is kept as a safe fallback.
 */

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUTPUT = fileURLToPath(new URL('../public/site-config.json', import.meta.url));
const API_URL = 'https://api.arasanad.ir/api/v1/site/config';
const FALLBACK = { adminTelegram: 'mehdi_amouz', botUsername: 'ArasanadBot' };

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

let next = FALLBACK;
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
  if (isHandle(adminTelegram) && isHandle(botUsername)) {
    next = { adminTelegram, botUsername };
  } else {
    console.warn('[site-config] unexpected API payload; keeping committed snapshot');
  }
} catch (error) {
  console.warn(`[site-config] API unavailable, keeping committed snapshot: ${error.message}`);
}

await writeFile(OUTPUT, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(`[site-config] wrote ${OUTPUT} for @${next.adminTelegram}`);
