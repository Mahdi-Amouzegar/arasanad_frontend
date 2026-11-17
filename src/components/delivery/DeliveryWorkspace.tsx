'use client';

/**
 * فاز ۱۱ — صفحه‌ی کاری «تحویل، نسخه‌ها و اصلاح».
 *
 * ⚠️ تمام مجوزها از سرور می‌آیند:
 *    - دکمه‌ی تکمیل فقط وقتی `availableActions` شامل `complete_order` باشد.
 *    - دکمه‌ی درخواست اصلاح فقط وقتی `canRequestRevision` از سرور مجاز باشد.
 *    - قفل دانلود فقط از `downloadUnlocked` همان پاسخ سرور خوانده می‌شود.
 * ⚠️ لینک مستقیم دانلود هم دوباره توسط Worker بررسی می‌شود؛ پنهان کردن دکمه
 *    تنها تجربه‌ی کاربر است، نه مرز امنیتی.
 */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Textarea } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { JalaliDate, RelativeTime } from '@/components/ui/JalaliDate';
import { Skeleton } from '@/components/ui/Skeleton';
import { FileDownloadModal } from '@/components/files/FileDownloadModal';
import {
  FileManagerModal,
  type FileManagerResult,
} from '@/components/files/FileManagerModal';
import { formatMoneyFa, formatNumberFa } from '@/lib/datetime';
import { errorText } from '@/components/projects/ui-utils';
import { createFilesApi, type FileItem } from '@/lib/files/api';
import { createProjectsApi, type Project } from '@/lib/projects/api';
import { operationsHref } from '@/lib/activities/core.mjs';
import {
  createDeliveryApi,
  type DeliveriesPayload,
  type Revision,
  type RevisionsPayload,
} from '@/lib/delivery/api';

type PickerMode = 'delivery' | 'request' | 'response' | null;

function readIdFromLocation(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('id')?.trim() ?? '';
}

function fileNames(files: FileItem[]): string {
  return files.map((file) => file.originalName).join('، ');
}

export function DeliveryWorkspace({ admin = false }: { admin?: boolean }) {
  const { user, loading: authLoading, authedRequest } = useAuth();
  const { showToast } = useAlert();
  const projectsApi = useMemo(() => createProjectsApi(authedRequest), [authedRequest]);
  const deliveryApi = useMemo(() => createDeliveryApi(authedRequest), [authedRequest]);
  const filesApi = useMemo(() => createFilesApi(authedRequest), [authedRequest]);

  const role: 'admin' | 'customer' = admin || user?.role === 'admin' ? 'admin' : 'customer';
  const [id, setId] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [deliveryState, setDeliveryState] = useState<DeliveriesPayload | null>(null);
  const [revisionState, setRevisionState] = useState<RevisionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [pageCount, setPageCount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [responseText, setResponseText] = useState('');
  const [responseTarget, setResponseTarget] = useState<string | null>(null);
  const [justRequested, setJustRequested] = useState(false);
  const [picker, setPicker] = useState<PickerMode>(null);
  const [deliveryFiles, setDeliveryFiles] = useState<string[]>([]);
  const [requestFiles, setRequestFiles] = useState<string[]>([]);
  const [responseFiles, setResponseFiles] = useState<string[]>([]);
  const [downloadTarget, setDownloadTarget] = useState<{
    deliveryId: string;
    file: FileItem;
  } | null>(null);

  useEffect(() => setId(readIdFromLocation()), []);

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  const load = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const [detail, deliveries, revisions] = await Promise.all([
        projectsApi.getProject(id),
        deliveryApi.listDeliveries(id),
        deliveryApi.listRevisions(id),
      ]);
      setProject(detail.project);
      setDeliveryState(deliveries);
      setRevisionState(revisions);
      setPageCount((prev) => prev || String(detail.project.sourcePageCount ?? 1));
      setAmount((prev) => prev || String(detail.project.finance?.finalTarget ?? 0));
      setError(null);
    } catch (caught) {
      setError(errorText(caught, 'اطلاعات تحویل دریافت نشد'));
    } finally {
      setLoading(false);
    }
  }, [deliveryApi, id, projectsApi, user]);

  useEffect(() => {
    if (!id || authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, id, load, reloadKey, user]);

  // فاز ۱۲٫۵-ث: ورود از دکمه «درخواست اصلاح» در جزئیات، مستقیماً به فرم می‌رود.
  useEffect(() => {
    if (typeof window === 'undefined' || !revisionState) return;
    if (new URLSearchParams(window.location.search).get('focus') !== 'revision') return;
    document.getElementById('revision-request')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [revisionState]);

  const canComplete = useMemo(
    () => Boolean(project?.availableActions?.some((action) => action.id === 'complete_order')),
    [project],
  );

  function addPickedFiles(mode: PickerMode, result: FileManagerResult) {
    const ids = result.files.map((file) => file.id).filter(Boolean);
    const setter = mode === 'delivery'
      ? setDeliveryFiles
      : mode === 'request'
        ? setRequestFiles
        : setResponseFiles;
    setter((prev) => Array.from(new Set([...prev, ...ids])).slice(0, 10));
    setPicker(null);
  }

  async function submitDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id || deliveryFiles.length === 0) {
      showToast({ type: 'error', title: 'پیوست تحویل الزامی است' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deliveryApi.createDelivery(id, {
        pageCount: Number(pageCount),
        amount: Number(amount),
        description: description.trim() || undefined,
        fileIds: deliveryFiles,
      });
      showToast({ type: 'success', title: 'نسخه تازه ثبت شد' });
      setDescription('');
      setDeliveryFiles([]);
      reload();
    } catch (caught) {
      setError(errorText(caught, 'ثبت تحویل انجام نشد'));
    } finally {
      setBusy(false);
    }
  }

  async function submitRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await deliveryApi.requestRevision(id, {
        reason: reason.trim(),
        fileIds: requestFiles,
      });
      showToast({ type: 'success', title: 'درخواست اصلاح ثبت شد' });
      setReason('');
      setRequestFiles([]);
      setJustRequested(true);
      reload();
    } catch (caught) {
      setError(errorText(caught, 'درخواست اصلاح ثبت نشد'));
    } finally {
      setBusy(false);
    }
  }

  async function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!responseTarget) return;
    setBusy(true);
    setError(null);
    try {
      await deliveryApi.respondRevision(responseTarget, {
        text: responseText.trim(),
        fileIds: responseFiles,
      });
      showToast({ type: 'success', title: 'پاسخ اصلاح ثبت شد' });
      setResponseTarget(null);
      setResponseText('');
      setResponseFiles([]);
      reload();
    } catch (caught) {
      setError(errorText(caught, 'پاسخ اصلاح ثبت نشد'));
    } finally {
      setBusy(false);
    }
  }

  async function completeOrder() {
    if (!id || !canComplete) return;
    setBusy(true);
    setError(null);
    try {
      await deliveryApi.completeProject(id);
      showToast({ type: 'success', title: 'سفارش تکمیل شد' });
      reload();
    } catch (caught) {
      setError(errorText(caught, 'تکمیل سفارش انجام نشد'));
    } finally {
      setBusy(false);
    }
  }

  async function afterDownload() {
    if (!downloadTarget) return;
    const target = downloadTarget;
    setDownloadTarget(null);
    try {
      await filesApi.markDeliveryDownloaded(target.deliveryId);
    } catch {
      // شکست ثبت آمار نباید تجربه‌ی دانلود موفق را خراب کند.
    }
    reload();
  }

  if (!id) {
    return (
      <EmptyState
        icon={<Icon name="package" size={28} />}
        title="سفارشی انتخاب نشده است"
        description="برای دیدن نسخه‌های تحویل و اصلاح، از فهرست سفارش‌ها وارد این صفحه شوید."
        action={
          <Link
            className="btn btn--primary btn--sm"
            href={admin ? '/admin/projects/' : '/panel/projects/'}
          >
            فهرست سفارش‌ها
          </Link>
        }
      />
    );
  }

  if (!authLoading && !user) {
    return (
      <EmptyState
        icon={<Icon name="shield" size={28} />}
        title="ورود لازم است"
        description="برای مشاهده‌ی تحویل و ثبت اصلاح وارد حساب خود شوید."
        action={<Link className="btn btn--primary btn--sm" href="/login/">ورود</Link>}
      />
    );
  }

  const deliveries = deliveryState?.deliveries ?? [];
  const revisions = revisionState?.revisions ?? [];
  const unlocked = Boolean(deliveryState?.downloadUnlocked);
  const policy = revisionState?.policy;

  return (
    <div className="prj-stack">
      <header className="act-page__head">
        <div>
          <span className="act-page__code">{project?.code ?? ''}</span>
          <h2 className="act-page__title">{project?.name ?? 'تحویل و اصلاح'}</h2>
          <p className="act-page__hint">
            هر تحویل یک نسخه‌ی جداگانه است؛ نسخه‌های پیشین حفظ می‌شوند و دانلود تنها
            پس از تسویه‌ی امانی توسط سرور باز می‌شود.
          </p>
        </div>
        <div className="act-page__actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={reload}
            leadingIcon={<Icon name="refresh" size={15} />}
          >
            بازخوانی
          </Button>
          {canComplete ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => void completeOrder()}
              loading={busy}
              disabled={busy}
              leadingIcon={<Icon name="check" size={15} />}
            >
              تکمیل سفارش
            </Button>
          ) : null}
          <Link
            className="btn btn--outline btn--sm"
            href={`/projects/detail/?id=${encodeURIComponent(id)}`}
          >
            جزئیات سفارش
          </Link>
        </div>
      </header>

      {error ? (
        <div className="prj-alert" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={reload}>تلاش دوباره</Button>
        </div>
      ) : null}

      {loading ? (
        <div className="act-page__skeleton" aria-busy="true">
          <Skeleton height={140} />
          <Skeleton height={140} />
          <Skeleton height={140} />
        </div>
      ) : (
        <>
          {admin ? (
            <Card>
              <CardHeader title="ثبت نسخه‌ی تازه" actions={<Icon name="plus" size={18} />} />
              <CardBody>
                <form className="fin-form" onSubmit={(event) => void submitDelivery(event)}>
                  <label htmlFor="dlv-pages">تعداد صفحات</label>
                  <Input
                    id="dlv-pages" type="number" min={1} max={10000}
                    value={pageCount} onChange={(event) => setPageCount(event.target.value)}
                    required
                  />
                  <label htmlFor="dlv-amount">مبلغ تحویل (تومان)</label>
                  <Input
                    id="dlv-amount" type="number" min={0} step={1} inputMode="numeric"
                    value={amount} onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                  <label htmlFor="dlv-note">توضیح (اختیاری)</label>
                  <Textarea
                    id="dlv-note" rows={2} maxLength={2000}
                    value={description} onChange={(event) => setDescription(event.target.value)}
                  />
                  <div className="prj-action-cell">
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => setPicker('delivery')}
                      leadingIcon={<Icon name="paperclip" size={15} />}
                    >
                      انتخاب فایل ({formatNumberFa(deliveryFiles.length)})
                    </Button>
                    <Button
                      type="submit" variant="primary" size="sm"
                      loading={busy} disabled={busy || deliveryFiles.length === 0}
                    >
                      ثبت تحویل
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="تاریخچه‌ی تحویل"
              actions={<Badge tone={unlocked ? 'success' : 'warning'}>{unlocked ? 'دانلود باز است' : 'دانلود قفل است'}</Badge>}
            />
            <CardBody>
              {!unlocked ? (
                <div className="prj-alert" role="status">
                  <Icon name="shield" size={16} />
                  <span>پس از تأیید تسویه نهایی توسط سرور، لینک دانلود فعال می‌شود.</span>
                </div>
              ) : null}
              {deliveries.length === 0 ? (
                <EmptyState
                  icon={<Icon name="package" size={28} />}
                  title="هنوز تحویلی ثبت نشده است"
                  description={admin ? 'نخستین نسخه را با فرم بالا ثبت کنید.' : 'پس از تحویل فایل توسط مدیر، نسخه‌ها در اینجا نمایش داده می‌شوند.'}
                />
              ) : (
                <div className="dlv-timeline">
                  {deliveries.map((delivery, index) => (
                    <article key={delivery.id} className="dlv-card">
                      <div className="dlv-card__head">
                        <div>
                          <Badge tone={index === 0 ? 'primary' : 'neutral'}>
                            نسخه {formatNumberFa(delivery.version ?? 1)}
                            {index === 0 ? ' — جدیدترین' : ''}
                          </Badge>
                          <h3>{delivery.description || 'تحویل نهایی'}</h3>
                        </div>
                        <span className="dlv-card__date">
                          <JalaliDate value={delivery.createdAt} variant="full" />
                        </span>
                      </div>
                      <div className="dlv-card__meta">
                        <span>صفحات: {formatNumberFa(delivery.pageCount ?? 0)}</span>
                        <span>مبلغ: {formatMoneyFa(delivery.amount ?? 0)}</span>
                        <span>تحویلدهنده: {delivery.deliveredByName ?? 'مدیر'}</span>
                        <span><RelativeTime value={delivery.createdAt} /></span>
                      </div>
                      {delivery.files.length === 0 ? (
                        <p className="prj-note">فایلی به این نسخه متصل نیست.</p>
                      ) : (
                        <div className="dlv-files">
                          {delivery.files.map((file) => (
                            <div key={file.id} className="dlv-file">
                              <div>
                                <Icon name="fileText" size={18} />
                                <strong>{file.originalName}</strong>
                                <code>{file.fileCode}</code>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={!unlocked}
                                leadingIcon={<Icon name="download" size={14} />}
                                onClick={() => setDownloadTarget({ deliveryId: delivery.id, file })}
                              >
                                دانلود
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {delivery.downloadedAt ? (
                        <p className="prj-note">
                          دانلود شده در <JalaliDate value={delivery.downloadedAt} variant="full" />
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {!admin ? (
            <Card id="revision-request">
              <CardHeader
                title="درخواست اصلاح"
                actions={
                  policy ? (
                    <Badge tone="info">
                      {formatNumberFa(revisionState?.used ?? 0)} از {formatNumberFa(policy.maxRequests)}
                    </Badge>
                  ) : undefined
                }
              />
              <CardBody>
                {policy ? (
                  <div className="dlv-policy">
                    <p>{policy.text}</p>
                    <p className="prj-note">
                      پنجره {formatNumberFa(policy.windowDays)} روزه — {policy.scope} — اثر بر مهلت: {policy.effectOnDeadline === 'none' ? 'ندارد' : 'دارد'}
                    </p>
                  </div>
                ) : null}
                {revisionState?.canRequestRevision ? (
                  <form className="fin-form" onSubmit={(event) => void submitRevision(event)}>
                    <label htmlFor="dlv-reason">دلیل اصلاح</label>
                    <Textarea
                      id="dlv-reason" rows={4} maxLength={2000}
                      value={reason} onChange={(event) => setReason(event.target.value)}
                      placeholder="موردی را که نیاز به اصلاح دارد، دقیقاً مشخص کنید."
                      required
                    />
                    <div className="prj-action-cell">
                      <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => setPicker('request')}
                        leadingIcon={<Icon name="paperclip" size={15} />}
                      >
                        پیوست ({formatNumberFa(requestFiles.length)})
                      </Button>
                      <Button
                        type="submit" variant="primary" size="sm"
                        loading={busy} disabled={busy || reason.trim().length === 0}
                      >
                        ثبت درخواست اصلاح
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="prj-note">
                    در حال حاضر ثبت درخواست اصلاح از سرور مجاز نیست. وضعیت سفارش، پنجره‌ی
                    سیاست یا تعداد دفعات مجاز را بررسی کنید.
                  </p>
                )}
                {justRequested ? (
                  <p className="prj-note">
                    کارت عملیات اصلاح ثبت شد.{' '}
                    <Link href={operationsHref('customer', id)} className="btn btn--outline btn--sm">
                      مشاهده کارت عملیات
                    </Link>
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="درخواست‌ها و پاسخهای اصلاح" />
            <CardBody>
              {revisions.length === 0 ? (
                <EmptyState
                  icon={<Icon name="message" size={28} />}
                  title="درخواست اصلاحی ثبت نشده است"
                  description={admin ? 'پاسخ درخواست‌های مشتری در همین صفحه ثبت می‌شود.' : 'در صورت نیاز، درخواست اصلاح خود را بالا ثبت کنید.'}
                />
              ) : (
                <div className="dlv-timeline">
                  {revisions.map((revision: Revision) => (
                    <article key={revision.id} className="dlv-card">
                      <div className="dlv-card__head">
                        <Badge tone={revision.status === 'open' ? 'warning' : 'success'}>
                          {revision.status === 'open' ? 'در انتظار پاسخ' : 'پاسخ داده شد'}
                        </Badge>
                        <span className="dlv-card__date">
                          <JalaliDate value={revision.createdAt} variant="full" />
                        </span>
                      </div>
                      <p className="dlv-text">{revision.reason}</p>
                      {revision.files.length > 0 ? (
                        <p className="prj-note">پیوست‌ها: {fileNames(revision.files)}</p>
                      ) : null}
                      {revision.responseText ? (
                        <div className="dlv-response">
                          <strong>پاسخ مدیر</strong>
                          <p>{revision.responseText}</p>
                          {revision.respondedAt ? (
                            <span><JalaliDate value={revision.respondedAt} variant="full" /></span>
                          ) : null}
                          {revision.responseFiles.length > 0 ? (
                            <p className="prj-note">پیوست پاسخ: {fileNames(revision.responseFiles)}</p>
                          ) : null}
                        </div>
                      ) : null}
                      {admin && revision.status === 'open' ? (
                        responseTarget === revision.id ? (
                          <form className="fin-form" onSubmit={(event) => void submitResponse(event)}>
                            <label htmlFor={`dlv-response-${revision.id}`}>متن پاسخ</label>
                            <Textarea
                              id={`dlv-response-${revision.id}`} rows={3} maxLength={2000}
                              value={responseText}
                              onChange={(event) => setResponseText(event.target.value)}
                              required
                            />
                            <p className="prj-note">
                              پیش از پاسخ می‌توانید{' '}
                              <Link className="btn btn--ghost btn--sm" href="/revision-policy/">
                                <Icon name="shield" size={14} />
                                سیاست اصلاح
                              </Link>{' '}
                              را مطالعه کنید.
                            </p>
                            <div className="prj-action-cell">
                              <Button
                                type="button" variant="outline" size="sm"
                                onClick={() => setPicker('response')}
                                leadingIcon={<Icon name="paperclip" size={15} />}
                              >
                                پیوست ({formatNumberFa(responseFiles.length)})
                              </Button>
                              <Button
                                type="submit" variant="primary" size="sm"
                                loading={busy} disabled={busy || responseText.trim().length === 0}
                              >
                                ثبت پاسخ
                              </Button>
                              <Button
                                type="button" variant="ghost" size="sm"
                                onClick={() => {
                                  setResponseTarget(null);
                                  setResponseText('');
                                  setResponseFiles([]);
                                }}
                              >
                                انصراف
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <Button
                            variant="primary" size="sm"
                            onClick={() => setResponseTarget(revision.id)}
                            leadingIcon={<Icon name="message" size={15} />}
                          >
                            پاسخ به اصلاح
                          </Button>
                        )
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </>
      )}

      <FileDownloadModal
        open={Boolean(downloadTarget)}
        onClose={() => setDownloadTarget(null)}
        file={downloadTarget?.file ?? null}
        canDownload={unlocked}
        lockedMessage={!unlocked ? 'دانلود فایل نهایی پس از تسویه امکانپذیر است' : undefined}
        onDownloaded={() => void afterDownload()}
      />

      <FileManagerModal
        open={picker !== null}
        onClose={() => setPicker(null)}
        config={{
          role,
          tabs: ['upload', 'select'],
          title: picker === 'delivery'
            ? 'انتخاب فایل‌های تحویل'
            : picker === 'response'
              ? 'پیوست پاسخ اصلاح'
              : 'پیوست درخواست اصلاح',
        }}
        onSelect={(result) => addPickedFiles(picker, result)}
      />
    </div>
  );
}
