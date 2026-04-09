'use strict';

const REQUIRED_HEADERS = ['company_name', 'website_url'];
/** Parsed into row.values and passed through to import (extra CSV columns are ignored). */
const OPTIONAL_HEADERS = ['contact_email', 'source', 'idempotency_key', 'city', 'state'];
const KNOWN_HEADERS = new Set([...REQUIRED_HEADERS, ...OPTIONAL_HEADERS]);

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let i = 0;
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cur += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      out.push(cur);
      cur = '';
      i += 1;
      continue;
    }
    cur += ch;
    i += 1;
  }
  if (inQuotes) return { ok: false, error: 'Unclosed quote in CSV line' };
  out.push(cur);
  return { ok: true, values: out };
}

function parseCsvText(csvText) {
  const raw = String(csvText == null ? '' : csvText).replace(/^\uFEFF/, '');
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);
  if (!lines.length) return { ok: false, error: 'CSV is empty' };

  const head = parseCsvLine(lines[0]);
  if (!head.ok) return { ok: false, error: `Header parse failed: ${head.error}` };

  const headers = head.values.map((h) => String(h || '').trim());
  const lower = headers.map((h) => h.toLowerCase());

  for (const req of REQUIRED_HEADERS) {
    if (!lower.includes(req)) {
      return { ok: false, error: `Missing required header: ${req}` };
    }
  }
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const parsed = parseCsvLine(lines[i]);
    if (!parsed.ok) {
      return { ok: false, error: `Line ${i + 1}: ${parsed.error}` };
    }
    const rawValues = parsed.values;
    const rec = {};
    for (let c = 0; c < headers.length; c += 1) {
      const key = lower[c];
      if (!key) continue;
      rec[key] = rawValues[c] == null ? '' : String(rawValues[c]);
    }
    rows.push({
      rowNumber: i + 1,
      values: {
        company_name: rec.company_name || '',
        website_url: rec.website_url || '',
        contact_email: rec.contact_email || '',
        source: rec.source || '',
        idempotency_key: rec.idempotency_key || '',
        city: rec.city || '',
        state: rec.state || '',
      },
    });
  }

  const ignoredHeaders = [...new Set(lower.filter((h) => h && !KNOWN_HEADERS.has(h)))];
  return { ok: true, value: { headers: lower, rows, ignoredHeaders } };
}

module.exports = {
  REQUIRED_HEADERS,
  OPTIONAL_HEADERS,
  KNOWN_HEADERS,
  /** @deprecated use [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS] */
  get SUPPORTED_HEADERS() {
    return [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];
  },
  parseCsvText,
};

