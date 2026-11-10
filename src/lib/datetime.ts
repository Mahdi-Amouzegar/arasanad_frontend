/**
 * قالب‌بندی اعداد، مبالغ و تاریخ.
 *
 * ⚠️ قواعد قطعی (design.md §11):
 *   - ذخیره‌سازی تاریخ همیشه UTC است؛ تبدیل و قالب‌بندی فقط اینجا انجام می‌شود.
 *   - نمایش تاریخ به شمسی، با منطقه‌ی زمانی Asia/Tehran.
 *   - اعداد رابط کاربری با رقم فارسی؛ شناسه‌ها و مقادیر فنی با رقم لاتین.
 */

import { toJalali, jalaliMonthName } from './jalali';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/** تبدیل ارقام لاتین به فارسی. */
export function toFaDigits(value: string): string {
  return value.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)] ?? d);
}

/** عدد با جداکننده‌ی هزارگان و رقم فارسی. */
export function formatNumberFa(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return toFaDigits(value.toLocaleString('en-US'));
}

/** مبلغ به تومان با رقم فارسی و جداکننده‌ی هزارگان. */
export function formatMoneyFa(toman: number): string {
  if (!Number.isFinite(toman)) return '—';
  return `${formatNumberFa(Math.round(toman))} تومان`;
}

/** مبلغ بدون واحد — برای جدول‌ها که سرستون واحد دارد. */
export function formatAmountFa(toman: number): string {
  if (!Number.isFinite(toman)) return '—';
  return formatNumberFa(Math.round(toman));
}

/* ─────────────────────────── تاریخ و ساعت ─────────────────────────── */

const TEHRAN_TZ = 'Asia/Tehran';

export interface TehranParts {
  gy: number;
  gm: number;
  gd: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TEHRAN_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

/** اجزای تاریخ و ساعت در منطقه‌ی تهران. */
export function tehranParts(input: string | Date): TehranParts | null {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;

  const parts = partsFormatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((p) => p.type === type);
    return found ? Number(found.value) : 0;
  };

  return {
    gy: pick('year'),
    gm: pick('month'),
    gd: pick('day'),
    hour: pick('hour'),
    minute: pick('minute'),
    second: pick('second'),
  };
}

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

export interface JalaliDisplay {
  jy: number;
  jm: number;
  jd: number;
  hour: number;
  minute: number;
  second: number;
}

/** تبدیل هر ورودی زمانی به اجزای جلالی در منطقه‌ی تهران. */
export function toJalaliDisplay(input: string | Date): JalaliDisplay | null {
  const p = tehranParts(input);
  if (!p) return null;
  const j = toJalali(p.gy, p.gm, p.gd);
  return { ...j, hour: p.hour, minute: p.minute, second: p.second };
}

/** `۱۴۰۵/۰۸/۱۸ - ۱۵:۳۰` */
export function formatDateShort(input: string | Date): string {
  const d = toJalaliDisplay(input);
  if (!d) return '—';
  return toFaDigits(
    `${d.jy}/${pad2(d.jm)}/${pad2(d.jd)} - ${pad2(d.hour)}:${pad2(d.minute)}`,
  );
}

/** `۱۸ آبان ۱۴۰۵، ساعت ۱۵:۳۰:۴۵` */
export function formatDateFull(input: string | Date): string {
  const d = toJalaliDisplay(input);
  if (!d) return '—';
  return toFaDigits(
    `${d.jd} ${jalaliMonthName(d.jm)} ${d.jy}، ساعت ${pad2(d.hour)}:${pad2(d.minute)}:${pad2(
      d.second,
    )}`,
  );
}

/** فقط ساعت: `۱۵:۳۰` */
export function formatTime(input: string | Date): string {
  const d = toJalaliDisplay(input);
  if (!d) return '—';
  return toFaDigits(`${pad2(d.hour)}:${pad2(d.minute)}`);
}

/** فقط تاریخ بدون ساعت: `۱۴۰۵/۰۸/۱۸` */
export function formatDateOnly(input: string | Date): string {
  const d = toJalaliDisplay(input);
  if (!d) return '—';
  return toFaDigits(`${d.jy}/${pad2(d.jm)}/${pad2(d.jd)}`);
}

/**
 * زمان نسبی برای فهرست‌های اخیر.
 * ⚠️ در رابط کاربری باید هر دقیقه به‌روزرسانی شود تا ثابت نماند.
 */
export function formatRelative(input: string | Date, now: Date = new Date()): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';

  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 0) return formatDateShort(input);
  if (diffSec < 60) return 'همین حالا';

  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return `${formatNumberFa(minutes)} دقیقه پیش`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${formatNumberFa(hours)} ساعت پیش`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'دیروز';
  if (days < 7) return `${formatNumberFa(days)} روز پیش`;

  return formatDateShort(input);
}

/** نمایش تاریخ میلادی برای Tooltip. */
export function formatGregorianIso(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().replace('T', ' ').slice(0, 19);
}
