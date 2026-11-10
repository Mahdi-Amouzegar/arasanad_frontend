'use client';

import { useMemo, useState } from 'react';
import { SERVICE_TYPES } from '@/content/catalog';
import { calculateDeposit, calculateEstimate } from '@/lib/pricing';
import { formatNumberFa } from '@/lib/datetime';
import { Money } from '@/components/ui/Money';
import { FormField, Input, Select } from '@/components/ui/Field';

const FIRST = SERVICE_TYPES[0];

/** محاسبه‌گر نرخ — محاسبه در کلاینت، بدون درخواست شبکه. */
export function PricingCalculator() {
  const [serviceId, setServiceId] = useState<string>(FIRST?.id ?? '');
  const [pages, setPages] = useState<number>(10);
  const [urgent, setUrgent] = useState(false);

  const service = useMemo(
    () => SERVICE_TYPES.find((item) => item.id === serviceId) ?? FIRST,
    [serviceId],
  );

  const total = useMemo(
    () =>
      calculateEstimate({
        pricePerPage: service?.pricePerPage ?? 0,
        pages,
        urgent,
      }),
    [service, pages, urgent],
  );

  const deposit = useMemo(() => calculateDeposit(total), [total]);

  return (
    <div className="calc-card" id="calculator">
      <div>
        <span className="eyebrow">ابزار برآورد</span>
        <h2 className="section-head__title">محاسبه‌ی هزینه‌ی تقریبی</h2>
      </div>

      <div className="form-grid">
        <FormField label="نوع خدمت" htmlFor="calc-service" required>
          <Select
            id="calc-service"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
          >
            {SERVICE_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {formatNumberFa(item.pricePerPage)} تومان
              </option>
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
            onChange={(event) => setPages(Math.max(1, Number(event.target.value) || 1))}
          />
        </FormField>
      </div>

      <div>
        <span className="field__label" id="calc-speed-label">
          زمان تحویل
        </span>
        <div className="calc-toggle" role="group" aria-labelledby="calc-speed-label">
          <button type="button" aria-pressed={!urgent} onClick={() => setUrgent(false)}>
            عادی
          </button>
          <button type="button" aria-pressed={urgent} onClick={() => setUrgent(true)}>
            فوری (+۳۰٪)
          </button>
        </div>
      </div>

      <div className="calc-result">
        <span>هزینه‌ی برآوردی</span>
        <strong>
          <Money value={total} />
        </strong>
      </div>

      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)', lineHeight: 1.9 }}>
        بیعانه‌ی تقریبی: <Money value={deposit} /> — این مبلغ برآوردی است و نرخ نهایی پس از
        بررسی فایل توسط مدیر تأیید می‌شود.
      </p>
    </div>
  );
}
