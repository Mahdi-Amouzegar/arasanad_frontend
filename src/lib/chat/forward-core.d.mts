/** Type declarations for the pure forward core (`forward-core.mjs`). */

export declare const FORWARD_DRAFT_MAX_AGE_MS: number;
export declare const ORDER_DESCRIPTION_MAX: number;
export declare const MAX_FORWARD_SELECTION: number;

export interface ForwardSelectionMessage {
  id: string;
  kind: string;
  body?: string | null;
  senderName?: string;
  files?: Array<{ id: string }>;
  links?: Array<{ id: string; url: string }>;
}

export declare function rangeIds(
  messages: ForwardSelectionMessage[],
  anchorId: string,
  targetId: string,
): string[];
export declare function toggleSelection(selected: string[], id: string): string[];
export declare function selectionSummary(
  messages: ForwardSelectionMessage[],
  ids: string[],
): { messages: number; files: number; links: number };
export declare function buildOrderDescription(
  messages: ForwardSelectionMessage[],
  ids: string[],
  max?: number,
): string;
export declare function uniqueById<T extends { id: string }>(items: T[]): T[];
