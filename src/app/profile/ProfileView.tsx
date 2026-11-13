'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { TextField, Select, FormField } from '@/components/ui/Field';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { Badge } from '@/components/ui/Badge';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAlert } from '@/components/ui/AlertProvider';
import { OtpQrPanel } from './OtpQrPanel';
import { useAuth, type AuthUser } from '@/lib/auth-context';
import { ApiError, apiRequest } from '@/lib/api';
import { BASE_PATH } from '@/lib/config';
import {
  DEFAULT_OTP_SESSION_TTL_DAYS,
  OTP_CODE_TTL_MINUTES,
  OTP_SESSION_TTL_OPTIONS,
  OTP_STATUS_LABEL,
  OTP_STATUS_TONE,
  createOtpCode,
  listOtpCodes,
  revokeOtpCode,
  type OtpCodeItem,
  type OtpCodeResult,
} from '@/lib/otp';

interface SessionItem {
  id: string;
  deviceId: string | null;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
  authMethod: string;
  current: boolean;
}

const USERNAME_DEBOUNCE_MS = 500;

export function ProfileView() {
  const { user, token, capabilities, loading, reload, signOut, authedRequest } = useAuth();
  const { showToast, showAlert } = useAlert();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');

  const [saving, setSaving] = useState(false);
  const [usernameState, setUsernameState] = useState<
    { status: 'idle' } | { status: 'checking' } | { status: 'free' } | { status: 'taken'; reason: string }
  >({ status: 'idle' });

  const [sessions, setSessions] = useState<SessionItem[] | null>(null);
  const [otpTtl, setOtpTtl] = useState<number>(DEFAULT_OTP_SESSION_TTL_DAYS);
  const [otpCodes, setOtpCodes] = useState<OtpCodeItem[] | null>(null);
  const [newCode, setNewCode] = useState<OtpCodeResult | null>(null);
  const [creatingCode, setCreatingCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const otpTtlId = useId();
  const debounceRef = useRef<number | null>(null);

  // پر کردن فرم پس از بازیابی کاربر
  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setDisplayName(user.displayName);
    setUsername(user.username);
  }, [user]);

  // بررسی زنده‌ی نام کاربری
  useEffect(() => {
    if (!user) return undefined;
    if (username.trim().toLowerCase() === user.username.toLowerCase()) {
      setUsernameState({ status: 'idle' });
      return undefined;
    }
    if (username.trim().length < 3) {
      setUsernameState({ status: 'idle' });
      return undefined;
    }

    setUsernameState({ status: 'checking' });
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);

    debounceRef.current = window.setTimeout(async () => {
      try {
        const result = await apiRequest<{ available: boolean; reason?: string }>(
          `/auth/username-available?username=${encodeURIComponent(username.trim())}`,
        );
        setUsernameState(
          result.available
            ? { status: 'free' }
            : { status: 'taken', reason: result.reason ?? 'این نام گرفته شده است' },
        );
      } catch {
        setUsernameState({ status: 'idle' });
      }
    }, USERNAME_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, [username, user]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await authedRequest<{ sessions: SessionItem[] }>('/me/sessions');
      setSessions(data.sessions);
    } catch {
      setSessions([]);
    }
  }, [authedRequest]);

  const loadOtpCodes = useCallback(async () => {
    // نشست مهمان به فهرست کدها هم دسترسی نمیدهد (محافظت در عمق)
    if (!token || !capabilities.issueOtpCode) {
      setOtpCodes([]);
      return;
    }
    try {
      setOtpCodes(await listOtpCodes(token));
    } catch {
      setOtpCodes([]);
    }
  }, [token, capabilities.issueOtpCode]);

  useEffect(() => {
    if (user) {
      void loadSessions();
      void loadOtpCodes();
    }
  }, [user, loadSessions, loadOtpCodes]);

  async function createCode() {
    if (!token || creatingCode) return;
    setCreatingCode(true);
    try {
      const data = await createOtpCode(token, otpTtl);
      setNewCode(data);
      setCopied(false);
      showToast({
        type: 'success',
        title: 'کد ساخته شد',
        message: `${OTP_CODE_TTL_MINUTES} دقیقه اعتبار · نشست ${data.sessionTtlDays} روزه`,
      });
      void loadOtpCodes();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'کد ساخته نشد',
        message: error instanceof ApiError ? error.message : 'خطای نامشخص',
      });
    } finally {
      setCreatingCode(false);
    }
  }

  async function copyCode() {
    if (!newCode) return;
    try {
      await navigator.clipboard.writeText(newCode.code);
      setCopied(true);
      showToast({ title: 'کد کپی شد' });
    } catch {
      showToast({
        type: 'error',
        title: 'کپی نشد',
        message: 'مرورگر اجازهی کپی نداد؛ کد را دستی رونوشت کنید.',
      });
    }
  }

  async function revokeCode(id: string) {
    if (!token) return;
    const ok = await showAlert({
      type: 'danger-confirm',
      title: 'ابطال کد',
      message: 'این کد دیگر قابل استفاده نخواهد بود. مطمئن هستید؟',
      confirmText: 'ابطال',
      cancelText: 'بازگشت',
    });
    if (!ok) return;

    try {
      await revokeOtpCode(token, id);
      if (newCode?.id === id) setNewCode(null);
      showToast({ title: 'کد باطل شد' });
      void loadOtpCodes();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'ابطال نشد',
        message: error instanceof ApiError ? error.message : 'خطای نامشخص',
      });
    }
  }

  async function save() {
    if (!capabilities.editProfile) return;
    setSaving(true);
    try {
      const updated = await authedRequest<{ user: AuthUser }>('/me', {
        method: 'PATCH',
        body: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          displayName: displayName.trim(),
          username: username.trim(),
        },
      });
      await reload();
      showToast({ type: 'success', title: 'پروفایل ذخیره شد', message: `@${updated.user.username}` });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'ذخیره نشد',
        message: error instanceof ApiError ? error.message : 'خطای نامشخص',
      });
    } finally {
      setSaving(false);
    }
  }

  async function revoke(sessionId: string) {
    if (!capabilities.revokeSessions) return;
    const ok = await showAlert({
      type: 'danger-confirm',
      title: 'ابطال نشست',
      message: 'این دستگاه از حساب شما خارج می‌شود. مطمئن هستید؟',
      confirmText: 'ابطال',
      cancelText: 'بازگشت',
    });
    if (!ok) return;

    try {
      await authedRequest(`/me/sessions/${sessionId}`, { method: 'DELETE' });
      showToast({ title: 'نشست باطل شد' });
      void loadSessions();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'ابطال نشد',
        message: error instanceof ApiError ? error.message : 'خطای نامشخص',
      });
    }
  }

  if (loading) {
    return (
      <div className="calc-card">
        <Skeleton height={20} width="40%" />
        <Skeleton height={44} radius="12px" />
        <Skeleton height={44} radius="12px" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="calc-card">
        <p style={{ fontWeight: 'var(--fw-semibold)' }}>برای دیدن پروفایل وارد شوید</p>
        <Link href="/login/" className="btn btn--primary btn--block">
          ورود به حساب
        </Link>
      </div>
    );
  }

  const usernameError =
    usernameState.status === 'taken' ? usernameState.reason : undefined;
  const usernameHint =
    usernameState.status === 'checking'
      ? 'در حال بررسی…'
      : usernameState.status === 'free'
        ? '✓ این نام کاربری آزاد است'
        : '۳ تا ۳۲ کاراکتر، فقط حروف لاتین، رقم و زیرخط';

  return (
    <div style={{ display: 'grid', gap: 'var(--sp-6)' }}>
      {!capabilities.editProfile ? (
        <div className="guest-notice" role="note">
          <Icon name="alert" size={18} />
          <div>
            <strong>نشست مهمان — ورود با کد یکبارمصرف</strong>
            <p>
              ویرایش پروفایل، ساخت کد تازه و ابطال دستگاهها فقط از نشستی ممکن است
              که با تلگرام وارد شده باشد. سفارشها و اطلاعات حساب همچنان در دسترساند.
            </p>
          </div>
        </div>
      ) : null}

      {/* شناسنامه */}
      <div className="calc-card">
        <div className="row" style={{ gap: 'var(--sp-3)' }}>
          <Avatar name={user.displayName} src={user.avatarUrl} size="lg" />
          <div>
            <p style={{ fontWeight: 'var(--fw-semibold)' }}>{user.displayName}</p>
            <p className="ltr" style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)' }}>
              @{user.username}
            </p>
          </div>
        </div>
      </div>

      {/* نمایش و تم — جبران design.md §3.7 (فاز ۶) */}
      <div className="calc-card">
        <h2 className="section-head__title" style={{ fontSize: 'var(--fs-section)' }}>
          نمایش و تم
        </h2>
        <div className="theme-setting">
          <div>
            <p className="theme-setting__label">حالت رنگی رابط</p>
            <p className="theme-setting__hint">
              «سیستم» از تنظیمات دستگاه شما پیروی میکند. انتخاب شما فقط روی همین
              مرورگر ذخیره میشود و به حساب کاربری ارسال نمیشود.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* ویرایش */}
      <div className="calc-card">
        <h2 className="section-head__title" style={{ fontSize: 'var(--fs-section)' }}>
          ویرایش پروفایل
        </h2>

        <div className="form-grid">
          <TextField
            label="نام"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            disabled={!capabilities.editProfile}
            required
          />
          <TextField
            label="نام خانوادگی"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            disabled={!capabilities.editProfile}
            required
          />
          <TextField
            label="نام نمایشی"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            disabled={!capabilities.editProfile}
          />
          <TextField
            label="نام کاربری"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            hint={usernameHint}
            error={usernameError}
            invalid={Boolean(usernameError)}
            className="ltr"
            disabled={!capabilities.editProfile}
            required
          />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button
            onClick={save}
            loading={saving}
            disabled={Boolean(usernameError) || !capabilities.editProfile}
          >
            ذخیره‌ی تغییرات
          </Button>
        </div>
      </div>

      {/* نشست‌ها */}
      <div className="calc-card">
        <h2 className="section-head__title" style={{ fontSize: 'var(--fs-section)' }}>
          دستگاه‌ها و نشست‌ها
        </h2>

        {sessions === null ? (
          <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
            <Skeleton height={44} radius="8px" />
            <Skeleton height={44} radius="8px" />
          </div>
        ) : sessions.length === 0 ? (
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)' }}>
            نشست فعالی یافت نشد.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="table table--stack">
              <thead>
                <tr>
                  <th>روش ورود</th>
                  <th>آخرین استفاده</th>
                  <th>انقضا</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => (
                  <tr key={session.id}>
                    <td data-label="روش ورود">
                      {session.authMethod === 'telegram_bot' ? 'ربات تلگرام' : session.authMethod}
                      {session.current ? (
                        <span className="badge badge--primary" style={{ marginInlineStart: 8 }}>
                          فعلی
                        </span>
                      ) : null}
                    </td>
                    <td data-label="آخرین استفاده">
                      <JalaliDate value={session.lastUsedAt ?? session.createdAt} variant="short" />
                    </td>
                    <td data-label="انقضا">
                      <JalaliDate value={session.expiresAt} variant="date" />
                    </td>
                    <td data-label="عملیات">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={session.current || !capabilities.revokeSessions}
                        onClick={() => revoke(session.id)}
                      >
                        <Icon name="x" size={14} />
                        ابطال
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              showToast({ title: 'خارج شدید' });
            }}
          >
            <Icon name="x" size={14} />
            خروج از حساب
          </Button>
        </div>
      </div>

      {/* کدهای یکبارمصرف — فقط نشست تلگرامی */}
      <div className="calc-card">
        <h2 className="section-head__title" style={{ fontSize: 'var(--fs-section)' }}>
          کدهای ورود یکبارمصرف
        </h2>

        {!capabilities.issueOtpCode ? (
          <div className="guest-notice guest-notice--inline" role="note">
            <Icon name="alert" size={18} />
            <div>
              <strong>ساخت کد در این نشست مجاز نیست</strong>
              <p>
                برای جلوگیری از زنجیرهای شدن دسترسی، ساخت کد تازه فقط از حسابی
                امکانپذیر است که با تلگرام وارد شده باشد. روی دستگاه اصلی وارد شوید.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="login-note">
              برای دستگاهی که تلگرام در دسترس نیست، کد بسازید و در صفحهی ورود وارد کنید.
              کد {OTP_CODE_TTL_MINUTES} دقیقه اعتبار دارد، فقط یک بار مصرف میشود و
              دقیقاً به همین حساب متصل میشود.
            </p>

            <div className="otp-create">
              <FormField
                label="مدت اعتبار نشست دستگاه دوم"
                htmlFor={otpTtlId}
                hint="پیشفرض ۳۰ روز؛ پس از ورود قابل تغییر نیست"
              >
                <Select
                  id={otpTtlId}
                  value={otpTtl}
                  onChange={(event) => setOtpTtl(Number(event.target.value))}
                >
                  {OTP_SESSION_TTL_OPTIONS.map((days) => (
                    <option key={days} value={days}>
                      {days} روز
                    </option>
                  ))}
                </Select>
              </FormField>

              <Button onClick={createCode} loading={creatingCode}>
                <Icon name="key" size={16} />
                ساخت کد تازه
              </Button>
            </div>

            {newCode ? (
              <div className="otp-code">
                <p className="otp-code__label">کد تازه — فقط همین یک بار نمایش داده میشود</p>
                <p className="otp-code__value ltr" dir="ltr">
                  {newCode.code}
                </p>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <Button variant="outline" size="sm" onClick={copyCode}>
                    <Icon name={copied ? 'check' : 'copy'} size={14} />
                    {copied ? 'کپی شد' : 'کپی کد'}
                  </Button>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
                    انقضا: <JalaliDate value={newCode.expiresAt} variant="date" /> · نشست{' '}
                    {newCode.sessionTtlDays} روز
                  </span>
                </div>
                <p className="otp-code__warn">
                  کد را فقط در اختیار خودتان قرار دهید. سرور فقط هش کد را نگه میدارد؛
                  با بستن این صفحه، نمایش دوبارهی آن ممکن نیست.
                </p>
              </div>
            ) : null}

            {newCode ? <OtpQrPanel code={newCode} onCopied={() => setCopied(true)} /> : null}

            {otpCodes === null ? (
              <div style={{ display: 'grid', gap: 'var(--sp-2)' }}>
                <Skeleton height={44} radius="8px" />
              </div>
            ) : otpCodes.length === 0 ? (
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)' }}>
                هنوز کدی ساخته نشده است.
              </p>
            ) : (
              <div className="table-wrap">
                <table className="table table--stack">
                  <thead>
                    <tr>
                      <th>کد</th>
                      <th>وضعیت</th>
                      <th>نشست</th>
                      <th>انقضای کد</th>
                      <th>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otpCodes.map((item) => (
                      <tr key={item.id}>
                        <td data-label="کد">
                          <span className="ltr">{item.hint ?? '----'}…</span>
                        </td>
                        <td data-label="وضعیت">
                          <Badge tone={OTP_STATUS_TONE[item.status]}>
                            {OTP_STATUS_LABEL[item.status]}
                          </Badge>
                        </td>
                        <td data-label="نشست">{item.sessionTtlDays} روز</td>
                        <td data-label="انقضای کد">
                          <JalaliDate value={item.expiresAt} variant="date" />
                        </td>
                        <td data-label="عملیات">
                          {item.status === 'active' ? (
                            <Button variant="ghost" size="sm" onClick={() => revokeCode(item.id)}>
                              <Icon name="x" size={14} />
                              ابطال
                            </Button>
                          ) : (
                            <span style={{ color: 'var(--c-text-muted)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
        نشانی پروفایل: {BASE_PATH}/profile/
      </p>
    </div>
  );
}
