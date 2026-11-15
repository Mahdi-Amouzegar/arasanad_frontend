'use client';

/**
 * Project-level wiring for the portable `@/lib/account` kit.
 *
 * ⚠️ This is the ONLY file that knows about this project's API client, its
 *    error class, its avatar pipeline and its device-id helpers. Everything
 *    else in the app imports account functionality from `@/lib/account`.
 *
 * ⚠️ The library itself stays framework- and project-agnostic: all of the
 *    above is injected here, once, at startup.
 */

import type { ReactNode } from 'react';
import {
  ApiError,
  API_BASE,
  apiRequest,
  getDeviceId,
  getDeviceName,
} from '@/lib/api';
import { migrateTelegramAvatar } from '@/lib/avatar';
import {
  AccountAuthProvider,
  configureAccountKit,
  type AuthUser,
} from '@/lib/account';

/**
 * Relative media paths (`/media/avatar/...`) must be resolved against the API
 * origin. A stable, content-derived version avoids re-downloading the image
 * on every render.
 */
function normalizeUser(user: AuthUser): AuthUser {
  if (user.avatarUrl && user.avatarUrl.startsWith('/')) {
    const separator = user.avatarUrl.includes('?') ? '&' : '?';
    const version = encodeURIComponent(user.avatarVersion ?? '0');
    return { ...user, avatarUrl: `${API_BASE}${user.avatarUrl}${separator}v=${version}` };
  }
  return user;
}

/**
 * One-time Telegram avatar migration. Module-level deduplication is required:
 * keeping it in React state would be reset by `reload()` and cause a loop.
 */
const attemptedAvatarMigration = new Set<string>();

const accountKitConfig = configureAccountKit({
  request: apiRequest,
  device: () => ({ deviceId: getDeviceId(), deviceName: getDeviceName() }),
  normalizeUser,
  isUnauthorized: (error) => error instanceof ApiError && error.status === 401,
  createUnauthorizedError: () =>
    new ApiError('UNAUTHORIZED', 'برای این عملیات باید وارد شوید', 401),
  onUserLoaded: ({ user, token, capabilities, reload }) => {
    if (!capabilities.editProfile) return;
    if (user.avatarSource !== 'telegram') return;
    if (attemptedAvatarMigration.has(user.id)) return;
    attemptedAvatarMigration.add(user.id);
    void (async () => {
      try {
        const result = await migrateTelegramAvatar(token, user.id);
        if (result) await reload();
      } catch {
        /* the old Telegram proxy keeps working; never retry in a loop */
      }
    })();
  },
});

// The same call installs the singleton used by free-standing helpers such as
// `startBotLogin`, `loginWithOtpCode` and `createOtpCode`. They resolve it
// lazily at call time, so one configuration at startup is enough.

export function AccountProvider({ children }: { children: ReactNode }) {
  return <AccountAuthProvider config={accountKitConfig}>{children}</AccountAuthProvider>;
}
