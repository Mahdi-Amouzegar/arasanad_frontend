/**
 * انبار وضعیت قابل‌مشاهده — کوچک‌ترین واحد مشترک کتابخانه.
 *
 * ⚠️ `getSnapshot` همیشه همان مرجع را برمی‌گرداند مگر اینکه واقعاً
 *    تغییری رخ دهد؛ این شرط لازم `useSyncExternalStore` در ری‌اکت است.
 * ⚠️ هیچ وابستگی بیرونی ندارد و در Node، مرورگر و Worker یکسان کار می‌کند.
 */

/**
 * @template T
 * @param {T} initialState
 */
export function createStore(initialState) {
  let state = Object.freeze({ ...initialState });
  /** @type {Set<(state: T) => void>} */
  const listeners = new Set();

  function getSnapshot() {
    return state;
  }

  /** @param {(state: T) => void} listener */
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /**
   * @param {Partial<T> | ((state: T) => Partial<T>)} patch
   * @returns {T}
   */
  function setState(patch) {
    const delta = typeof patch === 'function' ? patch(state) : patch;
    const next = Object.freeze({ ...state, ...delta });

    let changed = false;
    const keys = new Set([...Object.keys(state), ...Object.keys(next)]);
    for (const key of keys) {
      if (!Object.is(state[key], next[key])) {
        changed = true;
        break;
      }
    }
    if (!changed) return state;

    state = next;
    for (const listener of [...listeners]) {
      try {
        listener(state);
      } catch {
        /* خطای یک مشترک نباید بقیه را مختل کند */
      }
    }
    return state;
  }

  /** @param {T} [next] */
  function reset(next = initialState) {
    state = Object.freeze({ ...next });
    for (const listener of [...listeners]) {
      try {
        listener(state);
      } catch {
        /* نادیده گرفتن خطای مشترک */
      }
    }
    return state;
  }

  function listenerCount() {
    return listeners.size;
  }

  return { getSnapshot, subscribe, setState, reset, listenerCount };
}
