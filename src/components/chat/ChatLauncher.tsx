'use client';

/**
 * لانچر شناور (پیشنهاد ۲٫۲ مالک پروژه).
 *
 * ⚠️ این دکمه در «هر صفحه‌ای» از برنامه وجود دارد — حتی صفحات عمومی که
 *    سایدبار پنل ندارند — و همان `ChatProvider` را فعال می‌کند.
 * ⚠️ نشان عددی از شمارندهٔ سراسری گفتگو‌ها تغذیه می‌شود، نه دادهٔ ساختگی.
 * ⚠️ فاز ۱۲٫۲۰-C: پیش‌نمایش آخرین مکالمه خوانده‌نشده از همان state سراسری
 *    خوانده می‌شود تا تب‌های پیرو بدون درخواست اضافی همان متن را نشان دهند.
 */

import { Icon } from '@/components/ui/Icon';
import { PeerAvatar } from './PeerAvatar';
import { useChat } from './ChatProvider';
import { formatBadge, latestUnreadPreview } from '@/lib/chat/core.mjs';

export function ChatLauncher() {
  const { open, variant, signedIn, openList, unreadTotal, freshMessage, conversations } =
    useChat();
  if (!signedIn || (open && variant === 'popover')) return null;
  const preview = latestUnreadPreview(conversations);

  return (
    <button
      type="button"
      className={`chat-launcher${freshMessage ? ' chat-launcher--fresh' : ''}`}
      onClick={() => openList('popover')}
      aria-label={`باز کردن گفتگو‌ها${unreadTotal > 0 ? `، ${unreadTotal} پیام خوانده‌نشده` : ''}${freshMessage ? '، پیام خوانده‌نشده تازه' : ''}`}
      title="گفتگو‌ها"
    >
      {preview ? (
        <span className="chat-launcher__avatar">
          <PeerAvatar name={preview.peerName} userId={preview.peerId} small />
        </span>
      ) : (
        <Icon name="phone" size={22} />
      )}
      <span className="chat-launcher__pulse" aria-hidden="true">
        <Icon name="chat" size={12} />
      </span>
      {unreadTotal > 0 ? (
        <span className="chat-launcher__badge">{formatBadge(unreadTotal)}</span>
      ) : null}
      {preview ? (
        <span className="chat-launcher__preview" aria-hidden="true">
          <strong>{preview.peerName}</strong>
          <span>{preview.preview}</span>
        </span>
      ) : null}
    </button>
  );
}
