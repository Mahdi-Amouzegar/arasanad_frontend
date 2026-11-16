import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '@/styles/fonts.css';
import '@/styles/tokens.css';
import './globals.css';
import '@/styles/components.css';
import '@/styles/public.css';
import '@/styles/projects.css';
import '@/styles/files.css';
import '@/styles/chat.css';
import '@/styles/activities.css';
import '@/styles/admin.css';

import { ChatProvider } from '@/components/chat/ChatProvider';
import { ChatDock } from '@/components/chat/ChatDock';
import { ChatLauncher } from '@/components/chat/ChatLauncher';
import { NotificationProvider } from '@/components/chat/NotificationProvider';
import { ActivityProvider } from '@/components/activities/ActivityProvider';
import { AlertProvider } from '@/components/ui/AlertProvider';
import { AccountProvider } from '@/components/system/AccountProvider';
import { ServiceWorkerRegister } from '@/components/system/ServiceWorkerRegister';
import { ConnectivityBootstrap } from '@/components/system/ConnectivityBootstrap';
import { ConnectivityIndicator } from '@/components/ui/ConnectivityIndicator';
import { SITE_ORIGIN, BASE_PATH, asset } from '@/lib/config';
import { THEME_INIT_SCRIPT } from '@/lib/theme';

/**
 * آدرس پایه برای ساخت URLهای مطلق (OG و…).
 * ⚠️ دامنه‌ی اختصاصی از ریشه سرو می‌شود؛ basePath تعریف نشده است.
 */
const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'آراسند | خدمات تخصصی تایپ، ویرایش و آماده‌سازی اسناد',
    template: '%s | آراسند',
  },
  description:
    'آراسند خدمات تایپ تخصصی، ویرایش، صفحه‌آرایی، فرمول‌نویسی و آماده‌سازی حرفه‌ای اسناد دانشگاهی، اداری و تجاری را با سرعت و دقت بالا ارائه می‌دهد.',
  applicationName: 'آراسند',
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: 'آراسند',
  },
  // ⚠️ این فیلدها مسیر نسبی لازم دارند و با `asset()` ساخته می‌شوند؛
  //    بدون asset() آدرس‌ها به ریشه‌ی دامنه اشاره می‌کنند و ۴۰۴ می‌دهند.
  manifest: asset('/manifest.webmanifest'),
  icons: {
    icon: [{ url: asset('/favicon.svg'), type: 'image/svg+xml' }],
    apple: [{ url: asset('/icons/apple-touch-icon.png') }],
  },
};

export const viewport: Viewport = {
  themeColor: '#2457C5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      {/* اسکریپت بلاکینگ تم: پیش از اولین رنگآمیزی اجرا می‌شود تا پرش رنگ ندهد.
          رشته ثابت و بدون ورودی کاربر است؛ هیچ داده‌ی پویایی تزریق نمی‌شود. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <AlertProvider>
          <AccountProvider>
            {/* فاز ۹: گفتگو و اعلان، یک وضعیت سراسری در تمام صفحات.
                ⚠️ ترتیب وابستگی: هر دو Provider به useAuth نیاز دارند،
                   پس حتماً درون AccountProvider قرار می‌گیرند. */}
            <NotificationProvider>
              {/* فاز ۹٫۵: زنگوله‌ی عملیات، مستقل از اعلان فاز ۹. */}
              <ActivityProvider>
                <ChatProvider>
                  {children}
                  <ChatDock />
                  <ChatLauncher />
                </ChatProvider>
              </ActivityProvider>
            </NotificationProvider>
          </AccountProvider>
        </AlertProvider>
        <ServiceWorkerRegister />
        <ConnectivityBootstrap />
        {/* بنر «شبکه قطع است» + اسپینر، سراسری و فقط هنگام قطعی اتصال */}
        <ConnectivityIndicator hideWhenOnline className="conn-indicator--fixed" />
      </body>
    </html>
  );
}
