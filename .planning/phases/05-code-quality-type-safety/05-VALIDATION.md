---
phase: 5
slug: code-quality-type-safety
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-05
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (3 projects: unit, component, integration) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test:unit -- --run` |
| **Full suite command** | `pnpm validate:quick` (types + lint + unit tests) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck && pnpm lint`
- **After every plan wave:** Run `pnpm validate:quick`
- **Before `/gsd:verify-work`:** Full suite must be green + `pnpm build` + zero `as unknown as` in `src/hooks/api/` + zero `eslint-disable` suppressions
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-T1 | 01 | 1 | CODE-01, CODE-06 | typecheck+grep | `pnpm typecheck && ! grep -r "as 'properties'" src/hooks/api/` | ✅ | ⬜ pending |
| 05-01-T2 | 01 | 1 | CODE-06 | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-reports.test.tsx src/hooks/api/__tests__/use-financials.test.tsx` | ❌ W0 | ⬜ pending |
| 05-01-T3 | 01 | 1 | CODE-07, CODE-19, CODE-20, CODE-21 | typecheck+grep | `pnpm typecheck && ! grep -r "SseProvider" src/` | ✅ | ⬜ pending |
| 05-02-T1 | 02 | 1 | CODE-02, CODE-05, CODE-08, CODE-09, CODE-10, CODE-18 | typecheck+grep | `pnpm typecheck && ! grep -r "as unknown as" src/hooks/api/` | ✅ | ⬜ pending |
| 05-02-T2 | 02 | 1 | CODE-22 | grep | `! grep -n "console\.log" supabase/functions/stripe-webhooks/` | ✅ | ⬜ pending |
| 05-03-T1 | 03 | 1 | CODE-03, CODE-04, CODE-16 | typecheck+lint | `pnpm typecheck && pnpm lint && ! grep -r "eslint-disable.*exhaustive-deps" src/` | ✅ | ⬜ pending |
| 05-03-T2 | 03 | 1 | CODE-17 | typecheck+lint | `pnpm typecheck && pnpm lint` | ✅ | ⬜ pending |
| 05-04-T1 | 04 | 2 | CODE-11 | typecheck+size | `pnpm typecheck && find src/hooks/api -maxdepth 1 -name "use-tenant-*.ts" -exec wc -l {} +` | ✅ | ⬜ pending |
| 05-04-T2 | 04 | 2 | CODE-11 | typecheck+size | `pnpm typecheck && find src/hooks/api -maxdepth 1 -name "*.ts" -exec wc -l {} + \| awk '$1>300 && !/total/'` | ✅ | ⬜ pending |
| 05-05-T1 | 05 | 2 | CODE-13 | typecheck+size | `wc -l supabase/functions/stripe-webhooks/index.ts` | ✅ | ⬜ pending |
| 05-05-T2 | 05 | 2 | CODE-14 | typecheck+size | `pnpm typecheck && wc -l src/app/(owner)/dashboard/page.tsx src/app/(owner)/properties/page.tsx` | ✅ | ⬜ pending |
| 05-06-T1 | 06 | 2 | CODE-12, CODE-15, CODE-14 | typecheck+grep | `pnpm typecheck && pnpm lint && BEFORE=494 && AFTER=$(grep -rl "'use client'" src/ \| wc -l) && [ "$AFTER" -lt "$BEFORE" ]` | ✅ | ⬜ pending |
| 05-06-T2 | 06 | 2 | DOC-01 | grep | `grep -q "queryOptions" CLAUDE.md && grep -q "mapper" CLAUDE.md` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/hooks/api/__tests__/use-reports.test.tsx` — rewrite stubs to test real RPC calls (for CODE-06) — created by Plan 01 Task 2
- [ ] `src/hooks/api/__tests__/use-financials.test.tsx` — create for financial hook tests (for CODE-06) — created by Plan 01 Task 2

*Existing infrastructure (Vitest, typecheck, lint) covers all other phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `'use client'` placement correct | CODE-15 | Requires visual check that pages render correctly as Server Components | Build succeeds + spot-check 5 pages in dev mode |
| Tour component renders | CODE-21 | UI component from Dice UI | Visually confirm tour renders on first login |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
