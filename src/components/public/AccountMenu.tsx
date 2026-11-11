'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useAlert } from '@/components/ui/AlertProvider';
import { useAuth } from '@/lib/auth-context';

/**
 * منوی حساب کاربری — آواتار فشرده + منوی بازشو.
 *
 * ⚠️ فقط آواتار در حالت عادی دیده می‌شود تا ستون کنار شلوغ نشود.
 * ⚠️ بستن با کلیک بیرون و کلید Esc.
 */
export function AccountMenu() {
  const { user, loading, signOut } = useAuth();
  const { showAlert, showToast } = useAlert();

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    const confirmed = await showAlert({
      type: 'danger-confirm',
      title: 'خروج از حساب',
      message: 'از حساب خود خارج می‌شوید؟ برای ورود دوباره باید در تلگرام تأیید کنید.',
      confirmText: 'خروج',
      cancelText: 'بازگشت',
    });
    if (!confirmed) return;

    setOpen(false);
    await signOut();
    showToast({ title: 'از حساب خارج شدید' });
  }

  if (loading) {
    return <span className="account-menu__placeholder" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link href="/login/" className="btn btn--primary btn--sm">
        ورود
      </Link>
    );
  }

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-menu__trigger"
        aria-label="منوی حساب کاربری"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
        <Icon name="chevronDown" size={14} className="account-menu__caret" />
      </button>

      {open ? (
        <div className="account-menu__panel" role="menu">
          <div className="account-menu__head">
            <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
            <div style={{ minWidth: 0 }}>
              <p className="account-menu__name">{user.displayName}</p>
              <p className="account-menu__username ltr">@{user.username}</p>
            </div>
          </div>

          {!user.profileComplete ? (
            <p className="account-menu__warn">پروفایل خود را کامل کنید</p>
          ) : null}

          <Link href="/profile/" className="account-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="user" size={15} />
            پروفایل من
          </Link>

          <Link href="/login/" className="account-menu__item" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="refresh" size={15} />
            تغییر حساب
          </Link>

          <button type="button" className="account-menu__item account-menu__item--danger" role="menuitem" onClick={handleSignOut}>
            <Icon name="x" size={15} />
            خروج از حساب
          </button>
        </div>
      ) : null}
    </div>
  );
}
