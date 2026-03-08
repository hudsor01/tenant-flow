---
phase: 12
slug: blog-components-css
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-07
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0 with jsdom |
| **Config file** | `vitest.config.ts` (root) |
| **Quick run command** | `pnpm test:unit -- --run src/components/blog/` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run src/components/blog/ src/components/shared/blog-empty-state.test.tsx`
- **After every plan wave:** Run `pnpm validate:quick`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | INFRA-01 | manual | Visual verification (prose class) | N/A | ⬜ pending |
| 12-01-02 | 01 | 1 | INFRA-02 | manual | Visual verification (scrollbar-hide) | N/A | ⬜ pending |
| 12-02-01 | 02 | 1 | COMP-01 | unit | `pnpm test:unit -- --run src/components/blog/blog-card.test.tsx` | ❌ W0 | ⬜ pending |
| 12-02-02 | 02 | 1 | COMP-02 | unit | `pnpm test:unit -- --run src/components/blog/blog-pagination.test.tsx` | ❌ W0 | ⬜ pending |
| 12-02-03 | 02 | 1 | COMP-03 | unit | `pnpm test:unit -- --run src/components/blog/newsletter-signup.test.tsx` | ❌ W0 | ⬜ pending |
| 12-02-04 | 02 | 1 | INFRA-03 | unit | `pnpm test:unit -- --run src/components/shared/blog-empty-state.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/components/blog/blog-card.test.tsx` — unit tests for COMP-01 (renders image, category, reading time, handles null image, links to slug)
- [ ] `src/components/blog/blog-pagination.test.tsx` — unit tests for COMP-02 (renders page N of M, disables prev/next at bounds)
- [ ] `src/components/blog/newsletter-signup.test.tsx` — unit tests for COMP-03 (renders input + button, shows toast on submit)
- [ ] `src/components/shared/blog-empty-state.test.tsx` — unit tests for INFRA-03 (renders animation + message)

*Existing test infrastructure covers framework and config. Only test files need creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `prose` class renders styled typography | INFRA-01 | CSS plugin activation is visual | Add `@plugin` directive, verify `prose` class applies heading/paragraph styles in dev server |
| `scrollbar-hide` utility hides scrollbar | INFRA-02 | CSS utility is visual | Add utility, apply to an `overflow-x-auto` element, verify scrollbar hidden but content scrollable |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
