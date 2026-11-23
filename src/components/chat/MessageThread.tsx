'use client';

/**
 * صفحه‌ی پیام‌ها در همان ستون دراور (بند ۲٫۱).
 *
 * - پیام‌های ما راست، پیام‌های مخاطب چپ، به ترتیب زمانی بالا به پایین
 * - هر فایل، دکمهای با عنوان نام فایل است ← همان `FileDownloadModal` فاز ۸
 * - پیام سیستمی متمایز است و قابل ویرایش/حذف نیست
 * - فاز ۱۲٫۱۱: انتخاب تک‌کلیکی و درگ روی پیام‌ها (مانند تلگرام) و فوروارد
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatDateFull } from '@/lib/datetime';
import { FileActions } from '@/components/files/FileActions';
import { FileDownloadModal } from '@/components/files/FileDownloadModal';
import type { FileItem } from '@/lib/files/api';
import { useAuth } from '@/lib/account';
import { cx } from '@/lib/cx';
import {
  isOwn,
  isSystemMessage,
  peerName,
  toFaDigits,
  type ChatFile,
  type ChatMessage,
} from '@/lib/chat/core.mjs';
import { rangeIds } from '@/lib/chat/forward-core.mjs';
import { useChat } from './ChatProvider';
import { PeerAvatar } from './PeerAvatar';

function toFileItem(file: ChatFile): FileItem {
  return {
    id: file.id,
    uploaderId: '',
    originalName: file.originalName,
    fileCode: file.fileCode,
    mimeType: file.mimeType,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    status: (file.status as FileItem['status']) || 'uploaded',
    description: null,
    downloadCount: file.downloadCount,
    createdAt: file.createdAt,
    uploadedAt: file.uploadedAt,
  };
}

function forwardedFrom(message: ChatMessage): string | null {
  const value = message.metadata?.forwardedFrom;
  if (typeof value === 'string' && value.trim()) return value.trim();
  const original = message.metadata?.originalSenderName;
  return typeof original === 'string' && original.trim() ? original.trim() : null;
}

/** برچسب فوروارد در بالای حباب کافی است؛ آغاز متن تکرار نشود. */
function bodyWithoutForwardPrefix(message: ChatMessage, origin: string | null): string {
  const body = message.body ?? '';
  if (!origin) return body;
  const prefix = `فوروارد از ${origin}`;
  return body.startsWith(prefix) ? body.slice(prefix.length).replace(/^\n/, '') : body;
}

function MessageBubble({
  message,
  currentUserId,
  peerId,
  onOpenFile,
}: {
  message: ChatMessage;
  currentUserId: string | null;
  /** فاز ۱۲٫۲۴-A: شناسه مخاطب برای بارگیری آواتار واقعی. */
  peerId?: string | null;
  onOpenFile: (file: ChatFile) => void;
}) {
  if (isSystemMessage(message)) {
    return (
      <div className="chat-system" role="note">
        <Icon name="inbox" size={14} />
        <span>{message.body}</span>
      </div>
    );
  }

  const mine = isOwn(message, currentUserId);
  const origin = forwardedFrom(message);
  return (
    <div className={`chat-msg ${mine ? 'chat-msg--mine' : 'chat-msg--theirs'}`}>
      {!mine ? <PeerAvatar name={message.senderName} userId={peerId} small /> : null}
      <div className="chat-msg__stack">
        <div className="chat-bubble">
          {origin ? (
            <span className="chat-forward-label">
              <Icon name="forward" size={12} />
              فوروارد از {origin}
            </span>
          ) : null}
          {bodyWithoutForwardPrefix(message, origin) ? (
            <p className="chat-bubble__text">
              {bodyWithoutForwardPrefix(message, origin)}
            </p>
          ) : null}

          {message.files.length > 0 ? (
            <div className="chat-attachments">
              {message.files.map((file) => (
                <FileActions
                  key={file.id}
                  file={toFileItem(file)}
                  onOpenDetails={() => onOpenFile(file)}
                />
              ))}
            </div>
          ) : null}

          {message.links.length > 0 ? (
            <div className="chat-attachments">
              {message.links.map((link) => (
                <a
                  key={link.id}
                  className="chat-file-btn"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="link" size={16} />
                  <span className="chat-file-btn__name">
                    {link.description || link.url}
                  </span>
                  <Icon name="chevronLeft" size={15} />
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <span className="chat-msg__meta">
          <span>{mine ? 'شما' : message.senderName}</span>
          <span aria-hidden="true">·</span>
          <RelativeTime value={message.createdAt} />
          {mine ? (
            <Tooltip
              label={
                message.readAt
                  ? `دیده‌شده — ${formatDateFull(message.readAt)}`
                  : 'دیده نشده'
              }
              pinnable
            >
              <span className={`chat-seen ${message.readAt ? 'chat-seen--yes' : ''}`}>
                <Icon name={message.readAt ? 'checkDouble' : 'check'} size={14} />
              </span>
            </Tooltip>
          ) : null}
        </span>
      </div>
    </div>
  );
}

/** وضعیت درگ روی پیام‌ها — پیام نقطه‌ی آغاز و میزان جابه‌جایی را نگه می‌دارد. */
interface DragState {
  anchorId: string;
  startX: number;
  startY: number;
  moved: boolean;
}

export function MessageThread() {
  const {
    messages,
    activePeer,
    projectLabel,
    loadingMessages,
    hasMoreMessages,
    loadMoreMessages,
    busy,
    error,
    backToList,
    selectedMessageIds,
    toggleSelectedMessage,
    setSelectedMessages,
    clearSelection,
    openForwardDialog,
  } = useChat();
  const { user } = useAuth();
  const [preview, setPreview] = useState<ChatFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const [dragAnchor, setDragAnchor] = useState<string | null>(null);
  const selecting = selectedMessageIds.length > 0;

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  const onMessagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, id: string) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      if (event.button !== 0) return;
      if ((event.target as HTMLElement).closest('button, a, input, textarea, select'))
        return;
      dragRef.current = {
        anchorId: id,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      setDragAnchor(id);
    },
    [],
  );

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (
        !drag.moved &&
        Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) < 8
      )
        return;
      drag.moved = true;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const targetId = element
        ?.closest('[data-message-id]')
        ?.getAttribute('data-message-id');
      // داخل همان پیام، کشیدن متن باید آزاد بماند؛ تنها عبور به پیام دیگر
      // انتخاب محدودهای پیام‌ها را آغاز می‌کند.
      if (!targetId || targetId === drag.anchorId) return;
      setSelectedMessages(rangeIds(messages, drag.anchorId, targetId));
      event.preventDefault();
    };
    const onUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      setDragAnchor(null);
      if (!drag.moved) toggleSelectedMessage(drag.anchorId);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [messages, setSelectedMessages, toggleSelectedMessage]);

  const title = useMemo(() => peerName(activePeer), [activePeer]);

  return (
    <div className={cx('chat-thread', selecting && 'chat-thread--selecting')}>
      <div className="chat-thread__header">
        {selecting ? (
          <div className="chat-select-bar">
            <button
              type="button"
              className="chat-icon-btn"
              aria-label="لغو انتخاب"
              onClick={clearSelection}
            >
              <Icon name="x" size={18} />
            </button>
            <strong>انتخاب {toFaDigits(selectedMessageIds.length)} پیام</strong>
            <button
              type="button"
              className="chat-forward-btn"
              onClick={openForwardDialog}
            >
              <Icon name="forward" size={16} />
              فوروارد
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="chat-icon-btn"
              aria-label="بازگشت به فهرست گفتگو‌ها"
              onClick={backToList}
            >
              <Icon name="chevronRight" size={18} />
            </button>
            <PeerAvatar name={title} userId={activePeer?.id} small />
            <div className="chat-thread__who">
              <strong>{title}</strong>
              <span>
                {projectLabel ?? (activePeer?.role === 'admin' ? 'مدیر سامانه' : 'مخاطب')}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="chat-thread__scroll" aria-live="polite" aria-label="پیام‌های گفتگو">
        {hasMoreMessages ? (
          <button
            type="button"
            className="chat-more chat-more--top"
            onClick={() => void loadMoreMessages()}
            disabled={loadingMessages}
          >
            <Icon name="chevronDown" size={15} />
            پیام‌های پیشین
          </button>
        ) : null}

        {loadingMessages && messages.length === 0 ? (
          <div className="chat-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        ) : null}

        {!loadingMessages && messages.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty__icon">
              <Icon name="chat" size={26} />
            </span>
            <p className="chat-empty__title">گفتگو را آغاز کنید</p>
            <p className="chat-empty__text">
              نخستین پیام خود را بنویسید یا با دکمه‌ی «ارسال فایل» فایلی ضمیمه کنید.
            </p>
          </div>
        ) : null}

        {messages.map((message) => {
          if (isSystemMessage(message)) {
            return (
              <MessageBubble
                key={message.id}
                message={message}
                currentUserId={user?.id ?? null}
                peerId={activePeer?.id}
                onOpenFile={() => undefined}
              />
            );
          }
          const selected = selectedMessageIds.includes(message.id);
          return (
            <div
              key={message.id}
              data-message-id={message.id}
              className={cx(
                'chat-msg-select',
                selected && 'chat-msg-select--on',
                dragAnchor === message.id && 'chat-msg-select--anchor',
              )}
              onPointerDown={(event) => onMessagePointerDown(event, message.id)}
            >
              <button
                type="button"
                className="chat-select-check"
                aria-label={selected ? 'لغو انتخاب این پیام' : 'انتخاب این پیام'}
                aria-pressed={selected}
                onClick={() => toggleSelectedMessage(message.id)}
              >
                <Icon name="check" size={12} />
              </button>
              <MessageBubble
                message={message}
                currentUserId={user?.id ?? null}
                peerId={activePeer?.id}
                onOpenFile={(file) => {
                  setPreview(file);
                  setPreviewOpen(true);
                }}
              />
            </div>
          );
        })}

        {busy ? <p className="chat-hint chat-hint--center">در حال ارسال…</p> : null}
        {error ? (
          <div className="chat-error" role="alert">
            {error}
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <FileDownloadModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        file={preview ? toFileItem(preview) : null}
        canDownload
      />
    </div>
  );
}
