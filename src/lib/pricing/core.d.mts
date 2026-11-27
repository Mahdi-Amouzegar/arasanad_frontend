/** Type declarations for the pure pricing schedule core (`core.mjs`). */

export interface GregorianParts {
  gy: number;
  gm: number;
  gd: number;
}

export interface JalaliLocalInput {
  jy: number;
  jm: number;
  jd: number;
  hour: number;
  minute: number;
}

export interface HistoryNeighbors {
  prevIndex: number | null;
  nextIndex: number | null;
  hasPrev: boolean;
  hasNext: boolean;
}

export type PricingVersionStatus = 'active' | 'historical' | 'scheduled';

export declare function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number,
): GregorianParts | null;

export declare function tehranOffsetMinutes(instant: Date | number): number;
export declare function jalaliToUtcIso(input: JalaliLocalInput): string | null;
export declare function isPastIso(iso: string, nowMs?: number): boolean;
export declare function historyNeighbors(length: number, index: number): HistoryNeighbors;
export declare const VERSION_STATUS_LABELS: Readonly<Record<PricingVersionStatus, string>>;
export declare function versionStatus(
  version: { status?: string; effectiveFrom?: string; effectiveTo?: string | null } | null,
  nowMs?: number,
): PricingVersionStatus;
