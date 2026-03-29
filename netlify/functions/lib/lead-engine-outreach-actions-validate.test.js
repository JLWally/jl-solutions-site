const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateApproveBody,
  validateSendBody,
  validateReconcileBody,
} = require('./lead-engine-outreach-actions-validate');

const goodLead = '550e8400-e29b-41d4-a716-446655440000';
const goodOut = '660e8400-e29b-41d4-a716-446655440001';

test('validateApproveBody accepts leadId only', () => {
  const r = validateApproveBody({ leadId: goodLead });
  assert.equal(r.ok, true);
  assert.equal(r.value.outreachId, null);
});

test('validateApproveBody accepts leadId and outreachId', () => {
  const r = validateApproveBody({ leadId: goodLead, outreachId: goodOut });
  assert.equal(r.ok, true);
  assert.equal(r.value.outreachId, goodOut);
});

test('validateApproveBody rejects bad outreachId', () => {
  const r = validateApproveBody({ leadId: goodLead, outreachId: 'nope' });
  assert.equal(r.ok, false);
});

test('validateSendBody mirrors approve', () => {
  const r = validateSendBody({ leadId: goodLead });
  assert.equal(r.ok, true);
});

test('validateReconcileBody requires outreachId and action', () => {
  assert.equal(validateReconcileBody({ leadId: goodLead }).ok, false);
  assert.equal(
    validateReconcileBody({ leadId: goodLead, outreachId: goodOut, action: 'nope' }).ok,
    false
  );
  const r = validateReconcileBody({
    leadId: goodLead,
    outreachId: goodOut,
    action: 'mark_sent',
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.sentAt, null);
});

test('validateReconcileBody parses sentAt', () => {
  const r = validateReconcileBody({
    leadId: goodLead,
    outreachId: goodOut,
    action: 'mark_sent',
    sentAt: '2025-03-01T12:00:00.000Z',
  });
  assert.equal(r.ok, true);
  assert.equal(r.value.sentAt, '2025-03-01T12:00:00.000Z');
});

test('validateReconcileBody release_send_lock', () => {
  const r = validateReconcileBody({
    leadId: goodLead,
    outreachId: goodOut,
    action: 'release_send_lock',
  });
  assert.equal(r.ok, true);
});

test('validateReconcileBody mark_failed requires acknowledgeMarkFailed', () => {
  assert.equal(
    validateReconcileBody({
      leadId: goodLead,
      outreachId: goodOut,
      action: 'mark_failed',
    }).ok,
    false
  );
  const r = validateReconcileBody({
    leadId: goodLead,
    outreachId: goodOut,
    action: 'mark_failed',
    acknowledgeMarkFailed: true,
  });
  assert.equal(r.ok, true);
});
