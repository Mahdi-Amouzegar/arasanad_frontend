'use client';

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
import { useAlert } from '@/components/ui/AlertProvider';
import { useAuth } from '@/lib/account';
import { cx } from '@/lib/cx';
import { formatNumberFa } from '@/lib/datetime';
import {
  uploadFile,
  retryUpload,
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

/* ─────────────────────────── Component ─────────────────────────── */

export function FileManagerModal({
  open,
  onClose,
  config,
  onSelect,
}: FileManagerModalProps) {
  const { token, authedRequest } = useAuth();
  const { showToast } = useAlert();
  const dialogRef = useRef<HTMLDialogElement>(null);
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
  }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const filesApi = authedRequest ? createFilesApi(authedRequest) : null;
  const linksApi = authedRequest ? createExternalLinksApi(authedRequest) : null;

  // ─── Dialog open/close ───
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
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
      dialog.close();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC and click-outside handled by <dialog> natively
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // ─── Upload tab ───
  const handleFileSelect = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles: Array<{ file: File; status: 'pending'; error?: string }> = [];
    const { maxFileSize, allowedExtensions } = limits;
    for (const file of Array.from(fileList)) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!allowedExtensions.includes(ext)) {
        showToast({
          type: 'error',
          title: 'فرمت نامعتبر',
          message: `فرمت «${ext}» پشتیبانی نمی‌شود؛ مجاز: ${allowedExtensions.join('، ')}`,
        });
        continue;
      }
      if (file.size > maxFileSize) {
        showToast({
          type: 'error',
          title: 'حجم بیش از حد',
          message: `حجم فایل «${file.name}» بیش از ${formatBytesFa(maxFileSize)} است`,
        });
        continue;
      }
      newFiles.push({ file, status: 'pending' });
    }
    if (newFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...newFiles]);
    }
  }, [showToast, limits]);

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
      i === index ? { ...p, status: 'uploading' } : p,
    ));

    try {
      const result = await uploadFile(token, item.file);
      setPendingFiles((prev) => prev.map((p, i) =>
        i === index ? { ...p, status: 'uploaded', fileId: result.id } : p,
      ));
    } catch (err) {
      setPendingFiles((prev) => prev.map((p, i) =>
        i === index ? {
          ...p,
          status: 'failed',
          error: err instanceof Error ? err.message : 'آپلود ناموفق',
        } : p,
      ));
    }
  }, [token, pendingFiles]);

  const handleUploadAll = useCallback(async () => {
    const pending = pendingFiles
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.status === 'pending' || p.status === 'failed');
    for (const { i } of pending) {
      await uploadOne(i);
    }
  }, [pendingFiles, uploadOne]);

  const handleRetry = useCallback(async (index: number) => {
    const item = pendingFiles[index];
    if (!item || !token) return;
    setPendingFiles((prev) => prev.map((p, i) =>
      i === index ? { ...p, status: 'uploading' } : p,
    ));
    try {
      // اگر آپلود اولیه در همان لحظه شکست خورده باشد، سرور شناسهای به
      // کلاینت نداده است؛ در این حالت یک آپلود تازه انجام می‌دهیم تا
      // درخواست به `/files//retry` نرود و خطا تکرار نشود.
      const result = item.fileId
        ? await retryUpload(token, item.fileId, item.file)
        : await uploadFile(token, item.file);
      setPendingFiles((prev) => prev.map((p, i) =>
        i === index ? { ...p, status: 'uploaded', fileId: result.id } : p,
      ));
    } catch (err) {
      setPendingFiles((prev) => prev.map((p, i) =>
        i === index ? {
          ...p,
          status: 'failed',
          error: err instanceof Error ? err.message : 'تلاش مجدد ناموفق',
        } : p,
      ));
    }
  }, [token, pendingFiles]);

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
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

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
        showToast({ type: 'success', title: 'فایل حذف شد' });
      } catch (caught) {
        showToast({
          type: 'error',
          title: 'حذف فایل انجام نشد',
          message: caught instanceof Error ? caught.message : undefined,
        });
      }
    },
    [config.role, filesApi, showToast],
  );

  // ─── Link tab ───
  const handleAddLink = useCallback(async () => {
    if (!linkUrl.trim() || !linksApi) return;
    setLinkError(null);
    try {
      const link = await linksApi.createLink(linkUrl.trim(), linkDesc.trim() || undefined);
      setLinks((prev) => [link, ...prev]);
      setLinkUrl('');
      setLinkDesc('');
      showToast({ type: 'success', title: 'لینک اضافه شد' });
    } catch (err) {
      // فاز ۱۲٫۲-ط: خطا زیر همان کادر نمایش داده می‌شود، نه در toast پشت overlay.
      setLinkError(err instanceof Error ? err.message : 'افزودن لینک ناموفق بود');
    }
  }, [linkUrl, linkDesc, linksApi, showToast]);

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
      .map((p) => ({
        id: p.fileId!,
        originalName: p.file.name,
        fileCode: '',
        sizeBytes: p.file.size,
        mimeType: p.file.type || 'application/octet-stream',
        extension: p.file.name.split('.').pop()?.toLowerCase() ?? '',
      }));

    const selectedFromExisting = existingFiles
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
    // وقتی تب لینک در پیکربندی پنهان است، انتخابهای قدیمی نباید نشت کنند.
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
  ]);

  const hasUploadedFiles = pendingFiles.some((p) => p.status === 'uploaded');
  const hasSelectedExisting = selectedExisting.size > 0;
  const hasSelectedLinks = visibleTabs.includes('link') && selectedLinks.size > 0;
  const canSelect = hasUploadedFiles || hasSelectedExisting || hasSelectedLinks;

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fm-modal"
      aria-labelledby="fm-title"
      onCancel={handleClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
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
          {activeTab === 'upload' && visibleTabs.includes('upload') && (
            <UploadTab
              isDragging={isDragging}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onFileSelect={handleFileSelect}
              fileInputRef={fileInputRef}
              pendingFiles={pendingFiles}
              onUploadAll={handleUploadAll}
              onRetry={handleRetry}
              onRemove={handleRemovePending}
              canDelete={config.role === 'admin'}
              maxSize={limits.maxFileSize}
              allowedExtensions={limits.allowedExtensions}
            />
          )}
          {activeTab === 'select' && visibleTabs.includes('select') && (
            <SelectTab
              files={existingFiles}
              loading={loadingFiles}
              selected={selectedExisting}
              onToggle={toggleExistingFile}
              token={token}
              canDelete={config.role === 'admin'}
              onDelete={handleDeleteExisting}
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
            onClick={handleSelectFiles}
            disabled={!canSelect}
            leadingIcon={<Icon name="check" size={16} />}
          >
            انتخاب فایل‌ها
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
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  pendingFiles: Array<{
    file: File;
    status: 'pending' | 'uploading' | 'uploaded' | 'failed';
    fileId?: string;
    error?: string;
  }>;
  onUploadAll: () => void;
  onRetry: (index: number) => void;
  onRemove: (index: number) => void;
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
  fileInputRef,
  pendingFiles,
  onUploadAll,
  onRetry,
  onRemove,
  canDelete,
  maxSize,
  allowedExtensions,
}: UploadTabProps) {
  const hasPending = pendingFiles.some((p) => p.status === 'pending' || p.status === 'failed');

  return (
    <div>
      <div
        className={cx('fm-dropzone', isDragging && 'fm-dropzone--dragging')}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Icon name="uploadCloud" size={32} className="fm-dropzone__icon" />
        <p className="fm-dropzone__text">
          فایل‌ها را اینجا رها کنید یا کلیک کنید
        </p>
        <p className="fm-dropzone__hint">
          حداکثر {formatBytesFa(maxSize)} — فرمتهای مجاز: {allowedExtensions.join(', ')}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          accept={allowedExtensions.map((ext) => `.${ext}`).join(',')}
          onChange={(e) => {
            onFileSelect(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {pendingFiles.length > 0 && (
        <>
          <div style={{ marginTop: '16px', marginBottom: '8px' }}>
            <Button
              variant="primary"
              size="sm"
              onClick={onUploadAll}
              disabled={!hasPending}
              leadingIcon={<Icon name="send" size={14} />}
            >
              ارسال فایل‌ها
            </Button>
          </div>
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
                <div className="fm-item__icon">
                  <Icon name="fileText" size={20} />
                </div>
                <div className="fm-item__body">
                  <div className="fm-item__name">{item.file.name}</div>
                  <div className="fm-item__meta">
                    <span>{formatBytesFa(item.file.size)}</span>
                    {item.status === 'uploading' && <span>در حال آپلود…</span>}
                    {item.error && <span style={{ color: 'var(--c-danger)' }}>{item.error}</span>}
                  </div>
                </div>
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
                {canDelete && item.status !== 'uploading' && item.status !== 'uploaded' ? (
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
        </>
      )}
    </div>
  );
}

/* ─────────────────────────── Select Tab ─────────────────────────── */

interface SelectTabProps {
  files: FileItem[];
  loading: boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
  token: string | null;
  canDelete: boolean;
  onDelete: (id: string) => void;
}

function SelectTab({
  files,
  loading,
  selected,
  onToggle,
  token,
  canDelete,
  onDelete,
}: SelectTabProps) {
  if (loading) {
    return <div className="fm-empty"><div className="btn__spinner" /></div>;
  }
  if (files.length === 0) {
    return (
      <div className="fm-empty">
        <Icon name="file" size={32} className="fm-empty__icon" />
        <p className="fm-empty__text">هنوز فایلی آپلود نکرده‌اید</p>
      </div>
    );
  }
  return (
    <div className="fm-list">
      {files.map((file) => (
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
            <div className="fm-item__name">{file.originalName}</div>
            <div className="fm-item__meta">
              <span>{file.fileCode}</span>
              <span>•</span>
              <span>{formatBytesFa(file.sizeBytes)}</span>
              <span>•</span>
              <RelativeTime value={file.createdAt} />
            </div>
          </div>
          {token ? (
            <a
              href={getFileDownloadUrl(file.id)}
              onClick={(event) => {
                // دانلود با هدر Authorization از طریق fetch و سپس save-as
                event.preventDefault();
                void downloadFile(file.id, file.originalName, token);
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
        />
        <input
          type="text"
          placeholder="توضیحات (اختیاری)"
          value={desc}
          onChange={(e) => onDescChange(e.target.value)}
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

/** Download file via fetch with auth header, then trigger save-as. */
async function downloadFile(fileId: string, fileName: string, token: string) {
  try {
    const response = await fetch(getFileDownloadUrl(fileId), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('دانلود ناموفق بود');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[FileDownload]', err);
  }
}
