import { useEffect, useState } from 'react';

export default function FabStack() {
  const [overFooter, setOverFooter] = useState(false);

  useEffect(() => {
    const footer = document.getElementById('site-footer');
    if (!footer) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setOverFooter(entry.isIntersecting),
      { rootMargin: '0px 0px -20% 0px', threshold: 0 }
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const cls = `fab-stack ${overFooter ? 'over-footer' : ''}`;

  return (
    <div className={cls}>
      <button className="fab-btn scroll-top-btn" onClick={scrollTop} aria-label="رفتن به بالای صفحه">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
        </svg>
      </button>
      <a href="tel:+989364272899" className="fab-btn" aria-label="تماس تلفنی سریع">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </a>
      <a href="https://typeiran.com/user/18673" target="_blank" rel="noopener" className="fab-btn" aria-label="پنل کاربری سریع typeiran">
        <img src="https://www.google.com/s2/favicons?sz=64&domain=typeiran.com" alt="typeiran" loading="lazy" />
      </a>
      <a href="https://t.me/Mehdi_Amouz" target="_blank" rel="noopener" className="fab-btn" aria-label="ارتباط سریع تلگرام">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 3 2 11l6 2 2 6 3-4 5 4z" /><path d="M10 13l9-8" />
        </svg>
      </a>
    </div>
  );
}
