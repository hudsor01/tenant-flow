---
phase: 05
slug: vitest-unification-file-consolidation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-03
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 |
| **Config file** | `vitest.config.ts` (to be restructured in this phase) |
| **Quick run command** | `pnpm test:unit` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~15 seconds (unit ~10s, component ~1s empty, integration ~30s if secrets available) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit`
- **After every plan wave:** Run `pnpm test` (all Vitest projects)
- **Before `/gsd:verify-work`:** Full suite must be green (`pnpm test && pnpm typecheck && pnpm lint`)
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | INFRA-01, INFRA-02, INFRA-03, INFRA-06 | smoke | `pnpm test:unit && pnpm test:component && pnpm test:integration` | N/A (config restructure) | ⬜ pending |
| 05-01-02 | 01 | 1 | INFRA-06 | smoke | `grep -E 'test:unit\|test:component\|test:integration' .github/workflows/tests.yml .github/workflows/rls-security-tests.yml` | N/A (CI update) | ⬜ pending |
| 05-02-01 | 02 | 2 | INFRA-04, INFRA-05 | smoke | `! test -d src/__tests__ && test -f src/stores/__tests__/data-density.test.ts && test -f tests/e2e/tests/pricing-premium.spec.ts` | N/A (file relocation) | ⬜ pending |
| 05-02-02 | 02 | 2 | INFRA-04, INFRA-05 | unit | `pnpm test:unit` | ✅ existing tests | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. This phase restructures existing config, does not require new test files.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Jest removed from dependencies | INFRA-03 | Package.json inspection | `grep -E '"jest"\|"ts-jest"\|"@types/jest"' package.json` should return empty |
| No jest.config.* files in repo | INFRA-03 | File existence check | `find . -name 'jest.config.*' -not -path './node_modules/*'` should return empty |
| tests/unit/ directory deleted | INFRA-04 | File existence check | `! test -d tests/unit/` should succeed |
| src/__tests__/ directory deleted | INFRA-05 | File existence check | `! test -d src/__tests__/` should succeed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
