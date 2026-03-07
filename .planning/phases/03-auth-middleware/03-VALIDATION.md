---
phase: 3
slug: auth-middleware
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (3 projects: unit, component, integration) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `pnpm test:unit -- --run` |
| **Full suite command** | `pnpm validate:quick` (types + lint + unit tests) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit -- --run`
- **After every plan wave:** Run `pnpm validate:quick`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | AUTH-01 | unit | `pnpm test:unit -- --run src/lib/__tests__/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | AUTH-02 | unit | `pnpm test:unit -- --run src/lib/__tests__/middleware.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | AUTH-12 | unit | `pnpm test:unit -- --run src/lib/__tests__/auth-redirect.test.ts` | ✅ | ⬜ pending |
| 03-02-01 | 02 | 1 | AUTH-03 | manual | AuthProvider uses getUser() verification | N/A | ⬜ pending |
| 03-02-02 | 02 | 1 | AUTH-06 | manual | Module-level client moved inside functions | N/A | ⬜ pending |
| 03-02-03 | 02 | 1 | AUTH-07 | unit | `pnpm test:unit -- --run` (getCachedUser test) | ❌ W0 | ⬜ pending |
| 03-02-04 | 02 | 1 | AUTH-16 | manual | Query keys unified verification | N/A | ⬜ pending |
| 03-03-01 | 03 | 2 | AUTH-04 | unit | `pnpm test:unit -- --run` (invitation auth test) | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | AUTH-08 | manual | OAuth email verification check | N/A | ⬜ pending |
| 03-03-03 | 03 | 2 | AUTH-09 | manual | accept-invite sends Authorization header | N/A | ⬜ pending |
| 03-03-04 | 03 | 2 | AUTH-13 | unit | `pnpm test:unit -- --run` (host header test) | ❌ W0 | ⬜ pending |
| 03-03-05 | 03 | 2 | AUTH-15 | unit | `pnpm test:unit -- --run` (OTP type validation test) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/__tests__/middleware.test.ts` — middleware route matching and redirect tests
- [ ] getCachedUser validation test stubs
- [ ] OTP type validation test stubs
- [ ] x-forwarded-host sanitization test stubs

*Note: Many AUTH requirements are code-level fixes verified by typecheck and manual inspection. Full test coverage for auth flows is Phase 9 scope (TEST-04, TEST-14).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Middleware executes on requests | AUTH-01 | Requires running Next.js server | Start dev server, access /dashboard without auth, verify redirect |
| Role-based routing works | AUTH-02 | Requires authenticated sessions | Login as tenant, try /dashboard URL, verify redirect to /tenant |
| AuthProvider uses getUser() | AUTH-03 | Provider initialization check | Inspect auth-provider.tsx, verify getUser() call |
| Signout is POST-only | AUTH-11 | Requires UI interaction | Click signout in avatar menu, verify no GET-triggerable path |
| select-role RLS works | AUTH-14 | Requires DB + auth state | Login with OWNER user, try UPDATE user_type, verify RLS blocks |
| Auth emails via Resend | Decision #8 | Requires Resend API | Trigger signup, verify email arrives via Resend (not Supabase default) |

*All other behaviors have automated verification via unit tests or typecheck.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
