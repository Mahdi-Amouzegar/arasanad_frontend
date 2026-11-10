'use client';

import { useEffect, useState } from 'react';
import {
  formatDateFull,
  formatDateOnly,
  formatDateShort,
  formatRelative,
  formatGregorianIso,
} from '@/lib/datetime';

export type DateVariant = 'short' | 'full' | 'date' | 'relative';

export interface JalaliDateProps {
  /** ISO UTC (مثلاً 2026-11-09T11:30:45.123Z) */
  value: string | Date;
  variant?: DateVariant;
  /** نمایش تاریخ میلادی در Tooltip (پیش‌فرض: بله) */
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
 */
export function JalaliDate({
  value,
  variant = 'short',
  withTooltip = true,
  className,
}: JalaliDateProps) {
  const text = render(value, variant);
  return (
    <time
      dateTime={new Date(value).toISOString()}
      title={withTooltip ? formatGregorianIso(value) : undefined}
      className={className}
      suppressHydrationWarning
    >
      {text}
    </time>
  );
}

/**
 * زمان نسبی زنده — هر دقیقه یک بار به‌روز می‌شود.
 * ⚠️ طبق design.md §11.1: زمان نسبی نباید ثابت بماند.
 */
export function RelativeTime({ value, className }: { value: string | Date; className?: string }) {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <time
      dateTime={new Date(value).toISOString()}
      title={formatGregorianIso(value)}
      className={className}
      suppressHydrationWarning
    >
      {formatRelative(value, now)}
    </time>
  );
}
