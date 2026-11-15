'use client';

/**
 * Reusable authorization entry points.
 *
 * Instead of writing `if (!user)` or `if (!capabilities.editProfile)` inside
 * every screen, route or button, use one of these hooks/components. They all
 * delegate to the single `checkAccess` rule engine in `core/capabilities.mjs`.
 */

import type { ReactNode } from 'react';
import { useAuth } from './AuthProvider';
import type { AccessRule, Capabilities } from '../types';

export interface AccessApi {
  isSignedIn: boolean;
  loading: boolean;
  role: string | null;
  capabilities: Capabilities;
  can: (capability: keyof Capabilities | string) => boolean;
  canAccess: (rule: AccessRule) => boolean;
  canAccessSection: (section: string) => boolean;
  checkAccess: ReturnType<typeof useAuth>['checkAccess'];
}

/** All account/authorization checks from one hook. */
export function useAccess(): AccessApi {
  const auth = useAuth();
  return {
    isSignedIn: Boolean(auth.token && auth.user),
    loading: auth.loading,
    role: auth.user?.role ?? null,
    capabilities: auth.capabilities,
    can: auth.can,
    canAccess: (rule) => auth.checkAccess(rule).allowed,
    canAccessSection: auth.canAccessSection,
    checkAccess: auth.checkAccess,
  };
}

/** Boolean shorthand for a single capability. */
export function useCapability(capability: keyof Capabilities | string): boolean {
  return useAuth().can(capability);
}

/** Boolean shorthand for a named section. */
export function useSectionAccess(section: string): boolean {
  return useAuth().canAccessSection(section);
}

export interface GuardProps {
  children: ReactNode;
  /** Rendered instead of `children` when access is denied. */
  fallback?: ReactNode;
  /** Rendered while the session is still being restored. */
  pending?: ReactNode;
}

function GuardShell({
  auth,
  allowed,
  fallback,
  pending,
  children,
}: GuardProps & {
  auth: ReturnType<typeof useAuth>;
  allowed: boolean;
}) {
  if (auth.loading) return <>{pending ?? null}</>;
  if (!allowed) return <>{fallback ?? null}</>;
  return <>{children}</>;
}

/** Requires any signed-in account. */
export function RequireAuth(props: GuardProps) {
  const auth = useAuth();
  return (
    <GuardShell
      auth={auth}
      allowed={Boolean(auth.token && auth.user)}
      {...props}
    />
  );
}

/** Requires one capability (the server still enforces the real boundary). */
export function RequireCapability({
  capability,
  ...rest
}: GuardProps & { capability: keyof Capabilities | string }) {
  const auth = useAuth();
  return <GuardShell auth={auth} allowed={auth.can(capability)} {...rest} />;
}

/** Requires one of the listed roles, e.g. `roles={['admin']}`. */
export function RequireRole({ roles, ...rest }: GuardProps & { roles: string[] }) {
  const auth = useAuth();
  const allowed = Boolean(auth.user && roles.includes(auth.user.role));
  return <GuardShell auth={auth} allowed={allowed} {...rest} />;
}

/** Requires permission to enter a named section from `SECTION_RULES`. */
export function RequireSection({ section, ...rest }: GuardProps & { section: string }) {
  const auth = useAuth();
  return (
    <GuardShell
      auth={auth}
      allowed={auth.canAccessSection(section)}
      {...rest}
    />
  );
}
