import type { SVGProps } from 'react';

/**
 * مجموعه‌ی آیکون یکپارچه.
 *
 * ⚠️ قواعد خانواده‌ی بصری (design.md §3.4):
 *   - همه با viewBox یکسان ۲۴×۲۴
 *   - همه خطی (fill: none)، ضخامت خط ۱.۸
 *   - سر و گوشه‌ی خطوط گرد
 *   - بدون آیکون تودرتو یا دو‌رنگ
 *
 * ⚠️ هر مفهوم وضعیت باید آیکون متمایز داشته باشد؛ یک آیکون برای دو مفهوم
 *    مختلف استفاده نمی‌شود (جز در خانواده‌های متفاوت که معنای یکسانی دارند).
 */

export type IconName =
  /* پیش‌نویس و ویرایش */
  | 'pencil'
  | 'penLine'
  /* انتظار */
  | 'clock'
  | 'hourglass'
  /* تأیید و رد */
  | 'check'
  | 'checkCircle'
  | 'x'
  | 'xCircle'
  /* مالی */
  | 'card'
  | 'wallet'
  | 'coins'
  | 'receipt'
  | 'bank'
  /* جریان کار */
  | 'activity'
  | 'inbox'
  | 'package'
  | 'download'
  | 'send'
  | 'refresh'
  | 'pieChart'
  /* عمومی */
  | 'alert'
  | 'file'
  | 'message'
  | 'user'
  | 'settings'
  | 'search'
  | 'plus'
  | 'menu'
  | 'chevronDown'
  /* ورود و کد یکبارمصرف / QR */
  | 'key'
  | 'copy'
  | 'qr'
  | 'camera'
  /* تم */
  | 'sun'
  | 'moon'
  | 'monitor'
  /* صفحات عمومی */
  | 'star'
  | 'shield'
  | 'sparkles';

const PATHS: Record<IconName, string> = {
  /* ─── پیش‌نویس و ویرایش ─── */
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  penLine: 'M4 20h16M14 4l3 3-8 8H6v-3Z',

  /* ─── انتظار ─── */
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 3',
  hourglass: 'M7 3h10M7 21h10M8.5 3v3.4L12 11.5l3.5-5.1V3M8.5 21v-3.4L12 12.5l3.5 5.1V21',

  /* ─── تأیید و رد ─── */
  check: 'm20 6-11 11-5-5',
  checkCircle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m-4 9 3 3 5-5',
  x: 'M18 6 6 18M6 6l12 12',
  xCircle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M9.5 9.5l5 5M14.5 9.5l-5 5',

  /* ─── مالی ─── */
  card: 'M2 6h20v12H2zM2 10h20',
  wallet:
    'M19 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M19 8h-4.5a3 3 0 0 0 0 6H19',
  coins:
    'M8 8.5c3.3 0 6 1.1 6 2.5s-2.7 2.5-6 2.5-6-1.1-6-2.5 2.7-2.5 6-2.5ZM2 11v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 8h6M9 12h5',
  bank: 'M3 10 12 4l9 6M5 10v9h14v-9M9.5 19v-6h5v6',

  /* ─── جریان کار ─── */
  activity: 'M3 12h4l3 8 4-16 3 8h4',
  inbox: 'M3 12h5l2 3h4l2-3h5M3 12 6 4h12l3 8v8H3z',
  package: 'M12 3 3 7.5v9L12 21l9-4.5v-9L12 3ZM3 7.5 12 12l9-4.5M12 12v9',
  download: 'M12 3v12M7 11l5 5 5-5M4 21h16',
  send: 'M22 3 2 11l6 2 2 6 3-4 5 4z',
  refresh: 'M21 12a9 9 0 1 1-3-6.7M21 3v5h-5',
  pieChart: 'M12 3a9 9 0 1 0 9 9h-9Z',

  /* ─── عمومی ─── */
  alert: 'M12 3 2 21h20ZM12 9v5M12 17.5v.5',
  file: 'M6 3h9l5 5v13H6zM15 3v5h5',
  message: 'M21 12a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 0 1 8-8h2a8 8 0 0 1 8 4Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  /* منوی همبرگری — سه خط افقی */
  menu: 'M4 7h16M4 12h16M4 17h16',
  chevronDown: 'm6 9 6 6 6-6',
  /* کلید = کد یکبارمصرف (مفهومی جدا از قفل/رمز) */
  key: 'M10 14a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM10 14v7M10 17h3M10 20h2',
  copy: 'M9 9h11v12H9zM5 15H4V3h11v2',
  /* QR — سه مربع گوشه + ماژولهای پایین راست */
  qr: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM18 18h3v3h-3zM14 18h2M18 14v2',
  camera: 'M3 8h4l2-3h6l2 3h4v12H3zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  /* تم */
  sun: 'M12 5V3M12 21v-2M5 12H3M21 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z',
  monitor: 'M3 4h18v13H3zM8 21h8M12 17v4',
  /* صفحات عمومی */
  star: 'M12 3.5l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.9l6-.9Z',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6ZM9 12l2 2 4-4',
  sparkles:
    'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6ZM18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z',
};

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** اگر آیکون تنها حامل معناست، این را بدهید تا صفحه‌خوان بخواند */
  label?: string;
}

export function Icon({ name, size = 18, label, ...rest }: IconProps) {
  const decorative = !label;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'img'}
      aria-label={label}
      focusable="false"
      style={{ flex: 'none' }}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
