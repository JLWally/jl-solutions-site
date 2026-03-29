const test = require('node:test');
const assert = require('node:assert/strict');
const { buildOutreachSummaryByLead } = require('./lead-engine-outreach-classify');

const L = '11111111-1111-1111-1111-111111111111';

test('buildOutreachSummaryByLead picks latest per status', () => {
  const rows = [
    {
      id: 'a1',
      lead_id: L,
      status: 'draft',
      draft_subject: 'newest draft',
      draft_body: 'b',
      created_at: '2025-03-10T00:00:00Z',
    },
    {
      id: 'a2',
      lead_id: L,
      status: 'sent',
      draft_subject: 'sent old',
      draft_body: 'b',
      created_at: '2025-03-01T00:00:00Z',
      sent_at: '2025-03-01T01:00:00Z',
    },
    {
      id: 'a3',
      lead_id: L,
      status: 'approved',
      draft_subject: 'approved mid',
      draft_body: 'b',
      created_at: '2025-03-05T00:00:00Z',
    },
  ];
  const m = buildOutreachSummaryByLead([L], rows);
  const s = m.get(L);
  assert.equal(s.latest.id, 'a1');
  assert.equal(s.latest_draft.id, 'a1');
  assert.equal(s.latest_approved.id, 'a3');
  assert.equal(s.latest_sent.id, 'a2');
  assert.equal(s.draft_rows_count, 1);
  assert.equal(s.has_multiple_drafts, false);
  assert.equal(s.total_rows_count, 3);
});
