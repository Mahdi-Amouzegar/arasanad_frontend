'use client';

import { Icon, type IconName } from './Icon';
import { cx } from '@/lib/cx';
import { THEME_CHOICES, useTheme, type ThemeChoice } from '@/lib/theme';

const ICONS: Record<ThemeChoice, IconName> = {
  system: 'monitor',
  light: 'sun',
  dark: 'moon',
};

const NEXT: Record<ThemeChoice, ThemeChoice> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

export interface ThemeToggleProps {
  /** `segmented` = پروفایل (سه گزینه)، `compact` = سایدبار/هدر (یک دکمه چرخشی) */
  variant?: 'segmented' | 'compact';
  className?: string;
}

/** انتخاب دستی تم — design.md §3.7، جبران عقبماندگی فاز ۶. */
export function ThemeToggle({ variant = 'segmented', className }: ThemeToggleProps) {
  const [choice, setChoice] = useTheme();

  if (variant === 'compact') {
    const next = NEXT[choice];
    return (
      <button
        type="button"
        className={cx('theme-toggle-compact', className)}
        onClick={() => setChoice(next)}
        aria-label={`تم: ${THEME_CHOICES.find((item) => item.value === choice)?.label}. برای تغییر کلیک کنید`}
        title="تغییر تم"
      >
        <Icon name={ICONS[choice]} size={18} />
      </button>
    );
  }

  return (
    <div className={cx('theme-toggle', className)} role="group" aria-label="انتخاب تم">
      {THEME_CHOICES.map((item) => (
        <button
          key={item.value}
          type="button"
          className="theme-toggle__option"
          aria-pressed={choice === item.value}
          onClick={() => setChoice(item.value)}
        >
          <Icon name={ICONS[item.value]} size={15} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
