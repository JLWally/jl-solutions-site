'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLeadEngineOperators, isLeadEnginePsiExtended } = require('./lead-engine-config');

test('parseLeadEngineOperators splits on first colon only', () => {
  const ops = parseLeadEngineOperators('alice:sec:ret:part,bob:pw');
  assert.equal(ops.length, 2);
  assert.equal(ops[0].username, 'alice');
  assert.equal(ops[0].password, 'sec:ret:part');
  assert.equal(ops[1].username, 'bob');
  assert.equal(ops[1].password, 'pw');
});

test('parseLeadEngineOperators ignores empty segments', () => {
  assert.equal(parseLeadEngineOperators('').length, 0);
  assert.equal(parseLeadEngineOperators('nocolon').length, 0);
});

test('isLeadEnginePsiExtended is false when unset', () => {
  const prev = process.env.LEAD_ENGINE_PSI_EXTENDED;
  delete process.env.LEAD_ENGINE_PSI_EXTENDED;
  try {
    assert.equal(isLeadEnginePsiExtended(), false);
  } finally {
    if (prev !== undefined) process.env.LEAD_ENGINE_PSI_EXTENDED = prev;
    else delete process.env.LEAD_ENGINE_PSI_EXTENDED;
  }
});

test('isLeadEnginePsiExtended is true for 1/true/yes', () => {
  const prev = process.env.LEAD_ENGINE_PSI_EXTENDED;
  try {
    process.env.LEAD_ENGINE_PSI_EXTENDED = '1';
    assert.equal(isLeadEnginePsiExtended(), true);
    process.env.LEAD_ENGINE_PSI_EXTENDED = 'true';
    assert.equal(isLeadEnginePsiExtended(), true);
  } finally {
    if (prev !== undefined) process.env.LEAD_ENGINE_PSI_EXTENDED = prev;
    else delete process.env.LEAD_ENGINE_PSI_EXTENDED;
  }
});
