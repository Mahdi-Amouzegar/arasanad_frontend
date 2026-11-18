'use client';

import { useEffect, useState } from 'react';
import {
  formatDateFull,
  formatDateOnly,
  formatDateShort,
  formatRelative,
} from '@/lib/datetime';
import { Tooltip } from './Tooltip';
import { serverNow } from '@/lib/connectivity/index.mjs';
import { useServerTime } from '@/lib/connectivity/useConnectivity';

export type DateVariant = 'short' | 'full' | 'date' | 'relative';

export interface JalaliDateProps {
  /** ISO UTC (مثلاً 2026-11-09T11:30:45.123Z) */
  value: string | Date;
  variant?: DateVariant;
  /** نمایش تاریخ کامل شمسی در تولتیپ (پیش‌فرض: بله) */
  withTooltip?: boolean;
  className?: string;
}

function render(value: string | Date, variant: DateVariant, now?: Date): string {
  switch (variant) {
    case 'full':
      return formatDateFull(value);
    case 'date':
      return formatDateOnly(value);
    case 'relative':
      return formatRelative(value, now);
    default:
      return formatDateShort(value);
  }
}

/**
 * نمایش تاریخ شمسی.
 * ⚠️ ورودی همیشه UTC است؛ تبدیل به شمسی و منطقه‌ی تهران همین‌جا انجام می‌شود.
 * ⚠️ تولتیپ، تاریخ کامل شمسی با ارقام فارسی نشان می‌دهد (نه میلادی).
 */
export function JalaliDate({
  value,
  variant = 'short',
  withTooltip = true,
  className,
}: JalaliDateProps) {
  const text = render(value, variant);
  const iso = new Date(value).toISOString();

  const node = (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );

  if (!withTooltip) return node;

  return <Tooltip label={formatDateFull(value)}>{node}</Tooltip>;
}

/**
 * زمان نسبی زنده — هر دقیقه یک بار به‌روز می‌شود.
 * ⚠️ طبق design.md §11.1: زمان نسبی نباید ثابت بماند.
 */
export function RelativeTime({
  value,
  className,
  windowDays,
}: {
  value: string | Date;
  className?: string;
  windowDays?: number;
}) {
  // ⚠️ «اکنون» فقط از کتابخانه‌ی اتصال می‌آید؛ `new Date()` مستقیم
  //    باعث دوباره‌کاری و ناهماهنگی با ساعت سرور می‌شد.
  const clock = useServerTime();
  const [now, setNow] = useState<Date>(() => serverNow());

  useEffect(() => {
    const id = setInterval(() => setNow(serverNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setNow(serverNow());
  }, [clock.phase, clock.syncedAt]);

  const iso = new Date(value).toISOString();

  return (
    <Tooltip label={formatDateFull(value)} pinnable>
      <time dateTime={iso} className={className} suppressHydrationWarning>
        {formatRelative(value, now, { windowDays })}
      </time>
    </Tooltip>
  );
}
