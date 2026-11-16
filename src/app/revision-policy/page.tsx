import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { PublicRevisionPolicy } from '@/components/delivery/PublicRevisionPolicy';

export const metadata: Metadata = {
  title: 'سیاست اصلاح',
  description: 'پنجره، تعداد دفعات و محدوده‌ی درخواست اصلاح پس از تحویل سفارش.',
  robots: { index: true, follow: true },
};

export default function RevisionPolicyPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="پس از تحویل"
          title="سیاست اصلاح"
          description="چگونگی ثبت درخواست اصلاح، مهلت آن و اثری که بر سفارش دارد."
          actions={
            <Link href="/faq/" className="btn btn--outline btn--sm">
              پرسش‌های متداول
            </Link>
          }
        />
        <PublicRevisionPolicy />
      </section>
    </PublicLayout>
  );
}
