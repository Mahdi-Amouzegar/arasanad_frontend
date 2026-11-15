import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { ProjectDetail } from '@/components/projects/ProjectDetail';

/**
 * Static-export detail page.
 *
 * The project id comes from `?id=...` and is read client-side, because an
 * order id is not known at build time and `output: 'export'` cannot serve a
 * dynamic route. No `searchParams` is read on the server.
 */
export const metadata: Metadata = {
  title: 'جزئیات سفارش',
  description: 'جزئیات، تاریخچه و یادداشت‌های یک سفارش؛ ویژه‌ی صاحب سفارش و مدیر.',
  robots: { index: false, follow: false },
};

export default function ProjectDetailPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="پیگیری سفارش"
          title="جزئیات سفارش"
          description="وضعیت پروژه، وضعیت مالی و مهلت تحویل هرکدام جداگانه نمایش داده می‌شوند."
          actions={
            <Link href="/panel/projects/" className="btn btn--outline btn--sm">
              فهرست سفارش‌ها
            </Link>
          }
        />
        <ProjectDetail />
      </section>
    </PublicLayout>
  );
}
