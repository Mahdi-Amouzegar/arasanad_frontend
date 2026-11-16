/** Type declarations for the pure chat core (`core.mjs`). */

export declare const MAX_MESSAGE_LENGTH: number;
export declare const MAX_ATTACHMENTS: number;
export declare const PAGE_SIZE: number;
export declare const SEARCH_MIN_LENGTH: number;
export declare const POLL_ACTIVE_MS: number;
export declare const POLL_IDLE_MS: number;
export declare const POLL_IDLE_AFTER_MS: number;
export declare const POLL_MAX_BACKOFF_MS: number;
export declare const POLL_CACHE_MS: number;

export interface ChatPeer {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'admin' | 'customer';
}

export interface ChatFile {
  id: string;
  originalName: string;
  fileCode: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  status: string;
  downloadCount: number;
  createdAt: string;
  uploadedAt: string | null;
}

export interface ChatLink {
  id: string;
  url: string;
  description: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderName: string;
  kind: 'text' | 'file' | 'link' | 'system';
  body: string | null;
  seq: number;
  createdAt: string;
  metadata: Record<string, unknown>;
  files: ChatFile[];
  links: ChatLink[];
}

export interface ChatConversation {
  id: string;
  projectId: string | null;
  createdAt: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  unreadCount: number;
  lastReadSeq: number;
  peer: ChatPeer;
}

export declare function createNonce(): string;
export declare function isValidNonce(value: unknown): value is string;
export declare function isOwn(message: ChatMessage | null, currentUserId: string | null): boolean;
export declare function sortBySeq(messages: ChatMessage[]): ChatMessage[];
export declare function mergeMessages(existing: ChatMessage[], incoming: ChatMessage[]): ChatMessage[];
export declare function peerName(peer: ChatPeer | null | undefined): string;
export declare function initialsOf(name: string): string;
export declare function toFaDigits(value: string | number): string;
export declare function formatBadge(count: number): string;
export declare function truncate(value: string, max?: number): string;
export declare function validateDraft(text: string): { ok: boolean; value: string; reason?: string };
export declare function pollDelayFor(input?: {
  hidden?: boolean;
  idleMs?: number;
  failures?: number;
}): { delay: number | null; stop: boolean };
export declare function isSystemMessage(message: ChatMessage | null): boolean;
export declare function messagePreview(message: ChatMessage | null): string;
