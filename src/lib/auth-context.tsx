'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, apiRequest, getDeviceId, getDeviceName } from './api';

export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  profileComplete: boolean;
}

interface MeResponse {
  user: AuthUser;
  session: { id: string; createdAt: string; expiresAt: string; authMethod: string } | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** در حال بازیابی نشست از حافظه */
  loading: boolean;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  /** برای فراخوانی API با توکن فعلی */
  authedRequest: <T>(path: string, options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown }) => Promise<T>;
}

const TOKEN_KEY = 'arasanad_token';

const AuthContext = createContext<AuthContextValue | null>(null);

function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const loadMe = useCallback(
    async (activeToken: string) => {
      try {
        const data = await apiRequest<MeResponse>('/auth/me', { token: activeToken });
        setUser(data.user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) clear();
      }
    },
    [clear],
  );

  // بازیابی نشست در نخستین بارگذاری
  useEffect(() => {
    const stored = readToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    void loadMe(stored).finally(() => setLoading(false));
  }, [loadMe]);

  // همگام‌سازی بین تب‌ها
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TOKEN_KEY) return;
      if (!event.newValue) {
        setToken(null);
        setUser(null);
        return;
      }
      setToken(event.newValue);
      void loadMe(event.newValue);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadMe]);

  const signIn = useCallback((nextToken: string, nextUser: AuthUser) => {
    window.localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const signOut = useCallback(async () => {
    const activeToken = readToken();
    if (activeToken) {
      try {
        await apiRequest('/auth/logout', { method: 'POST', token: activeToken });
      } catch {
        /* حتی اگر سرور پاسخ نداد، نشست محلی پاک می‌شود */
      }
    }
    clear();
  }, [clear]);

  const reload = useCallback(async () => {
    const activeToken = readToken();
    if (activeToken) await loadMe(activeToken);
  }, [loadMe]);

  const authedRequest = useCallback(
    async <T,>(
      path: string,
      options: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown } = {},
    ): Promise<T> => {
      const activeToken = readToken();
      if (!activeToken) throw new ApiError('UNAUTHORIZED', 'برای این عملیات باید وارد شوید', 401);
      return apiRequest<T>(path, { ...options, token: activeToken });
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, signIn, signOut, reload, authedRequest }),
    [user, token, loading, signIn, signOut, reload, authedRequest],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth باید داخل <AuthProvider> استفاده شود');
  return context;
}

/* ─────────────────────── کمکی‌های ورود ─────────────────────── */

export interface BotStartResponse {
  loginId: string;
  deepLink: string;
  expiresAt: string;
}

/** آغاز ورود با ربات. */
export function startBotLogin(): Promise<BotStartResponse> {
  return apiRequest<BotStartResponse>('/auth/bot/start', { method: 'POST', body: {} });
}

export interface BotStatusResponse {
  status: 'pending' | 'ok' | 'expired' | 'used';
  token?: string;
  user?: AuthUser;
}

/** بررسی وضعیت ورود. */
export function checkBotStatus(loginId: string): Promise<BotStatusResponse> {
  const params = new URLSearchParams({
    loginId,
    deviceId: getDeviceId(),
    deviceName: getDeviceName(),
  });
  return apiRequest<BotStatusResponse>(`/auth/bot/status?${params.toString()}`);
}
