import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '@/styles/fonts.css';
import '@/styles/tokens.css';
import './globals.css';
import '@/styles/components.css';
import '@/styles/public.css';
import '@/styles/projects.css';

import { AlertProvider } from '@/components/ui/AlertProvider';
import { AccountProvider } from '@/components/system/AccountProvider';
import { ServiceWorkerRegister } from '@/components/system/ServiceWorkerRegister';
import { ConnectivityBootstrap } from '@/components/system/ConnectivityBootstrap';
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
          <AccountProvider>{children}</AccountProvider>
        </AlertProvider>
        <ServiceWorkerRegister />
        <ConnectivityBootstrap />
      </body>
    </html>
  );
}
