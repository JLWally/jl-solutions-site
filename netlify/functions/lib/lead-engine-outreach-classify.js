/**
 * Classify outreach rows per lead for list UI (latest draft / approved / sent).
 */

function compactOutreachRow(row) {
  if (!row) return null;
  const o = {
    id: row.id,
    draft_subject: row.draft_subject,
    draft_body: row.draft_body,
    status: row.status,
    created_at: row.created_at,
    approved_by: row.approved_by != null ? row.approved_by : undefined,
    sent_at: row.sent_at != null ? row.sent_at : undefined,
  };
  if (row.send_started_at != null) {
    o.send_started_at = row.send_started_at;
  }
  return o;
}

/**
 * @param {string[]} leadIds
 * @param {object[]} rows outreach rows with lead_id, status, created_at, ...
 * @returns {Map<string, { latest: object|null, latest_draft: object|null, latest_approved: object|null, latest_sent: object|null }>}
 */
function buildOutreachSummaryByLead(leadIds, rows) {
  const byLead = new Map();
  for (const id of leadIds) {
    byLead.set(id, []);
  }
  for (const row of rows || []) {
    if (byLead.has(row.lead_id)) {
      byLead.get(row.lead_id).push(row);
    }
  }
  const out = new Map();
  for (const id of leadIds) {
    const list = byLead.get(id);
    list.sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta;
    });
    const latest = list[0] || null;
    const latest_draft = list.find((r) => r.status === 'draft') || null;
    const latest_approved = list.find((r) => r.status === 'approved') || null;
    const latest_sent = list.find((r) => r.status === 'sent') || null;
    const draft_rows_count = list.filter((r) => r.status === 'draft').length;
    out.set(id, {
      latest: compactOutreachRow(latest),
      latest_draft: compactOutreachRow(latest_draft),
      latest_approved: compactOutreachRow(latest_approved),
      latest_sent: compactOutreachRow(latest_sent),
      draft_rows_count,
      has_multiple_drafts: draft_rows_count > 1,
      total_rows_count: list.length,
    });
  }
  return out;
}

module.exports = {
  buildOutreachSummaryByLead,
  compactOutreachRow,
};
