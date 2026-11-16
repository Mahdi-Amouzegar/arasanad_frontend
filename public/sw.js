/* ═══════════════════════════════════════════════════════════════════════════
   Service Worker آراسند
   ⚠️ هدف: پوسته‌ی آفلاین، بارگذاری سریع‌تر دارایی‌های ثابت و کلیک روی اعلان‌های فاز ۹.
      Web Push و Background Sync در فاز تکمیلی اضافه می‌شوند.
   ⚠️ این فایل در `public/` است و بدون باندل شدن، عیناً منتشر می‌شود.
   ═══════════════════════════════════════════════════════════════════════════ */

// ⚠️ نسخه هنگام تغییر مسیر پایه بالا رفت تا کش پوسته‌ی قدیمی
//    (با مسیرپایه‌ی مخزن قدیمی) در activate پاک شود و HTML کهنه نماند.
const VERSION = 'arasanad-v3';
// دامنه‌ی اختصاصی از ریشه سرو می‌شود؛ مسیر پایه خالی است.
const BASE = '';
const SHELL = `${BASE}/`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.add(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // فقط GET و فقط همان مبدأ
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // ناوبری: شبکه اول، در نبود شبکه از کش پوسته
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(SHELL).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  // دارایی‌های نسخه‌دار Next.js: کش اول (نام فایل شامل هش است)
  if (url.pathname.includes('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => undefined);
          return response;
        });
      }),
    );
  }
});

/* ── فاز ۹: کلیک روی اعلان (architecture.md §14.3) ── */
/* ⚠️ فقط مسیرهای داخلی مجازند؛ `data.href` از سمت
      کلاینت می‌آید و نباید به آن اعتماد کرد.
   ⚠️ پنجره‌ی باز فعال می‌شود؛ در نبود پنجره، یکی باز می‌کنیم. */
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
