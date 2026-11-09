import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';

const ABOUT_IMG_1 = '/images/site/about-intro.avif';
const ABOUT_IMG_2 = '/images/site/about-story.avif';

const VALUES = [
  { title: 'دقت در جزئیات', icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg> },
  { title: 'امانت‌داری', icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg> },
  { title: 'تحویل به‌موقع', icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg> },
  { title: 'شفافیت قیمت', icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2" /></svg> },
  { title: 'به‌روز بودن', icon: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 1 3 6.7" /><path d="M3 17v-5h5" /></svg> },
];

function AboutCounter({ target }) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          let current = 0;
          const step = Math.max(1, Math.floor(target / 60));
          const interval = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(interval); }
            setValue(current);
          }, 20);
        }
      }),
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref} className="stat-num">{value.toLocaleString('fa-IR')}+</span>;
}

export default function About() {
  return (
    <>
      <section className="about-intro">
        <Reveal className="about-intro-text">
          <span className="eyebrow">درباره ما</span>
          <h1>دقت، سرعت و اطمینان در هر کلمه</h1>
          <p>
            ما در آراسند متعهد به ارائه خدمات تایپ و ویرایش متون با بالاترین استانداردهای کیفی هستیم. هدف
            ما تسریع در فرآیندهای مستندسازی شما، با حفظ دقت کامل، است.
          </p>
          <p>
            آراسند از ترکیب «آراستن» و «سند» شکل گرفته — یعنی برندی که اسناد را آراسته و استاندارد تحویل
            می‌دهد؛ نه صرفاً یک تایپیست، بلکه یک همراه مطمئن برای آماده‌سازی کامل سند شما.
          </p>
        </Reveal>
        <Reveal className="about-intro-visual">
          <img src={ABOUT_IMG_1} alt="آماده‌سازی حرفه‌ای اسناد در آراسند" loading="lazy" />
          <div className="about-stats-box">
            <div><AboutCounter target={8000} /><span>پروژه موفق</span></div>
            <div><span className="stat-num-text">‎+۱۰</span><span>سال سابقه</span></div>
            <div><span className="stat-num-text">۷</span><span>رتبه TypeIran</span></div>
            <div><span className="stat-num-text">۱۲+</span><span>نوع خدمت</span></div>
          </div>
        </Reveal>
      </section>

      <Reveal as="section" className="about-story">
        <div className="about-story-visual">
          <img src={ABOUT_IMG_2} alt="داستان شکل‌گیری آراسند" loading="lazy" />
        </div>
        <div className="about-story-text">
          <span className="eyebrow">داستان ما</span>
          <h2>چطور آراسند شکل گرفت</h2>
          <p>
            آراسند از دل تجربه‌ی واقعی در تایپ و آماده‌سازی صدها پروژه دانشگاهی و اداری شکل گرفته — بیش از
            ۸۰۰۰ پروژه موفق و رتبه ۷ در سایت typeiran. این تجربه نشان داد که نیاز مشتریان فراتر از «تایپ
            ساده» است؛ آن‌ها به یک همراه مطمئن برای آماده‌سازی کامل سند خود نیاز دارند.
          </p>
          <p>
            امروز، آراسند برای پاسخ به همین نیاز ساخته شده: ارائه یک راه‌حل کامل برای آماده‌سازی و
            استانداردسازی اسناد دانشگاهی، اداری و تجاری — با دقت، امانت‌داری و تحویل به‌موقع.
          </p>
        </div>
      </Reveal>

      <Reveal as="section" className="about-values">
        <h2>ارزش‌های ما</h2>
        <div className="values-grid">
          {VALUES.map((v) => (
            <div className="value-card" key={v.title}>
              <span className="value-icon">{v.icon}</span>
              <h4>{v.title}</h4>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="about-cta">
        <h2>آماده‌اید سند خود را بسپارید به آراسند؟</h2>
        <Link to="/contact" className="btn-primary">ثبت سفارش</Link>
      </Reveal>
    </>
  );
}
