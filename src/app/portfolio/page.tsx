import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { PortfolioGallery } from './PortfolioGallery';

export const metadata: Metadata = {
  title: 'نمونه‌کارها',
  description: 'گوشه‌ای از اسنادی که برای مشتریان آراسند آماده شده است.',
  alternates: { canonical: '/portfolio/' },
};

export default function PortfolioPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="نمونه‌کارها"
          title="گوشه‌ای از کارهایی که آماده کرده‌ایم"
          description="روی هر نمونه بزنید تا در اندازه‌ی کامل ببینید. با چرخ ماوس یا دکمه‌ها می‌توانید بزرگ‌نمایی کنید."
          actions={
            <Link href="/pricing/" className="btn btn--outline btn--sm">
              نرخ‌نامه
            </Link>
          }
        />
        <PortfolioGallery />
      </section>

      <section className="section--tight">
        <div className="cta-band">
          <div>
            <h2>سند شما هم می‌تواند این‌طور باشد</h2>
            <p>نمونه‌ی کارتان را بفرستید تا برآورد دقیق و زمان تحویل دریافت کنید.</p>
          </div>
          <Link href="/contact/" className="btn btn--primary">
            ارتباط با ما
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
