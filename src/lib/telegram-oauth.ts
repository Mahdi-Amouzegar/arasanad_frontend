/**
 * ورود با شماره موبایل تلگرام (Redirect-based Telegram Login).
 *
 * چرا؟ روش «تأیید در ربات» فقط با حسابی کار می‌کند که **در اپ تلگرام فعال** است.
 * این روش اجازه می‌دهد کاربر هر حساب تلگرامی را — حتی حسابی که روی این دستگاه
 * وارد نشده — با وارد کردن شماره و کد تأیید کند.
 *
 * ⚠️ `oauth.telegram.org` ممکن است در ایران مسدود باشد؛ به همین دلیل روش ربات
 *    به‌عنوان جایگزین حفظ می‌شود.
 */

const OAUTH_URL = 'https://oauth.telegram.org/auth';

export interface TelegramCallbackPayload {
  id: number;
  auth_date: number;
  hash: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

/** ساخت لینک OAuth. `logout=1` باعث می‌شود تلگرام همیشه شماره بپرسد. */
export function buildTelegramOAuthUrl(botId: string, returnTo: string): string {
  // ⚠️ `request_access=write` و `logout=1` هر دو لازم هستند:
  //    - `logout=1` نشست قبلی تلگرام را پاک می‌کند
  //    - `request_access=write` تلگرام را مجبور می‌کند اجازه را دوباره بپرسد؛
  //      بدون آن، تلگرام بی‌صدا همان حساب قبلی را تأیید می‌کند و کاربر
  //      امکان انتخاب حساب دیگر را ندارد.
  //    این ترکیب، همان چیزی است که در پروژه‌ی مرجع کار می‌کرد.
  const params = new URLSearchParams({
    bot_id: botId,
    origin: window.location.origin,
    return_to: returnTo,
    request_access: 'write',
    logout: '1',
  });

  return `${OAUTH_URL}?${params.toString()}`;
}

function decodeTgAuthResult(value: string): TelegramCallbackPayload | null {
  try {
    let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const parsed = JSON.parse(new TextDecoder('utf-8').decode(bytes)) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;

    const id = Number(parsed.id);
    const authDate = Number(parsed.auth_date);
    const hash = parsed.hash;
    if (!Number.isFinite(id) || !Number.isFinite(authDate) || typeof hash !== 'string') return null;

    const payload: TelegramCallbackPayload = { id, auth_date: authDate, hash };
    if (typeof parsed.first_name === 'string') payload.first_name = parsed.first_name;
    if (typeof parsed.last_name === 'string') payload.last_name = parsed.last_name;
    if (typeof parsed.username === 'string') payload.username = parsed.username;
    if (typeof parsed.photo_url === 'string') payload.photo_url = parsed.photo_url;

    return payload;
  } catch {
    return null;
  }
}

/**
 * استخراج داده‌ی بازگشتی تلگرام از URL فعلی.
 * دو حالت پشتیبانی می‌شود: `#tgAuthResult=<base64>` و پارامترهای Query.
 */
export function parseTelegramCallback(url: string = window.location.href): TelegramCallbackPayload | null {
  const hashMatch = /[#&]tgAuthResult=([A-Za-z0-9_\-+/=]+)/.exec(url);
  if (hashMatch?.[1]) return decodeTgAuthResult(hashMatch[1]);

  try {
    const params = new URL(url).searchParams;
    const id = params.get('id');
    const hash = params.get('hash');
    const authDate = params.get('auth_date');
    if (!id || !hash || !authDate) return null;

    const numericId = Number(id);
    const numericDate = Number(authDate);
    if (!Number.isFinite(numericId) || !Number.isFinite(numericDate)) return null;

    const payload: TelegramCallbackPayload = { id: numericId, auth_date: numericDate, hash };
    const firstName = params.get('first_name');
    const lastName = params.get('last_name');
    const username = params.get('username');
    const photoUrl = params.get('photo_url');
    if (firstName) payload.first_name = firstName;
    if (lastName) payload.last_name = lastName;
    if (username) payload.username = username;
    if (photoUrl) payload.photo_url = photoUrl;

    return payload;
  } catch {
    return null;
  }
}

/** پاک کردن پارامترهای ورود از URL تا رفرش بعدی دوباره پردازش نشوند. */
export function cleanTelegramCallbackFromUrl(): void {
  try {
    const url = new URL(window.location.href);
    const keys = ['id', 'hash', 'auth_date', 'first_name', 'last_name', 'username', 'photo_url', 'tg'];

    let changed = false;
    for (const key of keys) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }

    let hash = url.hash;
    if (hash && hash.includes('tgAuthResult=')) {
      hash = '';
      changed = true;
    }

    if (changed) {
      window.history.replaceState({}, '', url.pathname + url.search + hash);
    }
  } catch {
    /* بی‌خطر */
  }
}
