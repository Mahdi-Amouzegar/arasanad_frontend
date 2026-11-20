'use client';

import { FileName } from '@/components/ui/FileName';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import {
  createProjectsApi,
  type ProjectDetail as ProjectDetailData,
  type ProjectAction,
} from '@/lib/projects/api';
import { DisputeFlag } from '@/components/activities/DisputeFlag';
import { CopyableCode } from './CopyableCode';
import { ProjectActionDialog } from './ProjectActionDialog';
import {
  createFilesApi,
  createExternalLinksApi,
  isProjectSettled,
  type DeliveryFile,
  type ExternalLink,
  type FileItem,
} from '@/lib/files/api';
import { canTransition } from '@/lib/projects/core.mjs';
import { PROJECT_STATUS_FLOW, computeDeliveryState, type ProjectStatus } from '@/lib/status';
import { serverNow } from '@/lib/connectivity/index.mjs';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { FormField, Input, Select, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { JalaliDate, RelativeTime } from '@/components/ui/JalaliDate';
import { Money } from '@/components/ui/Money';
import {
  FileManagerModal,
  type FileManagerResult,
  type SelectedFile,
} from '@/components/files/FileManagerModal';
import { FileDownloadModal } from '@/components/files/FileDownloadModal';
import { FileActions } from '@/components/files/FileActions';
import { UploaderBadge } from '@/components/files/UploaderBadge';
import { DeliveryCard } from '@/components/files/DeliveryCard';
import { formatNumberFa } from '@/lib/datetime';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  DeliveryStateBadge,
  FinancialStatusBadge,
  ProjectStatusBadge,
} from '@/components/ui/StatusBadge';
import { useAlert } from '@/components/ui/AlertProvider';
import { useChat } from '@/components/chat/ChatProvider';
import { ProjectRating } from './ProjectRating';
import { DesignSpecSnapshot } from './DesignSpecSnapshot';
import {
  designModeLabel,
  designPresetLabel,
  designSubmodeLabel,
  errorText,
  financialHint,
  financialStatusOf,
  formatHours,
  formatProjectCodeSafe,
  statusText,
} from './ui-utils';

function readIdFromLocation(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('id')?.trim() ?? '';
}

function formatBytesFa(bytes: number): string {
  if (bytes < 1024) return `${formatNumberFa(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${formatNumberFa(Math.round(bytes / 1024))} کیلوبایت`;
  return `${formatNumberFa(Math.round(bytes / (1024 * 1024)))} مگابایت`;
}

/** Owner/admin detail view. Static-export safe: the id comes from the query. */
export function ProjectDetail() {
  const { user, loading: authLoading, authedRequest } = useAuth();
  const { showAlert, showToast } = useAlert();
  const { signedIn, openChat } = useChat();
  const api = useMemo(() => createProjectsApi(authedRequest), [authedRequest]);
  const filesApi = useMemo(() => createFilesApi(authedRequest), [authedRequest]);
  const linksApi = useMemo(() => createExternalLinksApi(authedRequest), [authedRequest]);

  const [id, setId] = useState('');
  const [detail, setDetail] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  /** فاز ۱۰: مودال اقدام مالی سرورمحور (همان قرارداد ستون اقدام فهرست). */
  const [activeAction, setActiveAction] = useState<ProjectAction | null>(null);
  const role: 'admin' | 'customer' = user?.role === 'admin' ? 'admin' : 'customer';

  const [note, setNote] = useState('');
  const [quoteRate, setQuoteRate] = useState('');
  const [reason, setReason] = useState('');
  const [nextStatus, setNextStatus] = useState('');

  /* ── فاز ۸: فایل‌های اولیه، لینکها و تحویل‌ها ── */
  const [initialFiles, setInitialFiles] = useState<FileItem[]>([]);
  const [initialLinks, setInitialLinks] = useState<ExternalLink[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryFile[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  /* ── فاز ۸: فرم «تحویل کار» مخصوص مدیر ── */
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [fmOpen, setFmOpen] = useState(false);
  const [deliveryFiles, setDeliveryFiles] = useState<SelectedFile[]>([]);
  const [deliveryPageCount, setDeliveryPageCount] = useState('');
  const [deliveryAmount, setDeliveryAmount] = useState('');
  const [deliveryDescription, setDeliveryDescription] = useState('');
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  useEffect(() => setId(readIdFromLocation()), []);

  /**
   * فایل‌ها، لینکها و تحویل‌ها جداگانه بارگذاری می‌شوند تا شکست یکی از آنها
   * کل صفحه‌ی جزئیات سفارش را از کار نیندازد.
   */
  const loadFiles = useCallback(async () => {
    if (!id) return;
    try {
      const [files, links, deliveryRows] = await Promise.all([
        filesApi.listFilesByEntity('project_initial', id, 'initial_file'),
        linksApi.listLinksByEntity('project_initial', id),
        filesApi.listDeliveries(id),
      ]);
      setInitialFiles(files);
      setInitialLinks(links);
      setDeliveries(deliveryRows);
      setFilesError(null);
    } catch (caught) {
      setFilesError(errorText(caught, 'بارگذاری فایل‌های سفارش انجام نشد'));
    }
  }, [filesApi, linksApi, id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getProject(id);
      setDetail(data);
      setError(null);
      setQuoteRate(String(data.project.basePricePerPage));
      setNextStatus('');
      await loadFiles();
    } catch (caught) {
      setError(errorText(caught, 'سفارش یافت نشد یا دسترسی به آن ندارید'));
    } finally {
      setLoading(false);
    }
  }, [api, id, loadFiles]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    void load();
  }, [id, load]);

  const run = useCallback(
    async (label: string, action: () => Promise<unknown>, success: string) => {
      if (!id) return;
      setBusy(true);
      setActionError(null);
      try {
        await action();
        await load();
        showToast({ type: 'success', title: label, message: success });
      } catch (caught) {
        const message = errorText(caught, `${label} انجام نشد`);
        setActionError(message);
        showToast({ type: 'error', title: `${label} انجام نشد`, message });
      } finally {
        setBusy(false);
      }
    },
    [id, load, showToast],
  );

  function submitNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = note.trim();
    if (!text) return;
    void run(
      'ثبت یادداشت',
      async () => {
        await api.addNote(id, text);
        setNote('');
      },
      'یادداشت اضافه شد',
    );
  }

  function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const rate = Number(quoteRate);
    const base = detail?.project.basePricePerPage ?? 0;
    if (!Number.isInteger(rate) || rate < 1) {
      setActionError('نرخ باید یک عدد صحیح مثبت باشد');
      return;
    }
    if (rate < base) {
      setActionError('نرخ پیشنهادی نمی‌تواند کمتر از نرخ پایه باشد');
      return;
    }
    if (rate > base && reason.trim().length === 0) {
      setActionError('برای افزایش نرخ، دلیل الزامی است');
      return;
    }
    void run(
      'تعیین نرخ',
      () => api.submitQuote(id, rate, reason.trim()),
      'نرخ نهایی ثبت شد',
    );
  }

  function submitStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextStatus) return;
    void run('تغییر وضعیت', () => api.changeStatus(id, nextStatus, reason.trim()), 'وضعیت به‌روز شد');
  }

  async function cancelProject() {
    const confirmed = await showAlert({
      type: 'danger-confirm',
      title: 'لغو سفارش',
      message:
        'پیش از پرداخت بیعانه، سفارش مستقیم لغو می‌شود؛ پس از آن، درخواست لغو برای مدیر ارسال می‌شود.',
      confirmText: 'درخواست لغو',
    });
    if (!confirmed) return;
    await run('لغو سفارش', () => api.cancelProject(id, reason.trim()), 'درخواست لغو ثبت شد');
  }

  async function decideCancel(approve: boolean) {
    await run(
      approve ? 'تأیید لغو' : 'رد لغو',
      () => api.decideCancel(id, approve, reason.trim()),
      approve ? 'سفارش لغو شد' : 'درخواست لغو رد شد',
    );
  }

  /* ───────────────── فاز ۸: فایل و تحویل نهایی ───────────────── */

  function openInitialFile(file: FileItem) {
    setPreviewFile(file);
    setPreviewOpen(true);
  }

  function handleDeliveryFiles(result: FileManagerResult) {
    setDeliveryFiles((previous) => [...previous, ...result.files]);
  }

  async function submitDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeliveryError(null);

    const pageCount = Number(deliveryPageCount);
    const amount = Number(deliveryAmount);
    if (!Number.isInteger(pageCount) || pageCount < 1) {
      setDeliveryError('تعداد صفحات باید یک عدد صحیح مثبت باشد');
      return;
    }
    if (!Number.isInteger(amount) || amount < 0) {
      setDeliveryError('مبلغ باید عدد صحیح نامنفی باشد');
      return;
    }
    if (deliveryFiles.length === 0) {
      setDeliveryError('حداقل یک فایل نهایی انتخاب کنید');
      return;
    }

    setDeliveryBusy(true);
    try {
      await filesApi.createDelivery(id, {
        pageCount,
        amount,
        description: deliveryDescription.trim() || undefined,
        fileIds: deliveryFiles.map((file) => file.id),
      });
      setDeliveryFiles([]);
      setDeliveryPageCount('');
      setDeliveryAmount('');
      setDeliveryDescription('');
      setDeliveryOpen(false);
      await loadFiles();
      showToast({
        type: 'success',
        title: 'تحویل ثبت شد',
        message: 'فایل نهایی به سفارش اضافه شد',
      });
    } catch (caught) {
      const message = errorText(caught, 'ثبت تحویل انجام نشد');
      setDeliveryError(message);
      showToast({ type: 'error', title: 'ثبت تحویل انجام نشد', message });
    } finally {
      setDeliveryBusy(false);
    }
  }

  async function changePaymentStatus(
    delivery: DeliveryFile,
    status: 'pending' | 'paid',
  ) {
    try {
      await filesApi.updateDeliveryPaymentStatus(delivery.id, status);
      await loadFiles();
      showToast({
        type: 'success',
        title: status === 'paid' ? 'تسویه تأیید شد' : 'تأیید تسویه لغو شد',
      });
    } catch (caught) {
      showToast({
        type: 'error',
        title: 'تغییر وضعیت انجام نشد',
        message: errorText(caught, 'تغییر وضعیت پرداخت انجام نشد'),
      });
    }
  }

  if (authLoading || loading) {
    return (
      <div className="prj-stack" aria-busy="true">
        <Skeleton height={96} />
        <Skeleton height={220} />
        <Skeleton height={160} />
      </div>
    );
  }

  if (!id || error || !detail) {
    return (
      <Card>
        <CardBody>
          <div className="prj-gate">
            <Icon name="alert" size={28} />
            <h2>{error ?? 'شناسه‌ی سفارش مشخص نیست'}</h2>
            <p>
              برای دیدن جزئیات، سفارش را از فهرست سفارش‌ها باز کنید. نمایش جزئیات نیازمند
              ورود به حساب است.
            </p>
            <div className="prj-actions">
              {!user ? (
                <Link className="btn btn--primary btn--sm" href="/login/">
                  ورود به حساب
                </Link>
              ) : null}
              <Link className="btn btn--outline btn--sm" href="/panel/projects/">
                فهرست سفارش‌ها
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  const { project, history, notes } = detail;
  const isAdmin = user?.role === 'admin';
  const isOwner = Boolean(user && (!project.customerId || project.customerId === user.id));
  // فاز ۱۲٫۱۰-ب: «سفارشگردانی» از سلول اقدام به هدر کارت منتقل می‌شود؛
  // «جزئیات سفارش» چون خود صفحه‌ی جزئیات است، حذف می‌شود.
  const headerActions = (Array.isArray(project.availableActions)
    ? project.availableActions
    : []
  ).filter((item) => item.kind === 'link' && item.id !== 'view_detail');
  const operationsAction = headerActions.find((item) => item.id === 'open_operations');
  const detailCellActions = (Array.isArray(project.availableActions)
    ? project.availableActions
    : []
  ).filter(
    (item) =>
      (item.kind === 'button' || item.kind === 'link') &&
      item.id !== 'view_detail' &&
      item.id !== 'open_operations',
  );
  // فاز ۱۲٫۸-ز: پس از لغو، عملیات و یادداشت‌ها غیرفعال می‌شوند.
  const isCancelled = project.status === 'cancelled';
  // سیگنال سراسری تسویه نهایی؛ در کنار paymentStatus هر تحویل بررسی می‌شود.
  const projectSettled = isProjectSettled(project.status);
  const deliveryState = computeDeliveryState({
    depositPaidAt: project.depositPaidAt,
    deliveryHours: project.deliveryHours,
    deliveredAt: project.deliveredAt,
    now: serverNow(),
  });
  const allowedTransitions = PROJECT_STATUS_FLOW.filter((status) =>
    canTransition(project.status, status),
  );

  return (
    <div className="prj-stack">
      <Card>
        <CardHeader
          title={
            <span className="prj-headline">
              <CopyableCode value={formatProjectCodeSafe(project.code)} />
              <span>{project.name}</span>
              {/* فاز ۱۰ (D-355): اعتراض فقط یک نشانگر است، وضعیت را عوض نمی‌کند. */}
              <DisputeFlag
                projectId={project.id}
                projectName={project.name}
                openDispute={project.openDispute}
                role={role}
                onResolved={() => void load()}
              />
            </span>
          }
          actions={
            <div className="row" style={{ gap: 'var(--sp-2)' }}>
              {/* فاز ۱۲٫۱۰-ب: «سفارشگردانی» قبل از گفتگو، در هدر کارت. */}
              {operationsAction?.href?.startsWith('/') && !operationsAction.href.startsWith('//') ? (
                <Link
                  className="btn btn--primary btn--sm"
                  href={operationsAction.href}
                  title={operationsAction.hint ?? operationsAction.label}
                >
                  <Icon name="activity" size={16} />
                  {operationsAction.label}
                </Link>
              ) : null}
              {/* فاز ۹، بند ۳: مخاطب از روی سفارش توسط سرور تعیین می‌شود؛
                  مشتری → مدیر، مدیر → مشتری صاحب سفارش. جستجو لازم نیست. */}
              {signedIn ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => void openChat({ projectId: id, projectLabel: project.name }, 'drawer')}
                >
                  <Icon name="chat" size={16} />
                  گفتگو با مخاطب
                </button>
              ) : null}
              <Link className="btn btn--ghost btn--sm" href="/panel/projects/">
                بازگشت به فهرست
              </Link>
            </div>
          }
        />
        <CardBody>
          {/* فاز ۱۲٫۹-س: نشانگر اعتراض در ردیف نشانها، با تاکید قرمز. */}
          <div className="prj-badges">
            <ProjectStatusBadge status={project.status as ProjectStatus} />
            <FinancialStatusBadge status={financialStatusOf(project)} />
            {deliveryState ? <DeliveryStateBadge state={deliveryState} /> : null}
            {(Array.isArray(project.availableActions) ? project.availableActions : [])
              .filter((item) => item.kind === 'flag')
              .map((item) => (
                <DisputeFlag
                  key={item.id}
                  projectId={project.id}
                  projectName={project.name}
                  openDispute={project.openDispute}
                  role={role}
                  label={item.label}
                  variant="name"
                  onResolved={() => void load()}
                />
              ))}
          </div>
          {/* فاز ۱۰: اقدامهای مالی دقیقاً همان availableActions[] فهرست. */}
          {(() => {
            const buttons = detailCellActions;
            if (buttons.length === 0) return null;
            return (
              <div className="prj-action-cell prj-action-cell--detail">
                {buttons.map((item, index) => {
                  const className = `btn btn--sm ${index === 0 ? 'btn--primary' : 'btn--outline'}`;
                  if (item.kind === 'link' && item.href?.startsWith('/') && !item.href.startsWith('//')) {
                    return (
                      <Link key={item.id} className={className} href={item.href} title={item.hint}>
                        {item.label}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={className}
                      onClick={() => setActiveAction(item)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            );
          })()}
          <p className="prj-note">
            {financialHint(project) ?? 'وضعیت مالی و وضعیت پروژه جداگانه نمایش داده می‌شوند.'}
          </p>

          <div className="prj-facts">
            <div><span>خدمت</span><strong>{project.serviceName}</strong></div>
            <div><span>زبان</span><strong>{project.language}</strong></div>
            <div><span>نوع منبع</span><strong>{project.sourceType}</strong></div>
            <div><span>تعداد صفحه</span><strong>{project.sourcePageCount}</strong></div>
            <div><span>مهلت تحویل</span><strong>{formatHours(project.deliveryHours)}</strong></div>
            <div><span>فرمت خروجی</span><strong>{project.outputFormat}</strong></div>
            <div><span>تاریخ ثبت</span><strong><JalaliDate value={project.createdAt} /></strong></div>
            <div>
              <span>شروع مهلت</span>
              <strong>
                {project.depositPaidAt ? (
                  <JalaliDate value={project.depositPaidAt} />
                ) : (
                  'پس از تأیید بیعانه'
                )}
              </strong>
            </div>
          </div>

          {project.description ? <p className="prj-note">{project.description}</p> : null}
          {project.specialRequirements ? (
            <div className="prj-special-req">
              <strong className="prj-special-req__title">نیازمندی‌های ویژه</strong>
              <p className="prj-special-req__body">{project.specialRequirements}</p>
            </div>
          ) : null}
          {isAdmin && project.customerDisplayName ? (
            <p className="prj-note">مشتری: {project.customerDisplayName}</p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="نمای مالی ثبت‌شده" />
        <CardBody>
          <div className="prj-facts">
            <div><span>نرخ پایه‌ی هر صفحه</span><strong><Money value={project.basePricePerPage} /></strong></div>
            <div>
              <span>نرخ اعلام‌شده</span>
              <strong>
                {project.quotedPricePerPage !== null && project.quotedPricePerPage !== undefined ? (
                  <Money value={project.quotedPricePerPage} />
                ) : (
                  'هنوز اعلام نشده'
                )}
              </strong>
            </div>
            <div><span>مبلغ برآوردی</span><strong><Money value={project.estimateAmount} /></strong></div>
            <div><span>بیعانه</span><strong><Money value={project.depositAmount} /></strong></div>
            <div><span>مبلغ نهایی</span><strong><Money value={project.finalTotal} /></strong></div>
            <div>
              <span>منبع بیعانه</span>
              <strong>{project.depositSource ?? '—'}</strong>
            </div>
          </div>
          {project.quoteReason ? (
            <p className="prj-note">دلیل تغییر نرخ: {project.quoteReason}</p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="مشخصات طراحی ثبت‌شده" />
        <CardBody>
          <div className="prj-facts">
            <div><span>حالت</span><strong>{designModeLabel(project.designMode)}</strong></div>
            <div><span>زیرحالت</span><strong>{designSubmodeLabel(project.designSubmode)}</strong></div>
            <div><span>الگو</span><strong dir="auto">{designPresetLabel(project.designPresetId)}</strong></div>
          </div>
          <DesignSpecSnapshot spec={project.designSpec} />
          <p className="prj-note">
            این snapshot در لحظه‌ی ثبت سفارش ذخیره شده و قابل ویرایش نیست.
          </p>
        </CardBody>
      </Card>

      {/* ── فاز ۸: فایل‌ها و لینکهای اولیه ── */}
      <Card>
        <CardHeader title="فایل‌های پیوست‌شده به سفارش" />
        <CardBody>
          {filesError ? (
            <div className="prj-alert" role="alert">
              <Icon name="alert" size={18} />
              <span>{filesError}</span>
              <Button variant="ghost" size="sm" onClick={() => void loadFiles()}>
                تلاش مجدد
              </Button>
            </div>
          ) : null}

          {initialFiles.length === 0 && initialLinks.length === 0 ? (
            <p className="prj-note">هنوز فایل یا لینکی به این سفارش پیوست نشده است.</p>
          ) : (
            <div className="fm-list">
              {initialFiles.map((file) => (
                <div key={file.id} className="fm-item fm-item--uploaded">
                  <div className="fm-item__icon">
                    <Icon name="fileText" size={20} />
                  </div>
                  <div className="fm-item__body">
                    <FileName name={file.originalName} className="fm-item__name" />
                    <div className="fm-item__meta">
                      <span>{file.fileCode}</span>
                      <span>•</span>
                      <span>{formatBytesFa(file.sizeBytes)}</span>
                      <span>•</span>
                      <RelativeTime value={file.createdAt} />
                      <UploaderBadge username={file.uploaderUsername} avatarUrl={file.uploaderAvatarUrl} sizeBytes={file.sizeBytes} />
                    </div>
                  </div>
                  <FileActions
                    file={file}
                    detailsLabel="اطلاعات و دانلود"
                    onOpenDetails={() => openInitialFile(file)}
                  />
                </div>
              ))}

              {initialLinks.map((link) => (
                <div key={link.id} className="fm-link-item">
                  <div className="fm-link-item__icon">
                    <Icon name="link" size={20} />
                  </div>
                  <div className="fm-link-item__body">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fm-link-item__url"
                    >
                      {link.url}
                    </a>
                    {link.description ? (
                      <div className="fm-link-item__desc">{link.description}</div>
                    ) : null}
                  </div>
                  <RelativeTime value={link.createdAt} />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── فاز ۸: تحویل فایل نهایی ── */}
      <Card>
        <CardHeader
          title="فایل‌های نهایی و تحویل‌ها"
          actions={
            isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeliveryOpen((previous) => !previous)}
                leadingIcon={<Icon name="package" size={14} />}
              >
                {deliveryOpen ? 'بستن فرم تحویل' : 'تحویل کار'}
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          {isAdmin && deliveryOpen ? (
            <form className="prj-stack" onSubmit={submitDelivery} noValidate>
              <div className="prj-grid">
                <FormField label="تعداد صفحات خروجی" htmlFor="dlv-pages" required>
                  <Input
                    id="dlv-pages"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={deliveryPageCount}
                    onChange={(event) => setDeliveryPageCount(event.target.value)}
                  />
                </FormField>
                <FormField label="مبلغ (تومان)" htmlFor="dlv-amount" required>
                  <Input
                    id="dlv-amount"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={deliveryAmount}
                    onChange={(event) => setDeliveryAmount(event.target.value)}
                  />
                </FormField>
              </div>

              <div className="prj-grid prj-grid--one">
                <FormField label="توضیحات تحویل" htmlFor="dlv-desc">
                  <Textarea
                    id="dlv-desc"
                    rows={2}
                    value={deliveryDescription}
                    onChange={(event) => setDeliveryDescription(event.target.value)}
                    placeholder="مثلاً فصل اول و دوم تایپ و صفحه‌آرایی شد"
                  />
                </FormField>
              </div>

              <div className="prj-grid prj-grid--one">
                <FormField label="فایل‌های نهایی" htmlFor="dlv-files" required>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setFmOpen(true)}
                      leadingIcon={<Icon name="paperclip" size={14} />}
                    >
                      انتخاب فایل نهایی
                    </Button>
                    {deliveryFiles.length > 0 ? (
                      <div className="fm-list">
                        {deliveryFiles.map((file) => (
                          <div key={file.id} className="fm-item fm-item--uploaded">
                            <div className="fm-item__icon">
                              <Icon name="fileText" size={20} />
                            </div>
                            <div className="fm-item__body">
                              <FileName name={file.originalName} className="fm-item__name" />
                              <div className="fm-item__meta">
                                <span>{formatBytesFa(file.sizeBytes)}</span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              iconOnly
                              onClick={() =>
                                setDeliveryFiles((previous) =>
                                  previous.filter((item) => item.id !== file.id),
                                )
                              }
                            >
                              <Icon name="x" size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </FormField>
              </div>

              {deliveryError ? (
                <div className="prj-alert" role="alert">
                  <Icon name="alert" size={18} />
                  <span>{deliveryError}</span>
                </div>
              ) : null}

              <div className="prj-actions">
                <Button type="submit" loading={deliveryBusy}>
                  ثبت تحویل
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDeliveryOpen(false)}
                >
                  انصراف
                </Button>
              </div>
            </form>
          ) : null}

          {deliveries.length === 0 ? (
            <p className="prj-note">هنوز تحویلی ثبت نشده است.</p>
          ) : (
            <div className="prj-stack">
              {deliveries.map((delivery) => (
                <DeliveryCard
                  key={delivery.id}
                  delivery={delivery}
                  isAdmin={isAdmin}
                  settlementConfirmed={
                    projectSettled || delivery.paymentStatus === 'paid'
                  }
                  onPaymentStatusChange={
                    isAdmin
                      ? (status) => changePaymentStatus(delivery, status)
                      : undefined
                  }
                  onDownloaded={loadFiles}
                />
              ))}
            </div>
          )}

        </CardBody>
      </Card>

      <Card>
        <CardHeader title="اقدامات" />
        <CardBody>
          {isCancelled ? (
            <p className="prj-alert" role="status">این سفارش لغو شده است؛ عملیاتی قابل ثبت نیست.</p>
          ) : null}
          {actionError ? (
            <div className="prj-alert" role="alert">
              <Icon name="alert" size={18} />
              <span>{actionError}</span>
            </div>
          ) : null}

          <div className="prj-grid prj-grid--one">
            <FormField label="دلیل / توضیح (برای عملیات حساس)" htmlFor="prj-reason">
              <Textarea
                id="prj-reason"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </FormField>
          </div>

          {isOwner && !isCancelled ? (
            <div className="prj-actions">
              {project.status === 'awaiting_deposit' ? (
                <>
                  <Button
                    variant="primary"
                    disabled={busy}
                    onClick={() =>
                      void run('پذیرش نرخ', () => api.acceptQuote(id), 'نرخ پذیرفته شد')
                    }
                  >
                    پذیرش نرخ
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        'درخواست بازبینی',
                        () => api.requestQuoteReview(id),
                        'سفارش به بررسی بازگشت',
                      )
                    }
                  >
                    درخواست بازبینی نرخ
                  </Button>
                </>
              ) : null}
              {!['cancelled', 'cancel_requested'].includes(project.status) ? (
                <Button variant="danger" disabled={busy} onClick={() => void cancelProject()}>
                  لغو سفارش
                </Button>
              ) : null}
            </div>
          ) : null}

          {isAdmin && !isCancelled ? (
            <div className="prj-stack">
              <form className="prj-actions" onSubmit={submitQuote}>
                <FormField label="نرخ هر صفحه (تومان)" htmlFor="prj-quote-rate">
                  <Input
                    id="prj-quote-rate"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={quoteRate}
                    onChange={(event) => setQuoteRate(event.target.value)}
                  />
                </FormField>
                <Button type="submit" variant="primary" loading={busy}>
                  ثبت نرخ نهایی
                </Button>
              </form>

              <form className="prj-actions" onSubmit={submitStatus}>
                <FormField label="تغییر وضعیت" htmlFor="prj-next-status">
                  <Select
                    id="prj-next-status"
                    value={nextStatus}
                    onChange={(event) => setNextStatus(event.target.value)}
                  >
                    <option value="">انتخاب کنید</option>
                    {allowedTransitions.map((status) => (
                      <option key={status} value={status}>
                        {statusText(status)}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <Button type="submit" variant="outline" loading={busy} disabled={!nextStatus}>
                  اعمال وضعیت
                </Button>
              </form>

              {project.status === 'cancel_requested' ? (
                <div className="prj-actions">
                  <Button variant="danger" disabled={busy} onClick={() => void decideCancel(true)}>
                    تأیید لغو
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={() => void decideCancel(false)}>
                    رد درخواست لغو
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {!isOwner && !isAdmin ? (
            <p className="prj-note">اقدامی برای این نشست در دسترس نیست.</p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="یادداشت‌ها" />
        <CardBody>
          {!isCancelled ? (
          <form className="prj-note-form" onSubmit={submitNote}>
            <FormField label="یادداشت تازه" htmlFor="prj-note">
              <Textarea
                id="prj-note"
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </FormField>
            <Button type="submit" variant="outline" size="sm" loading={busy}>
              افزودن یادداشت
            </Button>
          </form>
          ) : null}

          {notes.length === 0 ? (
            <p className="prj-note">یادداشتی ثبت نشده است.</p>
          ) : (
            <ul className="prj-timeline">
              {notes.map((item) => (
                <li key={item.id}>
                  <span className="prj-timeline__meta">
                    {item.authorRole === 'admin' ? 'مدیر' : 'مشتری'} ·{' '}
                    <RelativeTime value={item.createdAt} />
                  </span>
                  <p>{item.text}</p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="تاریخچه‌ی وضعیت‌ها" />
        <CardBody>
          {history.length === 0 ? (
            <p className="prj-note">تغییری ثبت نشده است.</p>
          ) : (
            <ol className="prj-timeline">
              {history.map((item, index) => (
                <li key={`${item.createdAt}-${index}`}>
                  <span className="prj-timeline__meta">
                    {item.fromStatus ? `${statusText(item.fromStatus)} → ` : ''}
                    {statusText(item.toStatus)}
                    {item.toStatus === 'cancelled' && item.changedByRole
                      ? ` توسط ${item.changedByRole === 'admin' ? 'مدیر' : 'مشتری'}`
                      : ''}
                    {' · '}<RelativeTime value={item.createdAt} />
                  </span>
                  {item.reason ? <p>{item.reason}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </CardBody>
      </Card>

      {/* فاز ۱۲٫۹: توضیح مسیر Outbox/اعلان از جزئیات سفارش حذف شد. */}

      {/* فاز ۱۲٫۵-ج-۱: امتیاز مشتری — فقط در سفارش تکمیل‌شده ظاهر می‌شود */}
      <ProjectRating projectId={id} />

      <FileManagerModal
        open={fmOpen}
        onClose={() => setFmOpen(false)}
        config={{
          role: 'admin',
          defaultTab: 'upload',
          title: 'انتخاب فایل نهایی',
          tabs: ['upload', 'select'],
        }}
        onSelect={handleDeliveryFiles}
      />

      <FileDownloadModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        file={previewFile}
        canDownload
      />

      {activeAction && detail ? (
        <ProjectActionDialog
          action={activeAction}
          project={detail.project}
          role={role}
          onClose={() => setActiveAction(null)}
          onDone={() => {
            setActiveAction(null);
            void load();
          }}
        />
      ) : null}
    </div>
  );
}
