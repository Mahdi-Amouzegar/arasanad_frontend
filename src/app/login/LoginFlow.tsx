'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useAlert } from '@/components/ui/AlertProvider';
import { useAuth, startBotLogin, checkBotStatus } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

type Phase = 'idle' | 'starting' | 'waiting' | 'expired' | 'error';

const POLL_INTERVAL_MS = 2500;

export function LoginFlow() {
  const router = useRouter();
  const { showToast } = useAlert();
  const { signIn, user, loading } = useAuth();

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

  // Polling وضعیت
  useEffect(() => {
    if (phase !== 'waiting' || !loginId) return undefined;

    pollRef.current = window.setInterval(async () => {
      try {
        const result = await checkBotStatus(loginId);
        if (result.status === 'ok' && result.token && result.user) {
          stopAll();
          signIn(result.token, result.user);
          showToast({ type: 'success', title: 'خوش آمدید', message: `@${result.user.username}` });
          router.push('/profile/');
        } else if (result.status === 'expired' || result.status === 'used') {
          stopAll();
          setPhase(result.status === 'used' ? 'error' : 'expired');
          if (result.status === 'used') setMessage('این لینک قبلاً استفاده شده است');
        }
      } catch {
        /* خطای موقت شبکه — در تلاش بعدی دوباره بررسی می‌شود */
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current !== null) window.clearInterval(pollRef.current);
    };
  }, [phase, loginId, signIn, showToast, router, stopAll]);

  /* ─── اگر از قبل وارد شده ─── */
  if (!loading && user) {
    return (
      <div className="calc-card">
        <p style={{ fontWeight: 'var(--fw-semibold)' }}>شما وارد شده‌اید</p>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)' }}>
          با حساب <span className="ltr">@{user.username}</span>
        </p>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Link href="/profile/" className="btn btn--primary">
            پروفایل من
          </Link>
          <Link href="/" className="btn btn--outline">
            صفحه اصلی
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="calc-card">
      {phase === 'idle' || phase === 'error' || phase === 'starting' ? (
        <>
          <div>
            <span className="eyebrow">ورود امن</span>
            <h2 className="section-head__title">ورود با تلگرام</h2>
            <p
              style={{
                marginTop: 'var(--sp-2)',
                fontSize: 'var(--fs-sm)',
                color: 'var(--c-text-secondary)',
                lineHeight: 2,
              }}
            >
              بدون رمز عبور. روی دکمه بزنید، لینک اختصاصی شما ساخته می‌شود، سپس در تلگرام
              تأیید کنید.
            </p>
          </div>

          {message ? (
            <p
              style={{
                fontSize: 'var(--fs-sm)',
                color: 'var(--c-danger)',
                background: 'var(--c-danger-bg)',
                padding: 'var(--sp-3)',
                borderRadius: 'var(--r-sm)',
              }}
            >
              {message}
            </p>
          ) : null}

          <Button block onClick={begin} loading={phase === 'starting'}>
            <Icon name="send" size={16} />
            دریافت لینک ورود
          </Button>
        </>
      ) : null}

      {phase === 'waiting' && deepLink ? (
        <>
          <div>
            <span className="eyebrow">مرحله ۲ از ۲</span>
            <h2 className="section-head__title">در تلگرام تأیید کنید</h2>
          </div>

          <ol
            style={{
              display: 'grid',
              gap: 'var(--sp-2)',
              paddingInlineStart: 'var(--sp-5)',
              listStyle: 'decimal',
              fontSize: 'var(--fs-sm)',
              color: 'var(--c-text-secondary)',
              lineHeight: 2,
            }}
          >
            <li>دکمه‌ی زیر را بزنید تا ربات تلگرام باز شود.</li>
            <li>روی «Start» بزنید.</li>
            <li>به همین صفحه برگردید؛ ورود خودکار انجام می‌شود.</li>
          </ol>

          <a href={deepLink} target="_blank" rel="noopener noreferrer" className="btn btn--primary btn--block">
            <Icon name="send" size={16} />
            باز کردن ربات تلگرام
          </a>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--sp-3)',
              fontSize: 'var(--fs-xs)',
              color: 'var(--c-text-muted)',
            }}
          >
            <span className="row" style={{ gap: 6 }}>
              <span className="btn__spinner" aria-hidden="true" />
              در انتظار تأیید…
            </span>
            <span className="tabular">
              {remaining > 0 ? `${remaining.toLocaleString('fa-IR')} ثانیه` : 'منقضی شد'}
            </span>
          </div>

          <Button variant="ghost" size="sm" onClick={begin}>
            لینک تازه بساز
          </Button>
        </>
      ) : null}

      {phase === 'expired' ? (
        <>
          <p style={{ fontWeight: 'var(--fw-semibold)' }}>لینک ورود منقضی شد</p>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', lineHeight: 2 }}>
            هر لینک فقط ۱۰ دقیقه اعتبار دارد. دکمه‌ی زیر را بزنید تا لینک تازه ساخته شود.
          </p>
          <Button block onClick={begin}>
            ساخت لینک تازه
          </Button>
        </>
      ) : null}
    </div>
  );
}
