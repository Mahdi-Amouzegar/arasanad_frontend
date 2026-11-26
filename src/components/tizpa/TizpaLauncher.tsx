'use client';

/**
 * فاز ۱۲٫۲۷ — دکمه و پنجرهٔ «ثبت تیزپا».
 *
 * ⚠️ دکمه در Topbar سراسری AppShell است؛ دکمهٔ شناور جدایی وجود ندارد و
 *    نوار پنجآیتمی موبایل («ثبت سفارش جدید») فرم کامل را همانگونه باز می‌کند.
 * ⚠️ پنجره فقط چهار فیلد نام، نوع خدمت، زبان کار و تعداد صفحات دارد. تمام پیش‌فرضها،
 *    نرخ‌ها و مبالغ از سرور می‌آیند و به هیچوجه در این کامپوننت کپی نمی‌شوند.
 * ⚠️ سفارش تنها پس از آپلود موفق حداقل یک فایل و تأیید کاربر ایجاد می‌شود.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/account';
import { useSiteConfig } from '@/lib/site-config';
import { Button } from '@/components/ui/Button';
import { FormField, Input, Select } from '@/components/ui/Field';
import { FileManagerModal, type FileManagerResult } from '@/components/files/FileManagerModal';
import { Icon } from '@/components/ui/Icon';
import { getFileConfig, type FileConfig } from '@/lib/files/api';
import {
  createProjectsApi,
  getDesignPresets,
  getLanguages,
  getPricingRules,
  getServiceTypes,
  type PricingRules,
  type ServiceType,
  type TizpaCreateResult,
} from '@/lib/projects/api';
import { calculateDeposit, calculateEstimate, isUrgent } from '@/lib/projects/core.mjs';
import { createTizpaApi, type TizpaBatch, type TizpaReservation } from '@/lib/tizpa/api';
import {
  TIZPA_LIMITS,
  UPLOAD_STATES,
  fileSignature,
  summarizeUploads,
  validateClientFile,
  validateTizpaDraft,
} from '@/lib/tizpa/core.mjs';
import {
  runTizpaUploadQueue,
  tizpaAbortRegistry,
  type TizpaUploadItem,
  type TizpaUploadPatch,
} from '@/lib/tizpa/upload';
import { registerBackDismiss } from '@/lib/android-back';
import { errorText } from '@/components/projects/ui-utils';
import { cx } from '@/lib/cx';

const EMPTY_RULES: PricingRules = {
  urgencyMultiplier: 1.3,
  depositRatio: 0.5,
  roundStep: 500,
  deliveryHoursDefault: 48,
};

function visibleService(item: ServiceType): boolean {
  return (
    item.isActive &&
    item.id !== 'fa-en' &&
    !['table-ar', 'table-en'].includes(item.id) &&
    !item.name.includes('فارسی-انگلیسی')
  );
}

function formatAmount(value: number): string {
  return `${Math.round(value).toLocaleString('fa-IR')} تومان`;
}

export function TizpaLauncher() {
  const { token, user, authedRequest } = useAuth();
  const router = useRouter();
  const { order: siteOrder } = useSiteConfig('');
  const [outputFormats, setOutputFormats] = useState<string[]>([]);
  const [creditEnabled, setCreditEnabled] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'credit'>('credit');

  useEffect(() => {
    const allowed = siteOrder.allowedOutputFormats;
    if (allowed.length === 0) return;
    setOutputFormats((current) => {
      const valid = current.filter((item) => allowed.includes(item));
      if (valid.length > 0) return valid;
      const preferred = siteOrder.defaultOutputFormat || allowed[0];
      return preferred ? [preferred] : [];
    });
  }, [siteOrder.defaultOutputFormat, siteOrder.allowedOutputFormats]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void authedRequest<{ creditEnabled: boolean }>('/credit/me')
      .then((data) => { if (alive) setCreditEnabled(data.creditEnabled === true); })
      .catch(() => { if (alive) setCreditEnabled(false); });
    return () => { alive = false; };
  }, [user, authedRequest]);

  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  /**
   * فاز ۱۲٫۳۲-E: قفل اسکرول صفحه پشت تیزپا بدون scroll chaining.
   * ⚠️ اگردیالوگ دیگری قفل را در دست دارد، مالکیت آنرا نگیریم و هنگام بستن
   *    تنها وضعیتی را که خودمان نوشتهایم باز میگردانیم.
   */
  const scrollLockRef = useRef<{ y: number; overflow: string; position: string; top: string; width: string } | null>(null);
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const body = document.body;
    let owned = false;
    if (body.style.overflow !== 'hidden') {
      scrollLockRef.current = {
        y: window.scrollY,
        overflow: body.style.overflow,
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
      };
      body.style.position = 'fixed';
      body.style.top = `-${scrollLockRef.current.y}px`;
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      owned = true;
    }
    return () => {
      const saved = scrollLockRef.current;
      if (!owned || !saved) return;
      body.style.overflow = saved.overflow;
      body.style.position = saved.position;
      body.style.top = saved.top;
      body.style.width = saved.width;
      window.scrollTo(0, saved.y);
      scrollLockRef.current = null;
    };
  }, [open]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [rules, setRules] = useState<PricingRules>(EMPTY_RULES);
  const [config, setConfig] = useState<FileConfig | null>(null);
  const [reservation, setReservation] = useState<TizpaReservation | null>(null);
  const [batch, setBatch] = useState<TizpaBatch | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [language, setLanguage] = useState('');
  const [pageCount, setPageCount] = useState('10');
  const [files, setFiles] = useState<TizpaUploadItem[]>([]);
  const filesRef = useRef<TizpaUploadItem[]>([]);
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const [linkIds, setLinkIds] = useState<string[]>([]);
  const linkIdsRef = useRef<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<TizpaCreateResult | null>(null);
  const keyRef = useRef<{ signature: string; key: string } | null>(null);
  const closingRef = useRef(false);
  /** هر بازشدن پنجره یک نشست مستقل است؛ پاسخهای دیررس نشست قبل نادیده گرفته می‌شوند. */
  const sessionRef = useRef(0);
  const operationKeyRef = useRef<string | null>(null);
  const resultRef = useRef<TizpaCreateResult | null>(null);
  const batchIdCleanedRef = useRef<Set<string>>(new Set());

  const api = useMemo(() => createProjectsApi(authedRequest), [authedRequest]);
  const tizpaApi = useMemo(() => createTizpaApi(authedRequest), [authedRequest]);

  const updateFile = useCallback((id: string, patch: TizpaUploadPatch) => {
    filesRef.current = filesRef.current.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    );
    setFiles(filesRef.current);
  }, []);

  const replaceFiles = useCallback((next: TizpaUploadItem[]) => {
    filesRef.current = next;
    setFiles(next);
  }, []);

  const replaceLinkIds = useCallback((next: string[]) => {
    linkIdsRef.current = next;
    setLinkIds(next);
  }, []);

  const openDialog = useCallback(() => {
    sessionRef.current += 1;
    closingRef.current = false;
    resultRef.current = null;
    operationKeyRef.current = null;
    keyRef.current = null;
    replaceFiles([]);
    replaceLinkIds([]);
    setResult(null);
    setIssues([]);
    setSubmitError(null);
    setSubmitting(false);
    setLanguage('');
    setServiceTypeId('');
    setPageCount('10');
    setDragActive(false);
    setOpen(true);
  }, [replaceFiles, replaceLinkIds]);

  /**
   * بستن تکاقدامی: تمام Abortها، پاک‌سازی سمت سرور و ریست کامل UI.
   * ⚠️ پس از ثبت موفق، سفارش نهایی لغو نمی‌شود؛ بکند تشخیص می‌دهد و محافظت می‌کند.
   */
  const close = useCallback(() => {
    if (closingRef.current && !open) return;
    closingRef.current = true;
    sessionRef.current += 1;
    for (const abort of tizpaAbortRegistry.values()) abort();
    tizpaAbortRegistry.clear();

    const succeeded = resultRef.current?.status === 'completed';
    const hadInFlight = submitting
      || filesRef.current.some((item) =>
        item.state === UPLOAD_STATES.queued || item.state === UPLOAD_STATES.uploading);
    if (!succeeded && batch && !batchIdCleanedRef.current.has(batch.id)) {
      batchIdCleanedRef.current.add(batch.id);
      const operationKey = operationKeyRef.current;
      void tizpaApi.cancelBatch(batch.id, operationKey).catch(() => {
        // در صورت شکست شبکه، Cron پاک‌سازی Batch منقضی به‌عنوان جبرانگر باقی است.
      });
      // اگر آپلود/ثبت در جریان بود، تلاش دوم پس از نهاییشدن سمت سرور،
      // فایلی را که دیررس ذخیره شده باشد هم پاک می‌کند (لغو Idempotent است).
      if (hadInFlight) {
        setTimeout(() => {
          if (resultRef.current?.status === 'completed') return;
          void tizpaApi.cancelBatch(batch.id, operationKey).catch(() => {});
        }, 1200);
      }
    }

    setFileManagerOpen(false);
    setOpen(false);
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
  }, [batch, open, submitting, tizpaApi]);

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return registerBackDismiss(() => {
      if (fileManagerOpen) {
        setFileManagerOpen(false);
        return true;
      }
      close();
      return true;
    });
  }, [open, close, fileManagerOpen]);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setCatalogLoading(true);
    setCatalogError(null);
    setResult(null);
    setIssues([]);
    setSubmitError(null);
    void Promise.all([
      getServiceTypes(),
      getLanguages(),
      getDesignPresets(),
      getPricingRules(),
      getFileConfig(),
      tizpaApi.reserveName(),
    ])
      .then(async ([serviceRows, languageCatalog, _presets, ruleRows, fileConfig, reserved]) => {
        // Batch حتماً پس از رزرو ساخته می‌شود تا لغو عملیات بداند کدام رزرو متعلق به آن است.
        const newBatch = await tizpaApi.createBatch(reserved.id);
        if (!alive) return;
        const visible = serviceRows.filter(visibleService);
        setServices(visible);
        setLanguages(languageCatalog.languages);
        setRules(ruleRows ?? EMPTY_RULES);
        setConfig(fileConfig);
        setReservation(reserved);
        setBatch(newBatch);
        setName(reserved.name);
        setServiceTypeId((current) => current || visible[0]?.id || '');
        setLanguage((current) => current || languageCatalog.defaultLanguage);
        setPageCount('10');
        replaceFiles([]);
        replaceLinkIds([]);
        setFileManagerOpen(false);
        keyRef.current = null;
      })
      .catch((caught) => {
        if (alive) setCatalogError(errorText(caught, 'اطلاعات لازم برای ثبت تیزپا دریافت نشد'));
      })
      .finally(() => {
        if (alive) setCatalogLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, tizpaApi, replaceFiles, replaceLinkIds]);

  const service = services.find((item) => item.id === serviceTypeId) ?? null;
  const pages = Number(pageCount) || 1;
  const estimate = calculateEstimate({
    pricePerPage: service?.pricePerPage ?? 0,
    pages,
    urgent: isUrgent(48),
    multiplier: rules.urgencyMultiplier,
    step: rules.roundStep,
  });
  const deposit = calculateDeposit(estimate, rules.depositRatio, rules.roundStep);
  const summary = summarizeUploads(files);

  const startUploads = useCallback(
    (items: TizpaUploadItem[]) => {
      if (!token || !batch || closingRef.current) return;
      const queued = items.filter((item) => item.state === UPLOAD_STATES.queued);
      if (queued.length === 0) return;
      void runTizpaUploadQueue({
        token,
        batchId: batch.id,
        items: queued,
        onUpdate: updateFile,
        shouldStop: () => closingRef.current,
      });
    },
    [token, batch, updateFile],
  );

  /**
   * مسیر مشترک فایل‌های محلی (Drag & Drop). فایل‌های ردشده به‌صورت کارت خطای
   * غیرقابلتکرار نمایش داده می‌شوند تا وضعیت تکتک فایل‌ها قابل مشاهده بماند.
   */
  function addFiles(incoming: FileList | File[] | null) {
    if (!incoming) return;
    const signatures = new Set(filesRef.current.map((item) => fileSignature(item.name, item.size)));
    const accepted: TizpaUploadItem[] = [];
    const rejected: TizpaUploadItem[] = [];
    for (const file of Array.from(incoming)) {
      const base = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        name: file.name,
        size: file.size,
        attempts: 0,
        progress: 0,
        phase: null,
        fileId: null,
      };
      if (filesRef.current.length + accepted.length + rejected.length >= TIZPA_LIMITS.maxFiles) {
        rejected.push({ ...base, state: UPLOAD_STATES.failed, reason: 'حداکثر ۲۰ فایل مجاز است', retryable: false });
        continue;
      }
      const reason = validateClientFile(file, config, [...signatures]);
      if (reason) {
        rejected.push({ ...base, state: UPLOAD_STATES.failed, reason, retryable: false });
        continue;
      }
      const signature = fileSignature(file.name, file.size);
      signatures.add(signature);
      accepted.push({
        ...base,
        file,
        state: UPLOAD_STATES.queued,
        reason: null,
        retryable: true,
      });
    }
    if (accepted.length > 0 || rejected.length > 0) {
      replaceFiles([...filesRef.current, ...accepted, ...rejected]);
      // همان منطق دکمهٔ انتخاب فایل؛ ترتیب صف حفظ و حداکثر ۲ هم‌زمان اجرا می‌شود.
      startUploads(accepted);
    }
  }

  /**
   * پنجرهٔ مشترک مدیریت فایل: آپلود، فایل موجود یا لینک خارجی.
   * ⚠️ فایل‌های آپلودشده در همان Batch تیزپا ثبت می‌شوند؛ فایل‌های موجود و
   *    لینک‌ها توسط بکند دوباره بررسی و هنگام ایجاد سفارش Snapshot می‌شوند.
   */
  function handleFileManagerSelect(selected: FileManagerResult) {
    const usedIds = new Set(
      filesRef.current.filter((item) => item.fileId).map((item) => item.fileId as string),
    );
    const signatures = new Set(filesRef.current.map((item) => fileSignature(item.name, item.size)));
    const accepted: TizpaUploadItem[] = [];
    const rejected: string[] = [];
    for (const file of selected.files) {
      if (filesRef.current.length + accepted.length >= TIZPA_LIMITS.maxFiles) {
        rejected.push(`${file.originalName}: حداکثر ۲۰ فایل مجاز است`);
        break;
      }
      if (usedIds.has(file.id)) continue;
      const signature = fileSignature(file.originalName, file.sizeBytes);
      if (signatures.has(signature)) continue;
      usedIds.add(file.id);
      signatures.add(signature);
      accepted.push({
        id: `fm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        name: file.originalName,
        size: file.sizeBytes,
        state: UPLOAD_STATES.success,
        attempts: 0,
        progress: 100,
        phase: null,
        fileId: file.id,
        reason: null,
      });
    }
    if (accepted.length > 0) {
      replaceFiles([...filesRef.current, ...accepted]);
    }
    const nextLinks = [
      ...new Set([...linkIdsRef.current, ...selected.links.map((link) => link.id)]),
    ].slice(0, TIZPA_LIMITS.maxFiles);
    replaceLinkIds(nextLinks);
    setIssues(rejected);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer.files);
  }

  function retryFile(id: string) {
    const item = filesRef.current.find((entry) => entry.id === id);
    if (!item || item.state !== UPLOAD_STATES.failed || item.retryable === false) return;
    const retried: TizpaUploadItem = {
      ...item,
      state: UPLOAD_STATES.queued,
      attempts: 0,
      reason: null,
      progress: 0,
    };
    updateFile(id, {
      state: UPLOAD_STATES.queued,
      attempts: 0,
      reason: null,
      progress: 0,
    });
    startUploads([retried]);
  }

  function cancelFile(id: string) {
    tizpaAbortRegistry.get(id)?.();
    updateFile(id, { state: UPLOAD_STATES.cancelled, phase: null, reason: 'ارسال لغو شد' });
  }

  function removeFile(id: string) {
    tizpaAbortRegistry.get(id)?.();
    replaceFiles(filesRef.current.filter((item) => item.id !== id));
  }

  function requestKey(): string {
    const signature = JSON.stringify({
      name,
      serviceTypeId,
      language,
      pages: pageCount,
      fileIds: filesRef.current
        .filter((item) => item.state === UPLOAD_STATES.success && item.fileId)
        .map((item) => item.fileId)
        .sort(),
      linkIds: [...linkIdsRef.current].sort(),
      reservationId: reservation?.id ?? null,
      outputFormat: outputFormats.join(', '),
      paymentMode: creditEnabled ? paymentMode : null,
    });
    if (keyRef.current?.signature !== signature) {
      keyRef.current = { signature, key: crypto.randomUUID() };
    }
    return keyRef.current.key;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    const found = validateTizpaDraft({ name, serviceTypeId, language, sourcePageCount: pageCount });
    const uploaded = filesRef.current.filter(
      (item) => item.state === UPLOAD_STATES.success && item.fileId,
    );
    const attachedLinks = linkIdsRef.current;
    if (uploaded.length === 0 && attachedLinks.length === 0) {
      found.push('حداقل یک فایل یا لینک باید انتخاب شود');
    }
    if (summary.pending > 0) found.push('منتظر پایان آپلود فایل‌ها بمانید');
    if (found.length > 0) {
      setIssues(found);
      return;
    }
    setIssues([]);
    setSubmitting(true);
    const session = sessionRef.current;
    const operationKey = requestKey();
    operationKeyRef.current = operationKey;
    try {
      const created = await api.createTizpaProject({
        name,
        serviceTypeId,
        language,
        sourcePageCount: Number(pageCount),
        outputFormat: outputFormats.length > 0 ? outputFormats : undefined,
        paymentMode: creditEnabled ? paymentMode : undefined,
        fileIds: uploaded.map((item) => item.fileId as string),
        linkIds: attachedLinks,
        idempotencyKey: operationKey,
        reservationId: reservation?.id,
        batchId: batch?.id,
      });
      if (session !== sessionRef.current || closingRef.current) return;
      if (created.status !== 'completed' || !created.project) {
        setSubmitError('سفارش در حال ثبت است؛ لحظاتی بعد دوباره تلاش کنید.');
        return;
      }
      resultRef.current = created;
      setResult(created);
    } catch (caught) {
      if (session !== sessionRef.current || closingRef.current) return;
      setSubmitError(
        errorText(caught, 'ثبت تیزپا انجام نشد؛ فایل‌ها قابل بازیابیاند، دوباره تلاش کنید'),
      );
    } finally {
      if (session === sessionRef.current) setSubmitting(false);
    }
  }

  function fileStateLabel(item: TizpaUploadItem): string {
    if (item.state === UPLOAD_STATES.queued) return 'در صف';
    if (item.state === UPLOAD_STATES.uploading) return `در حال آپلود ${item.progress}%`;
    if (item.state === UPLOAD_STATES.success) return 'آپلود موفق';
    if (item.state === UPLOAD_STATES.cancelled) return 'لغو شد';
    if (item.reason?.includes('پسوند')) return 'خطای نوع فایل';
    if (item.reason?.includes('حجم')) return 'خطای حجم فایل';
    return 'خطای شبکه';
  }

  return (
    <>
      <button
        type="button"
        className="topbar__tizpa"
        onClick={openDialog}
        aria-label="ثبت تیزپا"
        title="ثبت تیزپا"
      >
        <Icon name="plus" size={16} />
        <span>ثبت تیزپا</span>
      </button>

      <dialog
        ref={dialogRef}
        className="fm-modal tizpa-modal"
        aria-labelledby="tizpa-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className="fm-modal__shell">
          <header className="fm-modal__header">
            <h2 className="fm-modal__title" id="tizpa-title">ثبت تیزپا</h2>
            <button
              type="button"
              className="fm-modal__close"
              aria-label="بستن پنجرهٔ ثبت تیزپا"
              onClick={close}
            >
              <Icon name="x" size={18} />
            </button>
          </header>

          <div className="fm-modal__body">
            {catalogLoading ? (
              <p className="tizpa-note" role="status">در حال آماده‌سازی ثبت تیزپا…</p>
            ) : catalogError ? (
              <p className="tizpa-note tizpa-note--error" role="alert">{catalogError}</p>
            ) : result?.project ? (
              <div className="tizpa-result" role="status">
                <div className="tizpa-result__badge"><Icon name="check" size={22} /></div>
                <h3>{result.name ?? result.project.name}</h3>
                <p className="tizpa-result__code">کد سفارش: <strong>{result.code ?? result.project.code}</strong></p>
                <p>
                  {result.uploadedCount ?? 0} فایل و {result.linkedCount ?? 0} لینک با موفقیت پیوست شد
                  {summary.failed > 0 ? ` و ${summary.failed} فایل ناموفق ماند` : ''}.
                </p>
                {summary.failed > 0 ? (
                  <ul className="tizpa-result__failed">
                    {files
                      .filter((item) => item.state === UPLOAD_STATES.failed)
                      .map((item) => (
                        <li key={item.id}>{item.name}: {item.reason ?? 'ناموفق'}</li>
                      ))}
                  </ul>
                ) : null}
                <p className="tizpa-note">
                  نرخ نهایی و بیعانه توسط مدیر تعیین می‌شود و تا آن هنگام سفارش در وضعیت بررسی است.
                </p>
                <div className="tizpa-result__actions">
                  <Link
                    className="btn btn--primary btn--sm"
                    href={`/panel/projects/detail/?id=${encodeURIComponent(result.project.id)}`}
                    onClick={close}
                  >
                    دیدن سفارش
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setResult(null);
                    router.refresh();
                    close();
                  }}>
                    بستن
                  </Button>
                </div>
              </div>
            ) : (
              <form className="tizpa-form" onSubmit={submit}>
                <div className="tizpa-form__fields">
                  <FormField label="نام سفارش" htmlFor="tizpa-name" required>
                    <Input
                      id="tizpa-name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={TIZPA_LIMITS.maxNameLength}
                      required
                    />
                  </FormField>
                  <div className="tizpa-form__row">
                    <FormField label="نوع خدمت" htmlFor="tizpa-service" required>
                      <Select
                        id="tizpa-service"
                        value={serviceTypeId}
                        onChange={(event) => setServiceTypeId(event.target.value)}
                        required
                      >
                        <option value="">انتخاب خدمت</option>
                        {services.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="زبان کار" htmlFor="tizpa-language" required>
                      <Select
                        id="tizpa-language"
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                        required
                      >
                        <option value="">انتخاب زبان</option>
                        {languages.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </Select>
                    </FormField>
                    <FormField label="تعداد صفحات" htmlFor="tizpa-pages" required>
                      <Input
                        id="tizpa-pages"
                        type="number"
                        min={TIZPA_LIMITS.minPages}
                        max={TIZPA_LIMITS.maxPages}
                        value={pageCount}
                        onChange={(event) => setPageCount(event.target.value)}
                        required
                      />
                    </FormField>
                  </div>
                  <div className="tizpa-form__compact">
                    {siteOrder.allowedOutputFormats.length > 0 && (
                      <div className="tizpa-compact tizpa-compact--formats">
                        <span id="tizpa-output-format-label">خروجی</span>
                        <div
                          className="tizpa-format-options"
                          role="group"
                          aria-labelledby="tizpa-output-format-label"
                          aria-describedby="tizpa-output-format-hint"
                        >
                          {siteOrder.allowedOutputFormats.map((item) => (
                            <label key={item} className="tizpa-format-option">
                              <input
                                type="checkbox"
                                checked={outputFormats.includes(item)}
                                onChange={(event) =>
                                  setOutputFormats((current) =>
                                    event.target.checked
                                      ? Array.from(new Set([...current, item]))
                                      : current.filter((value) => value !== item),
                                  )
                                }
                              />
                              {item}
                            </label>
                          ))}
                          {['Word', 'PDF'].every((item) => siteOrder.allowedOutputFormats.includes(item)) ? (
                            <label className="tizpa-format-option">
                              <input
                                type="checkbox"
                                checked={outputFormats.includes('Word') && outputFormats.includes('PDF')}
                                onChange={(event) =>
                                  setOutputFormats(event.target.checked ? ['Word', 'PDF'] : [])
                                }
                              />
                              Word / PDF
                            </label>
                          ) : null}
                        </div>
                      </div>
                    )}
                    {creditEnabled && (
                      <label className="tizpa-compact">
                        <span>پرداخت</span>
                        <select
                          id="tizpa-payment-mode"
                          value={paymentMode}
                          onChange={(event) =>
                            setPaymentMode(event.target.value as 'cash' | 'credit')}
                        >
                          <option value="credit">اعتباری</option>
                          <option value="cash">نقدی</option>
                        </select>
                      </label>
                    )}
                  </div>
                </div>
                {outputFormats.length === 0 && siteOrder.allowedOutputFormats.length > 0 ? (
                  <p className="tizpa-note--error" role="alert">
                    حداقل یک فرمت خروجی (Word یا PDF) انتخاب کنید.
                  </p>
                ) : null}

                <div
                  className={cx('tizpa-drop', dragActive && 'tizpa-drop--active')}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={onDrop}
                >
                  <Icon name="upload" size={22} />
                  <p>فایل‌ها را اینجا بکشید یا از طریق دکمهٔ زیر انتخاب کنید</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={catalogLoading || !batch || !config}
                    onClick={() => setFileManagerOpen(true)}
                  >
                    انتخاب فایل
                  </Button>
                  <span className="tizpa-drop__hint">
                    حداکثر ۲۰ فایل، هر فایل تا ۵۰ مگابایت
                  </span>
                </div>

                {files.length > 0 ? (
                  <ul className="tizpa-files">
                    {files.map((item) => (
                      <li key={item.id} className={cx('tizpa-file', `tizpa-file--${item.state}`)}>
                        <div className="tizpa-file__main">
                          <span className="tizpa-file__name" title={item.name}>{item.name}</span>
                          <span className="tizpa-file__size">
                            {Math.max(1, Math.round(item.size / 1024)).toLocaleString('fa-IR')} KB
                          </span>
                          <span className="tizpa-file__state">
                            {fileStateLabel(item)}
                          </span>
                        </div>
                        {item.phase === 'confirming' ? (
                          <span className="tizpa-file__hint">در انتظار تأیید سرور</span>
                        ) : null}
                        {item.reason ? (
                          <span className="tizpa-file__reason" role="alert">{item.reason}</span>
                        ) : null}
                        {item.state === UPLOAD_STATES.uploading ? (
                          <div className="tizpa-file__bar" aria-hidden="true">
                            <span style={{ width: `${Math.min(100, item.progress)}%` }} />
                          </div>
                        ) : null}
                        <div className="tizpa-file__actions">
                          {item.state === UPLOAD_STATES.failed && item.retryable !== false ? (
                            <Button variant="ghost" size="sm" onClick={() => retryFile(item.id)}>
                              تلاش مجدد
                            </Button>
                          ) : null}
                          {(item.state === UPLOAD_STATES.uploading ||
                            item.state === UPLOAD_STATES.queued) ? (
                            <Button variant="ghost" size="sm" onClick={() => cancelFile(item.id)}>
                              لغو
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="sm" onClick={() => removeFile(item.id)}>
                            حذف
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="tizpa-summary" aria-live="polite">
                  <span>برآورد تقریبی: <strong>{formatAmount(estimate)}</strong></span>
                  <span>پیش‌پرداخت تقریبی: <strong>{formatAmount(deposit)}</strong></span>
                  <span>
                    فایل‌ها: {summary.success} موفق / {summary.failed} ناموفق /
                    {' '}{summary.pending} در جریان
                  </span>
                  <span>لینک‌ها: {linkIds.length}</span>
                  <small>مبالغ فوق پیشنهادی‌اند؛ نرخ نهایی و بیعانه توسط مدیر تعیین می‌شود.</small>
                </div>

                {issues.length > 0 ? (
                  <ul className="tizpa-issues" role="alert">
                    {issues.map((issue) => <li key={issue}>{issue}</li>)}
                  </ul>
                ) : null}
                {submitError ? <p className="tizpa-note--error" role="alert">{submitError}</p> : null}

                <div className="tizpa-form__footer">
                  <Button variant="ghost" onClick={close}>انصراف</Button>
                  <Button
                    type="submit"
                    loading={submitting}
                    disabled={
                      catalogLoading ||
                      outputFormats.length === 0 ||
                      summary.pending > 0 ||
                      (summary.success === 0 && linkIds.length === 0)
                    }
                  >
                    ثبت سفارش
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </dialog>

      <FileManagerModal
        open={fileManagerOpen}
        onClose={() => setFileManagerOpen(false)}
        config={{
          role: 'customer',
          defaultTab: 'upload',
          title: 'فایل‌های سفارش تیزپا',
          tabs: ['upload', 'select', 'link'],
          batchId: batch?.id,
          maxFiles: TIZPA_LIMITS.maxFiles,
          excludeIds: filesRef.current
            .filter((item) => item.fileId)
            .map((item) => item.fileId as string),
          excludeSignatures: filesRef.current.map((item) => fileSignature(item.name, item.size)),
        }}
        onSelect={handleFileManagerSelect}
      />
    </>
  );
}
