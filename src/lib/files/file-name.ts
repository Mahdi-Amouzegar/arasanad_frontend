'use client';

/**
 * فاز ۱۲٫۱۲-ج — نمای واحد نام فایل در سراسر سایت.
 *
 * ⚠️ نام طولانی نباید عرض ستون/کادر فایل را بشکند. الگوی نمایش:
 *    `filename~.ext` و تولتیپی که نام کامل را نشان می‌دهد.
 * ⚠️ این ماژول تنها مسئول متن کوتاه است؛ تولتیپ توسط `Tooltip` یا
 *    مصرفکنندهای که دکمه دارد (با `title`) اضافه می‌شود.
 */

/** کوتاهسازی سوای رابط — قابل تست بدون رندر ری‌اکت. */
export function shortFileName(name: string, max = 26): string {
  const value = name.trim();
  if (value.length <= max) return value;
  const dot = value.lastIndexOf('.');
  if (dot <= 0 || dot === value.length - 1) {
    return `${value.slice(0, Math.max(1, max - 1))}~`;
  }
  const extension = value.slice(dot);
  if (extension.length >= max - 2) return `${value.slice(0, Math.max(1, max - 1))}~`;
  return `${value.slice(0, max - extension.length - 1)}~${extension}`;
}
