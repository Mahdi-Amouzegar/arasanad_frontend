import PageShell from '@/components/PageShell';

export default function HomePage() {
  return (
    <PageShell
      title="نسخه‌ی جدید آراسند در حال آماده‌سازی است"
      description="سامانه‌ی ثبت سفارش، پیگیری پروژه، پرداخت و تحویل فایل به‌زودی در همین نشانی در دسترس قرار می‌گیرد."
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          maxWidth: 720,
        }}
      >
        <h2 style={{ fontSize: 18, marginBottom: 'var(--space-4)' }}>
          تا آن زمان می‌توانید با ما در تماس باشید
        </h2>
        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
          <li>
            تلگرام:{' '}
            <a href="https://t.me/Mehdi_Amouz" style={{ color: 'var(--color-primary)' }}>
              @Mehdi_Amouz
            </a>
          </li>
          <li>
            تلفن:{' '}
            <a href="tel:+989364272899" style={{ color: 'var(--color-primary)' }}>
              ۰۹۳۶۴۲۷۲۸۹۹
            </a>
          </li>
          <li>
            ایمیل:{' '}
            <a href="mailto:mhdamouz@gmail.com" style={{ color: 'var(--color-primary)' }}>
              mhdamouz@gmail.com
            </a>
          </li>
        </ul>
      </div>
    </PageShell>
  );
}
