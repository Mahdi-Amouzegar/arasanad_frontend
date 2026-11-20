'use client';

/**
 * فاز ۹٫۵ / ۱۰ — وضعیت سراسری «سفارشگردانی» + پایش کممصرف (O-99).
 *
 * - `setTimeout` زنجیره‌ای (نه `setInterval`)؛ هنگام اجرای درخواست تایمر بعدی ساخته نمی‌شود
 * - تنها **یک تب** (رهبر) پایش می‌کند؛ بقیه تبها نتیجه را از BroadcastChannel می‌گیرند
 * - تب مخفی / آفلاین → توقف کامل بدون هیچ درخواست؛ بازگشت → اجرای فوری
 * - `ETag` / `If-None-Match`: بیتغییری یعنی ۳۰۴ بدون بدنه (تقریباً بدون هزینه شبکه)
 * - `saveData` و اتصال کند → فاصلهها چندبرابر؛ خطا → backoff تطبیقی کراندار
 * - پاسخ سرور فشرده است و کش کوتاه ۳۰ ثانیه‌ای جلوی تیکهای تکراری را می‌گیرد
 * - زنگوله فقط از `GET /activities/unseen` تغذیه می‌شود (منبع واحد حقیقت)
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
import { useAlert } from '@/components/ui/AlertProvider';
import { apiConditionalGet } from '@/lib/api';
import { createActivitiesApi, type UnseenGroup } from '@/lib/activities/api';
import {
  ACTIVITY_POLL_MS,
  shouldUseActivityCache,
  visibleUnseenGroups,
} from '@/lib/activities/core.mjs';
import { usePollLeader } from '@/lib/connectivity/poll-leader';
import { governorDecision } from '@/lib/connectivity/poll-governor.mjs';

interface ActivityContextValue {
  signedIn: boolean;
  role: 'admin' | 'customer';
  groups: UnseenGroup[];
  unseenTotal: number;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  /** `force=true` کش کوتاه و محدودیت رهبری را نادیده می‌گیرد (اقدام صریح کاربر). */
  refresh: (force?: boolean) => Promise<void>;
  markSeen: (activityIds: string[], projectId?: string) => Promise<void>;
  markAllSeen: (projectId?: string) => Promise<void>;
}

const ActivityContext = createContext<ActivityContextValue | null>(null);

interface UnseenPayload {
  groups: UnseenGroup[];
  total: number;
  items: Array<Record<string, unknown>>;
  etag?: string | null;
}

interface BroadcastState {
  groups: UnseenGroup[];
  total: number;
  etag: string | null;
  serverTime: string;
}

function messageOf(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message ?? '')
    : 'ارتباط با سرور برقرار نشد';
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { user, token, authedRequest } = useAuth();
  const { showToast } = useAlert();
  const signedIn = Boolean(user && token);
  const role: 'admin' | 'customer' = user?.role === 'admin' ? 'admin' : 'customer';
  const api = useMemo(() => createActivitiesApi(authedRequest), [authedRequest]);
  const { isLeader, online, multiplier, publish, subscribe } = usePollLeader();

  const [groups, setGroups] = useState<UnseenGroup[]>([]);
  const [unseenTotal, setUnseenTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const lastPollRef = useRef(0);
  const lastTotalRef = useRef(0);
  const shownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const etagRef = useRef<string | null>(null);

  const applyState = useCallback(
    (nextGroups: UnseenGroup[], nextTotal: number, startedAt: number, notify: boolean) => {
      setGroups(nextGroups);
      setUnseenTotal(nextTotal);
      setLastUpdated(new Date(startedAt).toISOString());
      setError(null);
      const ids = new Set(nextGroups.flatMap((group) => group.items.map((item) => item.id)));
      if (!initializedRef.current) {
        // نخستین بار پس از ورود، عملیات‌های قدیمی toast نمی‌دهند.
        for (const id of ids) shownIdsRef.current.add(id);
        initializedRef.current = true;
      } else if (notify && nextTotal > lastTotalRef.current) {
        const fresh = nextGroups
          .flatMap((group) => group.items)
          .filter((item) => !shownIdsRef.current.has(item.id));
        for (const item of fresh) shownIdsRef.current.add(item.id);
        const newest = fresh[0];
        if (newest) {
          showToast({
            type: 'info',
            title: newest.title || 'عملیات تازه روی سفارش',
            message: `سفارش ${newest.code ?? ''} — ${fresh.length} عملیات تازه در سفارشگردانی`,
          });
        }
      } else if (!notify) {
        // تب پیرو بدون toast همگام می‌شود تا شناسه‌ها بعداً تکرار نشوند.
        for (const id of ids) shownIdsRef.current.add(id);
      }
      for (const id of [...shownIdsRef.current]) {
        if (!ids.has(id)) shownIdsRef.current.delete(id);
      }
      lastTotalRef.current = nextTotal;
    },
    [showToast],
  );

  const refresh = useCallback(
    async (force = false) => {
      if (!signedIn) return;
      // پایش پس‌زمینه فقط از تب رهبر و فقط آنلاین؛ اقدام صریح کاربر مستثناست.
      if (!force && (!isLeader || !online)) return;
      if (!force && typeof document !== 'undefined' && document.hidden) return;
      if (shouldUseActivityCache({ lastPollAt: lastPollRef.current, force })) return;
      const startedAt = Date.now();
      setLoading(true);
      try {
        const result = await apiConditionalGet<UnseenPayload>('/activities/unseen', {
          token,
          etag: etagRef.current,
        });
        lastPollRef.current = Date.now();
        if (result.etag) etagRef.current = result.etag;
        if (result.notModified || !result.data) {
          // ۳۰۴: هیچ بدنهای نیامد؛ وضعیت و toast دستنخورده باقی می‌ماند.
          setError(null);
          return;
        }
        const nextGroups = visibleUnseenGroups(result.data.groups);
        const nextTotal = nextGroups.reduce((sum, group) => sum + group.unseenCount, 0);
        applyState(nextGroups, nextTotal, startedAt, true);
        publish('activities', {
          groups: nextGroups,
          total: nextTotal,
          etag: etagRef.current,
          serverTime: new Date(startedAt).toISOString(),
        } satisfies BroadcastState);
      } catch (caught) {
        setError(messageOf(caught));
        throw caught;
      } finally {
        setLoading(false);
      }
    },
    [applyState, isLeader, online, publish, signedIn, token],
  );

  /** تب‌های پیرو نتیجه را بدون هیچ درخواست شبکه‌ای از رهبر می‌گیرند. */
  useEffect(() => {
    if (!signedIn) return undefined;
    return subscribe((message) => {
      if (message.channel !== 'activities' || isLeader) return;
      const state = message.payload as BroadcastState | null;
      if (!state || !Array.isArray(state.groups)) return;
      if (state.etag) etagRef.current = state.etag;
      lastPollRef.current = Date.now();
      applyState(state.groups, Number(state.total ?? 0) || 0, Date.now(), false);
    });
  }, [applyState, isLeader, signedIn, subscribe]);

  const markSeen = useCallback(
    async (activityIds: string[], projectId?: string) => {
      if (!signedIn || activityIds.length === 0) return;
      await api.markSeen(activityIds, projectId);
      await refresh(true);
    },
    [api, refresh, signedIn],
  );

  const markAllSeen = useCallback(
    async (projectId?: string) => {
      if (!signedIn) return;
      await api.markAllSeen(projectId);
      await refresh(true);
    },
    [api, refresh, signedIn],
  );

  /* ── پایش هوشمند: رهبری تکتب + ۳۰۴ + backoff تطبیقی ── */
  useEffect(() => {
    if (!signedIn) {
      setGroups([]);
      setUnseenTotal(0);
      initializedRef.current = false;
      shownIdsRef.current.clear();
      etagRef.current = null;
      return undefined;
    }

    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    const schedule = () => {
      if (!alive) return;
      const hidden = typeof document !== 'undefined' && document.hidden;
      const decision = governorDecision({
        hidden,
        online,
        isLeader,
        failures,
        baseDelayMs: ACTIVITY_POLL_MS,
        multiplier,
        lastPollAt: lastPollRef.current,
        now: Date.now(),
      });
      if (decision.stop || decision.delayMs === null) return;
      timer = setTimeout(() => void tick(), decision.delayMs);
    };

    const tick = async () => {
      if (!alive) return;
      try {
        await refresh(false);
        if (!alive) return;
        failures = 0;
      } catch {
        failures = Math.min(failures + 1, 3);
      } finally {
        schedule();
      }
    };

    const onVisibility = () => {
      if (timer) clearTimeout(timer);
      if (!document.hidden) {
        lastPollRef.current = 0; // بازگشت تب = اجرای فوری، بیهاعتنایی به کش
        void tick();
      } else {
        schedule();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }
    if (isLeader && online) {
      lastPollRef.current = 0;
      void tick();
    } else {
      schedule();
    }

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [refresh, signedIn, isLeader, online, multiplier]);

  const value = useMemo<ActivityContextValue>(
    () => ({
      signedIn,
      role,
      groups,
      unseenTotal,
      loading,
      error,
      lastUpdated,
      refresh,
      markSeen,
      markAllSeen,
    }),
    [
      signedIn, role, groups, unseenTotal, loading, error, lastUpdated,
      refresh, markSeen, markAllSeen,
    ],
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivities(): ActivityContextValue {
  const context = useContext(ActivityContext);
  if (!context) throw new Error('useActivities باید درون ActivityProvider استفاده شود');
  return context;
}
