/**
 * Token storage and cross-tab session synchronization.
 *
 * PORTABILITY CONTRACT: pure ESM, zero imports. All browser globals are
 * injected or resolved lazily, so this module also runs in node:test.
 */

export const DEFAULT_TOKEN_STORAGE_KEY = 'arasanad_token';

/** A dependency-free in-memory storage, handy for tests and SSR. */
export function createMemoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = String(next);
    },
    removeItem: () => {
      value = null;
    },
  };
}

/** Resolve the platform storage only when a token operation actually runs. */
function defaultStorage(storage) {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return createMemoryStorage();
}

/**
 * A small observable token store.
 *
 * - Local writes notify subscribers immediately.
 * - Writes in other tabs arrive through the `storage` event.
 * - `dispose()` removes the listener; safe to call more than once.
 *
 * @param {{
 *   storageKey?: string,
 *   storage?: { getItem: Function, setItem: Function, removeItem: Function },
 *   windowImpl?: { addEventListener?: Function, removeEventListener?: Function }
 * }} [options]
 */
export function createTokenStore(options = {}) {
  const key = options.storageKey ?? DEFAULT_TOKEN_STORAGE_KEY;
  const storage = defaultStorage(options.storage);
  const win =
    options.windowImpl ?? (typeof window !== 'undefined' ? window : null);
  const listeners = new Set();
  let disposed = false;

  const notify = (value, external) => {
    for (const listener of [...listeners]) {
      try {
        listener(value, { external });
      } catch {
        /* one bad subscriber must not break the others */
      }
    }
  };

  const onStorage = (event) => {
    if (event && event.key !== null && event.key !== key) return;
    const value = event?.newValue ?? null;
    notify(value, true);
  };

  if (win?.addEventListener) win.addEventListener('storage', onStorage);

  return {
    storageKey: key,
    read() {
      try {
        return storage.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    write(value) {
      try {
        storage.setItem(key, String(value));
      } catch {
        /* private mode / quota: keep the in-memory state usable */
      }
      notify(String(value), false);
    },
    clear() {
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
      notify(null, false);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (win?.removeEventListener) win.removeEventListener('storage', onStorage);
      listeners.clear();
    },
  };
}
