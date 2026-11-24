/**
 * داده‌ی اولیه‌ی کاتالوگ.
 *
 * ⚠️ در فاز ۴ این داده‌ها محلی‌اند تا صفحات عمومی بدون بک‌اند ساخته شوند.
 *    در فاز ۷ (مدیریت پروژه‌ها) از API خوانده می‌شوند و این فایل فقط
 *    به‌عنوان داده‌ی اولیه و پشتیبان (fallback) باقی می‌ماند.
 */

export interface ServiceType {
  id: string;
  name: string;
  /** نرخ پایه برای هر صفحه، به تومان */
  pricePerPage: number;
  unit: 'page' | 'minute';
  description: string;
  isPopular?: boolean;
}

export const SERVICE_TYPES: ServiceType[] = [
  {
    id: 'fa',
    name: 'تایپ ساده',
    pricePerPage: 34_000,
    unit: 'page',
    description: 'تایپ متن ساده؛ زبان سند به‌صورت جداگانه انتخاب می‌شود',
    isPopular: true,
  },
  {
    id: 'math',
    name: 'ریاضی',
    pricePerPage: 53_000,
    unit: 'page',
    description: 'تایپ متون حاوی فرمول ریاضی',
  },
  {
    // فاز ۱۲٫۹-ز: سه نوع «جدول فارسی/عربی/انگلیسی» به یک گزینه‌ی واحد بدل شدند.
    // زبان محتوا در فیلد مستقل `language` انتخاب می‌شود.
    id: 'table-fa',
    name: 'جدول',
    pricePerPage: 51_000,
    unit: 'page',
    description: 'تایپ جدول؛ زبان محتوا به‌صورت جداگانه انتخاب می‌شود',
  },
  {
    id: 'fa-math',
    name: 'متن-فرمول',
    pricePerPage: 44_000,
    unit: 'page',
    description: 'متن همراه با فرمول',
  },
  {
    id: 'fa-table',
    name: 'متن-جدول',
    pricePerPage: 43_000,
    unit: 'page',
    description: 'متن همراه با جدول',
  },
];

/* ─────────────────────────── گزینه‌های فرم ─────────────────────────── */


export const SOURCE_TYPES = ['چاپی', 'دست‌نویس', 'ترکیبی'] as const;

export const OUTPUT_FORMATS = ['PDF', 'Word'] as const;

/** استانداردهای آماده — مقادیر در فاز ۱۲ توسط مدیر تأیید می‌شوند */
export const DESIGN_STANDARDS = [
  { id: 'manual', name: 'بدون استاندارد (دستی)' },
  { id: 'azad', name: 'استاندارد دانشگاه آزاد' },
  { id: 'pnu', name: 'استاندارد دانشگاه پیام نور' },
  { id: 'msrt', name: 'استاندارد وزارت علوم' },
] as const;

/* ─────────────────────────── نمونه‌کارها ─────────────────────────── */

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  /** نام فایل در public/images/portfolio */
  file: string;
}

export const PORTFOLIO_CATEGORIES = [
  'همه',
  'پایان‌نامه',
  'فرمول',
  'جدول',
  'شعر',
  'کتاب',
  'فرم',
] as const;

export const PORTFOLIO_ITEMS: PortfolioItem[] = [
  { id: 'p1', title: 'نمونه امتحان عربی', category: 'جدول', file: 'sample-1.avif' },
  { id: 'p2', title: 'رسم چارت در Word', category: 'فرمول', file: 'sample-2.avif' },
  { id: 'p3', title: 'قالب‌بندی شعر', category: 'شعر', file: 'sample-3.avif' },
  { id: 'p4', title: 'رسم نمودار و فرمول', category: 'فرمول', file: 'sample-4.avif' },
  { id: 'p5', title: 'برگی از کتاب آموزش خیاطی', category: 'کتاب', file: 'sample-5.avif' },
  { id: 'p6', title: 'طراحی فرم با InDesign', category: 'فرم', file: 'sample-6.avif' },
];
