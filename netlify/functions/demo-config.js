/**
 * Smart demo configs: GET by slug, POST to create.
 * Storage: Netlify Blobs store "smart-demos" when available; optional Supabase jl_demo_configs
 * as fallback (read + write) when Blobs are missing (misconfig, plan, or local static).
 *
 * POST auth (in order):
 * - Valid `lead_engine_session` when lead engine is enabled and auth is configured.
 * - Else if DEMO_GENERATOR_SECRET: Authorization: Bearer <secret>.
 * - Else if lead engine is not configured: open POST (local dev); if configured, session or bearer required.
 */
const { getNamedBlobStore, isMissingBlobsEnvError } = require('./lib/get-blob-store');
const { getLeadEngineSession } = require('./lib/lead-engine-session');
const { isLeadEngineEnabled, isLeadEngineAuthConfigured } = require('./lib/lead-engine-config');
const {
  getPreset,
  normalizeServices,
  normalizeIssueOptions,
  listIndustryKeys,
} = require('./lib/demo-industry-presets');
const {
  insertJlDemoConfig,
  isJlDemoSupabaseConfigured,
  isSlugTakenInJlDemoConfigs,
  fetchJlDemoConfigBySlug,
} = require('./lib/demo-config-supabase');
const {
  STORE_NAME,
  DEFAULT_DEMO_SUBTEXT,
  BLOB_UNAVAILABLE_DETAILS,
  slugifyBusinessName,
  normalizeRequestedSlug,
  sanitizeCtaService,
  originFromEvent,
  RESERVED_SLUGS,
  STATIC_BUNDLED_DEMO_SLUGS,
} = require('./lib/demo-config-core');

function corsHeaders(methods) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Allow-Methods': methods,
  };
}

function parseJsonBody(event) {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '{}';
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function verifyPostAuth(event) {
  const secretRaw = process.env.DEMO_GENERATOR_SECRET;
  const hasSecret = !!(secretRaw && String(secretRaw).trim());
  const secret = hasSecret ? String(secretRaw).trim() : '';

  if (isLeadEngineEnabled() && isLeadEngineAuthConfigured()) {
    if (getLeadEngineSession(event)) return true;
    if (hasSecret) {
      const auth = event.headers.authorization || event.headers.Authorization || '';
      const token = auth.replace(/^Bearer\s+/i, '').trim();
      if (token === secret) return true;
    }
    return false;
  }

  if (hasSecret) {
    const auth = event.headers.authorization || event.headers.Authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    return token === secret;
  }
  return true;
}

function deployRuntimeLabel() {
  if (String(process.env.NETLIFY || '').toLowerCase() === 'true') return 'netlify';
  if (process.env.NETLIFY_DEV === 'true') return 'netlify-dev';
  return 'other';
}

function buildStorageDiagnostics(store, blobInitError) {
  const supabaseConfigured = isJlDemoSupabaseConfigured();
  const hasBlobsContext = !!(process.env.NETLIFY_BLOBS_CONTEXT || globalThis.netlifyBlobsContext);
  return {
    deploy: deployRuntimeLabel(),
    context: (process.env.CONTEXT || '').trim() || null,
    functionPath: '/.netlify/functions/demo-config',
    blobStore: store ? 'ready' : 'unavailable',
    blobContextPresent: hasBlobsContext,
    blobErrorName: blobInitError ? blobInitError.name : null,
    blobErrorMessage: blobInitError ? String(blobInitError.message || '').slice(0, 240) : null,
    supabasePersistence: supabaseConfigured ? 'configured' : 'not_configured',
  };
}

function openBlobStoreOrNull() {
  try {
    const store = getNamedBlobStore(STORE_NAME);
    return { store, error: null };
  } catch (e) {
    return { store: null, error: e };
  }
}

function storageUnavailableResponse(headers, diag) {
  const isNetlifyDeploy = diag.deploy === 'netlify' || diag.deploy === 'netlify-dev';
  const error = isNetlifyDeploy
    ? 'Demo storage is not available on this Netlify deployment (Blobs missing and Supabase not configured).'
    : 'Demo storage is not available in this environment.';
  const details = isNetlifyDeploy
    ? [
        'Netlify Blobs did not initialize for this function.',
        'Fix: enable or repair Blob storage for this site (same site as deploy), or set NETLIFY_SITE_ID + NETLIFY_AUTH_TOKEN in environment if using API-backed Blobs.',
        'Alternatively configure SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY and table public.jl_demo_configs (see supabase/jl_demo_configs.sql) so demos can persist without Blobs.',
      ].join('\n\n')
    : BLOB_UNAVAILABLE_DETAILS;

  console.error(
    '[demo-config] storage_mode=unavailable',
    JSON.stringify({
      deploy: diag.deploy,
      context: diag.context,
      blob: diag.blobStore,
      blobErrorName: diag.blobErrorName,
      supabase: diag.supabasePersistence,
    })
  );

  return {
    statusCode: 503,
    headers,
    body: JSON.stringify({
      error,
      code: 'STORAGE_UNAVAILABLE',
      details,
      diagnostics: { ...diag, storageMode: 'unavailable' },
    }),
  };
}

/** Slug reserved/static, present in Blob, or present in jl_demo_configs */
async function isSlugTaken(store, slug) {
  if (RESERVED_SLUGS.has(slug) || STATIC_BUNDLED_DEMO_SLUGS.has(slug)) return true;
  if (store) {
    const existing = await store.get(slug, { type: 'json' });
    if (existing != null) return true;
  }
  if (isJlDemoSupabaseConfigured()) {
    if (await isSlugTakenInJlDemoConfigs(slug)) return true;
  }
  return false;
}

async function allocateSlugHybrid(store, base) {
  let b = base;
  if (RESERVED_SLUGS.has(b)) b = `co-${b}`;
  let candidate = b;
  let i = 0;
  while (i < 80) {
    if (!(await isSlugTaken(store, candidate))) return candidate;
    i += 1;
    candidate = `${b}-${i}`;
  }
  throw new Error('Could not allocate unique slug');
}

async function loadDemoConfigForGet(store, slug) {
  if (store) {
    const fromBlob = await store.get(slug, { type: 'json' });
    if (fromBlob != null) return { config: fromBlob, source: 'blobs' };
  }
  if (isJlDemoSupabaseConfigured()) {
    const fromDb = await fetchJlDemoConfigBySlug(slug);
    if (fromDb != null) return { config: fromDb, source: 'supabase' };
  }
  return { config: null, source: null };
}

exports.handler = async (event) => {
  const headersGet = { ...corsHeaders('GET, OPTIONS'), 'Content-Type': 'application/json' };
  const headersPost = { ...corsHeaders('GET, POST, OPTIONS'), 'Content-Type': 'application/json' };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders('GET, POST, OPTIONS') };
  }

  if (event.httpMethod === 'GET' && String(event.queryStringParameters?.meta || '') === 'industries') {
    const industries = listIndustryKeys().map((key) => {
      const p = getPreset(key);
      return {
        key,
        label: p.label,
        defaultServices: p.defaultServices,
      };
    });
    return {
      statusCode: 200,
      headers: headersGet,
      body: JSON.stringify({ industries }),
    };
  }

  const { store, error: blobInitError } = openBlobStoreOrNull();
  const supabaseOk = isJlDemoSupabaseConfigured();
  const baseDiag = buildStorageDiagnostics(store, blobInitError);

  if (!store && !supabaseOk) {
    return storageUnavailableResponse(headersGet, baseDiag);
  }

  if (store) {
    console.log('[demo-config] storage blob=ready supabase=' + (supabaseOk ? 'on' : 'off'));
  } else {
    console.warn(
      '[demo-config] storage blob=missing supabase=on fallback=supabase',
      blobInitError && isMissingBlobsEnvError(blobInitError) ? blobInitError.name : blobInitError?.message
    );
  }

  if (event.httpMethod === 'GET') {
    const slug = (
      event.queryStringParameters?.slug ||
      event.queryStringParameters?.demo ||
      ''
    )
      .trim()
      .toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return {
        statusCode: 400,
        headers: headersGet,
        body: JSON.stringify({ error: 'Missing or invalid slug' }),
      };
    }
    try {
      const { config, source } = await loadDemoConfigForGet(store, slug);
      if (config == null) {
        return {
          statusCode: 404,
          headers: headersGet,
          body: JSON.stringify({ error: 'Demo not found' }),
        };
      }
      if (source) {
        console.log('[demo-config] GET slug=' + slug + ' source=' + source);
      }
      return {
        statusCode: 200,
        headers: headersGet,
        body: JSON.stringify(config),
      };
    } catch (e) {
      console.error('[demo-config] GET', e);
      return {
        statusCode: 500,
        headers: headersGet,
        body: JSON.stringify({ error: 'Read failed' }),
      };
    }
  }

  if (event.httpMethod === 'POST') {
    const authOk = verifyPostAuth(event);
    if (!authOk) {
      return {
        statusCode: 401,
        headers: headersPost,
        body: JSON.stringify({
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
          details:
            'Valid lead engine session cookie or Authorization: Bearer DEMO_GENERATOR_SECRET is required when lead engine auth is configured.',
          diagnostics: { ...baseDiag, authOk: false, storageMode: store ? 'blobs' : 'supabase' },
        }),
      };
    }

    const body = parseJsonBody(event);
    if (!body || typeof body !== 'object') {
      return {
        statusCode: 400,
        headers: headersPost,
        body: JSON.stringify({ error: 'Invalid JSON body' }),
      };
    }

    const businessName = String(body.businessName || '').trim().slice(0, 120);
    if (!businessName) {
      return {
        statusCode: 400,
        headers: headersPost,
        body: JSON.stringify({ error: 'businessName is required' }),
      };
    }

    const industryRaw = String(body.industry ?? '').trim().toLowerCase();
    if (!industryRaw) {
      return {
        statusCode: 400,
        headers: headersPost,
        body: JSON.stringify({ error: 'industry is required' }),
      };
    }

    const keys = new Set(listIndustryKeys());
    if (!keys.has(industryRaw)) {
      return {
        statusCode: 400,
        headers: headersPost,
        body: JSON.stringify({ error: 'Invalid industry' }),
      };
    }
    const industryKey = industryRaw;

    const services = normalizeServices(body.services, industryKey, 12);
    const issueOptions = normalizeIssueOptions(body.issueOptions, industryKey, 12);

    const ctaService = sanitizeCtaService(body.ctaService);

    const subtextRaw = String(body.subtext || body.demoSubtext || '').trim();
    const subtext = subtextRaw.slice(0, 280) || DEFAULT_DEMO_SUBTEXT;

    const notesRaw = String(body.notes || '').trim().slice(0, 2000);

    let slug;
    const slugInput = body.slug;
    const slugInputTrimmed = slugInput != null ? String(slugInput).trim() : '';
    if (slugInputTrimmed) {
      const requested = normalizeRequestedSlug(slugInputTrimmed);
      if (!requested) {
        return {
          statusCode: 400,
          headers: headersPost,
          body: JSON.stringify({
            error: 'Invalid slug (lowercase letters, numbers, single hyphens between segments; max 72 chars)',
          }),
        };
      }
      if (await isSlugTaken(store, requested)) {
        return {
          statusCode: 409,
          headers: headersPost,
          body: JSON.stringify({
            error: 'Slug already in use or reserved',
            slug: requested,
          }),
        };
      }
      slug = requested;
    } else {
      const baseSlug = slugifyBusinessName(businessName);
      try {
        slug = await allocateSlugHybrid(store, baseSlug);
      } catch (e) {
        console.error('[demo-config] slug', e);
        return {
          statusCode: 500,
          headers: headersPost,
          body: JSON.stringify({ error: 'Could not create slug' }),
        };
      }
    }

    const preset = getPreset(industryKey);
    const config = {
      version: 2,
      slug,
      businessName,
      industry: industryKey,
      industryLabel: preset.label,
      services,
      issueOptions,
      ctaService,
      subtext,
      headerTitle: `${businessName} – Smart Intake Demo`,
      createdAt: new Date().toISOString(),
      source: String(body.source || '').trim().slice(0, 64) || undefined,
    };
    if (notesRaw) config.notes = notesRaw;

    let blobWriteFailed = false;
    if (store) {
      try {
        await store.setJSON(slug, config);
      } catch (e) {
        blobWriteFailed = true;
        console.error('[demo-config] setJSON failed', e);
        if (!supabaseOk) {
          return {
            statusCode: 500,
            headers: headersPost,
            body: JSON.stringify({
              error: 'Save failed (Blob write error and no Supabase fallback)',
              code: 'BLOB_WRITE_FAILED',
              diagnostics: {
                ...baseDiag,
                blobStore: 'ready',
                blobWriteError: String(e.message || e).slice(0, 240),
                supabasePersistence: 'not_configured',
                storageMode: 'unavailable',
              },
            }),
          };
        }
      }
    }

    const dbOut = await insertJlDemoConfig({ config, notes: notesRaw || null });

    if (!store || blobWriteFailed) {
      if (!dbOut.ok && !dbOut.skipped) {
        console.error('[demo-config] storage_mode=unavailable supabase upsert failed', dbOut.message || dbOut.error);
        return {
          statusCode: 503,
          headers: headersPost,
          body: JSON.stringify({
            error: 'Could not persist demo (Supabase save failed)',
            code: 'SUPABASE_SAVE_FAILED',
            details: dbOut.message || 'jl_demo_configs upsert failed',
            diagnostics: {
              ...baseDiag,
              blobStore: store ? (blobWriteFailed ? 'write_failed' : 'ready') : 'unavailable',
              supabasePersistence: 'error',
              storageMode: 'unavailable',
            },
          }),
        };
      }
      if (dbOut.skipped) {
        return {
          statusCode: 503,
          headers: headersPost,
          body: JSON.stringify({
            error: 'Could not persist demo (no Blob store and Supabase not configured)',
            code: 'NO_PERSISTENCE',
            diagnostics: { ...baseDiag, storageMode: 'unavailable' },
          }),
        };
      }
    } else if (!dbOut.ok && !dbOut.skipped) {
      console.warn('[demo-config] Supabase jl_demo_configs insert failed (blob saved)');
    }

    const storageMode =
      store && !blobWriteFailed
        ? dbOut.ok && !dbOut.skipped
          ? 'blobs+supabase'
          : 'blobs'
        : 'supabase';

    console.log('[demo-config] POST slug=' + slug + ' storage_mode=' + storageMode);

    const origin = originFromEvent(event);
    const pathUrl = `/demo/${slug}`;

    return {
      statusCode: 201,
      headers: headersPost,
      body: JSON.stringify({
        ok: true,
        slug,
        path: pathUrl,
        url: origin ? `${origin}${pathUrl}` : pathUrl,
        config,
        persistedSupabase: !!(dbOut && dbOut.ok && !dbOut.skipped),
        persistedBlob: !!(store && !blobWriteFailed),
        blobWriteRecoveredViaSupabase: blobWriteFailed && !!(dbOut && dbOut.ok),
        diagnostics: {
          ...baseDiag,
          authOk: true,
          storageMode,
          blobWriteFailed: blobWriteFailed || undefined,
        },
      }),
    };
  }

  return {
    statusCode: 405,
    headers: headersGet,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
