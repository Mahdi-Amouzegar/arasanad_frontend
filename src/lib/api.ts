/**
 * لایه‌ی ارتباط با API.
 *
 * ⚠️ آدرس پایه از متغیر محیطی خوانده می‌شود تا با تغییر دامنه، فقط تنظیم عوض شود:
 *    `NEXT_PUBLIC_API_BASE_URL` → در GitHub Actions به‌صورت Repository Variable
 *
 * ⚠️ چون `workers.dev` در ایران مسدود است، مقدار پیش‌فرض فقط برای توسعه است.
 *    پس از اتصال دامنه، مقدار را به `https://api.arasanad.ir/api/v1` تغییر دهید.
 */

const DEFAULT_BASE = 'https://arasanad-api.arasanad-for-type.workers.dev/api/v1';

/**
 * ⚠️ از `||` استفاده می‌شود، نه `??`:
 *    در GitHub Actions متغیر تعریف‌نشده به‌صورت رشته‌ی خالی تزریق می‌شود،
 *    و `??` رشته‌ی خالی را معتبر می‌داند — نتیجه: آدرس نسبی و درخواست
 *    به خود سایت گیت‌هاب (خطای ۴۰۵).
 */
const RAW_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

export const API_BASE = (RAW_BASE && RAW_BASE.length > 0 ? RAW_BASE : DEFAULT_BASE).replace(
  /\/+$/,
  '',
);

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

interface Envelope<T> {
  ok: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

/**
 * فراخوانی API با پاک‌سازی پاکت پاسخ.
 * @throws ApiError برای خطاهای شبکه، HTTP و پاسخ ناموفق
 */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token, signal }: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new ApiError(
      'NETWORK',
      'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید. در صورت نیاز از ابزارهای تغییر IP استفاده کنید.',
      0,
    );
  }

  let payload: Envelope<T> | null = null;
  try {
    payload = (await response.json()) as Envelope<T>;
  } catch {
    payload = null;
  }

  if (!payload) {
    throw new ApiError('BAD_RESPONSE', 'پاسخ سرور قابل خواندن نبود', response.status);
  }

  if (!response.ok || !payload.ok || payload.data === null) {
    const code = payload.error?.code ?? 'UNKNOWN';
    const message = payload.error?.message ?? 'خطای نامشخص رخ داد';
    throw new ApiError(code, message, response.status);
  }

  return payload.data;
}

/* ─────────────────────── شناسه‌ی دستگاه ─────────────────────── */

const DEVICE_KEY = 'arasanad_device_id';

/** شناسه‌ی پایدار دستگاه (در مرورگر) */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `dev-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(DEVICE_KEY, id);
  return id;
}

/** نام تقریبی دستگاه برای نمایش در فهرست نشست‌ها */
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'دستگاه';
  const ua = window.navigator.userAgent;
  if (/android/i.test(ua)) return 'اندروید';
  if (/iphone|ipad|ipod/i.test(ua)) return 'آیفون';
  if (/windows/i.test(ua)) return 'ویندوز';
  if (/mac os/i.test(ua)) return 'مک';
  if (/linux/i.test(ua)) return 'لینوکس';
  return 'مرورگر';
}
