---
phase: 40
slug: metadata-verification-completeness
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-12
---

# Phase 40 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (unit)** | Vitest 4.0 (jsdom) |
| **Framework (E2E)** | Playwright 1.58 |
| **Config file (unit)** | `vitest.config.ts` (project: `unit`) |
| **Config file (E2E)** | `tests/e2e/playwright.config.ts` |
| **Quick run command** | `pnpm test:unit -- --run src/lib/seo/__tests__/` |
| **Full suite command** | `pnpm validate:quick && pnpm test:e2e -- tests/e2e/tests/public/seo-smoke.spec.ts` |
| **Estimated runtime** | ~90 seconds (unit ~1s, validate:quick ~20s, SEO E2E spec ~60s) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run src/lib/seo/__tests__/`
- **After every plan wave:** Run `pnpm validate:quick && pnpm test:e2e -- tests/e2e/tests/public/seo-smoke.spec.ts`
- **Before `/gsd-verify-work`:** Full suite must be green — `pnpm validate:quick && pnpm test:e2e`
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 40-01-01 | 40-01 | 0 | META-11, SCHEMA-01 | T-40-01-01 (ASVS V5 — JSON-LD parsing in test harness) | Test-only parse of `script[type="application/ld+json"]` wrapped in try/catch; no user input; regression assertion `not.toContain('\| TenantFlow \| TenantFlow')` grounded in build-time strings | e2e | `pnpm test:e2e -- tests/e2e/tests/public/seo-smoke.spec.ts` | ✅ existing (strengthened) | ⬜ pending |
| 40-02-01 | 40-02 | 1 | META-11 | T-40-02-04 (ASVS V14 — canonical URL single source) | `createPageMetadata` derives canonical from `path` + `getSiteUrl()` — no string concatenation drift | unit + typecheck | `pnpm validate:quick` | ✅ existing | ⬜ pending |
| 40-02-02 | 40-02 | 1 | META-11 | T-40-02-04 (ASVS V14 — canonical URL single source) | Same factory-derived canonical; title rewrite per D-06 (no inline suffix) | unit + typecheck | `pnpm validate:quick` | ✅ existing | ⬜ pending |
| 40-02-03 | 40-02 | 1 | META-11 | T-40-02-04 (ASVS V14 — canonical URL single source) | Factory-derived canonical; title rewrite per D-06 | unit + typecheck | `pnpm validate:quick` | ✅ existing | ⬜ pending |
| 40-02-04 | 40-02 | 1 | META-11 | T-40-02-04 (ASVS V14 — canonical URL single source) | Factory-derived canonical; title rewrite per D-06; preserve all non-metadata imports | unit + typecheck | `pnpm validate:quick` | ✅ existing | ⬜ pending |
| 40-03-01 | 40-03 | 1 | META-11 | T-40-03-02 (ASVS V14 — canonical URL single source), T-40-03-04 (Pitfall 1 brand spoof) | Factory-derived canonical; strip inline `\| TenantFlow` suffix per D-06; preserve Phase 39 HowTo JSON-LD byte-for-byte | unit + typecheck + e2e | `pnpm validate:quick && pnpm test:e2e -- tests/e2e/tests/public/seo-smoke.spec.ts --grep "seasonal-maintenance-checklist\|double brand suffix"` | ✅ existing | ⬜ pending |
| 40-03-02 | 40-03 | 1 | META-11, SCHEMA-01 | T-40-03-01 (ASVS V5 — JSON-LD XSS), T-40-03-02 (ASVS V14), T-40-03-04 (Pitfall 1), T-40-03-05 (structured data spoofing) | `JsonLdScript` escapes `<` to `\u003c`; breadcrumb values from `createBreadcrumbJsonLd(path, overrides)` using build-time constants; override `{ 'security-deposit-reference-card': 'Security Deposit Laws by State' }` aligns label with page H1 | unit + typecheck + e2e + grep | `pnpm validate:quick && pnpm test:e2e -- tests/e2e/tests/public/seo-smoke.spec.ts --grep "security-deposit-reference-card\|double brand suffix" && grep -n "'security-deposit-reference-card': 'Security Deposit Laws by State'" src/app/resources/security-deposit-reference-card/page.tsx` | ✅ existing (post 40-01) | ⬜ pending |
| 40-03-03 | 40-03 | 1 | META-11, SCHEMA-01 | T-40-03-01 (ASVS V5 — JSON-LD XSS), T-40-03-02 (ASVS V14), T-40-03-04 (Pitfall 1), T-40-03-05 (structured data spoofing) | `JsonLdScript` escapes `<` to `\u003c`; breadcrumb default humanization matches H1 — no override needed; strip inline `\| TenantFlow` suffix | unit + typecheck + e2e | `pnpm validate:quick && pnpm test:e2e -- tests/e2e/tests/public/seo-smoke.spec.ts --grep "landlord-tax-deduction-tracker\|double brand suffix"` | ✅ existing (post 40-01) | ⬜ pending |
| 40-03-04 | 40-03 | 1 | VALID-01 (documentation) | N/A — documentation edit | ROADMAP.md mentions 7-page scope, DNS-verified VALID-01 satisfaction, and 3 plan filenames | grep (doc assertion) | `grep -n "40-01-PLAN.md" .planning/ROADMAP.md && grep -n "40-02-PLAN.md" .planning/ROADMAP.md && grep -n "40-03-PLAN.md" .planning/ROADMAP.md && grep -n "DNS" .planning/ROADMAP.md` | ✅ existing | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Sampling continuity check:** No 3 consecutive tasks lack automated verify. All 9 tasks have executable `automated_command` values.

**Task totals:** 1 task (40-01) + 4 tasks (40-02) + 4 tasks (40-03) = **9 tasks across 3 plans / 2 waves**.

---

## Wave 0 Requirements

Before any migration task runs, the following test-infrastructure gaps must be closed so the migration is observable:

- [ ] **Update `tests/e2e/tests/public/seo-smoke.spec.ts`** — extend `expectedSchemas` for `/resources/security-deposit-reference-card` and `/resources/landlord-tax-deduction-tracker` to include `'BreadcrumbList'` (currently only `['Organization']`). Without this, breadcrumb additions (D-08) cannot be verified by the E2E smoke test.
- [ ] **Add brand-suffix regression assertion** to the same spec — for each of the 7 migrated paths, assert the rendered `<title>` does NOT contain the literal substring `| TenantFlow | TenantFlow`. Guards against Pitfall 1 (double brand suffix from `title.template` + hard-coded suffix in page title).

**All other Phase 40 requirements are covered by existing test infrastructure:**
- `src/lib/seo/__tests__/page-metadata.test.ts` (9 tests) — covers `createPageMetadata` factory output (canonical URL, OG tags, Twitter card)
- `src/lib/seo/__tests__/breadcrumbs.test.ts` — covers `createBreadcrumbJsonLd` for 3-level paths with and without overrides
- `tests/e2e/tests/public/seo-smoke.spec.ts` — canonical link presence assertion already runs for all 7 Phase 40 paths

No new unit tests required.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GSC verification status | VALID-01 | Requires login to Google Search Console; external service | Log into GSC, confirm tenantflow.app property shows "Verified via DNS" status. Record screenshot in SUMMARY. (Already verified in Phase 38 — re-confirmation optional for audit trail.) |
| Zero `verification` field in root layout | VALID-01 | Negative assertion; easier as grep than test | `grep -n "verification" src/app/layout.tsx` must return zero matches. Document the grep output in SUMMARY. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (9/9 tasks mapped)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (E2E spec strengthening in 40-01)
- [x] No watch-mode flags in any task command (Vitest `--run` required, Playwright runs non-interactive by default)
- [x] Feedback latency < 90s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready (flip `wave_0_complete: true` after 40-01 executes and lands green)
</content>
