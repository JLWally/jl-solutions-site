# Lead engine automation trust ladder

Defines **progressive automation levels** and the **evidence** required to move up. This is policy and product intent: higher levels are not enabled until evidence and controls are in place.

**Current posture:** `configured_level` in `netlify/functions/lib/automation-policy-v1.json` under `trust_ladder_v1` (today: **draft + demo auto**). **`allow_auto_send` remains `false`** until a deliberate pilot with provider webhooks, suppression, and legal/ops sign-off.

## Levels (ordered)

### 1 — Manual review only

- **Automation:** ingest/scout may run; no drafts or demos without explicit operator action.
- **Evidence to advance:** stable operator feedback labels on a full rolling window; guardrails mostly `healthy`; validation report shows controlled duplicate/zero-yield behavior.

### 2 — Draft only (auto)

- **Automation:** scoring + draft generation for eligible leads; **no demo auto**, **no send**.
- **Evidence to advance:** acceptable `drafts_without_positive_outcome` warning rate; native outcomes (deliveries, unsubscribes) logged where available; CRM touch events reconciled when HubSpot is in use.

### 3 — Draft + demo auto

- **Automation:** demos may be generated/configured automatically per existing demo pipeline rules; **no auto-send**.
- **Evidence to advance:** same as level 2 plus demo quality checks and low pipeline failure rates (operator dashboard).

### 4 — Limited send pilot (still not enabled in policy)

- **Automation:** tightly capped **auto-send** to a small allowlist (domain/recipient class), with mandatory unsubscribe and suppression checks.
- **Evidence required before enabling in code:**
  - Verified **bounce + complaint** ingestion (provider webhooks → `lead-engine-pipeline-native-signal` or equivalent).
  - **Reply** signal path (inbound routing or manual webhook) with attribution to `lead_id` / `outreach_id`.
  - **Rate and volume caps** + kill switch + audit trail reviewed.
  - Legal/compliance (CAN-SPAM, physical address, opt-out) verified in production env.

### 5 — Broader send eligibility

- **Automation:** expanded auto-send cohorts; still subject to trust policy throttles and guardrail pauses.
- **Evidence:** sustained healthy scorecards across sources/queries, positive downstream outcomes (replies, meetings) at acceptable cost, and operational runbooks for recovery playbooks tested on real incidents.

## What blocks a safe auto-send pilot today

1. **`allow_auto_send` is explicitly `false`** in `automation-policy-v1.json` (no code path should honor auto-send while this is false).
2. **No first-class Resend (or ESP) event webhooks** wired in-repo for bounces/complaints at scale—only heuristics on send API failures and operator reconciliation.
3. **Reply capture** depends on external mailboxes or future inbound parsing; the **`lead-engine-pipeline-native-signal`** endpoint is ready but requires a secret and integration work.
4. **Trust calibration** intentionally avoids overreacting on sparse feedback; auto-send needs **higher volume evidence** and **provider-grade signal quality** than the current learning loop assumes.
5. **Human approval** for copy and recipient class is still the intended control until level 4 evidence is met.

## Related configuration

- Guardrail thresholds: `trust_policy_v1` and `calibration_v1` in `automation-policy-v1.json`.
- Native outcomes: `lead_outcome` events with `capture_kind: native_pipeline` (see `lead-engine-native-outcome-log.js`).
- Recovery hints: `recovery_playbook` on guardrail scorecards (`lead-engine-feedback-guardrails.js`).
- Wiring downstream systems: [Pipeline signals](lead-engine-pipeline-signals.md) · [Send pilot readiness](lead-engine-send-pilot-readiness.md).
