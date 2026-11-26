'use client';

/**
 * کارت اتصال تلگرام (R-03) و تنظیمات اطلاع‌رسانی.
 *
 * ⚠️ ربات نمی‌تواند گفتگویی را با کاربری که Start نکرده آغاز کند.
 *    تا پیش از اتصال، اعلان داخلی همچنان ثبت می‌شود ولی ارسال تلگرام
 *    به‌صورت کنترل‌شده نادیده گرفته می‌شود.
 */

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useNotifications } from './NotificationProvider';
import { notificationSupported } from '@/lib/notifications/browser';

export function TelegramConnectCard() {
  const {
    telegramStatus,
    permission,
    enableBrowserNotifications,
    connectTelegram,
    disconnectTelegram,
    refreshTelegramStatus,
  } = useNotifications();
  const [connecting, setConnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const handleDisconnect = async () => {
    await disconnectTelegram();
    setConfirmDisconnect(false);
  };

  const handleConnect = async () => {
    setConnecting(true);
    const url = await connectTelegram();
    setConnecting(false);
    if (url && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      // وضعیت پس از بازگشت کاربر از تلگرام تازه می‌شود
      window.setTimeout(() => void refreshTelegramStatus(), 4000);
    }
  };

  return (
    <div className="chat-telegram">
      <div className="chat-telegram__row">
        <span className="chat-telegram__icon"><Icon name="send" size={16} /></span>
        <div className="chat-telegram__text">
          <strong>اتصال ربات تلگرام</strong>
          <span>
            {telegramStatus?.connected
              ? 'حساب شما به ربات متصل است و می‌توانید سفارش ثبت کنید.'
              : 'برای دریافت اعلان هنگام بستهبودن سایت، ربات را Start کنید.'}
          </span>
        </div>
      </div>

      <div className="chat-telegram__actions">
        {!telegramStatus?.connected ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => void handleConnect()}
            disabled={connecting}
          >
            {connecting ? 'در حال ساخت لینک…' : 'اتصال تلگرام'}
          </button>
        ) : (
          <>
            <span className="chat-telegram__note">وضعیت اتصال: متصل ✓ — اجازهٔ دریافت اعلان در «اعلان تلگرام» تنظیم می‌شود.</span>
            {confirmDisconnect ? (
              <span className="chat-telegram__confirm">
                <span>اتصال حساب به ربات قطع شود؟ برای اتصال مجدد باید لینک تازه‌ای بسازید.</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setConfirmDisconnect(false)}
                >
                  لغو
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => void handleDisconnect()}
                >
                  تأیید قطع اتصال
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmDisconnect(true)}
              >
                قطع اتصال
              </button>
            )}
          </>
        )}

        {notificationSupported() && permission !== 'granted' && permission !== 'denied' ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void enableBrowserNotifications()}
          >
            <Icon name="bell" size={14} />
            اعلان مرورگر
          </button>
        ) : null}
      </div>

      {permission === 'denied' ? (
        <p className="chat-telegram__note">
          اعلان مرورگر در تنظیمات مرورگر مسدود شده است؛ اعلان‌های درون‌سامانه‌ای همچنان کار می‌کنند.
        </p>
      ) : null}
    </div>
  );
}
