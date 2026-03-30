'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseLeadEngineOperators,
  isLeadEnginePsiExtended,
  isLeadEngineEnabled,
} = require('./lead-engine-config');

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

test('isLeadEngineEnabled when operators+secret set even if ENABLE unset', () => {
  const prevE = process.env.LEAD_ENGINE_ENABLED;
  const prevO = process.env.LEAD_ENGINE_OPERATORS;
  const prevS = process.env.LEAD_ENGINE_SECRET;
  try {
    delete process.env.LEAD_ENGINE_ENABLED;
    process.env.LEAD_ENGINE_OPERATORS = 'ops:testpass';
    process.env.LEAD_ENGINE_SECRET = 'signing-secret';
    assert.equal(isLeadEngineEnabled(), true);
  } finally {
    if (prevE !== undefined) process.env.LEAD_ENGINE_ENABLED = prevE;
    else delete process.env.LEAD_ENGINE_ENABLED;
    if (prevO !== undefined) process.env.LEAD_ENGINE_OPERATORS = prevO;
    else delete process.env.LEAD_ENGINE_OPERATORS;
    if (prevS !== undefined) process.env.LEAD_ENGINE_SECRET = prevS;
    else delete process.env.LEAD_ENGINE_SECRET;
  }
});

test('isLeadEngineEnabled false when ENABLE explicit false even with auth', () => {
  const prevE = process.env.LEAD_ENGINE_ENABLED;
  const prevO = process.env.LEAD_ENGINE_OPERATORS;
  const prevS = process.env.LEAD_ENGINE_SECRET;
  try {
    process.env.LEAD_ENGINE_ENABLED = 'false';
    process.env.LEAD_ENGINE_OPERATORS = 'ops:testpass';
    process.env.LEAD_ENGINE_SECRET = 'signing-secret';
    assert.equal(isLeadEngineEnabled(), false);
  } finally {
    if (prevE !== undefined) process.env.LEAD_ENGINE_ENABLED = prevE;
    else delete process.env.LEAD_ENGINE_ENABLED;
    if (prevO !== undefined) process.env.LEAD_ENGINE_OPERATORS = prevO;
    else delete process.env.LEAD_ENGINE_OPERATORS;
    if (prevS !== undefined) process.env.LEAD_ENGINE_SECRET = prevS;
    else delete process.env.LEAD_ENGINE_SECRET;
  }
});
