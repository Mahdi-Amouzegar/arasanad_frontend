'use client';

/**
 * فاز ۹٫۵ — ارسال پیام / پیوست عملیاتی و بازبینی (§9.5.6).
 *
 * از همان `FileManagerModal` سه‌تبه فاز ۸ استفاده می‌شود؛ پس از ساختن کارت،
 * فایل‌ها و لینکها با `entityType='project_activity'` به همان کارت الصاق
 * می‌گردند. بازبینی فقط سفارش‌دهنده و رسیدگی فقط مدیر، و `replyToActivityId`
 * رشته‌ی پاسخ را نگه می‌دارد.
 */

import { shortFileName } from '@/lib/files/file-name';
import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  createFilesApi,
  createExternalLinksApi,
  type FileItem,
  type ExternalLink,
} from '@/lib/files/api';
import {
  FileManagerModal,
  type FileManagerResult,
} from '@/components/files/FileManagerModal';
import { createActivitiesApi, type ActivityKind, type ActivityItem } from '@/lib/activities/api';
import { PeykDropTarget } from '@/components/files/PeykDropTarget';
import { createPeykApiUploader } from '@/lib/files/peyk-api-adapter';
import { localFileSignature } from '@/components/files/FileManagerModal';
import type { PeykResult } from '@/lib/files/peyk';
import {
  ACTIVITY_ENTITY_TYPE,
  ACTIVITY_FILE_ROLE,
  ACTIVITY_MAX_ATTACHMENTS,
  validateActivityText,
} from '@/lib/activities/core.mjs';
import { createNonce } from '@/lib/chat/core.mjs';

interface ActivityComposerProps {
  projectId: string;
  role: 'admin' | 'customer';
  /** کارت بازبینیی که مدیر به آن پاسخ می‌دهد. */
  replyTo?: ActivityItem | null;
  onClearReply?: () => void;
  onCreated: () => void | Promise<void>;
  /** فاز ۱۲٫۱۴-د: تا زمان پاسخ مدیر، بازبینی جدیدی پذیرفته نمی‌شود. */
  hasOpenDispute?: boolean;
}

export function ActivityComposer({
  projectId,
  role,
  replyTo = null,
  onClearReply,
  onCreated,
  hasOpenDispute = false,
}: ActivityComposerProps) {
  const { authedRequest, token } = useAuth();
  const { showToast } = useAlert();
  const api = useMemo(() => createActivitiesApi(authedRequest), [authedRequest]);
  const filesApi = useMemo(() => createFilesApi(authedRequest), [authedRequest]);
  const linksApi = useMemo(() => createExternalLinksApi(authedRequest), [authedRequest]);

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fmOpen, setFmOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [links, setLinks] = useState<ExternalLink[]>([]);
  /** فاز ۱۲٫۹: پیام‌های دقیق فایل‌های ناموفق در همان کادر. */
  const [uploadIssues, setUploadIssues] = useState<string[]>([]);

  const onFilesSelected = useCallback((result: FileManagerResult) => {
    const nextFiles: FileItem[] = result.files.map((file) => ({
      id: file.id,
      uploaderId: '',
      originalName: file.originalName,
      fileCode: file.fileCode,
      mimeType: file.mimeType,
      extension: file.extension,
      sizeBytes: file.sizeBytes,
      status: 'uploaded',
      description: null,
      downloadCount: 0,
      createdAt: '',
      uploadedAt: null,
    }));
    setFiles((prev) => {
      const merged = [...prev, ...nextFiles];
      const seen = new Set<string>();
      const unique: FileItem[] = [];
      for (const item of merged) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        unique.push(item);
      }
      return unique;
    });
    setLinks((prev) => {
      const seen = new Set(prev.map((item) => item.id));
      const added = result.links
        .filter((item) => !seen.has(item.id))
        .map((item) => ({
          id: item.id,
          url: item.url,
          description: item.description,
          createdAt: '',
        }));
      return [...prev, ...added];
    });
  }, []);

  /** فاز ۱۲٫۹: کیت Peyk تمام آپلود را در پس‌زمینه انجام می‌دهد و نتیجه می‌دهد. */
  const peykConfig = useMemo(
    () => ({
      upload: createPeykApiUploader(token ?? ''),
      excludeSignatures: files.map((file) => localFileSignature(file.originalName, file.sizeBytes)),
    }),
    [token, files],
  );

  const handlePeykResult = useCallback((result: PeykResult) => {
    if (result.uploaded.length > 0) {
      const added: FileItem[] = result.uploaded.map((file) => ({
        id: file.id,
        uploaderId: '',
        originalName: file.originalName,
        fileCode: file.fileCode ?? '',
        mimeType: file.mimeType ?? 'application/octet-stream',
        extension: file.extension ?? file.originalName.split('.').pop() ?? '',
        sizeBytes: file.sizeBytes ?? 0,
        status: 'uploaded',
        description: null,
        downloadCount: 0,
        createdAt: '',
        uploadedAt: null,
      }));
      setFiles((prev) => [...prev, ...added.filter((item) => !prev.some((old) => old.id === item.id))]);
    }
    const issues = [
      ...result.rejected.map((item) => `${item.name}: ${item.message}`),
      ...result.failed.map((item) => `${item.name}: ${item.message}`),
    ];
    if (issues.length > 0) setUploadIssues((prev) => [...prev, ...issues]);
    const bad = result.rejected.length + result.failed.length;
    if (result.uploaded.length > 0) {
      showToast({
        type: 'success',
        title: `تعداد ${result.uploaded.length} فایل به صورت موفق ارسال شد`,
      });
    }
    if (bad > 0) {
      showToast({ type: 'error', title: `ارسال تعداد ${bad} فایل، ناموفق بود` });
    }
  }, [showToast]);

  const submit = useCallback(
    async (kind: ActivityKind) => {
      const checked = validateActivityText(text);
      if (!checked.ok) {
        setError(checked.reason);
        return;
      }
      if (kind === 'dispute_reply' && !replyTo) {
        setError('نخست کارت بازبینیی را برای پاسخ انتخاب کنید.');
        return;
      }
      if (kind === 'dispute' && hasOpenDispute) {
        setError('بازبینی باز دیگری وجود دارد؛ تا پاسخ مدیر نمی‌توان بازبینی تازه ثبت کرد.');
        return;
      }
      if (files.length > ACTIVITY_MAX_ATTACHMENTS || links.length > ACTIVITY_MAX_ATTACHMENTS) {
        setError('حداکثر ۱۰ پیوست در هر عملیات مجاز است.');
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const created = await api.create(projectId, {
          text: checked.value,
          kind,
          replyToActivityId: kind === 'dispute_reply' ? replyTo?.id : undefined,
          fileIds: files.map((file) => file.id),
          linkIds: links.map((link) => link.id),
          clientNonce: createNonce(),
        });
        const attachErrors: string[] = [];
        if (files.length > 0) {
          try {
            await filesApi.attachFiles(
              files.map((file) => file.id),
              ACTIVITY_ENTITY_TYPE,
              created.activityId,
              ACTIVITY_FILE_ROLE,
            );
          } catch {
            attachErrors.push('فایل‌ها');
          }
        }
        if (links.length > 0) {
          try {
            await linksApi.attachLinks(
              links.map((link) => link.id),
              ACTIVITY_ENTITY_TYPE,
              created.activityId,
              ACTIVITY_FILE_ROLE,
            );
          } catch {
            attachErrors.push('لینکها');
          }
        }
        setText('');
        setFiles([]);
        setLinks([]);
        setUploadIssues([]);
        onClearReply?.();
        showToast({
          type: attachErrors.length > 0 ? 'info' : 'success',
          title: 'عملیات ثبت شد',
          message:
            attachErrors.length > 0
              ? `کارت ثبت شد ولی الصاق ${attachErrors.join(' و ')} انجام نشد؛ دوباره تلاش کنید.`
              : 'کارت تازه در سفارش‌گردانی قرار گرفت.',
        });
        await onCreated();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'ثبت عملیات انجام نشد';
        setError(message);
        showToast({ type: 'error', title: 'ثبت عملیات انجام نشد', message });
      } finally {
        setBusy(false);
      }
    },
    [
      api, files, filesApi, links, linksApi, onClearReply, onCreated,
      projectId, replyTo, showToast, text,
    ],
  );

  return (
    <PeykDropTarget config={peykConfig} onResult={handlePeykResult} disabled={fmOpen}>
    <section className="act-composer" aria-label="ثبت عملیات تازه">
      {replyTo ? (
        <div className="act-composer__reply">
          <Icon name="checkDouble" size={15} />
          <span>پاسخ به: {replyTo.title}</span>
          <button type="button" className="chat-link-btn" onClick={() => onClearReply?.()}>
            انصراف
          </button>
        </div>
      ) : null}

      <label className="act-composer__label" htmlFor="act-text">متن عملیات</label>
      <textarea
        id="act-text"
        className="act-composer__text"
        value={text}
        maxLength={2000}
        rows={3}
        placeholder="یادداشت، توضیح یا متن بازبینی خود را بنویسید…"
        onChange={(event) => setText(event.target.value)}
      />

      <div className="act-composer__chips">
        {files.map((file) => (
          <button
            key={file.id}
            type="button"
            className="act-composer__chip"
            onClick={() => setFiles((prev) => prev.filter((item) => item.id !== file.id))}
            aria-label={`حذف ${file.originalName}`}
          >
            <Icon name="paperclip" size={13} />
            <span dir="ltr" className="file-name-ltr" title={file.originalName}>{shortFileName(file.originalName)}</span>
            <Icon name="x" size={12} />
          </button>
        ))}
        {links.map((link) => (
          <button
            key={link.id}
            type="button"
            className="act-composer__chip"
            onClick={() => setLinks((prev) => prev.filter((item) => item.id !== link.id))}
            aria-label="حذف لینک"
          >
            <Icon name="link" size={13} />
            {link.description || link.url}
            <Icon name="x" size={12} />
          </button>
        ))}
      </div>

      {uploadIssues.length > 0 ? (
        <div className="act-composer__upload-issues" role="alert">
          <strong>فایل‌های زیر ارسال نشدند:</strong>
          <ul>
            {uploadIssues.map((issue, index) => (
              <li key={`${index}-${issue}`}>{issue}</li>
            ))}
          </ul>
          <button type="button" className="chat-link-btn" onClick={() => setUploadIssues([])}>
            پاک کردن پیام‌ها
          </button>
        </div>
      ) : null}

      <div className="act-composer__actions">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFmOpen(true)}
          leadingIcon={<Icon name="paperclip" size={15} />}
        >
          افزودن فایل یا لینک
        </Button>
        <span className="act-composer__spacer" />
        <Button
          variant="primary"
          size="sm"
          disabled={busy}
          loading={busy}
          onClick={() => void submit('note')}
          leadingIcon={!busy ? <Icon name="send" size={15} /> : undefined}
        >
          ثبت یادداشت
        </Button>
        {role === 'customer' ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy || hasOpenDispute}
            title={hasOpenDispute ? 'تا پاسخ بازبینی باز، ثبت بازبینی تازه ممکن نیست' : undefined}
            onClick={() => void submit('dispute')}
          >
            ثبت بازبینی
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !replyTo}
            onClick={() => void submit('dispute_reply')}
          >
            پاسخ بازبینی
          </Button>
        )}
      </div>

      {error ? <div className="act-composer__error" role="alert">{error}</div> : null}

      <FileManagerModal
        open={fmOpen}
        onClose={() => setFmOpen(false)}
        config={{ role, tabs: ['upload', 'select', 'link'], title: 'پیوست عملیات سفارش' }}
        onSelect={onFilesSelected}
      />
    </section>
    </PeykDropTarget>
  );
}
