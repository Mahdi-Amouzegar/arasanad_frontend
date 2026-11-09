import { useEffect, useState } from 'react';
import Reveal from './Reveal';

const TESTIMONIALS = [
  'کارشون هم به‌موقع تحویل داده شد و هم بسیار آراسته و مرتب بود. با انصاف و دقت کار می‌کنند و کاملاً قابل‌اعتماد هستند.',
  'همیشه کارشون عالی و دقیقه. واقعاً افرادی باسلیقه و سریع هستند، خدا قوت بهشون.',
  'کارشون کاملاً حرفه‌ای و بدون هیچ دردسری پیش رفت. قیمت‌گذاری هم منصفانه بود، واقعاً ممنونم.',
  'سرعت تحویلشون واقعاً فوق‌العاده بود، انگار به سرعت برق و باد کار رو تموم کردن. با همه‌ی این سرعت، کار هم تمیز و دقیق انجام شد.',
  'با اینکه خودم زیاد وقت نذاشتم کار رو دنبال کنم، کاملاً مشخص بود که چقدر مسئولیت‌پذیر و حرفه‌ای عمل می‌کنند. هم اخلاقشون خوبه هم کارشون.',
  'دقیقاً همون چیزی که قول داده بودن رو، بدون کوچک‌ترین نقصی تحویل دادن. رعایت قواعد نگارشی و دقتشون هم فوق‌العاده بود.',
];

export default function Testimonials() {
  const [index, setIndex] = useState(0);

  const goTo = (i) => setIndex((i + TESTIMONIALS.length) % TESTIMONIALS.length);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <Reveal as="section" className="testimonials" id="testimonials">
      <h2>نظرات مشتریان</h2>
      <div className="slider" id="slider">
        {TESTIMONIALS.map((text, i) => (
          <div className={`slide ${i === index ? 'active' : ''}`} key={i}>
            <div className="testimonial-head">
              <div className="testimonial-avatar">ت</div>
              <div className="testimonial-meta">
                <span className="testimonial-name">کاربر تایپ‌ایران</span>
                <span className="testimonial-stars">★★★★★</span>
              </div>
            </div>
            <p>«{text}»</p>
          </div>
        ))}
      </div>
      <div className="slider-controls">
        <button onClick={() => goTo(index - 1)} aria-label="نظر قبلی">‹</button>
        <div className="dots">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              className={`dot ${i === index ? 'active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`نظر شماره ${i + 1}`}
            />
          ))}
        </div>
        <button onClick={() => goTo(index + 1)} aria-label="نظر بعدی">›</button>
      </div>
    </Reveal>
  );
}
