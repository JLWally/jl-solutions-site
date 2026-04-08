'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  DEMO_OUTREACH_STATUS_VALUES,
  DEMO_OUTREACH_STATUS_SET,
  validateDemoOutreachStatusForWrite,
} = require('./lead-engine-demo-outreach-contract');

test('DEMO_OUTREACH_STATUS_VALUES count and uniqueness', () => {
  assert.equal(DEMO_OUTREACH_STATUS_VALUES.length, DEMO_OUTREACH_STATUS_SET.size);
  const seen = new Set();
  for (const v of DEMO_OUTREACH_STATUS_VALUES) {
    assert.equal(seen.has(v), false);
    seen.add(v);
  }
});

test('validateDemoOutreachStatusForWrite accepts all canonical values', () => {
  for (const v of DEMO_OUTREACH_STATUS_VALUES) {
    const r = validateDemoOutreachStatusForWrite(v);
    assert.equal(r.ok, true);
    assert.equal(r.value, v);
  }
});

test('validateDemoOutreachStatusForWrite normalizes case', () => {
  const r = validateDemoOutreachStatusForWrite('SENT_MANUAL');
  assert.equal(r.ok, true);
  assert.equal(r.value, 'sent_manual');
});

test('validateDemoOutreachStatusForWrite null clears', () => {
  const r = validateDemoOutreachStatusForWrite('');
  assert.equal(r.ok, true);
  assert.equal(r.value, null);
  const r2 = validateDemoOutreachStatusForWrite(null);
  assert.equal(r2.ok, true);
  assert.equal(r2.value, null);
});

test('validateDemoOutreachStatusForWrite rejects unknown', () => {
  const r = validateDemoOutreachStatusForWrite('won_the_lottery');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'INVALID_DEMO_OUTREACH_STATUS');
  assert.match(r.details, /sent_manual/);
});
