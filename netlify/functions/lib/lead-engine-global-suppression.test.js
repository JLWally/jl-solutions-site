'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildSuppressionLookup,
  isLeadGloballySuppressed,
  ensureEmailGloballySuppressed,
} = require('./lead-engine-global-suppression');

test('buildSuppressionLookup + lead suppression checks', () => {
  const lookup = buildSuppressionLookup([
    { email_normalized: 'prospect@example.com', suppression_source: 'unsubscribe_link' },
    { email_normalized: 'other@example.com', suppression_source: 'manual' },
  ]);

  assert.equal(
    isLeadGloballySuppressed({ contact_email: ' Prospect@Example.com ' }, lookup),
    true
  );
  assert.equal(isLeadGloballySuppressed({ contact_email: 'nobody@example.com' }, lookup), false);
  assert.equal(isLeadGloballySuppressed({ contact_email: null }, lookup), false);
});

test('ensureEmailGloballySuppressed is idempotent for same normalized email', async () => {
  const store = new Map();
  const supabase = {
    from() {
      const q = {
        targetEmail: null,
        async upsert(row) {
          if (!store.has(row.email_normalized)) {
            store.set(row.email_normalized, { id: row.email_normalized, ...row });
          }
          return { error: null };
        },
        select() {
          return this;
        },
        eq(_col, val) {
          this.targetEmail = val;
          return this;
        },
        async maybeSingle() {
          return { data: store.get(this.targetEmail) || null, error: null };
        },
      };
      return q;
    },
  };

  const first = await ensureEmailGloballySuppressed(supabase, {
    emailRaw: ' Prospect@Example.com ',
    suppressionSource: 'unsubscribe_link',
    reason: 'recipient_unsubscribe',
    createdBy: 'public_unsubscribe',
  });
  const second = await ensureEmailGloballySuppressed(supabase, {
    emailRaw: 'prospect@example.com',
    suppressionSource: 'unsubscribe_link',
    reason: 'recipient_unsubscribe',
    createdBy: 'public_unsubscribe',
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(store.size, 1);
  assert.equal(second.normalized, 'prospect@example.com');
});

