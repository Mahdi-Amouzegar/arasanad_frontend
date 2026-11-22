/**
 * فاز ۱۲٫۲۰-F — تست‌های همگام‌سازی بخشبندیشده داشبورد.
 * توابع خالص + خواندن کد منبع؛ بدون مرورگر و بدون شبکه.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  dashboardDataVersion,
  dashboardSectionsForEvent,
  isStaleDashboardSnapshot,
  mergeDashboardSection,
} from '../src/lib/dashboard/sync.mjs';

const src = (relative) => fileURLToPath(new URL(`../src/${relative}`, import.meta.url));
const read = (relative) => readFileSync(src(relative), 'utf8');

const V1 = Date.parse('2026-11-22T13:00:00.000Z');
const V2 = V1 + 60_000;

test('P1220-F1: رویداد‌ها به بخش آلوده نگاشت می‌شوند', () => {
  assert.deepEqual(
    dashboardSectionsForEvent({ type: 'project.status_changed', payload: { dataVersion: V1 } }, 'customer'),
    ['cards', 'actions', 'recent'],
  );
  assert.deepEqual(
    dashboardSectionsForEvent({ type: 'finance.updated' }, 'customer'),
    ['cards', 'actions', 'wallet'],
  );
  assert.deepEqual(dashboardSectionsForEvent({ type: 'chat.message.read' }, 'customer'), ['cards', 'conversations']);
  assert.deepEqual(dashboardSectionsForEvent({ type: 'project.created' }, 'admin'), ['cards']);
  assert.deepEqual(dashboardSectionsForEvent({ type: 'activity.created' }, 'customer'), []);
  assert.equal(dashboardDataVersion({ payload: { dataVersion: V1 } }), V1);
  assert.equal(dashboardDataVersion({ payload: { dataVersion: 'bad' } }), 0);
});

test('P1220-F2: merge تنها بخش مجاز را جایگزین می‌کند', () => {
  const view = {
    cards: [{ id: 'a' }],
    actions: [{ id: 'x' }],
    recentProjects: [{ id: 'r' }],
    wallet: { available: 1, reserved: 2 },
    pendingPayments: 3,
    conversations: [{ id: 'c' }],
  };
  const merged = mergeDashboardSection(view, 'recent', [{ id: 'r2' }]);
  assert.deepEqual(merged.recentProjects, [{ id: 'r2' }]);
  assert.equal(merged.actions, view.actions);
  assert.equal(merged.wallet, view.wallet);

  const wallet = mergeDashboardSection(view, 'wallet', { wallet: { available: 9 }, pendingPayments: 4 });
  assert.deepEqual(wallet.wallet, { available: 9, reserved: 2 });
  assert.equal(wallet.pendingPayments, 4);
  assert.equal(mergeDashboardSection(view, 'unknown', [1]), view);
});

test('P1220-F3: اسنپشات قدیمی رد می‌شود', () => {
  assert.equal(isStaleDashboardSnapshot(V1, V2), true);
  assert.equal(isStaleDashboardSnapshot(V2, V1), false);
  assert.equal(isStaleDashboardSnapshot(V2, V2), false);
  assert.equal(isStaleDashboardSnapshot('bad', V2), false);
});

test('P1220-F4: endpointهای کامل بدون تغییر و endpointهای Partial اضافهاند', () => {
  const customer = read('lib/panel/api.ts');
  const admin = read('lib/admin/api.ts');
  assert.match(customer, /request<Partial<CustomerDashboardView>>\('\/panel\/dashboard'\)/);
  assert.match(customer, /dashboardSection<T>/);
  assert.match(customer, /\/panel\/dashboard\/section\/\$\{encodeURIComponent\(section\)\}/);
  assert.match(admin, /dashboard: \(\) => request\('\/admin\/dashboard'\)/);
  assert.match(admin, /dashboardCards: \(\) => request\('\/admin\/dashboard\/section\/cards'\)/);
});

test('P1220-F5: کنترلر فقط Leader و فقط بخش آلوده را می‌خواند', () => {
  const controller = read('components/system/DashboardSyncController.ts');
  assert.match(controller, /dashboardSectionsForEvent\(event, role\)/);
  assert.match(controller, /if \(sections\.length === 0\) return;/);
  assert.match(controller, /if \(!isLeader\) return;/);
  assert.match(controller, /for \(const section of sections\) dirtyRef\.current\.add\(section\)/);
  assert.match(controller, /fetchRef\.current\(section\)/);
  assert.match(controller, /publish\('dashboard'/);
  assert.match(controller, /isStaleDashboardSnapshot\(version, latestVersionRef\.current\)/);
});

test('P1220-F6: هر دو داشبورد پاسخ قدیمی کامل را رد می‌کنند', () => {
  const customer = read('components/panel/CustomerDashboard.tsx');
  const admin = read('components/admin/AdminPanels.tsx');
  for (const source of [customer, admin]) {
    assert.match(source, /useDashboardSyncController/);
    assert.match(source, /const versionWhenRequested = versionAtRequest\(\)/);
    assert.match(source, /if \(isStaleResponse\(versionWhenRequested\)\) return;/);
  }
  assert.match(admin, /Promise\.all\(\[/);
});
