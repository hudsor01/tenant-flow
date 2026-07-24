---
phase: 54
slug: e-sign-storage-metering
status: draft
nyquist_compliant: false
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
| (planner fills) | — | — | METER-01..04 | — | — | unit / rls / edge | — | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky. The planner MUST populate one row per task and map every METER-0x ID.*

---

## Critical validation targets (from RESEARCH §Validation Architecture — the planner MUST cover each)

1. **METER-01 race safety** — concurrent `send` at count=24 must NOT both succeed (advisory-lock proof). Simulate two concurrent count-and-insert calls; exactly one gets the 25th slot, the other is rejected. Max tier bypasses the count (unlimited). Starter never reaches metering (tier-gate first).
2. **METER-01 calendar-month reset** — a `send` on the last day of month N and the 1st of month N+1 fall in different windows; the cap frees on the 1st. Boundary test around `date_trunc('month', now())`.
3. **METER-01 resend exemption** — `resend` never inserts an `esign_events` row / never decrements the cap (D-02).
4. **METER-03 storage SUM correctness** — the RPC sums `(metadata->>'size')::bigint` only over owner-attributable buckets (avatars, property-images, inspection-photos, maintenance-photos, tenant-documents) and EXCLUDES system buckets (`blog-covers`, `bulk-imports`, unused `lease-documents`); attribution resolves each object to the correct owner.
5. **METER-04 upload guard** — BEFORE-INSERT trigger on `storage.objects`: rejects a non-grandfathered over-quota owner's upload with the structured `plan_limit_exceeded` (client renders upgrade prompt), while ALLOWING (a) grandfathered owners, (b) Max/unlimited tier, (c) service-role/signed-lease inserts (`auth.uid() IS NULL`), (d) everyone while the `storage_enforcement_enabled` flag is OFF. Reads/downloads/deletes never blocked.
6. **METER-04 grandfather snapshot** — the pre-flip report enumerates over-quota owners and stamps `users.storage_grandfathered_at` BEFORE the flag flips; a grandfathered owner keeps uploading, a post-launch crosser is blocked.
7. **METER-02 usage read** — the Settings usage RPC returns current-month e-sign count vs 25 and storage bytes vs quota; near-cap prompt fires at 80%; formatBytes renders GB correctly (not capped at MB).

---

## Wave 0 Requirements

- [ ] Unit test stubs for the e-sign metering RPC wrapper + storage-usage mapper (typed boundary, no `as unknown as`).
- [ ] RLS integration cases (`tests/integration/rls/`) for: `esign_events` owner-SELECT isolation + service_role-only INSERT; `storage.objects` upload guard behavior.
- [ ] Edge-fn (Deno) case for the `lease-signature` `send` metering hook (26th-send 402 path) — requires `supabase functions serve`.

*Existing infrastructure (Vitest/Deno/RLS/Playwright) covers the frameworks; only new test files are needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Grandfather go-flip gate | METER-04 | Prod-only flag flip mirroring Phase 53 go-live; irreversible-by-design | Run the over-quota population report via MCP; stamp grandfather; flip `storage_enforcement_enabled` LAST; verify a post-launch crosser is blocked and a grandfathered owner is not |
| Real over-quota upload block UX | METER-04 | Needs a real Storage upload from the client to see the upgrade toast | Upload past quota as a non-grandfathered Growth owner; confirm the `plan_limit_exceeded` → upgrade CTA (not a plain error) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
