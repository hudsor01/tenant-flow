---
phase: 01-security-ci-hardening
plan: 04
subsystem: ci-supply-chain
tags: [github-actions, supply-chain, sha-pinning, drift-guard, CISEC-04]
requires: []
provides:
  - "SHA-pinned uses: across all .github/workflows/*.yml"
  - "src/lib/__tests__/workflow-pins.test.ts drift guard"
affects:
  - .github/workflows/ci-cd.yml
  - .github/workflows/rls-security-tests.yml
  - .github/workflows/claude.yml
  - .github/workflows/codeql.yml
  - .github/workflows/gitleaks.yml
  - .github/workflows/post-deploy-sentry-gate.yml
tech-stack:
  added: []
  patterns:
    - "GitHub Actions pinned to immutable commit SHA + trailing # vX.Y.Z Dependabot anchor"
    - "Vitest filesystem drift guard (readdirSync + readFileSync + regex)"
key-files:
  created:
    - src/lib/__tests__/workflow-pins.test.ts
  modified:
    - .github/workflows/ci-cd.yml
    - .github/workflows/rls-security-tests.yml
    - .github/workflows/claude.yml
    - .github/workflows/codeql.yml
    - .github/workflows/gitleaks.yml
    - .github/workflows/post-deploy-sentry-gate.yml
decisions:
  - "Pin first-party actions/* + github/codeql-action/* uniformly (zero-cost, removes the trusted-or-not judgment) per the locked decision"
  - "gitleaks stays on the v2 SHA — no silent v3 jump; let Dependabot propose v3 separately"
  - "github/codeql-action pinned to SHA for uniformity (option a) rather than tracking @v3"
metrics:
  duration: ~12m
  completed: 2026-06-04
requirements: [CISEC-04]
---

# Phase 1 Plan 04: SHA-pin GitHub Actions (CISEC-04) Summary

Pinned every `uses:` across the six `.github/workflows/*.yml` files to an immutable 40-char commit SHA with a trailing `# vX.Y.Z` Dependabot anchor, and added a Vitest drift guard that fails on any non-SHA `uses:` — defeating action-tag repointing supply-chain attacks.

## What Was Built

**Task 1 — SHA-pin every `uses:`** (`c4d6ce8`)
Re-resolved each action tag to its dereferenced commit SHA at execution time (live GitHub API, annotated tags `gitleaks@v2`, `claude-code-action@v1`, `codeql-action@v3` dereferenced through the tag object to the underlying commit). All re-resolved SHAs matched the RESEARCH §CISEC-04 table — no drift since 2026-06-04. 18 `uses:` lines pinned across 6 files (19 total including the pre-existing `dependabot/fetch-metadata` pin, left untouched):

| Action | SHA | Version | Owner |
|--------|-----|---------|-------|
| anthropics/claude-code-action | `70a6e525…` | v1.0.135 | third-party (id-token: write — highest blast radius) |
| oven-sh/setup-bun | `0c5077e5…` | v2.2.0 | third-party |
| gitleaks/gitleaks-action | `ff98106e…` | v2.3.9 | third-party (stays v2) |
| actions/checkout | `df4cb1c0…` | v6.0.3 | first-party |
| actions/setup-node | `48b55a01…` | v6.4.0 | first-party |
| actions/upload-artifact | `043fb46d…` | v7.0.1 | first-party |
| github/codeql-action/{init,analyze} | `dd903d2e…` | v3 | first-party |

`ci-cd-doc-only.yml` confirmed to have zero `uses:` lines (nothing to pin). `dependabot/fetch-metadata@25dd0e34… # v3.1.0` left as-is (already correctly pinned).

**Task 2 — drift-guard test** (`28cb9a2c6`)
`src/lib/__tests__/workflow-pins.test.ts` (102 lines): enumerates `.github/workflows/*.yml`, extracts every `uses:` line, and runs two assertions — (a) every third-party action (owner ∉ {actions, github}) MUST be a 40-hex SHA, (b) the stricter uniform check that EVERY `uses:` is a 40-hex SHA. Violations are reported as `file:line → ref` strings so a regression is actionable. Skips blank/comment lines and local/composite (`./`, `docker://`) refs. No `any` — parsed entries typed via an explicit `UsesEntry` interface. Runs in the `unit`/`checks` gate via the `src/**` glob.

## Verification

- `grep -rn "uses:" .github/workflows/ | grep -vE "@[0-9a-f]{40}"` (excl. ci-cd-doc-only) → nothing. PASS.
- `grep -rE "uses: (oven-sh|gitleaks|anthropics)/" … | grep -vE "@[0-9a-f]{40}"` → nothing. PASS.
- gitleaks v2 SHA count in gitleaks.yml === 1. PASS.
- claude OIDC action SHA count in claude.yml === 1. PASS.
- All 8 workflow files parse as valid YAML (`ruby -ryaml YAML.load_file`). PASS.
- `bunx vitest --run --project unit src/lib/__tests__/workflow-pins.test.ts` → 3 tests passed. PASS.
- Red-on-revert verified: temporarily reverting the gitleaks pin to `@v2` turned both assertions red with the actionable `gitleaks.yml:32 → gitleaks/gitleaks-action@v2` message, then restored. PASS.
- `bunx tsc --noEmit` → exit 0. PASS.
- lefthook pre-commit gate (gitleaks, lockfile, lint, typecheck, unit-tests) ran green on both commits — NEVER `--no-verify`.

## Deviations from Plan

None affecting scope. Two execution-mechanics notes:

1. **[Rule 3 — blocking] `bun run test:unit -- --run <file>` double-injects `--run`.** The `test:unit` npm script already passes `--run`, so the plan's literal command crashed with `Expected a single value for option "--run"`. Used the plan's alternative form `bunx vitest --run --project unit <file>` instead. Test outcome unaffected.
2. **`bun run validate:quick` fails to launch in this environment** — the chained `bun run typecheck && bun run lint && bun run test:unit` script resolves `bun` as a missing CJS module path under the bundled-node prelude (a `pkg`/node interop quirk, unrelated to the changes). Each constituent gate was verified independently green: lefthook pre-commit (typecheck + lint + unit-tests) on both commits, plus `bunx tsc --noEmit` exit 0 and the targeted drift-guard test passing. No code-level issue.
3. **commitlint subject-case** rejected the first Task-1 subject ("SHA-pin…" read as upper-case); reworded to "pin every GitHub Actions uses to commit SHA". Lowercase-start subject, no content change.

## Threat Surface

No new security surface introduced — this plan removes surface (mutable tag → immutable SHA). Threat register dispositions T-01-08/09/10 (`mitigate`) all satisfied: the OIDC `claude-code-action`, all other third-party actions, and first-party actions are now SHA-pinned.

## Known Stubs

None.

## Self-Check: PASSED
- src/lib/__tests__/workflow-pins.test.ts — FOUND
- .github/workflows/{ci-cd,rls-security-tests,claude,codeql,gitleaks,post-deploy-sentry-gate}.yml — all modified, FOUND
- Commit c4d6ce8 (Task 1) — FOUND
- Commit 28cb9a2c6 (Task 2) — FOUND
