'use client';

import Link from 'next/link';
import { CHANNELS, BRAND } from '@/content/site';
import { Icon } from '@/components/ui/Icon';
import { useAdminTelegram } from '@/lib/site-config';

const PAGE_LINKS = [
  { href: '/pricing/', label: 'نرخ‌نامه' },
  { href: '/portfolio/', label: 'نمونه‌کارها' },
  { href: '/about/', label: 'درباره ما' },
  { href: '/contact/', label: 'تماس با ما' },
  { href: '/terms/', label: 'قوانین و مقررات' },
  { href: '/privacy/', label: 'حریم خصوصی' },
];

/** پاورقی صفحات عمومی. */
export function SiteFooter() {
  const adminTelegram = useAdminTelegram(BRAND.adminTelegram);

  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__brand">
          <p className="public-footer__logo">
            <span>آرا</span>
            <span className="public-footer__logo-accent">سند</span>
          </p>
          <p className="public-footer__desc">{BRAND.description}</p>
        </div>

        <nav aria-label="پیوندهای پاورقی">
          <h2 className="public-footer__title">دسترسی سریع</h2>
          <ul className="public-footer__list">
            {PAGE_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="public-footer__title">ارتباط با ما</h2>
          <ul className="public-footer__list">
            {CHANNELS.map((channel) => {
              // ⚠️ لینک تلگرام مدیر از سرور می‌آید تا هرگز با نقشی که
              //    بک‌اند می‌دهد ناهمخوان نشود.
              const isTelegram = channel.href.startsWith('https://t.me/');
              const href = isTelegram ? `https://t.me/${adminTelegram}` : channel.href;
              const value = isTelegram ? `@${adminTelegram}` : channel.value;

              return (
                <li key={channel.label}>
                  <a
                    href={href}
                    {...(channel.external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    <Icon name={channel.icon} size={14} />
                    <span>
                      {channel.label}: <span className="ltr">{value}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="public-footer__bottom">
        <p>
          © {BRAND.name} — تمامی حقوق محفوظ است. · {BRAND.hours}
        </p>
      </div>
    </footer>
  );
}
