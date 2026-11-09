import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="container"
      style={{
        paddingBlock: 'var(--space-16)',
        textAlign: 'center',
        minHeight: '60dvh',
        display: 'grid',
        placeContent: 'center',
        gap: 'var(--space-4)',
      }}
    >
      <p style={{ fontSize: 48, fontWeight: 800, color: 'var(--color-primary)' }}>
        ۴۰۴
      </p>
      <h1 style={{ fontSize: 22 }}>این صفحه پیدا نشد</h1>
      <p style={{ color: 'var(--color-text-secondary)' }}>
        ممکن است نشانی را اشتباه وارد کرده باشید یا صفحه جابه‌جا شده باشد.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          marginTop: 'var(--space-4)',
          padding: '10px 24px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary)',
          color: '#fff',
          fontWeight: 600,
        }}
      >
        بازگشت به صفحه اصلی
      </Link>
    </main>
  );
}
