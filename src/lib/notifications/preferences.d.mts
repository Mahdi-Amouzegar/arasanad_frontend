/** Type declarations for `preferences.mjs` (فاز ۱۲٫۳۱). */

export interface PreferenceChannelFlags {
  telegram?: boolean;
  browser?: boolean;
  inapp?: boolean;
}

export interface PreferenceState {
  channels?: PreferenceChannelFlags;
  events?: Record<string, PreferenceChannelFlags>;
}

export interface CatalogLike {
  type: string;
  channels?: PreferenceChannelFlags;
}

export declare function catalogEventTypeForRealtime(type: string): string;
export declare function eventChannelEnabled(
  settings: PreferenceState | null | undefined,
  type: string,
  channel: keyof PreferenceChannelFlags,
): boolean;
export declare function groupToggleState(
  items: CatalogLike[],
  channel: keyof PreferenceChannelFlags,
  settings: PreferenceState | null | undefined,
): 'all' | 'mixed' | 'none';
