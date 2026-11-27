import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { Card, CardBody } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { FAQ } from '@/content/site';
import { PricingCalculator } from './PricingCalculator';
import { PricingRateSheet } from './PricingRateSheet';
import { PricingAdminPanel } from '@/components/admin/PublicCatalogAdmin';

export const metadata: Metadata = {
  title: 'نرخ‌نامه',
  description:
    'نرخ پایه‌ی خدمات تایپ، ویرایش و آماده‌سازی اسناد به تفکیک نوع متن و زبان، همراه با محاسبه‌گر هزینه‌ی تقریبی.',
  alternates: { canonical: '/pricing/' },
};

const FACTORS = [
  'کیفیت و خوانایی فایل ورودی',
  'وجود جدول و فرمول پیچیده',
  'میزان فوریت تحویل',
  'نیاز به قالب‌بندی خاص یا آیین‌نامه‌ی دانشگاهی',
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

        <Card>
          <CardBody>
            <PricingRateSheet />
          </CardBody>
        </Card>
      </section>

      <section className="section--tight">
        <PricingCalculator />
      </section>

      <PricingAdminPanel />

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
