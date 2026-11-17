/**
 * Tests for the pure Phase 7 projects core.
 * Runs directly under node:test with no bundler and no React.
 * English comments are intentional: the Persian typography validator scans
 * test files too and these assertions contain no user-facing Persian prose.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DELIVERY_HOURS,
  LANGUAGES,
  SOURCE_TYPES,
  OUTPUT_FORMATS,
  PROJECT_STATUSES,
  STATUS_TRANSITIONS,
  canTransition,
  isUrgent,
  URGENCY_MULTIPLIER,
  ROUND_STEP,
  DEPOSIT_RATIO,
  roundToNearest,
  calculateEstimate,
  calculateDeposit,
  calculateRemaining,
  DEFAULT_DESIGN_SPEC,
  mergeDesignSpec,
  changedDesignFields,
  validateProjectDraft,
  publicProjectFields,
  formatProjectCode,
} from '../src/lib/projects/core.mjs';

function validDraft(overrides = {}) {
  return {
    name: 'تایپ پایان نامه',
    serviceTypeId: 'svc-1',
    language: LANGUAGES[0],
    sourceType: SOURCE_TYPES[0],
    description: '',
    specialRequirements: '',
    sourcePageCount: 10,
    deliveryHours: 48,
    outputFormat: OUTPUT_FORMATS[0],
    design: { mode: 'standard', submode: 'like_original', presetId: null, spec: { ...DEFAULT_DESIGN_SPEC } },
    ...overrides,
  };
}

/* ─────────────────────────── catalog ─────────────────────────── */

test('catalog constants are finite, ordered and free of duplicates', () => {
  assert.deepEqual(DELIVERY_HOURS, [2, 6, 12, 24, 48, 72, 120, 168]);
  assert.equal(new Set(DELIVERY_HOURS).size, DELIVERY_HOURS.length);
  assert.equal(PROJECT_STATUSES.length, 12);
  assert.equal(new Set(PROJECT_STATUSES).size, 12);
  assert.equal(LANGUAGES.length, 4);
  assert.equal(SOURCE_TYPES.length, 3);
  assert.deepEqual(OUTPUT_FORMATS, ['PDF', 'Word']);
  for (const status of PROJECT_STATUSES) {
    assert.ok(Array.isArray(STATUS_TRANSITIONS[status]), status);
  }
});

test('urgency is derived only from the delivery-hours whitelist', () => {
  assert.equal(isUrgent(2), true);
  assert.equal(isUrgent(24), true);
  assert.equal(isUrgent(48), false);
  assert.equal(isUrgent(Number.NaN), false);
  assert.equal(isUrgent('24'), false);
  assert.equal(URGENCY_MULTIPLIER, 1.3);
  assert.equal(ROUND_STEP, 500);
  assert.equal(DEPOSIT_RATIO, 0.5);
});

/* ─────────────────────────── pricing ─────────────────────────── */

test('roundToNearest rounds to the configured step and is safe for bad input', () => {
  assert.equal(roundToNearest(1201), 1000);
  assert.equal(roundToNearest(1250), 1500);
  assert.equal(roundToNearest(1251, 100), 1300);
  assert.equal(roundToNearest(Number.NaN), 0);
  assert.equal(roundToNearest(Infinity), 0);
});

test('calculateEstimate applies urgency and server-provided rules', () => {
  assert.equal(calculateEstimate({ pricePerPage: 1000, pages: 10 }), 10_000);
  // 1000 * 10 * 1.3 = 13000
  assert.equal(calculateEstimate({ pricePerPage: 1000, pages: 10, urgent: true }), 13_000);
  assert.equal(
    calculateEstimate({ pricePerPage: 1000, pages: 10, urgent: true, multiplier: 2, step: 1000 }),
    20_000,
  );
  assert.equal(calculateEstimate({ pricePerPage: 1000, pages: 0 }), 1000);
  assert.equal(calculateEstimate({ pricePerPage: 1000, pages: Number.NaN }), 1000);
});

test('deposit and remaining never produce negative amounts', () => {
  assert.equal(calculateDeposit(10_000), 5000);
  assert.equal(calculateDeposit(10_000, 0.25, 100), 2500);
  assert.equal(calculateRemaining(10_000, 4000), 6000);
  assert.equal(calculateRemaining(10_000, 20_000), 0);
});

/* ─────────────────────────── workflow ─────────────────────────── */

test('canTransition matches the declared transition map', () => {
  assert.equal(canTransition('pending_review', 'awaiting_deposit'), true);
  assert.equal(canTransition('draft', 'in_progress'), false);
  assert.equal(canTransition('cancelled', 'in_progress'), false);
  assert.equal(canTransition('in_progress', 'delivered'), true);
  assert.equal(canTransition('unknown', 'draft'), false);
});

/* ─────────────────────────── design spec ─────────────────────────── */

test('mergeDesignSpec merges nested objects and returns a fresh plain object', () => {
  const base = { fontFa: 'A', margins: { top: 2, left: 3 } };
  const result = mergeDesignSpec(base, { margins: { top: 4 }, bodySize: 14 });
  assert.deepEqual(result, { fontFa: 'A', margins: { top: 4, left: 3 }, bodySize: 14 });
  assert.notEqual(result, base);
  assert.notEqual(result.margins, base.margins);
  assert.equal(base.margins.top, 2, 'the base must never be mutated');
});

test('mergeDesignSpec blocks prototype-pollution keys', () => {
  const dirty = JSON.parse('{"__proto__":{"polluted":true},"constructor":{"x":1}}');
  const result = mergeDesignSpec({}, dirty);
  assert.equal(Object.hasOwn(result, '__proto__'), false);
  assert.equal(Object.hasOwn(result, 'constructor'), false);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
});

test('changedDesignFields reports sorted dotted paths, not whole objects', () => {
  const base = { fontFa: 'A', margins: { top: 2, left: 3 } };
  const current = { fontFa: 'B', margins: { top: 2, left: 4 } };
  assert.deepEqual(changedDesignFields(current, base), ['fontFa', 'margins.left']);
  assert.deepEqual(changedDesignFields(base, base), []);
  assert.deepEqual(changedDesignFields(null, base), ['fontFa', 'margins']);
});

/* ─────────────────────────── validation ─────────────────────────── */

test('validateProjectDraft accepts a complete draft', () => {
  const result = validateProjectDraft(validDraft());
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, {});
});

test('validateProjectDraft rejects a too-short name (server requires min 3)', () => {
  const result = validateProjectDraft(validDraft({ name: 'ab' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.name);
  assert.equal(validateProjectDraft(validDraft({ name: 'abc' })).ok, true);
});

test('validateProjectDraft rejects invalid catalog values and missing design', () => {
  const bad = validateProjectDraft(
    validDraft({
      serviceTypeId: '',
      language: 'Klingon',
      sourceType: 'Unknown',
      sourcePageCount: 0,
      deliveryHours: 7,
      outputFormat: 'PNG',
      design: null,
    }),
  );
  assert.equal(bad.ok, false);
  for (const key of [
    'serviceTypeId',
    'language',
    'sourceType',
    'sourcePageCount',
    'deliveryHours',
    'outputFormat',
    'design',
  ]) {
    assert.ok(bad.errors[key], `missing error for ${key}`);
  }
});

test('validateProjectDraft validates the nested design shape', () => {
  const bad = validateProjectDraft(validDraft({ design: { mode: 'odd', spec: 'not-an-object' } }));
  assert.equal(bad.ok, false);
  assert.ok(bad.errors['design.mode']);
  assert.ok(bad.errors['design.spec']);
});

/* ─────────────────────────── public view ─────────────────────────── */

test('publicProjectFields is a strict whitelist with no private fields', () => {
  assert.ok(publicProjectFields.includes('id'));
  assert.ok(publicProjectFields.includes('code'));
  assert.equal(publicProjectFields.includes('customerDisplayName'), false);
  for (const forbidden of [
    'customerId',
    'estimateAmount',
    'depositAmount',
    'basePricePerPage',
    'quotedPricePerPage',
    'specialRequirements',
    'designSpec',
    'description',
  ]) {
    if (forbidden === 'description') continue; // description is intentionally public
    assert.equal(publicProjectFields.includes(forbidden), false, forbidden);
  }
  assert.equal(new Set(publicProjectFields).size, publicProjectFields.length);
});

test('formatProjectCode strips everything except letters, digits and dashes', () => {
  assert.equal(formatProjectCode('  ar-2026-0001  '), 'AR-2026-0001');
  assert.equal(formatProjectCode('<script>abc</script>'), 'SCRIPTABCSCRIPT');
  assert.equal(formatProjectCode(''), '—');
  assert.equal(formatProjectCode(null), '—');
  assert.equal(formatProjectCode('x'.repeat(80)).length, 32);
});
