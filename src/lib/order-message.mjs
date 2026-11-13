/**
 * ساخت متن «پیشثبتنام» برای کپی/ارسال در تلگرام.
 *
 * ⚠️ تا پیش از فاز ۷ هیچ API ثبت سفارش وجود ندارد. این صفحه وانمود نمیکند
 *    سفارشی ثبت شده؛ فقط یک خلاصهی دقیق و قابل کپی میسازد تا کاربر همان را
 *    برای مدیر بفرستد. خالص و قابل تست بدون مرورگر.
 */

export function buildOrderMessage({ serviceName, pages, urgent = false, total, deposit }) {
  // فقط عدد صحیح مثبت معتبر است؛ کسری/منفی/NaN به حداقل ۱ محدود میشود.
  const safePages = Number.isInteger(pages) && pages >= 1 ? pages : 1;
  const lines = [
    'درخواست برآورد سفارش — آراسند',
    '',
    `نوع خدمت: ${serviceName}`,
    `تعداد صفحه: ${safePages}`,
    `تحویل: ${urgent ? 'فوری' : 'عادی'}`,
    `برآورد کل: ${Number(total).toLocaleString('fa-IR')} تومان`,
    `بیعانه تقریبی: ${Number(deposit).toLocaleString('fa-IR')} تومان`,
    '',
    'لطفاً پس از بررسی فایل، نرخ نهایی و زمان تحویل را اعلام کنید.',
  ];
  return lines.join('\n');
}
