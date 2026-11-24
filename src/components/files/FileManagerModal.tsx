'use client';

import { CopyableCode } from '@/components/projects/CopyableCode';
import { FileName } from '@/components/ui/FileName';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { RelativeTime } from '@/components/ui/JalaliDate';
import { useAuth } from '@/lib/account';
import { UploaderBadge } from './UploaderBadge';
import { normalizeExternalUrl } from '@/lib/files/links';
import { openFileFromServer } from '@/lib/files/file-open';
import { cx } from '@/lib/cx';
import { formatNumberFa } from '@/lib/datetime';
import {
  uploadFileWithProgress,
  retryUpload,
  type UploadHandle,
  getFileDownloadUrl,
  getFileConfig,
  createFilesApi,
  createExternalLinksApi,
  type FileConfig,
  type FileItem,
  type ExternalLink,
} from '@/lib/files/api';

/* ─────────────────────────── Types ─────────────────────────── */

export type FileManagerTab = 'upload' | 'select' | 'link';

export interface FileManagerConfig {
  /** نقش کاربر: customer فقط آپلود، admin آپلود + حذف */
  role: 'admin' | 'customer';
  /** تب پیش‌فرض */
  defaultTab?: FileManagerTab;
  /** عنوان مودال */
  title?: string;
  /** تب‌های قابل نمایش — مثلاً تحویل نهایی فقط «آپلود» و «انتخاب» دارد */
  tabs?: FileManagerTab[];
  /** جایگزینی سقف حجم سرور (به بایت) */
  maxFileSize?: number;
  /** جایگزینی فهرست پسوندهای مجاز */
  allowedExtensions?: string[];
  /** فاز ۱۲٫۳-ط: فایل‌هایی که قبلاً به صفحهٔ مقصد اضافه شده‌اند. */
  excludeIds?: string[];
  /** اثر انگشت «نام+حجم» فایل‌ها برای جلوگیری از افزودن دوباره. */
  excludeSignatures?: string[];
  /**
   * فاز ۱۲٫۲۷: شناسهٔ Batch تیزپا. هنگامی که تنظیم شود، فایل‌های آپلودشده
   * در همان Batch ثبت می‌شوند تا پاک‌سازی فایل‌های یتیم و Idempotency حفظ شود.
   */
  batchId?: string;
  /** سقف تعداد فایل قابلانتخاب (مثلاً ۲۰ در ثبت تیزپا). */
  maxFiles?: number;
}

export interface SelectedFile {
  id: string;
  originalName: string;
  fileCode: string;
  sizeBytes: number;
  mimeType: string;
  extension: string;
}

export interface SelectedLink {
  id: string;
  url: string;
  description: string | null;
}

export interface FileManagerResult {
  files: SelectedFile[];
  links: SelectedLink[];
}

export interface FileManagerModalProps {
  open: boolean;
  onClose: () => void;
  config: FileManagerConfig;
  onSelect: (result: FileManagerResult) => void;
}

/* ─────────────────────────── Constants ─────────────────────────── */

const DEFAULT_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const DEFAULT_ALLOWED_EXTENSIONS = [
  'zip', 'pdf', 'doc', 'docx', 'xls', 'xlsx',
  'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'rar',
];
const ALL_TABS: FileManagerTab[] = ['upload', 'select', 'link'];

/** هویت پایدار فایل محلی: نام + حجم (برای جلوگیری از افزودن تکراری). */
export function localFileSignature(name: string, size: number): string {
  return `${name.trim().toLowerCase()}|${size}`;
}

/* ─────────────────────────── Component ─────────────────────────── */

export function FileManagerModal({
  open,
  onClose,
  config,
  onSelect,
}: FileManagerModalProps) {
  const { token, authedRequest, user } = useAuth();
  const dialogRef = useRef<HTMLDialogElement>(null);
  /** بند ۷: هنگام باز بودن انتخابگر بومی، لغوdialog نباید پنجرهها را ببندد. */
  const pickerOpenRef = useRef(false);
  const [activeTab, setActiveTab] = useState<FileManagerTab>(
    config.defaultTab ?? 'upload',
  );

  // پیکربندی کتابخانه: مقادیر صریحِ فراخواننده بر پاسخ سرور اولویت دارند.
  const tabsKey = (config.tabs ?? ALL_TABS).join(',');
  const visibleTabs = useMemo(
    () => tabsKey.split(',') as FileManagerTab[],
    [tabsKey],
  );
  const [limits, setLimits] = useState<FileConfig>({
    maxFileSize: config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE_BYTES,
    allowedExtensions: config.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS,
  });

  useEffect(() => {
    if (!open) return undefined;
    if (config.maxFileSize !== undefined && config.allowedExtensions !== undefined) {
      return undefined;
    }
    let alive = true;
    void getFileConfig()
      .then((remote) => {
        if (!alive) return;
        setLimits({
          maxFileSize: config.maxFileSize ?? remote.maxFileSize ?? DEFAULT_MAX_FILE_SIZE_BYTES,
          allowedExtensions:
            config.allowedExtensions ??
            (Array.isArray(remote.allowedExtensions) && remote.allowedExtensions.length > 0
              ? remote.allowedExtensions
              : DEFAULT_ALLOWED_EXTENSIONS),
        });
      })
      .catch(() => {
        // پیکربندی پیش‌فرض همچنان معتبر است؛ مودال نباید بسته شود.
      });
    return () => {
      alive = false;
    };
  }, [open, config.maxFileSize, config.allowedExtensions]);

  // اگر تب فعال در پیکربندی جدید حذف شده باشد، به اولین تب مجاز برمیگردیم.
  useEffect(() => {
    if (open && !visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] ?? 'upload');
    }
  }, [open, visibleTabs, activeTab]);

  // Upload tab state
  const [pendingFiles, setPendingFiles] = useState<Array<{
    file: File;
    status: 'pending' | 'uploading' | 'uploaded' | 'failed';
    fileId?: string;
    error?: string;
    loaded?: number;
    total?: number;
    confirming?: boolean;
  }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  /** فاز ۱۲٫۳-ط: فقط فایل‌ها علامتخورده هنگام «انتخاب فایل‌ها» اضافه می‌شوند. */
  const [selectedUploaded, setSelectedUploaded] = useState<Set<string>>(new Set());
  // فاز ۱۲٫۳-ز: پیام‌ها داخل دیالوگ بومی نمایش می‌شوند؛ toast خارجی
  // حتی با z-index بالا زیر لایه dialog می‌ماند و خوانده نمی‌شود.
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** فاز ۱۲٫۸-هـ: کنترلکنندههای لغو آپلود به ازای هر فایل. */
  const uploadHandlesRef = useRef<Map<number, UploadHandle>>(new Map());

  // Select tab state
  const [existingFiles, setExistingFiles] = useState<FileItem[]>([]);
  const [selectedExisting, setSelectedExisting] = useState<Set<string>>(new Set());
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Link tab state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkDesc, setLinkDesc] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [selectedLinks, setSelectedLinks] = useState<Set<string>>(new Set());
  const [loadingLinks, setLoadingLinks] = useState(false);

  const filesApi = useMemo(() => (authedRequest ? createFilesApi(authedRequest) : null), [authedRequest]);
  const linksApi = useMemo(() => (authedRequest ? createExternalLinksApi(authedRequest) : null), [authedRequest]);

  /** فاز ۱۲٫۹-ه: بازخوانی لیست «فایل‌های موجود» پس از آپلود یا بهدرخواست کاربر. */
  const refreshExistingFiles = useCallback(async () => {
    if (!filesApi) return;
    setLoadingFiles(true);
    try {
      setExistingFiles(await filesApi.listFiles());
    } catch {
      // لیست قبلی نگه داشته می‌شود تا تجربه‌ی کاربر مختل نشود.
    } finally {
      setLoadingFiles(false);
    }
  }, [filesApi]);

  // ─── Dialog open/close ───
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      // فاز ۱۲٫۳-ط: هر بار باز شدن پنجره، صف ارسال و انتخاب‌ها تازه می‌شود.
      setPendingFiles([]);
      setSelectedUploaded(new Set());
      setSelectedExisting(new Set());
      setSelectedLinks(new Set());
      setNotice(null);
      setLinkError(null);
      if (!dialog.open) dialog.showModal();
      // Load existing files and links when opening
      if (filesApi && existingFiles.length === 0) {
        setLoadingFiles(true);
        filesApi.listFiles().then((files) => {
          setExistingFiles(files);
          setLoadingFiles(false);
        }).catch(() => setLoadingFiles(false));
      }
      if (linksApi && links.length === 0) {
        setLoadingLinks(true);
        linksApi.listLinks().then((items) => {
          setLinks(items);
          setLoadingLinks(false);
        }).catch(() => setLoadingLinks(false));
      }
    } else if (dialog.open) {
      // بستن پنجره، آپلودهای در حال اجرا را هم لغو می‌کند؛ فایل ذخیره‌شده
      // توسط مسیر لغو تیزپا (یا Cron) پاک می‌شود و بدون مالک باقی نمی‌ماند.
      for (const handle of uploadHandlesRef.current.values()) handle.abort();
      uploadHandlesRef.current.clear();
      dialog.close();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC and click-outside handled by <dialog> natively
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // انتخابگر بومی پس از بسته شدن (حتی با Cancel) تمرکز را به پنجره برمی‌گرداند.
  // فاز ۱۲٫۲۱: Cancel در گفتگوی سیستم نباید کل مودال را ببندد. آزاد‌سازی قفل
  // با تأخیر کوتاه انجام می‌شود تا رویداد cancel مودال ابتدا مسدود شود؛
  // انتخاب موفق فایل قفل را بلافاصله آزاد می‌کند.
  useEffect(() => {
    let settleTimer: number | undefined;
    const settle = () => {
      if (!pickerOpenRef.current) return;
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => { pickerOpenRef.current = false; }, 500);
    };
    window.addEventListener('focus', settle);
    return () => {
      window.removeEventListener('focus', settle);
      if (settleTimer) window.clearTimeout(settleTimer);
    };
  }, []);

  // ─── Upload tab ───
  const handleFileSelect = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setNotice(null);
    const newFiles: Array<{ file: File; status: 'pending'; loaded: number; total: number }> = [];
    const { maxFileSize, allowedExtensions } = limits;
    for (const file of Array.from(fileList)) {
      const maxFiles = config.maxFiles;
      if (maxFiles !== undefined && pendingFiles.length + newFiles.length >= maxFiles) {
        setNotice({ type: 'error', message: `حداکثر ${maxFiles} فایل قابلانتخاب است` });
        break;
      }
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!allowedExtensions.includes(ext)) {
        setNotice({ type: 'error', message: `فرمت «${ext}» پشتیبانی نمی‌شود؛ مجاز: ${allowedExtensions.join('، ')}` });
        continue;
      }
      if (file.size > maxFileSize) {
        setNotice({ type: 'error', message: `حجم فایل «${file.name}» بیش از ${formatBytesFa(maxFileSize)} است` });
        continue;
      }
      const signature = localFileSignature(file.name, file.size);
      if (
        (config.excludeSignatures ?? []).includes(signature)
        || pendingFiles.some((p) => localFileSignature(p.file.name, p.file.size) === signature)
      ) {
        setNotice({ type: 'error', message: `فایل «${file.name}» قبلاً اضافه شده است` });
        continue;
      }
      newFiles.push({ file, status: 'pending', loaded: 0, total: file.size });
    }
    if (newFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...newFiles]);
    }
  }, [limits, config.excludeSignatures, config.maxFiles, pendingFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadOne = useCallback(async (index: number) => {
    if (!token) return;
    const item = pendingFiles[index];
    if (!item || item.status === 'uploading' || item.status === 'uploaded') return;

    setPendingFiles((prev) => prev.map((p, i) =>
      i === index ? { ...p, status: 'uploading', loaded: 0, total: p.file.size, confirming: false } : p,
    ));
    const onProgress = (loaded: number, total: number, phase: 'uploading' | 'confirming') => {
      setPendingFiles((prev) => prev.map((p, i) =>
        i === index ? { ...p, loaded, total, confirming: phase === 'confirming' } : p,
      ));
    };

    try {
      const handle = uploadFileWithProgress(token, item.file, onProgress, config.batchId);
      uploadHandlesRef.current.set(index, handle);
      const result = await handle.done;
      setPendingFiles((prev) => prev.map((p, i) =>
        i === index ? {
          ...p, status: 'uploaded', fileId: result.id,
          loaded: p.file.size, total: p.file.size, confirming: false,
        } : p,
      ));
      setSelectedUploaded((prev) => new Set(prev).add(localFileSignature(item.file.name, item.file.size)));
    } catch (err) {
      setPendingFiles((prev) => prev.map((p, i) =>
        i === index ? {
          ...p,
          status: 'failed',
          error: err instanceof Error ? err.message : 'آپلود ناموفق',
        } : p,
      ));
    }
  }, [token, pendingFiles, config.batchId]);

  const handleUploadAll = useCallback(async () => {
    const pending = pendingFiles
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.status === 'pending' || p.status === 'failed');
    for (const { i } of pending) {
      await uploadOne(i);
    }
    // فاز ۱۲٫۹-ه: فایل تازه‌آپلودشده بلافاصله در تب «فایل‌های موجود» دیده شود.
    if (pending.length > 0) await refreshExistingFiles();
  }, [pendingFiles, uploadOne, refreshExistingFiles]);

  const handleRetry = useCallback(async (index: number) => {
    const item = pendingFiles[index];
    if (!item || !token) return;
    setPendingFiles((prev) => prev.map((p, i) =>
      i === index ? { ...p, status: 'uploading', loaded: 0, total: p.file.size, confirming: false } : p,
    ));
    const onProgress = (loaded: number, total: number, phase: 'uploading' | 'confirming') => {
      setPendingFiles((prev) => prev.map((p, i) =>
        i === index ? { ...p, loaded, total, confirming: phase === 'confirming' } : p,
      ));
    };
    try {
      // اگر آپلود اولیه در همان لحظه شکست خورده باشد، سرور شناسهای به
      // کلاینت نداده است؛ در این حالت یک آپلود تازه انجام می‌دهیم تا
      // درخواست به `/files//retry` نرود و خطا تکرار نشود.
      const handle = item.fileId
        ? retryUpload(token, item.fileId, item.file, onProgress)
        : uploadFileWithProgress(token, item.file, onProgress, config.batchId);
      uploadHandlesRef.current.set(index, handle);
      const result = await handle.done;
      setPendingFiles((prev) => prev.map((p, i) =>
        i === index ? {
          ...p, status: 'uploaded', fileId: result.id,
          loaded: p.file.size, total: p.file.size, confirming: false,
        } : p,
      ));
      setSelectedUploaded((prev) => new Set(prev).add(localFileSignature(item.file.name, item.file.size)));
      await refreshExistingFiles();
    } catch (err) {
      setPendingFiles((prev) => prev.map((p, i) =>
        i === index ? {
          ...p,
          status: 'failed',
          error: err instanceof Error ? err.message : 'تلاش مجدد ناموفق',
        } : p,
      ));
    }
  }, [token, pendingFiles, refreshExistingFiles, config.batchId]);

  // ─── Select tab ───
  const toggleExistingFile = useCallback((id: string) => {
    setSelectedExisting((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** حذف یک فایل از صف ارسال (پیش از آپلود) — فقط مدیر. */
  const handleRemovePending = useCallback((index: number) => {
    const item = pendingFiles[index];
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    if (item) {
      setSelectedUploaded((prev) => {
        const next = new Set(prev);
        next.delete(localFileSignature(item.file.name, item.file.size));
        return next;
      });
    }
  }, [pendingFiles]);

  /** فاز ۱۲٫۸-هـ: لغو آپلود درحجریان یک فایل و حذف آن از صف. */
  const handleCancelUpload = useCallback((index: number) => {
    uploadHandlesRef.current.get(index)?.abort();
    uploadHandlesRef.current.delete(index);
    handleRemovePending(index);
  }, [handleRemovePending]);

  /** حذف نرم فایل — فقط مدیر (config.role === 'admin'). */
  const handleDeleteExisting = useCallback(
    async (id: string) => {
      if (config.role !== 'admin' || !filesApi) return;
      try {
        await filesApi.deleteFile(id);
        setExistingFiles((prev) => prev.filter((file) => file.id !== id));
        setSelectedExisting((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setNotice({ type: 'success', message: 'فایل حذف شد' });
      } catch (caught) {
        setNotice({ type: 'error', message: caught instanceof Error ? caught.message : 'حذف فایل انجام نشد' });
      }
    },
    [config.role, filesApi],
  );

  // ─── Link tab ───
  const handleAddLink = useCallback(async () => {
    if (!linkUrl.trim() || !linksApi) return;
    setLinkError(null);
    const normalized = normalizeExternalUrl(linkUrl);
    if (!normalized) {
      setLinkError('آدرس لینک معتبر نیست؛ مثال: https://www.example.com/file.pdf');
      return;
    }
    try {
      const link = await linksApi.createLink(
        normalized,
        linkDesc.trim() || undefined,
        config.batchId,
      );
      setLinks((prev) => [link, ...prev]);
      setLinkUrl('');
      setLinkDesc('');
      setNotice({ type: 'success', message: 'لینک اضافه شد' });
    } catch (err) {
      // فاز ۱۲٫۲-ط: خطا زیر همان کادر نمایش داده می‌شود، نه در toast پشت overlay.
      setLinkError(err instanceof Error ? err.message : 'افزودن لینک ناموفق بود');
    }
  }, [linkUrl, linkDesc, linksApi]);

  const toggleLink = useCallback((id: string) => {
    setSelectedLinks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Select result ───
  const handleSelectFiles = useCallback(() => {
    const uploadedFiles = pendingFiles
      .filter((p) => p.status === 'uploaded' && p.fileId)
      .filter((p) => selectedUploaded.has(localFileSignature(p.file.name, p.file.size)))
      .filter((p) => !(config.excludeIds ?? []).includes(p.fileId!))
      .filter((p) => !(config.excludeSignatures ?? []).includes(localFileSignature(p.file.name, p.file.size)))
      .map((p) => ({
        id: p.fileId!,
        originalName: p.file.name,
        fileCode: '',
        sizeBytes: p.file.size,
        mimeType: p.file.type || 'application/octet-stream',
        extension: p.file.name.split('.').pop()?.toLowerCase() ?? '',
      }));

    const selectedFromExisting = existingFiles
      .filter((f) => !(config.excludeIds ?? []).includes(f.id))
      .filter((f) => selectedExisting.has(f.id))
      .map((f) => ({
        id: f.id,
        originalName: f.originalName,
        fileCode: f.fileCode,
        sizeBytes: f.sizeBytes,
        mimeType: f.mimeType,
        extension: f.extension,
      }));

    const allFiles = [...uploadedFiles, ...selectedFromExisting];
    // وقتی تب لینک در پیکربندی پنهان است، انتخاب‌های قدیمی نباید نشت کنند.
    const selectedLinkItems = visibleTabs.includes('link')
      ? links
          .filter((l) => selectedLinks.has(l.id))
          .map((l) => ({ id: l.id, url: l.url, description: l.description }))
      : [];

    onSelect({ files: allFiles, links: selectedLinkItems });
    handleClose();
  }, [
    pendingFiles,
    existingFiles,
    selectedExisting,
    links,
    selectedLinks,
    visibleTabs,
    onSelect,
    handleClose,
    selectedUploaded,
    config.excludeIds,
    config.excludeSignatures,
  ]);

  const hasUploadedFiles = pendingFiles.some((p) =>
    p.status === 'uploaded' && selectedUploaded.has(localFileSignature(p.file.name, p.file.size)));
  const hasSelectedExisting = selectedExisting.size > 0;
  const hasSelectedLinks = visibleTabs.includes('link') && selectedLinks.size > 0;
  const canSelect = hasUploadedFiles || hasSelectedExisting || hasSelectedLinks;
  /** فاز ۱۲٫۹-و: همان دکمه‌ی پایین مودال، ابتدا آپلود و سپس انتخاب را انجام می‌دهد. */
  const hasPendingUpload = pendingFiles.some((p) => p.status === 'pending' || p.status === 'failed');
  const uploading = pendingFiles.some((p) => p.status === 'uploading');

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fm-modal"
      aria-labelledby="fm-title"
      // فاز ۱۲٫۱۵-ج: کلیک داخل پنجره‌ی مشترک نباید مودال پدر را ببندد.
      onMouseDown={(event) => event.stopPropagation()}
      onCancel={(event) => {
        if (pickerOpenRef.current) {
          event.preventDefault();
          return;
        }
        handleClose();
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current && !pickerOpenRef.current) handleClose();
      }}
    >
      <div className="fm-modal__shell">
        {/* Header */}
        <div className="fm-modal__header">
          <h2 id="fm-title" className="fm-modal__title">
            {config.title ?? 'مدیریت فایل‌ها'}
          </h2>
          <button
            className="fm-modal__close"
            onClick={handleClose}
            aria-label="بستن"
            type="button"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {/* Tabs — فقط تب‌های مجاز پیکربندی */}
        <div className="fm-tabs">
          {visibleTabs.includes('upload') ? (
            <button
              type="button"
              className={cx('fm-tab', activeTab === 'upload' && 'fm-tab--active')}
              onClick={() => setActiveTab('upload')}
            >
              <Icon name="upload" size={16} />
              آپلود فایل
            </button>
          ) : null}
          {visibleTabs.includes('select') ? (
            <button
              type="button"
              className={cx('fm-tab', activeTab === 'select' && 'fm-tab--active')}
              onClick={() => setActiveTab('select')}
            >
              <Icon name="file" size={16} />
              فایل‌های موجود
            </button>
          ) : null}
          {visibleTabs.includes('link') ? (
            <button
              type="button"
              className={cx('fm-tab', activeTab === 'link' && 'fm-tab--active')}
              onClick={() => setActiveTab('link')}
            >
              <Icon name="link" size={16} />
              لینک خارجی
            </button>
          ) : null}
        </div>

        {/* Body */}
        <div className="fm-modal__body">
          {notice ? (
            <p className={`fm-notice fm-notice--${notice.type}`} role="alert">{notice.message}</p>
          ) : null}
          {activeTab === 'upload' && visibleTabs.includes('upload') && (
            <UploadTab
              isDragging={isDragging}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onFileSelect={handleFileSelect}
              onPickerOpen={() => { pickerOpenRef.current = true; }}
              onPickerSettled={() => { pickerOpenRef.current = false; }}
              fileInputRef={fileInputRef}
              pendingFiles={pendingFiles}
              uploader={{ username: user?.username, avatarUrl: user?.avatarUrl }}
              selectedUploaded={selectedUploaded}
              onToggleUploaded={(key) => setSelectedUploaded((prev) => {
                const next = new Set(prev);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })}
              onRetry={handleRetry}
              onRemove={handleRemovePending}
              onCancelUpload={handleCancelUpload}
              canDelete={config.role === 'admin'}
              maxSize={limits.maxFileSize}
              allowedExtensions={limits.allowedExtensions}
            />
          )}
          {activeTab === 'select' && visibleTabs.includes('select') && (
            <SelectTab
              files={existingFiles}
              excludeIds={config.excludeIds ?? []}
              loading={loadingFiles}
              selected={selectedExisting}
              onToggle={toggleExistingFile}
              token={token}
              canDelete={config.role === 'admin'}
              onDelete={handleDeleteExisting}
              onRefresh={() => void refreshExistingFiles()}
              refreshing={loadingFiles}
            />
          )}
          {activeTab === 'link' && visibleTabs.includes('link') && (
            <LinkTab
              url={linkUrl}
              desc={linkDesc}
              onUrlChange={(value) => { setLinkUrl(value); setLinkError(null); }}
              error={linkError}
              onDescChange={setLinkDesc}
              onAdd={handleAddLink}
              links={links}
              loading={loadingLinks}
              selected={selectedLinks}
              onToggle={toggleLink}
            />
          )}
        </div>

        {/* Footer */}
        <div className="fm-modal__footer">
          <Button variant="outline" onClick={handleClose}>
            انصراف
          </Button>
          <Button
            onClick={hasPendingUpload ? () => void handleUploadAll() : handleSelectFiles}
            disabled={uploading ? true : hasPendingUpload ? false : !canSelect}
            loading={uploading}
            leadingIcon={!uploading ? <Icon name={hasPendingUpload ? 'send' : 'check'} size={16} /> : undefined}
          >
            {hasPendingUpload ? 'ارسال فایل‌ها' : 'انتخاب فایل‌ها'}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

/* ─────────────────────────── Upload Tab ─────────────────────────── */

interface UploadTabProps {
  isDragging: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
  onPickerOpen: () => void;
  onPickerSettled: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  pendingFiles: Array<{
    file: File;
    status: 'pending' | 'uploading' | 'uploaded' | 'failed';
    fileId?: string;
    error?: string;
    loaded?: number;
    total?: number;
    confirming?: boolean;
  }>;
  uploader?: { username?: string; avatarUrl?: string | null };
  selectedUploaded: Set<string>;
  onToggleUploaded: (key: string) => void;
  onRetry: (index: number) => void;
  onRemove: (index: number) => void;
  onCancelUpload: (index: number) => void;
  canDelete: boolean;
  maxSize: number;
  allowedExtensions: string[];
}

function UploadTab({
  isDragging,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileSelect,
  onPickerOpen,
  onPickerSettled,
  fileInputRef,
  pendingFiles,
  uploader,
  selectedUploaded,
  onToggleUploaded,
  onRetry,
  onRemove,
  onCancelUpload,
  canDelete,
  maxSize,
  allowedExtensions,
}: UploadTabProps) {
  // فاز ۱۲٫۳-ح: میلهٔ کلی از مجموع بایت‌های ارسالشدهٔ تمام فایل‌ها پر می‌شود.
  const totalBytes = pendingFiles.reduce((sum, p) => sum + (p.total ?? p.file.size), 0);
  const loadedBytes = pendingFiles.reduce(
    (sum, p) => sum + Math.min(p.loaded ?? 0, p.total ?? p.file.size),
    0,
  );
  const overallPercent = totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0;
  const activeUploads = pendingFiles.filter((p) => p.status === 'uploading');
  const awaitingServer = activeUploads.length > 0 && activeUploads.every((p) => p.confirming);

  return (
    <div>
      <div
        className={cx('fm-dropzone', isDragging && 'fm-dropzone--dragging')}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => {
          onPickerOpen();
          fileInputRef.current?.click();
        }}
      >
        <Icon name="uploadCloud" size={32} className="fm-dropzone__icon" />
        <p className="fm-dropzone__text">
          فایل‌ها را اینجا رها کنید یا کلیک کنید
        </p>
        <p className="fm-dropzone__hint">
          حداکثر {formatBytesFa(maxSize)} — فرمت‌های مجاز: {allowedExtensions.join(', ')}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          accept={allowedExtensions.map((ext) => `.${ext}`).join(',')}
          onChange={(e) => {
            onPickerSettled();
            onFileSelect(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {pendingFiles.length > 0 && (
        <>
          <div className="fm-list">
            {pendingFiles.map((item, index) => (
              <div
                key={`${item.file.name}-${index}`}
                className={cx(
                  'fm-item',
                  item.status === 'failed' && 'fm-item--failed',
                  item.status === 'uploaded' && 'fm-item--uploaded',
                )}
              >
                {item.status === 'uploaded' ? (
                  <input
                    type="checkbox"
                    className="fm-item__check"
                    checked={selectedUploaded.has(localFileSignature(item.file.name, item.file.size))}
                    onChange={() => onToggleUploaded(localFileSignature(item.file.name, item.file.size))}
                    aria-label={`انتخاب ${item.file.name}`}
                  />
                ) : null}
                <div className="fm-item__icon">
                  <Icon name="fileText" size={20} />
                </div>
                <div className="fm-item__body">
                  <FileName name={item.file.name} className="fm-item__name" />
                  <div className="fm-item__meta">
                    <span>{formatBytesFa(item.file.size)}</span>
                    {item.status === 'uploading' ? (
                      <span className="fm-upload-state">
                        <span className={cx('fm-spinner', item.confirming && 'fm-spinner--pulse')} aria-hidden="true" />
                        {item.confirming
                          ? 'در حال تأیید'
                          : `${formatNumberFa(Math.min(100, Math.round(((item.loaded ?? 0) / (item.total || 1)) * 100)))}٪`}
                      </span>
                    ) : null}
                    {item.status === 'uploaded' ? (
                      <UploaderBadge username={uploader?.username} avatarUrl={uploader?.avatarUrl} sizeBytes={item.file.size} />
                    ) : null}
                    {item.error && <span style={{ color: 'var(--c-danger)' }}>{item.error}</span>}
                  </div>
                  {item.status === 'uploading' ? (
                    <div
                      className={cx('fm-progress', 'fm-progress--small', item.confirming && 'fm-progress--indeterminate')}
                      role="progressbar"
                      aria-label={`پیشرفت آپلود ${item.file.name}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={item.confirming ? undefined : Math.min(100, Math.round(((item.loaded ?? 0) / (item.total || 1)) * 100))}
                    >
                      <span
                        className="fm-progress__fill"
                        style={item.confirming ? undefined : { width: `${Math.min(100, Math.round(((item.loaded ?? 0) / (item.total || 1)) * 100))}%` }}
                      />
                    </div>
                  ) : null}
                </div>
                {item.status === 'failed' ? (
                  <span className="fm-item__status fm-item__status--failed">
                    <Icon name="xCircle" size={12} />
                    خطا
                  </span>
                ) : null}
                {item.status === 'failed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="fm-item__retry"
                    onClick={() => onRetry(index)}
                    leadingIcon={<Icon name="refresh" size={14} />}
                  >
                    تلاش مجدد
                  </Button>
                )}
                {item.status === 'uploaded' && (
                  <span className="fm-item__status fm-item__status--uploaded">
                    <Icon name="check" size={12} />
                    آماده
                  </span>
                )}
                {item.status === 'pending' && (
                  <span className="fm-item__status fm-item__status--pending">
                    آماده ارسال
                  </span>
                )}
                {/* فاز ۱۲٫۱۰-د: ضربدر حذف فایل «آماده ارسال» پیش از آپلود —
                    برای_all نقشها، بدون نیاز به مجوز حذف سرور. */}
                {item.status === 'pending' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    iconOnly
                    className="fm-item__remove-pending"
                    onClick={() => onRemove(index)}
                    aria-label={`حذف ${item.file.name} از فهرست آماده ارسال`}
                    title="حذف از فهرست آماده ارسال"
                  >
                    <Icon name="x" size={16} />
                  </Button>
                ) : null}
                {item.status === 'uploading' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    iconOnly
                    className="fm-item__cancel"
                    onClick={() => onCancelUpload(index)}
                    aria-label={`لغو آپلود ${item.file.name}`}
                    title="لغو آپلود"
                  >
                    <Icon name="x" size={16} />
                  </Button>
                ) : null}
                {canDelete && item.status === 'failed' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    iconOnly
                    onClick={() => onRemove(index)}
                    aria-label="حذف از صف ارسال"
                  >
                    <Icon name="trash" size={16} />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
          {activeUploads.length > 0 ? (
            <div className="fm-upload-overall" role="status" aria-live="polite">
              <span className="fm-upload-overall__label">
                {awaitingServer ? (
                  <>در حال تأیید سرور<span className="fm-confirm-dots" aria-hidden="true" /></>
                ) : (
                  `در حال ارسال ${formatNumberFa(overallPercent)}٪`
                )}
              </span>
              <div
                className={cx('fm-progress', awaitingServer && 'fm-progress--indeterminate')}
                role="progressbar"
                aria-label="پیشرفت کلی آپلود"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={awaitingServer ? undefined : overallPercent}
              >
                <span
                  className="fm-progress__fill"
                  style={awaitingServer ? undefined : { width: `${overallPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Select Tab ─────────────────────────── */

interface SelectTabProps {
  files: FileItem[];
  excludeIds: string[];
  loading: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  token: string | null;
  canDelete: boolean;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

function SelectTab({
  files,
  excludeIds,
  loading,
  selected,
  onToggle,
  token,
  canDelete,
  onDelete,
  onRefresh,
  refreshing,
}: SelectTabProps) {
  const visibleFiles = files.filter((file) => !excludeIds.includes(file.id));
  if (loading && files.length === 0) {
    return <div className="fm-empty"><div className="btn__spinner" /></div>;
  }
  if (visibleFiles.length === 0) {
    return (
      <div className="fm-empty">
        <Icon name="file" size={32} className="fm-empty__icon" />
        <p className="fm-empty__text">هنوز فایلی آپلود نکرده‌اید</p>
      </div>
    );
  }
  return (
    <div>
      <div className="fm-list-head">
        <span>فایل‌های موجود</span>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          onClick={onRefresh}
          loading={refreshing}
          aria-label="بازخوانی فایل‌های موجود"
          title="بازخوانی فایل‌های موجود"
          leadingIcon={refreshing ? undefined : <Icon name="refresh" size={15} />}
        />
      </div>
      <div className="fm-list">
      {visibleFiles.map((file) => (
        <div key={file.id} className="fm-item">
          <input
            type="checkbox"
            className="fm-item__check"
            checked={selected.has(file.id)}
            onChange={() => onToggle(file.id)}
            aria-label={`انتخاب ${file.originalName}`}
          />
          <div className="fm-item__icon">
            <Icon name="fileText" size={20} />
          </div>
          <div className="fm-item__body">
            <FileName name={file.originalName} className="fm-item__name" />
            <div className="fm-item__meta">
              <CopyableCode value={file.fileCode} label="کد فایل" />
              <span>•</span>
              <span>{formatBytesFa(file.sizeBytes)}</span>
              <span>•</span>
              <RelativeTime value={file.createdAt} />
              <UploaderBadge
                username={file.uploaderUsername}
                avatarUrl={file.uploaderAvatarUrl}
                sizeBytes={file.sizeBytes}
              />
            </div>
          </div>
          {token ? (
            <a
              href={getFileDownloadUrl(file.id)}
              onClick={(event) => {
                // دانلود با هدر Authorization از طریق fetch و سپس save-as
                event.preventDefault();
                void openFileFromServer({
                  fileId: file.id,
                  token,
                  fileName: file.originalName,
                  mode: 'download',
                }).catch((err) => console.error('[FileDownload]', err));
              }}
              style={{ color: 'var(--c-primary)', cursor: 'pointer' }}
              aria-label="دانلود"
            >
              <Icon name="download" size={18} />
            </a>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="fm-modal__close"
              onClick={() => onDelete(file.id)}
              aria-label={`حذف ${file.originalName}`}
              title="حذف فایل (فقط مدیر)"
            >
              <Icon name="trash" size={16} />
            </button>
          ) : null}
        </div>
      ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Link Tab ─────────────────────────── */

interface LinkTabProps {
  url: string;
  desc: string;
  onUrlChange: (v: string) => void;
  error?: string | null;
  onDescChange: (v: string) => void;
  onAdd: () => void;
  links: ExternalLink[];
  loading: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
}

function LinkTab({
  url,
  desc,
  onUrlChange,
  onDescChange,
  onAdd,
  error,
  links,
  loading,
  selected,
  onToggle,
}: LinkTabProps) {
  const onEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    onAdd();
  };

  return (
    <div>
      <div className={`fm-link-input${error ? ' fm-link-input--invalid' : ''}`}>
        <input
          type="url"
          placeholder="https://example.com/file.pdf"
          value={url}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'fm-link-error' : undefined}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={onEnter}
        />
        <input
          type="text"
          placeholder="توضیحات (اختیاری)"
          value={desc}
          onChange={(e) => onDescChange(e.target.value)}
          onKeyDown={onEnter}
          style={{ maxWidth: '180px' }}
        />
        <Button
          variant="primary"
          onClick={onAdd}
          disabled={!url.trim()}
          leadingIcon={<Icon name="plus" size={14} />}
        >
          افزودن
        </Button>
      </div>

      {error ? (
        <p id="fm-link-error" className="fm-link-warning" role="alert">{error}</p>
      ) : null}

      {loading ? (
        <div className="fm-empty"><div className="btn__spinner" /></div>
      ) : links.length === 0 ? (
        <div className="fm-empty">
          <Icon name="link" size={32} className="fm-empty__icon" />
          <p className="fm-empty__text">هنوز لینکی اضافه نشده</p>
        </div>
      ) : (
        <div className="fm-list">
          {links.map((link) => (
            <div key={link.id} className="fm-link-item">
              <input
                type="checkbox"
                className="fm-item__check"
                checked={selected.has(link.id)}
                onChange={() => onToggle(link.id)}
              />
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
                {link.description && (
                  <div className="fm-link-item__desc">{link.description}</div>
                )}
              </div>
              <RelativeTime value={link.createdAt} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function formatBytesFa(bytes: number): string {
  if (bytes < 1024) return `${formatNumberFa(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${formatNumberFa(Math.round(bytes / 1024))} کیلوبایت`;
  return `${formatNumberFa(Math.round(bytes / (1024 * 1024)))} مگابایت`;
}
