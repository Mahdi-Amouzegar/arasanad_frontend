import { useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';
import Lightbox from './Lightbox';

function PortfolioItem({ item, onOpen }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) return null; // اگر عکس هنوز آپلود نشده، کارت خالی نمایش داده نمی‌شود

  const src = `/images/${item.file}`;

  return (
    <figure
      className={`portfolio-item ${loaded ? 'loaded' : ''}`}
      onClick={() => onOpen(src, item.title)}
    >
      <img
        src={src}
        alt={item.title || 'نمونه کار آراسند'}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      <div className="portfolio-overlay">
        <span className="portfolio-view-btn">مشاهده نمونه</span>
      </div>
      {item.title && <figcaption className="portfolio-caption">{item.title}</figcaption>}
    </figure>
  );
}

export default function Portfolio() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(false);
  const lightboxRef = useRef(null);

  useEffect(() => {
    fetch('/data/portfolio.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('network');
        return res.json();
      })
      .then(setItems)
      .catch(() => setError(true));
  }, []);

  return (
    <Reveal as="section" className="portfolio" id="portfolio">
      <h2>نمونه‌کارها</h2>
      <p className="portfolio-note">گوشه‌ای از کارهایی که برای مشتریان آماده کرده‌ایم.</p>

      <div className="portfolio-grid" id="portfolio-grid">
        {error && (
          <p className="portfolio-loading">نمونه‌کارها موقتاً در دسترس نیست. لطفاً بعداً دوباره تلاش کنید.</p>
        )}
        {!error && items === null &&
          Array.from({ length: 4 }).map((_, i) => <div className="skeleton skeleton-portfolio" key={i} />)}
        {!error && items?.map((item) => (
          <PortfolioItem key={item.file} item={item} onOpen={(src, title) => lightboxRef.current?.open(src, title)} />
        ))}
      </div>

      <Lightbox ref={lightboxRef} />
    </Reveal>
  );
}
