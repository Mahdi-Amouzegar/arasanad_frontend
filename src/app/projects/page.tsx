import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { PublicProjectsList } from '@/components/projects/PublicProjectsList';

export const metadata: Metadata = {
  title: 'سفارش‌های در حال انجام',
  description:
    'نمای عمومی سفارش‌های آراسند؛ فقط اطلاعات غیرمحرمانه و بدون هیچ مبلغ یا مشخصات تماس نمایش داده می‌شود.',
  alternates: { canonical: '/projects/' },
};

export default function PublicProjectsPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="سفارش‌ها"
          title="مروری بر سفارش‌های در جریان"
          description="این فهرست عمومی است و فقط عنوان، نوع خدمت، وضعیت و زمان تقریبی را نشان می‌دهد. مبالغ، فایل‌ها و اطلاعات تماس هرگز اینجا منتشر نمی‌شوند."
          actions={
            <Link href="/panel/projects/new/" className="btn btn--primary btn--sm">
              ثبت سفارش تازه
            </Link>
          }
        />
        <PublicProjectsList />
      </section>
    </PublicLayout>
  );
}
