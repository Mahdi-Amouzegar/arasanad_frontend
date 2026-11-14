/**
 * تست‌های کتابخانه‌ی مدیریت اتصال.
 *
 * تمام وابستگی‌ها (fetch، window، navigator، انبار) تزریق می‌شوند؛
 * بنابراین تست‌ها بدون مرورگر، بدون شبکه‌ی واقعی و بدون تایمر باقی‌مانده
 * اجرا می‌شوند.
 */

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  configureConnectivity,
  getConnectivityConfig,
  resetConnectivityConfigForTests,
  createStore,
  networkStore,
  getNetworkSnapshot,
  subscribeNetwork,
  probeConnection,
  isOnline,
  getNetworkStatus,
  noteRequestOutcome,
  waitForOnline,
  startNetworkMonitor,
  stopNetworkMonitor,
  resetNetworkForTests,
  getServerTimeSnapshot,
  subscribeServerTime,
  defaultTimeSources,
  syncServerTime,
  nowMs,
  timestampForEvent,
  isServerTimeTrusted,
  describeServerTimePhase,
  resetServerTimeForTests,
  backoffDelay,
  withRetry,
  createOfflineQueue,
  connectivityFetch,
  getConnectionQuality,
  shouldDeferHeavyTransfer,
} from '../src/lib/connectivity/index.mjs';

function fakeResponse({ ok = true, status = 200, json = null, text = '', date = null } = {}) {
  return {
    ok,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'date' ? date : null) },
    json: async () => json,
    text: async () => text,
    clone() {
      return fakeResponse({ ok, status, json, text, date });
    },
  };
}

beforeEach(() => {
  resetNetworkForTests();
  resetServerTimeForTests();
  resetConnectivityConfigForTests();
  configureConnectivity({
    probeUrls: ['/probe'],
    probeTimeoutMs: 50,
    timeSourceTimeoutMs: 50,
    networkVerdictTimeoutMs: 80,
    monitorIntervalMs: 100_000,
    resyncIntervalMs: 0,
    fetchImpl: async () => fakeResponse(),
  });
});

test('store publishes immutable snapshots only when something really changed', () => {
  const store = createStore({ value: 1 });
  const seen = [];
  const unsubscribe = store.subscribe((snapshot) => seen.push(snapshot));

  store.setState({ value: 1 });
  assert.equal(seen.length, 0, 'no-op updates must not notify');

  const next = store.setState((prev) => ({ value: prev.value + 1 }));
  assert.equal(next.value, 2);
  assert.equal(seen.length, 1);
  assert.ok(Object.isFrozen(next));

  unsubscribe();
  store.setState({ value: 3 });
  assert.equal(seen.length, 1);
  assert.equal(store.listenerCount(), 0);
});

test('configuration merges values and does not leak a mutable probeUrls array', () => {
  const config = configureConnectivity({ apiBaseUrl: 'https://api.example/v1', probeUrls: ['/a'] });
  assert.equal(config.apiBaseUrl, 'https://api.example/v1');
  config.probeUrls.push('/b');
  assert.equal(getConnectivityConfig().probeUrls.length, 1);
});

test('probe falls through to the next URL and accepts any HTTP response as reachable', async () => {
  const calls = [];
  configureConnectivity({
    probeUrls: ['/first', '/second'],
    fetchImpl: async (url) => {
      calls.push(url);
      if (url === '/first') throw new Error('network down');
      return fakeResponse({ ok: false, status: 405 });
    },
  });

  assert.equal(await probeConnection({ force: true }), true);
  assert.deepEqual(calls, ['/first', '/second']);
  assert.equal(getNetworkStatus(), 'online');
});

test('a captive-portal response is rejected by the optional validator', async () => {
  configureConnectivity({
    probeUrls: [
      { url: '/health', method: 'GET', validate: (_res, text) => text.includes('"ok":true') },
      '/manifest.webmanifest',
    ],
    fetchImpl: async (url) =>
      url === '/health'
        ? fakeResponse({ text: '<html>login</html>' })
        : fakeResponse(),
  });
  assert.equal(await probeConnection({ force: true }), true);
  assert.equal(getNetworkSnapshot().reason, null);
});

test('when every probe fails the network is marked offline', async () => {
  configureConnectivity({
    probeUrls: ['/a', '/b'],
    fetchImpl: async () => {
      throw new Error('down');
    },
  });
  assert.equal(await probeConnection({ force: true }), false);
  assert.equal(getNetworkStatus(), 'offline');
  assert.equal(isOnline(), false);
});

test('noteRequestOutcome is the single source of truth for request results', () => {
  noteRequestOutcome({ ok: false });
  assert.equal(getNetworkStatus(), 'offline');
  noteRequestOutcome({ ok: true });
  assert.equal(getNetworkStatus(), 'online');
  assert.equal(getNetworkSnapshot().source, 'request');
});

test('waitForOnline resolves as soon as the library probe confirms connectivity', async () => {
  noteRequestOutcome({ ok: false });
  assert.equal(await waitForOnline({ timeoutMs: 300 }), true);
  assert.equal(getNetworkStatus(), 'online');
});

test('network monitor is idempotent and follows browser online/offline events', async () => {
  const listeners = new Map();
  const fakeWindow = {
    addEventListener: (type, fn) => listeners.set(type, fn),
    removeEventListener: (type) => listeners.delete(type),
  };
  configureConnectivity({
    windowImpl: fakeWindow,
    navigatorImpl: { onLine: true },
    fetchImpl: async () => fakeResponse(),
  });

  startNetworkMonitor();
  startNetworkMonitor();
  assert.equal(listeners.size, 2, 'listeners must not be registered twice');
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(getNetworkStatus(), 'online');

  listeners.get('offline')();
  assert.equal(getNetworkStatus(), 'offline');
  listeners.get('online')();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(getNetworkStatus(), 'online');

  stopNetworkMonitor();
  assert.equal(listeners.size, 0);
});

test('default time sources are four with own API, three without', () => {
  assert.equal(defaultTimeSources('https://api.example/v1').length, 4);
  assert.equal(defaultTimeSources().length, 3);
  assert.equal(defaultTimeSources('https://api.example/v1')[0].id, 'own-api');
});

test('each default time source parser normalizes its provider format', async () => {
  const sources = defaultTimeSources('https://api.example/v1');
  const expected = Date.parse('2026-11-14T18:00:00.000Z');

  assert.equal(
    await sources[0].parse(fakeResponse({ json: { data: { time: '2026-11-14T18:00:00.000Z' } } })),
    expected,
  );
  assert.equal(
    await sources[1].parse(fakeResponse({ json: { unixtime: expected / 1000 } })),
    expected,
  );
  assert.equal(
    await sources[2].parse(
      fakeResponse({
        json: { year: 2026, month: 11, day: 14, hour: 18, minute: 0, seconds: 0, milliSeconds: 0 },
      }),
    ),
    expected,
  );
  assert.equal(
    await sources[3].parse(fakeResponse({ date: 'Sat, 14 Nov 2026 18:00:00 GMT' })),
    expected,
  );
});

test('server time tries sources in order and publishes checking/searching phases', async () => {
  const phases = [];
  const unsubscribe = subscribeServerTime((snapshot) =>
    phases.push({ phase: snapshot.phase, attempt: snapshot.attempt, total: snapshot.total }),
  );
  const fixed = Date.now();
  configureConnectivity({
    timeSources: [
      { id: 'dead', label: 'منبع مرده', url: '/dead', parse: async () => { throw new Error('dead'); } },
      { id: 'good', label: 'منبع سالم', url: '/good', parse: async () => fixed },
      { id: 'never', label: 'منبع سوم', url: '/never', parse: async () => fixed },
    ],
  });
  noteRequestOutcome({ ok: true });

  const result = await syncServerTime({ force: true });
  unsubscribe();

  assert.equal(result.source, 'good');
  assert.ok(phases.some((entry) => entry.phase === 'checking'));
  assert.ok(
    phases.some(
      (entry) => entry.phase === 'searching' && entry.attempt === 1 && entry.total === 3,
    ),
    'consumers must see the searching state before time arrives',
  );
  assert.equal(getServerTimeSnapshot().phase, 'synced');
  assert.equal(isServerTimeTrusted(), true);
  assert.ok(Math.abs(nowMs() - Date.now()) < 5_000);
  assert.match(timestampForEvent(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  assert.match(describeServerTimePhase(), /زمان دقیق/);
});

test('concurrent time requests share one in-flight attempt', async () => {
  let calls = 0;
  configureConnectivity({
    timeSources: [
      {
        id: 'only',
        label: 'تنها منبع',
        url: '/time',
        parse: async () => {
          calls += 1;
          return Date.now();
        },
      },
    ],
  });
  noteRequestOutcome({ ok: true });

  const [first, second] = await Promise.all([
    syncServerTime({ force: true }),
    syncServerTime({ force: true }),
  ]);
  assert.equal(calls, 1);
  assert.equal(first, second);
});

test('a hanging time source is abandoned after its timeout', async () => {
  const fixed = Date.now();
  configureConnectivity({
    timeSources: [
      {
        id: 'hanging',
        label: 'منبع کند',
        url: '/slow',
        parse: async () => fixed,
      },
      { id: 'fast', label: 'منبع سریع', url: '/fast', parse: async () => fixed },
    ],
    fetchImpl: async (url, init) => {
      if (url !== '/slow') return fakeResponse();
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
      });
    },
  });
  noteRequestOutcome({ ok: true });

  const result = await syncServerTime({ force: true });
  assert.equal(result.source, 'fast');
});

test('offline status prevents any time request and reports unavailable', async () => {
  let timeCalls = 0;
  configureConnectivity({
    probeUrls: ['/down'],
    fetchImpl: async (url) => {
      if (url.startsWith('/time')) {
        timeCalls += 1;
        return fakeResponse();
      }
      throw new Error('down');
    },
    timeSources: [
      { id: 'x', label: 'X', url: '/time', parse: async () => Date.now() },
    ],
  });
  noteRequestOutcome({ ok: false });

  assert.equal(await syncServerTime({ force: true }), null);
  assert.equal(timeCalls, 0, 'no external call before the library confirms connectivity');
  assert.equal(getServerTimeSnapshot().phase, 'unavailable');
  assert.match(describeServerTimePhase(), /اتصال/);
});

test('backoff is exponential, jittered and capped', () => {
  const options = { baseMs: 1000, maxMs: 8000, jitter: 0 };
  assert.equal(backoffDelay(0, options, () => 0.5), 1000);
  assert.equal(backoffDelay(1, options, () => 0.5), 2000);
  assert.equal(backoffDelay(10, options, () => 0.5), 8000);

  const jittered = { baseMs: 1000, maxMs: 100_000, jitter: 0.25 };
  assert.ok(backoffDelay(2, jittered, () => 0) < backoffDelay(2, jittered, () => 1));
});

test('withRetry waits for connectivity and stops after success', async () => {
  let attempts = 0;
  const value = await withRetry(
    async () => {
      attempts += 1;
      if (attempts < 2) throw new Error('temporary');
      return 'done';
    },
    { retries: 3, baseMs: 1, maxMs: 2 },
  );
  assert.equal(value, 'done');
  assert.equal(attempts, 2);
});

test('offline queue holds items and flushes automatically when the network returns', async () => {
  const sent = [];
  const storage = {
    values: new Map(),
    getItem(key) {
      return this.values.get(key) ?? null;
    },
    setItem(key, value) {
      this.values.set(key, value);
    },
  };
  const queue = createOfflineQueue({
    name: 'messages-test',
    storage,
    send: async (payload, meta) => {
      sent.push({ payload, meta });
    },
  }).start();

  noteRequestOutcome({ ok: false });
  queue.enqueue({ text: 'سلام' });
  assert.equal(queue.size, 1);
  assert.equal(sent.length, 0);

  await queue.flush();
  assert.equal(sent.length, 0, 'flush must not send while offline');

  noteRequestOutcome({ ok: true });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(sent.length, 1);
  assert.match(sent[0].meta.enqueuedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(queue.size, 0);
  queue.stop();
});

test('connectivityFetch reports any HTTP response back to the network store', async () => {
  configureConnectivity({ fetchImpl: async () => fakeResponse({ ok: false, status: 500 }) });
  noteRequestOutcome({ ok: false });

  const response = await connectivityFetch('/x', { timeoutMs: 100, waitForNetwork: false });
  assert.equal(response.status, 500);
  assert.equal(getNetworkStatus(), 'online', 'an HTTP 500 still means the network is reachable');
});

test('connection quality and heavy-transfer deferral derive from the shared snapshot', () => {
  noteRequestOutcome({ ok: true });
  assert.equal(getConnectionQuality(), 'fast');
  assert.equal(shouldDeferHeavyTransfer(10 * 1024 * 1024), false);

  networkStore.setState({ effectiveType: '2g' });
  assert.equal(getConnectionQuality(), 'slow');
  assert.equal(shouldDeferHeavyTransfer(10 * 1024 * 1024), true);

  networkStore.setState({ effectiveType: null });
  noteRequestOutcome({ ok: false });
  assert.equal(getConnectionQuality(), 'offline');
});
