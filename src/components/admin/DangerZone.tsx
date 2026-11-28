'use client';

/**
 * فاز ۱۲٫۳۵ — منطقه پرخطر پنل مدیر.
 *
 * ⚠️ پیش‌فرض کاملاً خاموش است. فقط متغیر `NEXT_PUBLIC_DANGER_ZONE_ENABLED=on`
 *    همراه با درگاه سرور `DANGER_ZONE_ENABLED=on` رابطها را فعال می‌کند.
 * ⚠️ هیچ عملیاتی بدون پیش‌نمایش، عبارت تأیید دقیق و کلید تکرارنامپذیر اجرا نمی‌شود.
 */

import { useCallback, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/account';
import { DANGER_ZONE_ENABLED } from '@/lib/config';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import { formatNumberFa } from '@/lib/datetime';

type ResetMode = '1' | '2' | '3';

interface PreviewData {
  mode: string;
  tables: number;
  totalRows: number;
  counts: Record<string, number>;
  keepTables: string[];
}

interface ResetResult {
  operationId: string;
  mode: string;
  deletedTables: number;
  repeated: boolean;
}

const MODES: Array<{ id: ResetMode; title: string; note: string; risk: string }> = [
  {
    id: '1',
    title: 'داده‌های عملیاتی',
    note: 'سفارش‌ها، فایل‌ها، پیام‌ها، مالی و سوابق حسابرسی حذف می‌شوند؛ کاربران و مدیر باقی می‌مانند.',
    risk: 'خطرناک',
  },
  {
    id: '2',
    title: 'داده‌های عملیاتی و کاربران عادی',
    note: 'علاوه بر داده‌های عملیاتی، کاربران عادی، نشست‌ها و لینک‌های تلگرام آنها حذف می‌شوند.',
    risk: 'بسیار خطرناک',
  },
  {
    id: '3',
    title: 'همه داده‌ها و مدیران',
    note: 'تمام کاربران از جمله مدیران حذف می‌شوند. پس از آن تنها Bootstrap امن می‌تواند مدیر نخست را بسازد.',
    risk: 'بازیافتناپذیر',
  },
];

function freshId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `dz-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function DangerZone() {
  const { authedRequest } = useAuth();
  const [mode, setMode] = useState<ResetMode>('1');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [operationId, setOperationId] = useState(() => freshId());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await authedRequest<PreviewData>(`/admin/danger/preview?mode=${mode}`);
      setPreview(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'پیش‌نمایش دریافت نشد');
    } finally {
      setBusy(false);
    }
  }, [authedRequest, mode]);

  async function executeReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await authedRequest<ResetResult>('/admin/danger/reset', {
        method: 'POST',
        body: { mode, confirmation, idempotencyKey: operationId },
      });
      setNotice(
        `عملیات ${result.operationId} ${result.repeated ? 'پیشتر تکمیل شده است' : 'تکمیل شد'}؛ `
        + `${formatNumberFa(result.deletedTables)} جدول پاک‌سازی شد.`,
      );
      setConfirmation('');
      setOperationId(freshId());
      await loadPreview();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'عملیات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function removeReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fileId = String(form.get('fileId') ?? '').trim();
    const entityType = String(form.get('entityType') ?? '').trim();
    const entityId = String(form.get('entityId') ?? '').trim();
    if (!fileId || !entityType || !entityId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await authedRequest<{ removed: number; remainingReferences: number }>(
        `/admin/danger/files/${encodeURIComponent(fileId)}/reference?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
        { method: 'DELETE' },
      );
      setNotice(`${formatNumberFa(result.removed)} ارتباط حذف شد؛ ${formatNumberFa(result.remainingReferences)} ارتباط باقی است.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'حذف ارتباط ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  if (!DANGER_ZONE_ENABLED) {
    return (
      <Card>
        <CardHeader title="منطقه پرخطر در دسترس نیست" />
        <CardBody>
          <p className="prj-note">
            این قابلیت تا پایان تست‌های ایزوله و تأیید نهایی در Production منتشر نمی‌شود.
            هیچ عملیات حذفی از طریق این صفحه قابل اجرا نیست.
          </p>
        </CardBody>
      </Card>
    );
  }

  const expected = `RESET-MODE-${mode}-CONFIRM`;
  const nonEmptyCounts = Object.entries(preview?.counts ?? {})
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  return (
    <div className="prj-stack">
      <Card>
        <CardHeader title="منطقه پرخطر" />
        <CardBody>
          <p className="prj-error" role="alert">
            ⚠️ عملیات‌های این صفحه بازگشتپذیر نیستند. قبل از اجرا، پشتیبان تازه و تأییدشده لازم است.
          </p>
          <div className="danger-modes" role="radiogroup" aria-label="حالت پاک‌سازی">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={mode === item.id}
                className={`danger-mode${mode === item.id ? ' danger-mode--active' : ''}`}
                onClick={() => { setMode(item.id); setPreview(null); setConfirmation(''); }}
              >
                <span className="danger-mode__title">{item.title}</span>
                <span className="danger-mode__note">{item.note}</span>
                <span className="danger-mode__risk">{item.risk}</span>
              </button>
            ))}
          </div>
          <div className="adm-form-inline">
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void loadPreview()}>
              پیش‌نمایش تعداد ردیفها
            </Button>
          </div>
          {preview ? (
            <div className="danger-preview">
              <p className="prj-note">
                {formatNumberFa(preview.tables)} جدول، {formatNumberFa(preview.totalRows)} ردیف قابل حذف.
              </p>
              {nonEmptyCounts.length === 0 ? (
                <p className="prj-note">در حال حاضر ردیف قابل حذفی وجود ندارد.</p>
              ) : (
                <table className="prj-table">
                  <thead>
                    <tr><th scope="col">جدول</th><th scope="col">ردیف</th></tr>
                  </thead>
                  <tbody>
                    {nonEmptyCounts.map(([table, count]) => (
                      <tr key={table}><td data-label="جدول">{table}</td><td data-label="ردیف">{formatNumberFa(count)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="اجرای پاک‌سازی" />
        <CardBody>
          <form className="prj-stack" onSubmit={(event) => void executeReset(event)}>
            <label className="adm-field">
              <span>عبارت تأیید دقیق: <code>{expected}</code></span>
              <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} dir="ltr" />
            </label>
            <p className="prj-note">کلید تکرارنامپذیر: <code dir="ltr">{operationId}</code></p>
            <div>
              <Button type="submit" variant="danger" disabled={busy || confirmation !== expected}>
                <Icon name="shield" size={16} /> حذف براساس حالت انتخاب‌شده
              </Button>
            </div>
          </form>
          {error ? <p className="prj-error" role="alert">{error}</p> : null}
          {notice ? <p className="prj-note" role="status">{notice}</p> : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="حذف ارتباط یک فایل" />
        <CardBody>
          <p className="prj-note">
            حذف ارتباط، خود فایل را حذف نمی‌کند. حذف فیزیکی تنها پس از صفر شدن تمام ارتباطها و گذشت مهلت امن مجاز است.
          </p>
          <form className="adm-form-inline" onSubmit={(event) => void removeReference(event)}>
            <Input name="fileId" placeholder="شناسه فایل" aria-label="شناسه فایل" dir="ltr" />
            <Input name="entityType" placeholder="نوع موجودیت" aria-label="نوع موجودیت" dir="ltr" />
            <Input name="entityId" placeholder="شناسه موجودیت" aria-label="شناسه موجودیت" dir="ltr" />
            <Button type="submit" size="sm" variant="outline" disabled={busy}>حذف ارتباط</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
