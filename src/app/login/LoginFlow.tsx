'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAlert } from '@/components/ui/AlertProvider';
import { useAuth, startBotLogin, checkBotStatus } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { readOtpCodeFromHash } from '@/lib/otp-qr.mjs';
import { OtpLoginForm } from './OtpLoginForm';

type Phase = 'idle' | 'starting' | 'waiting' | 'expired' | 'error';
type Mode = 'choose' | 'telegram' | 'otp';

const POLL_INTERVAL_MS = 2500;

/**
 * انتخاب روش ورود: تلگرام (اصلی) یا کد یکبارمصرف (دستگاه بدون تلگرام).
 *
 * ⚠️ کد فقط روی نشست تلگرامی ساخته میشود؛ نشست حاصل از کد «مهمان» است
 *    و اجازهی ساخت کد زنجیرهای، ویرایش پروفایل یا ابطال دستگاهها ندارد.
 *
 * ⚠️ چرا فقط لینک ربات؟
 *    ورود با شماره موبایل (OAuth) در تلگرام **دو** اجازه می‌ساخت:
 *    یک نشست ورود و یک دسترسی به نام و عکس. برای خروج، کاربر باید هر دو را
 *    جداگانه قطع می‌کرد.
 *    در مسیر ربات، کاربر فقط Start می‌زند؛ هیچ نشستی ساخته نمی‌شود و عکس
 *    را سرور از Bot API می‌گیرد.
 */
export function LoginFlow() {
  const router = useRouter();
  const { showToast } = useAlert();
  const { signIn, user, loading } = useAuth();

  const [mode, setMode] = useState<Mode>('choose');
  const [phase, setPhase] = useState<Phase>('idle');
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [loginId, setLoginId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  const timerRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);

  const stopAll = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => stopAll, [stopAll]);

  // لینک QR مستقیماً وارد فرم کد میشود، بدون یک کلیک اضافه روی «انتخاب روش».
  // fragment توسط خود OtpLoginForm خوانده و پاک میشود.
  useEffect(() => {
    if (readOtpCodeFromHash(window.location.hash)) setMode('otp');
  }, []);

  const backToChoice = useCallback(() => {
    stopAll();
    setPhase('idle');
    setMessage(null);
    setMode('choose');
  }, [stopAll]);

  // کاربر واردشده به صفحه‌ی ورود دسترسی ندارد
  useEffect(() => {
    if (!loading && user) router.replace('/profile/');
  }, [loading, user, router]);

  const begin = useCallback(async () => {
    stopAll();
    setPhase('starting');
    setMessage(null);

    try {
      const data = await startBotLogin();
      setDeepLink(data.deepLink);
      setLoginId(data.loginId);
      setExpiresAt(data.expiresAt);
      setPhase('waiting');
    } catch (error) {
      setPhase('error');
      setMessage(error instanceof ApiError ? error.message : 'شروع ورود ناموفق بود');
    }
  }, [stopAll]);

  // شمارش معکوس
  useEffect(() => {
    if (phase !== 'waiting' || !expiresAt) return undefined;

    const tick = () => {
      const left = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setRemaining(Math.ceil(left / 1000));
      if (left <= 0) {
        stopAll();
        setPhase('expired');
      }
    };

    tick();
    timerRef.current = window.setInterval(tick, 1000);
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
    };
  }, [phase, expiresAt, stopAll]);

  // بررسی وضعیت
  useEffect(() => {
    if (phase !== 'waiting' || !loginId) return undefined;

    pollRef.current = window.setInterval(async () => {
      try {
        const result = await checkBotStatus(loginId);
        if (result.status === 'ok' && result.token && result.user) {
          stopAll();
          signIn(result.token, result.user);
          showToast({ type: 'success', title: 'خوش آمدید', message: `@${result.user.username}` });
          router.replace('/profile/');
        } else if (result.status === 'expired' || result.status === 'used') {
          stopAll();
          setPhase(result.status === 'used' ? 'error' : 'expired');
          if (result.status === 'used') setMessage('این لینک قبلاً استفاده شده است');
        }
      } catch {
        /* خطای موقت شبکه — تلاش بعدی */
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, [phase, loginId, signIn, showToast, router, stopAll]);

  // ⚠️ این حالت در HTML استاتیک هم رندر میشود (loading روی سرور true است).
  //    نسخهی قبل «شما وارد شدهاید…» چاپ میکرد و پیش از hydration ادعای
  //    نادرستی دربارهی وضعیت کاربر داشت؛ حالا فقط اسکلت خنثی است.
  if (loading || user) {
    return (
      <div className="calc-card" aria-busy="true">
        <p className="sr-only">در حال بارگذاری وضعیت حساب…</p>
        <Skeleton height={18} width="45%" />
        <Skeleton height={44} radius="12px" />
        <Skeleton height={44} radius="12px" />
      </div>
    );
  }

  if (mode === 'otp') {
    return <OtpLoginForm onBack={backToChoice} />;
  }

  if (mode === 'choose') {
    return (
      <div className="calc-card">
        <div>
          <span className="eyebrow">ورود امن</span>
          <h2 className="section-head__title">روش ورود را انتخاب کنید</h2>
          <p className="login-lead">
            بدون رمز عبور. بسته به اینکه روی این دستگاه به تلگرام دسترسی دارید یا نه،
            یکی از دو مسیر زیر را انتخاب کنید.
          </p>
        </div>

        <div className="login-choice">
          <button
            type="button"
            className="login-choice__card login-choice__card--primary"
            onClick={() => setMode('telegram')}
          >
            <span className="login-choice__icon" aria-hidden="true">
              <Icon name="send" size={20} />
            </span>
            <span className="login-choice__body">
              <strong>ورود با تلگرام</strong>
              <span>روش اصلی؛ ربات را باز کنید و Start بزنید. تمام دسترسیها فعال است.</span>
            </span>
          </button>

          <button
            type="button"
            className="login-choice__card"
            onClick={() => setMode('otp')}
          >
            <span className="login-choice__icon" aria-hidden="true">
              <Icon name="key" size={20} />
            </span>
            <span className="login-choice__body">
              <strong>ورود با کد یکبارمصرف</strong>
              <span>برای دستگاههای بدون تلگرام؛ کد را از پروفایل حساب خود بسازید.</span>
            </span>
          </button>
        </div>

        <p className="login-note">
          ورود با کد به همان حساب اصلی متصل میشود، اما نشست مهمان است و نمیتواند
          کد تازه بسازد، پروفایل را ویرایش کند یا دستگاهی را باطل کند.
        </p>
      </div>
    );
  }

  if (phase === 'waiting' && deepLink) {
    return (
      <div className="calc-card">
        <div>
          <span className="eyebrow">مرحله ۲ از ۲</span>
          <h2 className="section-head__title">در تلگرام تأیید کنید</h2>
        </div>

        <ol className="login-steps">
          <li>دکمه‌ی زیر را بزنید تا ربات تلگرام باز شود.</li>
          <li>روی <strong>Start</strong> بزنید.</li>
          <li>به همین صفحه برگردید؛ ورود خودکار انجام می‌شود.</li>
        </ol>

        <a
          href={deepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--primary btn--block"
        >
          <Icon name="send" size={16} />
          باز کردن ربات تلگرام
        </a>

        <div className="login-wait">
          <span className="row" style={{ gap: 6 }}>
            <span className="btn__spinner" aria-hidden="true" />
            در انتظار تأیید…
          </span>
          <span className="tabular">
            {remaining > 0 ? `${remaining.toLocaleString('fa-IR')} ثانیه` : 'منقضی شد'}
          </span>
        </div>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={begin}>
            لینک تازه
          </Button>
          <Button variant="ghost" size="sm" onClick={backToChoice}>
            بازگشت
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'expired') {
    return (
      <div className="calc-card">
        <p style={{ fontWeight: 'var(--fw-semibold)' }}>لینک ورود منقضی شد</p>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', lineHeight: 2 }}>
          هر لینک فقط ۱۰ دقیقه اعتبار دارد.
        </p>
        <Button block onClick={begin}>
          ساخت لینک تازه
        </Button>
        <Button variant="ghost" size="sm" onClick={backToChoice}>
          بازگشت
        </Button>
      </div>
    );
  }

  return (
    <div className="calc-card">
      <div>
        <span className="eyebrow">ورود امن</span>
        <h2 className="section-head__title">ورود با تلگرام</h2>
        <p className="login-lead">
          بدون رمز عبور و بدون دسترسی به حساب تلگرام شما. فقط ربات را باز کنید و Start بزنید.
        </p>
      </div>

      {message ? <p className="login-error">{message}</p> : null}

      <Button block onClick={begin} loading={phase === 'starting'}>
        <Icon name="send" size={16} />
        دریافت لینک ورود
      </Button>

      <p className="login-note">
        اگر در تلگرام چند حساب دارید، پیش از زدن Start حساب مورد نظر را باز کنید.
      </p>

      <Button variant="ghost" size="sm" onClick={backToChoice}>
        بازگشت به انتخاب روش ورود
      </Button>
    </div>
  );
}
