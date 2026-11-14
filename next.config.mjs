// تنظیمات Next.js برای انتشار استاتیک روی GitHub Pages
//
// ⚠️ دامنه‌ی اختصاصی `https://arasanad.ir` از **ریشه** سرو می‌شود، بنابراین
//    نباید basePath تعریف شود. نسخه‌ی قبل `basePath = '/arasanad_frontend'`
//    داشت (ویژه‌ی Project Pages) و باعث می‌شد HTML ارجاع بدهد به
//    `/arasanad_frontend/_next/...` درحالیکه فایل‌ها واقعاً در `/_next/...`
//    هستند → 404 برای CSS/JS/تصاویر.
//
// ⚠️ `assetPrefix` عمداً تعریف نشده است: Next به‌طور پیش‌فرض همان `/_next/`
//    را می‌سازد که با سروشدن از ریشه‌ی دامنه همخوان است. تعریف دستی تنها
//    در صورت استفاده از CDN لازم است.
//
// ⚠️ پیامد: آدرس قدیمی `https://mahdi-amouzegar.github.io/arasanad_frontend/`
//    دیگر پاسخ نمی‌دهد (مسیرها از ریشه ساخته می‌شوند). دامنه‌ی اختصاصی مرجع است.
//
// ⚠️ trailingSlash: true الزامی است.
//    بدون آن، مسیر /pricing یک فایل با نام pricing تولید می‌کند که در
//    GitHub Pages به درستی serve نمی‌شود. با آن، پوشه‌ی pricing/index.html
//    ساخته می‌شود و رفرش مستقیم هم کار می‌کند.

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // بهینه‌سازی تصویر Next.js به سرور نیاز دارد و با static export کار نمی‌کند.
    unoptimized: true,
  },
};

export default nextConfig;
