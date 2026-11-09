import Link from 'next/link';
import type { ReactNode } from 'react';

const NAV = [
  { href: '/', label: 'خانه' },
  { href: '/pricing/', label: 'نرخ‌نامه' },
  { href: '/portfolio/', label: 'نمونه‌کارها' },
  { href: '/about/', label: 'درباره ما' },
  { href: '/contact/', label: 'تماس با ما' },
];

/**
 * پوسته‌ی موقت صفحات.
 * ⚠️ در فاز ۳ و ۴ با Layout و Header نهایی Design System جایگزین می‌شود.
 */
export default function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <>
      <header
        style={{
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-6)',
            minHeight: 64,
            flexWrap: 'wrap',
          }}
        >
          <Link href="/" style={{ fontWeight: 800, fontSize: 18 }}>
            آراسند
          </Link>
          <nav aria-label="ناوبری اصلی">
            <ul
              style={{
                display: 'flex',
                gap: 'var(--space-4)',
                listStyle: 'none',
                padding: 0,
                flexWrap: 'wrap',
              }}
            >
              {NAV.slice(1).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    style={{
                      fontSize: 14,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="container" style={{ paddingBlock: 'var(--space-16)' }}>
        <h1 style={{ fontSize: 28, marginBottom: 'var(--space-4)' }}>{title}</h1>
        {description ? (
          <p
            style={{
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-6)',
              maxWidth: 720,
            }}
          >
            {description}
          </p>
        ) : null}
        {children}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          paddingBlock: 'var(--space-6)',
          color: 'var(--color-text-secondary)',
          fontSize: 13,
        }}
      >
        <div className="container">© آراسند — تمامی حقوق محفوظ است.</div>
      </footer>
    </>
  );
}
