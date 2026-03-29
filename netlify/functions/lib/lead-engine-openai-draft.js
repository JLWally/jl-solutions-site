/**
 * OpenAI Responses call for outreach draft (Slice E).
 */
const { postResponses, extractResponsesOutputText } = require('./lead-engine-openai-responses');

async function completeDraftModel({ systemPrompt, userContent }) {
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const data = await postResponses({
    model,
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.35,
    max_output_tokens: 1600,
  });
  return {
    text: extractResponsesOutputText(data),
    model,
    usage: data && data.usage,
  };
}

module.exports = { completeDraftModel };
