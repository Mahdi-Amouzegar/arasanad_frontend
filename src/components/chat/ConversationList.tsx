'use client';

/**
 * فهرست گفتگو‌ها (بند ۲٫۱).
 *
 * - کادر جستجو در بالا: نام، نام خانوادگی یا نام کاربری
 * - فهرست مخاطبان اخیر به ترتیب آخرین پیام
 * - دکمه‌ی «بیشتر» در پایین که صفحه‌ی بعدی را به همان لیست اضافه می‌کند
 * - کلیک روی هر مخاطب → همان ستون، صفحه‌ی پیام‌ها
 */

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { PeerAvatar } from './PeerAvatar';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { useChat } from './ChatProvider';
import {
  formatBadge,
  peerName,
  SEARCH_MIN_LENGTH,
  truncate,
  type ChatPeer,
} from '@/lib/chat/core.mjs';

/** فاز ۱۲٫۲۴-A: آواتار واقعی مخاطب در فهرست گفتگو‌ها و نتایج جستجو. */
function Avatar({ name, userId }: { name: string; userId?: string }) {
  return <PeerAvatar name={name} userId={userId} />;
}

function UserRow({ user, onClick }: { user: ChatPeer; onClick: () => void }) {
  return (
    <button type="button" className="chat-conv" onClick={onClick}>
      <Avatar name={peerName(user)} userId={user.id} />
      <span className="chat-conv__body">
        <span className="chat-conv__top">
          <span className="chat-conv__name">{peerName(user)}</span>
          {user.role === 'admin' ? <span className="chat-role">مدیر</span> : null}
        </span>
        <span className="chat-conv__preview">@{user.username}</span>
      </span>
      <Icon name="chevronLeft" size={16} />
    </button>
  );
}

export function ConversationList() {
  const {
    conversations,
    hasMoreConversations,
    loadingConversations,
    loadMoreConversations,
    searchUsers,
    clearSearch,
    searchResults,
    searching,
    openWithUser,
    openChat,
    refreshConversations,
    error,
  } = useChat();
  const [query, setQuery] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < SEARCH_MIN_LENGTH) {
      clearSearch();
      return undefined;
    }
    timerRef.current = setTimeout(() => void searchUsers(q), 250);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, searchUsers, clearSearch]);

  const isSearching = query.trim().length >= SEARCH_MIN_LENGTH;

  return (
    <div className="chat-list">
      <div className="chat-search">
        <Icon name="search" size={17} />
        <input
          type="search"
          className="chat-search__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جستجو بر پایه‌ی نام، نام خانوادگی یا نام کاربری"
          aria-label="جستجوی مخاطب"
        />
        {query ? (
          <button
            type="button"
            className="chat-icon-btn"
            aria-label="پاک کردن جستجو"
            onClick={() => setQuery('')}
          >
            <Icon name="x" size={15} />
          </button>
        ) : null}
      </div>

      <div className="chat-list__scroll">
        {isSearching ? (
          <>
            <p className="chat-list__label">نتایج جستجو</p>
            {searching ? <p className="chat-hint">در حال جستجو…</p> : null}
            {!searching && searchResults.length === 0 ? (
              <p className="chat-hint">کاربری با این مشخصات یافت نشد.</p>
            ) : null}
            {searchResults.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onClick={() => void openWithUser(user)}
              />
            ))}
          </>
        ) : (
          <>
            <p className="chat-list__label">گفتگوهای اخیر</p>
            {loadingConversations && conversations.length === 0 ? (
              <div className="chat-skeleton" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            ) : null}
            {!loadingConversations && conversations.length === 0 ? (
              <div className="chat-empty">
                <span className="chat-empty__icon">
                  <Icon name="chat" size={26} />
                </span>
                <p className="chat-empty__title">هنوز گفتگویی ندارید</p>
                <p className="chat-empty__text">
                  نام مخاطب را در کادر بالا جستجو کنید، یا از صفحه‌ی جزئیات سفارش دکمه‌ی
                  «گفتگو با مخاطب» را بزنید.
                </p>
              </div>
            ) : null}
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                className="chat-conv"
                onClick={() =>
                  void openChat({
                    peerUserId: conversation.peer.id,
                    ...(conversation.projectId
                      ? { projectId: conversation.projectId }
                      : {}),
                  })
                }
              >
                <Avatar
                  name={peerName(conversation.peer)}
                  userId={conversation.peer.id}
                />
                <span className="chat-conv__body">
                  <span className="chat-conv__top">
                    <span className="chat-conv__name">{peerName(conversation.peer)}</span>
                    {conversation.lastMessageAt ? (
                      <RelativeTime
                        value={conversation.lastMessageAt}
                        className="chat-conv__time"
                      />
                    ) : null}
                  </span>
                  <span className="chat-conv__preview">
                    {truncate(
                      conversation.lastMessagePreview ?? 'گفتگو را آغاز کنید',
                      60,
                    )}
                  </span>
                </span>
                {conversation.unreadCount > 0 ? (
                  <span
                    className="chat-unread"
                    aria-label={`${conversation.unreadCount} پیام خوانده‌نشده`}
                  >
                    {formatBadge(conversation.unreadCount)}
                  </span>
                ) : null}
              </button>
            ))}
            {hasMoreConversations ? (
              <button
                type="button"
                className="chat-more"
                onClick={() => void loadMoreConversations()}
                disabled={loadingConversations}
              >
                <Icon name="chevronDown" size={16} />
                بیشتر
              </button>
            ) : null}
          </>
        )}

        {error ? (
          <div className="chat-error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="chat-link-btn"
              onClick={() => void refreshConversations()}
            >
              تلاش دوباره
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
