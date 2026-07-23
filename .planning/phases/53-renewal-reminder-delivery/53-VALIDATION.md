---
phase: 53
slug: renewal-reminder-delivery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-21
---

# Phase 53 — Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (unit) + Deno (edge-fn tests, `supabase/functions/tests/`) + PostgREST dual-client RLS integration |
| **Quick run** | `bun run test:unit -- <file>` (never `-- --run <file>`) |
| **Full suite** | `bun run validate:quick` |
| **Edge-fn** | `deno test` (owner-run; deno unavailable in session) |
| **Prod verify** | Supabase MCP `execute_sql` introspection after each `apply_migration` + `list_migrations` reconcile |

## Sampling Rate
- After every task commit: affected unit file(s)
- After every wave: `bun run validate:quick`
- Before verify: full suite green + MCP introspection of migrations/flag/trigger-removal

## Per-Requirement Verification Map

| REQ | Secure/Correct behavior | Test type | Command / check |
|-----|-------------------------|-----------|-----------------|
| REMIND-01 | `send-lease-reminders` edge fn drains `lease_reminders` + sends via Resend; n8n trigger removed | Deno (send branch) + MCP | `to_regprocedure('notify_n8n_lease_reminder')` IS NULL; trigger absent; fn deployed |
| REMIND-02 | exactly-once: delivery-state column, `FOR UPDATE SKIP LOCKED`, Resend Idempotency-Key; second drain of a sent row no-ops | Deno + RLS integration | delivery_status transitions pending→sent once; re-invoke leaves it sent, no 2nd send |
| REMIND-03 | ordered suppression: tier gate, re-ported CI guard, email_suppressions, notification_settings.email&&.leases | Deno (skip branches) + unit | each layer independently short-circuits email → delivery_status='suppressed' |
| REMIND-04 | flag default off → fn early-returns; backlog counted + expired without send; flag flipped true LAST | Deno (flag-off early return) + MCP | `app_config.reminders_delivery_enabled`=false pre-flip; count logged; =true post-clear |
| REMIND-05 | every due reminder creates in-app notification via create_notification (ALL tiers, regardless of email suppression) | RLS integration + MCP | notification row exists for suppressed/CI/Starter owner; email absent when suppressed |

## Prod Verification Evidence (pre-planning, 2026-07-21 MCP)
- `lease_reminders` backlog = 0 (storm latent not current); columns lack delivery-state
- single trigger `trg_lease_reminders_notify_n8n`; suppress fn checks only the CI-email CSV
- notification type CHECK = 9 values (needs `lease_renewal_reminder` added); notification_settings has email + leases

## Scope note (plan-checker warning, accepted)
`delivery_status='failed'` rows have no automatic reclaim-to-pending retry path — this is deliberate for v10. REMIND-02 is exactly-once, not retry-guaranteed; a transient Resend outage strands affected reminders until a manual re-queue. A retry job is a future enhancement (surface if failed sends are observed).
