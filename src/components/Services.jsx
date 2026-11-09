import Reveal from './Reveal';

const ICON_PROPS = { viewBox: '0 0 24 24', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' };

const SERVICES = [
  { title: 'تایپ تخصصی', desc: 'تایپ دقیق متون فارسی و انگلیسی از روی دست‌نویس، فایل صوتی یا تصویر، با رعایت کامل اصول نگارشی و ویراستاری پایه.', icon: <svg {...ICON_PROPS}><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></svg> },
  { title: 'صفحه‌آرایی حرفه‌ای', desc: 'قالب‌بندی استاندارد و شکیل اسناد شما مطابق با آیین‌نامه‌های دانشگاهی یا سازمانی، شامل فهرست، سرصفحه و شماره‌گذاری منظم.', icon: <svg {...ICON_PROPS}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg> },
  { title: 'فرمول‌نویسی', desc: 'تایپ تخصصی معادلات و روابط ریاضی، فیزیک و شیمی با نرم‌افزار MathType، حتی برای فرمول‌های چندخطی و پیچیده.', icon: <svg {...ICON_PROPS}><text x="12" y="17" fontSize="15" textAnchor="middle" fill="currentColor" stroke="none" fontWeight="700">∑</text></svg> },
  { title: 'رسم اشکال فنی', desc: 'طراحی دقیق نمودار، شکل و دیاگرام‌های فنی و مهندسی با نرم‌افزار FX Draw، مطابق با استاندارد نگارش دانشگاهی.', icon: <svg {...ICON_PROPS}><circle cx="9" cy="9" r="5" /><rect x="13" y="13" width="7" height="7" /></svg> },
  { title: 'تبدیل PDF به Word', desc: 'تبدیل دقیق فایل‌های PDF (حتی اسکن‌شده) به فایل Word کاملاً قابل ویرایش، بدون به‌هم‌ریختگی جدول و قالب‌بندی.', icon: <svg {...ICON_PROPS}><path d="M6 3h9l5 5v13H6z" /><path d="M15 3v5h5" /><path d="M9 15l3 3 3-3" /><path d="M12 11v7" /></svg> },
  { title: 'ویراستاری', desc: 'ویرایش نگارشی، ساختاری و علمی متن شما برای روان‌تر شدن جملات، رفع غلط‌های املایی و یکدست‌سازی سبک نوشتار.', icon: <svg {...ICON_PROPS}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg> },
  { title: 'قالب‌بندی پایان‌نامه', desc: 'آماده‌سازی کامل پایان‌نامه مطابق با آیین‌نامه دقیق دانشگاه شما، از جلد و فهرست تا منابع و پیوست‌ها.', icon: <svg {...ICON_PROPS}><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 4.5v17" /></svg> },
  { title: 'آماده‌سازی مقاله', desc: 'فرمت‌بندی کامل مقاله مطابق راهنمای نویسندگان ژورنال هدف شما، آماده برای ارسال یا داوری.', icon: <svg {...ICON_PROPS}><path d="M6 3h9l5 5v13H6z" /><path d="M15 3v5h5" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="15" y2="16" /></svg> },
  { title: 'تایپ کتاب و جزوه', desc: 'آماده‌سازی حجم‌های بالا از کتاب، جزوه درسی یا یادداشت‌های کلاسی، با نظم و یکدستی در سراسر فایل.', icon: <svg {...ICON_PROPS}><path d="M4 6h16v14H4z" /><path d="M4 10h16" /></svg> },
  { title: 'طراحی سوالات امتحانی', desc: 'قالب‌بندی مرتب و استاندارد برگه سوالات امتحانی، شامل شماره‌گذاری، بارم‌بندی و فضای پاسخ‌نویسی.', icon: <svg {...ICON_PROPS}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8" /><path d="M8 12l2 2 4-4" /></svg> },
  { title: 'فرم‌ها و قراردادها', desc: 'تایپ دقیق و بدون خطای اسناد اداری و حقوقی حساس مانند فرم‌ها، قراردادها و لوایح، با رعایت کامل محرمانگی.', icon: <svg {...ICON_PROPS}><path d="M6 3h9l5 5v13H6z" /><path d="M15 3v5h5" /><path d="M9 15c1-1 2-1 3 0s2 1 3 0" /></svg> },
  { title: 'نامه‌های اداری', desc: 'تایپ سریع و مرتب نامه‌های اداری و مکاتبات سازمانی، آماده برای چاپ یا ارسال رسمی.', icon: <svg {...ICON_PROPS}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg> },
];

export default function Services() {
  return (
    <Reveal as="section" className="services" id="services">
      <h2>خدمات ما</h2>
      <div className="service-grid">
        {SERVICES.map((s) => (
          <div className="service-item" key={s.title}>
            <div className="service-icon">{s.icon}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
