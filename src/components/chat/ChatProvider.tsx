'use client';

/**
 * وضعیت سراسری گفتگو — «بخش مستقل قابل فعالسازی از هر جای برنامه».
 *
 * ⚠️ تنها نقطه‌ای که وضعیت چت را نگه می‌دارد. هیچ صفحه‌ای چت را دوباره
 *    پیاده‌سازی نمی‌کند؛ کافی است `useChat().openChat(...)` صدا زده شود.
 *
 * ⚠️ دو نمایش (`drawer` / `popover`) دقیقاً یک وضعیت مشترک دارند؛
 *    بنابراین جابه‌جایی میان دراور راست و پنجره‌ی شناور، گفتگو را نمیشکند.
 *
 * ⚠️ ترتیب پیام‌ها براساس `seq` سروری است (`mergeMessages`)؛ ساعت
 *    کلاینت فقط برای Polling استفاده می‌شود، نه ترتیب یا شناسه.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { createChatApi, type SendMessageBody } from '@/lib/chat/api';
import {
  createNonce,
  mergeMessages,
  pollDelayFor,
  type ChatConversation,
  type ChatMessage,
  type ChatPeer,
} from '@/lib/chat/core.mjs';
import type { SelectedFile, SelectedLink } from '@/components/files/FileManagerModal';
import { usePollLeader } from '@/lib/connectivity/poll-leader';

export type ChatVariant = 'drawer' | 'popover';
export type ChatView = 'list' | 'thread';

export interface OpenChatInput {
  peerUserId?: string;
  projectId?: string;
  /** عنوان بستر، فقط برای نمایش در سربرگ */
  projectLabel?: string;
}

interface ChatContextValue {
  open: boolean;
  variant: ChatVariant;
  view: ChatView;
  conversationId: string | null;
  activePeer: ChatPeer | null;
  projectId: string | null;
  projectLabel: string | null;
  conversations: ChatConversation[];
  messages: ChatMessage[];
  hasMoreConversations: boolean;
  hasMoreMessages: boolean;
  loadingConversations: boolean;
  loadingMessages: boolean;
  searching: boolean;
  searchResults: ChatPeer[];
  busy: boolean;
  error: string | null;
  unreadTotal: number;
  signedIn: boolean;

  openList: (variant?: ChatVariant) => void;
  openChat: (input: OpenChatInput, variant?: ChatVariant) => Promise<void>;
  close: () => void;
  backToList: () => void;
  setVariant: (variant: ChatVariant) => void;
  refreshConversations: () => Promise<void>;
  loadMoreConversations: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  searchUsers: (query: string) => Promise<void>;
  clearSearch: () => void;
  openWithUser: (user: ChatPeer) => Promise<void>;
  sendText: (text: string) => Promise<boolean>;
  sendAttachments: (files: SelectedFile[], links: SelectedLink[]) => Promise<boolean>;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message ?? '');
  }
  return 'ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید';
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user, token, authedRequest } = useAuth();
  const { showToast } = useAlert();
  const api = useMemo(() => createChatApi(authedRequest), [authedRequest]);
  const signedIn = Boolean(user && token);
  // فاز ۱۰ (O-99): فقط تب رهبر پایش پس‌زمینه می‌کند؛ بقیه از پخش تب می‌گیرند.
  const { isLeader, online, multiplier, publish, subscribe } = usePollLeader();

  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<ChatVariant>('drawer');
  const [view, setView] = useState<ChatView>('list');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activePeer, setActivePeer] = useState<ChatPeer | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectLabel, setProjectLabel] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ChatPeer[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);

  // refs برای Polling تا اثر وابسته به باز/بستهشدن پنجره دوباره ساخته نشود
  const openRef = useRef(open);
  const conversationRef = useRef(conversationId);
  openRef.current = open;
  conversationRef.current = conversationId;

  const requireSession = useCallback(() => {
    if (signedIn) return true;
    showToast({
      type: 'info',
      title: 'ورود لازم است',
      message: 'برای گفتگو نخست وارد حساب خود شوید.',
    });
    return false;
  }, [signedIn, showToast]);

  const refreshConversations = useCallback(async () => {
    if (!signedIn) return;
    setLoadingConversations(true);
    try {
      const page = await api.listConversations();
      setConversations(page.conversations);
      setHasMoreConversations(page.hasMore);
      setError(null);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoadingConversations(false);
    }
  }, [api, signedIn]);

  const refreshUnread = useCallback(async () => {
    if (!signedIn) return;
    try {
      setUnreadTotal(await api.unreadCount());
    } catch {
      /* شمارنده اختیاری است؛ شکست آن گفتگو را مختل نمی‌کند */
    }
  }, [api, signedIn]);

  const loadMessages = useCallback(
    async (id: string) => {
      setLoadingMessages(true);
      try {
        const page = await api.listMessages(id);
        setMessages(mergeMessages([], page.messages));
        setHasMoreMessages(page.hasMore);
        setError(null);
      } catch (err) {
        setError(messageOf(err));
      } finally {
        setLoadingMessages(false);
      }
    },
    [api],
  );

  const openList = useCallback(
    (nextVariant: ChatVariant = 'drawer') => {
      if (!requireSession()) return;
      setVariant(nextVariant);
      setView('list');
      setConversationId(null);
      setActivePeer(null);
      setOpen(true);
      setError(null);
      void refreshConversations();
    },
    [requireSession, refreshConversations],
  );

  const openChat = useCallback(
    async (input: OpenChatInput, nextVariant: ChatVariant = 'drawer') => {
      if (!requireSession()) return;
      setVariant(nextVariant);
      setOpen(true);
      setView('thread');
      setBusy(true);
      setError(null);
      setProjectLabel(input.projectLabel ?? null);
      try {
        let peerId = input.peerUserId?.trim() ?? '';
        const contextProjectId = input.projectId?.trim() ?? null;

        // بند ۳: مخاطب سفارش ازپیشتعیینشده است؛ سرور تصمیم می‌گیرد.
        if (!peerId && contextProjectId) {
          const result = await api.peerByProject(contextProjectId);
          peerId = result.peer.id;
        }
        if (!peerId) throw new Error('مخاطب گفتگو مشخص نشده است');

        const { conversation } = await api.openConversation(peerId, contextProjectId ?? undefined);
        setConversationId(conversation.id);
        setActivePeer(conversation.peer);
        setProjectId(conversation.projectId ?? contextProjectId);
        await loadMessages(conversation.id);
        // ورود به گفتگو = خواندهشدن پیام‌ها (نه بازکردن فهرست)
        void api.markRead(conversation.id).then(refreshUnread).catch(() => undefined);
        void refreshConversations();
      } catch (err) {
        setError(messageOf(err));
        showToast({ type: 'error', title: 'باز کردن گفتگو انجام نشد', message: messageOf(err) });
      } finally {
        setBusy(false);
      }
    },
    [api, loadMessages, refreshConversations, refreshUnread, requireSession, showToast],
  );

  const close = useCallback(() => setOpen(false), []);

  const backToList = useCallback(() => {
    setView('list');
    setConversationId(null);
    setActivePeer(null);
    setMessages([]);
    setError(null);
    void refreshConversations();
  }, [refreshConversations]);

  const loadMoreConversations = useCallback(async () => {
    if (!signedIn || loadingConversations || !hasMoreConversations) return;
    setLoadingConversations(true);
    try {
      const page = await api.listConversations(20, conversations.length);
      setConversations((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        return [...prev, ...page.conversations.filter((item) => !seen.has(item.id))];
      });
      setHasMoreConversations(page.hasMore);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoadingConversations(false);
    }
  }, [api, conversations.length, hasMoreConversations, loadingConversations, signedIn]);

  const loadMoreMessages = useCallback(async () => {
    const id = conversationId;
    if (!signedIn || !id || loadingMessages || !hasMoreMessages || messages.length === 0) return;
    setLoadingMessages(true);
    try {
      const before = Math.min(...messages.map((m) => Number(m.seq) || 0));
      const page = await api.listMessages(id, before);
      setMessages((prev) => mergeMessages(prev, page.messages));
      setHasMoreMessages(page.hasMore);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setLoadingMessages(false);
    }
  }, [api, conversationId, hasMoreMessages, loadingMessages, messages, signedIn]);

  const searchUsers = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (q.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        setSearchResults(await api.searchUsers(q));
      } catch (err) {
        setError(messageOf(err));
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    [api],
  );

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setSearching(false);
  }, []);

  const openWithUser = useCallback(
    async (peer: ChatPeer) => {
      clearSearch();
      await openChat({ peerUserId: peer.id }, variant);
    },
    [clearSearch, openChat, variant],
  );

  const pushMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => mergeMessages(prev, [message]));
    void refreshConversations();
  }, [refreshConversations]);

  const sendMessage = useCallback(
    async (body: SendMessageBody): Promise<boolean> => {
      const id = conversationId;
      if (!id || busy) return false;
      setBusy(true);
      setError(null);
      try {
        const result = await api.sendMessage(id, body);
        pushMessage(result.message);
        return true;
      } catch (err) {
        setError(messageOf(err));
        showToast({ type: 'error', title: 'ارسال انجام نشد', message: messageOf(err) });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [api, busy, conversationId, pushMessage, showToast],
  );

  const sendText = useCallback(
    (text: string) =>
      sendMessage({
        text,
        clientNonce: createNonce(),
        ...(projectId ? { projectId } : {}),
      }),
    [projectId, sendMessage],
  );

  const sendAttachments = useCallback(
    (files: SelectedFile[], links: SelectedLink[]) =>
      sendMessage({
        clientNonce: createNonce(),
        fileIds: files.map((file) => file.id),
        linkIds: links.map((link) => link.id),
        ...(projectId ? { projectId } : {}),
      }),
    [projectId, sendMessage],
  );

  const clearError = useCallback(() => setError(null), []);

  /* ── Polling هوشمند: توقف در تب مخفی، فوراً پس از بازگشت ── */
  useEffect(() => {
    if (!signedIn) return undefined;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let lastInteraction = Date.now();
    const noteInteraction = () => {
      lastInteraction = Date.now();
    };

    const schedule = () => {
      if (!alive) return;
      const hidden = typeof document !== 'undefined' && document.hidden;
      const { delay, stop } = pollDelayFor({
        hidden,
        idleMs: Date.now() - lastInteraction,
        failures,
      });
      // فاز ۱۰: تب پیرو و تب آفلاین هیچ تایمر شبک‌ای نمی‌سازند.
      if (stop || delay === null || !isLeader || !online) return;
      timer = setTimeout(() => void tick(), delay * multiplier);
    };

    const tick = async () => {
      if (!alive) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!isLeader || !online) return; // فقط تب رهبر پایش پس‌زمینه دارد
      const activeId = openRef.current ? conversationRef.current : null;
      try {
        const [count, page] = await Promise.all([
          api.unreadCount(),
          activeId ? api.listMessages(activeId) : Promise.resolve(null),
        ]);
        if (!alive) return;
        setUnreadTotal(count);
        publish('chat', { unreadTotal: count });
        if (page) {
          setMessages((prev) => mergeMessages(prev, page.messages));
          if (activeId) void api.markRead(activeId).then(refreshUnread).catch(() => undefined);
        }
        failures = 0;
      } catch {
        failures = Math.min(failures + 1, 6);
      } finally {
        schedule();
      }
    };

    const onVisibility = () => {
      if (timer) clearTimeout(timer);
      if (!document.hidden) void tick();
      else schedule();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('pointerdown', noteInteraction);
      window.addEventListener('keydown', noteInteraction);
    }
    void refreshUnread();
    if (isLeader && online) void tick();

    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('pointerdown', noteInteraction);
        window.removeEventListener('keydown', noteInteraction);
      }
    };
  }, [api, refreshUnread, signedIn, isLeader, online, multiplier, publish]);

  /** تب‌های پیرو شمارنده را بدون درخواست شبک‌ای از رهبر می‌گیرند. */
  useEffect(() => {
    if (!signedIn || isLeader) return undefined;
    return subscribe((message) => {
      if (message.channel !== 'chat') return;
      const count = Number((message.payload as { unreadTotal?: unknown } | null)?.unreadTotal ?? 0);
      if (Number.isFinite(count)) setUnreadTotal(Math.max(0, count));
    });
  }, [isLeader, signedIn, subscribe]);

  const value = useMemo<ChatContextValue>(
    () => ({
      open,
      variant,
      view,
      conversationId,
      activePeer,
      projectId,
      projectLabel,
      conversations,
      messages,
      hasMoreConversations,
      hasMoreMessages,
      loadingConversations,
      loadingMessages,
      searching,
      searchResults,
      busy,
      error,
      unreadTotal,
      signedIn,
      openList,
      openChat,
      close,
      backToList,
      setVariant,
      refreshConversations,
      loadMoreConversations,
      loadMoreMessages,
      searchUsers,
      clearSearch,
      openWithUser,
      sendText,
      sendAttachments,
      clearError,
    }),
    [
      open, variant, view, conversationId, activePeer, projectId, projectLabel,
      conversations, messages, hasMoreConversations, hasMoreMessages,
      loadingConversations, loadingMessages, searching, searchResults, busy,
      error, unreadTotal, signedIn, openList, openChat, close, backToList,
      refreshConversations, loadMoreConversations, loadMoreMessages,
      searchUsers, clearSearch, openWithUser, sendText, sendAttachments, clearError,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat باید درون ChatProvider استفاده شود');
  return context;
}
