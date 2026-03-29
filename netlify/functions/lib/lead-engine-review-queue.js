'use strict';

const VALID_REVIEW_QUEUE_MODES = new Set([
  'has_draft',
  'latest_draft',
  'latest_approved',
  'multiple_drafts',
  'needs_review',
]);

function summarizeOutreachRowsForReview(rows) {
  const sorted = [...(rows || [])].sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });
  const latest = sorted[0] || null;
  const latestDraft = sorted.find((r) => r.status === 'draft') || null;
  const draftCount = sorted.filter((r) => r.status === 'draft').length;
  return {
    latestStatus: latest ? latest.status : null,
    latestDraftId: latestDraft ? latestDraft.id : null,
    hasDraft: draftCount > 0,
    draftCount,
    multipleDrafts: draftCount > 1,
  };
}

function doesLeadMatchReviewQueue(summary, mode) {
  if (!mode) return true;
  if (!summary) return false;
  if (mode === 'has_draft') return summary.hasDraft;
  if (mode === 'latest_draft' || mode === 'needs_review') return summary.latestStatus === 'draft';
  if (mode === 'latest_approved') return summary.latestStatus === 'approved';
  if (mode === 'multiple_drafts') return summary.multipleDrafts;
  return false;
}

module.exports = {
  VALID_REVIEW_QUEUE_MODES,
  summarizeOutreachRowsForReview,
  doesLeadMatchReviewQueue,
};

