'use client';

import { useEffect, useMemo, useState } from 'react';
import { QrCode } from '@/components/ui/QrCode';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { BASE_PATH } from '@/lib/config';
import { buildOtpLoginUrl, formatCountdown, remainingSeconds } from '@/lib/otp-qr.mjs';
import type { OtpCodeResult } from '@/lib/otp';

export interface OtpQrPanelProps {
  code: OtpCodeResult;
  onCopied?: () => void;
}

/**
 * QR مخصوص کد تازهای که همینجا ساخته شده است.
 *
 * ⚠️ فقط در نشست `issueOtpCode` رندر میشود (پدرش این را تضمین میکند).
 * ⚠️ مبدأ لینک از `window.location.origin` خوانده میشود، نه یک ثابت هاردکد،
 *    تا پس از اتصال دامنهی اختصاصی (O-42) QR خودبهخود معتبر بماند.
 * ⚠️ پس از انقضا، QR پنهان میشود تا کد مرده به دستگاه دیگری نرسد.
 */
export function OtpQrPanel({ code, onCopied }: OtpQrPanelProps) {
  const [origin, setOrigin] = useState<string | null>(null);
  const [left, setLeft] = useState(() => remainingSeconds(code.expiresAt));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setLeft(remainingSeconds(code.expiresAt));
    const timer = window.setInterval(() => {
      const next = remainingSeconds(code.expiresAt);
      setLeft(next);
      if (next <= 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [code.expiresAt]);

  const url = useMemo(() => {
    if (!origin) return null;
    try {
      return buildOtpLoginUrl({ origin, basePath: BASE_PATH, code: code.code });
    } catch {
      return null;
    }
  }, [origin, code.code]);

  const expired = left <= 0;

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopied?.();
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="otp-qr">
      <div className="otp-qr__head">
        <span className="otp-qr__icon" aria-hidden="true">
          <Icon name="qr" size={18} />
        </span>
        <div>
          <strong>ورود سریع با QR</strong>
          <p>
            با دوربین دستگاه دوم اسکن کنید تا صفحهی ورود با کد پرشده باز شود.
            کد در fragment لینک است و به سرور فرستاده نمیشود.
          </p>
        </div>
      </div>

      {expired ? (
        <p className="otp-qr__expired" role="status">
          <Icon name="clock" size={15} /> این کد منقضی شده است؛ QR دیگر نمایش داده نمیشود.
        </p>
      ) : url ? (
        <div className="otp-qr__body">
          <div className="otp-qr__frame">
            <QrCode value={url} label="کد QR ورود به حساب" />
          </div>
          <div className="otp-qr__side">
            <span className="otp-qr__timer" aria-live="polite">
              <Icon name="clock" size={15} />
              <span className="ltr tabular">{formatCountdown(left)}</span>
              <span>تا انقضا</span>
            </span>
            <Button variant="outline" size="sm" onClick={copyLink} disabled={copied}>
              <Icon name={copied ? 'check' : 'copy'} size={14} />
              {copied ? 'لینک کپی شد' : 'کپی لینک ورود'}
            </Button>
            <p className="otp-qr__hint">
              یا کد را مستقیماً در صفحهی ورود وارد کنید. هر کد فقط یک بار مصرف میشود.
            </p>
          </div>
        </div>
      ) : (
        <p className="otp-qr__hint">در حال آمادهسازی QR…</p>
      )}
    </div>
  );
}
