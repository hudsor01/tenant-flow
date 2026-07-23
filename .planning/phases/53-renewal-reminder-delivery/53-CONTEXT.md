# Phase 53: Renewal Reminder Delivery - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the renewal-reminder feature sold on Growth/Max in-house: a `send-lease-reminders` Edge Function drains the existing `lease_reminders` queue on pg_cron, sends one email per due reminder via Resend (exactly once, honoring every suppression layer), creates an in-app notification through the Phase 52 write-path, and removes the dead n8n `wf-lease-reminder` hop — with a gated pre-flip that clears the stale backlog so go-live never storms. Requirements: REMIND-01..05.

Out of this phase: changing the reminder cadence/thresholds (kept as-is); per-owner digest emails (Phase 62); any new preference UI beyond honoring the existing `notification_settings` toggle; e-sign/lease lifecycle changes.
</domain>

<decisions>
## Implementation Decisions

### Reminder cadence
- **D-01:** Keep the existing 30/7/1-day-before-lease-end thresholds and the `queue_lease_reminders()` job unchanged (`reminder_type` CHECK stays `'30_days'/'7_days'/'1_day'`). Delivery is the gap; widening cadence is out of scope for REMIND-01..05.

### Tier behavior
- **D-02:** Renewal-reminder EMAIL is gated to Growth/Max via the existing tier-gate (`GROWTH_AND_MAX_PLANS` / `checkTierEntitlement`, mirror the `lease-signature` edge-fn gate). Starter/trial owners get the free in-app notification (REMIND-05) + the existing expiring-leases dashboard widget, but NO email. Honest tiering: the paid channel is email delivery; expiry awareness is free.

### Email shape & content
- **D-03:** One email per `(lease, reminder_type)` row — no digest. Maps 1:1 to the delivery-state model (each row flips `delivered` independently), keeps idempotency clean, and each email deep-links its specific lease. Low volume at 30/7/1 cadence.
- **D-04:** Primary CTA deep-links to the lease detail page (`/leases/[id]`), where the owner has terms + the existing renew-lease dialog. The reminder drives the action that resolves it.
- **D-05:** A **new reminder-specific email template** (user's explicit choice — NOT the generic transactional layout). Still built on the shared Resend rail (`_shared/resend.ts`, `escapeHtml` on all user values, `getCorsHeaders`/error conventions), but with its own reminder-tailored subject/body/CTA design. Subject should convey the lease + days-remaining; keep owner-facing, plain, no emojis.

### Go-live / backlog (REMIND-04 gate)
- **D-06:** Clean-slate go-live. The pre-flip migration COUNTS the queued `lease_reminders` backlog (logged for the record), marks every existing queued row delivered/expired via the new delivery-state column WITHOUT sending, THEN enables delivery. Only reminders queued AFTER go-live ever send. No catch-up, no storm, no months-old "1 day left" blasts.
- **D-07:** Delivery flip controlled by a `reminders_delivery_enabled` flag in the existing `app_config` table (default OFF). The `send-lease-reminders` edge fn early-returns while the flag is off. The backlog-clear migration sets the flag true as its LAST step, so delivery physically cannot fire before the clear runs. Auditable + reversible (flip off to halt).

### Claude's Discretion
- Exact `delivery_status` column shape/enum values (`pending`/`sent`/`suppressed`/`failed` or similar) and whether `delivered_at` is separate — planner/researcher decide, mirroring the retention/webhook state patterns.
- Resend Idempotency-Key derivation (recommend `lease_id:reminder_type` or the row id).
- Reminder-email copy specifics, subject line wording, days-remaining phrasing.
- pg_cron slot for the drain job (find a free window; avoid the 3 AM cleanup cluster and the `queue_lease_reminders` slot).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone research (decisions already made at milestone level)
- `.planning/research/ARCHITECTURE.md` — renewal-reminder integration: `send-lease-reminders` edge fn draining `lease_reminders` via pg_cron, `emailed_at`/delivery-state column + `FOR UPDATE SKIP LOCKED` exactly-once, mirrors `queue_payment_reminders`
- `.planning/research/PITFALLS.md` — THE load-bearing one: suppression logic (`is_notification_suppressed`, synthetic-CI guard) currently lives INSIDE the `notify_n8n_lease_reminder` trigger being removed — MUST be re-ported or CI synthetic owners get spammed and opt-outs bypassed; `lease_reminders` has no delivery-state column (`sent_at` defaults to now() at insert = queued not sent); double-send/storm/dedup traps
- `.planning/research/STACK.md` — pg_cron + net.http_post + Resend rail confirmed; no scheduler/queue library

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` — REMIND-01..05 exact acceptance wording
- `.planning/ROADMAP.md` — Phase 53 goal + 5 success criteria + the REMIND-04 pre-flip gate note

### Phase 52 (dependency — the notification write-path this phase publishes through)
- `.planning/phases/52-notification-center-activity-feed-channel-honesty/52-SUMMARY.md` files — `create_notification` RPC signature (service_role-only), the 5-type contract, trigger patterns
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (verified in scout)
- `lease_reminders` table (`20260222110100_phase56_schema_foundations.sql:184`) — `reminder_type` CHECK `('30_days','7_days','1_day')`, `UNIQUE(lease_id, reminder_type)` dedup. Needs the delivery-state column added (REMIND-02). Comment still references the n8n webhook — update it.
- `queue_lease_reminders()` (`20260222120000_phase56_pg_cron_jobs.sql:135`) — the filler; keep as-is (D-01). Inserts thresholds independently with ON CONFLICT DO NOTHING.
- `notify_n8n_lease_reminder` trigger — **the thing being removed; its embedded suppression guard (`is_notification_suppressed` + synthetic-CI guard from `20260611141843`) MUST be re-ported into the drainer, not dropped** (PITFALLS.md #1).
- `email_suppressions` table + `is_notification_suppressed` RPC — suppression layer 2.
- `notification_settings` — per-owner opt-out (the "Lease expirations, renewals, and signatures" toggle) — suppression layer 1.
- `app_config` table (`20260504162155`) — already holds n8n secrets; add `reminders_delivery_enabled` flag here (D-07).
- `_shared/resend.ts`, `_shared/escape-html.ts`, `_shared/tier-gate.ts` (`GROWTH_AND_MAX_PLANS`, `checkTierEntitlement`), `_shared/env.ts`, `_shared/cors.ts` — the edge-fn rail.
- `create_notification` RPC (Phase 52, live in prod, service_role-only) — REMIND-05 in-app notification.
- `queue_payment_reminders()` + `payment-reminders` cron — the closest existing drain/schedule analog to mirror.

### Established Patterns
- Migrations applied via Supabase MCP `apply_migration` + `list_migrations` filename reconcile (CLI 401s) — NOT `supabase db push`.
- Edge fns deployed via `bun scripts/deploy-edge-functions.ts` (disk-reading; CLI/PAT 401 workaround) — NOT MCP (non-ASCII fidelity) and NOT `supabase functions deploy`. Owner-run if PAT stale.
- Named SECURITY DEFINER cron fns, `SET search_path = public`, `FOR UPDATE SKIP LOCKED`, batch limits.
- Notification email SENDS were explicitly deferred FROM Phase 52 TO here (Phase 52 D-06 scope note) — this phase builds the suppression-honoring send rail.

### Integration Points
- New: `send-lease-reminders` edge fn; delivery-state column on `lease_reminders`; `app_config.reminders_delivery_enabled` flag; pre-flip backlog-clear migration; new reminder email template; a pg_cron job invoking the drainer (net.http_post to the edge fn, Bearer from app_config — mirror the existing n8n webhook auth).
- Removed: `notify_n8n_lease_reminder` trigger + its DB-webhook wiring (suppression re-ported first).
- Publishes to: `create_notification` (Phase 52) for REMIND-05.

</code_context>

<specifics>
## Specific Ideas

- User explicitly chose a NEW reminder-specific email template over reusing the generic transactional one — the reminder email is a designed surface, not a plain notice. (Still on the shared Resend rail for deliverability/escaping.)
- "Clean slate" go-live is a firm preference: never send a months-old backlog; count-then-expire-then-enable.

</specifics>

<deferred>
## Deferred Ideas

- Widening reminder cadence to give more renewal-decision runway (60/30/7 etc.) — a queue + CHECK + backfill change; revisit if owners ask, not in REMIND-01..05.
- Per-owner digest coalescing of same-day reminders — Phase 62 (Scheduled Owner Digest) owns the digest surface.

</deferred>

---

*Phase: 53-Renewal Reminder Delivery*
*Context gathered: 2026-07-21*
