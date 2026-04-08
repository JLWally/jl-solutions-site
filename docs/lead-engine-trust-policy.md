# Lead engine trust policy (minimal-supervision gate)

This policy defines when the system is considered healthy enough to run unattended for longer intervals.

## Guardrail states

- `healthy`: quality and scout health are within expected thresholds.
- `warning`: quality or scout yield is drifting; keep human review cadence high.
- `throttled`: reduce scout budget/rate to limit low-quality discovery.
- `paused`: stop scout discovery until the issue is corrected or operator overrides.

## Automatic triggers (rolling window)

Configured in `netlify/functions/lib/automation-policy-v1.json` under `trust_policy_v1`.

- **Quality mix by source/query**
  - `bad_lead + duplicate_junk` rate drives warning/throttle/pause.
  - `wrong_vertical + wrong_offer` can trigger throttle.
  - `not_enough_data` can trigger warning.
- **Scout health persistence**
  - repeated zero-yield scout runs can escalate to warning/throttle/pause.
- **Learning loop warning**
  - warns when drafts are not leading to positive outcomes (`replied`, `interested`, `meeting_booked`, `converted_opportunity`).

## Operator override

- Endpoint: `lead-engine-guardrail-ops`
- Scope:
  - `source` (e.g. `scout_google_places`)
  - `query` (strategy `query_id`)
- Forced status:
  - `healthy`, `warning`, `throttled`, `paused`
- Optional expiration to avoid permanent accidental override.

## Minimal-supervision readiness checklist

- At least one full rolling window with:
  - low paused/throttled time,
  - stable good-lead rate,
  - controlled duplicate/junk rate,
  - positive outcomes present (not only drafts).
- Query and source scorecards reviewed and top offenders corrected.
- Quota/cost controls and split schedules active.
- Manual override path tested and documented for on-call operators.
