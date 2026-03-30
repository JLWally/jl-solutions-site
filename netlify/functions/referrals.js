const { createClient } = require('@supabase/supabase-js');
const { envVarFromB64 } = require('./lib/runtime-process-env');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function getSupabase(authHeader) {
  const url = envVarFromB64('U1VQQUJBU0VfVVJM');
  const anonKey = envVarFromB64('U1VQQUJBU0VfQU5PTl9LRVk=');
  if (!url || !anonKey) return null;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function getLeadSubmissions(supabase, isAdmin, codes) {
  try {
    const codeVals = (codes || [])
      .map((c) => (c && c.code ? String(c.code).trim().toUpperCase() : ''))
      .filter(Boolean);
    let q = supabase
      .from('consultations')
      .select('created_at,name,email,service,referral_code,source,status,message')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!isAdmin) {
      if (!codeVals.length) return [];
      q = q.in('referral_code', codeVals);
    }
    const { data, error } = await q;
    if (error) {
      console.warn('[referrals] consultations query failed:', error.message || error);
      return [];
    }
    return (data || []).map((row) => ({
      created_at: row.created_at,
      name: row.name || '',
      email: row.email || '',
      service: row.service || '',
      referral_code: row.referral_code || '',
      source: row.source || '',
      status: row.status || '',
      message: row.message || '',
    }));
  } catch (e) {
    console.warn('[referrals] consultations query exception:', e.message || e);
    return [];
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  const supabase = getSupabase(event.headers.authorization || event.headers.Authorization);
  if (!supabase) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Not configured' }),
    };
  }

  const path = event.path.replace(/.*\/referrals\/?/, '') || '';
  const parts = path.split('/').filter(Boolean);

  const token = (event.headers.authorization || event.headers.Authorization || '').replace('Bearer ', '');

  if (event.httpMethod === 'GET' && (parts[0] === 'stats' || path === '')) {
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      const { data: codes } = await supabase
        .from('referral_codes')
        .select('id, code, commission_rate, is_active')
        .or(`user_id.eq.${user.id}${isAdmin ? ',true' : ''}`);

      const codeIds = (codes || []).map((c) => c.id);
      if (codeIds.length === 0 && !isAdmin) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            referrals: [],
            totalEarnings: 0,
            pendingEarnings: 0,
            totalReferrals: 0,
            codes: codes || [],
          }),
        };
      }

      let query = supabase
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('referrer_id', user.id);
      }

      const { data: referrals } = await query;

      const totalEarnings = (referrals || []).reduce((s, r) => s + (r.commission_cents || 0), 0);
      const pendingEarnings = (referrals || [])
        .filter((r) => r.status === 'pending')
        .reduce((s, r) => s + (r.commission_cents || 0), 0);
      const leadSubmissions = await getLeadSubmissions(supabase, isAdmin, codes || []);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          referrals: referrals || [],
          totalEarnings,
          pendingEarnings,
          totalReferrals: (referrals || []).length,
          codes: codes || [],
          leadSubmissions,
          totalLeadSubmissions: leadSubmissions.length,
        }),
      };
    } catch (err) {
      console.error('[referrals]', err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  if (event.httpMethod === 'POST' && parts[0] === 'create-code') {
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
      }

      const profile = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const role = profile?.data?.role;
      if (role !== 'sales_agent' && role !== 'admin') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Sales agent role required' }),
        };
      }

      const body = JSON.parse(event.body || '{}');
      const customCode = (body.code || '').toString().toUpperCase().replace(/\s/g, '');
      const prefix = customCode ? customCode : 'AGENT';
      const suffix = user.id.slice(0, 8).toUpperCase();
      const code = customCode || `${prefix}-${suffix}`;

      const { data: existing } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('code', code)
        .single();

      if (existing) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ code: existing, message: 'Code already exists' }),
        };
      }

      const { data: inserted, error } = await supabase
        .from('referral_codes')
        .insert({
          code,
          user_id: user.id,
          type: 'sales_agent',
          commission_rate: body.commissionRate ?? 10,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: error.message }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ code: inserted }),
      };
    } catch (err) {
      console.error('[referrals create-code]', err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
};
