/**
 * Shared handler for document extraction demo (OpenAI Responses + input_file).
 * Used by netlify/functions/document-extraction-demo.js and delegated from chatbot.js.
 */
const {
  postResponses,
  extractResponsesOutputText
} = require("./lead-engine-openai-responses");

const MAX_BYTES = 4 * 1024 * 1024;
const DEFAULT_DOC_MODEL = "gpt-4o-mini";

function getDocDemoModel() {
  const raw = process.env.OPENAI_DOCUMENT_DEMO_MODEL;
  if (raw == null || !String(raw).trim()) return DEFAULT_DOC_MODEL;
  return String(raw).trim();
}

function safeFilename(name) {
  const base = String(name || "document.pdf").split(/[/\\]/).pop();
  const cleaned = base.replace(/[^\w.\- ()]+/g, "_").slice(0, 180);
  return cleaned || "document.pdf";
}

function extensionOf(name) {
  const n = String(name || "").toLowerCase();
  const i = n.lastIndexOf(".");
  return i >= 0 ? n.slice(i + 1) : "";
}

function mimeForExtension(ext) {
  if (ext === "pdf") return "application/pdf";
  if (ext === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (ext === "doc") return "application/msword";
  return "application/octet-stream";
}

function parseModelJson(raw) {
  if (!raw || typeof raw !== "string") return null;
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(s);
  } catch {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(s.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function getHttpMethod(event) {
  const m =
    event.httpMethod ||
    event.requestContext?.http?.method ||
    event.requestContext?.httpMethod ||
    (typeof event.method === "string" ? event.method : "");
  return String(m || "GET").toUpperCase();
}

function parseJsonBody(event) {
  let raw = event.body;
  if (raw == null) return {};
  if (event.isBase64Encoded && typeof raw === "string") {
    try {
      raw = Buffer.from(raw, "base64").toString("utf8");
    } catch {
      return {};
    }
  }
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

const corsHeaders = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
});

async function documentExtractionDemoHandler(event) {
  const headers = corsHeaders();

  const method = getHttpMethod(event);

  if (method === "OPTIONS") {
    return { statusCode: 204, headers };
  }

  if (method !== "POST") {
    return {
      statusCode: 405,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Method not allowed",
        receivedMethod: method || null
      })
    };
  }

  try {
    const payload = parseJsonBody(event);
    const filename = safeFilename(payload.filename);
    const ext = extensionOf(filename);
    const allowedExt = ["pdf", "docx", "doc"];
    if (!allowedExt.includes(ext)) {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Only PDF, DOCX, or DOC files are supported for this demo."
        })
      };
    }

    const fileBase64 = payload.fileBase64;
    if (!fileBase64 || typeof fileBase64 !== "string") {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "fileBase64 is required." })
      };
    }

    const b64 = fileBase64.replace(/^data:[^;]+;base64,/i, "").replace(/\s/g, "");
    let buf;
    try {
      buf = Buffer.from(b64, "base64");
    } catch {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid base64 file data." })
      };
    }

    if (!buf.length) {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Empty file." })
      };
    }

    if (buf.length > MAX_BYTES) {
      return {
        statusCode: 413,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: `File too large for this demo (max ${MAX_BYTES / (1024 * 1024)}MB).`
        })
      };
    }

    const mimeType = mimeForExtension(ext);
    const dataUrl = `data:${mimeType};base64,${b64}`;
    const model = getDocDemoModel();

    const systemPrompt = `You are a document extraction helper for a public marketing demo on JL Solutions website.
Read the attached file. Return ONLY valid JSON (no markdown fences, no commentary) with exactly this shape:
{
  "documentType": string,
  "confidence": "high" | "medium" | "low",
  "keyFields": object whose keys are short field labels and values are concise strings from the document,
  "summary": string (2 to 5 sentences in plain English),
  "suggestedActions": array of up to 5 short actionable strings for a business reader
}
Use only information visible in the file. If the file is unreadable or not business-related, use documentType "Unknown", confidence "low", empty keyFields {}, and explain briefly in summary.`;

    const userContent = [
      {
        type: "input_file",
        filename,
        file_data: dataUrl
      },
      {
        type: "input_text",
        text: "Extract structured business-oriented fields as specified in the system message."
      }
    ];

    const data = await postResponses({
      model,
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      temperature: 0.2,
      max_output_tokens: 1400
    });

    const rawText = extractResponsesOutputText(data);
    const structured = parseModelJson(rawText) || {
      documentType: "Unknown",
      confidence: "low",
      keyFields: {},
      summary:
        rawText && rawText.trim()
          ? rawText.trim().slice(0, 2500)
          : "Could not parse model output as JSON.",
      suggestedActions: []
    };

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        filename,
        structured,
        modelUsed: model,
        usage: data && data.usage
      })
    };
  } catch (error) {
    console.error("[document-extraction-demo]", error);
    if (error && error.code === "missing_api_key") {
      return {
        statusCode: 503,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Live extraction is not configured.",
          code: "missing_api_key"
        })
      };
    }
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Extraction failed. Try a smaller PDF or try again in a moment.",
        details: String(error && error.message ? error.message : error).slice(0, 400)
      })
    };
  }
}

module.exports = {
  documentExtractionDemoHandler,
  getHttpMethod,
  parseJsonBody
};
