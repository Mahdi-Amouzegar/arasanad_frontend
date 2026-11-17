import type { Metadata } from 'next';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { Icon } from '@/components/ui/Icon';
import { LoginFlow } from './LoginFlow';

export const metadata: Metadata = {
  title: 'ورود',
  description: 'ورود به حساب کاربری آراسند با ربات تلگرام یا کد یک‌بارمصرف (همراه با QR).',
  robots: { index: false, follow: false },
};

/** راهنمای روش‌های ورود در یک بخش کشویی — عملکرد ورود در بالای صفحه بماند (بازخورد UAT فاز ۱۳). */
const LOGIN_GUIDE = [
  {
    icon: 'send',
    text: 'روش اصلی: ربات تلگرام. دسترسی کامل به ساخت کد، ویرایش پروفایل و مدیریت دستگاه‌ها.',
  },
  {
    icon: 'key',
    text: 'دستگاه بدون تلگرام: کد یک‌بارمصرف یا اسکن QR ساخته‌شده در پروفایل دستگاه اصلی.',
  },
  {
    icon: 'shield',
    text: 'نشست حاصل از کد «مهمان» است و نمی‌تواند کد تاز‌های بسازد یا دستگاهی را حذف کند.',
  },
];

export default function LoginPage() {
  return (
    <PublicLayout>
      <section>
        <SectionHeading eyebrow="حساب کاربری" title="ورود به حساب آراسند" />

        <div className="login-layout">
          {/* عملکرد ورود، نخستین چیزی است که کاربر می‌بیند. */}
          <div className="login-layout__action">
            <LoginFlow />

            <details className="login-guide">
              <summary>
                <Icon name="message" size={16} />
                راهنمای ورود
              </summary>
              <ul className="benefits">
                {LOGIN_GUIDE.map((item) => (
                  <li className="benefit" key={item.text}>
                    <span className="benefit__icon" aria-hidden="true">
                      <Icon name={item.icon as 'send' | 'key' | 'shield'} size={16} />
                    </span>
                    <p className="benefit__desc">{item.text}</p>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
