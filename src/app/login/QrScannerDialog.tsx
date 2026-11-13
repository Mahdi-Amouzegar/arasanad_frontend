'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { readOtpCodeFromUrl } from '@/lib/otp-qr.mjs';

/** تنها متدهایی که از اسکنر استفاده میکنیم — نیازی به تایپ وارداتی نیست. */
type ScannerInstance = {
  start(): Promise<void>;
  stop(): void;
  destroy(): void;
};

export interface QrScannerDialogProps {
  /** کد معتبر استخراجشده از لینکِ درون QR */
  onCode: (code: string) => void;
  onClose: () => void;
}

/**
 * اسکن QR روی «دستگاه دوم».
 *
 * ⚠️ `qr-scanner` (MIT) فقط هنگام بازشدن پنجره بهصورت پویا import میشود،
 *    پس هیچ کد دوربین/worker در باندل اولیهی صفحات وجود ندارد.
 * ⚠️ کتابخانه در مرورگرهای دارای `BarcodeDetector` از همان API بومی استفاده
 *    میکند و در iOS/Safari به موتور محلیِ باندلشده falling back میکند؛
 *    هیچ CDN، WASM خارجی یا سرویس پولی لازم نیست.
 * ⚠️ کد از fragment لینک خوانده میشود و بلافاصله پردازش میگردد.
 */
export function QrScannerDialog({ onCode, onClose }: QrScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState(false);
  const foundRef = useRef(false);
  const errorShownRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let scanner: ScannerInstance | null = null;

    const showError = (message: string) => {
      if (cancelled || errorShownRef.current) return;
      errorShownRef.current = true;
      setError(message);
      setStarting(false);
    };

    void (async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
        const { default: QrScanner } = await import('qr-scanner');
        if (cancelled) return;

        scanner = new QrScanner(
          video,
          (result) => {
            const code = readOtpCodeFromUrl(result.data);
            if (!code) {
              showError('این QR مربوط به کد ورود آراسند نیست.');
              return;
            }
            if (foundRef.current || cancelled) return;
            foundRef.current = true;
            setFound(true);
            scanner?.stop();
            onCodeRef.current(code);
          },
          {
            preferredCamera: 'environment',
            maxScansPerSecond: 4,
            highlightScanRegion: true,
            returnDetailedScanResult: true,
          },
        );

        await scanner.start();
        if (!cancelled) setStarting(false);
      } catch {
        showError(
          'دوربین در دسترس نیست یا اجازهی دسترسی داده نشد. میتوانید کد را بهصورت دستی وارد کنید.',
        );
      }
    })();

    return () => {
      cancelled = true;
      scanner?.stop();
      scanner?.destroy();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="qr-modal" role="presentation" onClick={onClose}>
      <div
        className="qr-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label="اسکن کد QR ورود"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="qr-modal__head">
          <div>
            <span className="eyebrow">ورود سریع</span>
            <h2 className="section-head__title">اسکن کد QR</h2>
          </div>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <Icon name="x" size={18} />
          </button>
        </div>

        <p className="login-note">
          QR نمایشدادهشده در پروفایل دستگاه اصلی را مقابل دوربین بگیرید.
          کد بهصورت خودکار وارد میشود.
        </p>

        <div className="qr-modal__viewport">
          <video ref={videoRef} muted playsInline autoPlay />
          {starting || error ? (
            <div className="qr-modal__overlay" role="status">
              <Icon name={error ? 'alert' : 'camera'} size={26} />
              <span>{error ?? 'در حال راهاندازی دوربین…'}</span>
            </div>
          ) : null}
        </div>

        {found ? <p className="qr-modal__found">کد پیدا شد؛ در حال ورود…</p> : null}

        <Button variant="ghost" size="sm" onClick={onClose} block>
          بستن و وارد کردن دستی
        </Button>
      </div>
    </div>
  );
}
