import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';

export const metadata: Metadata = {
  title: 'صفحه پیدا نشد',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PublicLayout>
      <section>
        <div
          style={{
            display: 'grid',
            justifyItems: 'center',
            gap: 'var(--sp-4)',
            textAlign: 'center',
            paddingBlock: 'var(--sp-12)',
          }}
        >
          <p
            style={{
              fontSize: '3rem',
              fontWeight: 'var(--fw-extrabold)',
              color: 'var(--c-primary)',
              lineHeight: 1,
            }}
          >
            ۴۰۴
          </p>
          <h1 style={{ fontSize: 'var(--fs-page-title)' }}>این صفحه پیدا نشد</h1>
          <p style={{ color: 'var(--c-text-secondary)', maxWidth: '46ch' }}>
            ممکن است نشانی را اشتباه وارد کرده باشید یا صفحه جابه‌جا شده باشد.
          </p>
          <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/" className="btn btn--primary">
              صفحه اصلی
            </Link>
            <Link href="/pricing/" className="btn btn--outline">
              نرخ‌نامه
            </Link>
            <Link href="/portfolio/" className="btn btn--outline">
              نمونه‌کارها
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
