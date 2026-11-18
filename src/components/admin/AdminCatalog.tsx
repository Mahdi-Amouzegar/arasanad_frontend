'use client';

/**
 * فاز ۱۲ — ویرایش درجای کاتالوگ توسط مدیر:
 *   - نرخ‌نامه (P12-03)
 *   - استانداردهای ظاهری با پیش‌نمایش زنده و klon (P12-04)
 *   - نمونه‌کارها با آپلود سهمرحلهای و انتشار (P12-05)
 *
 * ⚠️ دکمه‌های ویرایش فقط زمانی رندر می‌شوند که نقش کاربر «admin» باشد؛
 *    اعمال real authority البته در بکند با `requireAdmin` است.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Field';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  createAdminApi,
  type DesignPreset,
  type PortfolioItem,
  type ServiceType,
} from '@/lib/admin/api';
import { API_BASE } from '@/lib/api';

function useAdminApi() {
  const { authedRequest } = useAuth();
  return useMemo(() => createAdminApi(authedRequest), [authedRequest]);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'عملیات انجام نشد';
}

function ErrorBar({ message }: { message: string }) {
  return (
    <div className="prj-alert" role="alert">
      <Icon name="alert" size={18} />
      <span>{message}</span>
    </div>
  );
}

/* ═══════════════════════ نرخ‌نامه (۱۲-ت) ═══════════════════════ */

export function AdminPricingEditor() {
  const api = useAdminApi();
  const { showToast, showAlert } = useAlert();
  const [services, setServices] = useState<ServiceType[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    void api.serviceTypes()
      .then((data) => {
        if (!alive) return;
        setServices(data.services);
        setDrafts(Object.fromEntries(data.services.map((s) => [s.id, String(s.pricePerPage)])));
        setError(null);
      })
      .catch((caught) => { if (alive) setError(errorText(caught)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [api]);

  useEffect(() => reload(), [reload]);

  async function save(service: ServiceType) {
    const value = Number(drafts[service.id]);
    if (!Number.isInteger(value) || value < 0) { setError('نرخ باید عدد صحیح باشد'); return; }
    if (value === service.pricePerPage) return;
    const agreed = await showAlert({
      type: 'confirm',
      title: 'تغییر نرخ خدمت',
      message: `نرخ «${service.name}» از ${service.pricePerPage.toLocaleString('fa-IR')} به ${value.toLocaleString('fa-IR')} تومان تغییر می‌کند. سفارش‌های قبلی تحت تأثیر قرار نمی‌گیرند.`,
      confirmText: 'ذخیره نرخ',
      cancelText: 'انصراف',
    });
    if (!agreed) return;
    setBusy(service.id);
    try {
      await api.saveServiceType(service.id, { pricePerPage: value });
      showToast({ type: 'success', title: 'نرخ به‌روز شد' });
      void reload();
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusy(null); }
  }

  async function toggle(service: ServiceType) {
    setBusy(service.id);
    try {
      await api.saveServiceType(service.id, { isActive: !service.isActive });
      void reload();
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusy(null); }
  }

  if (loading) return <Skeleton height={160} />;
  if (error) return <ErrorBar message={error} />;

  return (
    <Card>
      <CardHeader title="ویرایش نرخ‌نامه (فقط مدیر)" />
      <CardBody>
        <div className="prj-table-wrap">
          <table className="prj-table">
            <thead><tr><th scope="col">خدمت</th><th scope="col">نرخ فعلی</th><th scope="col">نرخ جدید</th><th scope="col">وضعیت</th><th scope="col">اقدام</th></tr></thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.id}>
                  <td>{service.name}</td>
                  <td><Money value={service.pricePerPage} /></td>
                  <td>
                    <Input
                      type="number" min={0} step={1000} inputMode="numeric"
                      aria-label={`نرخ ${service.name}`}
                      value={drafts[service.id] ?? ''}
                      onChange={(event) => setDrafts((prev) => ({ ...prev, [service.id]: event.target.value }))}
                    />
                  </td>
                  <td>{service.isActive ? 'فعال' : 'غیرفعال'}</td>
                  <td>
                    <div className="prj-action-cell">
                      <Button size="sm" variant="primary" disabled={busy === service.id} onClick={() => void save(service)}>ذخیره</Button>
                      <Button size="sm" variant="outline" disabled={busy === service.id} onClick={() => void toggle(service)}>
                        {service.isActive ? 'غیرفعال' : 'فعال'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="prj-note">هر تغییر در سوابق حسابرسی ثبت می‌شود و نرخ سفارش‌های ثبت‌شده تغییر نمی‌کند.</p>
      </CardBody>
    </Card>
  );
}

/* ═══════════════════ استانداردهای ظاهری (۱۲-ث) ═══════════════════ */

function presetPreview(spec: Record<string, unknown>): React.ReactNode {
  const fontFa = String(spec.fontFa ?? 'B Nazanin');
  const fontEn = String(spec.fontEn ?? 'Times New Roman');
  const bodySize = Number(spec.bodySize ?? 16);
  const headingSize = Number(spec.heading1Size ?? 18);
  const lineSpacing = Number(spec.lineSpacing ?? 1.5);
  return (
    <div className="adm-preset-preview" style={{ fontFamily: fontFa, lineHeight: lineSpacing }}>
      <strong style={{ fontSize: headingSize }}>عنوان سند</strong>
      <p style={{ fontSize: bodySize }}>متن فارسی نمونه —متن انگلیسی: <span style={{ fontFamily: fontEn }}>Sample text 123</span></p>
    </div>
  );
}

export function AdminDesignPresets() {
  const api = useAdminApi();
  const { showToast } = useAlert();
  const [presets, setPresets] = useState<DesignPreset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    void api.designPresets()
      .then((data) => { if (alive) { setPresets(data.presets); setError(null); } })
      .catch((caught) => { if (alive) setError(errorText(caught)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [api]);

  useEffect(() => reload(), [reload]);

  const selected = presets.find((preset) => preset.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) { setDraft({}); return; }
    const spec = selected.spec;
    setDraft({
      name: selected.name,
      description: selected.description ?? '',
      fontFa: String(spec.fontFa ?? ''),
      fontEn: String(spec.fontEn ?? ''),
      bodySize: String(spec.bodySize ?? 16),
      heading1Size: String(spec.heading1Size ?? 18),
      lineSpacing: String(spec.lineSpacing ?? 1.5),
      paperSize: String(spec.paperSize ?? 'A4'),
    });
  }, [selected]);

  async function save() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.saveDesignPreset(selected.id, {
        name: draft.name,
        description: draft.description,
        spec: {
          fontFa: draft.fontFa,
          fontEn: draft.fontEn,
          bodySize: Number(draft.bodySize),
          heading1Size: Number(draft.heading1Size),
          lineSpacing: Number(draft.lineSpacing),
          paperSize: draft.paperSize,
        },
      });
      showToast({ type: 'success', title: 'استاندارد ذخیره شد' });
      void reload();
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusy(false); }
  }

  async function toggle(preset: DesignPreset) {
    setBusy(true);
    try {
      await api.saveDesignPreset(preset.id, { isActive: !preset.isActive });
      void reload();
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusy(false); }
  }

  async function clone(preset: DesignPreset) {
    setBusy(true);
    try {
      const result = await api.createDesignPreset({ name: `${preset.name} (کپی)`, cloneFrom: preset.id });
      setSelectedId(result.preset.id);
      showToast({ type: 'success', title: 'استاندارد کلون شد' });
      void reload();
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusy(false); }
  }

  return (
    <div className="prj-stack">
      {error ? <ErrorBar message={error} /> : null}
      <Card>
        <CardHeader title="استانداردهای ظاهری" />
        <CardBody>
          {loading ? <Skeleton height={120} /> : presets.length === 0 ? (
            <EmptyState icon={<Icon name="settings" size={26} />} title="استانداردی تعریف نشده است" />
          ) : (
            <div className="adm-preset-list">
              {presets.map((preset) => (
                <div className="adm-preset-item" key={preset.id}>
                  <div><strong>{preset.name}</strong> {preset.isActive ? null : <span className="prj-muted">(غیرفعال)</span>}</div>
                  <div className="prj-action-cell">
                    <Button size="sm" variant="outline" onClick={() => setSelectedId(preset.id)}>ویرایش</Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => void clone(preset)}>کلون</Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => void toggle(preset)}>{preset.isActive ? 'غیرفعال' : 'فعال'}</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {selected ? (
        <Card>
          <CardHeader title={`ویرایش: ${selected.name}`} />
          <CardBody>
            <div className="adm-form-grid">
              <label className="adm-field"><span>نام استاندارد</span><Input value={draft.name ?? ''} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} /></label>
              <label className="adm-field"><span>توضیح</span><Input value={draft.description ?? ''} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} /></label>
              <label className="adm-field"><span>فونت فارسی</span><Input value={draft.fontFa ?? ''} onChange={(event) => setDraft((prev) => ({ ...prev, fontFa: event.target.value }))} /></label>
              <label className="adm-field"><span>فونت لاتین</span><Input value={draft.fontEn ?? ''} onChange={(event) => setDraft((prev) => ({ ...prev, fontEn: event.target.value }))} /></label>
              <label className="adm-field"><span>اندازه متن</span><Input type="number" min={6} max={72} value={draft.bodySize ?? ''} onChange={(event) => setDraft((prev) => ({ ...prev, bodySize: event.target.value }))} /></label>
              <label className="adm-field"><span>اندازه تیتر ۱</span><Input type="number" min={8} max={96} value={draft.heading1Size ?? ''} onChange={(event) => setDraft((prev) => ({ ...prev, heading1Size: event.target.value }))} /></label>
              <label className="adm-field"><span>فاصله خطوط</span><Input type="number" min={1} max={3} step={0.1} value={draft.lineSpacing ?? ''} onChange={(event) => setDraft((prev) => ({ ...prev, lineSpacing: event.target.value }))} /></label>
              <label className="adm-field"><span>اندازه کاغذ</span><Input value={draft.paperSize ?? ''} onChange={(event) => setDraft((prev) => ({ ...prev, paperSize: event.target.value }))} /></label>
            </div>
            <p className="prj-note">پیش‌نمایش زنده — فارسی و لاتین در کنار هم:</p>
            {presetPreview({
              fontFa: draft.fontFa, fontEn: draft.fontEn, bodySize: Number(draft.bodySize),
              heading1Size: Number(draft.heading1Size), lineSpacing: Number(draft.lineSpacing),
            })}
            <div className="prj-action-cell">
              <Button variant="primary" disabled={busy} onClick={() => void save()}>ذخیره استاندارد</Button>
              <Button variant="ghost" onClick={() => setSelectedId(null)}>بستن</Button>
            </div>
            <p className="prj-note">تغییر استاندارد فقط بر سفارش‌های تازه اثر می‌گذارد؛ سفارش‌های قبلی Snapshot خود را حفظ می‌کنند.</p>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

/* ═════════════════════════ نمونه‌کارها (۱۲-ج) ═════════════════════════ */

function imageSrc(item: PortfolioItem): string | null {
  if (!item.imageSrc) return null;
  if (item.imageKind === 'static') return item.imageSrc;
  if (item.imageKind === 'parspack') return `${API_BASE}${item.imageSrc}`;
  return null;
}

export function AdminPortfolio() {
  const api = useAdminApi();
  const { token } = useAuth();
  const { showToast, showAlert } = useAlert();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [newItem, setNewItem] = useState({ title: '', category: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    void api.portfolio()
      .then((data) => { if (alive) { setItems(data.items); setError(null); } })
      .catch((caught) => { if (alive) setError(errorText(caught)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [api]);

  useEffect(() => reload(), [reload]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newItem.title.trim() || !newItem.category.trim()) { setError('عنوان و دسته الزامیاند'); return; }
    setBusyId('new');
    try {
      await api.createPortfolioItem(newItem);
      setNewItem({ title: '', category: '', description: '' });
      showToast({ type: 'success', title: 'نمونهکار اضافه شد' });
      void reload();
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusyId(null); }
  }

  async function toggle(item: PortfolioItem) {
    setBusyId(item.id);
    try {
      await api.savePortfolioItem(item.id, { isPublished: !item.isPublished });
      showToast({ type: 'success', title: item.isPublished ? 'انتشار لغو شد' : 'نمونهکار منتشر شد' });
      void reload();
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusyId(null); }
  }

  async function upload(item: PortfolioItem) {
    const file = fileRefs.current[item.id]?.files?.[0];
    if (!file) { setError('ابتدا یک تصویر انتخاب کنید'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('حداکثر حجم تصویر ۵ مگابایت است'); return; }
    setBusyId(item.id);
    try {
      const bytes = await file.arrayBuffer();
      const response = await fetch(`${API_BASE}/admin/portfolio/${encodeURIComponent(item.id)}/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name),
          'X-File-Size': String(file.size),
        },
        body: bytes,
      });
      const payload = await response.json() as { ok?: boolean; error?: { message?: string } };
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message ?? 'آپلود تصویر انجام نشد');
      showToast({ type: 'success', title: 'تصویر ذخیره شد' });
      void reload();
    } catch (caught) { setError(errorText(caught)); }
    finally { setBusyId(null); }
  }

  async function move(item: PortfolioItem, direction: -1 | 1) {
    const index = items.findIndex((candidate) => candidate.id === item.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setItems(next);
    try {
      await api.reorderPortfolio(next.map((candidate) => candidate.id));
    } catch (caught) {
      setError(errorText(caught));
      void reload();
    }
  }

  async function remove(item: PortfolioItem) {
    // حذف فیزیکی وجود ندارد؛ فقط لغو انتشار.
    const agreed = await showAlert({
      type: 'confirm',
      title: 'لغو انتشار نمونهکار',
      message: `«${item.title}» از صفحه عمومی حذف می‌شود ولی رکورد آن باقی می‌ماند.`,
      confirmText: 'لغو انتشار',
      cancelText: 'انصراف',
    });
    if (agreed && item.isPublished) await toggle(item);
  }

  return (
    <div className="prj-stack">
      {error ? <ErrorBar message={error} /> : null}
      <Card>
        <CardHeader title="افزودن نمونهکار" />
        <CardBody>
          <form className="adm-form-grid" onSubmit={(event) => void create(event)}>
            <label className="adm-field"><span>عنوان</span><Input value={newItem.title} onChange={(event) => setNewItem((prev) => ({ ...prev, title: event.target.value }))} /></label>
            <label className="adm-field"><span>دسته</span><Input value={newItem.category} onChange={(event) => setNewItem((prev) => ({ ...prev, category: event.target.value }))} /></label>
            <label className="adm-field"><span>توضیح</span><Input value={newItem.description} onChange={(event) => setNewItem((prev) => ({ ...prev, description: event.target.value }))} /></label>
            <div><Button type="submit" variant="primary" disabled={busyId === 'new'}>افزودن</Button></div>
          </form>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="فهرست نمونه‌کارها" />
        <CardBody>
          {loading ? <Skeleton height={120} /> : items.length === 0 ? (
            <EmptyState icon={<Icon name="package" size={26} />} title="نمونهای ثبت نشده است" />
          ) : (
            <div className="adm-portfolio-list">
              {items.map((item) => (
                <div className="adm-portfolio-item" key={item.id}>
                  <div className="adm-portfolio-thumb">
                    {imageSrc(item)
                      ? <img src={imageSrc(item)!} alt={item.title} loading="lazy" />
                      : <Icon name="package" size={28} />}
                  </div>
                  <div className="adm-portfolio-body">
                    <strong>{item.title}</strong>
                    <div className="prj-muted">{item.category} {item.isPublished ? null : '· منتشر نشده'}</div>
                    <input
                      type="file" accept="image/avif,image/webp,image/jpeg,image/png"
                      aria-label={`تصویر ${item.title}`}
                      ref={(node) => { fileRefs.current[item.id] = node; }}
                    />
                    <div className="prj-action-cell">
                      <Button size="sm" variant="primary" disabled={busyId === item.id} onClick={() => void upload(item)}>آپلود تصویر</Button>
                      <Button size="sm" variant="outline" disabled={busyId === item.id} onClick={() => void toggle(item)}>{item.isPublished ? 'لغو انتشار' : 'انتشار'}</Button>
                      <Button size="sm" variant="ghost" onClick={() => void move(item, -1)} aria-label="بالا"><Icon name="chevronDown" size={16} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => void move(item, 1)} aria-label="پایین"><Icon name="chevronDown" size={16} /></Button>
                      {item.isPublished ? <Button size="sm" variant="ghost" onClick={() => void remove(item)}>حذف از نمایش</Button> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="prj-note">حذف فیزیکی وجود ندارد؛ لغو انتشار تنها نمایش عمومی را متوقف می‌کند و رکورد و سوابق باقی می‌مانند.</p>
        </CardBody>
      </Card>
    </div>
  );
}
