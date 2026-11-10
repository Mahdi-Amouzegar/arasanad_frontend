import type { Metadata } from 'next';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { Icon } from '@/components/ui/Icon';
import { asset } from '@/lib/config';
import { BRAND, CHANNELS } from '@/content/site';

export const metadata: Metadata = {
  title: 'تماس با ما',
  description: 'راه‌های ارتباط با آراسند: تلگرام، بله، تلفن و ایمیل.',
  alternates: { canonical: '/contact/' },
};

export default function ContactPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="ارتباط با ما"
          title="در دسترس هستیم"
          description="برای برآورد قیمت، ارسال فایل یا هر پرسشی، از هر کدام از این راه‌ها که راحت‌تر است پیام بدهید."
        />

        <div className="channels-grid">
          {CHANNELS.map((channel) => (
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
      </section>

      <section className="section--tight">
        <div className="about-grid">
          <div>
            <SectionHeading
              eyebrow="ساعات پاسخگویی"
              title={BRAND.hours}
              description="پیام‌های تلگرام معمولاً سریع‌ترین راه پاسخ هستند. برای سفارش‌های فوری، تماس تلفنی را انتخاب کنید."
            />
            <ul className="benefits">
              <li className="benefit">
                <span className="benefit__icon" aria-hidden="true">
                  <Icon name="message" size={16} />
                </span>
                <p className="benefit__desc">
                  پس از فعال‌شدن حساب کاربری، امکان گفتگوی مستقیم با مدیر داخل پنل هر سفارش فراهم
                  می‌شود.
                </p>
              </li>
              <li className="benefit">
                <span className="benefit__icon" aria-hidden="true">
                  <Icon name="wallet" size={16} />
                </span>
                <p className="benefit__desc">
                  محتوای همه‌ی اسناد محرمانه است و فقط در حساب خود شما قابل مشاهده خواهد بود.
                </p>
              </li>
            </ul>
          </div>
          <div className="split__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/images/site/faq.avif")}
              alt="ارتباط با تیم آراسند"
              loading="lazy"
              width={800}
              height={600}
            />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
