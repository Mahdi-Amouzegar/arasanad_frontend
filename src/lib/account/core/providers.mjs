/**
 * Extensible login-provider registry for the portable account kit.
 *
 * PORTABILITY CONTRACT: pure ESM, zero imports. Copy this file anywhere.
 *
 * A provider is a *declarative descriptor*, not an implementation. The React
 * adapter and the API client decide how to execute each provider. Adding a
 * future provider (Google, Apple, email magic-link, ...) means calling
 * `registerAuthProvider()` with a descriptor plus one server endpoint; no
 * existing login code needs to change.
 *
 * SECURITY CONTRACT: `trusted` only describes the resulting session class.
 * The server must still decide capabilities from the real session row.
 */

/** Known provider families. `oauth` is the extension point for Google etc. */
export const PROVIDER_KIND = Object.freeze({
  BOT: 'bot',
  WIDGET: 'widget',
  CODE: 'code',
  QR: 'qr',
  OAUTH: 'oauth',
});

/**
 * Validate and freeze a provider descriptor.
 * Required: id, label, kind. Everything else has a safe default.
 */
export function defineProvider(descriptor) {
  if (!descriptor || typeof descriptor !== 'object') {
    throw new TypeError('Provider descriptor must be an object');
  }
  const { id, label, kind } = descriptor;
  if (typeof id !== 'string' || id.trim() === '') {
    throw new TypeError('Provider id must be a non-empty string');
  }
  if (typeof label !== 'string' || label.trim() === '') {
    throw new TypeError('Provider label must be a non-empty string');
  }
  if (typeof kind !== 'string' || !Object.values(PROVIDER_KIND).includes(kind)) {
    throw new TypeError(`Provider kind must be one of ${Object.values(PROVIDER_KIND).join(', ')}`);
  }
  return Object.freeze({
    enabled: true,
    priority: 100,
    authMethod: 'otp',
    trusted: false,
    icon: 'key',
    description: '',
    ...descriptor,
    id,
    label,
    kind,
  });
}

/** Providers shipped with the kit. Order is controlled by `priority`. */
export const BUILTIN_AUTH_PROVIDERS = Object.freeze([
  defineProvider({
    id: 'telegram-bot',
    kind: PROVIDER_KIND.BOT,
    label: 'ورود با ربات تلگرام',
    description: 'روش اصلی؛ نشست کامل و قابل اعتماد',
    authMethod: 'telegram_bot',
    trusted: true,
    priority: 10,
    icon: 'send',
  }),
  defineProvider({
    id: 'telegram-widget',
    kind: PROVIDER_KIND.WIDGET,
    label: 'ورود با تلگرام (ویجت)',
    description: 'جایگزین ویجت برای کاربران خارج از ایران',
    authMethod: 'telegram',
    trusted: true,
    priority: 20,
    icon: 'message',
  }),
  defineProvider({
    id: 'otp-code',
    kind: PROVIDER_KIND.CODE,
    label: 'ورود با کد یک‌بارمصرف',
    description: 'ویژه‌ی دستگاه دوم؛ نشست مهمان با دسترسی محدود',
    authMethod: 'otp',
    trusted: false,
    priority: 30,
    icon: 'key',
  }),
  defineProvider({
    id: 'otp-qr',
    kind: PROVIDER_KIND.QR,
    label: 'ورود با اسکن QR',
    description: 'همان کد یک‌بارمصرف، خوانده‌شده از fragment لینک',
    authMethod: 'otp',
    trusted: false,
    priority: 40,
    icon: 'qrCode',
  }),
]);

/**
 * A minimal template for a future OAuth provider. It is NOT registered and
 * does NOT pretend to work. See README.md for the complete wiring recipe.
 */
export const GOOGLE_PROVIDER_TEMPLATE = Object.freeze(
  defineProvider({
    id: 'google',
    kind: PROVIDER_KIND.OAUTH,
    label: 'ورود با گوگل',
    description: 'الگوی غیرفعال؛ نیازمند مسیر سرور و کلاینت OAuth',
    authMethod: 'google',
    trusted: true,
    enabled: false,
    priority: 50,
    icon: 'globe',
  }),
);

/**
 * Mutable registry factory. Each app can own an isolated registry; the kit
 * also exports a default singleton for the common single-app case.
 */
export function createProviderRegistry(initial = BUILTIN_AUTH_PROVIDERS) {
  const providers = new Map();
  for (const provider of initial) providers.set(provider.id, provider);

  return {
    register(provider) {
      const normalized = defineProvider(provider);
      providers.set(normalized.id, normalized);
      return normalized;
    },
    unregister(id) {
      return providers.delete(id);
    },
    get(id) {
      return providers.get(id) ?? null;
    },
    has(id) {
      return providers.has(id);
    },
    /** Sorted by priority; `enabledOnly` filters disabled templates. */
    list({ enabledOnly = true } = {}) {
      const rows = [...providers.values()];
      return rows
        .filter((provider) => !enabledOnly || provider.enabled !== false)
        .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
    },
    reset() {
      providers.clear();
      for (const provider of initial) providers.set(provider.id, provider);
    },
  };
}

/** Default singleton registry used by the React adapter. */
export const authProviderRegistry = createProviderRegistry();

export function registerAuthProvider(provider) {
  return authProviderRegistry.register(provider);
}

export function listAuthProviders(options) {
  return authProviderRegistry.list(options);
}

export function getAuthProvider(id) {
  return authProviderRegistry.get(id);
}

export function resetAuthProvidersForTests() {
  authProviderRegistry.reset();
}
