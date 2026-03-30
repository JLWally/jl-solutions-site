/**
 * OpenAI Responses call for lead scoring (Slice D).
 */
const { postResponses, extractResponsesOutputText } = require('./lead-engine-openai-responses');
const { getOpenAiModel } = require('./openai-model');

async function completeLeadScoreModel({ systemPrompt, userContent }) {
  const model = getOpenAiModel();
  const data = await postResponses({
    model,
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
    max_output_tokens: 700,
  });
  return {
    text: extractResponsesOutputText(data),
    model,
    usage: data && data.usage,
  };
}

module.exports = { completeLeadScoreModel };
