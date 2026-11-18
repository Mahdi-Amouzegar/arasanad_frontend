export interface RelativeTimeOptions {
  now?: Date | number;
  windowDays?: number;
  formatExact?: (value: Date) => string;
}

export interface RelativeTimeConfig {
  windowDays?: number;
}

export declare const DEFAULT_RELATIVE_WINDOW_DAYS: number;

export declare function configureRelativeTime(options?: RelativeTimeConfig): number;
export declare function resetRelativeTimeConfig(): number;
export declare function relativeTimeWindowDays(): number;
export declare function formatRelativeTime(
  input: string | number | Date,
  options?: RelativeTimeOptions,
): string;
