import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { Icon } from '@/components/ui/Icon';
import { asset } from '@/lib/config';
import {
  BENEFITS,
  BRAND,
  FAQ,
  QUALITY_ITEMS,
  SERVICES,
  STATS,
  STEPS,
  TESTIMONIALS,
} from '@/content/site';

export const metadata: Metadata = {
  title: 'خدمات تخصصی تایپ، ویرایش و آماده‌سازی اسناد',
  description:
    'آراسند خدمات تایپ تخصصی، ویرایش، صفحه‌آرایی، فرمول‌نویسی و آماده‌سازی حرفه‌ای اسناد دانشگاهی، اداری و تجاری را با سرعت و دقت بالا ارائه می‌دهد.',
  alternates: { canonical: '/' },
};

export default function HomePage() {
  return (
    <PublicLayout>
      {/* ─── هیرو ─── */}
      <section className="hero">
        <div className="hero__grid">
          <div>
            <span className="eyebrow">سرویس تایپ و آماده‌سازی سند</span>
            <h1 className="hero__title">آراستن اسناد شما، با دقت و اطمینان</h1>
            <p className="hero__desc">
              از تایپ دست‌نویس و فرمول‌نویسی تا قالب‌بندی پایان‌نامه مطابق آیین‌نامه‌ی دانشگاه؛
              سند شما با کیفیت تحویل، در زمان مقرر و با محرمانگی کامل آماده می‌شود.
            </p>
            <div className="hero__actions">
              <Link href="/pricing/" className="btn btn--primary btn--lg">
                مشاهده‌ی نرخ‌نامه
              </Link>
              <Link href="/portfolio/" className="btn btn--outline btn--lg">
                نمونه‌کارها
              </Link>
            </div>
          </div>

          <div className="hero__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/images/site/hero.avif")}
              alt="کار با دقت روی اسناد و متون"
              className="hero__photo"
              width={800}
              height={600}
              loading="eager"
            />
            <div className="hero__badge">
              بیش از ۸٬۰۰۰ پروژه‌ی موفق
              <span>با رتبه‌ی ۷ در سامانه‌ی TypeIran</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── خدمات ─── */}
      <section className="section" id="services">
        <SectionHeading
          eyebrow="خدمات ما"
          title="هر سندی که در ذهن دارید، آماده‌ی تحویل است"
          description="از یک نامه‌ی اداری کوتاه تا پایان‌نامه‌ی چند صد صفحه‌ای؛ هر خدمت با تعرفه‌ی مشخص و زمان تحویل روشن."
          actions={
            <Link href="/pricing/" className="btn btn--outline btn--sm">
              نرخ هر خدمت
            </Link>
          }
        />
        <div className="services-grid">
          {SERVICES.map((service) => (
            <article className="service-card" key={service.title}>
              <span className="service-card__icon" aria-hidden="true">
                <Icon name={service.icon} size={20} />
              </span>
              <h3 className="service-card__title">{service.title}</h3>
              <p className="service-card__desc">{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ─── مراحل سفارش ─── */}
      <section className="section" id="how">
        <SectionHeading
          eyebrow="نحوه سفارش"
          title="چهار قدم تا دریافت فایل نهایی"
          description="همه‌ی مراحل از پنل کاربری قابل پیگیری است و در هر مرحله اعلان دریافت می‌کنید."
        />
        <ol className="steps-grid">
          {STEPS.map((step, index) => (
            <li className="step" key={step.title}>
              <span className="step__num" aria-hidden="true">
                {['۱', '۲', '۳', '۴'][index]}
              </span>
              <h3 className="step__title">{step.title}</h3>
              <p className="step__desc">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── مزیت‌ها ─── */}
      <section className="section">
        <div className="split">
          <div className="split__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/images/site/why-us.avif")}
              alt="بررسی و آماده‌سازی اسناد در آراسند"
              loading="lazy"
              width={800}
              height={600}
            />
          </div>
          <div>
            <SectionHeading
              eyebrow="مزایای ما"
              title="چرا آراسند را انتخاب کنید؟"
              description="چون فقط تایپ نمی‌کنیم؛ سند را برای ارائه، داوری یا بایگانی آماده می‌کنیم."
            />
            <div className="benefits">
              {BENEFITS.map((benefit) => (
                <div className="benefit" key={benefit.title}>
                  <span className="benefit__icon" aria-hidden="true">
                    <Icon name={benefit.icon} size={18} />
                  </span>
                  <div>
                    <h3 className="benefit__title">{benefit.title}</h3>
                    <p className="benefit__desc">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── آمار ─── */}
      <section className="section section--tight">
        <div className="stats-band">
          {STATS.map((stat) => (
            <div className="stat-block" key={stat.label}>
              <span className="stat-block__value">{stat.value}</span>
              <span className="stat-block__label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── محرمانگی ─── */}
      <section className="section">
        <div className="split">
          <div>
            <SectionHeading
              eyebrow="محرمانگی"
              title="اطلاعات شما نزد ما امن است"
              description="بسیاری از اسناد — به‌ویژه پایان‌نامه و پروژه‌های تحقیقاتی — پیش از انتشار رسمی باید محرمانه بمانند. آراسند متعهد است محتوای هیچ سندی را با شخص یا نهاد ثالثی به اشتراک نگذارد."
            />
            <ul className="benefits">
              {QUALITY_ITEMS.map((item) => (
                <li className="benefit" key={item}>
                  <span className="benefit__icon" aria-hidden="true">
                    <Icon name="check" size={16} />
                  </span>
                  <p className="benefit__desc" style={{ color: 'var(--c-text)' }}>
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="split__media">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset("/images/site/confidentiality.avif")}
              alt="محیط کاری امن برای ویرایش اسناد شما"
              loading="lazy"
              width={800}
              height={600}
            />
          </div>
        </div>
      </section>

      {/* ─── نظرات ─── */}
      <section className="section">
        <SectionHeading
          eyebrow="نظر مشتریان"
          title="چند نظر از کسانی که سندشان را سپردند"
          align="center"
        />
        <div className="quotes-grid">
          {TESTIMONIALS.slice(0, 3).map((text) => (
            <figure className="quote-card" key={text.slice(0, 24)}>
              <span className="quote-card__stars" aria-label="پنج ستاره">
                ★★★★★
              </span>
              <blockquote className="quote-card__text">«{text}»</blockquote>
              <figcaption className="quote-card__meta">کاربر TypeIran</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ─── پرسش‌های متداول ─── */}
      <section className="section">
        <SectionHeading eyebrow="پرسش‌های متداول" title="چیزهایی که بیشتر پرسیده می‌شود" />
        <div className="faq-list">
          {FAQ.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ─── دعوت ─── */}
      <section className="section section--tight">
        <div className="cta-band">
          <div>
            <h2>آماده‌اید سند خود را بسپارید؟</h2>
            <p>نرخ را ببینید، سفارش را ثبت کنید و بقیه را به ما بسپارید.</p>
          </div>
          <div className="row">
            <Link href="/pricing/" className="btn btn--outline">
              نرخ‌نامه
            </Link>
            <Link href="/contact/" className="btn btn--primary">
              ارتباط با ما
            </Link>
          </div>
        </div>
      </section>

      <p className="sr-only">{BRAND.name}</p>
    </PublicLayout>
  );
}
