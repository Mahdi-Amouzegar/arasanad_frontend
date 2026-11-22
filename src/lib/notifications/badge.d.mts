/** Type declarations for the pure notification badge reducer (`badge.mjs`). */

export interface BadgeState {
  count: number;
  applied: Set<string>;
  unreadIds: Set<string>;
  pendingReads: Set<string>;
  optimisticRevision: number;
  lastDataVersion: number;
}

export interface BadgeEvent {
  id?: string;
  type: string;
  payload?: Record<string, unknown>;
}

export declare function createBadgeState(count?: number): BadgeState;
export declare function dataVersionOf(event: unknown): number;
export declare function badgeEffectKey(event: unknown): string | null;
export declare function applyBadgeEvent(
  state: BadgeState,
  event: BadgeEvent,
): { state: BadgeState; changed: boolean };
export declare function applyOptimisticRead(
  state: BadgeState,
  id: string,
  nonce: string,
): { state: BadgeState; changed: boolean };
export declare function applyOptimisticReadAll(
  state: BadgeState,
  nonce: string,
): { state: BadgeState; changed: boolean };
export declare function applyReconciliation(
  state: BadgeState,
  result: { count: unknown; dataVersion: unknown; revisionAtRequest: number },
): { state: BadgeState; accepted: boolean };
