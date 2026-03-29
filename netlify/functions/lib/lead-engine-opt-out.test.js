const test = require('node:test');
const assert = require('node:assert/strict');
const { isLeadEmailSendBlocked, classifyEmailSendBlock } = require('./lead-engine-opt-out');

test('isLeadEmailSendBlocked when opted out', () => {
  assert.equal(isLeadEmailSendBlocked({ email_opted_out: true }), true);
});

test('isLeadEmailSendBlocked when not opted out', () => {
  assert.equal(isLeadEmailSendBlocked({ email_opted_out: false }), false);
  assert.equal(isLeadEmailSendBlocked({}), false);
  assert.equal(isLeadEmailSendBlocked(null), true);
});

test('classifyEmailSendBlock', () => {
  assert.deepEqual(classifyEmailSendBlock({ leadOptedOut: true, globallySuppressed: false }), {
    blocked: true,
    code: 'LEAD_OPTED_OUT',
  });
  assert.deepEqual(classifyEmailSendBlock({ leadOptedOut: false, globallySuppressed: true }), {
    blocked: true,
    code: 'GLOBAL_EMAIL_SUPPRESSED',
  });
  assert.deepEqual(classifyEmailSendBlock({ leadOptedOut: false, globallySuppressed: false }), {
    blocked: false,
    code: null,
  });
});
