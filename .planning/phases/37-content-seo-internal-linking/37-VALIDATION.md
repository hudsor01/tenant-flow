---
phase: 37
slug: content-seo-internal-linking
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-10
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test:unit -- --run` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run`
- **After every plan wave:** Run `pnpm test:unit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 37-01-01 | 01 | 1 | CONTENT-01 | — | N/A | unit | `pnpm test:unit -- --run src/lib/content-links.test.ts` | ❌ W0 | ⬜ pending |
| 37-01-02 | 01 | 1 | CONTENT-02 | — | N/A | unit | `pnpm test:unit -- --run src/components/sections/related-articles.test.ts` | ❌ W0 | ⬜ pending |
| 37-01-03 | 01 | 2 | CONTENT-01 | — | N/A | unit | `pnpm test:unit -- --run src/app/blog/\\[slug\\]/blog-post-page.test.ts` | ❌ W0 | ⬜ pending |
| 37-01-04 | 01 | 2 | CONTENT-02 | — | N/A | unit | `pnpm test:unit -- --run src/app/compare/\\[competitor\\]/page.test.ts` | ❌ W0 | ⬜ pending |
| 37-01-05 | 01 | 2 | CONTENT-03 | — | N/A | unit | `pnpm test:unit -- --run src/app/resources/page.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/content-links.test.ts` — stubs for CONTENT-01 (reverse lookup maps)
- [ ] `src/components/sections/related-articles.test.ts` — stubs for CONTENT-02 (RelatedArticles component)

*Existing infrastructure covers test framework and config.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cross-links render correctly on deployed pages | CONTENT-01, CONTENT-02, CONTENT-03 | Visual verification of link placement and styling | Navigate to blog, compare, and resource pages; verify links appear and navigate correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
