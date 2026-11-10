'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { TextField } from '@/components/ui/Field';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { useAlert } from '@/components/ui/AlertProvider';
import { useAuth, type AuthUser } from '@/lib/auth-context';
import { ApiError, apiRequest } from '@/lib/api';
import { BASE_PATH } from '@/lib/config';

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
  const { user, loading, reload, signOut, authedRequest } = useAuth();
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

  useEffect(() => {
    if (user) void loadSessions();
  }, [user, loadSessions]);

  async function save() {
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
          ورود با تلگرام
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
            required
          />
          <TextField
            label="نام خانوادگی"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            required
          />
          <TextField
            label="نام نمایشی"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <TextField
            label="نام کاربری"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            hint={usernameHint}
            error={usernameError}
            invalid={Boolean(usernameError)}
            className="ltr"
            required
          />
        </div>

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Button onClick={save} loading={saving} disabled={Boolean(usernameError)}>
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
                        disabled={session.current}
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

      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
        نشانی پیش‌فرض پس از ورود: {BASE_PATH}/profile/
      </p>
    </div>
  );
}
