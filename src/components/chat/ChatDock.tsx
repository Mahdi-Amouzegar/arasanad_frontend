'use client';

/**
 * «چت داک» — یک ماژول، دو نمایش.
 *
 * - `drawer`: دراور سمت راست (همسو با RTL)، با دکمه‌ی «گفتگو‌ها» در ستون راست
 * - `popover`: پنجره‌ی شناور گوشه‌ی پایین، با لیست کشویی انتخاب مخاطب
 *
 * ⚠️ هر دو دقیقاً از `ChatProvider` و همان سه کامپوننت
 *    `ConversationList` / `MessageThread` / `ChatComposer` استفاده می‌کنند.
 */

import { useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useChat } from './ChatProvider';
import { registerBackDismiss } from '@/lib/android-back';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { ChatComposer } from './ChatComposer';
import { peerName } from '@/lib/chat/core.mjs';

export function ChatDock() {
  const {
    open,
    variant,
    view,
    close,
    openList,
    openChat,
    conversations,
    conversationId,
  } = useChat();
  const isDrawer = variant === 'drawer';

  useEffect(() => {
    if (!open) return undefined;
    // فاز ۱۳: کلید بازگشت اندروید پنجرهٔ گفتگو را می‌بندد.
    const unregister = registerBackDismiss(() => {
      close();
      return true;
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);

    let previousOverflow = '';
    if (isDrawer && window.matchMedia('(max-width: 720px)').matches) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    return () => {
      unregister();
      document.removeEventListener('keydown', onKeyDown);
      if (previousOverflow !== undefined) document.body.style.overflow = previousOverflow;
    };
  }, [open, isDrawer, close]);

  if (!open) return null;

  return (
    <div className={`chat-layer chat-layer--${variant}`}>
      {isDrawer ? (
        <button type="button" className="chat-backdrop" aria-label="بستن گفتگو‌ها" onClick={close} />
      ) : null}

      <section
        className={`chat-dock chat-dock--${variant}`}
        role="dialog"
        aria-modal={isDrawer}
        aria-label="گفتگو‌ها"
      >
        <header className="chat-dock__header">
          <span className="chat-dock__mark"><Icon name="chat" size={18} /></span>
          <div className="chat-dock__heading">
            <strong>گفتگو‌ها</strong>
            <span>ارتباط مستقیم با مخاطب سفارش</span>
          </div>

          {!isDrawer && view === 'thread' ? (
            <select
              className="chat-peer-select"
              aria-label="انتخاب مخاطب"
              value={conversationId ?? ''}
              onChange={(event) => {
                const chosen = conversations.find((item) => item.id === event.target.value);
                if (chosen) {
                  void openChat(
                    {
                      peerUserId: chosen.peer.id,
                      ...(chosen.projectId ? { projectId: chosen.projectId } : {}),
                    },
                    'popover',
                  );
                }
              }}
            >
              {conversations.length === 0 ? <option value="">گفتگویی نیست</option> : null}
              {conversations.map((item) => (
                <option key={item.id} value={item.id}>{peerName(item.peer)}</option>
              ))}
            </select>
          ) : null}

          {!isDrawer && view === 'list' ? (
            <button type="button" className="chat-icon-btn" aria-label="تازه کردن فهرست" onClick={() => openList('popover')}>
              <Icon name="refresh" size={16} />
            </button>
          ) : null}

          <button type="button" className="chat-icon-btn" aria-label="بستن گفتگو‌ها" onClick={close}>
            <Icon name="x" size={18} />
          </button>
        </header>

        {!isDrawer && view === 'thread' && conversations.length === 0 ? (
          <button type="button" className="chat-link-btn chat-new-chat" onClick={() => openList('popover')}>
            <Icon name="plus" size={14} />
            گفتگوی تازه
          </button>
        ) : null}

        <div className={`chat-dock__body ${view === 'thread' ? 'chat-dock__body--thread' : ''}`}>
          {view === 'list' ? <ConversationList /> : <MessageThread />}
        </div>

        {view === 'thread' ? <ChatComposer /> : null}
      </section>
    </div>
  );
}
