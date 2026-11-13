'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TextField } from '@/components/ui/Field';
import { useAlert } from '@/components/ui/AlertProvider';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { readOtpCodeFromHash, stripHash } from '@/lib/otp-qr.mjs';
import { QrScannerDialog } from './QrScannerDialog';
import {
  formatOtpInput,
  isValidOtpInput,
  loginWithOtpCode,
  OTP_CODE_TTL_MINUTES,
} from '@/lib/otp';

/**
 * ورود با کد یکبارمصرف — ویژهی دستگاههایی که تلگرام در دسترس نیست.
 *
 * ⚠️ کد از بخش پروفایل، روی دستگاهی که با تلگرام وارد شده، ساخته میشود.
 *    این فرم فقط کد را مصرف میکند؛ هیچ حساب تازهای نمیسازد و سرور کاربر
 *    صاحب کد را برمیگرداند تا دقیقاً همان حساب باز شود.
 * ⚠️ نشست حاصل «مهمان» است: نمیتواند کد تازه بسازد، پروفایل را ویرایش
 *    کند یا نشست/دستگاهی را باطل کند. این محدودیت سرور اعمال میشود.
 */
export function OtpLoginForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { signIn } = useAuth();
  const { showToast } = useAlert();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scanning, setScanning] = useState(false);

  // کد ممکن است از QR (لینک #code=…) آمده باشد. همان لحظه خوانده و
  // fragment از history پاک میشود تا کد در تاریخچه/اشتراکگذاری نماند.
  useEffect(() => {
    const read = () => {
      const fromHash = readOtpCodeFromHash(window.location.hash);
      if (fromHash) {
        setCode(fromHash);
        setError(null);
      }
      if (window.location.hash) {
        window.history.replaceState(null, '', stripHash(window.location.href));
      }
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const ready = isValidOtpInput(code);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const data = await loginWithOtpCode(code);
      signIn(data.token, data.user);
      showToast({
        type: 'success',
        title: 'خوش آمدید',
        message: `@${data.user.username} · نشست ${data.sessionTtlDays} روزه`,
      });
      router.replace('/profile/');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'ورود با کد ناموفق بود');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="calc-card">
      <div>
        <span className="eyebrow">ورود روی دستگاه دیگر</span>
        <h2 className="section-head__title">ورود با کد یکبارمصرف</h2>
        <p className="login-lead">
          کد ۱۲ کاراکتری را که در پروفایل حساب خود (روی دستگاهی که با تلگرام وارد شدهاید)
          ساختهاید، اینجا وارد کنید.
        </p>
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gap: 'var(--sp-4)' }}>
        <TextField
          label="کد یکبارمصرف"
          value={code}
          onChange={(event) => {
            setCode(formatOtpInput(event.target.value));
            setError(null);
          }}
          hint={`مثلاً X7K9-2MNP-8QRS · هر کد فقط ${OTP_CODE_TTL_MINUTES} دقیقه و یک بار اعتبار دارد`}
          error={error ?? ''}
          invalid={Boolean(error)}
          className="ltr otp-input"
          dir="ltr"
          inputMode="text"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={14}
          required
        />

        <Button block type="submit" loading={submitting} disabled={!ready}>
          <Icon name="key" size={16} />
          ورود به حساب
        </Button>

        <Button
          block
          variant="outline"
          type="button"
          onClick={() => setScanning(true)}
          disabled={submitting}
        >
          <Icon name="camera" size={16} />
          اسکن کد QR بهجای تایپ
        </Button>
      </form>

      <p className="login-note">
        با این روش وارد همان حساب اصلی میشوید، اما نشست شما محدود است: ساخت کد تازه،
        ویرایش پروفایل و ابطال دستگاهها فقط از نشست تلگرامی ممکن است.
      </p>

      <Button variant="ghost" size="sm" onClick={onBack}>
        بازگشت به انتخاب روش ورود
      </Button>

      {scanning ? (
        <QrScannerDialog
          onClose={() => setScanning(false)}
          onCode={(scanned) => {
            setCode(scanned);
            setError(null);
            setScanning(false);
          }}
        />
      ) : null}
    </div>
  );
}
