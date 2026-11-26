import type { ReactNode } from 'react';
import { cx } from '../../lib/cx';

/**
 * کامپوننت پایه و عمومی نوار زمانی / مراحل.
 *
 * ⚠️ این کامپوننت کاملاً مستقل از سفارش است: فقط آرایه‌ای از مراحل و وضعیت
 *    آنها دریافت می‌کند. هیچ APIای فراخوانی نمی‌کند، وضعیتی را تغییر نمی‌دهد
 *    و نمی‌داند «بیعانه» یا «تسویه» چیست. لایهٔ اختصاصی مصرف‌کننده
 *    (`src/lib/order-workflow.ts`) وضعیت دامنه را به این ساختار تبدیل می‌کند.
 *
 * جهت نمایش از طریق `dir` قابل تنظیم است؛ پیش‌فرض، جهت سند (RTL) است.
 * تمام فاصلهها و رنگ‌ها از Design Tokenهای پروژه می‌آیند.
 */

export type TimelineStepStatus =
  | 'completed'
  | 'current'
  | 'upcoming'
  | 'skipped'
  | 'cancelled'
  | 'error'
  | 'disabled';

export interface TimelineStep {
  /** شناسهٔ پایدار — کلید رندر و مقصد کلیک */
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  status: TimelineStepStatus;
  /** متای اختیاری مانند زمان تکمیل */
  meta?: string;
  /** غیرفعال کردن این مرحله بدون تغییر وضعیت آن */
  disabled?: boolean;
  className?: string;
}

export interface TimelineProps {
  steps: TimelineStep[];
  orientation?: 'horizontal' | 'vertical';
  /** rtl | ltr — پیش‌فرض inherit از سند */
  dir?: 'rtl' | 'ltr';
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
  showDescriptions?: boolean;
  /** نمایش شمارهٔ مرحله؛ در صورت وجود icon، icon جایگزین می‌شود */
  showNumbers?: boolean;
  showConnectors?: boolean;
  /** مرحلهٔ فعال/منتخب حتی اگر وضعیتش `current` نباشد */
  activeId?: string;
  /** قابلیت کلیک مراحل؛ پیش‌فرض زمانی که onStepClick وجود دارد */
  clickable?: boolean;
  onStepClick?: (step: TimelineStep, index: number) => void;
  /** غیرفعال کردن کل نوار */
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  emptyLabel?: string;
  ariaLabel?: string;
}

function CheckMark() {
  return (
    <svg
      className="timeline__check"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** قابلیت کلیک خالص — جدا از رندر تا قابل تست باشد. */
export function timelineStepClickable(
  step: TimelineStep,
  options: {
    clickable?: boolean;
    hasHandler: boolean;
    disabled?: boolean;
    loading?: boolean;
  },
): boolean {
  if (options.disabled || options.loading || step.disabled) return false;
  if (step.status === 'disabled' || step.status === 'cancelled') return false;
  if (!options.hasHandler) return false;
  return options.clickable !== false;
}

export function Timeline({
  steps,
  orientation = 'horizontal',
  dir,
  size = 'md',
  compact = false,
  showDescriptions = true,
  showNumbers = true,
  showConnectors = true,
  activeId,
  clickable,
  onStepClick,
  disabled = false,
  loading = false,
  className,
  emptyLabel = 'مرحلهای برای نمایش وجود ندارد',
  ariaLabel = 'مراحل فرآیند',
}: TimelineProps) {
  if (loading) {
    return (
      <div
        className={cx('timeline', 'timeline--loading', `timeline--${orientation}`, className)}
        dir={dir}
        aria-busy="true"
        aria-label={ariaLabel}
        role="status"
      >
        {[0, 1, 2, 3].map((n) => (
          <span key={n} className="timeline__skeleton" aria-hidden="true" />
        ))}
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <p className={cx('timeline__empty', className)} dir={dir} role="status">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol
      className={cx(
        'timeline',
        `timeline--${orientation}`,
        `timeline--${size}`,
        compact && 'timeline--compact',
        className,
      )}
      dir={dir}
      aria-label={ariaLabel}
      data-disabled={disabled || undefined}
    >
      {steps.map((step, index) => {
        const isActive = step.status === 'current' || step.id === activeId;
        const canClick = timelineStepClickable(step, {
          clickable,
          hasHandler: typeof onStepClick === 'function',
          disabled,
          loading,
        });
        const marker = step.icon ??
          (step.status === 'completed' ? (
            <CheckMark />
          ) : showNumbers ? (
            <span aria-hidden="true">{index + 1}</span>
          ) : (
            <span className="timeline__dot" aria-hidden="true" />
          ));
        const commonMarkerProps = {
          className: 'timeline__marker',
          'aria-current': isActive ? ('step' as const) : undefined,
        };

        return (
          <li
            key={step.id}
            className={cx(
              'timeline__step',
              `timeline__step--${step.status}`,
              isActive && 'timeline__step--active',
              canClick && 'timeline__step--clickable',
              step.className,
            )}
          >
            {showConnectors && index < steps.length - 1 ? (
              <span className="timeline__connector" aria-hidden="true" />
            ) : null}
            {canClick ? (
              <button
                {...commonMarkerProps}
                type="button"
                onClick={() => onStepClick?.(step, index)}
                aria-label={`${step.title}${step.description ? ` — ${step.description}` : ''}`}
              >
                {marker}
              </button>
            ) : (
              <span {...commonMarkerProps}>{marker}</span>
            )}
            <span className="timeline__body">
              <span className="timeline__title">{step.title}</span>
              {showDescriptions && step.description ? (
                <span className="timeline__description">{step.description}</span>
              ) : null}
              {step.meta ? <span className="timeline__meta">{step.meta}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default Timeline;
