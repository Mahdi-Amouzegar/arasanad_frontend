'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';
import { AccountMenu } from './AccountMenu';
import { Icon } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { cx } from '@/lib/cx';
import { PUBLIC_ANCHORS, PUBLIC_NAV } from '@/lib/navigation';
import { BRAND } from '@/content/site';
import { useAdminTelegram } from '@/lib/site-config';

/**
 * ستون کنار راست صفحات عمومی.
 * ⚠️ روی دسکتاپ ثابت است؛ در موبایل پنهان و از طریق Drawer هدر باز می‌شود.
 * ⚠️ بند ۴٫۵ design.md: کارت اقدام/حساب **پایین** ستون قرار میگیرد،
 *    نه بالا؛ بههمین دلیل CTA و تم به `public-side__foot` منتقل شدند.
 */
export function SiteSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const adminTelegram = useAdminTelegram(BRAND.adminTelegram);

  const isActive = (href: string): boolean => {
    if (href === '/') return pathname === '/' || pathname === '';
    return pathname.startsWith(href.replace(/\/$/, ''));
  };

  return (
    <div className="public-side__inner">
      <div className="public-side__top">
        <Logo className="public-side__brand" />
        <AccountMenu />
      </div>

      <nav className="public-side__nav" aria-label="ناوبری اصلی">
        {PUBLIC_NAV[0]?.items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cx('public-side__link', item.href === '/pricing/' && 'public-side__link--featured')}
            aria-current={isActive(item.href) ? 'page' : undefined}
            onClick={onNavigate}
          >
            <Icon name={item.icon} size={17} />
            <span>{item.label}</span>
          </Link>
        ))}

        <p className="public-side__group-label">روی صفحه‌ی اصلی</p>
        {PUBLIC_ANCHORS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="public-side__link public-side__link--anchor"
            onClick={onNavigate}
          >
            <Icon name={item.icon} size={16} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="public-side__foot">
        {/* دعوت دائمی به اقدام — یک مسیر تبدیل واحد در تمام صفحات */}
        <div className="public-side__cta">
          <span className="public-side__cta-icon" aria-hidden="true">
            <Icon name="sparkles" size={18} />
          </span>
          <strong>سندتان را آماده کنیم؟</strong>
          <p>نوع خدمت و تعداد صفحه را بدهید؛ برآورد هزینه همان لحظه نشان داده می‌شود.</p>
          <Link href="/start/" className="btn btn--primary btn--block btn--sm" onClick={onNavigate}>
            شروع سفارش
          </Link>
          <Link href="/login/" className="public-side__cta-link" onClick={onNavigate}>
            ورود به حساب
          </Link>
        </div>

        <div className="public-side__theme">
          <span>نمایش</span>
          <ThemeToggle variant="compact" />
        </div>

        <p>{BRAND.hours}</p>
        <p style={{ marginTop: 4 }}>
          <a href={`https://t.me/${adminTelegram}`} className="public-side__tel">
            تلگرام: <span className="ltr">@{adminTelegram}</span>
          </a>
        </p>
      </div>
    </div>
  );
}
