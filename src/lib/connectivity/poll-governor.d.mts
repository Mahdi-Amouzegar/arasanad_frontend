export declare const LEASE_TTL_MS: number;
export declare const LEASE_RENEW_MS: number;
export declare const LEASE_RETRY_MS: number;
export declare const MAX_BACKOFF_MS: number;
export declare const LOW_DATA_MULTIPLIER: number;
export declare const SLOW_LINK_MULTIPLIER: number;
export declare const BASE_ACTIVITY_POLL_MS: number;

export interface PollLease {
  tabId: string;
  expiresAt: number;
}

export declare function connectionMultiplier(input?: {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
}): number;

export declare function makeLease(input?: {
  tabId?: string;
  now?: number;
  ttlMs?: number;
}): PollLease;

export declare function parseLease(raw: string | null | undefined): PollLease | null;

export declare function leaseIsValid(input?: {
  lease?: PollLease | null;
  tabId?: string;
  now?: number;
}): boolean;

export declare function canClaimLease(input?: {
  lease?: PollLease | null;
  tabId?: string;
  now?: number;
}): boolean;

export interface GovernorDecision {
  stop: boolean;
  delayMs: number | null;
  reason: string;
}

export declare function governorDecision(input?: {
  hidden?: boolean;
  online?: boolean;
  isLeader?: boolean;
  failures?: number;
  baseDelayMs?: number;
  multiplier?: number;
  now?: number;
  lastPollAt?: number;
}): GovernorDecision;
