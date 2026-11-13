import { ADMIN_NAV, CUSTOMER_NAV, type NavGroup } from './navigation';

/**
 * اسکلت مسیرهای پنل — بدون منطق کسبوکار.
 *
 * ⚠️ تصمیم شماره ۵: «ساختن اسکلت پنل» یعنی مسیرها و پوستهی `AppShell`
 *    همراه Empty State صادقانه، نه پیادهسازی فازهای ۷–۱۳ و نه دادهی ساختگی.
 * ⚠️ تمام hrefهای `CUSTOMER_NAV` / `ADMIN_NAV` باید صفحهای واقعی داشته باشند
 *    تا لینک مرده باقی نماند.
 */

export interface PanelPageInfo {
  title: string;
  phase: number;
  note: string;
}

export const CUSTOMER_PAGES: Record<string, PanelPageInfo> = {
  '/panel': { title: 'داشبورد', phase: 7, note: 'خلاصهی سفارشها و وضعیتها' },
  '/panel/projects': { title: 'سفارشهای من', phase: 7, note: 'فهرست و تاریخچهی سفارشها' },
  '/panel/projects/new': { title: 'ثبت سفارش جدید', phase: 7, note: 'فرم ثبت سفارش و بارگذاری فایل' },
  '/panel/messages': { title: 'پیامها', phase: 9, note: 'گفتگو با مدیر پیرامون هر سفارش' },
  '/panel/wallet': { title: 'کیف پول', phase: 10, note: 'موجودی، شارژ و تراکنشها' },
  '/panel/notifications': { title: 'اعلانها', phase: 9, note: 'اعلانهای درونسامانهای و تلگرام' },
  '/panel/profile': { title: 'پروفایل من', phase: 6, note: 'تنظیمات حساب — در `/profile/` فعال است' },
};

export const ADMIN_PAGES: Record<string, PanelPageInfo> = {
  '/admin': { title: 'داشبورد مدیر', phase: 8, note: 'نمای کلی سفارشها و صف کاری' },
  '/admin/projects': { title: 'سفارشها', phase: 8, note: 'مدیریت و تغییر وضعیت سفارشها' },
  '/admin/payments': { title: 'بررسی پرداختها', phase: 10, note: 'تأیید رسیدها و پرداختها' },
  '/admin/wallets': { title: 'کیف پولها', phase: 10, note: 'موجودی و تراکنشهای کاربران' },
  '/admin/refunds': { title: 'برگشت وجه', phase: 11, note: 'درخواستها و پردازش استرداد' },
  '/admin/users': { title: 'کاربران', phase: 12, note: 'فهرست کاربران و نقشها' },
  '/admin/settings': { title: 'تنظیمات', phase: 12, note: 'نرخها، استانداردها و تنظیمات سامانه' },
};

/** تمام پارامترهای لازم برای `generateStaticParams` در خروجی استاتیک. */
export function slugsFor(groups: NavGroup[], prefix: string): Array<{ slug: string[] }> {
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
      note: 'صفحهای از پنل کاربری',
    }
  );
}

export const CUSTOMER_GROUPS = CUSTOMER_NAV;
export const ADMIN_GROUPS = ADMIN_NAV;
