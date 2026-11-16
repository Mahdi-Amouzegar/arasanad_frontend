/** هسته‌ی خالص اعلان مرورگری — قابل تست بدون DOM. */

/**
 * گزینه‌های استاندارد `showNotification`.
 *
 * ⚠️ `tag` یکتاست؛ پیش از نمایش، نوتیف همان برچسب بسته می‌شود وگرنه
 *    جایگزینی بی‌صدا رخ می‌دهد و کاربر نوتیف تازه‌ای نمی‌بیند.
 * ⚠️ `renotify` برای اعلان‌های مهم روشن است تا تکرار دیده شود.
 */
export function notificationOptionsFor(item, { icon = '/icons/icon-192.png' } = {}) {
  const options = {
    body: String(item?.body ?? ''),
    tag: String(item?.tag ?? item?.id ?? 'arasanad'),
    icon,
    badge: icon,
    dir: 'rtl',
    lang: 'fa',
    requireInteraction: false,
    data: { href: item?.href ?? '/panel/', notificationId: item?.id ?? '' },
  };
  if (item?.importance === 'important') options.renotify = true;
  return options;
}

/** فقط اعلان‌هایی که پیشتر نشان داده نشده‌اند نمایش می‌یابند. */
export function unseenItems(items, seenIds) {
  const seen = seenIds instanceof Set ? seenIds : new Set(seenIds ?? []);
  return (Array.isArray(items) ? items : []).filter((item) => item && item.id && !seen.has(item.id));
}

/** ترتیب نمایش: قدیمی‌ترین اول، تا هنگام چند اعلان پشت‌سرهم گم نشود. */
export function inDisplayOrder(items) {
  return [...(Array.isArray(items) ? items : [])].sort((a, b) =>
    String(a?.createdAt ?? '').localeCompare(String(b?.createdAt ?? '')),
  );
}

/** آدرس امن برای کلیک نوتیف — فقط مسیرهای داخلی مجازند. */
export function safeHref(value) {
  const href = String(value ?? '');
  return href.startsWith('/') && !href.startsWith('//') ? href : '/panel/';
}
