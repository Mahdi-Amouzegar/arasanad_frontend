import type { Metadata } from 'next';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { LoginFlow } from './LoginFlow';

export const metadata: Metadata = {
  title: 'ورود',
  description: 'ورود به حساب کاربری آراسند با تلگرام.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <PublicLayout>
      <section>
        <div className="about-grid">
          <div>
            <SectionHeading
              eyebrow="حساب کاربری"
              title="ورود به پنل آراسند"
              description="با ورود به حساب، سفارش‌ها، پرداخت‌ها، فایل‌ها و گفتگوهای شما در یک‌جا قابل پیگیری می‌شود."
            />

            <ul className="benefits">
              <li className="benefit">
                <span className="benefit__icon" aria-hidden="true">
                  <IconCheck />
                </span>
                <p className="benefit__desc">
                  بدون رمز عبور؛ فقط با تأیید در تلگرام وارد می‌شوید.
                </p>
              </li>
              <li className="benefit">
                <span className="benefit__icon" aria-hidden="true">
                  <IconCheck />
                </span>
                <p className="benefit__desc">
                  امکان ورود روی چند دستگاه با کد یک‌بارمصرف و مدیریت نشست‌ها.
                </p>
              </li>
            </ul>
          </div>

          <div>
            <LoginFlow />
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}
