import type { Metadata } from 'next';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { ProfileView } from './ProfileView';

export const metadata: Metadata = {
  title: 'پروفایل من',
  description: 'مدیریت اطلاعات حساب، نام کاربری و نشست‌های فعال.',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="حساب کاربری"
          title="پروفایل من"
          description="نام، نام کاربری و دستگاه‌های متصل به حساب خود را مدیریت کنید."
        />
        <ProfileView />
      </section>
    </PublicLayout>
  );
}
