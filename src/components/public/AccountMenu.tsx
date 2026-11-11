'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { useAlert } from '@/components/ui/AlertProvider';
import { useAuth } from '@/lib/auth-context';

const PANEL_WIDTH = 224;
const GAP = 8;
const EDGE = 8;

interface PanelPosition {
  top: number;
  right: number;
}

/**
 * منوی حساب کاربری — آواتار فشرده + منوی بازشو.
 *
 * ⚠️ منو با Portal در `document.body` رندر می‌شود و `position: fixed` دارد،
 *    چون ستون کنار `overflow-y: auto` دارد و هر عنصر absolute درونش
 *    بریده می‌شد (نیمی از منو زیر main پنهان می‌شد).
 */
export function AccountMenu() {
  const { user, loading, signOut } = useAuth();
  const { showAlert, showToast } = useAlert();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<PanelPosition | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const maxRight = window.innerWidth - PANEL_WIDTH - EDGE;
    setPosition({
      top: rect.bottom + GAP,
      right: Math.max(EDGE, Math.min(window.innerWidth - rect.right, maxRight)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onReposition = () => place();

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, place]);

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

  const panel = open && position ? (
    <div
      ref={panelRef}
      className="account-menu__panel"
      role="menu"
      style={{
        position: 'fixed',
        top: position.top,
        right: position.right,
        left: 'auto',
        width: PANEL_WIDTH,
      }}
    >
      <div className="account-menu__head">
        <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
        <div style={{ minWidth: 0 }}>
          <p className="account-menu__name">
            {user.displayName}
            {user.role === 'admin' ? (
              <span className="badge badge--primary account-menu__role">مدیر</span>
            ) : null}
          </p>
          <p className="account-menu__username ltr">@{user.username}</p>
        </div>
      </div>

      {!user.profileComplete ? <p className="account-menu__warn">پروفایل خود را کامل کنید</p> : null}

      <Link href="/profile/" className="account-menu__item" role="menuitem" onClick={() => setOpen(false)}>
        <Icon name="user" size={15} />
        پروفایل من
      </Link>

      <button
        type="button"
        className="account-menu__item account-menu__item--danger"
        role="menuitem"
        onClick={handleSignOut}
      >
        <Icon name="x" size={15} />
        خروج از حساب
      </button>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
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

      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
