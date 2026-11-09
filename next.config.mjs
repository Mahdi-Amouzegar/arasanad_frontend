// تنظیمات Next.js برای انتشار استاتیک روی GitHub Pages
//
// ⚠️ نام مخزن، مسیر پایه را تعیین می‌کند.
//    آدرس نهایی: https://mahdi-amouzegar.github.io/arasanad_frontend/
//    اگر بعداً دامنه‌ی اختصاصی اضافه شد، فقط basePath را خالی کنید.
//
// ⚠️ trailingSlash: true الزامی است.
//    بدون آن، مسیر /pricing یک فایل با نام pricing تولید می‌کند که در
//    GitHub Pages به درستی serve نمی‌شود. با آن، پوشه‌ی pricing/index.html
//    ساخته می‌شود و رفرش مستقیم هم کار می‌کند.

const REPO_NAME = 'arasanad_frontend';
const basePath = `/${REPO_NAME}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // بهینه‌سازی تصویر Next.js به سرور نیاز دارد و با static export کار نمی‌کند.
    unoptimized: true,
  },
};

export default nextConfig;
