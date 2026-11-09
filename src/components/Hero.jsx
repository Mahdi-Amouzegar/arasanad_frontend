import { Link } from 'react-router-dom';
import Reveal from './Reveal';
import { spawnRipple } from '../utils/ripple';

const HERO_IMG = '/images/site/hero.avif';

export default function Hero() {
  return (
    <section className="hero">
      <div className="floating-shapes" aria-hidden="true">
        <span className="shape shape-1"></span>
        <span className="shape shape-2"></span>
        <span className="shape shape-3"></span>
      </div>

      <div className="hero-grid">
        <Reveal className="hero-inner">
          <span className="eyebrow">سرویس تایپ آنلاین</span>
          <h1>آراستن اسناد شما، با دقت و اطمینان</h1>
          <p>
            آراسند خدمات تایپ، ویرایش، صفحه‌آرایی و آماده‌سازی حرفه‌ای انواع اسناد دانشگاهی، اداری و تجاری را
            با سرعت و دقت بالا انجام می‌دهد.
          </p>
          <div className="hero-actions">
            <Link to="/contact" className="btn-primary" onClick={spawnRipple}>
              ثبت سفارش
            </Link>
            <a href="#services" className="btn-outline" onClick={spawnRipple}>مشاهده خدمات</a>
          </div>
        </Reveal>

        <Reveal className="hero-visual">
          <img src={HERO_IMG} alt="کار با دقت روی اسناد و متون" loading="eager" className="hero-photo" />
          <div className="glass-badge">+۸۰۰۰ پروژه موفق</div>
        </Reveal>
      </div>

      {/* سنسور نامرئی: وقتی از دید خارج شود، هدر حالت چسبان به خود می‌گیرد */}
      <span id="hero-sentinel" aria-hidden="true"></span>
    </section>
  );
}
