#!/usr/bin/env node
/**
 * Isolated subprocess scenarios for lead-engine demo generation (no live Blobs/Supabase).
 * Run: node netlify/functions/lib/run-lead-engine-demo-generate-scenarios.js
 */
'use strict';

const assert = require('node:assert/strict');

const leadId = 'aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee';
const leadRow = {
  id: leadId,
  company_name: 'Acme HVAC',
  business_name: 'Acme HVAC',
  website_url: 'https://acme.example',
  source: 'manual',
  status: 'new',
  niche: 'hvac',
  demo_slug: null,
};

function buildMockSupabase(track) {
  return {
    from(table) {
      if (table === 'lead_engine_leads') {
        return {
          select() {
            return {
              eq(field, val) {
                return {
                  maybeSingle: async () => {
                    if (field === 'id' && val === leadId) {
                      return { data: leadRow, error: null };
                    }
                    return { data: null, error: null };
                  },
                };
              },
            };
          },
          update() {
            return {
              eq(field, val) {
                if (field === 'id' && val === leadId) {
                  track.slugUpdateCount += 1;
                }
                return Promise.resolve({ error: null });
              },
            };
          },
        };
      }
      if (table === 'lead_engine_ai_scores') {
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return {
                      limit: async () => ({ data: [], error: null }),
                    };
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'lead_engine_analysis') {
        return {
          select() {
            return {
              eq() {
                return {
                  order() {
                    return {
                      limit: async () => ({ data: [], error: null }),
                    };
                  },
                };
              },
            };
          },
        };
      }
      if (table === 'lead_engine_outreach') {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      eq() {
                        return {
                          order() {
                            return {
                              limit: async () => ({ data: [], error: null }),
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
          update() {
            return { eq: async () => ({ error: null }) };
          },
        };
      }
      if (table === 'lead_engine_events') {
        return {
          insert: async () => ({ error: null }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

async function withPatchedModules(patchFns, fn) {
  const getBlob = require('./get-blob-store');
  const demoCfg = require('./demo-config-supabase');
  const audit = require('./lead-engine-audit-log');

  const origBlob = getBlob.openNamedBlobStoreOrNull;
  const origInsert = demoCfg.insertJlDemoConfig;
  const origSlug = demoCfg.isJlDemoSlugFreeOrOwnedByLead;
  const origLog = audit.logLeadEngineEvent;

  patchFns({
    getBlobOpen: (f) => {
      getBlob.openNamedBlobStoreOrNull = f;
    },
    setInsert: (f) => {
      demoCfg.insertJlDemoConfig = f;
    },
    setSlugCheck: (f) => {
      demoCfg.isJlDemoSlugFreeOrOwnedByLead = f;
    },
    setAudit: (f) => {
      audit.logLeadEngineEvent = f;
    },
  });

  delete require.cache[require.resolve('./lead-engine-demo-generate')];
  const { runLeadEngineDemoGenerate } = require('./lead-engine-demo-generate');

  try {
    return await fn(runLeadEngineDemoGenerate);
  } finally {
    getBlob.openNamedBlobStoreOrNull = origBlob;
    demoCfg.insertJlDemoConfig = origInsert;
    demoCfg.isJlDemoSlugFreeOrOwnedByLead = origSlug;
    audit.logLeadEngineEvent = origLog;
    delete require.cache[require.resolve('./lead-engine-demo-generate')];
  }
}

async function main() {
  process.env.DEMO_GEN_SCENARIOS_QUIET = '1';
  const event = {
    headers: { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'example.netlify.app' },
  };

  const examples = [];

  /* A: Blobs + Supabase mirror */
  {
    const track = { slugUpdateCount: 0 };
    const mockSupabase = buildMockSupabase(track);
    const fakeStore = {
      get: async () => null,
      setJSON: async () => {},
    };
    const out = await withPatchedModules(
      ({ getBlobOpen, setInsert, setAudit }) => {
        getBlobOpen(() => ({ store: fakeStore, error: null }));
        setInsert(async () => ({ ok: true }));
        setAudit(async () => ({ ok: true }));
      },
      async (run) => {
        return run({ supabase: mockSupabase, leadId, event, actor: 'ops' });
      }
    );
    assert.equal(out.ok, true);
    assert.equal(out.value.persistencePath, 'blobs+supabase');
    assert.equal(out.value.fallbackUsed, false);
    assert.equal(track.slugUpdateCount, 1);
    examples.push({ scenario: 'A_blobs_and_supabase', statusCode: 200, body: out.value });
  }

  /* B: Supabase-only fallback */
  {
    const track = { slugUpdateCount: 0 };
    const mockSupabase = buildMockSupabase(track);
    const blobErr = Object.assign(new Error('MissingBlobsEnvironmentError'), {
      name: 'MissingBlobsEnvironmentError',
    });
    const out = await withPatchedModules(
      ({ getBlobOpen, setInsert, setSlugCheck, setAudit }) => {
        getBlobOpen(() => ({ store: null, error: blobErr }));
        setInsert(async () => ({ ok: true }));
        setSlugCheck(async () => ({ ok: true, available: true }));
        setAudit(async () => ({ ok: true }));
      },
      async (run) => {
        return run({ supabase: mockSupabase, leadId, event, actor: 'ops' });
      }
    );
    assert.equal(out.ok, true);
    assert.equal(out.value.persistencePath, 'supabase');
    assert.equal(out.value.fallbackUsed, true);
    assert.equal(track.slugUpdateCount, 1);
    examples.push({ scenario: 'B_supabase_fallback_only', statusCode: 200, body: out.value });
  }

  /* C: No persistence */
  {
    const track = { slugUpdateCount: 0 };
    const mockSupabase = buildMockSupabase(track);
    const blobErr = Object.assign(new Error('MissingBlobsEnvironmentError'), {
      name: 'MissingBlobsEnvironmentError',
    });
    const out = await withPatchedModules(
      ({ getBlobOpen, setInsert, setSlugCheck, setAudit }) => {
        getBlobOpen(() => ({ store: null, error: blobErr }));
        setInsert(async () => ({ ok: false, error: new Error('upsert_failed'), skipped: false }));
        setSlugCheck(async () => ({ ok: true, available: true }));
        setAudit(async () => ({ ok: true }));
      },
      async (run) => {
        return run({ supabase: mockSupabase, leadId, event, actor: 'ops' });
      }
    );
    assert.equal(out.ok, false);
    assert.equal(out.statusCode, 503);
    assert.equal(out.code, 'STORAGE_UNAVAILABLE');
    assert.equal(track.slugUpdateCount, 0);
    examples.push({
      scenario: 'C_no_persistence_503',
      statusCode: 503,
      body: {
        ok: false,
        error: out.error,
        code: out.code,
        details: out.details,
      },
    });
  }

  console.log(JSON.stringify(examples, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
