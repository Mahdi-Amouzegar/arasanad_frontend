/**
 * فاز ۱۲٫۲۱ — تست\u200cهای قرارداد رابط کاربری تسویه و اصلاح\u200cهای ظاهری.
 *
 * تست\u200cهای خالص/ساختمانی: بدون مرورگر و بدون شبکه. رفتار تعاملی پنجرهٔ
 * انتخاب فایل و اسکرول فرم باید به\u200cصورت دستی در مرورگر تأیید شود.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { businessToastFor } from '../src/lib/realtime/toast.mjs';

const src = (relative) => fileURLToPath(new URL(`../src/${relative}`, import.meta.url));
const read = (relative) => readFileSync(src(relative), 'utf8');

test('P1221-F1:Toast «کارت عملیات تازه ثبت شد» منتشر نمی\u200cشود', () => {
  for (const operation of ['auto', 'create']) {
    const toast = businessToastFor({
      type: 'activity.created',
      payload: { code: 'ar-12', operation },
    });
    assert.equal(toast, null, `operation=${operation} باید سرکوب شود`);
  }

  const other = businessToastFor({
    type: 'activity.created',
    payload: { code: 'ar-12', operation: 'project_status_changed' },
  });
  assert.ok(other);
  assert.match(other.message, /AR-12/);
});

test('P1221-F2: وضعیت\u200cهای تسویه در کاتالوگ فرانت\u200cاند حضور دارند', () => {
  const status = read('lib/status.ts');
  const core = read('lib/projects/core.mjs');
  assert.match(status, /awaiting_settlement/);
  assert.match(status, /awaiting_settlement_confirmation/);
  assert.match(status, /در انتظار تسویه/);
  assert.match(status, /در انتظار تأیید تسویه/);
  assert.match(core, /awaiting_settlement/);
  assert.match(core, /awaiting_settlement_confirmation/);
});

test('P1221-F3: لینک تحویل به کارت جزئیات و فرم همان صفحه می\u200cرود', () => {
  const detail = read('components/projects/ProjectDetail.tsx');
  assert.match(detail, /id=\x22final-files\x22/);
  assert.match(detail, /params\.get\(\x27deliver\x27\)/);
  assert.match(detail, /setDeliveryOpen\(true\)/);
  assert.match(detail, /getElementById\(\x27final-files\x27\)/);
  assert.match(detail, /pricePerPage:/);
  assert.match(detail, /نرخ هر صفحه \(تومان\)/);
  assert.match(detail, /نرخ کل\(تومان\)/);
  assert.match(detail, /settledAt/);
});

test('P1221-F4: لغو انتخابگر فایل مودال را نمิบندد', () => {
  const modal = read('components/files/FileManagerModal.tsx');
  assert.match(modal, /let settleTimer: number \| undefined/);
  assert.match(modal, /pickerOpenRef\.current = false; \}, 500\)/);
  assert.match(modal, /if \(!pickerOpenRef\.current\) return/);
});

test('P1221-F5: املای فارسی تکمیل و نیمفاصله\u200cها واقعی\u200cاند', () => {
  assert.match(read('components/chat/PanelMessages.tsx'), /تازه\u200cسازی/);
  assert.match(read('components/files/FileManagerModal.tsx'), /تازه\u200cآپلودشده/);
  assert.match(read('components/projects/ProjectSpecsDialog.tsx'), /ویژه\u200cای/);
  assert.match(read('lib/projects/api.ts'), /نرخ\u200cگذاری/);
  const dialog = read('components/projects/ProjectActionDialog.tsx');
  assert.ok(!dialog.includes('\\u200c'), 'JSX نباید رشتهٔ \\u200c را نمایش دهد');
  assert.match(dialog, /نرخ\u200cگذاری/);
});
