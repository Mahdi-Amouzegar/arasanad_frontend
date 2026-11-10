import type { SVGProps } from 'react';

/**
 * مجموعه‌ی آیکون یکپارچه.
 *
 * ⚠️ طبق design.md §3.4: سبک آیکون‌ها در کل سایت یکسان است (خطی، stroke 1.8).
 * ⚠️ آیکون تزئینی باید `aria-hidden` باشد؛ اگر تنها حامل معناست، برچسب متنی لازم است.
 */

export type IconName =
  | 'pencil'
  | 'clock'
  | 'alert'
  | 'x'
  | 'check'
  | 'checkCircle'
  | 'file'
  | 'card'
  | 'send'
  | 'refresh'
  | 'inbox'
  | 'message'
  | 'download'
  | 'user'
  | 'settings'
  | 'search'
  | 'plus'
  | 'chevronDown';

const PATHS: Record<IconName, string> = {
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 3',
  alert: 'M12 3 2 21h20Z M12 9v5 M12 17.5v.5',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'm20 6-11 11-5-5',
  checkCircle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m-4 9 3 3 5-5',
  file: 'M6 3h9l5 5v13H6zM15 3v5h5',
  card: 'M2 6h20v12H2zM2 10h20',
  send: 'M22 3 2 11l6 2 2 6 3-4 5 4z',
  refresh: 'M21 12a9 9 0 1 1-3-6.7M21 3v5h-5',
  inbox: 'M3 12h5l2 3h4l2-3h5M3 12 6 4h12l3 8v8H3z',
  message: 'M21 12a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 0 1 8-8h2a8 8 0 0 1 8 4Z',
  download: 'M12 3v12M7 11l5 5 5-5M4 21h16',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  chevronDown: 'm6 9 6 6 6-6',
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
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
