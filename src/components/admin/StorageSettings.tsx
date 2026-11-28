'use client';

/**
 * فاز ۱۲٫۳۶ — پنل مدیریت چندپروایدری.
 *
 * ⚠️ وجود فیزیکی واعتبار نسخه‌ها توسط بک‌اند و از طریق API واقعی Provider تعیین
 *    می‌شود. رابط کاربری تنها پرچمهای عملیاتی، پیش‌نمایش و نتایج را نشان می‌دهد.
 * ⚠️ درگاه خطرناک حذف فیزیکی و حالت نگهداری در این صفحه وجود ندارند.
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Input, Select } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';

type Provider = 'parspack' | 'telegram';

interface StorageConfigView {
  config: {
    defaultProvider: Provider;
    providers: Record<Provider, { write_enabled: boolean; read_enabled: boolean }>;
  };
  writeProviders: Provider[];
  counts: Record<string, Record<string, number>>;
  dependencies: Record<string, number>;
  maxNewUploadBytes: number;
  notes: string[];
}

interface PreviewRow {
  fileId: string;
  fileName: string;
  size: number;
  sourceProvider: Provider;
  destinationProvider: Provider;
  destinationStatus: string;
  integrity: string;
  proposedAction: string;
  category: string;
  reason: string | null;
}

interface PreviewReport {
  generatedAt: string;
  counts: Record<string, number>;
  rows: PreviewRow[];
  notes: string[];
}

interface TransferJob {
  id: string;
  fileId: string;
  sourceProvider: Provider;
  destinationProvider: Provider;
  status: string;
  step: string | null;
  attempts: number;
  error: { error?: string } | null;
  result: { action?: string } | null;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'عملیات انجام نشد';
}

const PROVIDER_LABEL: Record<Provider, string> = {
  parspack: 'ParsPack',
  telegram: 'Telegram Archive',
};

export function StorageSettings() {
  const { authedRequest } = useAuth();
  const { showToast } = useAlert();
  const [config, setConfig] = useState<StorageConfigView | null>(null);
  const [defaultProvider, setDefaultProvider] = useState<Provider>('parspack');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [destination, setDestination] = useState<Provider>('telegram');
  const [preview, setPreview] = useState<PreviewReport | null>(null);
  const [jobs, setJobs] = useState<TransferJob[]>([]);
  const [userId, setUserId] = useState('');
  const [userProvider, setUserProvider] = useState<Provider | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [snapshot, queue] = await Promise.all([
        authedRequest<StorageConfigView>('/admin/storage/config'),
        authedRequest<{ jobs: TransferJob[] }>('/admin/storage/transfers'),
      ]);
      setConfig(snapshot);
      setDefaultProvider(snapshot.config.defaultProvider);
      setFlags({
        parspackWriteEnabled: snapshot.config.providers.parspack.write_enabled,
        parspackReadEnabled: snapshot.config.providers.parspack.read_enabled,
        telegramWriteEnabled: snapshot.config.providers.telegram.write_enabled,
        telegramReadEnabled: snapshot.config.providers.telegram.read_enabled,
      });
      setJobs(queue.jobs);
      setError(null);
    } catch (caught) {
      setError(message(caught));
    }
  }, [authedRequest]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authedRequest('/admin/storage/config', {
        method: 'PATCH',
        body: { defaultProvider, ...flags },
      });
      await load();
      showToast({ type: 'success', title: 'تنظیمات ذخیره شد', message: 'سیاست Providerها به‌روز شد.' });
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function makePreview() {
    setBusy(true);
    setError(null);
    try {
      const report = await authedRequest<PreviewReport>('/admin/storage/reconciliation/preview', {
        method: 'POST',
        body: { destinationProvider: destination },
      });
      setPreview(report);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function execute() {
    setBusy(true);
    setError(null);
    try {
      const result = await authedRequest<{ queued: number; skipped: number; idempotent: boolean }>(
        '/admin/storage/reconciliation/execute',
        {
          method: 'POST',
          body: {
            destinationProvider: destination,
            idempotencyKey: `ui-${globalThis.crypto.randomUUID()}`,
          },
        },
      );
      await authedRequest('/admin/storage/transfers/run', { method: 'POST', body: { limit: 10 } });
      await load();
      showToast({
        type: 'success',
        title: 'انتقال آغاز شد',
        message: `${result.queued} فایل در صف قرار گرفت و ${result.skipped} فایل صرفنظر شد.`,
      });
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function runQueue() {
    setBusy(true);
    try {
      await authedRequest('/admin/storage/transfers/run', { method: 'POST', body: { limit: 10 } });
      await load();
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  async function retry(id: string) {
    try {
      await authedRequest(`/admin/storage/transfers/${encodeURIComponent(id)}/retry`, { method: 'POST' });
      await runQueue();
    } catch (caught) {
      setError(message(caught));
    }
  }

  async function saveOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authedRequest(`/admin/storage/users/${encodeURIComponent(userId.trim())}/override`, {
        method: 'PATCH',
        body: { provider: userProvider || null },
      });
      showToast({ type: 'success', title: 'تنظیم کاربر ذخیره شد', message: 'override کاربر به‌روز شد.' });
      setUserId('');
      setUserProvider('');
    } catch (caught) {
      setError(message(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="prj-stack">
      {error ? (
        <div className="prj-alert" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => void load()}>تلاش دوباره</Button>
        </div>
      ) : null}

      <form onSubmit={(event) => void saveConfig(event)} className="prj-stack">
        <Card>
          <CardHeader title="فعال‌سازی Providerها" />
          <CardBody>
            {!config ? <Skeleton height={140} /> : (
              <div className="prj-grid">
                {(['parspack', 'telegram'] as Provider[]).map((provider) => (
                  <div key={provider} className="prj-card">
                    <strong>{PROVIDER_LABEL[provider]}</strong>
                    <label className="adm-field">
                      <span>ذخیره‌سازی فایل‌های جدید</span>
                      <Input
                        type="checkbox"
                        checked={Boolean(flags[`${provider}WriteEnabled`])}
                        onChange={(event) => setFlags({
                          ...flags, [`${provider}WriteEnabled`]: event.target.checked,
                        })}
                      />
                    </label>
                    <label className="adm-field">
                      <span>خواندن نسخه‌های قدیمی</span>
                      <Input
                        type="checkbox"
                        checked={Boolean(flags[`${provider}ReadEnabled`])}
                        onChange={(event) => setFlags({
                          ...flags, [`${provider}ReadEnabled`]: event.target.checked,
                        })}
                      />
                    </label>
                    <small>
                      وابستگی ضروری: {config.dependencies[provider] ?? 0} فایل
                    </small>
                  </div>
                ))}
                <label className="adm-field">
                  <span>Provider پیش‌فرض</span>
                  <Select
                    value={defaultProvider}
                    onChange={(event) => setDefaultProvider(event.target.value as Provider)}
                  >
                    <option value="parspack">ParsPack</option>
                    <option value="telegram">Telegram Archive</option>
                  </Select>
                </label>
                <Button type="submit" disabled={busy}>ذخیره تنظیمات</Button>
              </div>
            )}
          </CardBody>
        </Card>
      </form>

      <Card>
        <CardHeader title="وضعیت نسخه‌ها" />
        <CardBody>
          {!config ? <Skeleton height={100} /> : (
            <table className="prj-table">
              <thead>
                <tr><th>Provider</th><th>تأییدشده</th><th>بررسینشده</th><th>مفقود</th><th>نامعتبر</th></tr>
              </thead>
              <tbody>
                {(['parspack', 'telegram'] as Provider[]).map((provider) => {
                  const counts = config.counts[provider] ?? {};
                  return (
                    <tr key={provider}>
                      <td>{PROVIDER_LABEL[provider]}</td>
                      <td>{counts.verified ?? 0}</td>
                      <td>{counts.unverified ?? 0}</td>
                      <td>{counts.missing ?? 0}</td>
                      <td>{counts.invalid ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="prj-muted">سقف آپلود فایل جدید: {config?.maxNewUploadBytes ?? 20_000_000} بایت</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="تطبیق نسخه‌ها (Reconciliation)" />
        <CardBody>
          <div className="prj-row">
            <label className="adm-field">
              <span>Provider مقصد</span>
              <Select value={destination} onChange={(event) => setDestination(event.target.value as Provider)}>
                <option value="telegram">Telegram Archive</option>
                <option value="parspack">ParsPack</option>
              </Select>
            </label>
            <Button variant="ghost" onClick={() => void makePreview()} disabled={busy}>پیش‌نمایش</Button>
            <Button onClick={() => void execute()} disabled={busy}>اجرای انتقال</Button>
            <Button variant="ghost" onClick={() => void runQueue()} disabled={busy}>پردازش صف</Button>
          </div>
          {preview ? (
            <div className="prj-stack">
              <p className="prj-muted">
                نتیجهٔ بررسی خودکار: {Object.entries(preview.counts)
                  .map(([key, value]) => `${key}=${value}`).join('، ')}
              </p>
              <table className="prj-table">
                <thead>
                  <tr><th>فایل</th><th>اندازه</th><th>مبدأ</th><th>وضعیت مقصد</th><th>اعتبار</th><th>اقدام</th></tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.fileId}>
                      <td>{row.fileName}</td>
                      <td>{row.size}</td>
                      <td>{PROVIDER_LABEL[row.sourceProvider]}</td>
                      <td>{row.destinationStatus}</td>
                      <td>{row.integrity}</td>
                      <td>{row.proposedAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="صف انتقال" />
        <CardBody>
          {jobs.length === 0 ? <p className="prj-muted">عملیات انتقالی ثبت نشده است.</p> : (
            <table className="prj-table">
              <thead><tr><th>فایل</th><th>مقصد</th><th>وضعیت</th><th>مرحله</th><th>تلاش</th><th>اقدام</th></tr></thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.fileId.slice(0, 8)}</td>
                    <td>{PROVIDER_LABEL[job.destinationProvider]}</td>
                    <td>{job.status}</td>
                    <td>{job.step ?? job.result?.action ?? '—'}</td>
                    <td>{job.attempts}</td>
                    <td>
                      {job.error?.error ? (
                        <Button variant="ghost" size="sm" onClick={() => void retry(job.id)}>
                          تلاش دوباره
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      <form onSubmit={(event) => void saveOverride(event)} className="prj-stack">
        <Card>
          <CardHeader title="تنظیم اختصاصی کاربر" />
          <CardBody>
            <div className="prj-row">
              <label className="adm-field">
                <span>شناسه کاربر</span>
                <Input value={userId} onChange={(event) => setUserId(event.target.value)} required />
              </label>
              <label className="adm-field">
                <span>Provider</span>
                <Select value={userProvider} onChange={(event) => setUserProvider(event.target.value as Provider | '')}>
                  <option value="">پاک کردن تنظیم اختصاصی</option>
                  <option value="parspack">ParsPack</option>
                  <option value="telegram">Telegram Archive</option>
                </Select>
              </label>
              <Button type="submit" disabled={busy}>ذخیره</Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
