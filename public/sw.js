/* ═══════════════════════════════════════════════════════════════════════════
   Service Worker آراسند
   ⚠️ وظیفهٔ سراسری: فقط پاک‌سازی کشهای قدیمی و کلیک روی اعلان‌های فاز ۹.
   ⚠️ عمداً هیچ درخواستی را intercepted نمی‌کند (نه ناوبری و نه `/_next/static/`).
      دلیل (UAT فاز ۱۳، موبایل): پوستهٔ کششده و چانکهای قدیمی
      بعد از هر استقرار با HTML تازه ناهمخوان می‌شدند و هیدراسیون انجام
      نمی‌شد؛ دکمه‌ها روی موبایل تا اتصال VPN و بارگذاری مجدد کار نمی‌کردند.
      حالا مرورگر همیشه HTML و JS را مستقیم و تازه از سرور می‌گیرد.
   ⚠️ این فایل در `public/` است و بدون باندل شدن عیناً منتشر می‌شود.
   ═══════════════════════════════════════════════════════════════════════════ */

const VERSION = 'arasanad-v4';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/* ── فاز ۹: کلیک روی اعلان (architecture.md §14.3) ── */
/* ⚠️ فقط مسیرهای داخلی مجازند؛ `data.href` از سمت
      کلاینت می‌آید و نباید به آن اعتماد کرد. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const candidate = typeof data.href === 'string' ? data.href : '';
  const href = candidate.startsWith('/') && !candidate.startsWith('//') ? candidate : '/panel/';
  const target = new URL(href, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (typeof client.focus === 'function') {
          client.focus();
          if (typeof client.navigate === 'function' && client.url !== target) {
            return client.navigate(target);
          }
          return undefined;
        }
      }
      return typeof self.clients.openWindow === 'function'
        ? self.clients.openWindow(target)
        : undefined;
    }),
  );
});
