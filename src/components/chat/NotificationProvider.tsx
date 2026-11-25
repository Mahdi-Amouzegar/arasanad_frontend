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
import {
  createNotificationsApi,
  type NotificationChannelFlags,
  type NotificationItem,
  type NotificationSettings,
  type TelegramStatus,
} from '@/lib/notifications/api';
import {
  installAudioUnlock,
  notificationPermission,
  notificationSupported,
  requestNotificationPermission,
  setAppBadge,
} from '@/lib/notifications/browser';
import { POLL_CACHE_MS, pollDelayFor } from '@/lib/chat/core.mjs';
import {
  applyBadgeEvent,
  applyOptimisticRead,
  applyOptimisticReadAll,
  applyReconciliation,
  createBadgeState,
  type BadgeState,
} from '@/lib/notifications/badge.mjs';
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
  /** فاز ۱۲٫۳۱ — تنظیمات کانالها و رویداد‌ها؛ از بکند و بین دستگاه‌ها همگام. */
  settings: NotificationSettings | null;
  settingsLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (payload: {
    channels?: Partial<NotificationChannelFlags>;
    events?: Array<{ type: string } & Partial<NotificationChannelFlags>>;
  }) => Promise<void>;
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
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const settingsSeqRef = useRef(0);

  const lastCountRef = useRef(0);
  const lastPollRef = useRef(0);
  const badgeRef = useRef<BadgeState>(createBadgeState(0));
  const reconcileSeqRef = useRef(0);
  const refreshSeqRef = useRef(0);
  const loadSeqRef = useRef(0);

  const commitBadge = useCallback((next: BadgeState) => {
    badgeRef.current = next;
    const count = Math.max(0, next.count);
    setUnreadCount(count);
    lastCountRef.current = count;
    void setAppBadge(count);
    if (isLeader) {
      publish('notifications', { unreadCount: count, dataVersion: next.lastDataVersion });
    }
  }, [isLeader, publish]);

  const refresh = useCallback(async () => {
    if (!signedIn) return;
    const requestId = ++refreshSeqRef.current;
    const revisionAtRequest = badgeRef.current.optimisticRevision;
    setLoading(true);
    try {
      const page = await api.list(20, 0);
      if (requestId !== refreshSeqRef.current) return;
      setNotifications(page.notifications);
      setHasMore(page.hasMore);
      const merged = applyReconciliation(badgeRef.current, {
        count: page.unreadCount,
        dataVersion: page.dataVersion,
        revisionAtRequest,
      });
      if (merged.accepted) commitBadge(merged.state);
      setError(null);
    } catch (err) {
      if (requestId === refreshSeqRef.current) setError(messageOf(err));
    } finally {
      if (requestId === refreshSeqRef.current) setLoading(false);
    }
  }, [api, commitBadge, signedIn]);

  const reconcileUnread = useCallback(async () => {
    if (!signedIn || !isLeader) return;
    const requestId = ++reconcileSeqRef.current;
    const revisionAtRequest = badgeRef.current.optimisticRevision;
    try {
      const result = await api.unreadCount();
      if (requestId !== reconcileSeqRef.current) return;
      const merged = applyReconciliation(badgeRef.current, { ...result, revisionAtRequest });
      if (merged.accepted) commitBadge(merged.state);
    } catch {
      /* شمارنده اختیاری است؛ retries توسط polling بعدی انجام می‌شود. */
    }
  }, [api, commitBadge, isLeader, signedIn]);

  const loadMore = useCallback(async () => {
    if (!signedIn || loading || !hasMore) return;
    const requestKey = ++loadSeqRef.current;
    setLoading(true);
    try {
      const page = await api.list(20, notifications.length);
      if (requestKey !== loadSeqRef.current) return;
      setNotifications((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...page.notifications.filter((item) => !seen.has(item.id))];
      });
      setHasMore(page.hasMore);
      // شمارنده جاری نباید توسط صفحهٔ قدیمی overwrite شود.
    } catch (err) {
      setError(messageOf(err));
    } finally {
      if (requestKey === loadSeqRef.current) setLoading(false);
    }
  }, [api, hasMore, loading, notifications.length, signedIn]);

  const markRead = useCallback(
    async (id: string) => {
      if (!signedIn) return;
      const optimistic = applyOptimisticRead(badgeRef.current, id, `read:${id}:${Date.now()}`);
      if (optimistic.changed) commitBadge(optimistic.state);
      try {
        await api.markRead(id);
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
        );
      } catch (err) {
        setError(messageOf(err));
      } finally {
        badgeRef.current.pendingReads.delete(id);
        void reconcileUnread();
      }
    },
    [api, commitBadge, reconcileUnread, signedIn],
  );

  const markAllRead = useCallback(async () => {
    if (!signedIn) return;
    const optimistic = applyOptimisticReadAll(badgeRef.current, `read-all:${Date.now()}`);
    if (optimistic.changed) commitBadge(optimistic.state);
    try {
      await api.markAllRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    } catch (err) {
      setError(messageOf(err));
    } finally {
      void reconcileUnread();
    }
  }, [api, commitBadge, reconcileUnread, signedIn]);

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

  const loadSettings = useCallback(async () => {
    if (!signedIn) return;
    const requestId = ++settingsSeqRef.current;
    setSettingsLoading(true);
    try {
      const value = await api.settings();
      if (requestId === settingsSeqRef.current) setSettings(value);
    } catch {
      /* تنظیمات اختیاریاند؛ تلاش بعدی هنگام بازگشت تب انجام می‌شود. */
    } finally {
      if (requestId === settingsSeqRef.current) setSettingsLoading(false);
    }
  }, [api, signedIn]);

  const updateSettings = useCallback(
    async (payload: {
      channels?: Partial<NotificationChannelFlags>;
      events?: Array<{ type: string } & Partial<NotificationChannelFlags>>;
    }) => {
      if (!signedIn) return;
      const value = await api.saveSettings(payload);
      setSettings(value);
      // تب‌های همان مرورگر بدون درخواست تازه از همان پاسخ استفاده می‌کنند.
      publish('notification-settings', { updatedAt: value.updatedAt });
      if (payload.channels?.telegram !== undefined) void refreshTelegramStatus();
    },
    [api, publish, refreshTelegramStatus, signedIn],
  );

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
    void loadSettings();
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
        const before = lastCountRef.current;
        await reconcileUnread();
        if (!alive) return;
        setError(null);
        if (lastCountRef.current > before) void refresh();
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
  }, [refresh, reconcileUnread, refreshTelegramStatus, loadSettings, signedIn, isLeader, online, multiplier, connected]);

  /** تب‌های پیرو شمارنده، نسخه سرور و فهرست اعلان را بدون HTTP از رهبر می‌گیرند. */
  useEffect(() => {
    if (!signedIn || isLeader) return undefined;
    return subscribe((message) => {
      if (message.channel === 'notification-settings') {
        void loadSettings();
        return;
      }
      if (message.channel === 'notifications-list') {
        const payload = message.payload as { notifications?: unknown; hasMore?: unknown } | null;
        if (Array.isArray(payload?.notifications)) {
          setNotifications(payload.notifications as NotificationItem[]);
        }
        if (typeof payload?.hasMore === 'boolean') setHasMore(payload.hasMore);
        return;
      }
      if (message.channel !== 'notifications') return;
      const payload = message.payload as { unreadCount?: unknown; dataVersion?: unknown } | null;
      const count = Number(payload?.unreadCount ?? 0);
      const version = Number(payload?.dataVersion ?? 0);
      if (!Number.isFinite(count)) return;
      const safe = Math.max(0, count);
      const state = badgeRef.current;
      badgeRef.current = {
        ...state,
        count: safe,
        lastDataVersion: Math.max(state.lastDataVersion, Number.isFinite(version) ? version : 0),
      };
      setUnreadCount(safe);
      lastCountRef.current = safe;
      void setAppBadge(safe);
    });
  }, [isLeader, loadSettings, signedIn, subscribe]);

  /** رهبر فهرست اعلان را برای تب‌های پیرو پخش می‌کند. */
  useEffect(() => {
    if (!signedIn || !isLeader) return;
    publish('notifications-list', { notifications, hasMore });
  }, [hasMore, isLeader, notifications, publish, signedIn]);

  /** ارتقای رهبر جدید با یک reconcile سبک آغاز می‌شود. */
  useEffect(() => {
    if (!signedIn || !isLeader) return;
    void reconcileUnread();
  }, [isLeader, reconcileUnread, signedIn]);

  // Phase 12.17: realtime events replace business polling while connected.
  useRealtimeEvent(
    ['notification.created', 'notification.read', 'notification.settings.changed'],
    (event) => {
    if (!signedIn) return;
    if (event.type === 'notification.settings.changed') {
      void loadSettings();
      return;
    }
    const result = applyBadgeEvent(badgeRef.current, event);
    if (!result.changed) return;
    commitBadge(result.state);
    // فقط رهبر شبکه مصرف می‌کند؛ تب‌های پیرو همان نتیجه را از BroadcastChannel می‌گیرند.
    if (!isLeader) return;
    if (event.type === 'notification.created') void refresh();
    else void reconcileUnread();
    },
  );

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
      settings,
      settingsLoading,
      loadSettings,
      updateSettings,
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
      settings, settingsLoading, loadSettings, updateSettings,
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
