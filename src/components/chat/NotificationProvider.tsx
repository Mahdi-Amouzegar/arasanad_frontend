'use client';

/**
 * وضعیت سراسری اعلان‌ها و Polling هوشمند (architecture.md §14.3).
 *
 * - مسیر سبک `unread-count` فقط یک عدد برمی‌گرداند
 * - `setTimeout` زنجیره‌ای (نه `setInterval`)؛ هنگام اجرای درخواست تیک بعدی ساخته نمی‌شود
 * - تب مخفی → توقف کامل؛ بازگشت → اجرای فوری
 * - خطای شبکه → backoff پلکانی تا ۵ دقیقه
 * - کش ۱۵ ثانیه‌ای سمت کلاینت برای کاهش مصرف پلن رایگان
 * - نمایش نوتیف فقط با `ServiceWorkerRegistration.showNotification`
 * - Badge API و آنلاک صوتی با feature-detect
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/account';
import { createNotificationsApi, type NotificationItem, type TelegramStatus } from '@/lib/notifications/api';
import {
  installAudioUnlock,
  notificationPermission,
  notificationSupported,
  requestNotificationPermission,
  setAppBadge,
  showBrowserNotifications,
} from '@/lib/notifications/browser';
import { POLL_CACHE_MS, pollDelayFor } from '@/lib/chat/core.mjs';
import { usePollLeader } from '@/lib/connectivity/poll-leader';
import { useRealtimeEvent, useRealtimeStatus } from '@/components/system/RealtimeProvider';

interface NotificationContextValue {
  /** آیا کاربر وارد شده است — برای پنهان کردن کامل لایه‌ی اعلان در صفحات عمومی */
  signedIn: boolean;
  unreadCount: number;
  notifications: NotificationItem[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  permission: NotificationPermission | 'unsupported';
  telegramStatus: TelegramStatus | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  enableBrowserNotifications: () => Promise<void>;
  connectTelegram: () => Promise<string | null>;
  setTelegramEnabled: (enabled: boolean) => Promise<void>;
  refreshTelegramStatus: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

function messageOf(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message ?? '')
    : 'ارتباط با سرور برقرار نشد';
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, token, authedRequest } = useAuth();
  const signedIn = Boolean(user && token);
  const api = useMemo(() => createNotificationsApi(authedRequest), [authedRequest]);
  // فاز ۱۰ (O-99): پایش پس‌زمینه فقط از تب رهبر و فقط آنلاین.
  const { isLeader, online, multiplier, publish, subscribe } = usePollLeader();
  const { connected } = useRealtimeStatus();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    notificationPermission(),
  );
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus | null>(null);

  const lastCountRef = useRef(0);
  const lastPollRef = useRef(0);
  const shownIdsRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    setLoading(true);
    try {
      const page = await api.list(20, 0);
      setNotifications(page.notifications);
      setUnreadCount(page.unreadCount);
      setHasMore(page.hasMore);
      lastCountRef.current = page.unreadCount;
      setError(null);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [api, signedIn]);

  const syncUnread = useCallback(async () => {
    if (!signedIn) return;
    try {
      const count = await api.unreadCount();
      setUnreadCount(count);
      lastCountRef.current = count;
      publish('notifications', { unreadCount: count });
      void setAppBadge(count);
    } catch {
      /* unread count is optional */
    }
  }, [api, publish, signedIn]);

  const loadMore = useCallback(async () => {
    if (!signedIn || loading || !hasMore) return;
    setLoading(true);
    try {
      const page = await api.list(20, notifications.length);
      setNotifications((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...page.notifications.filter((item) => !seen.has(item.id))];
      });
      setHasMore(page.hasMore);
      setUnreadCount(page.unreadCount);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [api, hasMore, loading, notifications.length, signedIn]);

  const markRead = useCallback(
    async (id: string) => {
      if (!signedIn) return;
      try {
        await api.markRead(id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
        );
        setUnreadCount((value) => Math.max(0, value - 1));
        lastCountRef.current = Math.max(0, lastCountRef.current - 1);
        void setAppBadge(Math.max(0, lastCountRef.current));
      } catch (err) {
        setError(messageOf(err));
      }
    },
    [api, signedIn],
  );

  const markAllRead = useCallback(async () => {
    if (!signedIn) return;
    try {
      await api.markAllRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
      lastCountRef.current = 0;
      void setAppBadge(0);
    } catch (err) {
      setError(messageOf(err));
    }
  }, [api, signedIn]);

  const enableBrowserNotifications = useCallback(async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  }, []);

  const refreshTelegramStatus = useCallback(async () => {
    if (!signedIn) return;
    try {
      setTelegramStatus(await api.telegramStatus());
    } catch {
      /* وضعیت تلگرام اختیاری است */
    }
  }, [api, signedIn]);

  const connectTelegram = useCallback(async (): Promise<string | null> => {
    if (!signedIn) return null;
    try {
      const result = await api.telegramConnect();
      return result.url;
    } catch {
      return null;
    }
  }, [api, signedIn]);

  const setTelegramEnabled = useCallback(
    async (enabled: boolean) => {
      if (!signedIn) return;
      try {
        await api.telegramPreference(enabled);
        await refreshTelegramStatus();
      } catch (err) {
        setError(messageOf(err));
      }
    },
    [api, refreshTelegramStatus, signedIn],
  );

  /* ── آنلاک صوتی روی نخستین ژست ── */
  useEffect(() => installAudioUnlock(), []);

  /* ── Polling هوشمند ── */
  useEffect(() => {
    if (!signedIn) return undefined;
    void refreshTelegramStatus();
    // Phase 12.17: skip business polling while realtime is connected.
    if (connected) return undefined;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let lastInteraction = Date.now();
    const noteInteraction = () => {
      lastInteraction = Date.now();
    };

    const schedule = () => {
      if (!alive) return;
      const hidden = typeof document !== 'undefined' && document.hidden;
      const { delay, stop } = pollDelayFor({
        hidden,
        idleMs: Date.now() - lastInteraction,
        failures,
      });
      if (stop || delay === null || !isLeader || !online) return;
      timer = setTimeout(() => void tick(), delay * multiplier);
    };

    const tick = async () => {
      if (!alive) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!isLeader || !online) return;
      const now = Date.now();
      if (now - lastPollRef.current < POLL_CACHE_MS) {
        schedule();
        return;
      }
      lastPollRef.current = now;
      try {
        const count = await api.unreadCount();
        if (!alive) return;
        setUnreadCount(count);
        publish('notifications', { unreadCount: count });
        void setAppBadge(count);
        setError(null);

        if (count > lastCountRef.current) {
          const fresh = await api.fresh();
          const unseen = fresh.filter((item) => !shownIdsRef.current.has(item.id));
          if (unseen.length > 0) {
            for (const item of unseen) shownIdsRef.current.add(item.id);
            const shown = await showBrowserNotifications(unseen);
            if (shown > 0) await api.markShown().catch(() => undefined);
            void refresh();
          }
        }
        lastCountRef.current = count;
        failures = 0;
      } catch {
        failures = Math.min(failures + 1, 6);
      } finally {
        schedule();
      }
    };

    const onVisibility = () => {
      if (timer) clearTimeout(timer);
      if (!document.hidden) {
        lastPollRef.current = 0; // بازگشت تب = اجرای فوری، بیاعتنا به کش
        void tick();
      } else {
        schedule();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pointerdown', noteInteraction);
      window.addEventListener('keydown', noteInteraction);
    }
    if (isLeader && online) void tick();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pointerdown', noteInteraction);
        window.removeEventListener('keydown', noteInteraction);
      }
    };
  }, [api, refresh, refreshTelegramStatus, signedIn, isLeader, online, multiplier, publish, connected]);

  /** تب‌های پیرو شمارنده اعلان را بدون درخواست شبک‌ای می‌گیرند. */
  useEffect(() => {
    if (!signedIn || isLeader) return undefined;
    return subscribe((message) => {
      if (message.channel !== 'notifications') return;
      const count = Number((message.payload as { unreadCount?: unknown } | null)?.unreadCount ?? 0);
      if (Number.isFinite(count)) {
        const safe = Math.max(0, count);
        setUnreadCount(safe);
        lastCountRef.current = safe;
        void setAppBadge(safe);
      }
    });
  }, [isLeader, signedIn, subscribe]);

  // Phase 12.17: realtime events replace business polling while connected.
  useRealtimeEvent(['notification.created', 'notification.read'], () => {
    if (!signedIn) return;
    void syncUnread();
    void refresh();
  });

  const value = useMemo<NotificationContextValue>(
    () => ({
      signedIn,
      unreadCount,
      notifications,
      hasMore,
      loading,
      error,
      permission,
      telegramStatus,
      refresh,
      loadMore,
      markRead,
      markAllRead,
      enableBrowserNotifications,
      connectTelegram,
      setTelegramEnabled,
      refreshTelegramStatus,
    }),
    [
      signedIn, unreadCount, notifications, hasMore, loading, error, permission, telegramStatus,
      refresh, loadMore, markRead, markAllRead, enableBrowserNotifications,
      connectTelegram, setTelegramEnabled, refreshTelegramStatus,
    ],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications باید درون NotificationProvider استفاده شود');
  return context;
}

/** فقط برای نمایش وضعیت پشتیبانی در رابط — بدون ایجاد state اضافه. */
export function browserNotificationsAvailable(): boolean {
  return notificationSupported();
}
