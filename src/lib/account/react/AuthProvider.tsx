'use client';

/**
 * React adapter for the portable account kit.
 *
 * This is the ONLY place that owns session state. Every screen, guard and
 * helper reads it through `useAuth()` / `@/lib/account`, so no component
 * re-implements "is the user signed in", "may they do this", token storage,
 * cross-tab sync or capability loading.
 *
 * The host project injects transport, device info, user normalization and
 * optional post-login effects through `AccountKitConfig`.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  GUEST_CAPABILITIES,
  normalizeCapabilities,
  hasCapability,
  canAccessSection as coreCanAccessSection,
  checkAccess as coreCheckAccess,
} from '../core/capabilities.mjs';
import { createTokenStore } from '../core/session.mjs';
import { listAuthProviders } from '../core/providers.mjs';
import { createAccountClient } from '../api/client';
import { getAccountKitConfig } from '../api/config';
import type {
  AccountKitConfig,
  AuthContextValue,
  AuthUser,
  Capabilities,
  MeResponse,
} from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AccountAuthProviderProps {
  children: ReactNode;
  /** Omit to use the singleton installed by `configureAccountKit`. */
  config?: AccountKitConfig;
}

export function AccountAuthProvider({ children, config }: AccountAuthProviderProps) {
  const resolved = useMemo<AccountKitConfig>(
    () => config ?? getAccountKitConfig(),
    [config],
  );
  const store = useMemo(() => createTokenStore(resolved.tokenStorage), [resolved]);
  const client = useMemo(() => createAccountClient(resolved), [resolved]);

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities>({
    ...GUEST_CAPABILITIES,
  });
  const [loading, setLoading] = useState(true);

  /** Fail closed: clear both the store and every in-memory permission. */
  const clear = useCallback(() => {
    store.clear();
    setToken(null);
    setUser(null);
    setCapabilities({ ...GUEST_CAPABILITIES });
  }, [store]);

  const loadMe = useCallback(
    async (activeToken: string) => {
      try {
        const data = await client.me(activeToken) as MeResponse;
        setUser(resolved.normalizeUser(data.user));
        // A legacy server response without capabilities must stay guest.
        setCapabilities({ ...normalizeCapabilities(data.capabilities) });
      } catch (error) {
        if (resolved.isUnauthorized(error)) clear();
      }
    },
    [client, clear, resolved],
  );

  // Restore the persisted session once, on mount.
  useEffect(() => {
    const stored = store.read();
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    void loadMe(stored).finally(() => setLoading(false));
  }, [loadMe, store]);

  // Sign-in / sign-out in another tab: only external changes need handling,
  // because our own writes already update local state synchronously.
  useEffect(() => {
    return store.subscribe((value, change) => {
      if (!change.external) return;
      if (!value) {
        setToken(null);
        setUser(null);
        setCapabilities({ ...GUEST_CAPABILITIES });
        return;
      }
      setToken(value);
      void loadMe(value);
    });
  }, [store, loadMe]);

  const signIn = useCallback(
    (nextToken: string, nextUser: AuthUser) => {
      store.write(nextToken);
      setToken(nextToken);
      setUser(resolved.normalizeUser(nextUser));
      // Login responses carry no capabilities; stay guest until `/me` answers.
      setCapabilities({ ...GUEST_CAPABILITIES });
      void loadMe(nextToken);
    },
    [store, resolved, loadMe],
  );

  const signOut = useCallback(async () => {
    const activeToken = store.read();
    if (activeToken) {
      try {
        await client.logout(activeToken);
      } catch {
        /* the local session is cleared even when the server is unreachable */
      }
    }
    clear();
  }, [store, client, clear]);

  const reload = useCallback(async () => {
    const activeToken = store.read();
    if (activeToken) await loadMe(activeToken);
  }, [store, loadMe]);

  const authedRequest = useCallback(
    async <T,>(
      path: string,
      options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {},
    ): Promise<T> => {
      const activeToken = store.read();
      if (!activeToken) throw resolved.createUnauthorizedError();
      return resolved.request<T>(path, { ...options, token: activeToken });
    },
    [store, resolved],
  );

  // Host-specific post-login effects (for example an avatar migration) live
  // in the injected hook. The hook owns its own deduplication.
  useEffect(() => {
    if (!user || !token || !resolved.onUserLoaded) return;
    resolved.onUserLoaded({ user, token, capabilities, reload });
  }, [user, token, capabilities, reload, resolved]);

  const accessState = useMemo(
    () => ({ token, user, capabilities }),
    [token, user, capabilities],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      capabilities,
      loading,
      signIn,
      signOut,
      reload,
      authedRequest,
      can: (capability) => hasCapability(accessState, capability),
      canAccessSection: (section) => coreCanAccessSection(accessState, section),
      checkAccess: (rule) => coreCheckAccess(accessState, rule),
      providers: listAuthProviders(),
    }),
    [
      user,
      token,
      capabilities,
      loading,
      signIn,
      signOut,
      reload,
      authedRequest,
      accessState,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Backwards-friendly alias; prefer `AccountAuthProvider`. */
export const AuthProvider = AccountAuthProvider;

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AccountAuthProvider>');
  }
  return context;
}
