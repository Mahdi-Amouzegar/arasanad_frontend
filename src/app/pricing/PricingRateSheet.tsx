'use client';

/**
 * فاز ۱۲٫۳۴ — جدول نرخ‌های جاری خدمات.
 *
 * ⚠️ منبع نرخ‌ها در زمان اجرا `GET /pricing/catalog` است؛ هیچ نرخی از
 *    فایل ایستای کاتالوگ خوانده نمی‌شود. فقط ترکیبهای فعال دارای نرخ معتبر
 *    نمایش داده می‌شوند و نرخ‌های زمان‌بندیشده در جدول ظاهر نمی‌شوند.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import { getPricingCatalog, rateFor, type PublicPricingCatalog } from '@/lib/pricing/api';
import { errorText } from '@/components/projects/ui-utils';

interface Row {
  typeId: string;
  typeName: string;
  languageId: string;
  languageName: string;
  price: number;
}

function rowsFrom(catalog: PublicPricingCatalog | null): Row[] {
  if (!catalog) return [];
  const rows: Row[] = [];
  for (const type of catalog.types.filter((item) => item.isActive)) {
    for (const language of catalog.languages.filter((item) => item.isActive)) {
      const price = rateFor(catalog, type.id, language.id);
      if (price !== null) {
        rows.push({
          typeId: type.id,
          typeName: type.name,
          languageId: language.id,
          languageName: language.name,
          price,
        });
      }
    }
  }
  return rows;
}

export function PricingRateSheet() {
  const [catalog, setCatalog] = useState<PublicPricingCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    setLoading(true);
    void getPricingCatalog(controller.signal)
      .then((data) => {
        if (!alive) return;
        setCatalog(data);
        setError(null);
      })
      .catch((caught) => {
        if (alive) setError(errorText(caught, 'نرخ‌ها در حال حاضر در دسترس نیستند'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [attempt]);

  const rows = rowsFrom(catalog);

  if (loading) return <Skeleton height={180} />;
  if (error) {
    return (
      <div className="prj-alert" role="alert">
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={() => setAttempt((value) => value + 1)}>
          تلاش دوباره
        </Button>
      </div>
    );
  }
  if (rows.length === 0) {
    return <EmptyState title="نرخی اعلام نشده است" description="لطفاً بعداً دوباره ببینید." />;
  }

  return (
    <div>
      <div className="prj-table-wrap">
        <table className="prj-table pricing-rate-sheet">
          <thead>
            <tr>
              <th scope="col">نوع تایپ</th>
              <th scope="col">زبان</th>
              <th scope="col">قیمت هر صفحه</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.typeId}::${row.languageId}`}>
                <td data-label="نوع تایپ">{row.typeName}</td>
                <td data-label="زبان">{row.languageName}</td>
                <td data-label="قیمت هر صفحه"><Money value={row.price} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {catalog?.nextVersion ? (
        <p className="prj-note">
          نرخ جدیدی برای اجرای زمان‌بندیشده ثبت شده است؛ پس از اجرا در این جدول نمایان می‌شود.
        </p>
      ) : null}
      <div className="row" style={{ marginBlockStart: 'var(--sp-3)' }}>
        <Link href="/calculator/" className="btn btn--primary btn--sm">
          محاسبه حدودی نرخ
        </Link>
      </div>
    </div>
  );
}
