/**
 * فاز ۱۲ — تست ساختاری منوها و صفحات مدیریت.
 *
 *تمام منوهای ADMIN_NAV باید یا به صفحه واقعی برسند یا به مسیر عمومی معتبر.
 * `PanelPlaceholder` نباید در مسیرهای فاز ۱۲ (/admin, /admin/users,
 * /admin/refunds, /admin/reconciliation, /admin/settings, /admin/audit,
 * /admin/messages) باقی مانده باشد.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

const ADMIN_PAGE = read('src/app/admin/[[...slug]]/page.tsx');
const NAV = read('src/lib/navigation.ts');
const PAGES = read('src/lib/panel-pages.ts');
const PANELS = read('src/components/admin/AdminPanels.tsx');
const CATALOG = read('src/components/admin/AdminCatalog.tsx');
const API = read('src/lib/admin/api.ts');

const PHASE12_ROUTES = [
  '/admin',
  '/admin/users',
  '/admin/refunds',
  '/admin/reconciliation',
  '/admin/settings',
  '/admin/audit',
  '/admin/messages',
];

test('P12-09: تمام مسیرهای فاز ۱۲ در router مدیر، branch واقعی دارند', () => {
  for (const route of PHASE12_ROUTES) {
    assert.ok(
      ADMIN_PAGE.includes(`href === '${route}'`),
      `مسیر ${route} در router مدیر branch ندارد`,
    );
  }
});

test('P12-09: منوهای جدید در ADMIN_NAV و ADMIN_PAGES حضور دارند', () => {
  for (const route of ['/admin/messages', '/admin/audit']) {
    assert.ok(NAV.includes(`href: '${route}'`), `${route} در ADMIN_NAV نیست`);
    assert.ok(PAGES.includes(`'${route}':`), `${route} در ADMIN_PAGES نیست`);
  }
});

test('P12-01…08: کامپوننت‌ها و متدهای API مورد نیاز وجود دارند', () => {
  const panels = ['AdminDashboard', 'AdminUsers', 'AdminSettings', 'AdminAudit', 'AdminMessages'];
  for (const name of panels) {
    assert.ok(PANELS.includes(`export function ${name}`), `${name} تعریف نشده است`);
  }
  for (const name of ['AdminPricingEditor', 'AdminDesignPresets', 'AdminPortfolio']) {
    assert.ok(CATALOG.includes(`export function ${name}`), `${name} تعریف نشده است`);
  }
  for (const method of ['dashboard(', 'users(', 'serviceTypes(', 'designPresets(', 'portfolio(', 'settings(', 'audit(']) {
    assert.ok(API.includes(method), `متد ${method} در کلاینت ادمین نیست`);
  }
});

test('P12-06: هیچ الگوی Secret در کلاینت ادمین وجود ندارد', () => {
  const combined = API + PANELS + CATALOG;
  assert.ok(!combined.includes('sk_live'));
  assert.ok(!combined.includes('PARSPACK_SECRET_KEY'));
  assert.ok(!combined.includes('JWT_SECRET'));
});

test('P12-03/05: پیش‌نمایش قبل/بعد و klon استاندارد موجود است', () => {
  assert.ok(CATALOG.includes('showAlert'), 'تأیید قبل/بعد برای تغییر نرخ وجود ندارد');
  assert.ok(CATALOG.includes('clone('), 'klon استاندارد ظاهری وجود ندارد');
  assert.ok(CATALOG.includes('imageKind'), 'مدل تصویر نمونهکار ناقص است');
});
