---
status: partial
phase: 52-notification-center-activity-feed-channel-honesty
source: [52-VERIFICATION.md]
started: 2026-07-19T21:20:00Z
updated: 2026-07-19T21:20:00Z
---

## Current Test

[awaiting human/CI verification]

## Tests

### 1. E2E smoke run (notifications.spec.ts)
expected: All 4 owner-axe tests pass in CI e2e-smoke — bell opens popover, mark-all-read clears badge, /notifications inbox renders, Settings shows no SMS/push toggles
result: PASS — e2e-smoke green on PR #922 head 5ee811067 (2026-07-20)

### 2. Edge function redeploy (lease-signature + sign-lease-token)
expected: After PAT refresh, `bun scripts/deploy-edge-functions.ts lease-signature sign-lease-token` succeeds; post-deploy `notifyFinalizeFailed` is live (finalize-failure paths create a "Lease signing needs attention" notification)
result: [pending — owner-run; current 401 is the stale PAT]

### 3. Deno unit tests (lease-signing-test.ts)
expected: `deno test` over supabase/functions/tests/lease-signing-test.ts passes, incl. the two new notifyFinalizeFailed branch assertions (upload-error, email-failure)
result: [pending — owner-run; deno unavailable in this session]

### 4. Types regen (src/types/supabase.ts)
expected: After PAT refresh, `bun run db:types` regenerates cleanly; diff limited to create_notification/cleanup_old_notifications function entries + notifications_archive table + docuseal_document_url removal
result: [pending — owner-run; non-blocking (no TS code references the new RPC)]

### 5. Prod RLS integration tests (notifications + notifications-retention)
expected: `rls-security` CI job green on the phase PR — owner isolation on notifications, create_notification not authenticated-callable, cleanup fn + archive table service_role-only
result: PASS — rls-security green on PR #922 head 5ee811067 (2026-07-20; one environmental beforeAll-timeout flake in a diff-untouched suite, green on rerun)

## Summary

total: 5
passed: 2
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
