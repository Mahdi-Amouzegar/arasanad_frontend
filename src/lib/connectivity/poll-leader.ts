'use client';

/**
 * Phase 10 (O-99 / D-357) — one polling leader for the whole browser.
 *
 * All periodic pollers (activity bell, chat, notifications) share this
 * singleton. Only the leader tab performs conditional network requests;
 * its results are mirrored to the other tabs over BroadcastChannel, so
 * N open tabs still cost one request per interval. Hidden / offline tabs
 * release the lease immediately. No new library and no extra network call.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  canClaimLease,
  connectionMultiplier,
  leaseIsValid,
  makeLease,
  parseLease,
  LEASE_RENEW_MS,
  LEASE_RETRY_MS,
} from './poll-governor.mjs';

const LEASE_KEY = 'arasanad_poll_leader';
const CHANNEL_NAME = 'arasanad_poll_state';

export interface LeaderState {
  isLeader: boolean;
  online: boolean;
  multiplier: number;
}

export interface LeaderMessage {
  channel: string;
  payload: unknown;
}

type StateListener = (state: LeaderState) => void;
type MessageListener = (message: LeaderMessage) => void;

interface WireMessage {
  kind: 'state' | 'stepdown';
  channel?: string;
  payload?: unknown;
  tabId: string;
}

function randomTabId(): string {
  try {
    return globalThis.crypto?.randomUUID?.() ?? `tab-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `tab-${Math.random().toString(36).slice(2)}`;
  }
}

function readConnection(): { online: boolean; multiplier: number } {
  if (typeof navigator === 'undefined') return { online: true, multiplier: 1 };
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string; downlink?: number };
  }).connection;
  return {
    online: navigator.onLine !== false,
    multiplier: connectionMultiplier({
      saveData: connection?.saveData,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
    }),
  };
}

class PollLeaderHub {
  readonly tabId = randomTabId();
  private state: LeaderState;
  private stateListeners = new Set<StateListener>();
  private messageListeners = new Set<MessageListener>();
  private channel: BroadcastChannel | null = null;
  private started = false;
  private renewTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const connection = readConnection();
    this.state = { isLeader: false, online: connection.online, multiplier: connection.multiplier };
  }

  snapshot = (): LeaderState => this.state;

  private setState(patch: Partial<LeaderState>): void {
    const next = { ...this.state, ...patch };
    if (
      next.isLeader === this.state.isLeader &&
      next.online === this.state.online &&
      next.multiplier === this.state.multiplier
    ) return;
    this.state = next;
    for (const listener of [...this.stateListeners]) listener(next);
  }

  private readLease() {
    try {
      return parseLease(window.localStorage.getItem(LEASE_KEY));
    } catch {
      return null;
    }
  }

  private writeLease(): void {
    try {
      window.localStorage.setItem(LEASE_KEY, JSON.stringify(makeLease({ tabId: this.tabId })));
    } catch {
      /* private mode: fall back to BroadcastChannel-only coordination */
    }
  }

  private releaseLease(): void {
    const lease = this.readLease();
    if (!lease || lease.tabId !== this.tabId) return;
    try {
      window.localStorage.removeItem(LEASE_KEY);
    } catch {
      /* ignore */
    }
    this.post({ kind: 'stepdown' });
  }

  private post(message: Omit<WireMessage, 'tabId'>): void {
    try {
      this.channel?.postMessage({ ...message, tabId: this.tabId } satisfies WireMessage);
    } catch {
      /* a broken channel must never break polling */
    }
  }

  /** Visible + online + lease-free tabs may become the single polling leader. */
  private claim(): void {
    if (typeof window === 'undefined') return;
    if (document.hidden || navigator.onLine === false) {
      if (this.state.isLeader) {
        this.releaseLease();
        this.setState({ isLeader: false });
      }
      return;
    }
    const lease = this.readLease();
    if (!canClaimLease({ lease, tabId: this.tabId })) {
      if (this.state.isLeader) this.setState({ isLeader: false });
      return;
    }
    this.writeLease();
    if (!this.state.isLeader) this.setState({ isLeader: true });
  }

  private onVisibility = (): void => {
    if (document.hidden) {
      if (this.state.isLeader) this.releaseLease();
      this.setState({ isLeader: false });
    } else {
      this.claim();
    }
  };

  private onConnectivity = (): void => {
    const connection = readConnection();
    this.setState({ online: connection.online, multiplier: connection.multiplier });
    if (!connection.online) {
      if (this.state.isLeader) this.releaseLease();
      this.setState({ isLeader: false });
    } else {
      this.claim();
    }
  };

  private onStorage = (event: StorageEvent): void => {
    if (event.key !== LEASE_KEY) return;
    if (!leaseIsValid({ lease: parseLease(event.newValue), tabId: this.tabId })) {
      if (this.state.isLeader) this.setState({ isLeader: false });
      this.claim();
    }
  };

  private onMessage = (event: MessageEvent<WireMessage>): void => {
    const data = event.data;
    if (!data || data.tabId === this.tabId) return;
    if (data.kind === 'stepdown') {
      this.claim();
      return;
    }
    if (data.kind === 'state' && typeof data.channel === 'string') {
      const message: LeaderMessage = { channel: data.channel, payload: data.payload };
      for (const listener of [...this.messageListeners]) listener(message);
    }
  };

  private onPageHide = (): void => {
    if (this.state.isLeader) this.releaseLease();
  };

  private start(): void {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;
    if ('BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.addEventListener('message', this.onMessage);
      } catch {
        this.channel = null;
      }
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('online', this.onConnectivity);
    window.addEventListener('offline', this.onConnectivity);
    window.addEventListener('storage', this.onStorage);
    window.addEventListener('pagehide', this.onPageHide);
    const connection = (
      navigator as Navigator & { connection?: { addEventListener?: (t: string, f: () => void) => void } }
    ).connection;
    connection?.addEventListener?.('change', this.onConnectivity);
    this.renewTimer = setInterval(() => {
      if (this.state.isLeader) this.writeLease();
      else this.claim();
    }, LEASE_RENEW_MS);
    this.retryTimer = setInterval(() => {
      if (!this.state.isLeader) this.claim();
    }, LEASE_RETRY_MS);
    this.claim();
  }

  subscribeState(listener: StateListener): () => void {
    this.start();
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  subscribeMessage(listener: MessageListener): () => void {
    this.start();
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  publish(channel: string, payload: unknown): void {
    this.post({ kind: 'state', channel, payload });
  }
}

let hub: PollLeaderHub | null = null;
function getHub(): PollLeaderHub {
  if (!hub) hub = new PollLeaderHub();
  return hub;
}

const SSR_STATE: LeaderState = { isLeader: false, online: true, multiplier: 1 };

export interface PollLeaderApi extends LeaderState {
  /** شناسهٔ پایدار همین تب — مبنای تعیین `readOwner` در گفتگوهای مشترک. */
  tabId: string;
  publish: (channel: string, payload: unknown) => void;
  subscribe: (listener: MessageListener) => () => void;
}

export function usePollLeader(): PollLeaderApi {
  const instance = typeof window === 'undefined' ? null : getHub();
  const [state, setState] = useState<LeaderState>(instance?.snapshot() ?? SSR_STATE);

  useEffect(() => {
    if (!instance) return undefined;
    return instance.subscribeState(setState);
  }, [instance]);

  const publish = useCallback(
    (channel: string, payload: unknown) => instance?.publish(channel, payload),
    [instance],
  );
  const subscribe = useCallback(
    (listener: MessageListener) => instance?.subscribeMessage(listener) ?? (() => undefined),
    [instance],
  );

  return { ...state, tabId: instance?.tabId ?? 'server', publish, subscribe };
}
