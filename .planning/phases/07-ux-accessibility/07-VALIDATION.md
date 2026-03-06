---
phase: 07
slug: ux-accessibility
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-06
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm validate:quick` |
| **Full suite command** | `pnpm test:unit && pnpm test:component` |
| **Estimated runtime** | ~20 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm validate:quick`
- **After every plan wave:** Run `pnpm test:unit && pnpm test:component`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | UX-01, UX-02 | unit (regex scan) | `pnpm test:unit -- --run src/app/__tests__/globals.test.tsx` | Existing (adapt) | pending |
| 07-01-02 | 01 | 1 | UX-12 | manual-only | Visual verification | N/A | pending |
| 07-01-03 | 01 | 1 | UX-13 | manual-only | Visual verification | N/A | pending |
| 07-02-01 | 02 | 1 | UX-05, UX-06 | component | `pnpm test:unit -- --run src/components/shell/__tests__/app-shell.test.tsx` | Existing (extend) | pending |
| 07-02-02 | 02 | 1 | UX-07-UX-11 | component | `pnpm test:unit -- --run src/components/shell/__tests__/*.test.tsx` | Existing (extend) | pending |
| 07-02-03 | 02 | 1 | UX-19, UX-20 | manual-only | Resize viewport, test keyboard | N/A | pending |
| 07-03-01 | 03 | 2 | UX-03, UX-04 | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-tenant.test.tsx` | Existing (extend) | pending |
| 07-03-02 | 03 | 2 | UX-14 | manual-only | Navigate to invalid ID URL | N/A | pending |
| 07-03-03 | 03 | 2 | UX-15 | manual-only | Trigger error in route | N/A | pending |
| 07-03-04 | 03 | 2 | UX-16-UX-18 | manual-only | Check page titles, kanban | N/A | pending |
| 07-03-05 | 03 | 2 | UX-21-UX-26 | mixed | `pnpm validate:quick` | Partial | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Most UX requirements are CSS/markup changes testable by existing unit test suite (typecheck + lint catch class errors). No new test framework needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Switch replaces custom toggles | UX-13 | CSS component swap | Open notification settings, verify toggles work |
| not-found.tsx renders | UX-14 | Next.js page routing | Navigate to /leases/nonexistent-id |
| error.tsx catches errors | UX-15 | Runtime error boundary | Trigger error in route group |
| Kanban responsive | UX-18 | Viewport-dependent | Resize to <768px, verify columns |
| Login Suspense styled | UX-22 | Network-dependent | Throttle network, observe loading |
| Breadcrumbs on mobile | UX-19 | Viewport-dependent | Resize to mobile, check breadcrumbs |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
