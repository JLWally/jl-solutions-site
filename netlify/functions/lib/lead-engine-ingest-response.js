/**
 * Pure helpers for consistent ingest JSON bodies (testable).
 */
function ingestSuccessBody(lead, flags = {}) {
  const body = { lead };
  if (flags.idempotentReplay) body.idempotentReplay = true;
  if (flags.duplicateReplay) body.duplicateReplay = true;
  return body;
}

module.exports = { ingestSuccessBody };
