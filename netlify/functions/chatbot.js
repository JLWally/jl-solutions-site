const {
  postResponses,
  extractResponsesOutputText
} = require("./lib/lead-engine-openai-responses");
const { getOpenAiModel } = require("./lib/openai-model");

const SITE_KNOWLEDGE = `
## About JL Solutions
- Tagline: "Automate. Streamline. Grow Your Business."
- They help businesses capture leads 24/7, pre-qualify clients, automate scheduling and follow-ups, and turn data into useful reporting.
- Common client types: clinics/health, contractors and field services, catering and events, nonprofits, government-related work, and growing SMBs.
- Tech angle: strong with Microsoft stack when relevant (Power Platform, Azure, integrations, and practical AI for intake and workflows). Do not promise specific products until scope is known.

## Key pages (use markdown links in replies, e.g. [Book a free call](/book-consultation.html))
- Primary conversion (free strategy/discovery call): /book-consultation.html
- Secure payment / deposit / invoice checkout (Stripe): /pay/
- General questions and project inquiries: /contact.html
- Service overview and deep links: /services/index.html
- Interactive product story: /demo.html
- Proof and examples: /case-studies/index.html
- Templates, guides, downloads: /resources/index.html
- Articles: /insights/index.html
- Common questions: /faq/index.html
- ROI thinking tool: /tools/roi-calculator.html
- AI intake example flow: /services/ai-intake-form.html (or /services/ai-intake-form)
- Partner / referral program (for sales agents, not typical buyers): /sales.html, /referral/signup.html

## Process (high level)
1) Find bottlenecks in intake, qualification, and follow-up.
2) Design and build automation (forms, routing, scheduling, notifications, dashboards as needed).
3) Launch, refine, and scale.

## Pricing and timelines
- Pricing is scoped per project; do not quote dollar amounts or timelines you were not given in this chat.
- It is OK to say that investment depends on complexity, integrations, and volume, and that a free call clarifies scope and options.
- FAQ on the site mentions that work often starts within a few weeks after consultation and agreement. Treat that as general guidance, not a guarantee.

## Contact
- Email: info@jlsolutions.io
`.trim();

const DEFAULT_SYSTEM_PROMPT = `
You are Wattson, the friendly on-site assistant for JL Solutions (jlsolutions.io). Visitors use you to learn quickly and decide what to do next. Lead with clarity and helpfulness.

Your goals:
1) Answer accurately using the knowledge below. Use short paragraphs and plain language.
2) Make the next step obvious. Prefer one primary call to action with a markdown link: [Book a free call](/book-consultation.html) for fit and scope, [Send a message](/contact.html) for written questions, or [Pay / checkout](/pay/) when they need to pay a deposit or invoice (Stripe; amount and optional referral code).

Rules:
- Tone: warm, confident, easy to scan. No jargon unless the visitor used it first.
- Keep replies brief (2 to 4 short paragraphs unless they ask for a list). Put the most important link near the end of your reply.
- Do not use em dashes or en dashes. Use commas, periods, or short sentences.
- Links must use this format only, with same-origin paths: [label](/path). Use labels that sound actionable (for example "Book a free call" not "click here").
- If they are unsure where to start, recommend [Book a free call](/book-consultation.html) as the low-pressure way to explore.
- If they are ready to pay, send them to [Pay / checkout](/pay/) and mention Stripe briefly.
- If they want examples or proof, point to [Demo](/demo.html) or [Case studies](/case-studies/index.html).
- Never invent staff names, private client names, contracts, or dollar amounts you were not given.
- For legal, HR, or sensitive commitments, say you cannot commit and direct them to info@jlsolutions.io or [Send a message](/contact.html).

${SITE_KNOWLEDGE}
`.trim();

const sanitizeClientMessages = (messages = []) =>
  messages
    .filter(
      entry =>
        entry &&
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.content === "string" &&
        entry.content.trim()
    )
    .map(entry => ({
      role: entry.role === "assistant" ? "assistant" : "user",
      content: entry.content.trim()
    }));

const buildResponsePayload = (messages, systemPrompt) => ({
  model: getOpenAiModel(),
  input: [
    {
      role: "system",
      content: systemPrompt || DEFAULT_SYSTEM_PROMPT
    },
    ...messages
  ],
  temperature: 0.35,
  max_output_tokens: 600
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

  try {
    const payload = JSON.parse(event.body || "{}");
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    const sanitized = sanitizeClientMessages(messages);

    if (!sanitized.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "messages array is required" })
      };
    }

    const data = await postResponses(
      buildResponsePayload(sanitized, payload.systemPrompt)
    );
    const reply =
      extractResponsesOutputText(data) ||
      "I am here to help if you would like to try again.";

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
    const code = error && error.code;
    if (code === "missing_api_key") {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "AI assistant is not configured. Set OPENAI_API_KEY for Netlify Functions.",
          details: error.message
        })
      };
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "The assistant hit a snag. Please try again in a moment.",
        details: error.message
      })
    };
  }
};





