---
phase: 15
slug: ci-optimization
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-08
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | GitHub Actions (workflow syntax validation) |
| **Config file** | `.github/workflows/ci-cd.yml` |
| **Quick run command** | `yamllint .github/workflows/ci-cd.yml` or manual inspection |
| **Full suite command** | Push to branch + open PR to verify `checks` runs; merge to verify `e2e-smoke` runs independently |
| **Estimated runtime** | ~5 seconds (local validation), ~10 minutes (CI run) |

---

## Sampling Rate

- **After every task commit:** Validate YAML syntax
- **After every plan wave:** Full suite via PR + merge cycle
- **Before `/gsd:verify-work`:** Verify both jobs trigger correctly
- **Max feedback latency:** 5 seconds (local)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | INFRA-04 | manual | PR trigger test | N/A | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed — validation is via CI trigger behavior.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `checks` runs on PR only | INFRA-04 | GitHub Actions trigger behavior requires actual PR | Open PR, verify `checks` runs. Push to main, verify `checks` does NOT run. |
| `e2e-smoke` runs independently on push | INFRA-04 | Requires actual push to main | Merge PR, verify `e2e-smoke` runs without waiting for `checks`. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
