'use client';

/**
 * فاز ۹٫۵ / ۱۰ — وضعیت سراسری «سفارش‌گردانی» + پایش کممصرف (O-99).
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
import { apiConditionalGet } from '@/lib/api';
import { createActivitiesApi, type UnseenGroup } from '@/lib/activities/api';
import {
  ACTIVITY_POLL_MS,
  activityDataVersion,
  isStaleActivitySnapshot,
  shouldUseActivityCache,
  visibleUnseenGroups,
} from '@/lib/activities/core.mjs';
import { usePollLeader } from '@/lib/connectivity/poll-leader';
import { useRealtimeEvent, useRealtimeStatus } from '@/components/system/RealtimeProvider';
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
  dataVersion?: number;
  serverTime?: string;
}

interface BroadcastState {
  groups: UnseenGroup[];
  total: number;
  etag: string | null;
  serverTime: string;
  dataVersion: number;
}

function messageOf(error: unknown): string {
  return error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message ?? '')
    : 'ارتباط با سرور برقرار نشد';
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { user, token, authedRequest } = useAuth();
  const signedIn = Boolean(user && token);
  const role: 'admin' | 'customer' = user?.role === 'admin' ? 'admin' : 'customer';
  const api = useMemo(() => createActivitiesApi(authedRequest), [authedRequest]);
  const { isLeader, online, multiplier, publish, subscribe } = usePollLeader();
  const { connected } = useRealtimeStatus();

  const [groups, setGroups] = useState<UnseenGroup[]>([]);
  const [unseenTotal, setUnseenTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const lastPollRef = useRef(0);
  const shownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const etagRef = useRef<string | null>(null);
  const dataVersionRef = useRef(0);
  const refreshSeqRef = useRef(0);
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyState = useCallback(
    (nextGroups: UnseenGroup[], nextTotal: number, startedAt: number) => {
      setGroups(nextGroups);
      setUnseenTotal(nextTotal);
      setLastUpdated(new Date(startedAt).toISOString());
      setError(null);
      const ids = new Set(nextGroups.flatMap((group) => group.items.map((item) => item.id)));
      // Toast سراسری تنها توسط BusinessToastBridge صادر می‌شود.
      for (const id of ids) shownIdsRef.current.add(id);
      for (const id of [...shownIdsRef.current]) {
        if (!ids.has(id)) shownIdsRef.current.delete(id);
      }
    },
    [],
  );

  const refresh = useCallback(
    async (force = false, bypassCache = false) => {
      if (!signedIn) return;
      // پایش پس‌زمینه فقط از تب رهبر و فقط آنلاین؛ اقدام صریح کاربر مستثناست.
      if (!force && (!isLeader || !online)) return;
      if (!force && typeof document !== 'undefined' && document.hidden) return;
      if (!bypassCache && shouldUseActivityCache({ lastPollAt: lastPollRef.current, force })) return;
      const requestId = ++refreshSeqRef.current;
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
          // ۳۰۴: هیچ بدنهای نیامد؛ وضعیت و Toast دست‌nخورده باقی می‌ماند.
          setError(null);
          return;
        }
        if (requestId !== refreshSeqRef.current) return;
        const responseVersion = Number(result.data.dataVersion ?? 0);
        if (isStaleActivitySnapshot(responseVersion, dataVersionRef.current)) {
          // پاسخ قدیمی‌تر ازEventهای دریافت‌شده نباید Badge را عقب ببرد.
          return;
        }
        if (Number.isFinite(responseVersion) && responseVersion > dataVersionRef.current) {
          dataVersionRef.current = responseVersion;
        }
        const nextGroups = visibleUnseenGroups(result.data.groups);
        const nextTotal = nextGroups.reduce((sum, group) => sum + group.unseenCount, 0);
        applyState(nextGroups, nextTotal, startedAt);
        publish('activities', {
          groups: nextGroups,
          total: nextTotal,
          etag: etagRef.current,
          serverTime: new Date(startedAt).toISOString(),
          dataVersion: dataVersionRef.current,
        } satisfies BroadcastState);
      } catch (caught) {
        if (requestId === refreshSeqRef.current) {
          setError(messageOf(caught));
          throw caught;
        }
      } finally {
        if (requestId === refreshSeqRef.current) setLoading(false);
      }
    },
    [applyState, isLeader, online, publish, signedIn, token],
  );

  /** چند Event پشت سر هم تنها یک refetch شرطی می‌سازند. */
  const scheduleEventRefresh = useCallback(() => {
    if (!signedIn || !isLeader || !online) return;
    if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
    eventTimerRef.current = setTimeout(() => {
      eventTimerRef.current = null;
      void refresh(false, true);
    }, 0);
  }, [isLeader, online, refresh, signedIn]);

  /** تب‌های پیرو نتیجه را بدون هیچ درخواست شبکه‌ای از رهبر می‌گیرند. */
  useEffect(() => {
    if (!signedIn) return undefined;
    return subscribe((message) => {
      if (message.channel !== 'activities' || isLeader) return;
      const state = message.payload as BroadcastState | null;
      if (!state || !Array.isArray(state.groups)) return;
      const stateVersion = Number(state.dataVersion ?? 0);
      if (isStaleActivitySnapshot(stateVersion, dataVersionRef.current)) return;
      if (Number.isFinite(stateVersion) && stateVersion > dataVersionRef.current) {
        dataVersionRef.current = stateVersion;
      }
      if (state.etag) etagRef.current = state.etag;
      lastPollRef.current = Date.now();
      const startedAt = Date.parse(state.serverTime ?? '') || Date.now();
      applyState(state.groups, Number(state.total ?? 0) || 0, startedAt);
    });
  }, [applyState, isLeader, signedIn, subscribe]);

  // Phase 12.17: realtime events replace business polling while connected.
  useRealtimeEvent(['activity.created', 'project.status_changed', 'project.created'], (event) => {
    if (!signedIn || !isLeader || !online) return;
    const version = activityDataVersion(event);
    if (Number.isFinite(version) && version > dataVersionRef.current) {
      dataVersionRef.current = version;
    }
    scheduleEventRefresh();
  });

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
      dataVersionRef.current = 0;
      refreshSeqRef.current += 1;
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
      eventTimerRef.current = null;
      return undefined;
    }
    // Phase 12.17: no business timers while the realtime socket is connected.
    if (connected) return undefined;

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
  }, [refresh, signedIn, isLeader, online, multiplier, connected]);

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
