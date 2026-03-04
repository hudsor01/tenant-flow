# Phase 61: Auth Flow Completion - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can complete all authentication flows end-to-end — password reset via email link, email confirmation after signup, and Google OAuth with correct dashboard routing. No new auth methods are added; this completes the gaps in existing flows.

</domain>

<decisions>
## Implementation Decisions

### Password reset flow
- Reset page uses the full auth layout (same as login/signup pages with sidebar branding) — consistent look across all auth pages
- Page contains: new password field + confirm password field + submit button
- Password strength: use Supabase defaults (minimum 6 chars), no extra strength meter UI
- After successful reset: redirect to /login with success toast "Password reset successful. Please log in."
- Expired/invalid link: show error page with "This link has expired" message and a button to request a new reset email — clear recovery path

### Email confirmation page
- After signup, show a "check your email" page — Claude decides the exact layout and content
- Resend button: rate-limited with feedback — shows "Email sent!" after click, disables for 60 seconds, shows error if resend fails
- After clicking confirmation link in email: auto-login and redirect to appropriate dashboard based on user_type
- If user tries to log in before confirming email: block with redirect to the confirmation page with resend option

### Google OAuth routing
- "Continue with Google" button appears on BOTH login and signup pages
- After first Google OAuth signup (no user_type set): show a one-time screen asking "Are you a property owner or a tenant?" — then route to correct dashboard
- If a pending tenant invitation exists for the Google OAuth email: auto-link — set user_type to tenant and complete invitation flow automatically
- Returning Google OAuth users: route to their dashboard based on user_type (owner → /dashboard, tenant → /tenant)

### Claude's Discretion
- Pre-confirmation page design (content, layout, illustrations)
- Exact implementation of the "choose your role" screen after Google OAuth
- How to detect pending invitations during Google OAuth flow
- Password reset email template design (if customizable via Supabase)
- Error message wording and tone across all auth flows

</decisions>

<specifics>
## Specific Ideas

- The password reset page should match the existing login/signup pages with sidebar branding — visual consistency matters across all auth pages
- Auto-linking Google OAuth to pending tenant invitations prevents the awkward scenario where a tenant signs up with Google but can't find their invitation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 61-auth-flow-completion*
*Context gathered: 2026-02-27*
