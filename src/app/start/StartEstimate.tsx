'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SERVICE_TYPES } from '@/content/catalog';
import { BRAND } from '@/content/site';
import { calculateDeposit, calculateEstimate } from '@/lib/pricing';
import { buildOrderMessage } from '@/lib/order-message.mjs';
import { Money } from '@/components/ui/Money';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { FormField, Input, Select } from '@/components/ui/Field';
import { useAlert } from '@/components/ui/AlertProvider';
import {
  guestDraftLoginHref,
  loadGuestDraft,
  saveGuestDraft,
  type GuestOrderDraft,
} from '@/lib/guest-order';

const FIRST = SERVICE_TYPES[0];

/**
 * مسیر تبدیل موقت تا فاز ۷.
 *
 * ⚠️ هیچ درخواست شبکه‌ای و هیچ «ثبت سفارش» ساختگی انجام نمی‌شود: برآورد از
 *    همان `calculateEstimate` نرخ‌نامه گرفته می‌شود و خروجی نهایی یک متن
 *    پیشثبتنام است که کاربر کپی می‌کند و برای مدیر می‌فرستد.
 */
export function StartEstimate() {
  const { showToast } = useAlert();
  const [serviceId, setServiceId] = useState(FIRST?.id ?? '');
  const [pages, setPages] = useState(10);
  const [urgent, setUrgent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [restored, setRestored] = useState(false);

  const service = useMemo(
    () => SERVICE_TYPES.find((item) => item.id === serviceId) ?? FIRST,
    [serviceId],
  );

  const total = useMemo(
    () => calculateEstimate({ pricePerPage: service?.pricePerPage ?? 0, pages, urgent }),
    [service, pages, urgent],
  );
  const deposit = useMemo(() => calculateDeposit(total), [total]);

  const message = useMemo(
    () =>
      buildOrderMessage({
        serviceName: service?.name ?? 'تایپ فارسی',
        pages,
        urgent,
        total,
        deposit,
      }),
    [service, pages, urgent, total, deposit],
  );

  // فاز ۱۲٫۶-پ: بازگشت از ورود به همان پیش‌نویس سفارش.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = new URLSearchParams(window.location.search).get('draft');
    if (!id) return;
    const draft = loadGuestDraft(id);
    if (!draft || !SERVICE_TYPES.some((item) => item.id === draft.serviceId)) return;
    setServiceId(draft.serviceId);
    setPages(draft.pages);
    setUrgent(draft.urgent);
    setDraftId(draft.id);
    setGateOpen(true);
    setRestored(true);
    setCopied(false);
  }, []);

  /** مهمان پیش‌نویس را ذخیره می‌کند؛ ارسال به سرور فقط پس از ورود انجام می‌شود. */
  function beginGuestOrder() {
    const id =
      globalThis.crypto?.randomUUID?.() ??
      `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const draft: GuestOrderDraft = {
      id,
      serviceId,
      pages,
      urgent,
      createdAt: new Date().toISOString(),
    };
    saveGuestDraft(draft);
    setDraftId(id);
    setGateOpen(true);
    setCopied(false);
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      showToast({ type: 'success', title: 'متن کپی شد', message: 'همین متن را در تلگرام بفرستید.' });
    } catch {
      showToast({
        type: 'error',
        title: 'کپی نشد',
        message: 'مرورگر اجازه نداد؛ متن زیر را دستی رونوشت کنید.',
      });
    }
  }

  return (
    <div className="start-flow" id="start-flow">
      <div className="calc-card">
        <div>
          <span className="eyebrow">گام ۱ — برآورد</span>
          <h2 className="section-head__title">هزینه‌ی تقریبی سفارش</h2>
          <p className="login-note">
            نرخ‌ها همان نرخنامهاند. مبلغ نهایی پس از دیدن فایل توسط مدیر تأیید می‌شود.
          </p>
        </div>

        <div className="form-grid">
          <FormField label="نوع خدمت" htmlFor="start-service" required>
            <Select
              id="start-service"
              value={serviceId}
              onChange={(event) => {
                setServiceId(event.target.value);
                setCopied(false);
              }}
            >
              {SERVICE_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="تعداد صفحه" htmlFor="start-pages" required>
            <Input
              id="start-pages"
              type="number"
              min={1}
              inputMode="numeric"
              value={pages}
              onChange={(event) => {
                setPages(Math.max(1, Number(event.target.value) || 1));
                setCopied(false);
              }}
            />
          </FormField>
        </div>

        <div>
          <span className="field__label" id="start-speed-label">
            زمان تحویل
          </span>
          <div className="calc-toggle" role="group" aria-labelledby="start-speed-label">
            <button
              type="button"
              aria-pressed={!urgent}
              onClick={() => {
                setUrgent(false);
                setCopied(false);
              }}
            >
              عادی
            </button>
            <button
              type="button"
              aria-pressed={urgent}
              onClick={() => {
                setUrgent(true);
                setCopied(false);
              }}
            >
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
        <p className="login-note">
          بیعانه‌ی تقریبی: <Money value={deposit} />
        </p>
      </div>

      <div className="calc-card start-flow__submit">
        <div>
          <span className="eyebrow">گام ۲ — ارسال درخواست</span>
          <h2 className="section-head__title">پیشثبتنام</h2>
        </div>

        {restored ? (
          <p className="login-note">پیش‌نویس شمارهٔ {draftId} بازگشایی شد.</p>
        ) : null}

        {gateOpen && draftId ? (
          <div className="start-flow__gate" role="note">
            <Icon name="shield" size={18} />
            <div>
              <strong>برای پرداخت وارد شوید</strong>
              <p>
                پیش‌نویس سفارش شمارهٔ {draftId} ذخیره شد. مبلغ نهایی، مرجع و
                درگاه پرداخت را سرور پس از ورود و بررسی فایل نشان می‌دهد؛
                هیچ مبلغی از همین صفحه گرفته نمی‌شود.
              </p>
              <Link className="btn btn--primary btn--sm" href={guestDraftLoginHref(draftId)}>
                ورود و ادامه همان سفارش
              </Link>
              <Link
                className="btn btn--outline btn--sm"
                href={`/panel/projects/new/?draft=${encodeURIComponent(draftId)}`}
              >
                ادامه در فرم ثبت سفارش
              </Link>
            </div>
          </div>
        ) : (
          <div className="start-flow__cta" role="note">
            <Icon name="checkCircle" size={18} />
            <div>
              <strong>آغاز سفارش بدون ورود</strong>
              <p>
                برآورد و پیش‌نویس سفارش همین‌جا ذخیره می‌شود و نیازی به ورود
                ندارد. هنگام پرداخت، پیام روشن ورود به حساب را می‌بینید و
                پس از ورود به همان سفارش بازمیگردید. متن زیر هم قابل کپی
                و ارسال دستی در تلگرام است.
              </p>
              <Button onClick={beginGuestOrder}>
                <Icon name="plus" size={16} />
                شروع سفارش بدون ورود
              </Button>
            </div>
          </div>
        )}

        <pre className="start-flow__message" dir="rtl">{message}</pre>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Button onClick={copyMessage}>
            <Icon name={copied ? 'check' : 'copy'} size={16} />
            {copied ? 'متن کپی شد' : 'کپی متن درخواست'}
          </Button>
          <a
            href={`https://t.me/${BRAND.adminTelegram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline"
          >
            <Icon name="send" size={16} />
            باز کردن تلگرام مدیر
          </a>
        </div>
      </div>
    </div>
  );
}
