'use client';
import { CopyableCode } from '@/components/projects/CopyableCode';

/**
 * فاز ۹٫۵ — کارت عملیات سفارش (§9.5.5).
 *
 * سه استایل پس‌زمینه و آیکن گوشه برای سامانه / مدیر / سفارش‌دهنده؛ در تم تیره
 * هم از متغیرهای `tokens.css` استفاده می‌کند تا خوانا بماند.
 * سابقه فقط الحاقی است: هیچ دکمه‌ی ویرایش یا حذفی وجود ندارد.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { Icon, type IconName } from '@/components/ui/Icon';
import { JalaliDate, RelativeTime } from '@/components/ui/JalaliDate';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatDateFull, formatMoneyFa, toFaDigits } from '@/lib/datetime';
import { PROJECT_STATUS } from '@/lib/status';
import { createFilesApi, createExternalLinksApi, type ExternalLink, type FileItem } from '@/lib/files/api';
import { FileDownloadModal } from '@/components/files/FileDownloadModal';
import { FileActions } from '@/components/files/FileActions';
import type { ActivityItem } from '@/lib/activities/api';
import {
  ACTIVITY_ENTITY_TYPE,
  ACTIVITY_FILE_ROLE,
  actorMeta,
  attachmentCountsOf,
  eventMeta,
  isAutomaticActivity,
} from '@/lib/activities/core.mjs';

interface ActivityCardProps {
  activity: ActivityItem;
  role: 'admin' | 'customer';
  /** فقط مدیر و فقط روی کارت بازبینی — کادر پاسخ را بالا میبرد. */
  onReply?: (activity: ActivityItem) => void;
  /** فاز ۱۲٫۱۹ — اقدامهای سرورمحور روی کارت‌های ثبت و تعیین نرخ. */
  onSetQuote?: () => void;
  onDeclareDeposit?: () => void;
  /** فاز ۱۲٫۲۱: اقدامهای تسویه\u200cی نهایی روی همان کارت عملیات. */
  onDeclareSettlement?: () => void;
  onApproveSettlement?: () => void;
  projectStatus?: string;
}

function statusLabel(status: string | null): string {
  if (!status) return '—';
  const entry = (PROJECT_STATUS as Record<string, { label?: string } | undefined>)[status];
  return entry?.label ?? status;
}

/** پیوست‌ها فقط برای کارتهایی بارگذاری می‌شوند که واقعاً پیوست دارند. */
function ActivityAttachments({ activityId }: { activityId: string }) {
  const { authedRequest } = useAuth();
  const filesApi = useMemo(() => createFilesApi(authedRequest), [authedRequest]);
  const linksApi = useMemo(() => createExternalLinksApi(authedRequest), [authedRequest]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      filesApi.listFilesByEntity(ACTIVITY_ENTITY_TYPE, activityId, ACTIVITY_FILE_ROLE),
      linksApi.listLinksByEntity(ACTIVITY_ENTITY_TYPE, activityId),
    ])
      .then(([fileRows, linkRows]) => {
        if (!alive) return;
        // بکند پیش از بازگرداندن، `isStoredFileValid` و مجوز مالکیت را اعمال کرده است.
        setFiles(fileRows);
        setLinks(linkRows);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [activityId, filesApi, linksApi]);

  if (error) return <div className="act-card__error">پیوست‌ها دریافت نشدند.</div>;
  if (files.length === 0 && links.length === 0) return null;

  return (
    <div className="act-card__attachments">
      {files.map((file) => (
        <div key={file.id} className="act-card__file-actions">
          <FileActions
            file={file}
            onOpenDetails={() => {
              setPreview(file);
              setOpen(true);
            }}
          />
        </div>
      ))}
      {links.map((link) => (
        <a
          key={link.id}
          className="act-card__file"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="link" size={14} />
          {link.description || link.url}
        </a>
      ))}
      <FileDownloadModal
        open={open}
        onClose={() => setOpen(false)}
        file={preview}
        canDownload
      />
    </div>
  );
}

export function ActivityCard({ activity, role, onReply, onSetQuote, onDeclareDeposit, onDeclareSettlement, onApproveSettlement, projectStatus }: ActivityCardProps) {
  const actor = actorMeta(activity.actorKind);
  const event = eventMeta(activity.eventType);
  const automatic = isAutomaticActivity(activity);
  const counts = attachmentCountsOf(activity);
  const hasAttachments = counts.fileCount > 0 || counts.linkCount > 0;
  const isDispute = activity.eventType === 'activity.dispute';
  // فاز ۱۲٫۱۹: دکمه‌ها تنها در همان مرحله قابلنمایشاند؛ وضعیت از سرور می‌آید.
  const showSetQuote =
    role === 'admin' && activity.eventType === 'project.created'
    && projectStatus === 'pending_review' && typeof onSetQuote === 'function';
  const showDepositActions =
    role === 'customer' && ['quote.set', 'deposit.set'].includes(activity.eventType)
    && projectStatus === 'awaiting_deposit' && typeof onDeclareDeposit === 'function';
  // فاز ۱۲٫۲۱: دکمه\u200cی تسویه دقیقاً روی کارت مربوط به همان مرحله ظاهر می\u200cشود.
  const showSettlementDeclare =
    role === 'customer' && activity.eventType === 'delivery.created'
    && projectStatus === 'awaiting_settlement' && typeof onDeclareSettlement === 'function';
  const showSettlementApproval =
    role === 'admin' && activity.eventType === 'final_payment.declared'
    && projectStatus === 'awaiting_settlement_confirmation' && typeof onApproveSettlement === 'function';

  return (
    <article id={`activity-${activity.id}`} className={`act-card act-card--${activity.actorKind}`}>
      <span className="act-card__corner" aria-hidden="true">
        <Icon name={actor.icon as IconName} size={20} />
      </span>

      <header className="act-card__head">
        <span className={`act-card__event act-card__event--${activity.actorKind}`}>
          <Icon name={event.icon as IconName} size={13} />
          {event.label}
        </span>
        <strong className="act-card__title">{activity.title}</strong>
        <span className="act-card__actor">{actor.label}</span>
      </header>

      <div className="act-card__time">
        <Icon name="clock" size={13} />
        <RelativeTime value={activity.createdAt} />
      </div>

      {activity.body ? <p className="act-card__body">{activity.body}</p> : null}

      <dl className="act-card__meta">
        {activity.statusFrom || activity.statusTo ? (
          <div className="act-card__meta-row">
            <dt>تغییر وضعیت</dt>
            <dd>{statusLabel(activity.statusFrom)} ← {statusLabel(activity.statusTo)}</dd>
          </div>
        ) : null}
        {typeof activity.amount === 'number' ? (
          <div className="act-card__meta-row">
            <dt>مبلغ</dt>
            <dd>{formatMoneyFa(activity.amount)}</dd>
          </div>
        ) : null}
        <div className="act-card__meta-row">
          <dt>کد سفارش</dt>
          <CopyableCode value={activity.code ?? '—'} label="کد سفارش" />
        </div>
        <div className="act-card__meta-row">
          <dt>ردیف / ترتیب سروری</dt>
          <dd dir="ltr">
            <Tooltip
              label={`${activity.id} / ${toFaDigits(String(activity.seq))}`}
              pinnable
            >
              <span className="act-card__mono">
                {activity.id.slice(0, 12)}… / {toFaDigits(String(activity.seq))}
              </span>
            </Tooltip>
          </dd>
        </div>
        {activity.correlationId ? (
          <div className="act-card__meta-row">
            <dt>زنجیره</dt>
            <dd dir="ltr">
              <Tooltip label={activity.correlationId} pinnable>
                <span className="act-card__mono">{activity.correlationId.slice(0, 16)}…</span>
              </Tooltip>
            </dd>
          </div>
        ) : null}
        {activity.replyToActivityId ? (
          <div className="act-card__meta-row">
            <dt>پاسخ به</dt>
            <dd dir="ltr">
              <Tooltip label={activity.replyToActivityId} pinnable>
                <span className="act-card__mono">{activity.replyToActivityId.slice(0, 12)}…</span>
              </Tooltip>
            </dd>
          </div>
        ) : null}
        <div className="act-card__meta-row">
          <dt>نوع رویداد</dt>
          <dd>
            <Tooltip label={`شناسهٔ رویداد: ${activity.eventType}`} pinnable>
              <span>{event.label}</span>
            </Tooltip>
          </dd>
        </div>
      </dl>

      {showSetQuote || showDepositActions || showSettlementDeclare || showSettlementApproval ? (
        <div className="act-card__quick">
          {showSetQuote ? (
            <button type="button" className="btn btn--sm btn--primary" onClick={onSetQuote}>
              تعیین نرخ بیعانه
            </button>
          ) : null}
          {showDepositActions ? (
            <>
              <Link
                className="btn btn--sm btn--outline"
                title="مبلغ و مرجع توسط سرور محاسبه می‌شود"
                href={`/panel/pay/?purpose=order&projectId=${encodeURIComponent(activity.projectId)}&stage=deposit`}
              >
                پرداخت / شارژ
              </Link>
              <button type="button" className="btn btn--sm btn--primary" title="اعلام پرداخت بیعانه" onClick={onDeclareDeposit}>
                اعلام پرداخت بیعانه
              </button>
            </>
          ) : null}
          {showSettlementDeclare ? (
            <button type="button" className="btn btn--sm btn--primary" onClick={onDeclareSettlement}>
              اعلام تسویه
            </button>
          ) : null}
          {showSettlementApproval ? (
            <button type="button" className="btn btn--sm btn--primary" onClick={onApproveSettlement}>
              تأیید تسویه
            </button>
          ) : null}
        </div>
      ) : null}

      <footer className="act-card__foot">
        {/* فاز ۱۲٫۹: سه تیک مستقل؛ تیک تایپیست تنها زمانی که ثبت شده نمایش مییابد. */}
        {([['admin', 'دیده‌شده توسط مدیر'], ['customer', 'دیده‌شده توسط سفارش‌دهنده'], ['typist', 'دیده‌شده توسط تایپیست']] as const)
          .filter(([key]) => key !== 'typist' || activity.seenBy?.typist)
          .map(([key, label]) => {
            const at = activity.seenBy?.[key] ?? null;
            return (
              <Tooltip
                key={key}
                label={at ? `${label} — ${formatDateFull(at)}` : label}
                pinnable
              >
                <span className={`act-card__seen ${at ? 'act-card__seen--yes' : ''}`}>
                  <Icon name={at ? 'checkDouble' : 'clock'} size={13} />
                  {label}
                  {at ? <> · <JalaliDate value={at} variant="relative" withTooltip={false} /></> : null}
                </span>
              </Tooltip>
            );
          })}
        {automatic ? (
          <span className="act-card__auto">خودکار توسط سامانه</span>
        ) : null}
        <span className="act-card__spacer" />
        <Link className="act-card__link" href={`${role === 'admin' ? '/admin/projects/detail/' : '/panel/projects/detail/'}?id=${encodeURIComponent(activity.projectId)}`}>
          <Icon name="package" size={13} />
          جزئیات سفارش
        </Link>
        {role === 'admin' && isDispute && onReply ? (
          <button type="button" className="act-card__link" onClick={() => onReply(activity)}>
            <Icon name="checkDouble" size={13} />
            پاسخ بازبینی
          </button>
        ) : null}
      </footer>

      {hasAttachments ? <ActivityAttachments activityId={activity.id} /> : null}
    </article>
  );
}
