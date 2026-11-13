import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { FAQ } from '@/content/site';

export const metadata: Metadata = {
  title: 'پرسشهای متداول',
  description:
    'پاسخ پرسشهای پرتکرار دربارهی زمان تحویل، نرخ، محرمانگی، ارسال فایل، اصلاحات و پیگیری سفارش در آراسند.',
  alternates: { canonical: '/faq/' },
};

export default function FaqPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="راهنما"
          title="پرسشهای متداول"
          description="اگر پاسخ خود را پیدا نکردید، از صفحهی تماس با ما پیام بدهید؛ مستقیم پاسخ میدهیم."
          actions={
            <Link href="/contact/" className="btn btn--outline btn--sm">
              تماس با ما
            </Link>
          }
        />
        <div className="faq-list faq-list--wide">
          {FAQ.map((item) => (
            <details className="faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section section--tight">
        <div className="cta-band">
          <div>
            <h2>آمادهاید شروع کنید؟</h2>
            <p>برآورد هزینه بگیرید و خلاصهی درخواست را برای ما بفرستید.</p>
          </div>
          <div className="row">
            <Link href="/pricing/" className="btn btn--outline">
              نرخنامه
            </Link>
            <Link href="/start/" className="btn btn--primary">
              شروع سفارش
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
