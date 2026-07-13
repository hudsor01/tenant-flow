---
gsd_state_version: 1.0
milestone: v9.0
milestone_name: Full-Surface Remediation
status: planning
last_updated: "2026-07-11T00:00:00.000Z"
last_activity: 2026-07-11
progress:
  total_phases: 16
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v9.0):** Fix all 296 adversarially verified findings from the 2026-07-11 full-surface audit (codebase + public marketing pages + owner dashboard). Every confirmed finding is a tracked requirement; nothing is deferred. Findings are grouped one category per phase (phases 36-51); each phase ships as its own perfect-PR PR and phases execute strictly sequentially — a phase merges to main before the next branches — so no phase can overwrite another's fixes. Every fix is a root-cause fix verified against the audit entry's `> Verifier:` evidence; class-wide bug classes get one exhaustive sibling sweep, not one-sibling-per-review-cycle.

**Current focus:** Phase 36 — Billing & Subscription Lifecycle (BILL-01..20)

## Current Position

Phase: 36 — Billing & Subscription Lifecycle
Plan: —
Status: Not started
Last activity: 2026-07-11 — Milestone v9.0 roadmap authored (16 phases 36-51, 296 requirements mapped)

## Roadmap Summary (v9.0)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 36. Billing & Subscription Lifecycle | Checkout/trial/past_due/cancellation/webhooks correct; no owner locked out of fixing billing | BILL-01..20 |
| 37. Auth Flows | Email-change/magic-link/invite/recovery/sign-out/post-checkout complete + honest errors | AUTH-01..13 |
| 38. Forms & Validation | Every form + both CSV importers save valid data with real client-side validation | FORM-01..19 |
| 39. Data Layer & Cache Integrity | Mutations keep cache truthful; every list query bounded + correctly filtered | DATA-01..18 |
| 40. Type Boundaries (RPC/PostgREST) | Validated typed mappers so no cast fabricates or destroys data | TYPE-01..07 |
| 41. Component Logic & Analytics Correctness | Analytics/financial/date components compute correct numbers + dates | COMP-01..13 |
| 42. Dashboard UX & Navigation | Modals/quick-actions/confirmations/empty-states work + route to real pages | DASH-01..23 |
| 43. E-sign Flow | Signing notifies right party, recovers from finalize failures, keeps access, per-IP rate limit | SIGN-01..06 |
| 44. Public Site UX | Marketing surface converts logged-out prospects without dead ends or auth walls | PUBUX-01..11 |
| 45. Marketing Content Truthfulness | Every marketing claim maps to a shipped capability | CONTENT-01..24 |
| 46. Marketing UI Consistency | Correct typography/spacing/containers/dark-mode tokens; no dead classes or dupes | MKTUI-01..26 |
| 47. Accessibility | WCAG AA — readable tokens, named controls, keyboard-reachable actions, managed focus | A11Y-01..41 |
| 48. Routing, SEO & Performance | ISR stays static, SEO metadata correct, heavy bundles + N+1 removed | SEO-01..15 |
| 49. Client State (Zustand) | Client state truthful across users/navigations; dead stores removed | STATE-01..13 |
| 50. Admin Surface | Honest data, captured errors, reachable + accessible admin pages | ADMIN-01..07 |
| 51. Code Hygiene | No duplicate types, string-literal query keys, module-level clients, inline styles, emojis | HYG-01..40 |

## Execution Disciplines (binding, phases 36-51)

1. **Strictly sequential** — each phase branches only after the previous phase's PR is MERGED to main. Never stack phase branches. Overlapping surfaces (billing/auth/forms/data/type share files) mean a stacked branch could silently overwrite a prior phase's fix.
2. **Perfect-PR gate per phase** — merge only after two consecutive zero-finding review cycles on the frozen final state (a mid-streak edit resets the streak).
3. **Read RESEARCH.md before planning** — before `/gsd-plan-phase NN`, read `.planning/phases/NN-*/RESEARCH.md` (fix-approach validation, written at milestone setup).
4. **Root-cause fixes verified against audit evidence** — every fix resolves the underlying defect and is verified against the audit entry's `> Verifier:` note; plans MUST read the audit entry for each REQ before proposing a fix.
5. **Exhaustive sibling sweep for bug classes** — decimal-into-integer money forms, ÷100 divisions, timezone date parsing, unbounded queries, duplicate types, string-literal query keys, undefined utility classes, hover-only controls each get one focused sweep so siblings land together.

## Blockers

None.

## Roadmap Evolution

- 2026-05-22: v1.0 "Marketing Surface Honesty" shipped + archived (15 phases).
- 2026-06-02: v2.0 "Dashboard Command Center" shipped + archived (7 phases, 34/34).
- 2026-06-02: v3.0 "Security Hardening" shipped + archived (3 phases, 12/12).
- 2026-06-07: v4.0 "Hardening & Hygiene" shipped + archived (8 phases, 20/21).
- 2026-06-10: v5.0 "AI Blog Content Engine" shipped + archived (6 phases 9-14, 9/9).
- 2026-06-14: v6.0 "Final Canonical Cleanup" created + resolved (5 phases 15-19, 24 requirements).
- 2026-06-25: v7.0 "TanStack Form Composition Migration" (5 phases 20-24) paused mid-flight (20-22 merged, 23-24 open); plan archived.
- 2026-07-02: v8.0 "Correctness Restoration" started (11 phases 25-35, 56 requirements).
- 2026-07-10: v8.0 shipped (71/72 + remediation #893), archived.
- 2026-07-11: v9.0 "Full-Surface Remediation" started (16 phases 36-51, 296 requirements) — scoped from the 2026-07-11 full-surface audit.

## Next Action

Plan **Phase 36** (Billing & Subscription Lifecycle, BILL-01..20). First read `.planning/phases/36-*/RESEARCH.md`, then `/gsd-plan-phase 36`. Branch only after v8.0 is confirmed merged to main. Phase 36 is the most damaged surface per the audit's top themes (checkout-verify always 400s, unconditional serial trials, no existing-subscription guard, nonexistent past_due grace, `/owner/billing` 404 CTAs, webhook handlers on dropped columns).

## Overrides

(none active)

---
*Last updated: 2026-07-11 — v9.0 "Full-Surface Remediation" started; REQUIREMENTS (296 reqs, traceability filled) + ROADMAP (16 phases 36-51) authored. Integer phase numbers continue across milestones (v8.0 ended at 35; v9.0 is 36-51). Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
