'use client';

/**
 * فاز ۱۲٫۱۷ — پروفایل عمومی بدون بیلد، از طریق `/panel/?u=CODE`.
 *
 * ⚠️ `searchParams` در خروجی ایستا در دسترس نیست؛ بنابراین کد پروفایل
 *    تنها پس از hydration از `location.search` خوانده می‌شود. بدین‌ترتیب
 *    هم بارگذاری مستقیم و هم بارگذاری مجدد صفحه کار می‌کند.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { PublicProfileView } from '@/components/panel/PublicProfileView';
import { Skeleton } from '@/components/ui/Skeleton';
import { isValidPublicId } from '@/lib/public-id';

export function PublicProfileQuery() {
  // `undefined` یعنی هنوز خوانده‌نشده؛ `null` یعنی کد غایب یا نامعتبر.
  const [code, setCode] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('u') ?? '';
    const normalized = raw.trim().toLowerCase();
    setCode(isValidPublicId(normalized) ? normalized : null);
  }, []);

  if (code === undefined) {
    return (
      <PublicLayout>
        <section aria-busy="true">
          <Skeleton height={20} width="40%" />
          <Skeleton height={44} radius="12px" />
        </section>
      </PublicLayout>
    );
  }

  if (code === null) {
    return (
      <PublicLayout>
        <section>
          <h1 style={{ fontSize: 'var(--fs-section)', fontWeight: 'var(--fw-semibold)' }}>
            پروفایل یافت نشد
          </h1>
          <p style={{ color: 'var(--c-text-secondary)', marginBlock: 'var(--sp-3)' }}>
            کد پروفایلی که وارد کردید معتبر نیست یا وجود ندارد. لینک را دوباره از صاحب پروفایل بگیرید.
          </p>
          <Link href="/" className="btn btn--outline btn--sm">
            بازگشت به صفحه اصلی
          </Link>
        </section>
      </PublicLayout>
    );
  }

  return <PublicProfileView handle={code} />;
}
