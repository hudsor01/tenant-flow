---
phase: 42
slug: cancellation-ux-end-to-end-audit-fix
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 42 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0 (unit + integration) + Playwright 1.58 (E2E) + Deno test (Edge Functions) |
| **Config file** | `vitest.config.ts`, `playwright.config.ts`, `supabase/functions/deno.json` |
| **Quick run command** | `pnpm test:unit -- --run <file>` |
| **Full suite command** | `pnpm typecheck && pnpm lint && pnpm test:unit` |
| **Estimated runtime** | ~60-90 seconds |

---

## Sampling Rate

- **After every task commit:** Run targeted `pnpm test:unit -- --run <file>`
- **After every plan wave:** Run `pnpm test:unit` (full unit suite) + `pnpm typecheck`
- **Before `/gsd-verify-work`:** Full suite + E2E (`pnpm test:e2e tests/e2e/tests/cancellation.spec.ts`) must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

> Filled in during planning. Planner maps each task to a test + threat ref + requirement.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 42-01-XX | 01 | 1 | CANCEL-01 | T-42-01 | Edge Function resolves subscription server-side (prevents IDOR) | unit | `deno test supabase/functions/tests/cancel-subscription.test.ts` | ❌ W0 | ⬜ pending |
| 42-01-XX | 01 | 1 | CANCEL-02 | — | Status hook reads `stripe.subscriptions.status` | unit | `pnpm test:unit -- --run src/hooks/api/use-billing.test.ts` | ❌ W0 | ⬜ pending |
| 42-02-XX | 02 | 2 | CANCEL-01 | — | One-click cancel AlertDialog happy path | e2e | `pnpm test:e2e tests/e2e/tests/cancellation.spec.ts` | ❌ W0 | ⬜ pending |
| 42-02-XX | 02 | 2 | CANCEL-03 | — | Canceled state renders inline GDPR actions | unit | `pnpm test:unit -- --run src/components/settings/sections/subscription-cancel-section.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/functions/tests/cancel-subscription.test.ts` — Deno integration test for new Edge Function
- [ ] `src/hooks/api/use-billing.test.ts` — unit test for `useSubscriptionStatus` / new cancel + reactivate mutations
- [ ] `src/components/settings/sections/subscription-cancel-section.test.tsx` — component test for 3-state UI rendering
- [ ] `tests/e2e/tests/cancellation.spec.ts` — Playwright happy-path E2E

*Existing Vitest + Playwright + Deno test infrastructure covers all phase requirements — no new framework install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual fidelity of AlertDialog (shadcn destructive variant, end-date copy, spacing) | CANCEL-01 | Snapshot/visual regression not configured | Load settings page, click Cancel, verify AlertDialog matches UI-SPEC mock |
| 30-day GDPR grace period messaging copy on canceled-state UI | CANCEL-03 | Copy review, not behavior | Manually trigger canceled state in dev, read messaging |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
