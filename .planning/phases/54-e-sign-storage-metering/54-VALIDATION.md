---
phase: 54
slug: e-sign-storage-metering
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-23
---

# Phase 54 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Full test-design rationale in `54-RESEARCH.md` §"Validation Architecture".

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + jsdom (unit); Deno (edge-fn); RLS integration (dual-client vs prod); Playwright (e2e) |
| **Config file** | `vitest.config.ts` (unit); `supabase/functions/tests/` (Deno, needs `supabase functions serve`); `tests/integration/rls/` |
| **Quick run command** | `bun run test:unit -- --run <file>` |
| **Full suite command** | `bun run validate:quick` (typecheck + lint + unit) |
| **Estimated runtime** | unit ~30-60s; validate:quick ~2-3 min |

---

## Sampling Rate

- **After every task commit:** `bun run typecheck` + the task's unit file (`bun run test:unit -- --run <file>`)
- **After every plan wave:** `bun run validate:quick`
- **Before `/gsd:verify-work`:** `bun run validate:quick` green; RLS integration green for any new policy/RPC
- **Max feedback latency:** ~60s (unit); DB/RLS behaviors verified via MCP `execute_sql` against prod-shaped state

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-T1 | 54-01 | 1 | METER-01 | T-54-01/02/03 | cap/race/month/isolation + service_role-only meter RPC | rls (creates) | `bun run test:integration -- esign-metering.rls.test.ts` | ❌ W0 (this task creates it) | ⬜ pending |
| 01-T2 | 54-01 | 1 | METER-01 | T-54-02 | applied + typed; meter RPC not authenticated-callable | rls + typecheck | `bun run typecheck && bun run test:integration -- esign-metering.rls.test.ts` | ➡ 01-T1 | ⬜ pending |
| 02-T1 | 54-02 | 2 | METER-01 | T-54-05/06 | send meters up-front → 402 over cap; resend never meters | edge (Deno) | `deno test --allow-all --no-check --import-map=supabase/functions/deno.json supabase/functions/tests/lease-signing-test.ts` | ❌ W0 (extends existing) | ⬜ pending |
| 02-T2 | 54-02 | 2 | METER-01 | T-54-08 | wrapper preserves upgrade_url → Upgrade CTA; esign usage invalidation deferred to 54-05 (usageQueries not yet defined in wave 2) | unit | `bun run typecheck && bun run lint` + wrapper unit test | ➡ 02-T1 | ⬜ pending |
| 02-T3 | 54-02 | 2 | METER-01 | T-54-05 | deployed body contains the meter hook | manual/MCP | MCP `get_edge_function lease-signature` | n/a (deploy) | ⬜ pending |
| 03-T1 | 54-03 | 2 | METER-03 | T-54-09/10/11 | SUM correctness + exclusions + null-size + isolation | rls (creates) | `bun run test:integration -- storage-metering.rls.test.ts` | ❌ W0 (this task creates it) | ⬜ pending |
| 03-T2 | 54-03 | 2 | METER-03 | T-54-09 | applied + typed; raw fns service_role-only, summary authenticated | rls + typecheck | `bun run typecheck && bun run test:integration -- storage-metering.rls.test.ts` | ➡ 03-T1 | ⬜ pending |
| 04-T1 | 54-04 | 3 | METER-04 | T-54-13/14/16 | enforce/grandfather/max/service_role/system/flag-off matrix; reads unaffected; migration does NOT recreate guard_user_self_update() | rls (extends) | `bun run test:integration -- storage-metering.rls.test.ts` | ➡ 03-T1 (extends) | ⬜ pending |
| 04-T2 | 54-04 | 3 | METER-04 | T-54-15/17 | trigger live, flag still OFF (no-op); live guard_user_self_update() allowlist NOT reverted (storage_grandfathered_at absent from allowed_cols → protected by omission) | rls + MCP | `bun run typecheck && bun run test:integration -- storage-metering.rls.test.ts` | ➡ 04-T1 | ⬜ pending |
| 05-T1 | 54-05 | 3 | METER-02, METER-03 | T-54-18 | typed usage mappers (Max/unlimited); formatBytes GB | unit (creates) | `bun run test:unit -- --run src/hooks/api/query-keys/__tests__/usage-keys.test.ts src/lib/__tests__/format-bytes.test.ts` | ❌ W0 (this task creates it) | ⬜ pending |
| 05-T2 | 54-05 | 3 | METER-02, METER-03 | T-54-18/19 | 80% near-cap prompt; Max=Unlimited; GB render; send-success invalidates usageQueries.esign() (deferred from 54-02) | unit/component (creates) | `bun run test:unit -- --run src/components/settings/__tests__/usage-section.test.tsx` | ❌ W0 (this task creates it) | ⬜ pending |
| 07-T1 | 54-07 | 4 | METER-04 | T-54-24/26 | storage plan-limit detector (message-prefix) + non-destructive pre-check math + handleMutationError CTA | unit (creates) | `bun run test:unit -- --run src/lib/__tests__/storage-plan-limit.test.ts src/lib/__tests__/mutation-error-handler.test.ts` | ❌ W0 (creates storage-plan-limit.ts + extends handler test) | ⬜ pending |
| 07-T2 | 54-07 | 4 | METER-04 | T-54-24/25 | document-vault upload: detector re-throw + proactive pre-check → Upgrade CTA + post-upload usageQueries.storage() invalidation | typecheck + lint | `bun run typecheck && bun run lint` | ➡ 07-T1 | ⬜ pending |
| 07-T3 | 54-07 | 4 | METER-04 | T-54-24/25 | image + avatar upload: CTA on rejection + non-destructive pre-check + post-upload usageQueries.storage() invalidation | unit (extends) | `bun run test:unit -- --run src/hooks/__tests__/use-supabase-upload.test.ts src/hooks/api/__tests__/use-profile-avatar-mutations.test.tsx` | ➡ 07-T1 | ⬜ pending |
| 06-T1 | 54-06 | 5 | METER-04 | T-54-20/22 | count→stamp→flip-LAST; post-flip grandfather vs crosser | rls (extends) | `bun run test:integration -- storage-metering.rls.test.ts` | ➡ 03-T1 (extends) | ⬜ pending |
| 06-T2 | 54-06 | 5 | METER-04 | T-54-23 | over-quota report reviewed before the irreversible flip | manual (blocking) | MCP `execute_sql` over-quota report + human-verify | n/a (checkpoint) | ⬜ pending |
| 06-T3 | 54-06 | 5 | METER-04 | T-54-20/21 | flag ON; grandfathered stamped (no Max); crosser blocked | rls + MCP | `bun run typecheck && bun run test:integration -- storage-metering.rls.test.ts` | ➡ 06-T1 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. The planner MUST populate one row per task and map every METER-0x ID.*

---

## Critical validation targets (from RESEARCH §Validation Architecture — the planner MUST cover each)

1. **METER-01 race safety** — concurrent `send` at count=24 must NOT both succeed (advisory-lock proof). Simulate two concurrent count-and-insert calls; exactly one gets the 25th slot, the other is rejected. Max tier bypasses the count (unlimited). Starter never reaches metering (tier-gate first).
2. **METER-01 calendar-month reset** — a `send` on the last day of month N and the 1st of month N+1 fall in different windows; the cap frees on the 1st. Boundary test around `date_trunc('month', now())`.
3. **METER-01 resend exemption** — `resend` never inserts an `esign_events` row / never decrements the cap (D-02).
4. **METER-03 storage SUM correctness** — the RPC sums `(metadata->>'size')::bigint` only over owner-attributable buckets (avatars, property-images, inspection-photos, maintenance-photos, tenant-documents) and EXCLUDES system buckets (`blog-covers`, `bulk-imports`, unused `lease-documents`); attribution resolves each object to the correct owner.
5. **METER-04 upload guard** — BEFORE-INSERT trigger on `storage.objects`: rejects a non-grandfathered over-quota owner's upload with the structured `plan_limit_exceeded` (the trigger message BEGINS with `plan_limit_exceeded:` — the Plan 07 client detector renders the Upgrade prompt from that prefix, since the Storage API strips hint/detail), while ALLOWING (a) grandfathered owners, (b) Max/unlimited tier, (c) service-role/signed-lease inserts (`auth.uid() IS NULL`), (d) everyone while the `storage_enforcement_enabled` flag is OFF. Reads/downloads/deletes never blocked. The new `storage_grandfathered_at` column is protected against client self-grandfathering by the LIVE fail-closed allowlist in `guard_user_self_update()` (`20260507194555`) — the column is absent from `allowed_cols`, so a PostgREST self-update is rejected by omission; Plan 04 CONFIRMS this non-mutatingly (MCP `pg_get_functiondef` not-ilike check) and does NOT recreate the guard (recreating it from the superseded `20260507190024` blocklist would revert the live P0 fix).
6. **METER-04 grandfather snapshot** — the pre-flip report enumerates over-quota owners and stamps `users.storage_grandfathered_at` BEFORE the flag flips; a grandfathered owner keeps uploading, a post-launch crosser is blocked.
7. **METER-02 usage read** — the Settings usage RPC returns current-month e-sign count vs 25 and storage bytes vs quota; near-cap prompt fires at 80%; formatBytes renders GB correctly (not capped at MB). A successful send invalidates `usageQueries.esign()` and a successful upload invalidates `usageQueries.storage()` so the widgets refresh immediately (mutation-invalidation convention).
8. **METER-04 storage upload CTA (client, Plan 07)** — a StorageApiError whose message begins with `plan_limit_exceeded:` maps to the 'Plan limit reached / Upgrade' toast (`?source=storage_quota_gate`) via `handleMutationError`; the proactive pre-check (`usageQueries.storage`) is NON-destructive (never client-side hard-blocks a grandfathered/Max/flag-off owner); all three real upload sites (documents, property/inspection images, avatar) are wired and invalidate `usageQueries.storage()` on a successful upload. Unit-covered; the real end-to-end Storage upload toast is manually verified (below).

---

## Wave 0 Requirements

- [ ] Unit test stubs for the e-sign metering RPC wrapper + storage-usage mapper (typed boundary, no `as unknown as`).
- [ ] RLS integration cases (`tests/integration/rls/`) for: `esign_events` owner-SELECT isolation + service_role-only INSERT; `storage.objects` upload guard behavior.
- [ ] Edge-fn (Deno) case for the `lease-signature` `send` metering hook (26th-send 402 path) — requires `supabase functions serve`.
- [ ] Unit tests for the storage plan-limit client detector + pre-check helper (`src/lib/__tests__/storage-plan-limit.test.ts`, created in 07-T1) and the `handleMutationError` storage-prefix extension (`src/lib/__tests__/mutation-error-handler.test.ts`, extended in 07-T1); hook/mutation CTA + post-upload invalidation coverage in `use-supabase-upload.test.ts` + `use-profile-avatar-mutations.test.tsx` (07-T3).

*Existing infrastructure (Vitest/Deno/RLS/Playwright) covers the frameworks; only new test files are needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Grandfather go-flip gate | METER-04 | Prod-only flag flip mirroring Phase 53 go-live; irreversible-by-design | Run the over-quota population report via MCP; stamp grandfather; flip `storage_enforcement_enabled` LAST; verify a post-launch crosser is blocked and a grandfathered owner is not |
| Real over-quota upload block UX (Plan 07 client path) | METER-04 | Needs a real Storage upload from the client to see the Upgrade toast end-to-end (unit-covered in 07-T1/T3; the live StorageApiError.message shape is the last mile) | Upload past quota as a non-grandfathered Growth owner; confirm the StorageApiError message prefix `plan_limit_exceeded:` → 'Plan limit reached' Upgrade CTA (`?source=storage_quota_gate`), NOT the raw 'We couldn't save that file' string; confirm a grandfathered owner is NOT client-side blocked |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (each test file is created by the task that first needs it: esign-metering.rls.test.ts in 01-T1, storage-metering.rls.test.ts in 03-T1, usage-keys/format-bytes/usage-section tests in 05-T1/T2, Deno branch in 02-T1, storage-plan-limit.test.ts + mutation-error-handler.test.ts extension in 07-T1, upload-site hook tests in 07-T3)
- [x] No watch-mode flags
- [x] Feedback latency < 60s (unit ~30-60s; RLS/DB via MCP execute_sql)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** planner-attested (per-task map populated; every METER-0x mapped; Wave-0 tests created in-plan)
