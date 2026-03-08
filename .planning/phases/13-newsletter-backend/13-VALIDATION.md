---
phase: 13
slug: newsletter-backend
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-07
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Deno test runner (built-in) |
| **Config file** | `supabase/functions/deno.json` (import map) |
| **Quick run command** | `cd supabase/functions && deno test --allow-all --no-check tests/newsletter-subscribe-test.ts` |
| **Full suite command** | `cd supabase/functions && deno test --allow-all --no-check tests/` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm typecheck` (Edge Functions are separate Deno runtime, typecheck validates no cross-contamination)
- **After every plan wave:** Run `pnpm validate:quick`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | NEWS-01, NEWS-02 | integration | `cd supabase/functions && deno test --allow-all --no-check tests/newsletter-subscribe-test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `supabase/functions/tests/newsletter-subscribe-test.ts` — integration tests for NEWS-01, NEWS-02 (CORS, email validation, success response, rate limit documentation)

*Existing test infrastructure (Deno test runner, import map) covers framework. Only test file needs creation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rate limiting at 5 req/min | NEWS-02 | Requires live Upstash Redis connection and rapid repeated requests | Deploy function, send 6 rapid requests from same IP, verify 6th returns 429 |
| Resend contact actually created | NEWS-01 | Requires live Resend API key and dashboard verification | Deploy function, submit email, check Resend dashboard contacts list |
| Duplicate email returns success | NEWS-01 | Requires live Resend API to test duplicate behavior | Submit same email twice, verify both return 200 success |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
