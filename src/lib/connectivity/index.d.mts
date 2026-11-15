/** اعلان نوع برای هسته‌ی ESM کتابخانه (بدون نیاز به allowJs در tsconfig). */

export type NetworkStatus = 'unknown' | 'online' | 'offline';
export type ServerTimePhase = 'idle' | 'checking' | 'searching' | 'synced' | 'unavailable' | 'system';
export type TimeSourceMode = 'server-only' | 'system-only' | 'prefer-server';
export type ConnectionQuality = 'unknown' | 'offline' | 'slow' | 'fast';

export interface NetworkSnapshot {
  status: NetworkStatus;
  online: boolean | null;
  checking: boolean;
  source: string;
  reason: string | null;
  lastChangeAt: number | null;
  lastCheckedAt: number | null;
  latencyMs: number | null;
  effectiveType: string | null;
  downlink: number | null;
  rtt: number | null;
}

export interface ServerTimeSnapshot {
  phase: ServerTimePhase;
  source: string | null;
  sourceLabel: string | null;
  attempt: number;
  total: number;
  progressLabel: string | null;
  serverMs: number | null;
  offsetMs: number | null;
  roundTripMs: number | null;
  syncedAt: number | null;
  trusted: boolean;
  error: string | null;
  fallbackSource: 'system' | null;
}

export interface ServerTimeResult {
  serverMs: number;
  offsetMs: number;
  roundTripMs: number;
  source: string;
  sourceLabel: string;
  syncedAt: string;
}

export interface CurrentTimeOptions {
  source?: TimeSourceMode;
  force?: boolean;
}

export interface TimeSourceOption {
  source?: TimeSourceMode;
}

/** Result of an explicit "current time" request with a chosen source. */
export type TimeReading =
  | {
      ok: true;
      mode: TimeSourceMode;
      source: 'server' | 'system';
      trusted: boolean;
      ms: number;
      iso: string;
      offsetMs: number | null;
      roundTripMs: number | null;
      reason: string | null;
    }
  | {
      ok: false;
      mode: TimeSourceMode;
      source: null;
      trusted: false;
      ms: null;
      iso: null;
      offsetMs: null;
      roundTripMs: null;
      error: string;
    };

export interface TimeSource {
  id: string;
  label: string;
  url: string;
  method?: string;
  parse: (response: Response) => Promise<number> | number;
}

export interface ProbeSource {
  url: string;
  method?: string;
  validate?: (response: Response, text: string) => boolean;
}

export type ConnectivityFetch = typeof globalThis.fetch;

export interface ConnectivityConfig {
  apiBaseUrl: string;
  probeUrls: Array<string | ProbeSource>;
  probeTimeoutMs: number;
  probeMinIntervalMs: number;
  monitorIntervalMs: number;
  networkVerdictTimeoutMs: number;
  timeSourceTimeoutMs: number;
  resyncIntervalMs: number;
  retryBaseMs: number;
  retryMaxMs: number;
  retryJitter: number;
  storageKey: string;
  fetchImpl?: ConnectivityFetch;
  windowImpl?: Window | null;
  navigatorImpl?: Navigator | null;
  connectionImpl?: Record<string, unknown> | null;
  timeSources?: TimeSource[];
  timeSourceMode: TimeSourceMode;
  storageImpl?: Storage | null;
}

export interface Store<T> {
  getSnapshot: () => T;
  subscribe: (listener: (state: T) => void) => () => void;
  setState: (patch: Partial<T> | ((state: T) => Partial<T>)) => T;
  reset: (next?: T) => T;
  listenerCount: () => number;
}

/* ───────── config ───────── */
export declare const DEFAULT_CONFIG: Readonly<ConnectivityConfig>;
export declare function configureConnectivity(options?: Partial<ConnectivityConfig>): ConnectivityConfig;
export declare function getConnectivityConfig(): ConnectivityConfig;
export declare function resetConnectivityConfigForTests(): ConnectivityConfig;

/* ───────── store ───────── */
export declare function createStore<T extends object>(initialState: T): Store<T>;

/* ───────── network ───────── */
export declare const NETWORK_STATUS: Readonly<{ UNKNOWN: 'unknown'; ONLINE: 'online'; OFFLINE: 'offline' }>;
export declare const networkStore: Store<NetworkSnapshot>;
export declare function getNetworkSnapshot(): NetworkSnapshot;
export declare function subscribeNetwork(listener: (state: NetworkSnapshot) => void): () => void;
export declare function probeConnection(options?: { force?: boolean; timeoutMs?: number }): Promise<boolean>;
export declare function isOnline(): boolean;
export declare function getNetworkStatus(): NetworkStatus;
export declare function noteRequestOutcome(outcome?: { ok: boolean; latencyMs?: number | null; reason?: string | null }): NetworkSnapshot;
export declare function waitForOnline(options?: { timeoutMs?: number; signal?: AbortSignal }): Promise<boolean>;
export declare function startNetworkMonitor(): NetworkSnapshot;
export declare function stopNetworkMonitor(): void;
export declare function resetNetworkForTests(): void;

/* ───────── server time ───────── */
export declare const SERVER_TIME_PHASE: Readonly<{
  IDLE: 'idle'; CHECKING: 'checking'; SEARCHING: 'searching';
  SYNCED: 'synced'; UNAVAILABLE: 'unavailable'; SYSTEM: 'system';
}>;
export declare const TIME_SOURCE_MODE: Readonly<{
  SERVER_ONLY: 'server-only'; SYSTEM_ONLY: 'system-only'; PREFER_SERVER: 'prefer-server';
}>;
export declare const DEFAULT_TIME_SOURCE_MODE: 'prefer-server';
export declare const serverTimeStore: Store<ServerTimeSnapshot>;
export declare function getServerTimeSnapshot(): ServerTimeSnapshot;
export declare function subscribeServerTime(listener: (state: ServerTimeSnapshot) => void): () => void;
export declare function defaultTimeSources(apiBaseUrl?: string): TimeSource[];
export declare function getConfiguredTimeSourceMode(): TimeSourceMode;
export declare function syncServerTime(options?: { force?: boolean; source?: TimeSourceMode }): Promise<ServerTimeResult | null>;
export declare function getCurrentTime(options?: CurrentTimeOptions): Promise<TimeReading>;
export declare function systemNow(): Date;
export declare function nowMs(options?: TimeSourceOption): number;
export declare function serverNow(options?: TimeSourceOption): Date;
export declare function timestampForEvent(options?: TimeSourceOption): string;
export declare function isServerTimeTrusted(): boolean;
export declare function describeServerTimePhase(snapshot?: ServerTimeSnapshot): string;
export declare function startServerTimeSync(options?: { source?: TimeSourceMode }): Promise<ServerTimeResult | null>;
export declare function stopServerTimeSync(): void;
export declare function resetServerTimeForTests(): void;

/* ───────── retry ───────── */
export declare function backoffDelay(
  attempt: number,
  options?: { baseMs?: number; maxMs?: number; jitter?: number },
  random?: () => number,
): number;
export declare function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options?: {
    retries?: number;
    signal?: AbortSignal;
    shouldRetry?: (error: unknown) => boolean;
    onAttempt?: (attempt: number, error: unknown) => void;
    baseMs?: number;
    maxMs?: number;
  },
): Promise<T>;

/* ───────── offline queue ───────── */
export interface OfflineQueueSnapshot {
  size: number;
  flushing: boolean;
  lastError: string | null;
}
export interface OfflineQueue {
  enqueue: (payload: unknown) => string;
  flush: () => Promise<{ sent: number; remaining: number }>;
  start: () => OfflineQueue;
  stop: () => void;
  clear: () => void;
  getSnapshot: () => OfflineQueueSnapshot;
  subscribe: (listener: (state: OfflineQueueSnapshot) => void) => () => void;
  readonly size: number;
}
export declare function createOfflineQueue(options: {
  name?: string;
  send: (payload: unknown, meta: { id: string; enqueuedAt: string }) => Promise<unknown>;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  maxItems?: number;
}): OfflineQueue;

/* ───────── transfer helpers ───────── */
export declare function connectivityFetch(
  input: string | URL | Request,
  init?: RequestInit & { timeoutMs?: number; waitForNetwork?: boolean },
): Promise<Response>;
export declare function getConnectionQuality(): ConnectionQuality;
export declare function shouldDeferHeavyTransfer(bytes?: number): boolean;
