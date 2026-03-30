/**
 * OpenAI Responses call for outreach draft (Slice E).
 */
const { postResponses, extractResponsesOutputText } = require('./lead-engine-openai-responses');
const { getOpenAiModel } = require('./openai-model');

async function completeDraftModel({ systemPrompt, userContent }) {
  const model = getOpenAiModel();
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
