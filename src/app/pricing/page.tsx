import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { Money } from '@/components/ui/Money';
import { Icon } from '@/components/ui/Icon';
import { SERVICE_TYPES } from '@/content/catalog';
import { calculateEstimate } from '@/lib/pricing';
import { FAQ } from '@/content/site';
import { PricingCalculator } from './PricingCalculator';

export const metadata: Metadata = {
  title: 'نرخ‌نامه',
  description:
    'نرخ پایه‌ی خدمات تایپ، ویرایش و آماده‌سازی اسناد به تفکیک نوع متن، همراه با محاسبه‌گر هزینه‌ی تقریبی.',
  alternates: { canonical: '/pricing/' },
};

const FACTORS = [
  'کیفیت و خوانایی فایل ورودی',
  'وجود جدول و فرمول پیچیده',
  'میزان فوریت تحویل',
  'نیاز به استایل خاص یا آیین‌نامه‌ی دانشگاهی',
];

export default function PricingPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="قیمت‌گذاری شفاف"
          title="نرخ‌نامه"
          description="نرخ پایه‌ی هر خدمت، به‌ازای هر صفحه. نرخ نهایی پس از بررسی فایل شما توسط مدیر تأیید می‌شود و پیش از شروع کار به اطلاعتان می‌رسد."
          actions={
            <Link href="/contact/" className="btn btn--outline btn--sm">
              سؤال دارید؟
            </Link>
          }
        />

        <div className="pricing-grid">
          {SERVICE_TYPES.map((service) => {
            const urgentPrice = calculateEstimate({
              pricePerPage: service.pricePerPage,
              pages: 1,
              urgent: true,
            });

            return (
              <article
                className={`price-card ${service.isPopular ? 'price-card--featured' : ''}`}
                key={service.id}
              >
                {service.isPopular ? <span className="price-badge">پرطرفدار</span> : null}
                <div>
                  <h3 className="price-card__title">{service.name}</h3>
                  <p className="price-card__desc">{service.description}</p>
                </div>
                <div>
                  <div className="price-row">
                    <span>تحویل عادی (هر صفحه)</span>
                    <span className="price-row__value">
                      <Money value={service.pricePerPage} />
                    </span>
                  </div>
                  <div className="price-row">
                    <span>تحویل فوری (هر صفحه)</span>
                    <span className="price-row__value">
                      <Money value={urgentPrice} />
                    </span>
                  </div>
                </div>
                <a href="#calculator" className="btn btn--secondary btn--sm">
                  محاسبه‌ی هزینه
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section--tight">
        <PricingCalculator />
      </section>

      <section>
        <SectionHeading
          eyebrow="چه چیزی بر قیمت اثر دارد؟"
          title="عوامل مؤثر بر نرخ نهایی"
          description="نرخ پایه، نقطه‌ی شروع است. این عوامل می‌توانند مبلغ نهایی را تغییر دهند و همیشه پیش از تأیید به شما اعلام می‌شوند."
        />
        <div className="values-grid">
          {FACTORS.map((factor) => (
            <div className="value-card" key={factor}>
              <span className="value-card__icon" aria-hidden="true">
                <Icon name="alert" size={18} />
              </span>
              <span className="value-card__title">{factor}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeading eyebrow="پرسش‌های متداول" title="درباره‌ی قیمت و پرداخت" />
        <div className="faq-list">
          {FAQ.slice(1, 4).map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
