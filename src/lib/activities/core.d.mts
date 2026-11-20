/** Type declarations for the pure phase 9.5 activity core (`core.mjs`). */

export declare const ACTIVITY_POLL_MS: number;
export declare const ACTIVITY_POLL_CACHE_MS: number;
export declare const ACTIVITY_MAX_BACKOFF_MS: number;
export declare const ACTIVITY_PAGE_SIZE: number;
export declare const ACTIVITY_MAX_TEXT: number;
export declare const ACTIVITY_MAX_ATTACHMENTS: number;
export declare const ACTIVITY_ENTITY_TYPE: string;
export declare const ACTIVITY_FILE_ROLE: string;

export interface ActorMeta {
  label: string;
  icon: string;
  automatic: boolean;
}
export declare const ACTOR_META: Record<string, ActorMeta>;

export interface EventMeta {
  label: string;
  icon: string;
}
export declare function actorMeta(kind: string): ActorMeta;
export declare function eventMeta(eventType: string): EventMeta;
export declare function isAutomaticActivity(item: unknown): boolean;

export interface ActivityLike {
  id: string;
  seq: number;
  createdAt: string;
}
export declare function newestFirst<T extends ActivityLike>(items: T[]): T[];
export declare function mergeActivities<T extends ActivityLike>(existing: T[], incoming: T[]): T[];

export interface PollDelay {
  delay: number | null;
  stop: boolean;
}
export declare function activityPollDelayFor(input?: {
  hidden?: boolean;
  failures?: number;
  lastPollAt?: number;
  now?: number;
}): PollDelay;
export declare function shouldUseActivityCache(input?: {
  lastPollAt?: number;
  now?: number;
  force?: boolean;
}): boolean;

export interface TextValidation {
  ok: boolean;
  value: string;
  reason: string | null;
}
export declare function validateActivityText(text: unknown): TextValidation;
export declare function operationsHref(role: 'admin' | 'customer', projectId: string, activityId?: string | null): string;
export declare function safeActivityHref(href: unknown): string;

export interface AttachmentCounts {
  fileIds: string[];
  linkIds: string[];
  fileCount: number;
  linkCount: number;
}
export declare function attachmentCountsOf(item: unknown): AttachmentCounts;

export interface UnseenGroupLike {
  projectId: string;
  unseenCount: number;
  latestAt: string | null;
  items: ActivityLike[];
}
export declare function visibleUnseenGroups<T extends UnseenGroupLike>(groups: T[]): T[];
