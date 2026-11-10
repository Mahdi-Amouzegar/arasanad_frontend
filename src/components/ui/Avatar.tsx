/* eslint-disable @next/next/no-img-element --
   آواتار از مسیر مجاز Backend (لینک موقت Parspack) می‌آید و دامنه‌اش در زمان build
   معلوم نیست. بهینه‌سازی تصویر Next با `images.unoptimized` در خروجی استاتیک
   غیرفعال است، پس <img> با ابعاد صریح و lazy انتخاب درست است. */

import { cx } from '@/lib/cx';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  /** آدرس تصویر — در آینده لینک موقت از Backend */
  src?: string | null;
  /** نام نمایشی برای fallback و برچسب دسترس‌پذیری */
  name: string;
  size?: AvatarSize;
  className?: string;
}

const SIZES: Record<AvatarSize, number> = { sm: 28, md: 36, lg: 48 };

/** حرف اول نام برای آواتار پیش‌فرض. */
function initial(name: string): string {
  const clean = name.trim();
  return clean.length > 0 ? (clean[0] ?? '؟') : '؟';
}

/**
 * آواتار کاربر.
 * ⚠️ اگر تصویر نبود، حرف اول نام نمایش داده می‌شود — بدون درخواست شبکه.
 */
export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const px = SIZES[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={px}
        height={px}
        loading="lazy"
        className={cx('avatar', className)}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <span
      className={cx('avatar avatar--fallback', className)}
      style={{ width: px, height: px, fontSize: Math.round(px * 0.42) }}
      role="img"
      aria-label={name}
    >
      {initial(name)}
    </span>
  );
}
