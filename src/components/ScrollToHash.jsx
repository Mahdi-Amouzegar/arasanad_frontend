import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// وقتی مسیر عوض می‌شود، اگر هش (#) در URL باشد به همان بخش اسکرول می‌کند،
// وگرنه صفحه را به بالا برمی‌گرداند (رفتار طبیعی برنامه‌های چندصفحه‌ای)
export default function ScrollToHash() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // کمی تاخیر تا محتوای صفحه مقصد رندر شود
      const t = setTimeout(() => {
        const el = document.getElementById(hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [pathname, hash]);

  return null;
}
