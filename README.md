## JL Solutions AI Chatbot

This repo now ships with **JL Copilot**, a lightweight AI assistant that can answer visitor questions about the studio.

### How it works

1. `js/chatbot.js` injects a floating chat widget on every page (loaded from `js/main.js`).
2. When a visitor sends a message, the widget posts the running conversation to `/.netlify/functions/chatbot`.
3. The Netlify function calls OpenAI’s Responses API (`gpt-4.1-mini` by default) with a curated system prompt and returns the reply.

### Getting started locally

```bash
npm install netlify-cli -g
export OPENAI_API_KEY=sk-your-key
netlify dev
```

Open http://localhost:8888 and you should see the chat bubble in the lower‑right corner. Conversations are cached in `localStorage` per browser.

### Deploying

1. Host the static site (Netlify, Vercel, Azure Static Web Apps, etc.).
2. Expose the serverless function. For Netlify, keep the file at `netlify/functions/chatbot.js` and run `netlify deploy`.
3. Set the following environment variables in your host:
   - `OPENAI_API_KEY` – required.
   - `OPENAI_MODEL` – optional override (defaults to `gpt-4.1-mini`).
   - `OPENAI_API_URL` – optional if you use Azure OpenAI or a proxy.

If you deploy somewhere other than Netlify, update `CONFIG.endpoint` in `js/chatbot.js` (or pass `data-endpoint` on the script tag) so the widget knows where to send requests.



