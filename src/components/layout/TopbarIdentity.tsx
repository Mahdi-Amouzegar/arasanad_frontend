'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/account';
import { Avatar } from '@/components/ui/Avatar';

/**
 * فاز ۱۲٫۱۵-د: هویت کاربر فعال در نوار بالای تمام صفحات شخصی.
 * آواتار و نام به‌صورت عمودی روی هم و در سمت راست نوار قرار می‌گیرند.
 */
export function TopbarIdentity() {
  const { user } = useAuth();
  if (!user) return null;
  const name = user.displayName || `@${user.username}`;
  return (
    <Link
      className="topbar__identity"
      href={user.role === 'admin' ? '/admin/' : '/panel/'}
      title={`@${user.username}`}
      aria-label={`حساب فعال: ${name}`}
    >
      <Avatar name={name} src={user.avatarUrl} size="sm" />
      <span className="topbar__identity-name">{name}</span>
    </Link>
  );
}
