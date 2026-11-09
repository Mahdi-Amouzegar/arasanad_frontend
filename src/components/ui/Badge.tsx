import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  tone?: BadgeTone;
  /** نمایش نقطه‌ی رنگی کنار متن */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * نشان وضعیت.
 * ⚠️ طبق design.md §5.4: رنگ به‌تنهایی نباید تنها راه تشخیص وضعیت باشد،
 *    پس همیشه متن هم نمایش داده می‌شود.
 */
export function Badge({ tone = 'neutral', dot = false, children, className }: BadgeProps) {
  return (
    <span className={cx('badge', `badge--${tone}`, className)}>
      {dot ? <span className="badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
