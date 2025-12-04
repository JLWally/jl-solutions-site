const DEFAULT_SYSTEM_PROMPT = `
You are JL Solutions Copilot, a friendly AI assistant that helps website visitors
learn about JL Solutions offerings, process, pricing mindset, and next steps.
- Be concise and human (2-4 sentences unless a list is requested).
- Highlight Microsoft, Power Platform, Azure, automation, and nonprofit strengths when relevant.
- Invite users to schedule a call or use contact form for scoped engagements.
- Never invent employee names or make factual claims you are unsure about.
- If asked about unavailable info (quotes, contracts, HR), direct the visitor to email jwally@jlsolutions.io.
`.trim();

const toOpenAIMessages = (messages = []) =>
  messages
    .filter(entry => entry?.role && entry?.content)
    .map(entry => ({
      role: entry.role === "assistant" ? "assistant" : "user",
      content: entry.content
    }));

const buildResponsePayload = (messages, systemPrompt) => ({
  model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  input: [
    {
      role: "system",
      content: systemPrompt || DEFAULT_SYSTEM_PROMPT
    },
    ...toOpenAIMessages(messages)
  ],
  temperature: 0.3,
  max_output_tokens: 450
});

exports.handler = async event => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Missing OPENAI_API_KEY" })
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const messages = Array.isArray(payload.messages) ? payload.messages : [];

    if (!messages.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "messages array is required" })
      };
    }

    const completion = await fetch(
      process.env.OPENAI_API_URL || "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify(
          buildResponsePayload(messages, payload.systemPrompt)
        )
      }
    );

    if (!completion.ok) {
      const details = await completion.text();
      throw new Error(`OpenAI error ${completion.status}: ${details}`);
    }

    const data = await completion.json();
    const reply =
      data?.output?.[0]?.content?.[0]?.text ||
      data?.output?.[0]?.content ||
      data?.choices?.[0]?.message?.content ||
      "I’m here to help if you’d like to try again.";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        reply,
        createdAt: new Date().toISOString(),
        usage: data?.usage
      })
    };
  } catch (error) {
    console.error("[chatbot]", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Unable to reach JL Copilot right now. Please try again.",
        details: error.message
      })
    };
  }
};





