import Link from 'next/link';
import type { CSSProperties } from 'react';
import { cx } from '@/lib/cx';

/**
 * لوگوی آراسند با انیمیشن چهاربخشی.
 * ⚠️ بخش‌ها با تأخیر پله‌ای از بیرون به جای خود می‌آیند (بازسازی انیمیشن نسخه‌ی قبلی).
 * ⚠️ در `prefers-reduced-motion` انیمیشن خاموش می‌شود.
 */
export function Logo({ className, href = '/' }: { className?: string; href?: string }) {
  const parts: Array<{
    text: string;
    tx: string;
    ty: string;
    delay: string;
    accent?: boolean;
  }> = [
    { text: 'آ', tx: '-30px', ty: '-20px', delay: '0.05s' },
    { text: 'ر', tx: '26px', ty: '-24px', delay: '0.18s' },
    { text: 'ا', tx: '-22px', ty: '22px', delay: '0.31s' },
    { text: 'سند', tx: '34px', ty: '18px', delay: '0.44s', accent: true },
  ];

  return (
    <Link href={href} className={cx('logo', className)} aria-label="آراسند — صفحه اصلی">
      {parts.map((part) => (
        <span
          key={part.text}
          className={cx('logo__part', part.accent && 'logo__part--accent')}
          style={
            {
              '--tx': part.tx,
              '--ty': part.ty,
              animationDelay: part.delay,
            } as CSSProperties
          }
        >
          {part.text}
        </span>
      ))}
    </Link>
  );
}
