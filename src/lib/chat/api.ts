/** کلاینت تایپشده‌ی گفتگوی فاز ۹ — تمام درخواست‌ها با توکن نشست انجام می‌شوند. */

import type { AuthedRequest } from '@/lib/files/api';
import type { ChatConversation, ChatMessage, ChatPeer } from './core.mjs';

export type ChatApiRequest = AuthedRequest;

export interface SendMessageBody {
  text?: string;
  clientNonce: string;
  fileIds?: string[];
  linkIds?: string[];
  projectId?: string;
}

export interface ConversationPage {
  conversations: ChatConversation[];
  hasMore: boolean;
  offset: number;
  limit: number;
}

export interface MessagePage {
  messages: ChatMessage[];
  hasMore: boolean;
}

/** فاز ۱۲٫۱۱ — خروجی آماده‌سازی فوروارد برای سفارش تازه. */
export interface ForwardPrepareResult {
  text: string;
  files: Array<{
    id: string;
    originalName: string;
    fileCode: string;
    mimeType: string;
    extension: string;
    sizeBytes: number;
  }>;
  links: Array<{ id: string; url: string; description: string | null }>;
  count: number;
}

export interface ForwardResult {
  mode: 'contact' | 'activity';
  conversationId?: string;
  projectId?: string;
  forwarded: number;
  messageIds?: string[];
  activityIds?: string[];
}

export function createChatApi(request: ChatApiRequest) {
  return {
    async searchUsers(q: string): Promise<ChatPeer[]> {
      const data = await request<{ users: ChatPeer[] }>(
        `/users/search?q=${encodeURIComponent(q)}`,
      );
      return Array.isArray(data.users) ? data.users : [];
    },

    async listConversations(limit = 20, offset = 0): Promise<ConversationPage> {
      const data = await request<ConversationPage>(
        `/conversations?limit=${limit}&offset=${offset}`,
      );
      return {
        conversations: Array.isArray(data.conversations) ? data.conversations : [],
        hasMore: Boolean(data.hasMore),
        offset: Number(data.offset ?? offset),
        limit: Number(data.limit ?? limit),
      };
    },

    /** مخاطب ازپیشتعیین‌شده‌ی یک سفارش — سرور تصمیم می‌گیرد، نه کلاینت. */
    async peerByProject(projectId: string): Promise<{ peer: ChatPeer; projectId: string }> {
      return request<{ peer: ChatPeer; projectId: string }>(
        `/conversations/peer-by-project?projectId=${encodeURIComponent(projectId)}`,
      );
    },

    async openConversation(
      peerUserId: string,
      projectId?: string,
    ): Promise<{ conversation: ChatConversation }> {
      return request<{ conversation: ChatConversation }>('/conversations', {
        method: 'POST',
        body: { peerUserId, ...(projectId ? { projectId } : {}) },
      });
    },

    async listMessages(
      conversationId: string,
      before?: number,
      limit = 30,
    ): Promise<MessagePage> {
      const params = new URLSearchParams({ limit: String(limit) });
      if (before && before > 0) params.set('before', String(before));
      const data = await request<MessagePage>(
        `/conversations/${encodeURIComponent(conversationId)}/messages?${params}`,
      );
      return {
        messages: Array.isArray(data.messages) ? data.messages : [],
        hasMore: Boolean(data.hasMore),
      };
    },

    async sendMessage(
      conversationId: string,
      body: SendMessageBody,
    ): Promise<{ message: ChatMessage; duplicate: boolean }> {
      return request<{ message: ChatMessage; duplicate: boolean }>(
        `/conversations/${encodeURIComponent(conversationId)}/messages`,
        { method: 'POST', body },
      );
    },

    async markRead(conversationId: string): Promise<void> {
      await request<{ conversationId: string; lastReadSeq: number }>(
        `/conversations/${encodeURIComponent(conversationId)}/read`,
        { method: 'POST', body: {} },
      );
    },

    async unreadCount(): Promise<number> {
      const data = await request<{ count: number }>('/conversations/unread-count');
      return Number(data.count ?? 0);
    },

    /** فاز ۱۲٫۱۱: مجوز فایل‌ها و متن پیش‌نویس سفارش تازه. */
    async prepareForward(
      conversationId: string,
      messageIds: string[],
    ): Promise<ForwardPrepareResult> {
      return request<ForwardPrepareResult>('/forward/prepare', {
        method: 'POST',
        body: { conversationId, messageIds },
      });
    },

    async forwardToContact(
      conversationId: string,
      messageIds: string[],
      targetUserId: string,
      clientNonce: string,
    ): Promise<ForwardResult> {
      return request<ForwardResult>('/forward', {
        method: 'POST',
        body: { mode: 'contact', conversationId, messageIds, targetUserId, clientNonce },
      });
    },

    async forwardToActivity(
      conversationId: string,
      messageIds: string[],
      projectId: string,
      clientNonce: string,
    ): Promise<ForwardResult> {
      return request<ForwardResult>('/forward', {
        method: 'POST',
        body: { mode: 'activity', conversationId, messageIds, projectId, clientNonce },
      });
    },
  };
}

export type ChatApi = ReturnType<typeof createChatApi>;
