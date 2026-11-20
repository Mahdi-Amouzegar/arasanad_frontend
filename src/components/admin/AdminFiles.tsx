'use client';

/**
 * فاز ۱۲٫۱۳-ز: «فایل‌های موجود» در پنل 관리 — تمام فایل‌های همه کاربران.
 * فیلتر نام ثبتکننده و نام نخستین آپلودکننده سرورمحوراند؛ هیچ مجوزی در
 * کلاینت حدس زده نمی‌شود.
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/account';
import { createAdminApi, type AdminFile } from '@/lib/admin/api';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { CopyableCode } from '@/components/projects/CopyableCode';
import { FileName } from '@/components/ui/FileName';
import { FileActions } from '@/components/files/FileActions';
import { FileDownloadModal } from '@/components/files/FileDownloadModal';
import { formatDateFull, formatNumberFa } from '@/lib/datetime';

function formatBytesFa(bytes: number): string {
  if (bytes < 1024) return `${formatNumberFa(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${formatNumberFa(Math.round(bytes / 1024))} کیلوبایت`;
  return `${formatNumberFa(Math.round(bytes / (1024 * 1024)))} مگابایت`;
}

export function AdminFiles() {
  const { authedRequest } = useAuth();
  const api = createAdminApi(authedRequest);
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [draft, setDraft] = useState('');
  const [uploader, setUploader] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminFile | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.files(uploader);
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'فهرست فایل‌ها دریافت نشد');
    } finally {
      setLoading(false);
    }
  }, [authedRequest, uploader]);

  useEffect(() => { void load(); }, [load]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploader(draft.trim());
  }

  return (
    <div className="prj-stack">
      <Card>
        <CardHeader
          title="فیلتر"
          actions={<Button variant="ghost" size="sm" onClick={() => void load()} aria-label="بازخوانی"><Icon name="refresh" size={16} /></Button>}
        />
        <CardBody>
          <form className="adm-form-inline" onSubmit={submit}>
            <Input
              aria-label="نام ثبتکننده فایل"
              placeholder="نام یا نام کاربری ثبتکننده"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button type="submit" size="sm" variant="outline">جستجو</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setDraft(''); setUploader(''); }}>
              پاک کردن
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="فهرست فایل‌ها" actions={<span className="prj-note">{files.length} فایل</span>} />
        <CardBody>
          {error ? <p className="prj-error" role="alert">{error}</p> : null}
          {loading ? (
            <p className="prj-note">در حال بارگذاری…</p>
          ) : files.length === 0 ? (
            <EmptyState icon={<Icon name="fileText" size={26} />} title="فایلی یافت نشد" description="فیلتر نام ثبتکننده را تغییر دهید." />
          ) : (
            <div className="prj-table-wrap">
              <table className="prj-table">
                <thead>
                  <tr>
                    <th scope="col">فایل</th>
                    <th scope="col">ثبتکننده</th>
                    <th scope="col">حجم</th>
                    <th scope="col">تاریخ</th>
                    <th scope="col">اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id}>
                      <td data-label="فایل">
                        <div className="fm-file-cell">
                          <CopyableCode value={file.fileCode} className="prj-code" label="کد فایل" />
                          <FileName name={file.originalName} className="prj-name" />
                        </div>
                      </td>
                      <td data-label="ثبتکننده">
                        <div className="ord-customer">
                          <Avatar
                            src={file.uploaderAvatarUrl ?? null}
                            name={file.firstUserName ?? file.uploaderUsername ?? '—'}
                            size="sm"
                          />
                          <span className="ord-customer__name">{file.firstUserName ?? file.uploaderUsername ?? '—'}</span>
                        </div>
                      </td>
                      <td data-label="حجم">{formatBytesFa(file.sizeBytes)}</td>
                      <td data-label="تاریخ">{formatDateFull(file.createdAt)}</td>
                      <td data-label="اقدام">
                        <FileActions
                          file={{
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
                            createdAt: file.createdAt,
                            uploadedAt: file.createdAt,
                          }}
                          detailsLabel="جزئیات"
                          showPersonal={false}
                          onOpenDetails={() => setSelected(file)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <FileDownloadModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        file={selected ? {
          id: selected.id,
          uploaderId: '',
          originalName: selected.originalName,
          fileCode: selected.fileCode,
          mimeType: selected.mimeType,
          extension: selected.extension,
          sizeBytes: selected.sizeBytes,
          status: 'uploaded',
          description: null,
          downloadCount: 0,
          createdAt: selected.createdAt,
          uploadedAt: selected.createdAt,
        } : null}
        canDownload
        showPersonal={false}
      />
    </div>
  );
}
