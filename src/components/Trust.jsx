import { useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';

function Counter({ target }) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);
  const [bounce, setBounce] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            let current = 0;
            const step = Math.max(1, Math.floor(target / 60));
            const interval = setInterval(() => {
              current += step;
              if (current >= target) {
                current = target;
                clearInterval(interval);
                setBounce(true);
              }
              setValue(current);
            }, 20);
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span
      ref={ref}
      className={`stat-num ${bounce ? 'bounce' : ''}`}
      onAnimationEnd={() => setBounce(false)}
    >
      {value.toLocaleString('fa-IR')}+
    </span>
  );
}

export default function Trust() {
  return (
    <Reveal as="section" className="trust" id="trust">
      <h2>آراسند در یک نگاه</h2>
      <div className="stats">
        <div className="stat"><Counter target={8000} /><span className="stat-label">پروژه موفق</span></div>
        <div className="stat"><span className="stat-num-text">+۱۰</span><span className="stat-label">سال سابقه کاری</span></div>
        <div className="stat"><span className="stat-num-text">۷</span><span className="stat-label">رتبه در TypeIran</span></div>
      </div>
    </Reveal>
  );
}
