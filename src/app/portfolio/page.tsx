import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'نمونه‌کارها',
  description: 'نمونه‌ای از اسناد آماده‌سازی‌شده توسط آراسند.',
};

export default function PortfolioPage() {
  return (
    <PageShell
      title="نمونه‌کارها"
      description="گالری نمونه‌کارها در فاز بعدی این بخش پیاده‌سازی می‌شود."
    >
      <p style={{ color: 'var(--color-text-secondary)' }}>
        این صفحه در نسخه‌ی جدید در حال آماده‌سازی است.
      </p>
    </PageShell>
  );
}
