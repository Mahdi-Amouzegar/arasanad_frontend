import Reveal from './Reveal';

const BENEFITS_IMG = '/images/site/why-us.avif';

const BENEFITS = [
  {
    title: 'تحویل سریع',
    desc: 'پروژه‌های شما را در کوتاه‌ترین زمان ممکن و بدون افت کیفیت تحویل می‌دهیم.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    title: 'دقت در جزئیات',
    desc: 'از فرمول‌نویسی تا رفرنس‌دهی، هر سند با دقت کامل بررسی و آماده می‌شود.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'تضمین محرمانگی',
    desc: 'اطلاعات و محتوای اسناد شما نزد ما کاملاً محفوظ می‌ماند.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    ),
  },
  {
    title: 'قیمت‌گذاری شفاف',
    desc: 'تعرفه‌های روشن و منصفانه، بدون هیچ هزینه پنهانی.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
];

const QUALITY_ITEMS = [
  'ویرایش رایگان ایرادات جزئی',
  'بازبینی نهایی قبل از تحویل',
  'عدم انتشار محتوای شما',
  'ضمانت بازگشت وجه',
];

export default function WhyUs() {
  return (
    <Reveal as="section" className="why-us" id="why-us">
      <div className="why-us-grid">
        <div className="why-us-visual">
          <img src={BENEFITS_IMG} alt="بررسی و آماده‌سازی اسناد در آراسند" loading="lazy" />
          <div className="quality-box">
            <div className="quality-box-head">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6z" /><path d="m9 12 2 2 4-4" /></svg>
              <span>تضمین کیفیت آراسند</span>
            </div>
            <ul>
              {QUALITY_ITEMS.map((q) => (
                <li key={q}>
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m20 6-11 11-5-5" /></svg>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="why-us-text">
          <span className="eyebrow">مزایای ما</span>
          <h2>چرا آراسند را انتخاب کنید؟</h2>
          <div className="benefit-list">
            {BENEFITS.map((b) => (
              <div className="benefit-row" key={b.title}>
                <div className="benefit-icon" aria-hidden="true">{b.icon}</div>
                <div><h3>{b.title}</h3><p>{b.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
