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
import { ApiError, API_BASE, apiRequest, getDeviceId, getDeviceName } from './api';
import { migrateTelegramAvatar } from './avatar';

export interface AuthUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string | null;
  /** منبع تصویر پروفایل — مبنای تصمیم مهاجرت یک‌باره به پارس‌پک */
  avatarSource?: 'parspack' | 'telegram' | 'external' | 'none';
  /** نسخه‌ی پایدار برای شکستن کش (وابسته به محتوا، نه به زمان) */
  avatarVersion?: string;
  /** نقش کاربر — از سرور می‌آید و مرجع نهایی است */
  role: 'admin' | 'customer';
  profileComplete: boolean;
}

/**
 * قابلیتهای نشست — دقیقاً همان چیزی که سرور در `/auth/me` محاسبه می‌کند.
 * ⚠️ فرانت‌اند این پرچمها را بازسازی نمی‌کند؛ فقط نمایش می‌دهد تا دکمهای
 *    اضافهای نشان ندهد. امنیت واقعی همچنان سمت سرور است.
 * ⚠️ مقدار پیش‌فرض «همه بسته» است: تا پیش از پاسخ سرور، هیچ عملیاتی مجاز نیست.
 */
export interface Capabilities {
  issueOtpCode: boolean;
  editProfile: boolean;
  revokeSessions: boolean;
}

const GUEST_CAPABILITIES: Capabilities = {
  issueOtpCode: false,
  editProfile: false,
  revokeSessions: false,
};

interface MeResponse {
  user: AuthUser;
  capabilities?: Capabilities;
  session: { id: string; createdAt: string; expiresAt: string; authMethod: string } | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  /** قابلیتهای محاسبهشده توسط سرور — مرجع نمایش دکمها */
  capabilities: Capabilities;
  /** در حال بازیابی نشست از حافظه */
  loading: boolean;
  signIn: (token: string, user: AuthUser) => void;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  /** برای فراخوانی API با توکن فعلی */
  authedRequest: <T>(path: string, options?: { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown }) => Promise<T>;
}

const TOKEN_KEY = 'arasanad_token';

/**
 * نگهبان «یک‌باره» برای مهاجرت عکس تلگرام.
 *
 * ⚠️ در سطح ماژول است، نه در state: اگر در state باشد، `reload()` پس از
 *    آپلود دوباره آن را خالی می‌کند و حلقه‌ی بیهوده‌ی دانلود/آپلود
 *    شکل می‌گیرد. بعد از موفقیت، سرور `avatarSource=parspack` می‌فرستد؛
 *    بعد از شکست هم `Set` جلوی تلاش مکرر را می‌گیرد.
 */
const attemptedAvatarMigration = new Set<string>();

/**
 * مسیرهای نسبی رسانه (`/media/avatar/...`) باید به آدرس API تبدیل شوند.
 * ⚠️ آواتار تلگرام از واسط سرور می‌آید تا توکن ربات در مرورگر قرار نگیرد.
 */
function normalizeUser(user: AuthUser): AuthUser {
  if (user.avatarUrl && user.avatarUrl.startsWith('/')) {
    // ⚠️ نسخه فقط وقتی عوض می‌شود که مرجع تصویر عوض شده باشد. استفاده از
    //    `Date.now()` در هر رندر، مرورگر را مجبور به دانلود دوباره‌ی تصویر
    //    و انباشتن بایت‌ها در حافظه می‌کرد.
    const separator = user.avatarUrl.includes('?') ? '&' : '?';
    const version = encodeURIComponent(user.avatarVersion ?? '0');
    return { ...user, avatarUrl: `${API_BASE}${user.avatarUrl}${separator}v=${version}` };
  }
  return user;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities>(GUEST_CAPABILITIES);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(() => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setCapabilities(GUEST_CAPABILITIES);
  }, []);

  const loadMe = useCallback(
    async (activeToken: string) => {
      try {
        const data = await apiRequest<MeResponse>('/auth/me', { token: activeToken });
        setUser(normalizeUser(data.user));
        // اگر پاسخ قدیمی سرور فاقد capabilities باشد، حالت امن (مهمان) حفظ می‌شود.
        setCapabilities(data.capabilities ?? GUEST_CAPABILITIES);
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
        setCapabilities(GUEST_CAPABILITIES);
        return;
      }
      setToken(event.newValue);
      void loadMe(event.newValue);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [loadMe]);

  /**
   * مهاجرت خودکار عکس تلگرام به پارس‌پک — دقیقاً یک بار برای هر کاربر.
   *
   * تصویر از واسط خود بک‌اند گرفته می‌شود، پس نیازی به VPN نیست. تا پیش
   * از موفقیت، همان واسط قدیمی تصویر را نشان می‌دهد؛ شکست، تجربه‌ی کاربر
   * را خراب نمی‌کند و هیچ درخواست تکراری ایجاد نمی‌کند.
   */
  useEffect(() => {
    if (!user || !token || !capabilities.editProfile) return;
    if (user.avatarSource !== 'telegram') return;
    if (attemptedAvatarMigration.has(user.id)) return;
    attemptedAvatarMigration.add(user.id);

    void (async () => {
      try {
        const result = await migrateTelegramAvatar(token, user.id);
        if (result) await loadMe(token);
      } catch {
        /* منبع قدیمی همچنان در دسترس است؛ تلاش مکرر ممنوع */
      }
    })();
  }, [user, token, capabilities.editProfile, loadMe]);

  const signIn = useCallback(
    (nextToken: string, nextUser: AuthUser) => {
      window.localStorage.setItem(TOKEN_KEY, nextToken);
      setToken(nextToken);
      setUser(normalizeUser(nextUser));
      // پاسخ ورود (ربات/کد) قابلیتها ندارد؛ بلافاصله از `/auth/me` می‌گیریم.
      // تا آن لحظه حالت مهمان برقرار است تا دکمهای حساس زودتر ظاهر نشوند.
      setCapabilities(GUEST_CAPABILITIES);
      void loadMe(nextToken);
    },
    [loadMe],
  );

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
    () => ({ user, token, capabilities, loading, signIn, signOut, reload, authedRequest }),
    [user, token, capabilities, loading, signIn, signOut, reload, authedRequest],
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
  /** توکن دستور `/start` — برای ارسال دستی از حسابی دیگر */
  startToken: string;
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
