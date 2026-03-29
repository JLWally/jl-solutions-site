/**
 * Public GET: opt a lead out of lead-engine outreach email (token in query).
 * Does not require operator auth or LEAD_ENGINE_ENABLED — token is the credential.
 */
const { getLeadEngineSupabase } = require('./lib/lead-engine-supabase');
const {
  ensureEmailGloballySuppressed,
  isEmailGloballySuppressed,
} = require('./lib/lead-engine-global-suppression');
const { EVENT_TYPES, logLeadEngineEvent } = require('./lib/lead-engine-audit-log');

function htmlPage(title, bodyHtml) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:3rem auto;padding:0 1rem;line-height:1.5;color:#222}</style></head><body>${bodyHtml}</body></html>`;
}

exports.handler = async (event) => {
  const baseHeaders = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...baseHeaders, Allow: 'GET, OPTIONS' } };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: baseHeaders,
      body: htmlPage('Method not allowed', '<p>Use the link from your email.</p>'),
    };
  }

  const supabase = getLeadEngineSupabase();
  if (!supabase) {
    return {
      statusCode: 503,
      headers: baseHeaders,
      body: htmlPage(
        'Unavailable',
        '<p>This service is temporarily unavailable. You will not be charged for unsubscribing; try again later or contact JL Solutions directly.</p>'
      ),
    };
  }

  const qs = event.queryStringParameters || {};
  const token = qs.token != null ? String(qs.token).trim() : '';
  if (!token) {
    return {
      statusCode: 400,
      headers: baseHeaders,
      body: htmlPage('Invalid link', '<p>Missing token. Use the unsubscribe link from your email.</p>'),
    };
  }

  const { data: lead, error: findErr } = await supabase
    .from('lead_engine_leads')
    .select('id, contact_email, email_opted_out')
    .eq('outreach_unsubscribe_token', token)
    .maybeSingle();

  if (findErr) {
    console.error('[lead-engine-unsubscribe] find', findErr);
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: htmlPage('Error', '<p>Something went wrong. Please try again later.</p>'),
    };
  }

  if (!lead) {
    return {
      statusCode: 404,
      headers: baseHeaders,
      body: htmlPage(
        'Link not recognized',
        '<p>This unsubscribe link is not valid. If you still receive unwanted email, reply to the message or contact JL Solutions.</p>'
      ),
    };
  }

  const nowIso = new Date().toISOString();
  const { error: upErr } = await supabase
    .from('lead_engine_leads')
    .update({ email_opted_out: true, updated_at: nowIso })
    .eq('id', lead.id);

  if (upErr) {
    console.error('[lead-engine-unsubscribe] update', upErr);
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: htmlPage('Error', '<p>Could not save your preference. Please try again later.</p>'),
    };
  }

  let globalNote = '';
  const globalBefore = await isEmailGloballySuppressed(supabase, lead.contact_email);
  const gs = await ensureEmailGloballySuppressed(supabase, {
    emailRaw: lead.contact_email,
    suppressionSource: 'unsubscribe_link',
    reason: 'recipient_unsubscribe',
    createdBy: 'public_unsubscribe',
  });
  if (!gs.ok) {
    console.error('[lead-engine-unsubscribe] global suppression', gs.error);
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: htmlPage('Error', '<p>Could not save your preference. Please try again later.</p>'),
    };
  }
  if (gs.skipped) {
    globalNote =
      '<p class="small">We saved a lead-level opt-out. This lead has no contact email, so global-by-email suppression could not be created.</p>';
  } else {
    globalNote =
      '<p class="small">Your email address is now globally suppressed for this lead engine outreach flow.</p>';
  }

  await logLeadEngineEvent(supabase, {
    lead_id: lead.id,
    event_type: EVENT_TYPES.UNSUBSCRIBED,
    actor: 'public_unsubscribe',
    message: 'Recipient unsubscribed via link',
  });
  if (!globalBefore.error && !globalBefore.suppressed && !gs.skipped) {
    await logLeadEngineEvent(supabase, {
      lead_id: lead.id,
      event_type: EVENT_TYPES.GLOBAL_SUPPRESSION_CREATED,
      actor: 'public_unsubscribe',
      message: 'Created global suppression via unsubscribe',
      metadata_json: { email_normalized: gs.normalized || null },
    });
  }

  if (lead.email_opted_out === true) {
    return {
      statusCode: 200,
      headers: baseHeaders,
      body: htmlPage(
        'Already unsubscribed',
        `<p>You are already unsubscribed from JL Solutions outreach for this inquiry.</p>${globalNote}`
      ),
    };
  }

  return {
    statusCode: 200,
    headers: baseHeaders,
    body: htmlPage(
      'Unsubscribed',
      `<p>You have been unsubscribed from further JL Solutions outreach emails for this inquiry.</p>${globalNote}<p>If this was a mistake, contact us at <a href="mailto:info@jlsolutions.io">info@jlsolutions.io</a>.</p>`
    ),
  };
};
