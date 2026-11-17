'use client';

/**
 * فاز ۱۳ — مدیریت متمرکز کلید «بازگشت» اندروید.
 *
 * ⚠️ یک نقطهٔ واحد برای تمام سایت: هیچ کامپوننتی نباید جداگانه به
 *    `popstate` گوش دهد. هر لایهای که باز است (دراور، دیالوگ، مودال)
 *    تنها یک تابع «بستن» در این ثبت می‌کند و این ماژول تصمیم می‌گیرد.
 * ⚠️ ترتیب تصمیم: لایهٔ باز ← صفحهٔ اصلی ← هشدار خروج ← خروج واقعی.
 */

export type Dismisser = () => boolean;

const dismissers = new Set<Dismisser>();

/** ثبت یک تابع بستن؛ تابع پاک‌سازی برمیگردد. */
export function registerBackDismiss(dismiss: Dismisser): () => void {
  dismissers.add(dismiss);
  return () => dismissers.delete(dismiss);
}

/**
 * تمام توابع بستن را امتحان می‌کند تا نخستینی که کاری بسته است `true` دهد.
 * برعکس ترتیب ثبت (آخرین لایهای که باز شده، نخست بسته می‌شود).
 */
export function dismissTopOverlay(): boolean {
  const list = Array.from(dismissers).reverse();
  for (const dismiss of list) {
    try {
      if (dismiss()) return true;
    } catch {
      // بستن نافرجام نباید جلوی بقیهٔ لایه‌ها یا خروج را بگیرد.
    }
  }
  return false;
}

export const EXIT_WINDOW_MS = 3000;
