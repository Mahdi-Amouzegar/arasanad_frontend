/**
 * ابزار‌های مکمل ارسال و دریافت — همگی از حالت شبکه‌ی کتابخانه تغذیه می‌شوند.
 *
 * هدف: هیچ بخشی از برنامه برای «آیا اینترنت هست؟» یک `fetch` جداگانه نزند.
 * `connectivityFetch` نتیجه‌ی هر درخواست را به انبار شبکه گزارش می‌کند،
 * بنابراین خود درخواست‌ها منبع تشخیص وضعیتاند.
 */

import { getConnectivityConfig } from './config.mjs';
import { getNetworkSnapshot, isOnline, noteRequestOutcome, waitForOnline } from './network.mjs';

/**
 * نسخه‌ی آگاه‌به‌شبکه از `fetch`: مهلت دارد، لغو‌پذیر است،
 * پیش از ارسال منتظر حکم شبکه می‌ماند و نتیجه را ثبت می‌کند.
 *
 * @param {string|URL|Request} input
 * @param {RequestInit & { timeoutMs?: number, waitForNetwork?: boolean }} [init]
 */
export async function connectivityFetch(input, init = {}) {
  const cfg = getConnectivityConfig();
  const { timeoutMs = 12_000, waitForNetwork = true, ...fetchInit } = init;

  if (waitForNetwork && !isOnline()) {
    const ready = await waitForOnline({ timeoutMs: 5000, signal: fetchInit.signal ?? undefined });
    if (!ready) throw new Error('اتصال اینترنت برقرار نیست');
  }

  const controller = new AbortController();
  const external = fetchInit.signal;
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const fetchImpl = cfg.fetchImpl ?? (typeof fetch !== 'undefined' ? fetch : null);
    if (!fetchImpl) throw new Error('fetch در این محیط در دسترس نیست');
    const response = await fetchImpl(input, {
      ...fetchInit,
      signal: controller.signal,
      cache: fetchInit.cache ?? 'no-store',
    });
    // دریافت هر پاسخ HTTP یعنی مسیر شبکه برقرار است، حتی اگر وضعیت ۴xx/۵xx باشد.
    noteRequestOutcome({ ok: true });
    return response;
  } catch (error) {
    noteRequestOutcome({ ok: false, reason: 'fetch-failed' });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** @returns {'unknown'|'offline'|'slow'|'fast'} */
export function getConnectionQuality() {
  const snapshot = getNetworkSnapshot();
  if (snapshot.status === 'offline') return 'offline';
  if (snapshot.status === 'unknown') return 'unknown';
  if (typeof snapshot.effectiveType === 'string' && /^(slow-)?2g$/i.test(snapshot.effectiveType)) {
    return 'slow';
  }
  if (Number.isFinite(snapshot.rtt) && snapshot.rtt > 800) return 'slow';
  if (Number.isFinite(snapshot.latencyMs) && snapshot.latencyMs > 2000) return 'slow';
  return 'fast';
}

/**
 * آیا ارسال یک فایل حجیم باید به‌تعویق بیفتد؟
 * برای آپلود عکس، پیوست سفارش و همگام‌سازی پیام‌ها قابل استفاده است.
 */
export function shouldDeferHeavyTransfer(bytes = 0) {
  const quality = getConnectionQuality();
  if (quality === 'offline' || quality === 'unknown') return false;
  return quality === 'slow' && bytes > 2 * 1024 * 1024;
}
