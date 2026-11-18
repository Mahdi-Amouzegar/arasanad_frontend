/* eslint-disable @next/next/no-img-element --
   آواتار از مسیر مجاز Backend (لینک موقت Parspack) می‌آید و دامنه‌اش در زمان build
   معلوم نیست. بهینه‌سازی تصویر Next با `images.unoptimized` در خروجی استاتیک
   غیرفعال است، پس <img> با ابعاد صریح و lazy انتخاب درست است. */

import { cx } from '@/lib/cx';
import { API_BASE } from '@/lib/api';

export type AvatarSize = 'sm' | 'md' | 'lg';

/**
 * فاز ۱۲٫۸-ج: بک‌اند آدرس نسبی `/media/avatar/<userId>` را برمی‌گرداند.
 * اگر همان آدرس بدون آنکه با مبدأ API ترکیب شود در `<img>` استفاده شود،
 * مرورگر آن را از دامنهٔ سایت (`arasanad.ir`) می‌گیرد و ۴۰۴ می‌دهد.
 * این تابع تنها مسیرهای آواتار نسبی را اصلاح می‌کند و بقیه نشانی‌ها
 * (لینکهای مطلق خارجی) دستنخورده می‌ماند.
 */
export function resolveAvatarSrc(src?: string | null): string | null {
  if (!src) return null;
  if (src.startsWith('/media/avatar/')) return `${API_BASE}${src}`;
  return src;
}

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
  const resolved = resolveAvatarSrc(src);

  if (resolved) {
    return (
      <img
        src={resolved}
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
