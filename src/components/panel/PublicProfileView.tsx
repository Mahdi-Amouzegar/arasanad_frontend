'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/public/PublicLayout';
import { SectionHeading } from '@/components/public/SectionHeading';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { JalaliDate } from '@/components/ui/JalaliDate';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/lib/account';
import { ApiError, apiRequest } from '@/lib/api';
import { isValidPublicId, publicIdFromUserId } from '@/lib/public-id';
import { profileHref } from '@/lib/profiles';

/** فقط فیلدهایی که بکند برای بازدید عمومی آشکار می‌کند. */
interface PublicProfile {
  publicId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarVersion: string;
  role: 'admin' | 'customer';
  memberSince: string;
}

interface PublicDashboard {
  stats: {
    totalProjects: number;
    completedProjects: number;
    activeProjects: number;
  };
  recentProjects: Array<{
    code: string;
    name: string;
    completedAt: string | null;
  }>;
}

/**
 * فاز ۱۲٫۳-م / ۱۲٫۷ — پروفایل عمومی `/panel/<publicId>`.
 *
 * ⚠️ خواندن اطلاعات برای همه آزاد است، ولی دکمه‌ی ویرایش تنها زمانی
 *    نمایان می‌شود که بیننده صاحب پروفایل یا مدیر سایت باشد. خود بکند
 *    هم ویرایش را تنها از مسیر توکن دار `/me` می‌پذیرد (محافظت در عمق).
 */
export function PublicProfileView({ handle }: { handle: string }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [dashboard, setDashboard] = useState<PublicDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setProfile(null);
    setDashboard(null);

    apiRequest<{ profile: PublicProfile; dashboard: PublicDashboard }>(
      `/public/dashboard/${encodeURIComponent(handle)}`,
      { signal: controller.signal },
    )
      .then((data) => {
        setProfile(data.profile);
        setDashboard(data.dashboard);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(
          reason instanceof ApiError
            ? reason.message
            : 'دریافت پروفایل ممکن نشد؛ اتصال اینترنت را بررسی کنید.',
        );
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [handle]);

  const viewerCode = user
    ? isValidPublicId(user.publicId ?? '')
      ? (user.publicId as string).toLowerCase()
      : publicIdFromUserId(user.id)
    : null;
  const isOwner = Boolean(profile) && viewerCode === profile!.publicId.toLowerCase();
  const canEdit = isOwner || user?.role === 'admin';

  return (
    <PublicLayout>
      <section>
        <SectionHeading
          eyebrow="داشبورد عمومی"
          title={profile ? `@${profile.username}` : `@${handle}`}
          description="سابقه و آمار قابل نمایش عمومی کاربر."
        />

        {profile && !isValidPublicId(handle) ? (
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
            آدرس پایدار:{' '}
            <Link href={profileHref(profile.publicId)} className="ltr">
              {profileHref(profile.publicId)}
            </Link>
          </p>
        ) : null}

        {loading ? (
          <div className="calc-card" aria-busy="true">
            <Skeleton height={20} width="40%" />
            <Skeleton height={44} radius="12px" />
          </div>
        ) : error ? (
          <div className="calc-card" role="alert">
            <p style={{ fontWeight: 'var(--fw-semibold)' }}>{error}</p>
            <Link href="/" className="btn btn--outline btn--sm">
              بازگشت به صفحه اصلی
            </Link>
          </div>
        ) : profile ? (
          <>
            <div className="calc-card">
              <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'center' }}>
                <Avatar name={profile.displayName} src={profile.avatarUrl} size="lg" />
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 'var(--fw-semibold)' }}>{profile.displayName}</p>
                  <p
                    className="ltr"
                    style={{ fontSize: 'var(--fs-sm)', color: 'var(--c-text-secondary)' }}
                  >
                    @{profile.username}
                  </p>
                </div>
                <Badge tone={profile.role === 'admin' ? 'primary' : 'neutral'}>
                  {profile.role === 'admin' ? 'مدیر سایت' : 'کاربر'}
                </Badge>
              </div>

              <div
                className="row"
                style={{
                  gap: 'var(--sp-6)',
                  marginTop: 'var(--sp-4)',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
                    تاریخ عضویت
                  </p>
                  <JalaliDate value={profile.memberSince} variant="date" />
                </div>
                <div>
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--c-text-muted)' }}>
                    نقش کاربر
                  </p>
                  <strong>{profile.role === 'admin' ? 'مدیر سایت' : 'کاربر'}</strong>
                </div>
              </div>

              {canEdit ? (
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--sp-4)' }}>
                  <Link href="/profile/" className="btn btn--outline btn--sm">
                    ویرایش پروفایل
                  </Link>
                </div>
              ) : null}
            </div>

            {dashboard ? (
              <>
                <div className="adm-stats-grid">
                  <div className="stat">
                    <span className="stat__label">کل سفارشات</span>
                    <span className="stat__value">{dashboard.stats.totalProjects.toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat__label">تکمیل‌شده</span>
                    <span className="stat__value">{dashboard.stats.completedProjects.toLocaleString('fa-IR')}</span>
                  </div>
                  <div className="stat">
                    <span className="stat__label">در حال انجام</span>
                    <span className="stat__value">{dashboard.stats.activeProjects.toLocaleString('fa-IR')}</span>
                  </div>
                </div>

                <div className="calc-card">
                  <h2 style={{ fontSize: 'var(--fs-section)', marginBottom: 'var(--sp-3)' }}>
                    آخرین سفارشات تکمیل‌شده
                  </h2>
                  {dashboard.recentProjects.length === 0 ? (
                    <p style={{ color: 'var(--c-text-secondary)' }}>هنوز سفارش تکمیل‌شدهای ثبت نشده است.</p>
                  ) : (
                    <ul className="row" style={{ flexDirection: 'column', gap: 'var(--sp-2)' }}>
                      {dashboard.recentProjects.map((project) => (
                        <li key={`${project.code}-${project.completedAt ?? ''}`}>
                          <span className="prj-code">{project.code}</span> — <strong>{project.name}</strong>
                          {project.completedAt ? (
                            <> · <JalaliDate value={project.completedAt} variant="date" /></>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            ) : null}

            {!user ? (
              <div className="guest-notice" role="note">
                <Icon name="alert" size={18} />
                <div>
                  <strong>مشاهده به‌عنوان مهمان</strong>
                  <p>برای ویرایش اطلاعات حساب خود، وارد شوید.</p>
                  <Link href="/login/" className="btn btn--primary btn--sm">
                    ورود به حساب
                  </Link>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </PublicLayout>
  );
}
