'use client';

/**
 * صفحه‌ی پیام‌ها در همان ستون دراور (بند ۲٫۱).
 *
 * - پیام‌های ما راست، پیام‌های مخاطب چپ، به ترتیب زمانی بالا به پایین
 * - هر فایل، دکمهای با عنوان نام فایل است ← همان `FileDownloadModal` فاز ۸
 * - پیام سیستمی متمایز است و قابل ویرایش/حذف نیست
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { FileActions } from '@/components/files/FileActions';
import { FileDownloadModal } from '@/components/files/FileDownloadModal';
import type { FileItem } from '@/lib/files/api';
import { useAuth } from '@/lib/account';
import { useChat } from './ChatProvider';
import {
  initialsOf,
  isOwn,
  isSystemMessage,
  peerName,
  type ChatFile,
  type ChatMessage,
} from '@/lib/chat/core.mjs';

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

function MessageBubble({
  message,
  currentUserId,
  onOpenFile,
}: {
  message: ChatMessage;
  currentUserId: string | null;
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
  return (
    <div className={`chat-msg ${mine ? 'chat-msg--mine' : 'chat-msg--theirs'}`}>
      {!mine ? (
        <span className="chat-avatar chat-avatar--sm" aria-hidden="true">
          {initialsOf(message.senderName)}
        </span>
      ) : null}
      <div className="chat-msg__stack">
        <div className="chat-bubble">
          {message.body ? <p className="chat-bubble__text">{message.body}</p> : null}

          {message.files.length > 0 ? (
            <div className="chat-attachments">
              {message.files.map((file) => (
                <FileActions
                  key={file.id}
                  file={toFileItem(file)}
                  detailsLabel={file.originalName}
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
                  <span className="chat-file-btn__name">{link.description || link.url}</span>
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
        </span>
      </div>
    </div>
  );
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
  } = useChat();
  const { user } = useAuth();
  const [preview, setPreview] = useState<ChatFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  useEffect(() => {
    if (messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  const title = useMemo(() => peerName(activePeer), [activePeer]);

  return (
    <div className="chat-thread">
      <div className="chat-thread__header">
        <button type="button" className="chat-icon-btn" aria-label="بازگشت به فهرست گفتگو‌ها" onClick={backToList}>
          <Icon name="chevronRight" size={18} />
        </button>
        <span className="chat-avatar chat-avatar--sm" aria-hidden="true">{initialsOf(title)}</span>
        <div className="chat-thread__who">
          <strong>{title}</strong>
          <span>{projectLabel ?? (activePeer?.role === 'admin' ? 'مدیر سامانه' : 'مخاطب')}</span>
        </div>
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
          <div className="chat-skeleton" aria-hidden="true"><span /><span /><span /></div>
        ) : null}

        {!loadingMessages && messages.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty__icon"><Icon name="chat" size={26} /></span>
            <p className="chat-empty__title">گفتگو را آغاز کنید</p>
            <p className="chat-empty__text">
              نخستین پیام خود را بنویسید یا با دکمه‌ی «ارسال فایل» فایلی ضمیمه کنید.
            </p>
          </div>
        ) : null}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            currentUserId={user?.id ?? null}
            onOpenFile={(file) => {
              setPreview(file);
              setPreviewOpen(true);
            }}
          />
        ))}

        {busy ? <p className="chat-hint chat-hint--center">در حال ارسال…</p> : null}
        {error ? <div className="chat-error" role="alert">{error}</div> : null}
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
