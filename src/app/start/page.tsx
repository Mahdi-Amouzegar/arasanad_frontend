import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { StartEstimate } from './StartEstimate';

export const metadata: Metadata = {
  title: 'شروع سفارش',
  description:
    'برآورد هزینه‌ی تایپ و آماده‌سازی سند و ارسال درخواست پیشثبتنام؛ نرخ‌ها همان نرخنامه‌ی آراسند هستند.',
  alternates: { canonical: '/start/' },
};

export default function StartPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="شروع سفارش"
          title="از برآورد تا ارسال درخواست"
          description="هزینه‌ی تقریبی را همین‌جا ببینید؛ برای ثبت سفارش واقعی و پیگیری کامل، وارد پنل کاربری شوید. متن درخواست همچنان به‌صورت دستی هم قابل کپی‌کردن است."
          actions={
            <>
              <Link href="/panel/projects/new/" className="btn btn--primary btn--sm">
                ثبت سفارش آنلاین
              </Link>
              <Link href="/login/" className="btn btn--outline btn--sm">
                ورود به حساب
              </Link>
            </>
          }
        />
        <StartEstimate />
      </section>

      <section className="section section--alt">
        <SectionHeading
          eyebrow="پیش از ارسال"
          title="چند نکته‌ی روشن"
          description="برای اینکه بدانید دقیقاً چه چیزی قرار است اتفاق بیفتد."
        />
        <div className="values-grid">
          {[
            'برآورد بر اساس نرخ پایه است، نه قیمت نهایی.',
            'نرخ نهایی پس از دیدن فایل و پیش از شروع کار اعلام می‌شود.',
            'این صفحه هیچ اطلاعاتی به سرور ارسال نمی‌کند.',
            'ثبت سفارش و پیگیری کامل اکنون در پنل کاربری فعال است؛ نرخ‌ها و بیعانه را سرور محاسبه می‌کند.',
          ].map((item) => (
            <div className="value-card" key={item}>
              <span className="value-card__title">{item}</span>
            </div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
