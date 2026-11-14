/**
 * تلاش دوباره‌ی آگاه به وضعیت شبکه.
 *
 * برخلاف backoff ساده، پیش از هر تلاش از `waitForOnline` (همان ابزار کتابخانه)
 * استفاده می‌کند؛ بنابراین وقتی آفلاین هستیم، درخواست‌ها بیهوده
 * پشت‌سرهم فرستاده نمی‌شوند. jitter هم از هم‌زمان‌شدن
 * کلاینت‌ها پس از قطعی سراسری جلوگیری می‌کند.
 */

import { getConnectivityConfig } from './config.mjs';
import { waitForOnline } from './network.mjs';

/**
 * @param {number} attempt شماره‌ی تلاش (از ۰)
 * @param {{ baseMs?: number, maxMs?: number, jitter?: number }} [options]
 * @param {() => number} [random] تزریق‌پذیر برای تست
 */
export function backoffDelay(attempt, options = {}, random = Math.random) {
  const cfg = getConnectivityConfig();
  const baseMs = options.baseMs ?? cfg.retryBaseMs;
  const maxMs = options.maxMs ?? cfg.retryMaxMs;
  const jitter = options.jitter ?? cfg.retryJitter;
  const exponential = Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt));
  const spread = exponential * jitter;
  return Math.round(exponential - spread + random() * spread * 2);
}

/**
 * اجرای یک عملیات با تلاش دوباره.
 *
 * @template T
 * @param {(attempt: number) => Promise<T>} operation
 * @param {{ retries?: number, signal?: AbortSignal, shouldRetry?: (error: unknown) => boolean,
 *           onAttempt?: (attempt: number, error: unknown) => void, baseMs?: number, maxMs?: number }} [options]
 * @returns {Promise<T>}
 */
export async function withRetry(operation, options = {}) {
  const { retries = 3, signal, shouldRetry = () => true, onAttempt } = options;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (signal?.aborted) throw new Error('عملیات لغو شد');

    // منتظر حکم شبکه می‌مانیم؛ خودمان جداگانه شبکه را چک نمی‌کنیم.
    await waitForOnline({ timeoutMs: 5000, signal });

    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      onAttempt?.(attempt, error);
      if (attempt === retries || !shouldRetry(error)) break;
      const delay = backoffDelay(attempt, options);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            reject(new Error('عملیات لغو شد'));
          },
          { once: true },
        );
      });
    }
  }

  throw lastError ?? new Error('عملیات ناموفق بود');
}
