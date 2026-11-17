import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { PublicProjectDetail } from '@/components/projects/PublicProjectDetail';

/**
 * Static-export detail page.
 *
 * The project id comes from `?id=...` and is read client-side, because an
 * order id is not known at build time and `output: 'export'` cannot serve a
 * dynamic route. No `searchParams` is read on the server.
 */
export const metadata: Metadata = {
  title: 'جزئیات عمومی سفارش',
  description: 'نمای عمومی و فاقد اطلاعات خصوصی یک سفارش؛ فایل‌ها و مبالغ هرگز منتشر نمی‌شوند.',
  robots: { index: false, follow: false },
};

export default function ProjectDetailPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="نمای عمومی"
          title="جزئیات عمومی سفارش"
          description="فقط عنوان، نوع خدمت، وضعیت و زمان تقریبی نمایش داده می‌شوند."
          actions={
            <Link href="/projects/" className="btn btn--outline btn--sm">
              فهرست سفارش‌ها
            </Link>
          }
        />
        <PublicProjectDetail />
      </section>
    </PublicLayout>
  );
}
