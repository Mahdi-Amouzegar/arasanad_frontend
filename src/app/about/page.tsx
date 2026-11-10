import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { Icon, type IconName } from '@/components/ui/Icon';
import { asset } from '@/lib/config';
import { STATS } from '@/content/site';

export const metadata: Metadata = {
  title: 'درباره ما',
  description:
    'آراسند از ترکیب «آراستن» و «سند» شکل گرفته؛ همراهی مطمئن برای آماده‌سازی اسناد دانشگاهی، اداری و تجاری.',
  alternates: { canonical: '/about/' },
};

const VALUES: Array<{ title: string; icon: IconName }> = [
  { title: 'دقت در جزئیات', icon: 'activity' },
  { title: 'امانت‌داری', icon: 'wallet' },
  { title: 'تحویل به‌موقع', icon: 'clock' },
  { title: 'شفافیت قیمت', icon: 'receipt' },
  { title: 'به‌روز بودن', icon: 'refresh' },
];

export default function AboutPage() {
  return (
    <PublicLayout>
      <section>
        <div className="about-grid">
          <div>
            <SectionHeading
              eyebrow="درباره ما"
              title="دقت، سرعت و اطمینان در هر کلمه"
              description="آراسند متعهد به ارائه‌ی خدمات تایپ و ویرایش با بالاترین استانداردهای کیفی است. هدف ما کوتاه‌کردن مسیر مستندسازی شما، بدون هیچ کاهشی در دقت است."
            />
            <p style={{ color: 'var(--c-text-secondary)', lineHeight: 2 }}>
              نام آراسند از ترکیب «آراستن» و «سند» شکل گرفته — یعنی برندی که اسناد را می‌آراید و
              استاندارد تحویل می‌دهد. ما خود را تنها یک تایپیست نمی‌دانیم؛ همراه مطمئن شما در
              آماده‌سازی کامل سند هستیم.
            </p>
          </div>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/images/site/about-intro.avif")}
              alt="آماده‌سازی حرفه‌ای اسناد در آراسند"
              loading="lazy"
              width={800}
              height={600}
            />
          </div>
        </div>
      </section>

      <section className="section--tight">
        <div className="stats-band">
          {STATS.map((stat) => (
            <div className="stat-block" key={stat.label}>
              <span className="stat-block__value">{stat.value}</span>
              <span className="stat-block__label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="about-grid">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/images/site/about-story.avif")}
              alt="داستان شکل‌گیری آراسند"
              loading="lazy"
              width={800}
              height={600}
            />
          </div>
          <div>
            <SectionHeading
              eyebrow="داستان ما"
              title="چطور آراسند شکل گرفت"
              description="آراسند از دل تجربه‌ی واقعی در آماده‌سازی صدها پروژه‌ی دانشگاهی و اداری شکل گرفت."
            />
            <p style={{ color: 'var(--c-text-secondary)', lineHeight: 2 }}>
              در این سال‌ها دیدیم که نیاز مشتریان فراتر از «تایپ ساده» است. سند باید مطابق
              آیین‌نامه باشد، فهرست و شماره‌گذاری درست داشته باشد، فرمول‌ها بی‌نقص تایپ شوند و
              ظاهرش قابل ارائه باشد. آراسند برای پاسخ به همین نیاز ساخته شد.
            </p>
          </div>
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="ارزش‌های ما" title="به چه چیزی پایبندیم" align="center" />
        <div className="values-grid">
          {VALUES.map((value) => (
            <div className="value-card" key={value.title}>
              <span className="value-card__icon" aria-hidden="true">
                <Icon name={value.icon} size={18} />
              </span>
              <span className="value-card__title">{value.title}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section--tight">
        <div className="cta-band">
          <div>
            <h2>آماده‌اید سند خود را بسپارید؟</h2>
            <p>نرخ‌نامه را ببینید یا مستقیم با ما در تماس باشید.</p>
          </div>
          <Link href="/pricing/" className="btn btn--primary">
            مشاهده‌ی نرخ‌نامه
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
