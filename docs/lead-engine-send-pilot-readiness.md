# Send pilot readiness checklist (future)

**Status:** Auto-send is **not** enabled (`allow_auto_send: false` in `automation-policy-v1.json`). Use this list before any pilot that touches unsupervised or bulk send.

## Evidence thresholds

- [ ] **Native delivery evidence:** Resend webhooks wired; `email_delivered` / `bounced` / `spam_complaint` / `email.suppressed` observed in **validation mode** for a full rolling window.
- [ ] **Attribution:** Sends include `lead_engine_lead_id` tags; webhook rows resolve to leads without chronic `no_lead_match` skips.
- [ ] **Inbound:** `email.received` or n8n-forwarded **`replied`** events tested against real replies.
- [ ] **CRM:** `crm_stage_changed` or HubSpot pipeline JSON reflects real stage movement for a sample cohort.
- [ ] **Meetings:** `meeting_booked` from Calendly/scheduling matches calendar reality.

## Volume thresholds

- [ ] Minimum **N** sends in pilot bucket (define N per operator policy) before evaluating rates.
- [ ] **Guardrail calibration:** `minimum_feedback_events_for_enforcement` and `minimum_zero_yield_runs_for_escalation` reviewed for send volume (not only scout).
- [ ] **Positive outcome rate by query/source** in validation mode stable enough to interpret (avoid single-digit denominators).

## Bounce / complaint tolerances

- [ ] Document **hard bounce rate** ceiling and **spam complaint rate** ceiling for pilot halt.
- [ ] Procedure when **`spam_complaint`** exceeds tolerance (global suppression already exists; confirm ops steps).
- [ ] **List hygiene:** duplicate sends and stale addresses reviewed before widening cohort.

## Kill switch checks

- [ ] **`allow_auto_send`** remains false until explicit policy change + code review.
- [ ] **Automation tick** can be disabled or scoped without leaving half-queued sends inconsistent with DB.
- [ ] **Resend** domain and API key rotation path documented.

## Override / rollback

- [ ] **Guardrail ops** (`lead-engine-guardrail-ops`) tested: force `healthy` / `paused` with expiry.
- [ ] **Scout query ops** tested: pause offending `query_id`.
- [ ] **Rollback plan:** revert deploy or flip env flags; confirm no orphaned `send_started_at` locks (reconcile path documented).

## Compliance review

- [ ] **CAN-SPAM:** `LEAD_ENGINE_PHYSICAL_ADDRESS`, working unsubscribe link, opt-out honored in DB and global suppression.
- [ ] **Content:** human-reviewed templates for pilot segment.
- [ ] **Data:** CRM and email vendor DPAs / subprocessors acknowledged.

## Sign-off

- [ ] Engineering owner  
- [ ] Operations / deliverability owner  
- [ ] Legal / compliance (as required)

After sign-off, enable only **limited send pilot** per [trust ladder](lead-engine-trust-ladder.md) level 4 — still not “broader eligibility” until sustained healthy metrics.
