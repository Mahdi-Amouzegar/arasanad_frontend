import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import '@/styles/fonts.css';
import '@/styles/tokens.css';
import './globals.css';
import '@/styles/components.css';
import '@/styles/public.css';

import { AlertProvider } from '@/components/ui/AlertProvider';
import { ServiceWorkerRegister } from '@/components/system/ServiceWorkerRegister';

/**
 * آدرس پایه برای ساخت URLهای مطلق (OG، sitemap و…).
 * ⚠️ باید با basePath در next.config.mjs هم‌خوان باشد.
 */
const SITE_URL = 'https://mahdi-amouzegar.github.io/arasanad_frontend';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'آراسند | خدمات تخصصی تایپ، ویرایش و آماده‌سازی اسناد',
    template: '%s | آراسند',
  },
  description:
    'آراسند خدمات تایپ تخصصی، ویرایش، صفحه‌آرایی، فرمول‌نویسی و آماده‌سازی حرفه‌ای اسناد دانشگاهی، اداری و تجاری را با سرعت و دقت بالا ارائه می‌دهد.',
  applicationName: 'آراسند',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'fa_IR',
    siteName: 'آراسند',
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/apple-touch-icon.png' }],
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
      <body>
        <AlertProvider>{children}</AlertProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
