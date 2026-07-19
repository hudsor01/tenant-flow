---
phase: 52
slug: notification-center-activity-feed-channel-honesty
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-07-19
---

# Phase 52 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (unit, jsdom) + Playwright (E2E) + PostgREST dual-client RLS integration |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` (existing) |
| **Quick run command** | `bun run test:unit -- --run <changed test file>` |
| **Full suite command** | `bun run validate:quick` (typecheck + lint + unit) |
| **Estimated runtime** | ~30s unit suite; ~3s single file |
| **Prod schema verification** | Supabase MCP `execute_sql` introspection (RLS policies, RPC existence) after each `apply_migration` + `list_migrations` filename reconcile |

---

## Sampling Rate

- **After every task commit:** Run the affected unit test file(s) via `bun run test:unit -- --run <file>`
- **After every plan wave:** Run `bun run validate:quick`
- **Before `/gsd:verify-work`:** Full suite green + MCP introspection of new DB objects
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner) | | | NOTIF-01 | RLS-iso | `create_notification` not executable by `authenticated`; notifications owner-isolated (A sees only A's) | RLS integration | `bun run test:integration` (notifications spec) | pending | pending |
| (filled by planner) | | | NOTIF-02 | — | Bell renders unread count from count query; 60s refetchInterval configured | unit | `bun run test:unit -- --run src/components/shell/__tests__/notification-bell.test.tsx` | pending | pending |
| (filled by planner) | | | NOTIF-03 | — | mark-read/mark-all-read mutations update `is_read`+`read_at`, invalidate notification keys | unit | vitest hook test | pending | pending |
| (filled by planner) | | | NOTIF-04 | — | e-sign + maintenance events insert notifications (trigger/edge-fn paths) | RLS integration + MCP introspection | trigger existence + insert probe | pending | pending |
| (filled by planner) | | | NOTIF-05 | retention | cleanup function archives read>90d unread>180d, batch-limited | MCP introspection + migration test | `cron.schedule` row present; archive table exists | pending | pending |
| (filled by planner) | | | ACT-01 | — | dashboard activity card renders from `get_dashboard_data_v2` activity slice | unit | vitest component test | pending | pending |
| (filled by planner) | | | ACT-02 | — | activity card copy/labels distinct from notification center (design pass documented) | unit (render assertions) | vitest | pending | pending |
| (filled by planner) | | | HONEST-01/02 | honesty | `notification-settings.tsx` contains no SMS or push Switch; source-scan regression pin | unit (source scan) | vitest source assertion | pending | pending |
| (filled by planner) | | | CLEAN-01/02 | drift | `payout_events` + `docuseal_document_url` absent in prod (verified 2026-07-19); repo reconciled with idempotent defensive drops | MCP introspection | `to_regclass('public.payout_events') IS NULL` | pending | pending |

---

## Prod Verification Evidence (pre-planning, 2026-07-19 via MCP)

- `notifications` RLS in prod: ONLY `notifications_select` (SELECT) + `notifications_update` (UPDATE) — repo migrations claim more; plan must reconcile live
- `payout_events`: ABSENT in prod; `leases.docuseal_document_url`: ABSENT in prod; `get_autopay_health`/`get_payout_timing_stats`: ABSENT (launch-readiness migration `20260413120000` never applied)
- `create_notification`: does not exist (to create); `get_user_dashboard_activities` + `log_lease_signature_activity`: present; `activity` table present
- `notification_settings` columns include `sms`, `push`, `in_app`, `email` + per-category booleans — UI toggles removed, columns retained
