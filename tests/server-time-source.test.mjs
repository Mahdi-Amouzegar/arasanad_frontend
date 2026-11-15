/**
 * Tests for the explicit "current time" source modes.
 *
 * All dependencies (fetch, probe URLs, time sources) are injected, so these
 * tests run without a browser, without real network access and without any
 * leftover timers. English comments/assertion messages are used on purpose:
 * the project's Persian typography validator scans this file too.
 */

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  configureConnectivity,
  getConnectivityConfig,
  resetConnectivityConfigForTests,
  resetNetworkForTests,
  resetServerTimeForTests,
  noteRequestOutcome,
  getNetworkSnapshot,
  getCurrentTime,
  systemNow,
  syncServerTime,
  startServerTimeSync,
  stopServerTimeSync,
  nowMs,
  serverNow,
  timestampForEvent,
  getServerTimeSnapshot,
  describeServerTimePhase,
  isServerTimeTrusted,
  getConfiguredTimeSourceMode,
  TIME_SOURCE_MODE,
  DEFAULT_TIME_SOURCE_MODE,
  SERVER_TIME_PHASE,
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
    probeTimeoutMs: 20,
    timeSourceTimeoutMs: 20,
    networkVerdictTimeoutMs: 40,
    monitorIntervalMs: 100_000,
    resyncIntervalMs: 0,
    fetchImpl: async () => fakeResponse(),
  });
});

/** Force the library to consider the network offline (any probe throws). */
function setupOffline(fetchImpl) {
  configureConnectivity({
    probeUrls: ['/probe'],
    fetchImpl: fetchImpl ?? (async () => { throw new Error('network down'); }),
  });
  noteRequestOutcome({ ok: false });
}

/** Force the library to consider the network online with the given time sources. */
function setupOnline(timeSources) {
  configureConnectivity({
    timeSources,
    fetchImpl: async () => fakeResponse(),
  });
  noteRequestOutcome({ ok: true });
}

test('default mode is prefer-server, constants are frozen, unknown values normalize', () => {
  assert.equal(DEFAULT_TIME_SOURCE_MODE, 'prefer-server');
  assert.equal(TIME_SOURCE_MODE.SERVER_ONLY, 'server-only');
  assert.equal(TIME_SOURCE_MODE.SYSTEM_ONLY, 'system-only');
  assert.equal(TIME_SOURCE_MODE.PREFER_SERVER, 'prefer-server');
  assert.ok(Object.isFrozen(TIME_SOURCE_MODE));
  assert.equal(getConfiguredTimeSourceMode(), 'prefer-server');
  assert.equal(getConnectivityConfig().timeSourceMode, 'prefer-server');

  assert.equal(configureConnectivity({ timeSourceMode: 'nonsense' }).timeSourceMode, 'prefer-server');
  assert.equal(getConfiguredTimeSourceMode(), 'prefer-server');
  assert.equal(configureConnectivity({ timeSourceMode: 'server-only' }).timeSourceMode, 'server-only');
  assert.equal(getConfiguredTimeSourceMode(), 'server-only');
});

test('system-only makes zero fetch/probe calls and returns an untrusted system reading', async () => {
  let fetchCalls = 0;
  configureConnectivity({
    timeSources: [{ id: 'fake', label: 'fake', url: '/now', parse: async () => Date.now() }],
    fetchImpl: async (url, init) => {
      fetchCalls += 1;
      if (init?.signal?.aborted) throw new Error('aborted');
      return fakeResponse();
    },
  });

  const result = await getCurrentTime({ source: 'system-only' });

  assert.equal(fetchCalls, 0, 'system-only must never touch the network or the connectivity probe');
  assert.equal(getNetworkSnapshot().status, 'unknown', 'no probe should have changed the network verdict');
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'system-only');
  assert.equal(result.source, 'system');
  assert.equal(result.trusted, false);
  assert.equal(result.offsetMs, null);
  assert.equal(result.roundTripMs, null);
  assert.ok(Math.abs(result.ms - Date.now()) < 5_000);
  assert.match(result.iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  assert.equal(typeof result.reason, 'string');
  assert.ok(result.reason.length > 0);
  assert.match(result.reason, /سیستم/);
  assert.ok(result.reason.includes('\u200C'), 'the Persian reason must use a real ZWNJ');
});

test("explicit system-only publishes the 'system' phase and describes it", async () => {
  assert.equal(SERVER_TIME_PHASE.SYSTEM, 'system');

  await getCurrentTime({ source: 'system-only' });
  let snap = getServerTimeSnapshot();
  assert.equal(snap.phase, 'system');
  assert.equal(snap.source, 'system');
  assert.equal(snap.trusted, false);
  assert.equal(snap.fallbackSource, null);
  assert.match(describeServerTimePhase(), /ساعت سیستم/);

  const result = await syncServerTime({ source: 'system-only' });
  assert.equal(result.source, 'system');
  assert.equal(result.sourceLabel, 'ساعت سیستم');
  assert.equal(result.offsetMs, 0);
  assert.equal(result.roundTripMs, 0);
  assert.ok(Math.abs(result.serverMs - Date.now()) < 5_000);
  assert.match(result.syncedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  snap = getServerTimeSnapshot();
  assert.equal(snap.phase, 'system');
  assert.equal(snap.trusted, false);
});

test('server-only offline returns ok:false and never reports system time', async () => {
  setupOffline();

  const result = await getCurrentTime({ source: 'server-only' });

  assert.equal(result.ok, false);
  assert.equal(result.mode, 'server-only');
  assert.equal(result.source, null);
  assert.equal(result.trusted, false);
  assert.equal(result.ms, null);
  assert.equal(result.iso, null);
  assert.equal(result.offsetMs, null);
  assert.equal(result.roundTripMs, null);
  assert.equal(typeof result.error, 'string');
  assert.ok(result.error.length > 0);
  assert.notEqual(result.source, 'system', 'server-only must never substitute the system clock');
  assert.equal(getServerTimeSnapshot().fallbackSource, null);
});

test('prefer-server offline returns ok:true with system source and a fallback reason', async () => {
  setupOffline();

  const result = await getCurrentTime({ source: 'prefer-server' });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'prefer-server');
  assert.equal(result.source, 'system');
  assert.equal(result.trusted, false);
  assert.equal(result.offsetMs, null);
  assert.equal(result.roundTripMs, null);
  assert.ok(Math.abs(result.ms - Date.now()) < 5_000);
  assert.match(result.iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  assert.match(result.reason, /هیچ سروری/);
  assert.match(result.reason, /سیستم/);
  assert.equal(getServerTimeSnapshot().fallbackSource, 'system');
});

test('getCurrentTime() with no source uses the configured prefer-server default', async () => {
  setupOffline();
  assert.equal(getConnectivityConfig().timeSourceMode, 'prefer-server');

  const result = await getCurrentTime();

  assert.equal(result.mode, 'prefer-server');
  assert.equal(result.ok, true);
  assert.equal(result.source, 'system');
  assert.equal(result.trusted, false);
  assert.match(result.reason, /سیستم/);
});

test('prefer-server succeeds from a fake time source and returns a trusted server reading', async () => {
  const fixed = 1_700_000_000_000;
  setupOnline([{ id: 'fake', label: 'fake', url: '/now', parse: async () => fixed }]);

  const result = await getCurrentTime({ source: 'prefer-server' });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'prefer-server');
  assert.equal(result.source, 'server');
  assert.equal(result.trusted, true);
  assert.equal(result.reason, null);
  assert.equal(typeof result.offsetMs, 'number');
  assert.equal(typeof result.roundTripMs, 'number');
  assert.ok(result.roundTripMs >= 0);
  assert.ok(Math.abs(result.ms - fixed) < 5_000);
  assert.match(result.iso, /^2023-/);
  assert.equal(getServerTimeSnapshot().phase, 'synced');
  assert.equal(getServerTimeSnapshot().trusted, true);
  assert.equal(getServerTimeSnapshot().fallbackSource, null, 'fallback marker cleared on success');
  assert.equal(isServerTimeTrusted(), true);
});

test('server-only succeeds from a fake time source and returns a trusted server reading', async () => {
  const fixed = 1_700_000_000_000;
  setupOnline([{ id: 'fake', label: 'fake', url: '/now', parse: async () => fixed }]);

  const result = await getCurrentTime({ source: 'server-only' });

  assert.equal(result.ok, true);
  assert.equal(result.mode, 'server-only');
  assert.equal(result.source, 'server');
  assert.equal(result.trusted, true);
  assert.equal(result.reason, null);
  assert.ok(Math.abs(result.ms - fixed) < 5_000);
});

test("nowMs({ source: 'system-only' }) ignores a synced server anchor", async () => {
  const fixed = 1_700_000_000_000;
  setupOnline([{ id: 'fake', label: 'fake', url: '/now', parse: async () => fixed }]);
  await syncServerTime({ force: true });
  assert.equal(isServerTimeTrusted(), true);

  const anchored = nowMs();
  assert.ok(Math.abs(anchored - Date.now()) > 1_000_000, 'plain nowMs() must follow the server anchor');
  assert.ok(Math.abs(anchored - fixed) < 5_000);

  const system = nowMs({ source: 'system-only' });
  assert.ok(Math.abs(system - Date.now()) < 5_000, 'system-only must ignore the anchor');

  assert.ok(Math.abs(serverNow().getTime() - fixed) < 5_000);
  assert.ok(Math.abs(serverNow({ source: 'system-only' }).getTime() - Date.now()) < 5_000);
  assert.ok(Math.abs(Date.parse(timestampForEvent({ source: 'system-only' })) - Date.now()) < 5_000);
  assert.ok(Math.abs(systemNow().getTime() - Date.now()) < 5_000, 'systemNow() is always the raw system clock');
});

test('backward compat: syncServerTime({ force: true }) offline is null / unavailable / اتصال', async () => {
  setupOffline();

  assert.equal(await syncServerTime({ force: true }), null);
  assert.equal(getServerTimeSnapshot().phase, 'unavailable');
  assert.equal(getServerTimeSnapshot().fallbackSource, null);
  assert.match(describeServerTimePhase(), /اتصال/);
});

test('configured system-only startServerTimeSync publishes system phase without network work', async () => {
  let fetchCalls = 0;
  configureConnectivity({
    timeSourceMode: 'system-only',
    fetchImpl: async () => {
      fetchCalls += 1;
      return fakeResponse();
    },
  });

  await startServerTimeSync();
  stopServerTimeSync();

  assert.equal(fetchCalls, 0);
  assert.equal(getServerTimeSnapshot().phase, 'system');
  assert.equal(getServerTimeSnapshot().trusted, false);
});
