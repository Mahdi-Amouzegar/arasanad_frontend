'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  /** متن راهنما */
  label: string;
  children: ReactNode;
}

/**
 * تولتیپ سفارشی.
 *
 * ⚠️ چرا از `title` بومی استفاده نمی‌کنیم:
 *    تولتیپ مرورگر همیشه پایین-راست نشانگر ظاهر می‌شود که در رابط راست‌به‌چپ
 *    ناهماهنگ است، ظاهرش قابل استایل‌دادن نیست و با تأخیر زیاد نشان داده می‌شود.
 *
 * ⚠️ موقعیت: پایین و سمت چپ نشانگر. لبه‌ی راست تولتیپ با لبه‌ی راست عنصر
 *    هم‌تراز می‌شود و به سمت چپ باز می‌شود — هماهنگ با جهت خواندن فارسی.
 *
 * ⚠️ از Portal استفاده می‌شود تا `overflow` جدول یا کارت آن را نبرد.
 */
export function Tooltip({ label, children }: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);

  const show = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      // فاصله از لبه‌ی راست پنجره تا لبه‌ی راست عنصر
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  const hide = () => setPosition(null);

  return (
    <span
      ref={anchorRef}
      className="tooltip-anchor"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={position ? id : undefined}
    >
      {children}
      {position
        ? createPortal(
            <span
              role="tooltip"
              id={id}
              className="tooltip"
              style={{ top: position.top, right: position.right }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
