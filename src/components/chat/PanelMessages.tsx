'use client';

/**
 * نمای واقعی `/panel/messages` (فاز ۹).
 *
 * ⚠️ این صفحه گفتگو را دوباره پیاده‌سازی نمی‌کند: تنها یک دروازه به
 *    ماژول سراسری چت است. با زدن دکمه یا نام مخاطب، همان `ChatDock`
 *    باز می‌شود و وضعیت در تمام برنامه مشترک می‌ماند.
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { formatBadge, initialsOf, peerName, truncate } from '@/lib/chat/core.mjs';
import { useChat } from './ChatProvider';

export function PanelMessages() {
  const {
    signedIn,
    conversations,
    unreadTotal,
    loadingConversations,
    refreshConversations,
    openList,
    openChat,
  } = useChat();

  useEffect(() => {
    if (signedIn) void refreshConversations();
  }, [signedIn, refreshConversations]);

  if (!signedIn) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            title="برای دیدن گفتگو‌ها وارد شوید"
            description="پس از ورود، گفتگو‌ها از هر صفحه‌ای در دسترس خواهند بود."
            icon={<Icon name="chat" size={26} />}
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="chat-page">
      <Card>
        <CardHeader
          title="گفتگو‌ها"
          actions={
            <Button
              variant="primary"
              size="sm"
              leadingIcon={<Icon name="chat" size={16} />}
              onClick={() => openList('drawer')}
            >
              باز کردن گفتگو‌ها
            </Button>
          }
        />
        <CardBody>
          <p className="chat-page__lead">
            گفتگو با مدیر یا مشتری سفارش، بدون خروج از صفحه و در یک دراور کنار
            صفحه انجام می‌شود.
            {unreadTotal > 0 ? ` اکنون ${formatBadge(unreadTotal)} پیام خوانده‌نشده دارید.` : ''}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="گفتگوهای اخیر"
          actions={
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<Icon name="refresh" size={15} />}
              onClick={() => void refreshConversations()}
              loading={loadingConversations}
            >
              تازهمسازی
            </Button>
          }
        />
        <CardBody flush>
          {conversations.length === 0 && !loadingConversations ? (
            <EmptyState
              title="هنوز گفتگویی ندارید"
              description="نام مخاطب را در دراور گفتگو‌ها جستجو کنید، یا از صفحه جزئیات سفارش دکمه «گفتگو با مخاطب» را بزنید."
              icon={<Icon name="chat" size={26} />}
              action={
                <Button variant="outline" size="sm" onClick={() => openList('drawer')}>
                  شروع گفتگو
                </Button>
              }
            />
          ) : null}

          <div className="chat-page__list">
            {conversations.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                className="chat-conv"
                onClick={() =>
                  void openChat({
                    peerUserId: conversation.peer.id,
                    ...(conversation.projectId ? { projectId: conversation.projectId } : {}),
                  }, 'drawer')
                }
              >
                <span className="chat-avatar" aria-hidden="true">
                  {initialsOf(peerName(conversation.peer))}
                </span>
                <span className="chat-conv__body">
                  <span className="chat-conv__top">
                    <span className="chat-conv__name">{peerName(conversation.peer)}</span>
                    {conversation.lastMessageAt ? (
                      <RelativeTime value={conversation.lastMessageAt} className="chat-conv__time" />
                    ) : null}
                  </span>
                  <span className="chat-conv__preview">
                    {truncate(conversation.lastMessagePreview ?? 'گفتگو را آغاز کنید', 80)}
                  </span>
                </span>
                {conversation.unreadCount > 0 ? (
                  <span className="chat-unread">{formatBadge(conversation.unreadCount)}</span>
                ) : null}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
