/**
 * Thin wrapper for OpenAI Responses API (same transport as netlify/functions/chatbot.js).
 * Isolated so scoring can swap providers or wire mock tests without touching chatbot.
 */
const { envVarFromB64 } = require('./runtime-process-env');

function extractResponsesOutputText(data) {
  if (!data || typeof data !== 'object') return '';
  if (Array.isArray(data.output)) {
    const chunks = [];
    for (const block of data.output) {
      if (!block || typeof block !== 'object') continue;
      const parts = block.content;
      if (!Array.isArray(parts)) continue;
      for (const part of parts) {
        if (!part || typeof part !== 'object') continue;
        if (typeof part.text === 'string' && part.text.length) {
          chunks.push(part.text);
          continue;
        }
        if (
          (part.type === 'output_text' || part.type === 'input_text') &&
          typeof part.text === 'string' &&
          part.text.length
        ) {
          chunks.push(part.text);
        }
      }
    }
    if (chunks.length) return chunks.join('');
  }
  const out0 = data.output && data.output[0];
  const content = out0 && out0.content;
  if (Array.isArray(content) && content[0]) {
    if (typeof content[0].text === 'string') return content[0].text;
    if (typeof content[0] === 'string') return content[0];
  }
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content || '';
  }
  return '';
}

/**
 * @param {object} requestBody - OpenAI /v1/responses JSON body
 */
async function postResponses(requestBody) {
  const rawUrl = envVarFromB64('T1BFTkFJX0FQSV9VUkw=');
  const url = String(rawUrl || 'https://api.openai.com/v1/responses')
    .trim()
    .replace(/\/chat\/completions\/?$/i, '/responses');
  const key = envVarFromB64('T1BFTkFJX0FQSV9LRVk=');
  if (!key) {
    const err = new Error('OPENAI_API_KEY is not configured');
    err.code = 'missing_api_key';
    throw err;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(requestBody),
  });

  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`OpenAI error ${res.status}: ${text.slice(0, 500)}`);
    err.code = 'openai_http';
    err.status = res.status;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const err = new Error('OpenAI returned non-JSON');
    err.code = 'openai_parse';
    throw err;
  }

  return data;
}

module.exports = {
  extractResponsesOutputText,
  postResponses,
};
