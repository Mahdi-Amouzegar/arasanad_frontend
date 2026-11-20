'use client';

/**
 * فاز ۱۲٫۱۱ — پنجره‌ی مقصد فوروارد.
 *
 * سه حالت بدون صفحه‌ی میانی: مخاطب تازه، عملیات سفارش، سفارش تازه.
 * ⚠️ تمام اعتبارسنجیها و مجوزها سروراً تکرار می‌شوند؛ این پنجره فقط
 *    ورودی کاربر را جمع‌آوری و نتیجه را به همان صفحه/product هدایت می‌کند.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Icon } from '@/components/ui/Icon';
import { createChatApi } from '@/lib/chat/api';
import { createNonce, peerName, type ChatPeer, type ChatMessage } from '@/lib/chat/core.mjs';
import { selectionSummary, uniqueById } from '@/lib/chat/forward-core.mjs';
import { saveForwardDraft } from '@/lib/chat/forward-draft';
import { createProjectsApi, type Project } from '@/lib/projects/api';
import { statusText } from '@/components/projects/ui-utils';
import { cx } from '@/lib/cx';
import { useChat } from './ChatProvider';

type Mode = 'contact' | 'activity' | 'order';

/**
 * فاز ۱۲٫۱۲-ب: فقط سفارش لغوشده حذف می‌شود. سفارشی که سفارش‌دهنده ثبت اولیه کرده
 * ولی مدیر هنوز تأیید نکرده (`pending_review`) یا درخواست لغوی آن ثبت شده
 * (`cancel_requested`) تا زمان لغوی نهایی قابل انتخاب است.
 */
const INACTIVE_STATUSES = new Set(['cancelled']);

function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message ?? '');
  }
  return 'انجام نشد؛ دوباره تلاش کنید';
}

export function ForwardDialog() {
  const router = useRouter();
  const { user, authedRequest } = useAuth();
  const { showToast } = useAlert();
  const {
    open,
    variant,
    messages,
    selectedMessageIds,
    conversationId,
    activePeer,
    closeForwardDialog,
    finishForward,
    close,
    openChat,
  } = useChat();

  const chatApi = useMemo(() => createChatApi(authedRequest), [authedRequest]);
  const projectsApi = useMemo(() => createProjectsApi(authedRequest), [authedRequest]);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [mode, setMode] = useState<Mode>('contact');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ChatPeer[]>([]);
  const [searching, setSearching] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => messages.filter((item: ChatMessage) => selectedMessageIds.includes(item.id)),
    [messages, selectedMessageIds],
  );
  const summary = useMemo(
    () => selectionSummary(messages, selectedMessageIds),
    [messages, selectedMessageIds],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      closeForwardDialog();
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [closeForwardDialog, open]);

  useEffect(() => {
    if (!open || mode !== 'activity') return;
    let alive = true;
    setProjectsLoading(true);
    void projectsApi.listProjects({ limit: 100 })
      .then((rows) => {
        if (!alive) return;
        setProjects(rows.filter((row) => !INACTIVE_STATUSES.has(row.status)
          && (row.status !== 'draft' || row.submittedAt)
          && (user?.role === 'admin' || row.customerId === user?.id)));
      })
      .catch((caught) => {
        if (alive) setError(messageOf(caught));
      })
      .finally(() => {
        if (alive) setProjectsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [mode, open, projectsApi, user?.id, user?.role]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2 || !open || mode !== 'contact') {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    let alive = true;
    setSearching(true);
    const timer = setTimeout(() => {
      void chatApi.searchUsers(term)
        .then((rows) => {
          if (!alive) return;
          setResults(rows.filter((row) => row.id !== activePeer?.id && row.id !== user?.id
            && (user?.role === 'admin' || row.role === 'admin')));
        })
        .catch((caught) => {
          if (alive) setError(messageOf(caught));
        })
        .finally(() => {
          if (alive) setSearching(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [activePeer?.id, chatApi, mode, open, query, user?.id, user?.role]);

  if (!open || !conversationId) return null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy(false);
    }
  }

  async function toContact(peer: ChatPeer) {
    await run(async () => {
      await chatApi.forwardToContact(
        conversationId as string,
        selectedMessageIds,
        peer.id,
        createNonce(),
      );
      const name = peerName(peer);
      finishForward();
      showToast({
        type: 'success',
        title: 'فوروارد شد',
        message: `پیام‌ها به گفتگوی ${name} منتقل شدند.`,
      });
      await openChat({ peerUserId: peer.id }, variant);
    });
  }

  async function toActivity(project: Project) {
    await run(async () => {
      const result = await chatApi.forwardToActivity(
        conversationId as string,
        selectedMessageIds,
        project.id,
        createNonce(),
      );
      finishForward();
      close();
      showToast({
        type: 'success',
        title: 'فوروارد شد',
        message: `${result.forwarded} کارت عملیات در سفارش ${project.code} ثبت شد.`,
      });
      const base = user?.role === 'admin' ? '/admin' : '/panel';
      router.push(`${base}/projects/operations?id=${encodeURIComponent(project.id)}`);
    });
  }

  async function toNewOrder() {
    await run(async () => {
      const prepared = await chatApi.prepareForward(conversationId as string, selectedMessageIds);
      saveForwardDraft({
        text: prepared.text,
        files: uniqueById(prepared.files.map((file) => ({
          id: file.id,
          originalName: file.originalName,
          fileCode: file.fileCode,
          sizeBytes: file.sizeBytes,
          mimeType: file.mimeType,
          extension: file.extension,
        }))),
        links: uniqueById(prepared.links),
        createdAt: Date.now(),
      });
      finishForward();
      close();
      showToast({
        type: 'success',
        title: 'پیش‌نویس آماده شد',
        message: 'متن و پیوست‌ها در فرم سفارش تازه قرار گرفتند.',
      });
      router.push('/panel/projects/new');
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className="chat-forward-dialog"
      aria-label="فوروارد پیام‌ها"
      onCancel={(event) => {
        event.preventDefault();
        closeForwardDialog();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) closeForwardDialog();
      }}
    >
      <div className="chat-forward-dialog__inner" dir="rtl">
        <header className="chat-forward-dialog__header">
          <span className="chat-forward-dialog__mark"><Icon name="forward" size={18} /></span>
          <div className="chat-forward-dialog__heading">
            <strong>فوروارد پیام‌ها</strong>
            <span>
              {selectionSummary(messages, selectedMessageIds).messages} پیام
              {' · '}
              {selectionSummary(messages, selectedMessageIds).files} فایل
            </span>
          </div>
          <button type="button" className="chat-icon-btn" aria-label="بستن" onClick={closeForwardDialog}>
            <Icon name="x" size={18} />
          </button>
        </header>

        <div className="chat-forward-dialog__body">
          <div className="chat-forward-modes" role="tablist" aria-label="شیوه فوروارد">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'contact'}
              className={cx('chat-forward-mode', mode === 'contact' && 'chat-forward-mode--on')}
              onClick={() => setMode('contact')}
            >
              <Icon name="chat" size={16} />
              مخاطب دیگر
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'activity'}
              className={cx('chat-forward-mode', mode === 'activity' && 'chat-forward-mode--on')}
              onClick={() => setMode('activity')}
            >
              <Icon name="activity" size={16} />
              عملیات سفارش
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'order'}
              className={cx('chat-forward-mode', mode === 'order' && 'chat-forward-mode--on')}
              onClick={() => setMode('order')}
            >
              <Icon name="plus" size={16} />
              سفارش تازه
            </button>
          </div>

          {mode === 'contact' ? (
            <div className="chat-forward-panel">
              <label className="chat-forward-label" htmlFor="forward-contact-search">جستجوی مخاطب</label>
              <div className="chat-forward-search">
                <Icon name="search" size={16} />
                <input
                  id="forward-contact-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="نام یا نام کاربری مخاطب"
                  autoComplete="off"
                />
              </div>
              <p className="chat-forward-hint">
                پیام‌ها همراه نام فرستنده‌ی اصلی به گفتگوی مخاطب تازه منتقل می‌شوند.
              </p>
              <div className="chat-forward-list">
                {searching ? <p className="chat-forward-hint">در حال جستجو…</p> : null}
                {results.map((peer) => (
                  <button
                    key={peer.id}
                    type="button"
                    className="chat-forward-row"
                    disabled={busy}
                    onClick={() => void toContact(peer)}
                  >
                    <span className="chat-avatar chat-avatar--sm" aria-hidden="true">
                      {peer.firstName?.[0] || peer.username?.[0] || '؟'}
                    </span>
                    <span className="chat-forward-row__name">{peerName(peer)}</span>
                    <Icon name="chevronLeft" size={15} />
                  </button>
                ))}
                {!searching && query.trim().length >= 2 && results.length === 0 ? (
                  <p className="chat-forward-hint">مخاطبی یافت نشد.</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {mode === 'activity' ? (
            <div className="chat-forward-panel">
              <p className="chat-forward-hint">
                هر پیام متنی یک کارت عملیات و هر فایل یک کارت با پیوست می‌شود؛ سپس به همان صفحه منتقل می‌شوید.
              </p>
              <div className="chat-forward-list">
                {projectsLoading ? <p className="chat-forward-hint">در حال بارگذاری سفارش‌ها…</p> : null}
                {!projectsLoading && projects.length === 0 ? (
                  <p className="chat-forward-hint">سفارش فعالی برای فوروارد وجود ندارد.</p>
                ) : null}
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    className="chat-forward-row"
                    disabled={busy}
                    onClick={() => void toActivity(project)}
                  >
                    <span className="chat-forward-row__name">{project.name}</span>
                    <span className="chat-forward-row__meta">{statusText(project.status)}</span>
                    <Icon name="chevronLeft" size={15} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {mode === 'order' ? (
            <div className="chat-forward-panel">
              <p className="chat-forward-hint">
                تمام متن‌های انتخاب‌شده در توضیحات سفارش و تمام فایل‌ها در پیوست‌ها قرار می‌گیرند.
                مجوز فایل‌های مخاطب پیش ازآن اعطا می‌شود؛ سفارش تنها پس از تأیید نهایی شما ثبت می‌شود.
              </p>
              <ul className="chat-forward-summary">
                <li>{selectionSummary(messages, selectedMessageIds).messages} پیام متنی</li>
                <li>{selectionSummary(messages, selectedMessageIds).files} فایل پیوست</li>
              </ul>
              <button type="button" className="chat-forward-btn chat-forward-btn--wide" disabled={busy} onClick={() => void toNewOrder()}>
                <Icon name="plus" size={16} />
                باز کردن فرم سفارش تازه
              </button>
            </div>
          ) : null}

          {error ? <div className="chat-error" role="alert">{error}</div> : null}
          {busy ? <p className="chat-hint chat-hint--center">در حال فوروارد…</p> : null}
        </div>

        <footer className="chat-forward-dialog__footer">
          <span>
            {selected.length} پیام انتخاب‌شده · {summary.files} فایل
          </span>
          <button type="button" className="chat-link-btn" onClick={closeForwardDialog}>لغو</button>
        </footer>
      </div>
    </dialog>
  );
}
