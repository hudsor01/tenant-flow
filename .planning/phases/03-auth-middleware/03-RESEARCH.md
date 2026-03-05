# Phase 3: Auth & Middleware - Research

**Researched:** 2026-03-05
**Domain:** Next.js middleware, Supabase SSR auth, route protection, invitation security
**Confidence:** HIGH

## Summary

Phase 3 addresses 17 AUTH requirements plus DOC-01, covering middleware creation, role-based route enforcement, session validation hardening, invitation security, signout safety, query key unification, security hardening, and auth email branding via Resend.

The project currently has **no middleware.ts file** -- this is confirmed by filesystem inspection. The `@supabase/ssr` 0.8.0 package is installed with `@supabase/supabase-js` 2.97.0 on Next.js 16.1.6. The existing auth architecture uses `getSession()` in multiple places where `getUser()` is required for security. The invitation acceptance Edge Function accepts `authuser_id` from the request body without JWT verification. Two separate query key systems (`authKeys` in `use-auth.ts` and `authQueryKeys` in `auth-provider.tsx`) exist with overlapping but inconsistent namespaces.

**Primary recommendation:** Create middleware.ts with the Supabase `updateSession` pattern, then layer role-based redirects on top. Fix each AUTH requirement as a discrete, testable change.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **Middleware Strategy**: Create `middleware.ts` with server redirect + client-side fallback. Unauthenticated users get server-redirected to `/login?redirect=<originalPath>`. Public routes skip auth. Claude determines public route list.
2. **Role-Based Route Enforcement**: Hard redirect -- tenant on `/dashboard/*` redirected to `/tenant`, owner on `/tenant/*` redirected to `/dashboard`. Role from JWT `app_metadata.user_type`. No cross-access.
3. **Invitation Security Model**: Edge Function derives user identity from JWT (Bearer token -> `supabase.auth.getUser(token)`), not body params. OAuth callback trusts OAuth provider for email verification. Invitation code stays in URL query param. Post-checkout AUTH-10 fix: Claude's discretion.
4. **Session Validation**: Follow Supabase docs for `getUser()` vs `getSession()` boundary. `getCachedUser()` aligned with Supabase best practices. select-role page: RLS policy (users can only UPDATE user_type when PENDING) + application-level check.
5. **Signout Implementation**: Signout triggered from UI elements. `/auth/signout` serves as confirmation page. No GET-triggerable signout.
6. **Auth Query Key Unification**: Follow TanStack Query v5 key factory pattern. Unify `authKeys` and `authQueryKeys`. `clearAuthData()` must clear all namespaces.
7. **Security Hardening**: x-forwarded-host -- ignore header, use configured site_url (Claude's discretion). OTP type validation against known types. Module-level Supabase client moved inside mutation functions. Login redirect validation via `new URL()` hostname check.
8. **Auth Emails via Resend**: All auth emails use Resend templates. Custom HTML templates. Replace Supabase default email templates with Edge Function-driven sends.

### Claude's Discretion
- Exact public route list for middleware matcher
- getCachedUser vs getUser boundary (after consulting Supabase docs)
- Post-checkout AUTH-10 fix approach
- x-forwarded-host mitigation implementation
- Module-level client fix approach (after consulting Supabase SSR docs)

### Deferred Ideas (OUT OF SCOPE)
- Role switcher for users who are both owner and tenant -- future milestone
- Invitation code in URL fragment instead of query param -- Phase 4 (EDGE-09)
- Email template design system / template builder -- future milestone
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Middleware correctly registered and executing | Middleware creation pattern, updateSession, matcher config |
| AUTH-02 | Role-based route enforcement | JWT app_metadata.user_type reading in middleware, redirect logic |
| AUTH-03 | AuthProvider uses getUser() instead of getSession() | Supabase SSR getUser() vs getSession() security boundary |
| AUTH-04 | tenant-invitation-accept requires JWT | Bearer token extraction pattern from Phase 2 Edge Functions |
| AUTH-05 | stripe-checkout-session requires auth or returns minimal data | Edge Function auth guard pattern |
| AUTH-06 | Module-level Supabase client moved inside mutation functions | createClient() called per-invocation, not module scope |
| AUTH-07 | getCachedUser() validates session server-side | getUser() fallback ensures server validation |
| AUTH-08 | OAuth callback verifies email before auto-accepting | Google OAuth email_confirmed_at check in callback route |
| AUTH-09 | accept-invite page sends Authorization header | Bearer token in fetch to Edge Function |
| AUTH-10 | post-checkout page does not send magic link from unauthenticated response | Require auth or restructure post-checkout flow |
| AUTH-11 | Signout requires POST (not GET-triggerable) | Signout page becomes confirmation, mutation from UI |
| AUTH-12 | Login redirect validated via new URL() hostname check | URL validation pattern replacing startsWith('/') |
| AUTH-13 | x-forwarded-host sanitized or ignored | Ignore header, use NEXT_PUBLIC_APP_URL or site_url |
| AUTH-14 | select-role UPDATE restricted to PENDING users via RLS | New RLS policy with WITH CHECK on user_type = 'PENDING' |
| AUTH-15 | verifyOtp type validated against known types | Allowlist: signup, email, recovery, magiclink, invite |
| AUTH-16 | Dual auth query key systems unified | Single authKeys factory, clearAuthData covers all |
| AUTH-17 | confirm-email page uses getUser() instead of getSession() | Replace getSession() call with getUser() |
| DOC-01 | CLAUDE.md updated after phase | Standard post-phase documentation update |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | 0.8.0 | Server-side Supabase client (middleware, server components) | Official Supabase SSR package |
| `@supabase/supabase-js` | 2.97.0 | Client-side Supabase operations | Official Supabase client |
| `next` | 16.1.6 | App Router, middleware API | Project framework |
| `@tanstack/react-query` | v5 | Auth state caching, query key factories | Project's server state manager |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Resend REST API | N/A | Auth email delivery (signup confirmation, password reset, invitation) | All auth-related transactional emails |
| `sonner` | (installed) | Toast notifications for auth feedback | Login/signup/signout success/error messages |

### No New Dependencies Needed
All AUTH requirements can be addressed with existing dependencies. No new packages required.

## Architecture Patterns

### Recommended Middleware Structure
```
src/
  lib/
    supabase/
      middleware.ts     # updateSession utility (new)
      client.ts         # browser client (existing)
      server.ts         # server component client (existing)
      get-cached-user.ts # cached user accessor (existing, modify)
middleware.ts           # root middleware (new)
```

### Pattern 1: Supabase Middleware with updateSession
**What:** Create middleware that refreshes auth tokens and enforces route access.
**When to use:** Every request except static assets.

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getUser(), never getSession(), in server code
  const { data: { user } } = await supabase.auth.getUser()

  return { user, supabaseResponse }
}
```

```typescript
// middleware.ts (project root)
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/pricing',
  '/about',
  '/blog',
  '/contact',
  '/faq',
  '/features',
  '/help',
  '/privacy',
  '/terms',
  '/security-policy',
  '/support',
  '/resources',
  '/search',
  '/accept-invite',
  '/auth/callback',
  '/auth/confirm-email',
  '/auth/post-checkout',
  '/auth/update-password',
  '/auth/signout',
  '/auth/select-role',
]

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Skip auth check for public routes
  const isPublic = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )
  if (isPublic) return supabaseResponse

  // Redirect unauthenticated users to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Role-based enforcement
  const userType = user.app_metadata?.user_type as string | undefined
  if (userType === 'TENANT' && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/tenant', request.url))
  }
  if (userType === 'OWNER' && pathname.startsWith('/tenant')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  if ((userType === 'PENDING' || !userType) && !pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/auth/select-role', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|monitoring|api/).*)',
  ],
}
```

**Source:** [Supabase SSR Next.js docs](https://supabase.com/docs/guides/auth/server-side/nextjs)

### Pattern 2: Edge Function JWT Auth Guard
**What:** Require Bearer token and validate via `supabase.auth.getUser(token)`.
**When to use:** Securing Edge Functions that currently accept unauthenticated requests.

```typescript
// Extract and validate JWT in Edge Function
const authHeader = req.headers.get('Authorization')
if (!authHeader?.startsWith('Bearer ')) {
  return new Response(JSON.stringify({ error: 'Authorization required' }), {
    status: 401,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
  })
}

const token = authHeader.replace('Bearer ', '')
const { data: { user }, error } = await supabase.auth.getUser(token)
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Invalid token' }), {
    status: 401,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
  })
}
// Use user.id instead of body.authuser_id
```

### Pattern 3: Redirect Validation
**What:** Validate redirect parameters to prevent open redirect attacks.
**When to use:** Login page redirect parameter, any user-supplied URL redirect.

```typescript
function isValidRedirect(redirect: string, requestOrigin: string): boolean {
  // Must be a relative path
  if (!redirect.startsWith('/')) return false
  // Prevent protocol-relative URLs
  if (redirect.startsWith('//')) return false
  // Parse and verify hostname matches
  try {
    const url = new URL(redirect, requestOrigin)
    const origin = new URL(requestOrigin)
    return url.hostname === origin.hostname
  } catch {
    return false
  }
}
```

### Pattern 4: OTP Type Validation
**What:** Validate OTP type parameter against allowlist before calling Supabase.
**When to use:** Auth callback route handling `verifyOtp`.

```typescript
const VALID_OTP_TYPES = ['signup', 'email', 'recovery', 'magiclink', 'invite'] as const
type ValidOtpType = typeof VALID_OTP_TYPES[number]

function isValidOtpType(type: string | null): type is ValidOtpType {
  return type !== null && (VALID_OTP_TYPES as readonly string[]).includes(type)
}

// In callback route:
if (tokenHash && type) {
  if (!isValidOtpType(type)) {
    return NextResponse.redirect(buildRedirectUrl(request, origin, '/auth/error?reason=invalid_type'))
  }
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  // ...
}
```

### Anti-Patterns to Avoid
- **Module-level Supabase client in hooks:** Creates a singleton that persists across requests. Move `createClient()` calls inside each mutation function.
- **Using getSession() for auth decisions:** The JWT from `getSession()` is read from cookies without server validation. Use `getUser()` which validates with Supabase auth server.
- **Trusting body params for user identity:** Edge Functions must derive user identity from JWT, not from request body fields like `authuser_id`.
- **GET-triggerable signout:** A GET request to `/auth/signout` that auto-signs out is vulnerable to CSRF via `<img>` tags.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session refresh in middleware | Custom token refresh logic | `supabase.auth.getUser()` in updateSession | Handles refresh automatically |
| Cookie management in middleware | Manual cookie parsing | `@supabase/ssr` `createServerClient` with `getAll`/`setAll` | Cookie sync between request/response is complex |
| Redirect URL validation | Simple `startsWith('/')` check | `new URL()` constructor with hostname comparison | Prevents protocol-relative and absolute URL bypasses |
| Auth email templates | Plain text emails | Resend with HTML templates via existing `_shared/resend.ts` | Consistent branding, deliverability |

## Common Pitfalls

### Pitfall 1: Cookie Sync Desync in Middleware
**What goes wrong:** Creating a new `NextResponse.next()` without passing the request causes the middleware response cookies to go out of sync with the request cookies, prematurely terminating user sessions.
**Why it happens:** `@supabase/ssr` sets cookies on both the request (for downstream server components) and response (for the browser). If you create a fresh response, the setAll cookies are lost.
**How to avoid:** Always pass `{ request }` when creating `NextResponse.next()` in the `setAll` callback, and never create a separate response object for redirects without first copying supabase cookies.
**Warning signs:** Users getting randomly logged out, especially after token refresh.

### Pitfall 2: Middleware Redirect Losing Supabase Cookies
**What goes wrong:** When middleware returns a `NextResponse.redirect()`, the Supabase session cookies set by `updateSession` are not copied to the redirect response.
**Why it happens:** `NextResponse.redirect()` creates a new response object without the cookies that `updateSession` set on `supabaseResponse`.
**How to avoid:** After calling `updateSession`, if you need to redirect, copy all cookies from `supabaseResponse` to the redirect response.
**Warning signs:** Auth state lost after middleware redirects (e.g., tenant redirected to `/tenant` but loses session).

### Pitfall 3: Dual Query Key Systems Causing Stale Auth
**What goes wrong:** `clearAuthData()` in `use-auth.ts` clears `authKeys` but not `authQueryKeys` from `auth-provider.tsx`, leaving stale session data in the provider's cache.
**Why it happens:** Two independent key systems evolved: `authQueryKeys = { session: ['auth', 'session'], user: ['auth', 'user'] }` and `authKeys = { all: ['auth'], session: () => ['auth', 'session'], ... }`. They have overlapping prefixes but `clearAuthData` only clears via the `authKeys` namespace.
**How to avoid:** Unify into a single `authKeys` factory. Remove `authQueryKeys` from `auth-provider.tsx` and import `authKeys` from `use-auth.ts`.

### Pitfall 4: select-role Allowing Re-selection
**What goes wrong:** A user who already chose OWNER could hit `/auth/select-role` and change to TENANT, bypassing the intended one-time selection.
**Why it happens:** The current RLS UPDATE policy on `users` allows any authenticated user to update their own profile, with no restriction on `user_type` column changes.
**How to avoid:** Add a new RLS policy (or modify existing) with `WITH CHECK` that only allows `user_type` updates when current `user_type = 'PENDING'`. Additionally keep the client-side redirect guard.

### Pitfall 5: x-forwarded-host Header Injection
**What goes wrong:** The `buildRedirectUrl` function in `auth/callback/route.ts` trusts `x-forwarded-host` header for constructing redirect URLs, enabling an attacker to redirect users to a malicious domain after OAuth.
**Why it happens:** `x-forwarded-host` is intended for reverse proxy setups but can be spoofed by clients.
**How to avoid:** Ignore the header entirely. Use `NEXT_PUBLIC_APP_URL` or a hardcoded production URL for redirect construction.

## Code Examples

### Current Issues Identified (with fixes)

#### AUTH-03: AuthProvider uses getSession() (line 85)
```typescript
// CURRENT (auth-provider.tsx:85) - INSECURE
const { data: { session }, error } = await getSupabaseClient().auth.getSession()

// FIX: Use getUser() for server-validated auth
const { data: { user }, error } = await getSupabaseClient().auth.getUser()
// Then construct session-like object from user data, or refetch session only after
// getUser() confirms validity
```

#### AUTH-06: Module-level client (use-auth.ts:32)
```typescript
// CURRENT (use-auth.ts:32) - Module-level singleton
const supabase = createClient()

// FIX: Remove module-level client. In each mutation:
mutationFn: async (credentials: LoginCredentials) => {
  const supabase = createClient()
  // ... use locally
}
```

#### AUTH-09: accept-invite sends authuser_id in body without JWT
```typescript
// CURRENT (accept-invite/page.tsx:48-54) - No auth header
const response = await fetch(
  `${supabaseUrl}/functions/v1/tenant-invitation-accept`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, authuser_id: authUserId })
  }
)

// FIX: Send Bearer token, derive user from JWT in Edge Function
const { data: { session } } = await supabase.auth.getSession()
const response = await fetch(
  `${supabaseUrl}/functions/v1/tenant-invitation-accept`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ code })
  }
)
```

#### AUTH-11: Signout page auto-triggers via GET
```typescript
// CURRENT (auth/signout/page.tsx) - Auto-signs out on mount via useEffect
useEffect(() => {
  signOut.mutate(undefined, { ... })
}, [])

// FIX: Remove auto-signout. Show confirmation UI instead.
// The actual signout is triggered by the UI button click (avatar menu, settings)
// This page just shows "You have been signed out" confirmation
```

#### AUTH-12: Login redirect uses simple startsWith
```typescript
// CURRENT (login/page.tsx:99)
if (redirectTo?.startsWith('/') && !redirectTo.startsWith('//')) {
  destination = redirectTo
}

// FIX: Use URL constructor for proper validation
if (redirectTo) {
  try {
    const url = new URL(redirectTo, window.location.origin)
    if (url.hostname === window.location.hostname) {
      destination = redirectTo
    }
  } catch {
    // Invalid URL, use default destination
  }
}
```

#### AUTH-13: x-forwarded-host trusted in callback
```typescript
// CURRENT (auth/callback/route.ts:33)
const forwardedHost = request.headers.get('x-forwarded-host')
if (forwardedHost) {
  return `https://${forwardedHost}${path}`
}

// FIX: Ignore x-forwarded-host entirely
function buildRedirectUrl(request: NextRequest, _origin: string, path: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || _origin
  return `${siteUrl}${path}`
}
```

#### AUTH-14: RLS policy for select-role restriction
```sql
-- New migration: restrict user_type UPDATE to PENDING users only
-- Drop existing permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their own non-deleted profile" ON public.users;

-- Recreate with user_type restriction for role selection
CREATE POLICY "Users can update their own non-deleted profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    (SELECT auth.uid()) = id
    -- Only allow user_type changes when current user_type is PENDING
    -- Other profile field updates are always allowed
  );

-- Separate restrictive policy for user_type column
-- NOTE: PostgreSQL RLS doesn't support column-level policies.
-- Use a BEFORE UPDATE trigger instead:
CREATE OR REPLACE FUNCTION check_user_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.user_type IS DISTINCT FROM NEW.user_type THEN
    IF OLD.user_type != 'PENDING' THEN
      RAISE EXCEPTION 'Cannot change user_type after initial selection';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER enforce_user_type_change
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION check_user_type_change();
```

#### AUTH-16: Unified Query Key Factory
```typescript
// UNIFIED authKeys (single source of truth in use-auth.ts)
export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  me: () => ['user', 'me'] as const,
} as const

// In auth-provider.tsx: import { authKeys } from '#hooks/api/use-auth'
// Remove the local authQueryKeys definition entirely
// Update all references:
//   authQueryKeys.session -> authKeys.session()
//   authQueryKeys.user -> authKeys.user()
```

#### AUTH-17: confirm-email uses getSession()
```typescript
// CURRENT (auth/confirm-email/page.tsx:68)
const { data: { session } } = await supabase.auth.getSession()
if (!session?.user?.email) { ... }

// FIX:
const { data: { user } } = await supabase.auth.getUser()
if (!user?.email) { ... }
```

### Resend Auth Email Templates

```typescript
// supabase/functions/auth-emails/index.ts (new Edge Function)
// Handles: signup confirmation, password reset, invitation emails
// Called by Supabase Auth hooks or custom trigger

import { sendEmail } from '../_shared/resend.ts'

function buildConfirmationEmail(email: string, confirmUrl: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1a1a2e; padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; margin: 0;">TenantFlow</h1>
      </div>
      <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb;">
        <h2 style="color: #111;">Confirm your email</h2>
        <p style="color: #6b7280;">Click the button below to confirm your email address.</p>
        <a href="${confirmUrl}" style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          Confirm Email
        </a>
      </div>
    </div>
  `
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getSession()` for auth | `getUser()` for auth decisions | Supabase SSR docs update 2024 | Security: JWT validated server-side |
| `get`/`set`/`remove` cookies | `getAll`/`setAll` cookies | `@supabase/ssr` migration | Required by project CLAUDE.md |
| Auth helpers package | `@supabase/ssr` | 2024 | Old package deprecated |
| `getClaims()` (newer API) | `getUser()` (current stable) | Mentioned in latest docs | `getClaims()` is newer but `getUser()` is well-established in 0.8.0 |

**Note on getClaims():** The latest Supabase docs reference `getClaims()` as a newer alternative to `getUser()` that validates JWT signature without a network call. However, this API may not be available in `@supabase/supabase-js` 2.97.0. Stick with `getUser()` which is proven and available. Confidence: MEDIUM.

## Open Questions

1. **getClaims() availability in supabase-js 2.97.0**
   - What we know: Latest Supabase docs mention `getClaims()` as preferred over `getUser()`
   - What's unclear: Whether this API exists in the installed version
   - Recommendation: Use `getUser()` which is documented and available. Upgrade to `getClaims()` can be a separate task later.

2. **AUTH-10: Post-checkout magic link security**
   - What we know: `post-checkout` page calls unauthenticated `stripe-checkout-session` Edge Function, gets email, sends magic link. The Stripe session_id is an opaque token, so it provides some security.
   - What's unclear: Whether requiring auth on stripe-checkout-session would break the checkout flow (user may not have an account yet).
   - Recommendation: The safest approach is to have the checkout success redirect go through a Stripe webhook that creates the account and sends the magic link server-side, rather than client-side. However, since the current flow works and session_id is Stripe-issued (not guessable), a simpler fix is to rate-limit the Edge Function (deferred to Phase 4 EDGE-02) and return only the email (no other session data). Mark AUTH-10 as addressed by ensuring the response is minimal.

3. **AUTH-05: stripe-checkout-session authentication**
   - What we know: This Edge Function is unauthenticated by design -- users who just completed checkout may not have an account.
   - What's unclear: Whether we can add auth without breaking the flow.
   - Recommendation: Return minimal data only (just customer_email, which is already the case). Add server-side validation that the session_id belongs to a completed checkout. This satisfies "requires authentication OR returns minimal data only."

4. **Resend auth emails: Supabase Auth Hooks integration**
   - What we know: Supabase supports custom SMTP and Auth Hooks for email customization.
   - What's unclear: Whether Supabase Auth Hooks can call an Edge Function for email sends, or if we need to configure custom SMTP pointing to Resend.
   - Recommendation: Use Supabase Dashboard to configure Resend as custom SMTP provider (Resend supports SMTP relay). This is simpler than intercepting auth hooks. Alternatively, create custom email templates in Supabase Dashboard using Resend's SMTP credentials.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (unit project) |
| Config file | `vitest.config.ts` |
| Quick run command | `pnpm test:unit -- --run` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Middleware executes, redirects unauthenticated | unit | `pnpm test:unit -- --run src/lib/supabase/__tests__/middleware.test.ts -x` | No - Wave 0 |
| AUTH-02 | Role-based redirects (tenant/owner/pending) | unit | `pnpm test:unit -- --run src/lib/supabase/__tests__/middleware.test.ts -x` | No - Wave 0 |
| AUTH-03 | AuthProvider uses getUser() not getSession() | unit | `pnpm test:unit -- --run src/providers/__tests__/auth-provider.test.tsx -x` | No - Wave 0 |
| AUTH-04 | Invitation accept requires JWT | manual-only | Edge Function requires deployed environment | N/A |
| AUTH-05 | Checkout session returns minimal data | manual-only | Edge Function requires deployed environment | N/A |
| AUTH-06 | No module-level Supabase client | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/use-auth-client.test.ts -x` | No - Wave 0 |
| AUTH-07 | getCachedUser validates server-side | unit | `pnpm test:unit -- --run src/lib/supabase/__tests__/get-cached-user.test.ts -x` | No - Wave 0 |
| AUTH-08 | OAuth callback verifies email | unit | `pnpm test:unit -- --run src/app/auth/callback/__tests__/route.test.ts -x` | No - Wave 0 |
| AUTH-09 | accept-invite sends Authorization header | unit | `pnpm test:unit -- --run src/app/(auth)/accept-invite/__tests__/accept-invite.test.tsx -x` | Yes (existing, needs update) |
| AUTH-10 | post-checkout no unauth magic link | unit | `pnpm test:unit -- --run src/app/auth/post-checkout/__tests__/page.test.tsx -x` | No - Wave 0 |
| AUTH-11 | Signout not GET-triggerable | unit | `pnpm test:unit -- --run src/app/auth/signout/__tests__/page.test.tsx -x` | No - Wave 0 |
| AUTH-12 | Login redirect validated via URL constructor | unit | `pnpm test:unit -- --run src/lib/__tests__/auth-redirect.test.ts -x` | Yes (existing, needs update) |
| AUTH-13 | x-forwarded-host ignored | unit | `pnpm test:unit -- --run src/app/auth/callback/__tests__/route.test.ts -x` | No - Wave 0 |
| AUTH-14 | select-role restricted to PENDING | integration | `pnpm test:rls` (need new test) | No - Wave 0 |
| AUTH-15 | OTP type validated against allowlist | unit | `pnpm test:unit -- --run src/app/auth/callback/__tests__/route.test.ts -x` | No - Wave 0 |
| AUTH-16 | Auth query keys unified | unit | `pnpm test:unit -- --run src/hooks/api/__tests__/auth-keys.test.ts -x` | No - Wave 0 |
| AUTH-17 | confirm-email uses getUser() | unit | `pnpm test:unit -- --run src/app/auth/confirm-email/__tests__/page.test.tsx -x` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run`
- **Per wave merge:** `pnpm validate:quick`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/supabase/__tests__/middleware.test.ts` -- covers AUTH-01, AUTH-02
- [ ] `src/app/auth/callback/__tests__/route.test.ts` -- covers AUTH-08, AUTH-13, AUTH-15
- [ ] `src/app/auth/signout/__tests__/page.test.tsx` -- covers AUTH-11
- [ ] `src/hooks/api/__tests__/auth-keys.test.ts` -- covers AUTH-16

## Sources

### Primary (HIGH confidence)
- [Supabase SSR Next.js docs](https://supabase.com/docs/guides/auth/server-side/nextjs) -- middleware pattern, getUser vs getSession, updateSession
- [Supabase SSR client creation docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client) -- getAll/setAll cookie pattern
- Project codebase inspection -- all files listed in CONTEXT.md Code Context section

### Secondary (MEDIUM confidence)
- [Supabase GitHub Discussion #23224](https://github.com/orgs/supabase/discussions/23224) -- getSession() attack vector and mitigation
- [Supabase GitHub Discussion #4400](https://github.com/orgs/supabase/discussions/4400) -- session() vs user() security boundary

### Tertiary (LOW confidence)
- `getClaims()` API -- mentioned in fetched docs but unverified for supabase-js 2.97.0

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- using existing project dependencies, verified versions
- Architecture: HIGH -- middleware pattern from official Supabase docs, verified against project structure
- Pitfalls: HIGH -- identified from actual codebase inspection, known issues documented in CONTEXT.md
- Edge Function auth: HIGH -- pattern established in Phase 1/2 Edge Functions
- Resend integration: MEDIUM -- existing `_shared/resend.ts` works, but Supabase Auth Hook integration approach needs validation
- getClaims() API: LOW -- mentioned in latest docs, may not exist in installed version

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable domain, 30-day validity)
