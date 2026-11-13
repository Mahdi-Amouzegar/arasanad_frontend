import type { Metadata } from 'next';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { Icon } from '@/components/ui/Icon';
import { LoginFlow } from './LoginFlow';

export const metadata: Metadata = {
  title: 'ورود',
  description: 'ورود به حساب کاربری آراسند با ربات تلگرام یا کد یکبارمصرف (همراه با QR).',
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
              title="ورود به حساب آراسند"
              description="بدون رمز عبور. حساب کاربری و تنظیمات نشستها همینجا در دسترس است؛ پیگیری سفارشها و فایلها بهتدریج در فازهای ۷ تا ۱۳ اضافه میشود."
            />

            <ul className="benefits">
              <li className="benefit">
                <span className="benefit__icon" aria-hidden="true">
                  <Icon name="check" size={16} />
                </span>
                <p className="benefit__desc">
                  روش اصلی: ربات تلگرام. دسترسی کامل به ساخت کد، ویرایش پروفایل و مدیریت دستگاهها.
                </p>
              </li>
              <li className="benefit">
                <span className="benefit__icon" aria-hidden="true">
                  <Icon name="key" size={16} />
                </span>
                <p className="benefit__desc">
                  دستگاه بدون تلگرام: کد یکبارمصرف یا اسکن QR ساختهشده در پروفایل دستگاه اصلی.
                </p>
              </li>
              <li className="benefit">
                <span className="benefit__icon" aria-hidden="true">
                  <Icon name="shield" size={16} />
                </span>
                <p className="benefit__desc">
                  نشست حاصل از کد «مهمان» است و نمیتواند کد تازهای بسازد یا دستگاهی را حذف کند.
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
