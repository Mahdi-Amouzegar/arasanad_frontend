import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { Icon } from '@/components/ui/Icon';
import { CHANNELS } from '@/content/site';

export const metadata: Metadata = {
  title: 'ورود',
  description: 'ورود به حساب کاربری آراسند با تلگرام.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <PublicLayout>
      <section>
        <div className="about-grid">
          <div>
            <SectionHeading
              eyebrow="حساب کاربری"
              title="ورود به پنل آراسند"
              description="به‌زودی می‌توانید با حساب تلگرام خود وارد شوید و سفارش‌ها، پرداخت‌ها، فایل‌ها و گفتگوها را در یکجا مدیریت کنید."
            />

            <div
              style={{
                display: 'grid',
                gap: 'var(--sp-3)',
                padding: 'var(--sp-5)',
                background: 'var(--c-primary-subtle)',
                border: '1px solid var(--c-border)',
                borderRadius: 'var(--r-lg)',
              }}
            >
              <p style={{ fontWeight: 'var(--fw-semibold)' }}>ورود به‌زودی فعال می‌شود</p>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', lineHeight: 2 }}>
                تا آن زمان، برای ثبت سفارش و دریافت برآورد، از راه‌های ارتباطی زیر پیام بدهید. پس
                از فعال‌شدن ورود، سفارش‌هایی که از این راه ثبت می‌کنید هم در پنل شما قابل پیگیری
                خواهد بود.
              </p>
              <Link href="/contact/" className="btn btn--primary">
                راه‌های ارتباط
              </Link>
            </div>
          </div>

          <div className="channels-grid" style={{ gridTemplateColumns: '1fr' }}>
            {CHANNELS.slice(0, 3).map((channel) => (
              <a
                key={channel.label}
                href={channel.href}
                className="channel-card"
                {...(channel.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                <span className="channel-card__icon" aria-hidden="true">
                  <Icon name={channel.icon} size={18} />
                </span>
                <span>
                  <span className="channel-card__label">{channel.label}</span>
                  <span className="channel-card__value">{channel.value}</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
