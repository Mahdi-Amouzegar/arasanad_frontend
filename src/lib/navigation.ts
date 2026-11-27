import type { IconName } from '@/components/ui/Icon';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** شمارنده‌ی اختیاری (اعلان‌های خوانده‌نشده و…) */
  badge?: number;
}

export interface NavGroup {
  /** برچسب گروه — در سایدبار نمایش داده می‌شود */
  label?: string;
  items: NavItem[];
}

/** ناوبری پنل سفارش‌دهنده. */
export const CUSTOMER_NAV: NavGroup[] = [
  {
    items: [
      { href: '/panel', label: 'داشبورد', icon: 'activity' },
      { href: '/panel/projects', label: 'سفارشات من', icon: 'file' },
      { href: '/panel/projects/new', label: 'ثبت سفارش جدید', icon: 'plus' },
      { href: '/panel/projects/operations', label: 'سفارش‌گردانی', icon: 'activity' },
      { href: '/panel/projects/delivery', label: 'تحویل و اصلاح', icon: 'package' },
      { href: '/panel/files', label: 'فایل‌های من', icon: 'fileText' },
    ],
  },
  {
    label: 'ارتباط و مالی',
    items: [
      { href: '/panel/messages', label: 'پیام‌ها', icon: 'message' },
      { href: '/panel/wallet', label: 'کیف پول', icon: 'wallet' },
      { href: '/panel/pay', label: 'پرداخت / شارژ', icon: 'card' },
      { href: '/panel/notifications', label: 'اعلان‌ها', icon: 'inbox' },
    ],
  },
  {
    label: 'حساب',
    items: [{ href: '/panel/profile', label: 'پروفایل من', icon: 'user' }],
  },
];

/** ناوبری پنل مدیر. */
export const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { href: '/admin', label: 'داشبورد', icon: 'activity' },
      { href: '/admin/projects', label: 'سفارشات سامانه', icon: 'file' },
      { href: '/admin/payments', label: 'بررسی پرداخت‌ها', icon: 'card' },
      { href: '/admin/messages', label: 'پیام‌ها', icon: 'message' },
    ],
  },
  {
    label: 'مالی',
    items: [
      { href: '/admin/wallets', label: 'کیف پول‌ها', icon: 'wallet' },
      { href: '/admin/refunds', label: 'برگشت وجه', icon: 'bank' },
      { href: '/admin/reconciliation', label: 'گزارش مغایرت', icon: 'receipt' },
    ],
  },
  {
    label: 'مدیریت',
    items: [
      { href: '/admin/users', label: 'کاربران', icon: 'user' },
      { href: '/admin/files', label: 'فایل‌های موجود', icon: 'fileText' },
      { href: '/admin/pricing', label: 'قیمتگذاری', icon: 'receipt' }, // fa-ignore — برچسب دقیق قرارداد
      { href: '/pricing', label: 'نرخ‌نامه', icon: 'receipt' },
      { href: '/portfolio', label: 'نمونه‌کارها', icon: 'package' },
      { href: '/admin/settings', label: 'تنظیمات', icon: 'settings' },
      { href: '/admin/audit', label: 'سوابق حسابرسی', icon: 'shield' },
    ],
  },
];

/** ناوبری عمومی (صفحات بدون پنل). */
export const PUBLIC_NAV: NavGroup[] = [
  {
    items: [
      { href: '/', label: 'صفحه اصلی', icon: 'activity' },
      { href: '/services/', label: 'خدمات', icon: 'sparkles' },
      { href: '/pricing/', label: 'نرخ‌نامه', icon: 'receipt' },
      { href: '/portfolio/', label: 'نمونه‌کارها', icon: 'package' },
      { href: '/faq/', label: 'پرسش‌های متداول', icon: 'message' },
      { href: '/revision-policy/', label: 'سیاست اصلاح', icon: 'shield' },
      { href: '/about/', label: 'درباره ما', icon: 'user' },
      { href: '/contact/', label: 'تماس با ما', icon: 'message' },
    ],
  },
];

/** لنگرهای درون صفحه‌ی اصلی — در ستون کنار راست، زیر ناوبری. */
export const PUBLIC_ANCHORS: NavItem[] = [
  { href: '/#services', label: 'خدمات ما', icon: 'sparkles' },
  { href: '/#how', label: 'نحوه‌ی سفارش', icon: 'clock' },
];

/**
 * نوار پایین موبایل (design.md §4.6 — حداکثر ۵ آیتم).
 * «محاسبه نرخ» آیتم میانی و برجسته است؛ بقیه‌ی صفحات از Drawer در دسترساند.
 */
export const PUBLIC_MOBILE_NAV: NavItem[] = [
  { href: '/', label: 'خانه', icon: 'activity' },
  { href: '/pricing/', label: 'نرخ‌نامه', icon: 'receipt' },
  { href: '/calculator/', label: 'محاسبه نرخ', icon: 'receipt' },
  { href: '/contact/', label: 'تماس', icon: 'message' },
  { href: '/login/', label: 'ورود', icon: 'user' },
];
