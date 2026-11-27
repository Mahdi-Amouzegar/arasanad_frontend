'use client';

/**
 * فاز ۱۲٫۳۴ — محاسبه‌گر برآورد، کاملاً سرورمحور.
 *
 * ⚠️ لیست نوع/زبان از `GET /pricing/catalog` می‌آید و نتیجه فقط از
 *    `POST /pricing/quote` خوانده می‌شود؛ هیچ ضرب، گردکردن یا بیعانهای
 *    در کلاینت محاسبه نمی‌شود و هیچ سفارشی ساخته نمی‌شود.
 */

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/Field';
import { Money } from '@/components/ui/Money';
import {
  getPricingCatalog,
  getPricingQuote,
  type PricingQuoteResult,
  type PublicPricingCatalog,
} from '@/lib/pricing/api';
import { errorText } from '@/components/projects/ui-utils';

interface PricingCalculatorProps {
  /** شناسهای برای لنگر `#calculator` در صفحه نرخ‌نامه. */
  id?: string;
  /** در صفحه‌ی مستقل محاسبه‌گر همان رفتار را دارد. */
  standalone?: boolean;
}

export function PricingCalculator({ id = 'calculator', standalone = false }: PricingCalculatorProps) {
  const [catalog, setCatalog] = useState<PublicPricingCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [typeId, setTypeId] = useState('');
  const [languageId, setLanguageId] = useState('');
  const [pages, setPages] = useState('10');
  const [urgent, setUrgent] = useState(false);
  const [deliveryHours, setDeliveryHours] = useState('48');
  const [result, setResult] = useState<PricingQuoteResult | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    void getPricingCatalog(controller.signal)
      .then((data) => {
        if (!alive) return;
        setCatalog(data);
        const firstType = data.types.find((item) => item.isActive) ?? data.types[0];
        const firstLanguage = data.languages.find((item) => item.isActive) ?? data.languages[0];
        setTypeId((current) => current || firstType?.id || '');
        setLanguageId((current) => current || firstLanguage?.id || '');
        setCatalogError(null);
      })
      .catch((caught) => {
        if (alive) setCatalogError(errorText(caught, 'نرخ‌نامه در دسترس نیست'));
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  const activeTypes = useMemo(() => (catalog?.types ?? []).filter((item) => item.isActive), [catalog]);
  const activeLanguages = useMemo(
    () => (catalog?.languages ?? []).filter((item) => item.isActive),
    [catalog],
  );

  function resetResult() {
    setResult(null);
    setQuoteError(null);
  }

  function setDelivery(urgentNext: boolean) {
    setUrgent(urgentNext);
    setDeliveryHours(urgentNext ? '12' : '48');
    resetResult();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setQuoteError(null);
    setResult(null);
    const sourcePageCount = Number(pages);
    const hours = Number(deliveryHours);
    if (!Number.isInteger(sourcePageCount) || sourcePageCount < 1) {
      setQuoteError('تعداد صفحه باید عددی مثبت باشد');
      return;
    }
    if (!Number.isInteger(hours) || hours < 1) {
      setQuoteError('زمان تحویل باید عددی مثبت به ساعت باشد');
      return;
    }
    if (!typeId || !languageId) {
      setQuoteError('نوع خدمت و زبان را انتخاب کنید');
      return;
    }
    setBusy(true);
    try {
      const data = await getPricingQuote({
        typeId,
        languageId,
        sourcePageCount,
        deliveryHours: hours,
        urgent,
      });
      setResult(data);
    } catch (caught) {
      setQuoteError(errorText(caught, 'برآورد انجام نشد؛ لطفاً دوباره تلاش کنید'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="calc-card" id={id}>
      <div>
        <span className="eyebrow">ابزار برآورد</span>
        <h2 className="section-head__title">محاسبه‌ی حدودی نرخ</h2>
        <p className="login-note">
          مبلغ را سرور بر اساس نرخ جاری اعلام می‌کند؛ این صفحه سفارشی ثبت نمی‌کند.
        </p>
      </div>

      {catalogError ? <div className="prj-alert" role="alert">{catalogError}</div> : null}

      <form onSubmit={(event) => void submit(event)}>
        <div className="form-grid">
          <FormField label="نوع خدمت" htmlFor="calc-service" required>
            <Select
              id="calc-service"
              value={typeId}
              onChange={(event) => {
                setTypeId(event.target.value);
                resetResult();
              }}
            >
              {activeTypes.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="زبان سند" htmlFor="calc-language" required>
            <Select
              id="calc-language"
              value={languageId}
              onChange={(event) => {
                setLanguageId(event.target.value);
                resetResult();
              }}
            >
              {activeLanguages.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="تعداد صفحه" htmlFor="calc-pages" required>
            <Input
              id="calc-pages"
              type="number"
              min={1}
              inputMode="numeric"
              value={pages}
              onChange={(event) => {
                setPages(event.target.value);
                resetResult();
              }}
            />
          </FormField>

          <FormField label="زمان تحویل (ساعت)" htmlFor="calc-hours" required>
            <Input
              id="calc-hours"
              type="number"
              min={1}
              inputMode="numeric"
              value={deliveryHours}
              onChange={(event) => {
                setDeliveryHours(event.target.value);
                resetResult();
              }}
            />
          </FormField>
        </div>

        <div>
          <span className="field__label" id="calc-speed-label">زمان تحویل</span>
          <div className="calc-toggle" role="group" aria-labelledby="calc-speed-label">
            <button type="button" aria-pressed={!urgent} onClick={() => setDelivery(false)}>
              عادی
            </button>
            <button type="button" aria-pressed={urgent} onClick={() => setDelivery(true)}>
              فوری
            </button>
          </div>
        </div>

        <div className="row" style={{ marginBlockStart: 'var(--sp-3)' }}>
          <Button type="submit" loading={busy} disabled={!catalog || activeTypes.length === 0}>
            محاسبه حدودی نرخ
          </Button>
          {!standalone ? (
            <Link href="/calculator/" className="btn btn--outline">
              صفحه‌ی محاسبه‌گر
            </Link>
          ) : null}
        </div>
      </form>

      {quoteError ? <div className="prj-alert" role="alert">{quoteError}</div> : null}

      {result ? (
        <div className="calc-result" aria-live="polite">
          <span>هزینه‌ی برآوردی</span>
          <strong><Money value={result.estimateAmount} /></strong>
          <p className="login-note">
            بیعانه: <Money value={result.depositAmount} /> — نرخ هر صفحه:{' '}
            <Money value={result.basePricePerPage} />
          </p>
        </div>
      ) : null}

      <p className="prj-note">
        برآورد نهایی نیست؛ مبلغ نهایی پس از بررسی فایل توسط مدیر تأیید می‌شود.
      </p>
    </div>
  );
}
