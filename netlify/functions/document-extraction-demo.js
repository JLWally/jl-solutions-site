/**
 * Public marketing demo: one document → structured fields via OpenAI Responses (input_file).
 * Same logic is also reachable via /.netlify/functions/chatbot (see jlDocumentExtractionDemo).
 */
const {
  documentExtractionDemoHandler
} = require("./lib/document-extraction-demo-run");

exports.handler = documentExtractionDemoHandler;
