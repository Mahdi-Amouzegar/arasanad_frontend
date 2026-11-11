/**
 * حساب‌های شناخته‌شده در این مرورگر.
 *
 * ⚠️ فقط اطلاعات نمایشی ذخیره می‌شود، **نه توکن**.
 *    دلیل: با خروج از حساب، نشست در سرور باطل می‌شود و توکن قدیمی بی‌ارزش است.
 *    نگه‌داشتن آن فقط ریسک امنیتی است.
 *
 * ⚠️ این فهرست برای «ورود سریع به همان حساب» است؛ تأیید نهایی همیشه در تلگرام
 *    انجام می‌شود، چون فقط تلگرام می‌داند کدام حساب فعال است.
 */

const KEY = 'arasanad_known_accounts';
const MAX_ACCOUNTS = 4;

export interface KnownAccount {
  userId: string;
  username: string;
  displayName: string;
  lastUsedAt: string;
}

function isKnownAccount(value: unknown): value is KnownAccount {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.userId === 'string' &&
    typeof item.username === 'string' &&
    typeof item.displayName === 'string'
  );
}

export function listKnownAccounts(): KnownAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isKnownAccount).slice(0, MAX_ACCOUNTS);
  } catch {
    return [];
  }
}

export function rememberAccount(account: {
  userId: string;
  username: string;
  displayName: string;
}): void {
  if (typeof window === 'undefined') return;

  const others = listKnownAccounts().filter((item) => item.userId !== account.userId);
  const next: KnownAccount[] = [
    { ...account, lastUsedAt: new Date().toISOString() },
    ...others,
  ].slice(0, MAX_ACCOUNTS);

  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* حافظه پر است یا دسترسی نداریم — نباید ورود را بشکند */
  }
}

export function forgetAccount(userId: string): void {
  if (typeof window === 'undefined') return;
  const next = listKnownAccounts().filter((item) => item.userId !== userId);
  window.localStorage.setItem(KEY, JSON.stringify(next));
}
