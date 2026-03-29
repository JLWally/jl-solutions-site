'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lead-engine-audit-log');

test('logLeadEngineEvent writes compact row', async () => {
  const calls = [];
  const supabase = {
    from(name) {
      assert.equal(name, 'lead_engine_events');
      return {
        async insert(row) {
          calls.push(row);
          return { error: null };
        },
      };
    },
  };

  const out = await logLeadEngineEvent(supabase, {
    lead_id: 'l1',
    event_type: EVENT_TYPES.ANALYZE_SUCCESS,
    actor: 'ops',
    message: 'ok',
    metadata_json: { source: 'test' },
  });
  assert.equal(out.ok, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].event_type, 'analyze_success');
});

