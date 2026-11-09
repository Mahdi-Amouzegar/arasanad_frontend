// این فایل، لایه‌ی ارتباط با بک‌اند است.
// فعلاً پروژه بک‌اند ندارد و داده‌ها (قیمت‌ها، نمونه‌کارها) از فایل‌های استاتیک
// داخل پوشه public/data خوانده می‌شوند (نگاه کنید به Pricing.jsx و Portfolio.jsx).
//
// وقتی در آینده یک بک‌اند Node.js/Express (یا مشابه) اضافه شد:
// 1. متغیر محیطی VITE_API_URL را در فایل .env تنظیم کنید (مثلاً VITE_API_URL=https://api.arasand.ir)
// 2. به‌جای fetch مستقیم فایل‌های استاتیک در کامپوننت‌ها، از apiGet/apiPost همین فایل استفاده کنید.
// 3. هیچ تغییر ساختاری دیگری در پروژه لازم نیست.

const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// نمونه‌ی آماده برای زمانی که سرویس ثبت سفارش ساخته شود:
// export function submitOrder(orderData) {
//   return apiPost('/api/orders', orderData);
// }
