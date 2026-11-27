/**
 * مقصد امن پس از ورود.
 *
 * ⚠️ جدا از جریان سفارش مهمان: فقط مسیرهای محلی و غیر ورودی پذیرفته می‌شوند.
 *    وقتی مقصد صریحی وجود ندارد، مدیر به داشبورد مدیریت و سفارش‌دهنده
 *    به داشبورد پنل فرستاده می‌شود.
 */

function defaultTarget(role?: 'admin' | 'customer'): string {
  return role === 'admin' ? '/admin/' : '/panel/';
}

export function postLoginTarget(candidate: string | null, role?: 'admin' | 'customer'): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) return defaultTarget(role);
  if (candidate.startsWith('/login')) return defaultTarget(role);
  return candidate;
}
