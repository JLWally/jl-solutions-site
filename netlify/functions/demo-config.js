/**
 * Smart demo configs: GET by slug, POST to create.
 * Storage: Netlify Blobs store "smart-demos" (key = slug, JSON body).
 * Optional: insert audit row into Supabase jl_demo_configs when service role is set.
 *
 * POST auth (in order):
 * - Valid `lead_engine_session` when lead engine is enabled and auth is configured (same as /internal/outreach).
 * - Else if DEMO_GENERATOR_SECRET is set: Authorization: Bearer <secret> (scripts / CI).
 * - Else if lead engine is not configured: open POST (local dev); if lead engine is configured, session or bearer is required.
 */
const { getStore } = require('@netlify/blobs');
const { getLeadEngineSession } = require('./lib/lead-engine-session');
const { isLeadEngineEnabled, isLeadEngineAuthConfigured } = require('./lib/lead-engine-config');
const {
  getPreset,
  normalizeServices,
  normalizeIssueOptions,
  listIndustryKeys,
} = require('./lib/demo-industry-presets');
const { insertJlDemoConfig } = require('./lib/demo-config-supabase');
const {
  STORE_NAME,
  DEFAULT_DEMO_SUBTEXT,
  slugifyBusinessName,
  normalizeRequestedSlug,
  isSlugAvailable,
  allocateSlug,
  sanitizeCtaService,
  originFromEvent,
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

exports.handler = async (event) => {
  const headersGet = { ...corsHeaders('GET, OPTIONS'), 'Content-Type': 'application/json' };
  const headersPost = { ...corsHeaders('GET, POST, OPTIONS'), 'Content-Type': 'application/json' };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders('GET, POST, OPTIONS') };
  }

  /* Static preset list — no Netlify Blobs; must work when getStore is unavailable (e.g. plain static host). */
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

  let store;
  try {
    store = getStore(STORE_NAME);
  } catch (e) {
    console.error('[demo-config] getStore failed', e);
    return {
      statusCode: 503,
      headers: headersGet,
      body: JSON.stringify({ error: 'Storage unavailable' }),
    };
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
      const data = await store.get(slug, { type: 'json' });
      if (data == null) {
        return {
          statusCode: 404,
          headers: headersGet,
          body: JSON.stringify({ error: 'Demo not found' }),
        };
      }
      return {
        statusCode: 200,
        headers: headersGet,
        body: JSON.stringify(data),
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
    if (!verifyPostAuth(event)) {
      return {
        statusCode: 401,
        headers: headersPost,
        body: JSON.stringify({ error: 'Unauthorized' }),
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
      if (!(await isSlugAvailable(store, requested))) {
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
        slug = await allocateSlug(store, baseSlug);
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

    try {
      await store.setJSON(slug, config);
    } catch (e) {
      console.error('[demo-config] setJSON', e);
      return {
        statusCode: 500,
        headers: headersPost,
        body: JSON.stringify({ error: 'Save failed' }),
      };
    }

    const dbOut = await insertJlDemoConfig({ config, notes: notesRaw || null });
    if (!dbOut.ok && !dbOut.skipped) {
      console.warn('[demo-config] Supabase jl_demo_configs insert failed (blob saved)');
    }

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
      }),
    };
  }

  return {
    statusCode: 405,
    headers: headersGet,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
