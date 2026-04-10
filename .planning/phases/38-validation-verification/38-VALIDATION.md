---
phase: 38
slug: validation-verification
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (unit) + playwright 1.58 (E2E) |
| **Config file** | `vitest.config.ts` + `tests/e2e/playwright.config.ts` |
| **Quick run command** | `pnpm test:unit -- --run` |
| **Full suite command** | `pnpm typecheck && pnpm lint && pnpm test:unit` |
| **Estimated runtime** | ~45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run`
- **After every plan wave:** Run `pnpm typecheck && pnpm lint && pnpm test:unit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 1 | CRAWL-05, CRAWL-06 | — | N/A | unit | `pnpm test:unit -- --run src/app/sitemap.test.ts` | ❌ W0 | ⬜ pending |
| 38-01-02 | 01 | 1 | CRAWL-05 | — | N/A | unit | `pnpm test:unit -- --run src/app/sitemap.test.ts` | ❌ W0 | ⬜ pending |
| 38-02-01 | 02 | 2 | VALID-02 | — | N/A | E2E | `pnpm test:e2e -- tests/e2e/tests/public/seo-smoke.spec.ts` | ❌ W0 | ⬜ pending |
| 38-03-01 | 03 | 2 | VALID-03 | — | N/A | unit+lint+type | `pnpm typecheck && pnpm lint && pnpm test:unit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/sitemap.test.ts` — unit tests for sitemap completeness (CRAWL-05, CRAWL-06)
- [ ] `tests/e2e/tests/public/seo-smoke.spec.ts` — E2E SEO smoke tests (VALID-02)

*Existing Playwright and Vitest infrastructure covers framework needs — only test files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| GSC DNS verification active | VALID-01 | External service (Google Search Console) | Confirm in GSC dashboard that DNS verification shows "verified" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
