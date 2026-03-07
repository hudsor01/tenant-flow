# Phase 3: Auth & Middleware — Context

## Phase Goal
Every route is protected by role-appropriate access control with server-validated sessions.

## Requirements in Scope
AUTH-01 through AUTH-17 + DOC-01

## Decisions

### 1. Middleware Strategy
**Decision**: Create `middleware.ts` with server redirect + client-side fallback. No middleware currently exists despite code comments claiming it does.
- Unauthenticated users hitting protected routes get server-redirected to `/login?redirect=<originalPath>` before the page loads
- Client-side auth checks remain as a safety net (belt and suspenders)
- Original URL preserved via `redirect` query param for post-login return
- Public routes (Claude to determine based on codebase — marketing, blog, pricing, auth routes) skip auth check entirely
**Applies to**: AUTH-01

### 2. Role-Based Route Enforcement
**Decision**: Hard redirect to correct portal. Strict separation between owner and tenant.
- Tenant hitting `/dashboard/*` → redirected to `/tenant`
- Owner hitting `/tenant/*` → redirected to `/dashboard`
- Role determined from JWT `app_metadata.user_type` in middleware
- No cross-access. If someone is both owner and tenant, explicit role switching is a future feature
**Applies to**: AUTH-02

### 3. Invitation Security Model
**Decision**: Follow Supabase docs exactly for invitation auth. Edge Function derives user identity from JWT (Bearer token → `supabase.auth.getUser(token)`), not from body params.
- OAuth callback trusts the OAuth provider for email verification (no extra `email_confirmed_at` check for Google OAuth)
- Invitation code stays in URL query param (single-use, industry standard). EDGE-09 (fragment migration) is Phase 4 scope
- Post-checkout page: Claude's discretion on how to close AUTH-10 without breaking checkout flow
**Applies to**: AUTH-04, AUTH-08, AUTH-09, AUTH-10

### 4. Session Validation
**Decision**: Follow Supabase docs exactly for `getUser()` vs `getSession()` boundary. Claude to fetch latest `@supabase/ssr` docs during research phase to determine the recommended pattern.
- `getCachedUser()` pattern: Claude to align with Supabase best practices
- select-role page: both RLS policy (users can only UPDATE user_type when PENDING) + application-level check for UX
**Applies to**: AUTH-03, AUTH-07, AUTH-14, AUTH-17

### 5. Signout Implementation
**Decision**: Signout is triggered from UI elements (avatar menu, settings). The `/auth/signout` page serves as a confirmation page showing a toast/message confirming the user has been signed out.
- The actual signout action happens via the mutation (supabase.auth.signOut) triggered from the UI button
- The signout page renders a confirmation UI, not an auto-trigger
- No GET-triggerable signout — the mutation is what performs the action
**Applies to**: AUTH-11

### 6. Auth Query Key Unification
**Decision**: Follow TanStack Query v5 docs for canonical query key pattern. Unify `authKeys` (use-auth.ts) and `authQueryKeys` (auth-provider.tsx) into a single system.
- Claude to fetch TanStack Query v5 docs during research to determine the recommended key factory pattern
- `clearAuthData()` must clear all namespaces consistently
**Applies to**: AUTH-16

### 7. Security Hardening
- **x-forwarded-host (AUTH-13)**: Use the most safe, secure, and performant method. Claude's discretion on implementation — likely ignore the header and use configured site_url
- **OTP type validation (AUTH-15)**: Validate type param against known types (signup, email, recovery, magiclink, invite) before calling Supabase. Show specific error page for invalid types. Better UX + avoids unnecessary network call
- **Module-level Supabase client (AUTH-06)**: Follow Supabase docs exactly for client instantiation pattern. Claude to check latest `@supabase/ssr` docs during research
- **Login redirect validation (AUTH-12)**: Use `new URL()` hostname check, not just `startsWith('/')`
**Applies to**: AUTH-06, AUTH-12, AUTH-13, AUTH-15

### 8. Auth Emails via Resend
**Decision**: All auth-related emails (confirmation, password reset, invitation) use Resend templates for a premium, branded email experience. Consistent with other transactional emails already sent via Resend.
- Existing Resend integration: `supabase/functions/_shared/resend.ts`
- Custom HTML templates for signup confirmation, password reset, and invitation emails
- Replace Supabase's default email templates with custom Edge Function-driven sends via Resend
**Applies to**: General quality improvement within auth flows

### Claude's Discretion
- Exact public route list for middleware matcher
- getCachedUser vs getUser boundary (after consulting Supabase docs)
- Post-checkout AUTH-10 fix approach
- x-forwarded-host mitigation implementation
- Module-level client fix approach (after consulting Supabase SSR docs)

## Code Context

### Reusable Assets
- `supabase/functions/_shared/resend.ts` — Existing Resend email helper, reuse for auth emails
- `src/lib/supabase/get-cached-user.ts` — getCachedUser with QueryClient ref pattern
- `src/hooks/api/use-auth.ts` — Comprehensive auth hooks (498 lines), mutations, cache management
- `src/providers/auth-provider.tsx` — Auth state provider with onAuthStateChange listener
- `src/app/auth/callback/route.ts` — OAuth + email confirmation callback handler (256 lines)
- `supabase/functions/tenant-invitation-accept/index.ts` — Invitation acceptance Edge Function
- `supabase/functions/tenant-invitation-validate/index.ts` — Invitation validation Edge Function

### Established Patterns
- Edge Functions: Bearer token extraction → `supabase.auth.getUser(token)` (Phase 2 pattern)
- SECURITY DEFINER RPCs: `auth.uid()` guard (Phase 1 pattern)
- Supabase auth: `getAll`/`setAll` cookie methods only (CLAUDE.md rule)
- Role detection: `user.app_metadata.user_type` (OWNER, TENANT, PENDING, ADMIN)

### Integration Points
- Middleware connects to: Next.js request pipeline, Supabase SSR cookie auth
- Auth provider connects to: TanStack QueryClient, Sentry user context
- Signout connects to: avatar menu component, settings page, auth query cache
- Resend connects to: Edge Function email sends, existing _shared/resend.ts

## Deferred Ideas
- Role switcher for users who are both owner and tenant — future milestone
- Invitation code in URL fragment instead of query param — Phase 4 (EDGE-09)
- Email template design system / template builder — future milestone
