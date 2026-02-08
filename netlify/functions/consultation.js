const { createClient } = require('@supabase/supabase-js');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Database not configured' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const {
      name,
      email,
      phone,
      company,
      service,
      message,
      challenge,
      goals,
      referralCode,
      selectedDateTime,
      source = 'website',
    } = body;

    if (!name || !email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Name and email are required' }),
      };
    }

    const { data, error } = await supabase.from('consultations').insert({
      name,
      email,
      phone: phone || null,
      company: company || null,
      service: service || null,
      message: message || challenge || '',
      challenge: challenge || null,
      goals: goals || null,
      referral_code: referralCode ? String(referralCode).trim().toUpperCase() : null,
      selected_datetime: selectedDateTime || null,
      source,
      status: 'new',
    }).select('id').single();

    if (error) {
      console.error('[consultation]', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to save consultation' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: data?.id }),
    };
  } catch (err) {
    console.error('[consultation]', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Invalid request' }),
    };
  }
};
