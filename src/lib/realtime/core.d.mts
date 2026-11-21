/** Type declarations for the pure realtime core (`core.mjs`). */

export declare function wsUrl(apiBase: string, wsPath: string): string;
export declare function realtimeCursorKey(userId: string): string;

export interface RealtimeEventLike {
  id: string;
  type: string;
  seq: number;
  payload?: unknown;
  createdAt?: string;
}

export declare function isRealtimeEvent(value: unknown): value is RealtimeEventLike;
export declare function dedupeRealtimeEvents<T extends { id: string }>(events: readonly T[]): T[];
export declare function nextCursorFrom(
  events: readonly { seq: number }[],
  fallback?: number,
): number;
export declare function reconnectDelay(attempt: number, jitter?: number): number;
