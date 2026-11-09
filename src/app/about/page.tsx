import type { Metadata } from 'next';
import PageShell from '@/components/PageShell';

export const metadata: Metadata = {
  title: 'درباره ما',
  description: 'آراسند، همراه شما در آماده‌سازی حرفه‌ای اسناد دانشگاهی، اداری و تجاری.',
};

export default function AboutPage() {
  return (
    <PageShell
      title="درباره ما"
      description="معرفی کامل آراسند در فاز بعدی این بخش پیاده‌سازی می‌شود."
    >
      <p style={{ color: 'var(--color-text-secondary)' }}>
        این صفحه در نسخه‌ی جدید در حال آماده‌سازی است.
      </p>
    </PageShell>
  );
}
