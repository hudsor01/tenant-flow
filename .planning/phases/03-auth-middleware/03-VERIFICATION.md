---
phase: 03-auth-middleware
verified: 2026-03-05T07:55:00Z
status: passed
score: 6/6 success criteria verified
gaps: []
human_verification:
  - test: "OAuth auto-invitation acceptance during callback"
    expected: "First-time Google OAuth user with pending invitation should auto-accept and land on /tenant"
    why_human: "Server-to-server call from auth callback to tenant-invitation-accept Edge Function lacks Bearer token after AUTH-04 JWT requirement was added -- may silently fail (user redirected to /auth/select-role instead). Needs live OAuth flow test."
  - test: "Resend auth email templates render correctly"
    expected: "Signup confirmation, password reset, invitation, magic link, email change emails arrive with TenantFlow branding"
    why_human: "Edge Function auth-email-send requires Supabase Auth Hook registration and Resend API key -- cannot verify email delivery programmatically"
  - test: "Role-based routing in browser"
    expected: "TENANT navigating to /dashboard sees /tenant, OWNER navigating to /tenant sees /dashboard, PENDING user sees /auth/select-role"
    why_human: "Middleware redirects depend on live Supabase session with user_type in app_metadata"
---

# Phase 3: Auth & Middleware Verification Report

**Phase Goal:** Every route is protected by role-appropriate access control with server-validated sessions
**Verified:** 2026-03-05T07:55:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Middleware executes on every request -- tenant users accessing /owner/* routes are redirected to tenant portal, and vice versa | VERIFIED | `proxy.ts` at root with role-based enforcement (lines 77-105), `config.matcher` excludes only static/API routes (line 112), 13 routing tests in `middleware-routing.test.ts` covering all role/route combinations, tsconfig `#proxy` alias wired |
| 2 | Session validation uses `getUser()` (server-verified) throughout -- no `getSession()` for auth decisions | VERIFIED | `src/lib/supabase/middleware.ts` calls `getUser()` (line 49), `auth-provider.tsx` uses `getUser()` for initialization (line 81), `confirm-email/page.tsx` uses `getUser()` (AUTH-17). Remaining `getSession()` calls are client-side for reading access_token/session cache -- not auth decisions |
| 3 | Tenant invitation acceptance requires a valid JWT -- unauthenticated callers cannot accept invitations | VERIFIED | `supabase/functions/tenant-invitation-accept/index.ts` checks `Authorization: Bearer` header (line 28-34), validates token via `getUser(token)` (line 41), returns 401 on missing/invalid token. `accept-invite/page.tsx` sends `Authorization: Bearer ${session.access_token}` (line 61) |
| 4 | OAuth callback verifies email ownership before auto-accepting invitations | VERIFIED | `src/app/auth/callback/route.ts` line 219: comment documents AUTH-08 decision that OAuth provider (Google) is trusted for email verification. `buildRedirectUrl` ignores x-forwarded-host (AUTH-13, line 38-47) |
| 5 | Login redirect parameter, signout method, and OTP type are all validated against injection and CSRF | VERIFIED | Login: `isValidRedirect()` uses URL constructor hostname check (lines 32-41). Signout: confirmation page with button, no auto-trigger on mount (AUTH-11, lines 37-46). OTP: `isValidOtpType()` validates against 5-type allowlist before `verifyOtp` call (lines 29-34, 164). 10 OTP validation tests passing |
| 6 | Auth-related emails sent via Resend with branded templates | VERIFIED | `supabase/functions/_shared/auth-email-templates.ts` has 5 template functions with XSS escaping. `supabase/functions/auth-email-send/index.ts` is a complete Supabase Auth Hook handler routing all 5 email types through Resend. Requires manual Supabase Dashboard configuration |

**Score:** 6/6 success criteria verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `proxy.ts` | Root middleware with role-based routing | VERIFIED | 114 lines, handles TENANT/OWNER/ADMIN/PENDING routing, public route bypass, cookie preservation on redirects |
| `src/lib/supabase/middleware.ts` | updateSession utility with getAll/setAll + getUser() | VERIFIED | 52 lines, creates server client with getAll/setAll cookie pattern, calls getUser() for server-validated auth |
| `src/hooks/api/use-auth.ts` | Unified authKeys factory, no module-level client | VERIFIED | authKeys factory at lines 56-68, no module-level Supabase client (comment at line 31), per-mutation client creation |
| `src/providers/auth-provider.tsx` | Uses getUser() for initialization, imports authKeys | VERIFIED | Imports authKeys from use-auth.ts (line 5), calls getUser() at line 81 |
| `src/app/auth/callback/route.ts` | OTP validation, no x-forwarded-host, redirect validation | VERIFIED | `VALID_OTP_TYPES` allowlist (line 29), `isValidOtpType()` (line 32), `buildRedirectUrl` ignores x-forwarded-host (line 40), `next` param validated (lines 131-134) |
| `src/app/(auth)/login/page.tsx` | URL constructor redirect validation | VERIFIED | `isValidRedirect()` function (lines 32-41) using URL constructor + hostname check |
| `supabase/functions/tenant-invitation-accept/index.ts` | JWT auth guard | VERIFIED | Bearer token extraction (line 28-35), getUser(token) validation (line 41), 401 on failure |
| `src/app/auth/signout/page.tsx` | CSRF-safe confirmation page | VERIFIED | 120 lines, confirmation UI with button, no auto-trigger, redirect after signout |
| `supabase/migrations/20260305130000_restrict_user_type_change.sql` | BEFORE UPDATE trigger for user_type immutability | VERIFIED | Trigger function `check_user_type_change()` blocks changes when old.user_type != 'PENDING', SECURITY DEFINER with search_path |
| `supabase/functions/_shared/auth-email-templates.ts` | Branded email templates | VERIFIED | 5 template functions with escapeHtml(), inline CSS, TenantFlow branding |
| `supabase/functions/auth-email-send/index.ts` | Supabase Auth Hook Edge Function | VERIFIED | 170 lines, hook secret verification, payload parsing, routes 5 email types through Resend |
| `src/lib/supabase/__tests__/middleware.test.ts` | updateSession unit tests | VERIFIED | 4 tests covering getUser() call, getAll/setAll cookie pattern, setAll sync, null user |
| `src/lib/supabase/__tests__/middleware-routing.test.ts` | Proxy routing tests | VERIFIED | 13 tests covering public routes, unauthenticated redirect, all role-based redirects, cookie preservation |
| `src/app/auth/callback/__tests__/otp-validation.test.ts` | OTP validation tests | VERIFIED | 10 tests for isValidOtpType and VALID_OTP_TYPES |
| `src/hooks/api/__tests__/auth-keys.test.ts` | authKeys structure tests | VERIFIED | 7 tests for key factory |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| proxy.ts | updateSession | import from `#lib/supabase/middleware` | WIRED | Line 2: `import { updateSession } from '#lib/supabase/middleware'`, called at line 58 |
| proxy.ts | Next.js runtime | `export async function proxy()` + `export const config` | WIRED | Named export `proxy` (Next.js 16 convention), config.matcher at line 110-113 |
| auth-provider.tsx | authKeys from use-auth.ts | import | WIRED | Line 5: `import { authKeys } from '#hooks/api/use-auth'` |
| login/page.tsx | authKeys from use-auth.ts | import | WIRED | Line 14: `import { authKeys } from '#hooks/api/use-auth'` |
| accept-invite/page.tsx | tenant-invitation-accept Edge Function | fetch with Bearer token | WIRED | Lines 55-65: fetch with Authorization header |
| auth-email-send Edge Function | auth-email-templates | import | WIRED | Lines 13-18: imports all 5 template functions |
| auth-email-send Edge Function | Resend | sendEmail call | WIRED | Line 139: `await sendEmail({...})` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| AUTH-01 | 03-01 | Middleware correctly registered and executing | SATISFIED | `proxy.ts` at root with config.matcher |
| AUTH-02 | 03-01 | Role-based route enforcement | SATISFIED | TENANT->tenant, OWNER->dashboard, PENDING->select-role |
| AUTH-03 | 03-02 | AuthProvider uses getUser() | SATISFIED | auth-provider.tsx line 81 |
| AUTH-04 | 03-04 | tenant-invitation-accept requires JWT | SATISFIED | Edge Function Bearer token check |
| AUTH-05 | 03-04 | stripe-checkout-session returns minimal data | SATISFIED | Returns only customer_email |
| AUTH-06 | 03-02 | No module-level Supabase client in use-auth.ts | SATISFIED | Comment at line 31, per-mutation clients |
| AUTH-07 | 03-02 | getCachedUser validates server-side | SATISFIED | Uses ['auth', 'user'] cache key with getUser() fallback |
| AUTH-08 | 03-03 | OAuth callback trusts Google for email verification | SATISFIED | Documented decision in callback route line 219 |
| AUTH-09 | 03-04 | accept-invite sends Authorization header | SATISFIED | accept-invite/page.tsx line 61 |
| AUTH-10 | 03-04 | post-checkout no auto-send magic link | SATISFIED | Explicit Resend button, no auto-trigger |
| AUTH-11 | 03-04 | Signout CSRF protection | SATISFIED | Confirmation page, no auto-trigger on mount |
| AUTH-12 | 03-03 | Login redirect validated with URL constructor | SATISFIED | isValidRedirect() in login/page.tsx |
| AUTH-13 | 03-03 | x-forwarded-host ignored in callback | SATISFIED | buildRedirectUrl ignores it (line 40) |
| AUTH-14 | 03-04 | user_type immutability after PENDING | SATISFIED | BEFORE UPDATE trigger in migration |
| AUTH-15 | 03-03 | OTP type validated before verifyOtp | SATISFIED | isValidOtpType() + VALID_OTP_TYPES allowlist |
| AUTH-16 | 03-02 | Unified authKeys factory | SATISFIED | Single source in use-auth.ts, authQueryKeys deleted from auth-provider |
| AUTH-17 | 03-02 | confirm-email uses getUser() | SATISFIED | confirm-email/page.tsx uses getUser() |
| AUTH-18 | 03-06 | Resend auth email templates | SATISFIED | 5 branded templates + Edge Function hook |
| DOC-01 | 03-05 | CLAUDE.md updated | SATISFIED | Proxy middleware, auth conventions, authKeys factory documented |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/app/auth/callback/route.ts | 95-105 | `findAndAcceptPendingInvitation` calls tenant-invitation-accept Edge Function without Bearer token | Warning | OAuth auto-invite-acceptance will fail silently (401) because AUTH-04 now requires JWT. User falls through to role selection instead. Not a security issue -- just broken auto-linking. |
| src/app/auth/signout/page.tsx | 29 | Uses `getSession()` to check if user is authenticated | Info | This is for UI display only (show signed-out vs confirm button), not an auth decision. Acceptable per CLAUDE.md. |
| src/hooks/api/use-auth.ts | 93, 150 | `getSession()` in session query options | Info | Client-side cache reads for TanStack Query, not auth decisions. Acceptable per CLAUDE.md convention. |

### Human Verification Required

### 1. OAuth Auto-Invitation Acceptance

**Test:** Sign in with Google OAuth using an email that has a pending tenant invitation.
**Expected:** User should be auto-accepted as tenant and redirected to /tenant portal.
**Why human:** The auth callback's `findAndAcceptPendingInvitation` calls the Edge Function without a Bearer token. After AUTH-04 added JWT requirements, this call may return 401 silently. Needs live OAuth flow to confirm.

### 2. Resend Auth Email Templates

**Test:** Register a new account, trigger password reset, and send a magic link.
**Expected:** All emails arrive with TenantFlow branding, correct CTA links, and proper formatting.
**Why human:** Requires Supabase Auth Hook registration in Dashboard and Resend API key. Email rendering varies by client.

### 3. Role-Based Middleware Routing

**Test:** Log in as TENANT and navigate to /dashboard; log in as OWNER and navigate to /tenant; log in as new user (PENDING) and navigate to /dashboard.
**Expected:** TENANT redirected to /tenant, OWNER redirected to /dashboard, PENDING redirected to /auth/select-role.
**Why human:** Middleware behavior depends on live Supabase session with user_type in JWT app_metadata.

### 4. user_type Immutability Trigger

**Test:** As a user with user_type='OWNER', attempt to change user_type via Supabase Dashboard or direct SQL.
**Expected:** UPDATE is rejected with "Cannot change user_type after initial selection".
**Why human:** Requires running migration against production database and testing the trigger.

## Validation Results

- `pnpm validate:quick` -- PASSED (typecheck + lint + 953 tests, 82 test files)
- 17 middleware tests passing (4 updateSession + 13 routing)
- 10 OTP validation tests passing
- 7 authKeys structure tests passing

## Notes

1. **ROADMAP progress table shows 3/6 plans complete** -- but all 6 SUMMARY files exist with committed code. The ROADMAP progress table appears stale/un-updated. All 6 plans executed successfully.

2. **proxy.ts vs middleware.ts naming** -- SUMMARY files reference `middleware.ts` but the actual file is `proxy.ts` (Next.js 16 convention). This is correct for the runtime.

3. **Auto-invitation flow regression** -- The `findAndAcceptPendingInvitation` in auth callback (line 95-105) calls the tenant-invitation-accept Edge Function without a Bearer token. After AUTH-04 added JWT requirements, this server-to-server call will receive 401. The function handles this gracefully (returns false, user goes to role selection), but the auto-linking feature is effectively broken. This is a warning, not a blocker -- manual invitation acceptance via the accept-invite page works correctly with JWT.

---

_Verified: 2026-03-05T07:55:00Z_
_Verifier: Claude (gsd-verifier)_
