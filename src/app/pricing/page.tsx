import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'نرخ‌نامه',
  description: 'نرخ خدمات تایپ و ویرایش آراسند بر اساس نوع متن و تعداد صفحه.',
};

export default function PricingPage() {
  return (
    <PageShell
      title="نرخ‌نامه"
      description="نرخ هر صفحه و محاسبه‌گر هزینه در فاز بعدی این بخش پیاده‌سازی می‌شود."
    >
      <p style={{ color: 'var(--color-text-secondary)' }}>
        این صفحه در نسخه‌ی جدید در حال آماده‌سازی است.
      </p>
    </PageShell>
  );
}
