/* ═══════════════════════════════════════════════════════════════════════════
   Service Worker آراسند
   ⚠️ هدف در این فاز: پوسته‌ی آفلاین و بارگذاری سریع‌تر دارایی‌های ثابت.
      Push و Background Sync در فازهای بعدی اضافه می‌شوند.
   ⚠️ این فایل در `public/` است و بدون باندل شدن، عیناً منتشر می‌شود.
   ═══════════════════════════════════════════════════════════════════════════ */

// ⚠️ نسخه هنگام تغییر مسیر پایه بالا رفت تا کش پوستهی قدیمی
//    (با مسیرپایهی مخزن قدیمی) در activate پاک شود و HTML کهنه نماند.
const VERSION = 'arasanad-v2';
// دامنهی اختصاصی از ریشه سرو میشود؛ مسیر پایه خالی است.
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
