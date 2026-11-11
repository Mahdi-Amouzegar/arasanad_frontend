'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useAlert } from '@/components/ui/AlertProvider';
import { useAuth, startBotLogin, checkBotStatus, type AuthUser } from '@/lib/auth-context';
import { listKnownAccounts, rememberAccount, forgetAccount, type KnownAccount } from '@/lib/known-accounts';
import { ApiError, apiRequest, getDeviceId, getDeviceName } from '@/lib/api';
import {
  buildTelegramOAuthUrl,
  parseTelegramCallback,
  cleanTelegramCallbackFromUrl,
  type TelegramCallbackPayload,
} from '@/lib/telegram-oauth';

type Phase = 'choose' | 'known' | 'starting' | 'waiting' | 'expired' | 'error';

const POLL_INTERVAL_MS = 2500;

export function LoginFlow() {
  const router = useRouter();
  const { showToast, showAlert } = useAlert();
  const { signIn, user, loading, signOut } = useAuth();

  const [phase, setPhase] = useState<Phase>('choose');
  const [known, setKnown] = useState<KnownAccount[]>([]);
  const [selected, setSelected] = useState<KnownAccount | null>(null);
  /** عبور از حالت «وارد شده‌اید» برای تغییر حساب */
  const [switching, setSwitching] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthHandled, setOauthHandled] = useState(false);

  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [startToken, setStartToken] = useState<string | null>(null);
  const [loginId, setLoginId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  const timerRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    setKnown(listKnownAccounts());
  }, []);

  // ?switch=1 → عبور از حالت «وارد شده‌اید»
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('switch')) setSwitching(true);
  }, []);

  // بازگشت از oauth.telegram.org
  useEffect(() => {
    if (oauthHandled) return;
    const payload: TelegramCallbackPayload | null = parseTelegramCallback();
    if (!payload) return;

    setOauthHandled(true);
    cleanTelegramCallbackFromUrl();
    setPhase('starting');

    void (async () => {
      try {
        const result = await apiRequest<{ token: string; user: AuthUser }>('/auth/telegram', {
            method: 'POST',
            body: { payload, deviceId: getDeviceId(), deviceName: getDeviceName() },
          },
        );

        signIn(result.token, result.user);
        rememberAccount({
          userId: result.user.id,
          username: result.user.username,
          displayName: result.user.displayName,
        });
        showToast({ type: 'success', title: 'خوش آمدید', message: `@${result.user.username}` });
        router.push('/profile/');
      } catch (error) {
        setPhase('choose');
        setMessage(error instanceof ApiError ? error.message : 'ورود با تلگرام ناموفق بود');
      }
    })();
  }, [oauthHandled, signIn, showToast, router]);

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

  const begin = useCallback(
    async (account: KnownAccount | null) => {
      stopAll();
      setSelected(account);
      setPhase('starting');
      setMessage(null);

      try {
        const data = await startBotLogin();
        setDeepLink(data.deepLink);
        setStartToken(data.startToken);
        setLoginId(data.loginId);
        setExpiresAt(data.expiresAt);
        setPhase('waiting');
      } catch (error) {
        setPhase('error');
        setMessage(error instanceof ApiError ? error.message : 'شروع ورود ناموفق بود');
      }
    },
    [stopAll],
  );

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

  // Polling
  useEffect(() => {
    if (phase !== 'waiting' || !loginId) return undefined;

    pollRef.current = window.setInterval(async () => {
      try {
        const result = await checkBotStatus(loginId);
        if (result.status === 'ok' && result.token && result.user) {
          stopAll();
          signIn(result.token, result.user);
          rememberAccount({
            userId: result.user.id,
            username: result.user.username,
            displayName: result.user.displayName,
          });
          setKnown(listKnownAccounts());

          if (selected && selected.userId !== result.user.id) {
            showToast({
              type: 'info',
              title: 'حساب متفاوتی تأیید شد',
              message: `وارد شدید با @${result.user.username}`,
            });
          } else {
            showToast({ type: 'success', title: 'خوش آمدید', message: `@${result.user.username}` });
          }

          router.push('/profile/');
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
  }, [phase, loginId, signIn, showToast, router, stopAll, selected]);

  /**
   * ورود با شماره موبایل (OAuth تلگرام).
   * ⚠️ برای هر حسابی کار می‌کند، حتی اگر روی این دستگاه وارد نشده باشد.
   */
  const startOAuth = useCallback(async (switchAccount = false) => {
    setOauthLoading(true);
    setMessage(null);

    try {
      const config = await apiRequest<{ botId: string | null; configured: boolean }>(
        '/auth/telegram/config',
      );

      if (!config.botId) {
        setMessage('ورود با شماره موبایل هنوز پیکربندی نشده است. از دکمه‌ی «ورود با تلگرام» استفاده کنید.');
        setOauthLoading(false);
        return;
      }

      const returnTo = `${window.location.origin}${window.location.pathname}`;
      window.location.href = buildTelegramOAuthUrl(config.botId, returnTo, { switchAccount });
    } catch (error) {
      setOauthLoading(false);
      setMessage(error instanceof ApiError ? error.message : 'شروع ورود ناموفق بود');
    }
  }, []);

  /* ─── از قبل وارد شده ─── */
  if (!loading && user && !switching) {
    return (
      <div className="calc-card">
        <div className="row" style={{ gap: 'var(--sp-3)' }}>
          <Avatar name={user.displayName} src={user.avatarUrl} size="lg" />
          <div>
            <p style={{ fontWeight: 'var(--fw-semibold)' }}>شما وارد شده‌اید</p>
            <p className="ltr" style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)' }}>
              @{user.username}
            </p>
          </div>
        </div>

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Link href="/profile/" className="btn btn--primary btn--sm">
            پروفایل من
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSwitching(true);
              setPhase('choose');
              setKnown(listKnownAccounts());
            }}
          >
            <Icon name="refresh" size={14} />
            تغییر حساب
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const ok = await showAlert({
                type: 'danger-confirm',
                title: 'خروج از حساب',
                message: 'از حساب خود خارج می‌شوید؟',
                confirmText: 'خروج',
                cancelText: 'بازگشت',
              });
              if (ok) {
                await signOut();
                setPhase('choose');
              }
            }}
          >
            <Icon name="x" size={14} />
            خروج
          </Button>
        </div>
      </div>
    );
  }

  /* ─── انتخاب روش ورود ─── */
  if (phase === 'choose' || phase === 'error') {
    return (
      <div className="calc-card">
        <div>
          <span className="eyebrow">ورود امن</span>
          <h2 className="section-head__title">حساب خود را انتخاب کنید</h2>
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

        <div className="login-choice">
          <button
            type="button"
            className="login-choice__card login-choice__card--primary"
            onClick={() => begin(null)}
          >
            <span className="login-choice__icon" aria-hidden="true">
              <Icon name="send" size={18} />
            </span>
            <span className="login-choice__body">
              <strong>ورود با تلگرام</strong>
              <span>یک ضربه؛ ربات تلگرام باز می‌شود و تأیید می‌کنید.</span>
            </span>
          </button>

          {known.length > 0 ? (
            <button
              type="button"
              className="login-choice__card"
              onClick={() => {
                setKnown(listKnownAccounts());
                setPhase('known');
              }}
            >
              <span className="login-choice__icon" aria-hidden="true">
                <Icon name="refresh" size={18} />
              </span>
              <span className="login-choice__body">
                <strong>ورود به حساب قبلی</strong>
                <span>{known.length.toLocaleString('fa-IR')} حساب در این مرورگر</span>
              </span>
            </button>
          ) : null}

          <button
            type="button"
            className="login-choice__card"
            onClick={() => startOAuth(false)}
            disabled={oauthLoading}
          >
            <span className="login-choice__icon" aria-hidden="true">
              <Icon name="user" size={18} />
            </span>
            <span className="login-choice__body">
              <strong>ورود با شماره موبایل</strong>
              <span>
                {oauthLoading
                  ? 'در حال انتقال به تلگرام…'
                  : 'برای حسابی که روی این دستگاه وارد نشده است.'}
              </span>
            </span>
          </button>
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => startOAuth(true)}
          disabled={oauthLoading}
        >
          <Icon name="refresh" size={14} />
          ورود با حساب تلگرام دیگر
        </button>

        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)', lineHeight: 1.9 }}>
          اگر قبلاً با حساب دیگری وارد شده‌اید و می‌خواهید حساب را عوض کنید، در تلگرام اتصال این
          سایت را قطع کنید؛ راهنمای مرحله‌به‌مرحله پس از ورود در بخش پروفایل آمده است.
        </p>
      </div>
    );
  }

  /* ─── فهرست حساب‌های شناخته‌شده ─── */
  if (phase === 'known') {
    return (
      <div className="calc-card">
        <div>
          <span className="eyebrow">ورود سریع</span>
          <h2 className="section-head__title">حساب قبلی خود را انتخاب کنید</h2>
        </div>

        {known.length === 0 ? (
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', lineHeight: 2 }}>
            در این مرورگر حسابی ثبت نشده است. با گزینه‌ی «ثبت‌نام با حساب تلگرام» وارد شوید.
          </p>
        ) : (
          <div className="known-list">
            {known.map((account) => (
              <div className="known-list__row" key={account.userId}>
                <button
                  type="button"
                  className="known-list__pick"
                  onClick={() => begin(account)}
                >
                  <Avatar name={account.displayName} size="sm" />
                  <span>
                    <span className="known-list__name">{account.displayName}</span>
                    <span className="known-list__username ltr">@{account.username}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="known-list__remove"
                  aria-label={`حذف ${account.displayName} از این مرورگر`}
                  onClick={() => {
                    forgetAccount(account.userId);
                    setKnown(listKnownAccounts());
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Button variant="primary" size="sm" onClick={() => begin(null)}>
            حساب دیگر
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPhase('choose')}>
            بازگشت
          </Button>
        </div>
      </div>
    );
  }

  /* ─── انتظار برای تأیید ─── */
  if (phase === 'starting') {
    return (
      <div className="calc-card">
        <p style={{ fontWeight: 'var(--fw-semibold)' }}>در حال ساخت لینک ورود…</p>
        <span className="btn__spinner" aria-hidden="true" />
      </div>
    );
  }

  if (phase === 'waiting' && deepLink) {
    return (
      <div className="calc-card">
        <div>
          <span className="eyebrow">مرحله ۲ از ۲</span>
          <h2 className="section-head__title">در تلگرام تأیید کنید</h2>
          {selected ? (
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', marginTop: 4 }}>
              حساب انتخابی: <span className="ltr">@{selected.username}</span>
            </p>
          ) : null}
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
          <li>در تلگرام، حساب مورد نظر را انتخاب و روی Start بزنید.</li>
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

        {startToken ? (
          <details className="start-code">
            <summary className="start-code__summary">ورود با حساب تلگرام دیگر</summary>
            <p className="start-code__hint">
              لینک بالا حساب فعال تلگرام را باز می‌کند. اگر می‌خواهید با حساب دیگری وارد شوید، در
              تلگرام به آن حساب بروید، ربات آراسند را باز کنید و این دستور را بفرستید:
            </p>
            <code className="start-code__value ltr">/start {startToken}</code>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(`/start ${startToken}`);
                  showToast({ title: 'کپی شد', message: 'در تلگرام بفرستید' });
                } catch {
                  showToast({ type: 'error', title: 'کپی نشد', message: 'متن را دستی انتخاب کنید' });
                }
              }}
            >
              <Icon name="file" size={14} />
              کپی دستور
            </button>
          </details>
        ) : null}

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

        <div className="row" style={{ flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={() => begin(selected)}>
            لینک تازه
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPhase('choose')}>
            انصراف
          </Button>
        </div>
      </div>
    );
  }

  /* ─── منقضی ─── */
  return (
    <div className="calc-card">
      <p style={{ fontWeight: 'var(--fw-semibold)' }}>لینک ورود منقضی شد</p>
      <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)', lineHeight: 2 }}>
        هر لینک فقط ۱۰ دقیقه اعتبار دارد.
      </p>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <Button variant="primary" size="sm" onClick={() => begin(selected)}>
          ساخت لینک تازه
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setPhase('choose')}>
          بازگشت
        </Button>
      </div>
    </div>
  );
}
