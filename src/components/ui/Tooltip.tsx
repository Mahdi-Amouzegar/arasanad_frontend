'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  /** متن راهنما */
  label: string;
  children: ReactNode;
  /**
   * فاز ۱۲٫۳-و: با کلیک، تولتیپ پین شود تا کاربران بدون هاور (موبایل)
   * هم به تاریخ دقیق دسترسی داشته باشند. کلیک بیرون،  آن را می‌بندد.
   */
  pinnable?: boolean;
}

/**
 * فاز ۱۲٫۹: پینشدن با کلیک، رفتار پیش‌فرض همه‌ی تولتیپهاست و با کلیک
 * بیرون بسته می‌شود؛ بنابراین نیازی به تنظیم جداگانه در هر مصرف‌کننده نیست.
 */

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
 * ⚠️ از Portal استفاده می‌شود تا `overflow` جدول یا کارت  آن را نبرد.
 */
export function Tooltip({ label, children, pinnable = true }: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const [pinned, setPinned] = useState(false);

  /**
   * فاز ۱۲٫۱۲-د: تولتیپهایی که داخلdialogها باز می‌شوند نباید زیر لایه‌ی
   * overlay بروند. با `popover=manual` وارد لایه‌ی بالای مرورگر می‌شوند و
   * حتی رویdialogهای `showModal` قابل خواندناند.
   */
  useEffect(() => {
    const el = tooltipRef.current as (HTMLSpanElement & {
      showPopover?: () => void;
      hidePopover?: () => void;
      matches?: (selector: string) => boolean;
    }) | null;
    if (!el) return undefined;
    if (typeof el.showPopover === 'function' && !el.matches?.(':popover-open')) el.showPopover();
    return () => {
      if (typeof el.hidePopover === 'function' && el.matches?.(':popover-open')) el.hidePopover();
    };
  }, [position]);

  const place = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      // فاصله از لبه‌ی راست پنجره تا لبه‌ی راست عنصر
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  const show = () => place();
  const hide = () => {
    if (!pinned) setPosition(null);
  };

  const togglePin = () => {
    if (!pinnable) return;
    if (pinned) {
      setPinned(false);
      setPosition(null);
      return;
    }
    setPinned(true);
    place();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (!pinnable || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    togglePin();
  };

  useEffect(() => {
    if (!pinned) return;
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      setPinned(false);
      setPosition(null);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [pinned]);

  return (
    <span
      ref={anchorRef}
      className="tooltip-anchor"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={togglePin}
      onKeyDown={onKeyDown}
      role={pinnable ? 'button' : undefined}
      tabIndex={pinnable ? 0 : undefined}
      aria-expanded={pinnable ? Boolean(position) : undefined}
      aria-describedby={position ? id : undefined}
    >
      {children}
      {position
        ? createPortal(
            <span
              ref={tooltipRef}
              role="tooltip"
              id={id}
              className="tooltip"
              popover="manual"
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
