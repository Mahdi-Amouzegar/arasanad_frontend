import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { Card, CardBody } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'ثبت سفارش',
  description: 'برآورد هزینه را بدون ورود ببینید؛ ثبت سفارش تنها در پنل کاربری انجام می‌شود.',
  alternates: { canonical: '/start/' },
  robots: { index: false, follow: false },
};

/**
 * فاز ۱۲٫۳۴ — آدرس قدیمی `/start/` فقط یک صفحه‌ی توضیحی است.
 * ⚠️ هیچ پیشنویسی ساخته نمی‌شود، هیچ APIای فراخوانی نمی‌شود و هیچ سفارشی
 *    توسط مهمان آغاز نمی‌شود. مسیر برآورد `/calculator/` است.
 */
export default function StartPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="قیمت‌گذاری"
          title="برآورد بگیرید، سپس وارد شوید"
          description="برای دیدن هزینه‌ی تقریبی نیازی به ورود نیست. ثبت سفارش و پیگیری آن تنها در پنل کاربری انجام می‌شود."
        />
        <Card>
          <CardBody>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <Link href="/calculator/" className="btn btn--primary">
                محاسبه حدودی نرخ
              </Link>
              <Link href="/login/" className="btn btn--outline">
                ورود به حساب
              </Link>
            </div>
            <p className="prj-note">این صفحه سفارشی ایجاد نمی‌کند و پیشنویسی ذخیره نمی‌شود. هزینه‌ی برآوردی هم ذخیره نمی‌شود.</p>
          </CardBody>
        </Card>
      </section>
    </PublicLayout>
  );
}
