---
phase: 1
slug: security-ci-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `01-RESEARCH.md` Validation Architecture sections (CISEC-01..04).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 (unit, jsdom/node) + source-grep drift guards + CI workflow checks |
| **Config file** | `vitest.config.ts` (unit project); `.github/workflows/*.yml` for CI gates |
| **Quick run command** | `bunx vitest --run --project unit <phase test files>` |
| **Full suite command** | `bun run validate:quick` (typecheck + lint + unit) |
| **Estimated runtime** | ~20 s unit; CodeQL `actions` scan ~45 s in CI |

---

## Sampling Rate

- **After every task commit:** Run `bunx vitest --run --project unit <touched test files>`
- **After every plan wave:** Run `bun run validate:quick`
- **Before `/gsd:verify-work`:** Full suite green + the new CI workflows green on the PR
- **Max feedback latency:** ~20 s (unit); CI gates confirm on push

---

## Per-Task Verification Map

Requirement-level contract (task IDs assigned by the planner; rows expand per task).

| Requirement | Secure Behavior | Test Type | Automated Command | Notes |
|-------------|-----------------|-----------|-------------------|-------|
| CISEC-01 | A tampered Stripe-webhook signature is rejected; a valid one (minted via the `stripe` SDK `generateTestHeaderString`) is accepted | unit | `bunx vitest --run --project unit <webhook-signature test>` | runs in the already-green `checks` gate — no serve/secrets |
| CISEC-02 | Authenticated routes serve a per-request nonce CSP with `strict-dynamic`; no `script-src 'unsafe-inline'` on those routes; marketing/blog CSP unchanged | unit + manual | `bunx vitest --run <proxy-nonce test>` + grep `vercel.json`/`src/proxy.ts` | deployed-header check is manual (see Manual-Only) |
| CISEC-03 | `auth-email-send` compares the hook secret in constant time; no `token !== hookSecret` short-circuit remains | unit + grep | `bunx vitest --run <_shared/timing-safe test>` + `grep -n "!== hookSecret" supabase/functions/auth-email-send/index.ts` (expect no match) | shared `_shared/timing-safe.ts` helper |
| CISEC-04 | Every third-party `uses:` under `.github/workflows/` is a 40-char commit SHA with a version comment; CodeQL `actions` scan clean | grep + CI | drift-guard test asserting no non-SHA third-party `uses:`; CodeQL `Analyze (actions)` green | first-party `actions/*` + `github/codeql-action/*` pinned too (uniform) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Webhook-signature Vitest spec (CISEC-01) — new test file asserting accept/reject
- [ ] `supabase/functions/_shared/timing-safe.ts` + its Vitest/Deno spec (CISEC-03)
- [ ] Workflow-pin drift-guard test (CISEC-04) — scans `.github/workflows/*.yml` for non-SHA third-party `uses:`
- [ ] Proxy-nonce unit spec (CISEC-02) — asserts nonce generated + propagated on auth routes

*Existing Vitest + CI infrastructure covers the run harness; only the specs above are new.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Deployed CSP response header carries the nonce + `strict-dynamic` on an authenticated route, and marketing/blog still serve their static CSP with no console CSP violations | CISEC-02 | Real CSP enforcement + the next-themes/no-flash + Sentry-tunnel script execution can only be confirmed against a deployed response in a browser | After deploy: load `/dashboard` and `/` (marketing), inspect the `Content-Security-Policy` response header, and confirm zero CSP-violation errors in the console on both |

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (4 new specs above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30 s
- [ ] `nyquist_compliant: true` set in frontmatter after planner maps tasks

**Approval:** pending
