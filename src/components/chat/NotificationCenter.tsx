'use client';

/**
 * مرکز اعلان‌ها (لایه‌ی L1) — فهرست، شمارنده، خواندهشدن و هدایت.
 *
 * ⚠️ بازکردن فهرست، پیام‌ها را خوانده‌شده نمی‌کند؛ فقط کلیک روی همان
 *    اعلان یا دکمه‌ی «همه خوانده شد» وضعیت را تغییر می‌دهد.
 * ⚠️ شمارنده از همان منبع D1 تغذیه می‌شود و عدد جداگانه‌ای نساخته می‌شود.
 */

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { safeHref } from '@/lib/notifications/core.mjs';
import { formatBadge, truncate } from '@/lib/chat/core.mjs';
import { useNotifications } from './NotificationProvider';
import { TelegramConnectCard } from './TelegramConnectCard';
import { registerBackDismiss } from '@/lib/android-back';

export function NotificationCenter() {
  const {
    unreadCount,
    notifications,
    hasMore,
    loading,
    error,
    refresh,
    loadMore,
    markRead,
    markAllRead,
    signedIn,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    // فاز ۱۳: کلید بازگشت اندروید فهرست اعلان‌ها را می‌بندد.
    const unregister = registerBackDismiss(() => {
      setOpen(false);
      return true;
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointer);
    return () => {
      unregister();
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  if (!signedIn) return null;

  return (
    <div className="notif-center" ref={containerRef}>
      <button
        type="button"
        className="notif-trigger"
        aria-label={`اعلان‌ها${unreadCount > 0 ? `، ${unreadCount} خوانده‌نشده` : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          void refresh();
        }}
        title="اعلان‌ها"
      >
        <Icon name="bell" size={21} />
        {unreadCount > 0 ? <span className="notif-trigger__badge">{formatBadge(unreadCount)}</span> : null}
      </button>

      {open ? (
        <section className="notif-panel" role="dialog" aria-label="اعلان‌ها">
          <header className="notif-panel__header">
            <strong>اعلان‌ها</strong>
            <button
              type="button"
              className="chat-link-btn"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
            >
              <Icon name="checkDouble" size={14} />
              همه خوانده شد
            </button>
          </header>

          <div className="notif-panel__list">
            {loading && notifications.length === 0 ? (
              <div className="chat-skeleton" aria-hidden="true"><span /><span /></div>
            ) : null}
            {!loading && notifications.length === 0 ? (
              <div className="chat-empty">
                <span className="chat-empty__icon"><Icon name="inbox" size={24} /></span>
                <p className="chat-empty__title">اعلانی ندارید</p>
                <p className="chat-empty__text">رویدادهای مهم سفارش‌ها اینجا نمایش داده می‌شوند.</p>
              </div>
            ) : null}

            {notifications.map((item) => (
              <a
                key={item.id}
                href={safeHref(item.href)}
                className={`notif-item ${item.readAt ? '' : 'notif-item--unread'}`}
                onClick={() => {
                  if (!item.readAt) void markRead(item.id);
                  setOpen(false);
                }}
              >
                <span className="notif-item__dot" aria-hidden="true" />
                <span className="notif-item__body">
                  <strong>{item.title}</strong>
                  <span className="notif-item__text">{truncate(item.body, 110)}</span>
                  <RelativeTime value={item.createdAt} className="notif-item__time" />
                </span>
                <Icon name="chevronLeft" size={15} />
              </a>
            ))}

            {hasMore ? (
              <button type="button" className="chat-more" onClick={() => void loadMore()} disabled={loading}>
                <Icon name="chevronDown" size={15} />
                بیشتر
              </button>
            ) : null}
            {error ? <div className="chat-error" role="alert">{error}</div> : null}
          </div>

          <TelegramConnectCard />
        </section>
      ) : null}
    </div>
  );
}
