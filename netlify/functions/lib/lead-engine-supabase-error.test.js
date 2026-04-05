'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { isMissingLeadEngineDemoColumnError } = require('./lead-engine-supabase-error');

test('isMissingLeadEngineDemoColumnError matches demo_slug in details', () => {
  assert.equal(
    isMissingLeadEngineDemoColumnError({
      message: 'Failed to list leads',
      details: 'column lead_engine_leads.demo_slug does not exist',
    }),
    true
  );
});

test('isMissingLeadEngineDemoColumnError false for unrelated', () => {
  assert.equal(isMissingLeadEngineDemoColumnError({ message: 'timeout' }), false);
});
