'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isLikelySchemaDriftError,
  readinessErrorPayload,
  SCHEMA_HINT,
} = require('./lead-engine-readiness');

test('isLikelySchemaDriftError detects missing column', () => {
  assert.equal(
    isLikelySchemaDriftError('column lead_engine_leads.automation_pipeline_status does not exist'),
    true
  );
});

test('readinessErrorPayload uses schema hint for drift', () => {
  const p = readinessErrorPayload('column foo does not exist');
  assert.equal(p.ok, false);
  assert.equal(p.readiness.code, 'automation_schema_incomplete');
  assert.equal(p.readiness.message, SCHEMA_HINT);
});

test('readinessErrorPayload uses generic message for other errors', () => {
  const p = readinessErrorPayload('timeout');
  assert.equal(p.ok, false);
  assert.equal(p.readiness.code, 'query_failed');
  assert.match(p.readiness.message, /connectivity/i);
});
