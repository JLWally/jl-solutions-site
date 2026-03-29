'use strict';

/**
 * Conservative normalization for suppression matching in Slice J:
 * trim + lowercase only (no provider-specific dot/plus handling).
 */
function normalizeEmailForSuppression(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  return s || null;
}

module.exports = {
  normalizeEmailForSuppression,
};

