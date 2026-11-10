'use client';

import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAlert } from '@/components/ui/AlertProvider';
import { useAuth } from '@/lib/auth-context';

/**
 * بخش حساب در ستون کنار.
 * ⚠️ سه حالت: در حال بارگذاری، واردشده، مهمان.
 */
export function AccountWidget() {
  const { user, loading, signOut } = useAuth();
  const { showAlert, showToast } = useAlert();

  if (loading) {
    return (
      <div className="public-side__account">
        <Skeleton height={14} width="60%" />
        <Skeleton height={12} />
        <Skeleton height={36} radius="8px" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="public-side__account">
        <div className="row" style={{ gap: 'var(--sp-2)' }}>
          <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-semibold)', lineHeight: 1.4 }}>
              {user.displayName}
            </p>
            <p
              className="ltr"
              style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)', lineHeight: 1.4 }}
            >
              @{user.username}
            </p>
          </div>
        </div>

        {!user.profileComplete ? (
          <p
            style={{
              fontSize: 'var(--fs-xs)',
              color: 'var(--c-warning)',
              background: 'var(--c-warning-bg)',
              padding: '6px 8px',
              borderRadius: 'var(--r-xs)',
            }}
          >
            پروفایل خود را کامل کنید.
          </p>
        ) : null}

        <Link href="/profile/" className="btn btn--outline btn--sm btn--block">
          <Icon name="user" size={14} />
          پروفایل من
        </Link>

        <button
          type="button"
          className="btn btn--ghost btn--sm btn--block"
          onClick={async () => {
            const confirmed = await showAlert({
              type: 'danger-confirm',
              title: 'خروج از حساب',
              message: 'از حساب خود خارج می‌شوید؟ برای ورود دوباره باید در تلگرام تأیید کنید.',
              confirmText: 'خروج',
              cancelText: 'بازگشت',
            });
            if (!confirmed) return;
            await signOut();
            showToast({ title: 'از حساب خارج شدید' });
          }}
        >
          <Icon name="x" size={14} />
          خروج
        </button>
      </div>
    );
  }

  return (
    <div className="public-side__account">
      <p className="public-side__account-title">حساب کاربری</p>
      <p className="public-side__account-desc">
        با تلگرام وارد شوید تا سفارش‌ها و فایل‌هایتان را پیگیری کنید.
      </p>
      <Link href="/login/" className="btn btn--primary btn--sm btn--block">
        ورود با تلگرام
      </Link>
    </div>
  );
}
