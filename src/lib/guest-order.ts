/**
 * فاز ۱۲٫۶-پ — پیش‌نویس سفارش مهمان.
 *
 * ⚠️ مهمان می‌تواند بدون ورود نوع خدمت، تعداد صفحه و فوریت را برآورد کند و
 *    پیش‌نویس خود را ذخیره کند. هیچ درخواست شبکه‌ای و هیچ مبلغی به سرور
 *    فرستاده نمی‌شود؛ نرخ نهایی و مرجع پرداخت همیشه توسط سرور تعیین می‌شود.
 * ⚠️ پیش‌نویس در `sessionStorage` همان تب نگه داشته می‌شود تا پس از ورود،
 *    همان سفارش در فرم ثبت سفارش بازگشایی شود. حاوی هیچ اطلاعات شخصی نیست.
 */

export interface GuestOrderDraft {
  id: string;
  serviceId: string;
  pages: number;
  urgent: boolean;
  createdAt: string;
}

const KEY_PREFIX = 'arasanad:guest-order:';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** فقط شناسههایی که ما ساختهایم پذیرفته می‌شوند (جلوگیری از دستکاری مسیر). */
const ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;

export function guestDraftKey(id: string): string | null {
  return ID_PATTERN.test(id) ? `${KEY_PREFIX}${id}` : null;
}

export function saveGuestDraft(draft: GuestOrderDraft): void {
  if (typeof window === 'undefined') return;
  const key = guestDraftKey(draft.id);
  if (!key) return;
  window.sessionStorage.setItem(key, JSON.stringify(draft));
}

export function loadGuestDraft(id: string): GuestOrderDraft | null {
  if (typeof window === 'undefined') return null;
  const key = guestDraftKey(id);
  if (!key) return null;

  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<GuestOrderDraft>;
    const created = Date.parse(String(value.createdAt ?? ''));
    if (
      typeof value.id !== 'string' ||
      value.id !== id ||
      typeof value.serviceId !== 'string' ||
      !Number.isFinite(Number(value.pages)) ||
      Number(value.pages) < 1 ||
      !Number.isFinite(created) ||
      Date.now() - created > MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return {
      id,
      serviceId: value.serviceId,
      pages: Number(value.pages),
      urgent: value.urgent === true,
      createdAt: value.createdAt as string,
    };
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
}

/** مسیر ورودی که پس از ورود دوباره به همان پیش‌نویس برمیگردد. */
export function guestDraftLoginHref(id: string): string {
  const next = `/start/?draft=${encodeURIComponent(id)}`;
  return `/login/?${new URLSearchParams({ next }).toString()}`;
}

/** مقصد امن پس از ورود — فقط مسیرهای محلی و غیر ورودی. */
export function postLoginTarget(candidate: string | null): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return '/profile/';
  if (candidate.startsWith('/login')) return '/profile/';
  return candidate;
}
