/**
 * OpenAI Responses call for lead scoring (Slice D).
 */
const { postResponses, extractResponsesOutputText } = require('./lead-engine-openai-responses');

async function completeLeadScoreModel({ systemPrompt, userContent }) {
  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
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
