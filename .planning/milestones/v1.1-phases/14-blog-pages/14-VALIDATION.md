---
phase: 14
slug: blog-pages
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-07
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (jsdom) |
| **Config file** | vitest.config.ts (project: unit) |
| **Quick run command** | `pnpm test:unit -- --run src/app/blog/` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~15 seconds (blog subset) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run src/app/blog/`
- **After every plan wave:** Run `pnpm test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | PAGE-01, PAGE-02 | unit | `pnpm test:unit -- --run src/app/blog/page.test.tsx` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | PAGE-03 | unit | `pnpm test:unit -- --run src/app/blog/[slug]/page.test.tsx` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | PAGE-04, PAGE-05 | unit | `pnpm test:unit -- --run src/app/blog/category/[category]/page.test.tsx` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 1 | NEWS-03 | unit | `pnpm test:unit -- --run src/components/blog/newsletter-signup.test.tsx` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/app/blog/page.test.tsx` — hub page tests (split zones, category pills, pagination)
- [ ] `src/app/blog/[slug]/page.test.tsx` — detail page tests (featured image, related posts, prose)
- [ ] `src/app/blog/category/[category]/page.test.tsx` — category page tests (DB resolution, empty state, redirect)

*Existing infrastructure covers test framework and component mocking patterns.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Horizontal scroll with scrollbar-hide | PAGE-01 | CSS scroll behavior | Verify comparisons zone scrolls horizontally, no visible scrollbar |
| Featured image blur-fade animation | PAGE-03 | CSS transition timing | Load detail page, verify image fades in with blur effect |
| Category pills visual layout | PAGE-02 | Visual alignment | Verify pills render in horizontal row with correct counts |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
