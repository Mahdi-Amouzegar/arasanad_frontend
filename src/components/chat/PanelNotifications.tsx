'use client';

/**
 * نمای واقعی `/panel/notifications` (فاز ۹).
 *
 * ⚠️ باز کردن صفحه هیچ اعلانی را خوانده‌شده نمی‌کند؛ فقط کلیک روی همان
 *    اعلان یا «همه خوانده شد» وضعیت را تغییر می‌دهد.
 * ⚠️ شمارنده، فهرست و نوتیف مرورگر همگی از یک منبع D1 تغذیه می‌شوند.
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { safeHref, inDisplayOrder } from '@/lib/notifications/core.mjs';
import { truncate } from '@/lib/chat/core.mjs';
import { useNotifications } from './NotificationProvider';
import { TelegramConnectCard } from './TelegramConnectCard';

export function PanelNotifications() {
  const {
    signedIn,
    unreadCount,
    notifications,
    hasMore,
    loading,
    error,
    refresh,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    if (signedIn) void refresh();
  }, [signedIn, refresh]);

  if (!signedIn) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="برای دیدن اعلان‌ها وارد شوید"
            description="اعلان‌های مربوط به سفارش‌ها پس از ورود اینجا نمایش داده می‌شوند."
            icon={<Icon name="bell" size={26} />}
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="chat-page">
      <Card>
        <CardHeader
          title="اعلان‌ها"
          actions={
            <Button
              variant="outline"
              size="sm"
              leadingIcon={<Icon name="checkDouble" size={15} />}
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0 || loading}
            >
              همه خوانده شد
            </Button>
          }
        />
        <CardBody flush>
          {notifications.length === 0 && !loading ? (
            <EmptyState
              title="اعلانی ندارید"
              description="رویدادهای مهم سفارش‌ها، پیام‌های تازه و وضعیت پرداخت اینجا نمایش داده می‌شوند."
              icon={<Icon name="bell" size={26} />}
            />
          ) : null}

          <div className="chat-page__list">
            {inDisplayOrder(notifications)
              .slice()
              .reverse()
              .map((item) => (
                <a
                  key={item.id}
                  href={safeHref(item.href)}
                  className={`notif-item ${item.readAt ? '' : 'notif-item--unread'}`}
                  onClick={() => {
                    if (!item.readAt) void markRead(item.id);
                  }}
                >
                  <span className="notif-item__dot" aria-hidden="true" />
                  <span className="notif-item__body">
                    <strong>{item.title}</strong>
                    <span className="notif-item__text">{truncate(item.body, 160)}</span>
                    <RelativeTime value={item.createdAt} className="notif-item__time" />
                  </span>
                  <Icon name="chevronLeft" size={15} />
                </a>
              ))}
          </div>

          {hasMore ? (
            <div className="chat-page__actions" style={{ padding: 'var(--sp-3)' }}>
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={<Icon name="chevronDown" size={15} />}
                onClick={() => void loadMore()}
                loading={loading}
              >
                بیشتر
              </Button>
            </div>
          ) : null}

          {error ? (
            <p className="chat-error" role="alert" style={{ margin: 'var(--sp-3)' }}>
              {error}
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="کانالهای اطلاع‌رسانی" />
        <CardBody flush>
          <TelegramConnectCard />
        </CardBody>
      </Card>
    </div>
  );
}
