import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { HeroPanelMock } from '@/components/public/HeroPanelMock';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Money } from '@/components/ui/Money';
import { SERVICE_TYPES } from '@/content/catalog';
import {
  BENEFITS,
  BRAND,
  FAQ,
  QUALITY_ITEMS,
  SERVICES,
  SERVICE_GROUPS,
  STATS,
  STEPS,
  TESTIMONIAL_NOTE,
  TESTIMONIALS,
} from '@/content/site';
import { asset } from '@/lib/config';

export const metadata: Metadata = {
  title: 'خدمات تخصصی تایپ، ویرایش و آماده‌سازی اسناد',
  description:
    'آراسند خدمات تایپ تخصصی، ویرایش، صفحه‌آرایی، فرمول‌نویسی و آماده‌سازی حرفه‌ای اسناد دانشگاهی، اداری و تجاری را با سرعت و دقت بالا ارائه می‌دهد.',
  alternates: { canonical: '/' },
};

const BASE_PRICE = Math.min(...SERVICE_TYPES.map((service) => service.pricePerPage));
const STEP_NUMBERS = ['۱', '۲', '۳', '۴'] as const;

export default function HomePage() {
  return (
    <PublicLayout>
      {/* ─── هیرو: متن/CTA بالا، ماکت محصول پایین ─── */}
      <section className="hero">
        <div className="hero__grid">
          <div className="hero__copy">
            <span className="eyebrow">سرویس تایپ و آماده‌سازی سند</span>
            <h1 className="hero__title">آراستن اسناد شما، با دقت و اطمینان</h1>
            <p className="hero__desc">
              از تایپ دست‌نویس و فرمول‌نویسی تا قالب‌بندی پایان‌نامه مطابق آیین‌نامه‌ی دانشگاه؛
              سند شما با کیفیت تحویل، در زمان مقرر و با محرمانگی کامل آماده می‌شود.
            </p>
            <div className="hero__actions">
              <Link href="/start/" className="btn btn--primary btn--lg">
                <Icon name="plus" size={18} />
                شروع سفارش
              </Link>
              <Link href="/pricing/" className="btn btn--outline btn--lg">
                مشاهده‌ی نرخ‌نامه
              </Link>
            </div>
            <p className="hero__micro">
              <Icon name="shield" size={15} />
              محرمانگی کامل · برآورد هزینه پیش از شروع کار
            </p>
          </div>

          <div className="hero__media">
            <HeroPanelMock />
            {/* ⚠️ پیشتر این نشان با position:absolute روی ماکت قرار می‌گرفت و
                ردیف آخر سفارش‌ها و پاورقی پنل را در موبایل و دسکتاپ می‌پوشاند.
                اکنون در جریان عادی و زیر ماکت است و هیچ متنی پنهان نمی‌شود. */}
            <div className="hero__media-note">
              <Icon name="shield" size={16} />
              <div className="hero__media-note-text">
                <strong>محرمانگی کامل</strong>
                <span>بازبینی نهایی پیش از تحویل</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── خدمات: ۳ گروه + ۱ کارت ویژه با نرخ، به‌جای ۱۲ کارت همشکل ─── */}
      <section className="section section--alt" id="services">
        <SectionHeading
          eyebrow="خدمات ما"
          title="هر سندی که در ذهن دارید، آماده‌ی تحویل است"
          description="دوازده خدمت در سه گروه. نرخ هر خدمت مشخص است و پیش از شروع کار تأیید می‌شود."
          actions={
            <Link href="/services/" className="btn btn--outline btn--sm">
              همه‌ی خدمات
            </Link>
          }
        />

        <div className="service-groups">
          {SERVICE_GROUPS.map((group) => (
            <article className="service-group" key={group.title}>
              <span className="service-group__icon" aria-hidden="true">
                <Icon name={group.icon} size={22} />
              </span>
              <h3 className="service-group__title">{group.title}</h3>
              <p className="service-group__desc">{group.description}</p>
              <ul className="service-group__list">
                {group.items.map((title) => {
                  const service = SERVICES.find((item) => item.title === title);
                  return (
                    <li key={title}>
                      <Icon name={service?.icon ?? 'check'} size={14} />
                      <span>{title}</span>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}

          <article className="service-feature">
            <Badge tone="primary">
              <Icon name="sparkles" size={13} />
              پرطرفدارترین
            </Badge>
            <h3 className="service-feature__title">قالب‌بندی پایان‌نامه</h3>
            <p className="service-feature__desc">
              از جلد و فهرست تا منابع و پیوست‌ها، دقیقاً مطابق آیین‌نامه‌ی دانشگاه شما.
            </p>
            <div className="service-feature__price">
              <span>نرخ پایه از</span>
              <strong>
                <Money value={BASE_PRICE} /> / صفحه
              </strong>
            </div>
            <Link href="/pricing/" className="btn btn--secondary btn--sm btn--block">
              دیدن نرخ کامل
            </Link>
          </article>
        </div>
      </section>

      {/* ─── مراحل: timeline به‌جای ۴ کارت همشکل ─── */}
      <section className="section" id="how">
        <SectionHeading
          eyebrow="نحوه سفارش"
          title="چهار قدم تا دریافت فایل نهایی"
          description="همه‌ی مراحل از پنل کاربری قابل پیگیری است و در هر مرحله اعلان دریافت می‌کنید."
          actions={
            <Link href="/start/" className="btn btn--primary btn--sm">
              شروع سفارش
            </Link>
          }
        />
        <ol className="steps-timeline">
          {STEPS.map((step, index) => (
            <li className="steps-timeline__item" key={step.title}>
              <span className="steps-timeline__marker" aria-hidden="true">
                {STEP_NUMBERS[index]}
              </span>
              <div className="steps-timeline__card">
                <span className="steps-timeline__icon" aria-hidden="true">
                  <Icon name={step.icon} size={18} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ─── مزیت‌ها: لنگر بصری به‌جای عکس استاک دوم ─── */}
      <section className="section section--alt">
        <div className="split">
          <div className="benefit-anchor">
            <span className="benefit-anchor__icon" aria-hidden="true">
              <Icon name="clock" size={26} />
            </span>
            <p className="benefit-anchor__lead">مهلت تحویل، از لحظه‌ی پرداخت بیعانه</p>
            <p className="benefit-anchor__desc">
              زمان‌بندی شفاف، قابل پیگیری در پنل و همراه با اعلان در هر مرحله.
              تأخیر نقطه‌ای نیست که بخواهیم پنهانش کنیم.
            </p>
            <Link href="/faq/" className="benefit-anchor__link">
              پرسش‌های متداول درباره‌ی زمان و هزینه
              <Icon name="chevronDown" size={15} />
            </Link>
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

      {/* ─── محرمانگی: تنها عکس باقی‌مانده ─── */}
      <section className="section section--alt">
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
              src={asset('/images/site/confidentiality.avif')}
              alt="محیط کاری امن برای ویرایش اسناد شما"
              loading="lazy"
              width={800}
              height={600}
            />
          </div>
        </div>
      </section>

      {/* ─── نظرات: آیکن ستاره + یادداشت حریم خصوصی ─── */}
      <section className="section">
        <SectionHeading
          eyebrow="نظر سفارش‌دهندهان"
          title="چند نظر از کسانی که سندشان را سپردند"
          description={TESTIMONIAL_NOTE}
        />
        <div className="quotes-grid">
          {TESTIMONIALS.slice(0, 3).map((text) => (
            <figure className="quote-card" key={text.slice(0, 24)}>
              <span className="quote-card__stars" aria-label="پنج ستاره از پنج">
                {[0, 1, 2, 3, 4].map((star) => (
                  <Icon key={star} name="star" size={15} />
                ))}
              </span>
              <blockquote className="quote-card__text">«{text}»</blockquote>
              <figcaption className="quote-card__meta">بدون درج نام، به احترام حریم خصوصی</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ─── پرسش‌های متداول ─── */}
      <section className="section section--alt">
        <SectionHeading
          eyebrow="پرسش‌های متداول"
          title="چیزهایی که بیشتر پرسیده می‌شود"
          actions={
            <Link href="/faq/" className="btn btn--outline btn--sm">
              همه‌ی پرسشها
            </Link>
          }
        />
        <div className="faq-list">
          {FAQ.slice(0, 4).map((item) => (
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
            <p>نوع خدمت را انتخاب کنید، برآورد بگیرید و بقیه را به ما بسپارید.</p>
          </div>
          <div className="row">
            <Link href="/pricing/" className="btn btn--outline">
              نرخ‌نامه
            </Link>
            <Link href="/start/" className="btn btn--primary">
              شروع سفارش
            </Link>
          </div>
        </div>
      </section>

      <p className="sr-only">{BRAND.name}</p>
    </PublicLayout>
  );
}
