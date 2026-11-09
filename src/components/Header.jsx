import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { spawnRipple } from '../utils/ripple';

const PAGE_LINKS = [
  { to: '/#services', label: 'خدمات', home: true, hash: 'services' },
  { to: '/portfolio', label: 'نمونه‌کار' },
  { to: '/pricing', label: 'تعرفه‌ها' },
  { to: '/#how', label: 'نحوه سفارش', home: true, hash: 'how' },
  { to: '/about', label: 'درباره ما' },
  { to: '/contact', label: 'ارتباط با ما' },
];

export default function Header() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  const [scrolled, setScrolled] = useState(!isHome);
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('');

  // فقط در صفحه اصلی: هدر تا وقتی بخش Hero دیده می‌شود شفاف/ساده است؛
  // به‌محض خروج Hero از دید، حالت چسبان (توپر + سایه) فعال می‌شود.
  // چون هدر همیشه position:fixed است (نه sticky با تغییر پدینگ)، هیچ‌وقت باعث
  // جابه‌جایی بقیه‌ی بخش‌های صفحه نمی‌شود.
  useEffect(() => {
    if (!isHome) { setScrolled(true); return undefined; }
    setScrolled(false);
    const sentinel = document.getElementById('hero-sentinel');
    if (!sentinel) { setScrolled(window.scrollY > 40); return undefined; }
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: '-72px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isHome, location.pathname]);

  useEffect(() => {
    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  useEffect(() => {
    if (!isHome) { setActiveHash(''); return undefined; }
    const sectionMap = new Map();
    PAGE_LINKS.filter((l) => l.home).forEach(({ hash }) => {
      const section = document.getElementById(hash);
      if (section) sectionMap.set(section, hash);
    });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const hash = sectionMap.get(entry.target);
          if (hash && entry.isIntersecting) setActiveHash(hash);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sectionMap.forEach((_, section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isHome, location.pathname]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <header className={`site-header ${scrolled ? 'scrolled' : 'transparent'}`} id="site-header">
        <div className="scroll-progress" style={{ width: `${progress}%` }} />
        <div className="nav-wrap">
          <Link to="/" className="logo logo-anim" aria-label="آراسند">
            <span className="logo-part" style={{ '--tx': '-30px', '--ty': '-20px', animationDelay: '0.05s' }}>آ</span>
            <span className="logo-part" style={{ '--tx': '26px', '--ty': '-24px', animationDelay: '0.18s' }}>ر</span>
            <span className="logo-part" style={{ '--tx': '-22px', '--ty': '22px', animationDelay: '0.31s' }}>ا</span>
            <span className="logo-part logo-accent" style={{ '--tx': '34px', '--ty': '18px', animationDelay: '0.44s' }}>سند</span>
          </Link>

          <button
            className={`menu-toggle ${menuOpen ? 'active' : ''}`}
            aria-label="باز کردن منو"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span></span><span></span><span></span>
          </button>

          <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
            {PAGE_LINKS.map((link) =>
              link.home ? (
                <Link
                  key={link.to}
                  to={link.to}
                  className={isHome && activeHash === link.hash ? 'active' : ''}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              ) : (
                <NavLink key={link.to} to={link.to} onClick={closeMenu}>
                  {link.label}
                </NavLink>
              )
            )}
          </nav>

          <Link to="/contact" className="btn-cta" onClick={spawnRipple}>
            ثبت سفارش
          </Link>
        </div>
      </header>
      {!isHome && <div className="header-spacer" />}
    </>
  );
}
