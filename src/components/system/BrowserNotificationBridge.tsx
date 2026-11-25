'use client';

/**
 * فاز ۱۲٫۲۰-B — پل تکتب نوتیف مرورگر.
 *
 * ترتیب الزامی: `fresh → show → shownIdsRef → broadcast → shown(shownAt)`.
 * ⚠️ `shownAt` پیش از درخواست `fresh` گرفته می‌شود تا نوتیفهای ایجادشده بین
 *    `fresh` و `shown` از دست نروند. مقدار به سرور هم ارسال می‌شود تا در کرش
 *    بین `show` و `shown` cursor جلو نرود.
 * ⚠️ فقط تب رهبر نوتیف مرورگر می‌سازد؛ Toast درونسایت وظیفهٔ پل دیگری است.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/account';
import { createNotificationsApi } from '@/lib/notifications/api';
import { showBrowserNotifications } from '@/lib/notifications/browser';
import { eventChannelEnabled } from '@/lib/notifications/preferences.mjs';
import { usePollLeader } from '@/lib/connectivity/poll-leader';
import { useRealtimeEvent, useRealtimeStatus } from './RealtimeProvider';
import { useNotifications } from '@/components/chat/NotificationProvider';

const CHANNEL = 'notification:shown';

function readStoredShownAt(userId: string | undefined): string | null {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(`arasanad_notification_shown_${userId}`);
    return value && Number.isFinite(Date.parse(value)) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredShownAt(userId: string | undefined, shownAt: string): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`arasanad_notification_shown_${userId}`, shownAt);
  } catch {
    /* حالت خصوصی: BroadcastChannel همان تبها را پوشش می‌دهد. */
  }
}

export function BrowserNotificationBridge() {
  const { user, authedRequest } = useAuth();
  const { signedIn, unreadCount, settings } = useNotifications();
  const { isLeader, publish, subscribe } = usePollLeader();
  const { connected } = useRealtimeStatus();
  const api = useMemo(() => createNotificationsApi(authedRequest), [authedRequest]);

  const shownIdsRef = useRef<Set<string>>(new Set());
  const lastCountRef = useRef(unreadCount);
  const busyRef = useRef(false);

  const showFresh = useCallback(async () => {
    if (!signedIn || !isLeader || busyRef.current) return;
    // فاز ۱۲٫۳۱: حتی اگر سرور ردیف فرستاد، نمایش مرورگر توسط تنظیم کاربر رد می‌شود.
    if (settings?.channels?.browser === false) return;
    busyRef.current = true;
    // پیش از fresh: هر نوتیف جدیدتر از این زمان در دفتر بعدی دوباره دیده می‌شود.
    const shownAt = new Date().toISOString();
    try {
      const fresh = await api.fresh();
      const unseen = fresh.filter(
        (item) =>
          !shownIdsRef.current.has(item.id)
          && eventChannelEnabled(settings, item.type, 'browser'),
      );
      if (unseen.length === 0) return;
      for (const item of unseen) shownIdsRef.current.add(item.id);
      const shown = await showBrowserNotifications(unseen);
      if (shown === 0) {
        // اجازهٔ نوتیف مرورگر نیست؛cursor جلو نرود و صف بعدی دوباره تلاش کند.
        for (const item of unseen) shownIdsRef.current.delete(item.id);
        return;
      }
      publish(CHANNEL, { ids: unseen.map((item) => item.id), shownAt });
      writeStoredShownAt(user?.id, shownAt);
      await api.markShown(shownAt).catch(() => undefined);
    } finally {
      busyRef.current = false;
    }
  }, [api, isLeader, publish, settings, signedIn, user?.id]);

  // رویداد realtime تنها محرک اصلی است؛ پل مستقل از Leader اثر دیگری ندارد.
  useRealtimeEvent(['notification.created'], () => {
    if (isLeader && connected) void showFresh();
  });

  // هنگام ارتقا به Leader یا باز شدن تب، اسنپشات موجود بخوان و دوباره sync کن.
  useEffect(() => {
    if (!signedIn || !isLeader) return;
    const stored = readStoredShownAt(user?.id);
    if (stored) writeStoredShownAt(user?.id, stored);
    void showFresh();
  }, [isLeader, showFresh, signedIn, user?.id]);

  // Polling جایگزین هنگام قطع WebSocket تنها یک بار بر اساس تغییر شمارنده عمل می‌کند.
  useEffect(() => {
    if (!signedIn || !isLeader || connected) {
      lastCountRef.current = unreadCount;
      return;
    }
    if (unreadCount > lastCountRef.current) void showFresh();
    lastCountRef.current = unreadCount;
  }, [connected, isLeader, showFresh, signedIn, unreadCount]);

  /** تب‌های پیرو shownIds و نشان زمانی را بدون درخواست شبکه‌ای می‌گیرند. */
  useEffect(() => subscribe((message) => {
    if (message.channel !== CHANNEL) return;
    const payload = message.payload as { ids?: unknown; shownAt?: unknown } | null;
    if (Array.isArray(payload?.ids)) {
      for (const id of payload.ids) {
        if (typeof id === 'string') shownIdsRef.current.add(id);
      }
    }
    if (typeof payload?.shownAt === 'string' && Number.isFinite(Date.parse(payload.shownAt))) {
      writeStoredShownAt(user?.id, payload.shownAt);
    }
  }), [subscribe, user?.id]);

  return null;
}
