import { useEffect, useRef, useState } from 'react';

// هوک قابل استفاده مجدد برای افکت "ظاهر شدن هنگام اسکرول"
// جایگزین منطق querySelectorAll('.reveal') در نسخه HTML/JS قدیمی
export default function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, visible];
}
