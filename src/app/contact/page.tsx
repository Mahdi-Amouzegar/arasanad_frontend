import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'تماس با ما',
  description: 'راه‌های ارتباط با آراسند: تلگرام، بله، تلفن و ایمیل.',
};

export default function ContactPage() {
  return (
    <PageShell
      title="تماس با ما"
      description="راه‌های ارتباط و فرم پیام در فاز بعدی این بخش پیاده‌سازی می‌شود."
    >
      <p style={{ color: 'var(--color-text-secondary)' }}>
        این صفحه در نسخه‌ی جدید در حال آماده‌سازی است.
      </p>
    </PageShell>
  );
}
