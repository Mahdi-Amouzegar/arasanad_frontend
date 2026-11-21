'use client';

/**
 * فاز ۱۲٫۱۷ — تنها تب رهبر WebSocket نگه می‌دارد و رویداد‌ها را به تب‌های
 * پیرو از طریق BroadcastChannel موجود پخش می‌کند. منبع حقیقت D1/API است؛
 * رویداد‌ها تنها اعلام می‌کنند که «چیزی تغییر کرده» است.
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
import { usePollLeader } from '@/lib/connectivity/poll-leader';
import {
  fetchRealtimeEvents,
  getRealtimeTicket,
  isRealtimeEvent,
  nextCursorFrom,
  realtimeCursorKey,
  reconnectDelay,
  wsUrlFromApiBase,
  type RealtimeEvent,
  type RealtimeEventType,
} from '@/lib/realtime/api';

export type RealtimeStatus = 'offline' | 'connecting' | 'connected' | 'reconnecting';

type RealtimeListener = (event: RealtimeEvent) => void;

interface RealtimeContextValue {
  status: RealtimeStatus;
  connected: boolean;
  subscribe: (listener: RealtimeListener) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const MAX_SEEN_IDS = 1000;
const REPLAY_PAGE_SIZE = 100;
const MAX_REPLAY_PAGES = 10;

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user, token, loading, authedRequest } = useAuth();
  const { isLeader, online, publish, subscribe: subscribeLeader } = usePollLeader();
  const [status, setStatus] = useState<RealtimeStatus>('offline');

  const listenersRef = useRef<Set<RealtimeListener>>(new Set());
  const seenRef = useRef<Set<string>>(new Set());
  const requestRef = useRef(authedRequest);
  const publishRef = useRef(publish);
  requestRef.current = authedRequest;
  publishRef.current = publish;

  const subscribe = useCallback((listener: RealtimeListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  /** تحویل یک رویداد به شنوندگان محلی؛ تب رهبر cursor را هم پیش میبرد. */
  const handleEvent = useCallback(
    (raw: unknown, fromLeaderSocket: boolean) => {
      if (!isRealtimeEvent(raw)) return;
      const event: RealtimeEvent = {
        id: raw.id,
        type: raw.type as RealtimeEventType,
        seq: raw.seq,
        payload:
          raw.payload && typeof raw.payload === 'object'
            ? (raw.payload as Record<string, unknown>)
            : {},
        createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
      };
      if (seenRef.current.has(event.id)) return;
      if (seenRef.current.size > MAX_SEEN_IDS) {
        const oldest = [...seenRef.current].slice(0, MAX_SEEN_IDS / 2);
        for (const id of oldest) seenRef.current.delete(id);
      }
      seenRef.current.add(event.id);

      if (fromLeaderSocket) {
        const key = realtimeCursorKey(user?.id ?? '');
        try {
          const stored = Number(window.localStorage.getItem(key) ?? '0');
          const current = Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : 0;
          window.localStorage.setItem(key, String(Math.max(current, event.seq)));
        } catch {
          /* حالت خصوصی: cursor تنها در حافظه همین تب باقی می‌ماند. */
        }
        publishRef.current('realtime', event);
      }

      for (const listener of [...listenersRef.current]) listener(event);
    },
    [user?.id],
  );

  /* ── اتصال تنها از تب رهبر، با بازیابی و اتصال مجدد ── */
  useEffect(() => {
    if (loading || !user || !token) {
      setStatus('offline');
      return undefined;
    }
    if (!isLeader || !online) {
      setStatus('offline');
      return undefined;
    }

    let alive = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const cursorKey = realtimeCursorKey(user.id);
    const readCursor = (): number => {
      try {
        const stored = Number(window.localStorage.getItem(cursorKey) ?? '0');
        return Number.isFinite(stored) ? Math.max(0, Math.floor(stored)) : 0;
      } catch {
        return 0;
      }
    };
    let cursor = readCursor();

    const replay = async () => {
      try {
        let after = cursor;
        for (let page = 0; page < MAX_REPLAY_PAGES; page += 1) {
          const result = await fetchRealtimeEvents(requestRef.current, after, REPLAY_PAGE_SIZE);
          if (!alive) return;
          const events = result.events ?? [];
          for (const event of events) handleEvent(event, true);
          cursor = nextCursorFrom(events, after);
          const next = Number(result.nextCursor ?? 0);
          if (
            events.length < REPLAY_PAGE_SIZE ||
            !Number.isFinite(next) ||
            next <= after ||
            next <= cursor
          ) break;
          after = Math.max(cursor, next);
        }
      } catch {
        /* بازیابی ناموفق در اتصال مجدد بعدی دوباره تلاش می‌شود. */
      }
    };

    const connect = async () => {
      if (!alive) return;
      setStatus(attempt === 0 ? 'connecting' : 'reconnecting');
      try {
        const ticketData = await getRealtimeTicket(requestRef.current);
        if (!alive) return;
        if (!ticketData?.ticket || !ticketData?.wsPath) throw new Error('invalid ticket');
        // بلیت در subprotocol است، نه در آدرس.
        const ws = new WebSocket(wsUrlFromApiBase(ticketData.wsPath), [
          'arasanad',
          ticketData.ticket,
        ]);
        socket = ws;
        ws.onopen = () => {
          if (!alive) {
            ws.close();
            return;
          }
          attempt = 0;
          setStatus('connected');
          void replay();
        };
        ws.onmessage = (message) => {
          if (!alive || typeof message.data !== 'string') return;
          try {
            handleEvent(JSON.parse(message.data), true);
          } catch {
            /* نادیدهگرفتن فریمهای نامعتبر */
          }
        };
        ws.onerror = () => {
          /* onclose مسئول اتصال مجدد است. */
        };
        ws.onclose = () => {
          if (socket === ws) socket = null;
          if (!alive) return;
          attempt += 1;
          setStatus('reconnecting');
          const jitter = Math.floor(Math.random() * 250);
          reconnectTimer = setTimeout(() => {
            reconnectTimer = undefined;
            void connect();
          }, reconnectDelay(attempt, jitter));
        };
      } catch {
        if (!alive) return;
        // خطای بلیت یا احراز هویت: توقف بدون چرخهٔ اتصال مجدد.
        setStatus('offline');
      }
    };

    const onVisibility = () => {
      if (document.hidden || !alive) return;
      if (socket && socket.readyState === WebSocket.OPEN) void replay();
      else if (socket === null && reconnectTimer === undefined) void connect();
    };
    document.addEventListener('visibilitychange', onVisibility);
    void connect();

    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisibility);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
        socket = null;
      }
    };
  }, [user?.id, token, loading, isLeader, online, handleEvent]);

  /* ── تب‌های پیرو رویداد را بدون Socket دوباره از رهبر می‌گیرند ── */
  useEffect(() => {
    if (loading || !user || !token || isLeader) return undefined;
    return subscribeLeader((message) => {
      if (message.channel !== 'realtime') return;
      handleEvent(message.payload, false);
    });
  }, [isLeader, loading, user?.id, token, subscribeLeader, handleEvent]);

  const value = useMemo<RealtimeContextValue>(
    () => ({ status, connected: status === 'connected', subscribe }),
    [status, subscribe],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime باید درون RealtimeProvider استفاده شود');
  }
  return context;
}

export function useRealtimeStatus(): { status: RealtimeStatus; connected: boolean } {
  const { status, connected } = useRealtime();
  return { status, connected };
}

/** اشتراک در انواع رویداد دلخواه؛ تابع handler همیشه تازه‌ترین نسخه را می‌بیند. */
export function useRealtimeEvent(
  types: RealtimeEventType | RealtimeEventType[],
  handler: (event: RealtimeEvent) => void,
): void {
  const { subscribe } = useRealtime();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const key = Array.isArray(types) ? types.join('|') : types;

  useEffect(
    () =>
      subscribe((event) => {
        const match = Array.isArray(types) ? types.includes(event.type) : event.type === types;
        if (match) handlerRef.current(event);
      }),
    [subscribe, key],
  );
}
