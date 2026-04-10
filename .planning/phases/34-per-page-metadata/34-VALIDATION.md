---
phase: 34
slug: per-page-metadata
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-08
---

# Phase 34 — Validation Strategy

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
- **After every plan wave:** Run `pnpm typecheck && pnpm lint && pnpm test:unit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 34-01-01 | 01 | 1 | META-01 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |
| 34-01-02 | 01 | 1 | META-02 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |
| 34-01-03 | 01 | 1 | META-03 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |
| 34-01-04 | 01 | 1 | META-04 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |
| 34-01-05 | 01 | 1 | META-05 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |
| 34-01-06 | 01 | 1 | META-06 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |
| 34-01-07 | 01 | 1 | META-07 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |
| 34-01-08 | 01 | 1 | META-08 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |
| 34-01-09 | 01 | 1 | META-09 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |
| 34-01-10 | 01 | 1 | META-10 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |
| 34-01-11 | 01 | 1 | META-11 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |
| 34-01-12 | 01 | 1 | META-12 | — | N/A | unit | `pnpm test:unit -- --run` | ⬜ TBD | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. Vitest is already configured with 1,469+ passing tests.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OG tags render in social previews | META-11 | Requires real social platform preview or validator tool | Use Facebook Sharing Debugger or Twitter Card Validator |
| Google indexing behavior | META-12 | Requires Google Search Console | Submit URLs after deployment, verify noindex respected |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
