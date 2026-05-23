---
phase: 10
slug: cta-conversion
status: planned
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-20
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Phase-scope note:** All Phase 10 production code is ALREADY SHIPPED to `main`
> (PRs #694 + #695, verified in 10-RESEARCH.md). Phase 10 is verify-and-pin:
> regression-pin the shipped CONS-06/07/08, TRUST-01, TRUST-03/04 fixes; record
> TRUST-02 as a documented deferral. There is no production-code change to gate.
> TRUST-01 reconciliation: the requirement asks for "≥3" testimonials; 2 real
> attributed testimonials are shipped (Janet Shur, Jacob Lear). Fabricating a 3rd
> violates the v1.0 honesty milestone — pin the 2 that exist, the 3rd is deferred
> until a real customer opts in.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + jsdom |
| **Config file** | `vitest.config.ts` (existing — no install needed) |
| **Quick run command** | `bunx vitest --run --project unit <file>` |
| **Full suite command** | `bun run test:unit` |
| **Estimated runtime** | ~3-5s (quick) / ~14s (full) |

> Note: `bun run test:unit -- --run <file>` crashes post-Vitest-4 (duplicate `--run`).
> Single-file runs use `bunx vitest --run --project unit <file>`.

---

## Sampling Rate

- **After every task commit:** Run the per-task `<automated>` command (the single test file the task created)
- **After every plan wave:** Run `bun run validate:quick` (typecheck + lint + unit tests)
- **Before `/gsd-verify-work`:** Full suite (`bun run test:unit`) must be green
- **Max feedback latency:** 5 seconds per task

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-T1 | 01 | 1 | CONS-06 | T-10-01 | N/A — static marketing copy, no threat surface | unit (source-text scan: no killed CTA labels, canonical label present) | `bunx vitest --run --project unit src/app/__tests__/cta-label-canonical.test.ts` | ❌ task creates it | ⬜ pending |
| 10-01-T2 | 01 | 1 | CONS-07 | T-10-01 | N/A — static compare data, no threat surface | unit (render: FeatureIcon `na` neutral Minus + scan: compare-data 4 `na` rows) | `bunx vitest --run --project unit "src/app/compare/[competitor]/__tests__/compare-neutral-framing.test.tsx"` | ❌ task creates it | ⬜ pending |
| 10-01-T3 | 01 | 1 | CONS-08 | T-10-01 | N/A — static form config, no threat surface | unit (render + scan: contact form `Please select` placeholder) | `bunx vitest --run --project unit src/components/contact/__tests__/contact-form-fields.test.tsx` | ❌ task creates it | ⬜ pending |
| 10-02-T1 | 02 | 1 | TRUST-01, TRUST-04 | T-10-02 | N/A — static marketing data, no threat surface | unit (data shape: ≥2 real entries, name + property count + quote, no headshot/metric; render: empty-gate + real-quote) | `bunx vitest --run --project unit src/data/__tests__/testimonials.test.ts` | ❌ task creates it | ⬜ pending |
| 10-02-T2 | 02 | 1 | TRUST-03, TRUST-04 | T-10-02 | N/A — static legal copy, no threat surface | unit (source-text scan: sales@ + security@ inboxes + SLAs documented) | `bunx vitest --run --project unit src/app/security-policy/__tests__/monitored-inboxes.test.ts` | ❌ task creates it | ⬜ pending |
| 10-02-T3 | 02 | 1 | TRUST-02 | T-10-02 | N/A — documented deferral, no code surface | none — deferral recorded in `10-02-SUMMARY.md` (no review listings exist; fabricating a badge violates the honesty milestone) | `test -f .planning/phases/10-cta-conversion/10-02-SUMMARY.md && grep -qi "TRUST-02" .planning/phases/10-cta-conversion/10-02-SUMMARY.md && grep -qi "defer" .planning/phases/10-cta-conversion/10-02-SUMMARY.md` | ❌ task creates SUMMARY | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0 phase. Phase 10's deliverable is regression-pin test coverage for the 5 shipped requirements. Vitest 4 + jsdom + Testing Library already exist; nothing to install. All test files are created by the Wave 1 tasks themselves — the `wave_0_complete: true` flag reflects that there is no pre-existing test scaffold to build (no missing framework, no missing fixtures).

- CONS-06 — NEW test (`10-01-T1`): no "Talk to Sales"/"Connect with sales"/"Schedule a walkthrough"/"Schedule a demo" remain; "Contact Sales" is the canonical label.
- CONS-07 — NEW test (`10-01-T2`): `compare-data.ts` has the 4 `'na'` rows; `FeatureIcon` renders `'na'` as a neutral `Minus` + `text-muted-foreground` (not red `✗`), verified via the exported `FeatureTable` with a crafted `CompetitorData` fixture.
- CONS-08 — NEW test (`10-01-T3`): `/contact` "How did you hear about us?" placeholder is "Please select".
- TRUST-01 / TRUST-04 — NEW test (`10-02-T1`): testimonials data ships ≥2 real attributed entries (name + property count + quote), avatar = initials/geometric (no headshot URL), no fabricated metric; `TestimonialsSection` (the `sections/` variant) renders null on empty + renders real quotes on data.
- TRUST-03 / TRUST-04 — NEW test (`10-02-T2`): `/security-policy` § 7 documents `sales@` and `security@tenantflow.app` as monitored inboxes with their SLAs.
- **TRUST-02** — DEFERRED (`10-02-T3`, no G2/Capterra/Trustpilot listings exist). Documentation-only; no test, no fabricated badge.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| CTA visual style consistent site-wide (one canonical secondary style for "Contact Sales") | CONS-06 | Cross-page visual consistency is a render check across many surfaces | Browse `/`, `/pricing`, `/features`, `/about` — confirm one canonical "Contact Sales" style |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (no missing references — no test scaffold to pre-build)
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved — Per-Task Verification Map populated; 6 tasks (5 with automated test commands + 1 documentation-only TRUST-02 deferral with a file-presence check).
