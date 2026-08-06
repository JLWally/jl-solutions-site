const {
  postResponses,
  extractResponsesOutputText
} = require("./lib/lead-engine-openai-responses");
const { getOpenAiModel } = require("./lib/openai-model");
const {
  documentExtractionDemoHandler,
  getHttpMethod,
  parseJsonBody
} = require("./lib/document-extraction-demo-run");

const SITE_KNOWLEDGE = `
## About JL Solutions
- Tagline: "Automate. Streamline. Grow Your Business."
- They help businesses capture leads 24/7, pre-qualify clients, automate scheduling and follow-ups, and turn data into useful reporting.
- Common client types: clinics/health, contractors and field services, catering and events, nonprofits, government-related work, and growing SMBs.
- Tech angle: strong with Microsoft stack when relevant (Power Platform, Azure, integrations, and practical AI for intake and workflows). Do not promise specific deliverables outside the published packages until scope is confirmed.

## Self-serve: demos and tools (no call required)
- Many visitors can explore the product story and try demos without booking a call first.
- Use this when they ask to see the product, try something, watch a demo, or estimate ROI.
- Interactive walkthrough (product story): /demo
- Upload-and-extract document demo: /services/document-extraction-demo.html
- AI-style intake example you can submit: /services/ai-intake-form.html
- ROI / savings estimator: /tools/roi-calculator.html

## How to buy (two paths, same Stripe)
1) **Fast pay, no intake form:** [Checkout](/checkout/) lists the three starter promos below with direct Stripe buttons. The checkout page may show short-term capacity or urgency copy; treat that as current marketing on the page, not a promise you invent here.
2) **Guided fit, then pay:** [Get started](/get-started) walks through the problem, recommends Quick Setup, Priority Quick Setup, Full System Deposit, or a broader fixed-price system, then collects a short pre-checkout intake before Stripe. For the larger fixed packages you can deep-link with \`?service=\` (see list below). Legacy \`/getstarted\` and \`?product=\` still work.
- After any productized Stripe payment, buyers complete kickoff details on [Onboarding](/onboarding) with the matching \`?service=\` (examples: quick-setup, priority-quick-setup, full-system-deposit, ai-intake, fix-app, scheduling, lead-engine).
- Invoices, strategy sessions, or custom amounts JL already confirmed outside these pages: [Secure manual payment](/internal-pay/) or the Stripe link JL emailed. They can also [Send a message](/contact.html). Do not invent payment URLs.

## Public productized pricing (OK to quote these list prices and typical timelines)
**Starter promos on [Checkout](/checkout/)**
- Quick Setup: **$750** (site copy: about 1 to 3 days). Smart intake, better capture, simple qualification.
- Priority Quick Setup: **$1,000** (priority this week in site copy). Everything in Quick Setup plus priority scheduling, stronger routing, extra optimization pass.
- Full System Deposit: **$1,500** deposit toward a full intake plus routing plus conversion upgrade; total scope finalized after kickoff.

**Broader fixed-price systems** (usually via [Get started](/get-started) after intake, or choose from [Services](/services/index.html))
- Fix My App Sprint (\`?service=fix-app\`): **$1,500**, typical live window about **3 to 5 days**. Overview: /services/fix-my-app.html
- AI Intake Form Setup (\`?service=ai-intake\`): **$2,500**, about **3 to 7 days**. Overview: /services/ai-intake-form.html
- Scheduling and Routing Setup (\`?service=scheduling\`): **$3,000**, about **3 to 7 days**. Overview: /services/scheduling-routing-setup.html
- Lead Generation Engine (\`?service=lead-engine\`): **$3,500**, about **7 to 10 days**; site notes optional ongoing management. Overview: /services/lead-generation-engine.html
- Custom build or advanced workflow: **scoped together** on [Book a Free Call](/book-consultation.html), not a fixed list price.

If they need something between a starter promo and a full fixed package, point to [Get started](/get-started) or [Checkout](/checkout/) and say JL confirms fit at kickoff. Never invent coupons, partner discounts, or prices not listed here.

## Key pages (use markdown links in replies)
- Checkout (starter promos, direct Stripe): /checkout/
- Get started (wizard, intake, then pay): /get-started?service=ai-intake (swap service: fix-app, lead-engine, scheduling as needed)
- Post-purchase intake: /onboarding (with ?service=…)
- Book a Free Call: /book-consultation.html
- Contact: /contact.html
- Services overview: /services/index.html
- Case studies: /case-studies/index.html
- Resources: /resources/index.html
- Insights: /insights/index.html
- FAQ: /faq/index.html
- Partner / referral: /sales.html, /referral/signup.html

## Process (high level)
1) Find bottlenecks in intake, qualification, and follow-up.
2) Design and build automation (forms, routing, scheduling, notifications, dashboards as needed).
3) Launch, refine, and scale.

## Custom work and timelines
- Anything outside the published packages is scoped per project. A free call clarifies scope when they are unsure.
- FAQ on the site mentions implementation often starting within a few weeks after agreement for some engagements. Treat that as general guidance, not a guarantee for every offer.

## Contact
- Email: info@jlsolutions.io
`.trim();

const DEFAULT_SYSTEM_PROMPT = `
You are Wattson, the friendly on-site assistant for JL Solutions (jlsolutions.io). Visitors use you to learn quickly and decide what to do next. Lead with clarity and helpfulness.

Your goals:
1) Answer accurately using the knowledge below. Use short paragraphs and plain language.
2) Match the next step to intent. Do not push a call when they only want to browse, try a demo, or self-serve checkout.
   - Want to see or try the product: lead with [Interactive demo](/demo), and add [Document extraction demo](/services/document-extraction-demo.html) or [AI intake example](/services/ai-intake-form.html) when relevant. Mention [ROI calculator](/tools/roi-calculator.html) if they ask about savings or payback.
   - Want the fastest published pay path or the $750 / $1,000 / $1,500 starter promos: [Checkout](/checkout/).
   - Want help choosing, or a broader fixed-price system (Fix My App, AI Intake, Scheduling, Lead Engine): [Get started](/get-started) or [Services](/services/index.html) to compare, then intake before Stripe for those systems.
   - Ready to pay an invoice or custom amount JL already confirmed: use the secure Stripe link JL emailed them, or [Send a message](/contact.html) if they need a link resent.
   - Want proof: [Case studies](/case-studies/index.html).
   - Need a human for open-ended scope, custom quotes, or they are lost: [Book a Free Call](/book-consultation.html) or [Send a message](/contact.html).

Rules:
- Tone: warm, confident, easy to scan. No jargon unless the visitor used it first.
- Keep replies brief (2 to 4 short paragraphs unless they ask for a list). Put the most important link for their intent near the end of your reply.
- Do not use em dashes or en dashes. Use commas, periods, or short sentences.
- Links must use this format only, with same-origin paths: [label](/path). Use labels that sound actionable (for example "Get started" not "click here").
- If they are unsure where to start, suggest [Interactive demo](/demo), [Services](/services/index.html), or [Checkout](/checkout/) depending on whether they want to explore, compare packages, or pay quickly.
- Never invent staff names, private client names, contracts, coupons, or prices outside the published list in the knowledge block.
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

  const method = getHttpMethod(event);

  if (method === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (method !== "POST") {
    return {
      statusCode: 405,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const payload = parseJsonBody(event);

    if (
      payload.jlDocumentExtractionDemo === true &&
      typeof payload.fileBase64 === "string"
    ) {
      return documentExtractionDemoHandler(event);
    }

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
      "We're here to help if you would like to try again.";

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





