'use client';

/**
 * فاز ۱۲ — پنلهای واقعی مدیریت: داشبورد، کاربران، تنظیمات، Audit و پیام‌ها.
 *
 * تمام اعداد و فهرستها از بکند خوانده می‌شوند. هیچ مقدار ساختگی و هیچ دکمه‌ی
 * تغییر مستقیم موجودی کیف پول وجود ندارد (امنیت مالی).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { useAlert } from '@/components/ui/AlertProvider';
import { Button } from '@/components/ui/Button';
import { ShowMoreButton, useVisibleSlice } from '@/components/ui/ShowMore';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Input, Select, Textarea } from '@/components/ui/Field';
import { Avatar } from '@/components/ui/Avatar';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { Money } from '@/components/ui/Money';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  createAdminApi,
  type AdminApi,
  type AdminUser,
  type AuditEvent,
  type DashboardCard,
  type SiteSettings,
} from '@/lib/admin/api';
import { createFinanceApi, type ReconciliationView } from '@/lib/finance/api';
import { useDashboardSyncController } from '@/components/system/DashboardSyncController';
import {
  customerAccessLabel,
  securityStatusLabel,
  walletTransactionLabel,
  type CustomerAccessStatus,
} from '@/lib/admin/labels';

function useAdminApi() {
  const { authedRequest } = useAuth();
  return useMemo(() => createAdminApi(authedRequest), [authedRequest]);
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'دریافت اطلاعات انجام نشد';
}

function ErrorBar({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="prj-alert" role="alert">
      <Icon name="alert" size={18} />
      <span>{message}</span>
      <Button variant="ghost" size="sm" onClick={retry}>
        تلاش دوباره
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/* ═══════════════════════════ داشبورد (۱۲-ب) ═══════════════════════════ */

export function AdminDashboard() {
  const { authedRequest } = useAuth();
  const api = useAdminApi();
  const financeApi = useMemo(() => createFinanceApi(authedRequest), [authedRequest]);
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [overview, setOverview] = useState<{
    users: number;
    revenue: number;
    escrow: number;
    refunds: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((value) => value + 1), []);
  const requestSeqRef = useRef(0);

  const fetchSection = useCallback(
    async (section: string) => {
      if (section !== 'cards') return { data: [], dataVersion: 0 };
      const result = await api.dashboardCards();
      return { data: result.data, dataVersion: result.dataVersion };
    },
    [api],
  );
  const mergeSection = useCallback(
    (_current: DashboardCard[], section: string, data: unknown) =>
      section === 'cards' && Array.isArray(data) ? (data as DashboardCard[]) : _current,
    [],
  );
  const controller = useDashboardSyncController<DashboardCard[]>({
    role: 'admin',
    view: cards,
    setView: setCards,
    fetchSection,
    mergeSection,
  });
  const { versionAtRequest, isStaleResponse } = controller;

  useEffect(() => {
    let alive = true;
    const requestId = ++requestSeqRef.current;
    const versionWhenRequested = versionAtRequest();
    setLoading(true);
    // سه منبع مستقل موازی: شمارشها، مالی و تعداد کاربران (فاز ۱۲٫۱-و).
    void Promise.all([
      api.dashboard(),
      financeApi.reconciliation().catch(() => null),
      api.users().catch(() => null),
    ])
      .then(([dashboard, reconciliation, users]) => {
        if (!alive || requestId !== requestSeqRef.current) return;
        if (isStaleResponse(versionWhenRequested)) return;
        setCards(dashboard.cards);
        const totals: ReconciliationView['totals'] | undefined = reconciliation?.totals;
        setOverview({
          users: users?.page?.total ?? 0,
          revenue: Number(totals?.revenueTotal ?? 0),
          escrow: Number(totals?.escrowTotal ?? 0),
          refunds: Number(totals?.refundPaid ?? 0),
        });
        setError(null);
      })
      .catch((caught) => {
        if (alive && requestId === requestSeqRef.current) setError(errorText(caught));
      })
      .finally(() => {
        if (alive && requestId === requestSeqRef.current) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, financeApi, isStaleResponse, reloadKey, versionAtRequest]);

  const primary = cards.slice(0, 4);

  return (
    <div className="prj-stack">
      {error ? <ErrorBar message={error} retry={reload} /> : null}
      <Card>
        <CardHeader
          title="نمای کلی سامانه"
          actions={
            <Button variant="ghost" size="sm" onClick={reload} aria-label="بازخوانی">
              <Icon name="refresh" size={16} />
            </Button>
          }
        />
        <CardBody>
          {loading ? (
            <div className="adm-stats-grid">
              {[0, 1, 2, 3].map((n) => (
                <Skeleton key={n} height={72} />
              ))}
            </div>
          ) : (
            <div className="adm-stats-grid">
              {primary.map((card) => (
                <Link href={card.href} className="adm-stat-link" key={card.id}>
                  <span className="stat">
                    <span className="stat__label">{card.label}</span>
                    <span className="stat__value">
                      {card.value === 0 ? '—' : card.value.toLocaleString('fa-IR')}
                    </span>
                    <span className="stat__hint">
                      {card.value === 0 ? 'موردی نیست' : 'مشاهده فهرست'}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="آمار مالی و کاربران" />
        <CardBody>
          {loading || !overview ? (
            <div className="fin-stats">
              {[0, 1, 2, 3].map((n) => (
                <Skeleton key={n} height={64} />
              ))}
            </div>
          ) : (
            <div className="fin-stats">
              <div>
                <span>کل کاربران</span>
                <strong>{overview.users.toLocaleString('fa-IR')}</strong>
              </div>
              <div>
                <span>درآمد تسویه‌شده</span>
                <strong>
                  <Money value={overview.revenue} />
                </strong>
              </div>
              <div>
                <span>موجودی امانی سفارش‌ها</span>
                <strong>
                  <Money value={overview.escrow} />
                </strong>
              </div>
              <div>
                <span>برگشت وجه پرداخت‌شده</span>
                <strong>
                  <Money value={overview.refunds} />
                </strong>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="صف‌های کاری" />
        <CardBody>
          <div className="adm-stats-grid">
            {cards.slice(4).map((card) => (
              <Link href={card.href} className="adm-stat-link" key={card.id}>
                <span className="stat">
                  <span className="stat__label">{card.label}</span>
                  <span className="stat__value">
                    {card.value === 0 ? '—' : card.value.toLocaleString('fa-IR')}
                  </span>
                  <span className="stat__hint">
                    {card.value === 0 ? 'موردی نیست' : 'مشاهده فهرست'}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="میانبرها" />
        <CardBody>
          <div className="adm-shortcuts">
            <Link href="/admin/orders/" className="btn btn--secondary btn--sm">
              جدول سفارشات
            </Link>
            <Link href="/admin/projects/" className="btn btn--secondary btn--sm">
              فهرست سفارش‌ها
            </Link>
            <Link href="/admin/payments/" className="btn btn--secondary btn--sm">
              صف پرداخت‌ها
            </Link>
            <Link href="/admin/users/" className="btn btn--secondary btn--sm">
              کاربران
            </Link>
            <Link href="/admin/reconciliation/" className="btn btn--secondary btn--sm">
              گزارش مغایرت
            </Link>
            <Link href="/admin/audit/" className="btn btn--secondary btn--sm">
              سوابق حسابرسی
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

/* ═══════════════════════════ کاربران (۱۲-پ) ═══════════════════════════ */

export function AdminUsers() {
  const api = useAdminApi();
  const { confirmWithReason, showToast } = useAlert();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<Awaited<
    ReturnType<AdminApi['userDetail']>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    visible: pagedUsers,
    remaining: moreUsers,
    showMore: showMoreUsers,
  } = useVisibleSlice(users);

  const reload = useCallback(() => {
    let alive = true;
    setLoading(true);
    void api
      .users(draft || undefined)
      .then((data) => {
        if (alive) {
          setUsers(data.users);
          setError(null);
        }
      })
      .catch((caught) => {
        if (alive) setError(errorText(caught));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, draft]);

  useEffect(() => reload(), [reload]);

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void reload();
  }

  async function openUser(id: string) {
    setError(null);
    try {
      setSelected(await api.userDetail(id));
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  /** فاز ۱۲٫۳۱ — تنها مسیر تغییر وضعیت از جدول و پروفایل، با تأیید و دلیل. */
  async function changeStatus(user: AdminUser, status: CustomerAccessStatus) {
    if (user.customerAccess === status || busyUser) return;
    const { confirmed, reason } = await confirmWithReason({
      type: status === 'disabled' ? 'danger-confirm' : 'confirm',
      title: 'تغییر وضعیت دسترسی مشتری',
      message:
        status === 'disabled'
          ? 'مشتری فقط سوابق و فایل‌های مجاز قبلی خود را می‌بیند و نمی‌تواند عملیات یا پیام تاز‌های ثبت کند. بدهیها و سفارش‌های قبلی تغییری نمی‌کنند.'
          : status === 'credit'
            ? 'مشتری می‌تواند سفارش نقدی و اعتباری ثبت کند. مجوز اعتبار او فعال می‌شود.'
            : 'مشتری فقط می‌تواند سفارش نقدی ثبت کند؛ مجوز اعتبار او لغو می‌شود و بدهیهای قبلی دست‌نخورده می‌مانند.',
      confirmText: 'تأیید تغییر وضعیت',
      reason: { label: 'دلیل تغییر وضعیت', defaultValue: 'تغییر وضعیت توسط مدیر', minLength: 5 },
    });
    if (!confirmed || reason.length < 5) return;
    setBusyUser(user.id);
    try {
      const result = await api.updateUserAccessStatus(user.id, { status, reason });
      const updated = result.user;
      setUsers((list) => list.map((item) => (item.id === updated.id ? updated : item)));
      setSelected((current) => (current && current.user.id === updated.id
        ? { ...current, user: updated }
        : current));
      showToast({ type: 'success', title: 'وضعیت مشتری به‌روز شد' });
    } catch (caught) {
      setError(errorText(caught));
      showToast({ type: 'error', title: 'تغییر وضعیت انجام نشد', message: errorText(caught) });
      void reload();
    } finally {
      setBusyUser(null);
    }
  }

  return (
    <div className="prj-stack">
      {error ? (
        <ErrorBar
          message={error}
          retry={() => {
            void reload();
          }}
        />
      ) : null}
      <Card>
        <CardHeader title="جستجوی کاربران" />
        <CardBody>
          <form className="adm-form-inline" onSubmit={onSearch}>
            <Input
              aria-label="جستجو"
              placeholder="نام کاربری یا نام"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button type="submit" variant="primary" size="sm">
              <Icon name="search" size={16} /> جستجو
            </Button>
          </form>
          {loading ? (
            <Skeleton height={96} />
          ) : users.length === 0 ? (
            <EmptyState
              icon={<Icon name="user" size={26} />}
              title="کاربری یافت نشد"
              description="جستجو را با نام کاربری دیگری امتحان کنید."
            />
          ) : (
            <div className="prj-table-wrap">
              <table className="prj-table">
                <thead>
                  <tr>
                    <th scope="col">کاربر</th>
                    <th scope="col">نقش</th>
                    <th scope="col">وضعیت</th>
                    <th scope="col">تاریخ عضویت</th>
                    <th scope="col">اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>@{user.username}</strong>
                        <div className="prj-muted">{user.displayName}</div>
                      </td>
                      <td>{user.role === 'admin' ? 'مدیر' : 'سفارش‌دهنده'}</td>
                      <td>
                        {user.role === 'admin' ? (
                          'فعال'
                        ) : user.status !== 'active' ? (
                          securityStatusLabel(user.status)
                        ) : (
                          <Select
                            aria-label={`وضعیت ${user.username}`}
                            value={user.customerAccess}
                            disabled={busyUser === user.id}
                            onChange={(event) =>
                              void changeStatus(user, event.target.value as CustomerAccessStatus)
                            }
                          >
                            <option value="normal">عادی</option>
                            <option value="credit">اعتباری</option>
                            <option value="disabled">غیرفعال</option>
                          </Select>
                        )}
                      </td>
                      <td>
                        <JalaliDate value={user.createdAt} variant="short" />
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void openUser(user.id)}
                        >
                          مشاهده
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ShowMoreButton remaining={moreUsers} onClick={showMoreUsers} />
        </CardBody>
      </Card>

      {selected ? (
        <Card>
          <CardHeader
            title={
              <div className="adm-profile-title">
                <Avatar
                  src={selected.user.avatarUrl}
                  name={selected.user.displayName}
                  size="md"
                  fallbackOnError
                />
                <div>
                  <strong>
                    {[selected.user.firstName, selected.user.lastName].filter(Boolean).join(' ')
                      || selected.user.displayName}
                  </strong>
                  <span>@{selected.user.username}</span>
                </div>
              </div>
            }
            actions={
              <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
                بستن
              </Button>
            }
          />
          <CardBody>
            <div className="adm-profile-status">
              <span>وضعیت دسترسی</span>
              {selected.user.role === 'admin' ? (
                <strong>فعال</strong>
              ) : selected.user.status !== 'active' ? (
                <strong>{securityStatusLabel(selected.user.status)}</strong>
              ) : (
                <Select
                  aria-label="وضعیت دسترسی مشتری"
                  value={selected.user.customerAccess}
                  disabled={busyUser === selected.user.id}
                  onChange={(event) =>
                    void changeStatus(selected.user, event.target.value as CustomerAccessStatus)
                  }
                >
                  <option value="normal">عادی</option>
                  <option value="credit">اعتباری</option>
                  <option value="disabled">غیرفعال</option>
                </Select>
              )}
              <span className="prj-muted">
                {customerAccessLabel(selected.user.customerAccess)}
                {' — '}
                {selected.user.customerAccess === 'disabled'
                  ? 'دسترسی فقط‌خواندنی: مشتری سوابق قبلی خود را می‌بیند، ولی عملیات جدید نمی‌تواند ثبت کند'
                  : selected.user.creditEnabled
                    ? 'مجوز اعتبار: فعال'
                    : 'مجوز اعتبار: غیرفعال'}
              </span>
            </div>
            <div className="fin-stats">
              <div>
                <span>موجودی آزاد</span>
                <strong>
                  <Money value={selected.wallet?.available ?? 0} />
                </strong>
              </div>
              <div>
                <span>رزروشده</span>
                <strong>
                  <Money value={selected.wallet?.reserved ?? 0} />
                </strong>
              </div>
              <div>
                <span>تعداد سفارش‌ها</span>
                <strong>{selected.projects.length.toLocaleString('fa-IR')}</strong>
              </div>
            </div>
            <p className="prj-note">
              موجودی فقط‌خواندنی است؛ تغییر مستقیم موجودی کیف پول ممنوع است و تنها از طریق
              سند مالی مجاز است.
            </p>
            {selected.transactions.length > 0 ? (
              <div className="prj-table-wrap">
                <table className="prj-table">
                  <thead>
                    <tr>
                      <th scope="col">نوع تراکنش</th>
                      <th scope="col">مبلغ</th>
                      <th scope="col">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.transactions.slice(0, 20).map((tx) => (
                      <tr key={tx.id}>
                        <td>{walletTransactionLabel(tx.kind)}</td>
                        <td>
                          <Money value={tx.amount} />
                        </td>
                        <td>
                          <JalaliDate value={tx.createdAt} variant="short" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════ تنظیمات (۱۲-ح) ═══════════════════════════ */

const SETTING_LABELS: Record<string, string> = {
  'site.title': 'عنوان سایت',
  'site.description': 'توضیح سایت',
  'site.contactEmail': 'ایمیل تماس',
  'site.contactPhone': 'تلفن تماس',
  'site.address': 'نشانی',
  'bank.name': 'بانک مقصد',
  'bank.accountHolder': 'نام صاحب حساب',
  'bank.cardNumber': 'شماره کارت',
  'bank.sheba': 'شماره شبا',
  noticeText: 'پیام عمومی',
};

export function AdminSettings() {
  const api = useAdminApi();
  const { showToast } = useAlert();
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void api
      .settings()
      .then((data) => {
        if (alive) {
          setSettings(data.settings);
          setError(null);
        }
      })
      .catch((caught) => {
        if (alive) setError(errorText(caught));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await api.saveSettings(settings);
      setSettings(result.settings);
      showToast({
        type: 'success',
        title: 'تنظیمات ذخیره شد',
        message: `${result.updated} مورد به‌روز شد.`,
      });
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="prj-stack">
      {error ? <ErrorBar message={error} retry={() => window.location.reload()} /> : null}
      <form onSubmit={(event) => void save(event)} className="prj-stack">
        <Card>
          <CardHeader title="اطلاعات سایت و تماس" />
          <CardBody>
            {loading ? (
              <Skeleton height={160} />
            ) : (
              <div className="adm-form-grid">
                {Object.keys(settings)
                  .filter((key) => key.startsWith('site.'))
                  .map((key) => (
                    <Field key={key} label={SETTING_LABELS[key] ?? key}>
                      {key === 'site.description' ? (
                        <Textarea
                          value={settings[key] ?? ''}
                          onChange={(event) =>
                            setSettings((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                          rows={3}
                        />
                      ) : (
                        <Input
                          value={settings[key] ?? ''}
                          onChange={(event) =>
                            setSettings((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                        />
                      )}
                    </Field>
                  ))}
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="حساب بانکی مقصد و متن‌ها" />
          <CardBody>
            {loading ? (
              <Skeleton height={120} />
            ) : (
              <div className="adm-form-grid">
                {Object.keys(settings)
                  .filter((key) => key.startsWith('bank.') || key === 'noticeText')
                  .map((key) => (
                    <Field key={key} label={SETTING_LABELS[key] ?? key}>
                      {key === 'noticeText' ? (
                        <Textarea
                          value={settings[key] ?? ''}
                          onChange={(event) =>
                            setSettings((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                          rows={3}
                        />
                      ) : (
                        <Input
                          value={settings[key] ?? ''}
                          onChange={(event) =>
                            setSettings((prev) => ({
                              ...prev,
                              [key]: event.target.value,
                            }))
                          }
                        />
                      )}
                    </Field>
                  ))}
              </div>
            )}
            <p className="prj-note">
              فقط کلیدهای مجاز ذخیره می‌شوند. کلیدها، رمزها و توکنها هرگز در دیتابیس یا
              خروجی استاتیک نوشته نمی‌شوند.
            </p>
          </CardBody>
        </Card>
        <div>
          <Button type="submit" variant="primary" disabled={busy || loading}>
            ذخیره تنظیمات
          </Button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════ Audit (۱۲-د) ═══════════════════════════ */

function jsonText(value: unknown): string {
  if (value === null || value === undefined) return '—';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function AdminAudit() {
  const api = useAdminApi();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [action, setAction] = useState('');
  const [actor, setActor] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    visible: pagedEvents,
    remaining: moreEvents,
    showMore: showMoreEvents,
  } = useVisibleSlice(events);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void api
      .audit({ action, actor })
      .then((data) => {
        if (alive) {
          setEvents(data.events);
          setError(null);
        }
      })
      .catch((caught) => {
        if (alive) setError(errorText(caught));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api, action, actor]);

  return (
    <div className="prj-stack">
      {error ? <ErrorBar message={error} retry={() => window.location.reload()} /> : null}
      <Card>
        <CardHeader title="سوابق حسابرسی" />
        <CardBody>
          <div className="adm-form-inline">
            <Input
              aria-label="فیلتر عملیات"
              placeholder="نوع عملیات"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            />
            <Input
              aria-label="فیلتر کاربر"
              placeholder="شناسه کاربر"
              value={actor}
              onChange={(event) => setActor(event.target.value)}
            />
          </div>
          {loading ? (
            <Skeleton height={96} />
          ) : events.length === 0 ? (
            <EmptyState
              icon={<Icon name="receipt" size={26} />}
              title="رویدادی یافت نشد"
              description="پس از نخستین عملیات مدیریتی، رویداد‌ها اینجا ثبت می‌شوند."
            />
          ) : (
            <div className="prj-table-wrap">
              <table className="prj-table">
                <thead>
                  <tr>
                    <th scope="col">زمان</th>
                    <th scope="col">عملیات</th>
                    <th scope="col">موجودیت</th>
                    <th scope="col">قبل</th>
                    <th scope="col">بعد</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedEvents.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <JalaliDate value={event.createdAt} variant="short" />
                      </td>
                      <td>
                        <code>{event.action}</code>
                      </td>
                      <td className="prj-muted">
                        {event.entityType ?? '—'} / {event.entityId ?? '—'}
                      </td>
                      <td className="adm-json">{jsonText(event.before)}</td>
                      <td className="adm-json">{jsonText(event.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ShowMoreButton remaining={moreEvents} onClick={showMoreEvents} />
        </CardBody>
      </Card>
    </div>
  );
}

/* ═══════════════════════════ پیام‌ها (۱۲-ب) ═══════════════════════════ */

export function AdminMessages() {
  const api = useAdminApi();
  const [rows, setRows] = useState<
    Awaited<ReturnType<AdminApi['messages']>>['conversations']
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    visible: pagedRows,
    remaining: moreRows,
    showMore: showMoreRows,
  } = useVisibleSlice(rows);

  useEffect(() => {
    let alive = true;
    void api
      .messages()
      .then((data) => {
        if (alive) {
          setRows(data.conversations);
          setError(null);
        }
      })
      .catch((caught) => {
        if (alive) setError(errorText(caught));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [api]);

  return (
    <div className="prj-stack">
      {error ? <ErrorBar message={error} retry={() => window.location.reload()} /> : null}
      <Card>
        <CardHeader
          title="گفتگوهای اخیر"
          actions={
            <Link href="/admin/messages/" className="btn btn--ghost btn--sm">
              <Icon name="refresh" size={16} />
            </Link>
          }
        />
        <CardBody>
          {loading ? (
            <Skeleton height={96} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Icon name="message" size={26} />}
              title="گفتگویی وجود ندارد"
              description="پس از نخستین پیام سفارش‌دهنده، گفتگو‌ها اینجا دیده می‌شوند."
            />
          ) : (
            <div className="prj-table-wrap">
              <table className="prj-table">
                <thead>
                  <tr>
                    <th scope="col">طرف مقابل</th>
                    <th scope="col">آخرین پیام</th>
                    <th scope="col">زمان</th>
                    <th scope="col">اقدام</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.peerName}</td>
                      <td className="prj-muted">{row.preview ?? '—'}</td>
                      <td>
                        <JalaliDate value={row.lastMessageAt} variant="short" />
                      </td>
                      <td>
                        <Link
                          href={`/panel/messages/?conversation=${encodeURIComponent(row.id)}`}
                          className="btn btn--outline btn--sm"
                        >
                          گفتگو
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ShowMoreButton remaining={moreRows} onClick={showMoreRows} />
        </CardBody>
      </Card>
    </div>
  );
}
