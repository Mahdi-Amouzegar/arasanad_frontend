'use client';

/**
 * کادر ارسال پیام (بند ۲٫۱ و ۲٫۲).
 *
 * رفتار دقیق دکمه‌ها طبق درخواست مالک پروژه:
 *   - «ارسال فایل» (فشار نخست): `FileManagerModal` سه‌تبه فاز ۸ باز می‌شود
 *     (تب ۱ آپلود، تب ۲ فایل‌های آپلودشده‌ی قبلی، تب ۳ لینک).
 *   - پس از انتخاب، فقط **نام** فایل‌ها به‌صورت چیپهای زیرهم کنار دکمه
 *     دیده می‌شود؛ هر چیپ قابل حذف است.
 *   - «ارسال فایل» (فشار دوم، هنگامی که پیوست آماده است): هر فایل به‌صورت
 *     دکمهای با همان نام وارد چت می‌شود و `FileDownloadModal` را باز می‌کند.
 *   - «ارسال» فقط متن داخل کادر را می‌فرستد.
 *
 * ⚠️ هنگام قطعی شبکه دکمه‌ها غیرفعال می‌شوند، ولی متن تایپشده و
 *    پیوستهای انتخاب‌شده حفظ می‌گردند تا پس از اتصال از بین نروند.
 */

import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import {
  FileManagerModal,
  type FileManagerResult,
  type SelectedFile,
  type SelectedLink,
} from '@/components/files/FileManagerModal';
import { useAuth } from '@/lib/account';
import { useNetworkStatus } from '@/lib/connectivity/useConnectivity';
import { useChat } from './ChatProvider';
import { MAX_ATTACHMENTS, MAX_MESSAGE_LENGTH, toFaDigits, validateDraft } from '@/lib/chat/core.mjs';

export function ChatComposer() {
  const { sendText, sendAttachments, busy, conversationId, clearError } = useChat();
  const { user } = useAuth();
  const network = useNetworkStatus();
  const offline = network.online === false;

  const [draft, setDraft] = useState('');
  const [pendingFiles, setPendingFiles] = useState<SelectedFile[]>([]);
  const [pendingLinks, setPendingLinks] = useState<SelectedLink[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const pendingCount = pendingFiles.length + pendingLinks.length;
  const config = useMemo(
    () => ({
      role: (user?.role === 'admin' ? 'admin' : 'customer') as 'admin' | 'customer',
      defaultTab: 'upload' as const,
      title: 'پیوست پیام',
      tabs: ['upload', 'select', 'link'] as Array<'upload' | 'select' | 'link'>,
    }),
    [user?.role],
  );

  const handleSelect = useCallback((result: FileManagerResult) => {
    setPendingFiles((prev) => {
      const seen = new Set(prev.map((item) => item.id));
      return [...prev, ...result.files.filter((item) => !seen.has(item.id))].slice(0, MAX_ATTACHMENTS);
    });
    setPendingLinks((prev) => {
      const seen = new Set(prev.map((item) => item.id));
      return [...prev, ...result.links.filter((item) => !seen.has(item.id))].slice(0, MAX_ATTACHMENTS);
    });
    setPickerOpen(false);
    clearError();
  }, [clearError]);

  const handleFileButton = useCallback(async () => {
    if (pendingCount === 0) {
      setPickerOpen(true);
      return;
    }
    const ok = await sendAttachments(pendingFiles, pendingLinks);
    if (ok) {
      setPendingFiles([]);
      setPendingLinks([]);
      setDraftError(null);
    }
  }, [pendingCount, pendingFiles, pendingLinks, sendAttachments]);

  const handleSend = useCallback(async () => {
    const check = validateDraft(draft);
    if (!check.ok) {
      setDraftError(check.reason ?? 'متن پیام نامعتبر است');
      return;
    }
    if (!check.value) return;
    const ok = await sendText(check.value);
    if (ok) {
      setDraft('');
      setDraftError(null);
    }
  }, [draft, sendText]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter بفرستد، Shift+Enter خط تازه؛ مطابق الگوی رایج پیامرسان‌ها
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const disabled = !conversationId || busy || offline;

  return (
    <div className="chat-composer">
      {pendingCount > 0 ? (
        <div className="chat-pending" aria-label="فایل‌های آماده‌ی ارسال">
          {pendingFiles.map((file) => (
            <span className="chat-chip" key={`f-${file.id}`}>
              <Icon name="fileText" size={14} />
              <span className="chat-chip__name" title={file.originalName}>{file.originalName}</span>
              <button
                type="button"
                className="chat-chip__remove"
                aria-label={`حذف ${file.originalName}`}
                onClick={() => setPendingFiles((prev) => prev.filter((item) => item.id !== file.id))}
              >
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
          {pendingLinks.map((link) => (
            <span className="chat-chip" key={`l-${link.id}`}>
              <Icon name="link" size={14} />
              <span className="chat-chip__name" title={link.url}>{link.description || link.url}</span>
              <button
                type="button"
                className="chat-chip__remove"
                aria-label="حذف لینک"
                onClick={() => setPendingLinks((prev) => prev.filter((item) => item.id !== link.id))}
              >
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
          <span className="chat-pending__hint">برای فرستادن، دوباره «ارسال فایل» را بزنید.</span>
        </div>
      ) : null}

      {offline ? (
        <p className="chat-offline" role="status">
          <Icon name="wifiOff" size={14} />
          شبکه قطع است؛ پیام ارسال نمی‌شود و نوشتههای شما حفظ می‌گردد.
        </p>
      ) : null}

      <div className="chat-composer__row">
        <textarea
          className="chat-input"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setDraftError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder="پیام خود را بنویسید…"
          aria-label="متن پیام تازه"
          rows={2}
          maxLength={MAX_MESSAGE_LENGTH + 100}
        />
        <div className="chat-composer__buttons">
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<Icon name="paperclip" size={16} />}
            onClick={() => void handleFileButton()}
            disabled={disabled}
            loading={busy && pendingCount > 0}
            title={pendingCount > 0 ? 'ارسال فایل‌های انتخاب‌شده' : 'باز کردن انتخابگر فایل'}
          >
            ارسال فایل{pendingCount > 0 ? ` (${toFaDigits(pendingCount)})` : ''}
          </Button>
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Icon name="send" size={16} />}
            onClick={() => void handleSend()}
            disabled={disabled || !draft.trim()}
            loading={busy && pendingCount === 0}
          >
            ارسال
          </Button>
        </div>
      </div>

      {draftError ? <p className="chat-draft-error" role="alert">{draftError}</p> : null}

      <FileManagerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        config={config}
        onSelect={handleSelect}
      />
    </div>
  );
}
