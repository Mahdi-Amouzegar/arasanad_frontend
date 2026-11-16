'use client';

/**
 * لانچر شناور (پیشنهاد ۲٫۲ مالک پروژه).
 *
 * ⚠️ این دکمه در «هر صفحه‌ای» از برنامه وجود دارد — حتی صفحات عمومی که
 *    سایدبار پنل ندارند — و همان `ChatProvider` را فعال می‌کند.
 * ⚠️ نشان عددی از شمارنده‌ی سراسری گفتگو‌ها تغذیه می‌شود، نه داده‌ی ساختگی.
 */

import { Icon } from '@/components/ui/Icon';
import { useChat } from './ChatProvider';
import { formatBadge } from '@/lib/chat/core.mjs';

export function ChatLauncher() {
  const { open, variant, signedIn, openList, unreadTotal } = useChat();
  if (!signedIn || (open && variant === 'popover')) return null;

  return (
    <button
      type="button"
      className="chat-launcher"
      onClick={() => openList('popover')}
      aria-label={`باز کردن گفتگو‌ها${unreadTotal > 0 ? `، ${unreadTotal} پیام خوانده‌نشده` : ''}`}
      title="گفتگو‌ها"
    >
      <Icon name="phone" size={22} />
      <span className="chat-launcher__pulse" aria-hidden="true"><Icon name="chat" size={12} /></span>
      {unreadTotal > 0 ? <span className="chat-launcher__badge">{formatBadge(unreadTotal)}</span> : null}
    </button>
  );
}
