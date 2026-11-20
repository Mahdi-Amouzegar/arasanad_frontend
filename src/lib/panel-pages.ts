import { ADMIN_NAV, CUSTOMER_NAV, type NavGroup } from './navigation';

/**
 * اسکلت مسیرهای پنل — بدون منطق کسبوکار.
 *
 * ⚠️ تصمیم شماره ۵: «ساختن اسکلت پنل» یعنی مسیرها و پوسته‌ی `AppShell`
 *    همراه Empty State صادقانه، نه پیاده‌سازی فازهای ۷–۱۳ و نه داده‌ی ساختگی.
 * ⚠️ تمام hrefهای `CUSTOMER_NAV` / `ADMIN_NAV` باید صفحه‌ای واقعی داشته باشند
 *    تا لینک مرده باقی نماند.
 */

export interface PanelPageInfo {
  title: string;
  phase: number;
  note: string;
}

export const CUSTOMER_PAGES: Record<string, PanelPageInfo> = {
  '/panel': { title: 'داشبورد', phase: 7, note: 'خلاصه‌ی سفارش‌ها و وضعیت‌ها' },
  '/panel/orders': { title: 'سفارشات من', phase: 12.8, note: 'آدرس قدیمی؛ همان جدول ادغام‌شده سفارشات من' },
  '/panel/projects': { title: 'سفارشات من', phase: 7, note: 'جدول واحد سفارش‌ها با فیلتر، مرتب‌سازی و جزئیات مالی' },
  '/panel/projects/detail': { title: 'جزئیات سفارش', phase: 12.2, note: 'جزئیات کامل سفارش همراه فایل‌ها و لینکها' },
  '/panel/projects/new': { title: 'ثبت سفارش جدید', phase: 7, note: 'فرم ثبت سفارش‌ها؛ بارگذاری فایل در فاز ۸' },
  '/panel/projects/operations': { title: 'سفارشگردانی', phase: 9.5, note: 'سابقه‌ی فقط الحاقی عملیات‌ها، جدیدترین در بالا' },
  '/panel/projects/delivery': { title: 'تحویل و اصلاح', phase: 11, note: 'نسخه‌های تحویل، قفل دانلود و درخواست اصلاح' },
  '/panel/files': { title: 'فایل‌های من', phase: 12.5, note: 'فایل‌های مجاز سفارش، تحویل و رسید با دانلود امن' },
  '/panel/messages': { title: 'پیام‌ها', phase: 9, note: 'گفتگوی درون‌برنامه‌ای؛ فعال در فاز ۹' },
  '/panel/wallet': { title: 'کیف پول', phase: 10, note: 'موجودی، شارژ و تراکنشها' },
  '/panel/pay': { title: 'پرداخت و شارژ', phase: 10.5, note: 'دو مقصد پرداخت و دو روش واریز' },
  '/panel/pay/result': { title: 'نتیجه پرداخت', phase: 10.5, note: 'موفق، ناموفق یا در انتظار بررسی' },
  '/panel/notifications': { title: 'اعلان‌ها', phase: 9, note: 'اعلان‌های درون‌سامانه‌ای و تلگرام؛ فعال در فاز ۹' },
  '/panel/profile': { title: 'پروفایل من', phase: 6, note: 'تنظیمات حساب — در `/profile/` فعال است' },
};

export const ADMIN_PAGES: Record<string, PanelPageInfo> = {
  '/admin': { title: 'داشبورد مدیر', phase: 8, note: 'نمای کلی سفارش‌ها و صف کاری' },
  '/admin/orders': { title: 'سفارشات من', phase: 12.8, note: 'آدرس قدیمی؛ همان جدول ادغام‌شده سفارشات' },
  '/admin/projects/detail': { title: 'جزئیات سفارش', phase: 12.2, note: 'جزئیات کامل سفارش همراه فایل‌ها و لینکها' },
  '/admin/projects': { title: 'سفارش‌ها', phase: 7, note: 'صف کاری، تعیین نرخ و گردش وضعیت‌ها، فعال در فاز ۷' },
  '/admin/projects/operations': { title: 'سفارشگردانی', phase: 9.5, note: 'سابقه‌ی فقط الحاقی عملیات‌ها، جدیدترین در بالا' },
  '/admin/projects/delivery': { title: 'تحویل و اصلاح', phase: 11, note: 'ثبت نسخه‌ها، پاسخ اصلاح و تکمیل سفارش' },
  '/admin/payments': { title: 'بررسی پرداخت‌ها', phase: 10, note: 'تأیید رسیدها و پرداخت‌ها' },
  '/admin/wallets': { title: 'کیف پول‌ها', phase: 10, note: 'موجودی و تراکنشهای کاربران' },
  '/admin/refunds': { title: 'برگشت وجه', phase: 11, note: 'درخواست‌ها و پردازش استرداد' },
  '/admin/reconciliation': { title: 'گزارش مغایرت', phase: 10, note: 'معادله بنیادی و مغایرت مالی' },
  '/admin/users': { title: 'کاربران', phase: 12, note: 'فهرست کاربران و نقشها' },
  '/admin/messages': { title: 'پیام‌ها', phase: 12, note: 'گفتگوهای اخیر با مشتریان' },
  '/admin/audit': { title: 'سوابق حسابرسی', phase: 12, note: 'رویدادهای مدیریتی با فیلتر و قبل/بعد' },
  '/admin/settings': { title: 'تنظیمات', phase: 12, note: 'اطلاعات سایت، بانک مقصد، متنها و سیاست اصلاح' },
};

/**
 * تمام پارامترهای لازم برای `generateStaticParams` در خروجی استاتیک.
 * `extraPaths` صفحه‌های واقعیای هستند که در ناوبری لینک ندارند ولی باید در
 * بیلد ساخته شوند (مثلاً فاز ۹٫۵: `/panel/projects/operations`).
 */
export function slugsFor(
  groups: NavGroup[],
  prefix: string,
  extraPaths: string[] = [],
): Array<{ slug: string[] }> {
  const seen = new Set<string>();
  const result: Array<{ slug: string[] }> = [{ slug: [] }];
  seen.add('');

  for (const group of groups) {
    for (const item of group.items) {
      if (!item.href.startsWith(prefix)) continue;
      const rest = item.href.slice(prefix.length).replace(/^\/+|\/+$/g, '');
      if (!rest || seen.has(rest)) continue;
      seen.add(rest);
      result.push({ slug: rest.split('/') });
    }
  }
  for (const raw of extraPaths) {
    const rest = raw.replace(/^\/+|\/+$/g, '');
    if (!rest || seen.has(rest)) continue;
    seen.add(rest);
    result.push({ slug: rest.split('/') });
  }
  return result;
}

export function hrefFromSlug(prefix: string, slug: string[] | undefined): string {
  const rest = (slug ?? []).join('/');
  return rest ? `${prefix}/${rest}` : prefix;
}

export function infoFor(map: Record<string, PanelPageInfo>, href: string): PanelPageInfo {
  return (
    map[href] ?? {
      title: 'این بخش',
      phase: 7,
      note: 'صفحه‌ای از پنل کاربری',
    }
  );
}

export const CUSTOMER_GROUPS = CUSTOMER_NAV;
export const ADMIN_GROUPS = ADMIN_NAV;
