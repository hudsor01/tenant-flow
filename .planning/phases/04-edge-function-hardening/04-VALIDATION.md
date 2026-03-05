---
phase: 4
slug: edge-function-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (unit project) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test:unit -- --run` |
| **Full suite command** | `pnpm test:unit` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run`
- **After every plan wave:** Run `pnpm test:unit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | EDGE-01 | unit | `pnpm test:unit -- --run src/path/to/env.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | EDGE-07 | unit | `pnpm test:unit -- --run src/path/to/errors.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 1 | EDGE-10 | unit | `pnpm test:unit -- --run src/path/to/cors.test.ts` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | EDGE-02 | unit | `pnpm test:unit -- --run src/path/to/rate-limit.test.ts` | ❌ W0 | ⬜ pending |
| 04-xx-xx | xx | x | EDGE-03 | manual | Code review of HTML escaping diff | N/A | ⬜ pending |
| 04-xx-xx | xx | x | EDGE-04 | manual | Verify CSP in vercel.json | N/A | ⬜ pending |
| 04-xx-xx | xx | x | EDGE-05,13 | manual | `grep -r 'apiVersion' supabase/functions/` | N/A | ⬜ pending |
| 04-xx-xx | xx | x | EDGE-12 | manual | Check deno.json version | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Shared utility tests for `_shared/env.ts`, `_shared/errors.ts`, `_shared/rate-limit.ts`
- [ ] CORS fail-closed test for `_shared/cors.ts` update

*Note: Edge Function shared utilities are Deno code but unit tests for the patterns can be written in Vitest by testing equivalent logic.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| XSS escaping in DocuSeal/PDF | EDGE-03 | Template interpolation needs code review | Verify all user values wrapped in escapeHtml() |
| CSP header in vercel.json | EDGE-04 | Static config, not runtime | Check vercel.json has Content-Security-Policy |
| Stripe API version consistency | EDGE-05, EDGE-13 | Static string check | `grep -r 'apiVersion' supabase/functions/` returns only `2026-02-25.clover` |
| Supabase SDK version alignment | EDGE-12 | Import map version check | Verify deno.json matches Next.js package.json |
| Vary header review | EDGE-14 | Architecture decision | Review vercel.json headers config |
| Invitation code exchange | EDGE-09 | Integration flow | Test invitation accept with exchange token |
| Sentry tunnel rate limit | EDGE-11 | Middleware-level check | Verify proxy.ts or middleware handles /monitoring rate limiting |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
