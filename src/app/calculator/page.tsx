import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { PricingCalculator } from '@/app/pricing/PricingCalculator';

export const metadata: Metadata = {
  title: 'محاسبه حدودی نرخ',
  description:
    'برآورد هزینه و بیعانه بر اساس نرخ جاری سرور؛ بدون ثبت سفارش و بدون پرداخت.',
  alternates: { canonical: '/calculator/' },
};

export default function CalculatorPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="برآورد بدون ورود"
          title="محاسبه حدودی نرخ"
          description="نوع خدمت، زبان، تعداد صفحه و زمان تحویل را بدهید تا سرور مبلغ تقریبی و بیعانه را اعلام کند. این صفحه سفارشی ثبت نمی‌کند."
          actions={
            <Link href="/pricing/" className="btn btn--outline btn--sm">
              دیدن نرخ‌ها
            </Link>
          }
        />
        <PricingCalculator id="calculator-form" standalone />
      </section>
    </PublicLayout>
  );
}
