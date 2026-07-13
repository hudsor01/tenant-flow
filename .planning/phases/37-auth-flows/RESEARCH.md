# Phase 37 Research — Auth Flows
_Fix-approach research + will-fix validation for AUTH-01..13. Source: .planning/audits/2026-07-11-full-audit.md_

## AUTH-01 — email_change links rejected by callback allowlist
- **Finding:** src/app/auth/callback/route.ts:7 (high) — `VALID_OTP_TYPES` omits `email_change`, so every email-change confirmation link built by `auth-email-send` (`/auth/callback?token_hash=…&type=email_change`, index.ts:104) bounces to `?error=invalid_type` → `/login?error=oauth_failed` and the address never changes.
- **Root cause:** The allowlist was written from the OTP types the callback happened to handle at the time, not from the full set the branded-email hook produces (`OTP_TYPE_MAP` in supabase/functions/auth-email-send/index.ts:46-52 has 5 entries incl. `email_change`). The success/error redirect switch (lines 82-112) has the same incomplete-enumeration defect (see AUTH-02) — this is one class-wide bug: the callback's type handling is not exhaustive over the producer's type set.
- **Fix:** Part of the ONE class-wide callback rewrite (covers AUTH-01, AUTH-02, AUTH-09):
  1. Add `"email_change"` to `VALID_OTP_TYPES` (now 6 entries; supabase-js `verifyOtp` accepts it — `EmailOtpType` includes `email_change`).
  2. Replace the ad-hoc success/failure branches with an exhaustive per-type redirect map keyed on `ValidOtpType` so TypeScript's `noImplicitReturns`/exhaustiveness makes future omissions impossible:
     - success `signup`/`email` → `/dashboard` (unchanged)
     - success `recovery` → `/auth/update-password` (unchanged)
     - success `email_change` → `/settings?email_change=confirmed`
     - failure `email_change` → `/settings?email_change=failed`
  3. **Secure-email-change nuance:** for `type === "email_change"` treat `!error` as success WITHOUT requiring `data.session` — when Supabase "Secure email change" is on (dashboard default), the first of the two confirmation clicks returns `session: null` with no error; gating on `data?.session` (current line 82) would falsely route a correct click to the error path.
  4. In `src/components/settings/general-settings.tsx` (owns the `updateEmail` mutation and its toasts), add a mount effect that reads `email_change=confirmed|failed` from the URL, fires `toast.success("Email address updated")` / `toast.error("Email change link expired or invalid — try again")`, and strips the param via `router.replace` (preserving other params). `/settings` is private, so a logged-out click round-trips through `/login?redirect=/settings?...` — after sign-in the toast still fires (AUTH-12 fix preserves the query).
  5. Update `src/app/auth/callback/__tests__/otp-validation.test.ts` (length 5 → 6, add `email_change` containment + acceptance cases).
- **Why it fixes it:** Verifier evidence is that `isValidOtpType` fails at line 71 for the exact `type=email_change` value the hook emits; adding the type makes `verifyOtp({ token_hash, type: "email_change" })` actually run, and the `!error`-based success branch lands the user on /settings with feedback, closing both the "never confirmed" and "zero feedback" halves of the defect.
- **Risks / interactions:** Same-file rewrite as AUTH-02/AUTH-09 — plan as one task. Toast effect in general-settings.tsx may collide with Phase 38 FORM if it touches the same component (FORM runs after AUTH, so FORM rebases on us — no blocker). Secure-email-change double-confirmation means the user sees "confirmed" after the first click while the second is still pending — the toast copy should say "confirmation accepted" semantics, or simply "Email change confirmed" (the second link completes it); low risk, copy-level only. No Edge Function change needed (auth-email-send already emits the right link).
- **Files touched:** src/app/auth/callback/route.ts, src/app/auth/callback/__tests__/otp-validation.test.ts, src/components/settings/general-settings.tsx
- **Decision:** Success target `/settings?email_change=confirmed` (where email is managed, new address immediately visible) over `/dashboard` (no feedback surface) — alternative recorded: redirect to `/dashboard` and rely on the header profile chip showing the new email; rejected because the defect explicitly includes "user gets zero feedback".

## AUTH-02 — successful magiclink/invite verification falls through to "link expired"
- **Finding:** src/app/auth/callback/route.ts:82 (high) — the success branch handles only `signup`/`email`/`recovery`; a SUCCESSFUL `magiclink`/`invite` `verifyOtp` (cookies already set) falls to line 106's redirect to `/auth/update-password#error=access_denied&…`, showing "Link Expired or Invalid" to a user who just logged in.
- **Root cause:** Same incomplete-enumeration defect as AUTH-01: the post-verify redirect switch enumerates 3 of the 5 (soon 6) allowlisted types; the fall-through error redirect doubles as the implicit "default" for types the author forgot.
- **Fix:** Covered by the same exhaustive per-type redirect map (class-wide fix, see AUTH-01):
  - success `magiclink` → `next` (the already-sanitized `next` param, default `/dashboard`) — the magic-link producer can then steer the landing page.
  - success `invite` → `/auth/update-password` — an invited user has a session but no password; the update-password form is the correct next step (AUTH-07's session check passes because cookies were just set).
  - failure `magiclink`/`invite` → `/login?error=link_expired` (new error code, surfaced by AUTH-04's login error mapping) instead of the recovery-specific `/auth/update-password#error=…` hash page.
- **Why it fixes it:** Verifier evidence is the fall-through at line 96→106 for verified magiclink/invite sessions; an exhaustive map has no fall-through, so a verified session always gets a success redirect and only genuine `verifyOtp` errors reach the type-appropriate error page.
- **Risks / interactions:** Same file/task as AUTH-01/AUTH-09. The only current magiclink producer (post-checkout "Resend Login Link") is deleted by AUTH-06 — the map entry stays because `signInWithOtp` remains a supported auth surface and the hook still renders magiclink emails. `invite` currently has no in-app producer (no `inviteUserByEmail` caller); handling it correctly is still required since the hook emails it.
- **Files touched:** src/app/auth/callback/route.ts (shared with AUTH-01/AUTH-09)
- **Decision:** invite success → `/auth/update-password` (set initial password; invited users are password-less) over `/dashboard` — alternative recorded: `/dashboard` treats invite like magiclink but strands the user with no password for future logins.

## AUTH-03 — confirm-email "Resend" requires a session its audience never has
- **Finding:** src/app/auth/confirm-email/page.tsx:62 (high) — `handleResendEmail` gates on `supabase.auth.getUser()`; both real entry routes (login "Email not confirmed" push at login/page.tsx:123, callback `invalid_token` redirect at route.ts:101) are sessionless, so the primary action always aborts with "Please sign up again or contact support."
- **Root cause:** The page assumes the visitor has an authenticated session to read the email from, but its traffic is by definition pre-confirmation (no session possible). The email address is known to the callers but never passed along, and there is no manual entry fallback. `auth.resend({ type: "signup", email })` needs no session — only the email is missing.
- **Fix:**
  1. `src/app/(auth)/login/page.tsx:123` → `router.push("/auth/confirm-email?email=" + encodeURIComponent(value.email))` — the login form knows the exact address that failed with "Email not confirmed".
  2. `src/app/auth/confirm-email/page.tsx`: resolve the resend address in priority order: (a) `searchParams.get("email")` (validated with a basic email-shape check), (b) `getUser()?.email` (kept as fallback for a logged-in-but-unconfirmed edge), (c) a controlled email `Input` rendered when neither is available. `handleResendEmail` then calls `supabase.auth.resend({ type: "signup", email: resolvedEmail })` directly — no session requirement.
  3. `src/app/auth/confirm-email/confirm-email-states.tsx`: extend `ConfirmEmailActions` with optional `email`/`onEmailChange`/`showEmailInput` props to render the fallback input (shadcn `Input` + label, above the resend button).
- **Why it fixes it:** Verifier evidence shows `getUser()` is null for effectively 100% of traffic; sourcing the email from the query param (login path) or user input (callback/error path) removes the dead dependency, and `resend` is documented session-free, so the button works for exactly the users the page exists for.
- **Risks / interactions:** Email in the query string is mildly PII-in-URL — acceptable (page is `noindex`-irrelevant, no external links except `mailto:`; same pattern the industry uses). Rate limiting is Supabase-side (resend is throttled per email) plus the existing 60s client cooldown. The callback error redirect (`/auth/confirm-email?error=invalid_token`) carries no email — the input fallback covers it; do NOT try to thread the email through the OTP link (it isn't in the token payload). No dependency on other phases.
- **Files touched:** src/app/(auth)/login/page.tsx, src/app/auth/confirm-email/page.tsx, src/app/auth/confirm-email/confirm-email-states.tsx

## AUTH-04 — login silently strips ?error=oauth_failed
- **Finding:** src/app/(auth)/login/page.tsx:55 (medium) — the mount effect does `router.replace("/login")` on `error === "oauth_failed"` without `setAuthError`/toast, so every failed OAuth exchange and callback fall-through renders a pristine form; the bare replace also drops sibling params (`redirect`).
- **Root cause:** The effect was written to clean the URL, not to surface the error — the error value is consumed and discarded, and the replace target hardcodes `/login` instead of reconstructing the remaining query.
- **Fix:** In the same mount effect:
  1. Define an error-code → message map: `oauth_failed` → "Sign-in failed. Your Google sign-in or sign-in link could not be completed — please try again.", `link_expired` → "Your sign-in link has expired or is invalid. Request a new one below.", `invalid_link` → "That sign-in link is invalid. Please request a new one." (the latter two are produced by the AUTH-02/AUTH-09 callback rewrite).
  2. On a recognized code: `setAuthError(map[code])`, then rebuild the URL preserving all OTHER params: `const params = new URLSearchParams(window.location.search); params.delete("error"); router.replace(params.size ? \`/login?\${params}\` : "/login")`.
- **Why it fixes it:** Verifier evidence is that the two `oauth_failed` sites strip without display and drop `redirect`; after the fix the user sees an inline auth error (the same `authError` surface `LoginForm` already renders) and `redirect` survives the URL cleanup, so a subsequent successful login still honors it.
- **Risks / interactions:** Must land with (or after) the AUTH-02/AUTH-09 callback rewrite so `link_expired`/`invalid_link` have a producer — plan the callback task before the login task in the same phase. React StrictMode double-effect: read the param before replacing so the second run (param already gone) is a no-op. No other component consumes `error` on /login (verified by grep).
- **Files touched:** src/app/(auth)/login/page.tsx

## AUTH-05 — post-checkout magic-link resend targets /dashboard, bypassing the callback
- **Finding:** src/app/auth/post-checkout/page.tsx:90 (medium) — `emailRedirectTo: ${origin}/dashboard` dead-ends against the proxy auth gate (`/dashboard` is private, no cookies on the verify redirect → bounced to `/login?code=…` where nothing exchanges the code).
- **Root cause:** Not the redirect target per se — the page itself is legacy from an unauthenticated-checkout architecture that no longer exists. `stripe-checkout` requires a Bearer JWT (`validateBearerAuth`, index.ts:43), so every buyer returning from Stripe already has an account and a session; a "magic-link login after purchase" page has no reachable audience, which is also why nothing links to it (see AUTH-06).
- **Fix:** Resolved by the AUTH-06 fix: delete `src/app/auth/post-checkout/page.tsx` entirely (one shared fix for AUTH-05 + AUTH-06). The defective `signInWithOtp` call is removed with the page. No other `signInWithOtp`/`emailRedirectTo`-to-private-route sibling exists in src (grep: the only other `emailRedirectTo` is owner-subscribe-dialog, handled by AUTH-11).
- **Why it fixes it:** The verifier's failure chain (verify → /dashboard → proxy bounce → stranded PKCE code) can no longer execute when neither the page nor its OTP call exists; the legitimate post-purchase return path becomes AUTH-08's allowlisted `/billing/checkout/success`.
- **Risks / interactions:** See AUTH-06 for the deletion risk analysis. If the Decision on AUTH-06 flips to "keep the page", THIS finding's fix becomes: `emailRedirectTo: ${window.location.origin}/auth/callback?next=/dashboard` (the callback handles both the PKCE `code` path via `next` and — with the hook active — the `magiclink` token_hash path via AUTH-02's map).
- **Files touched:** src/app/auth/post-checkout/page.tsx (deleted)
- **Decision:** Fix by deletion (with AUTH-06) rather than by retargeting the redirect — recorded alternative: keep the page and point `emailRedirectTo` at `/auth/callback?next=/dashboard`; rejected because the page's premise (session-less buyer) is impossible under the authenticated-checkout architecture.

## AUTH-06 — post-checkout page claims an email was sent that never is, and is orphaned
- **Finding:** src/app/auth/post-checkout/page.tsx:160 (medium) — renders "A login link has been sent to {email}" though nothing sends one (deliberate AUTH-10 no-auto-send design; `stripe-checkout-session` returns only `customer_email`; no webhook sends login mail), and the page is unreachable (success_url → /dashboard; only repo reference is the robots.ts disallow).
- **Root cause:** Dead legacy surface. The page was built for a flow where checkout completed without an account; today `stripe-checkout` authenticates the buyer up front, `success_url` goes to the app, and no producer ever navigates to `/auth/post-checkout`. The false "has been sent" copy is a symptom of the page having lost its sending flow without being retired.
- **Fix:** Delete the orphaned surface (root cause = the page's existence, not its copy):
  1. Delete `src/app/auth/post-checkout/page.tsx` (also resolves AUTH-05 — one shared fix).
  2. Remove the `"/auth/post-checkout"` entry from the disallow list in `src/app/robots.ts:17`.
  3. Do NOT delete the `stripe-checkout-session` Edge Function — it has live consumers (`subscription-verification-keys.ts` → `/pricing/success` + `/pricing/complete`).
- **Why it fixes it:** Verifier evidence establishes the page is orphaned and its promise is false; removing it eliminates both the lie and the dead code, and AUTH-08 gives the checkout return journey a real, allowlisted landing page (`/billing/checkout/success`).
- **Risks / interactions:** Anyone with a stale bookmarked `/auth/post-checkout` URL gets the standard 404 (`not-found.tsx`) — correct per the no-speculative-redirects rule. Verify no e2e test navigates to `/auth/post-checkout` before deletion (`grep -rn "post-checkout" tests/`). Interacts with AUTH-08 (the replacement landing page) — plan AUTH-08 in the same phase so the return journey is never pointing at a deleted page. Note: `/pricing/success` and `/pricing/complete` expect response shapes (`subscription`, session status) that `stripe-checkout-session` does not return — that mismatch is Phase 36 BILL territory; do not "fix" it here, only avoid breaking those consumers.
- **Files touched:** src/app/auth/post-checkout/page.tsx (deleted), src/app/robots.ts
- **Decision:** Delete rather than rehabilitate — recorded alternative: keep the page, change copy to "Click below to receive a sign-in link" (send-on-demand), fix AUTH-05's redirect, and point success_url here; rejected because the buyer is always authenticated post-checkout (Bearer-gated checkout), making a magic-link login page architecturally dead and conflicting with AUTH-08's purpose-built `/billing/checkout/success`.

## AUTH-07 — update-password shows the form without verifying a recovery session
- **Finding:** src/app/auth/update-password/page.tsx:43 (medium) — `useResetTokenStatus` marks the page "valid" on any clean URL hash; a session-less visitor (cross-device link open, direct navigation) gets the full form and only learns of failure via the raw "Auth session missing!" toast after submitting.
- **Root cause:** The validity check tests only for the PRESENCE of an error signal (Supabase's `#error=` hash) instead of the presence of the thing the form needs (an authenticated recovery session). Absence of an error is not proof of a session.
- **Fix:** Make `useResetTokenStatus` session-aware:
  1. Keep the existing hash-error parse (it correctly catches expired-link redirects from the callback and Supabase's verify endpoint).
  2. When the hash is clean, stay in `"loading"` and call `createClient().auth.getUser()`; on `user` → `"valid"`, on null → `"error"` with message "Open the password reset link on this device, or request a new one below." (`ExpiredLinkContent` already renders the "Request New Reset Link" modal — the recovery path exists, it's just unreachable today).
  3. Guard the async set with an `ignore` flag (same pattern as login/page.tsx:64-104).
- **Why it fixes it:** Verifier evidence is "no getUser()/session check exists anywhere" on this page; adding the check routes exactly the session-less population (the ones who would hit "Auth session missing!") to `ExpiredLinkContent` BEFORE they type a password, while the legitimate flow (callback verified the OTP and set cookies server-side, then redirected here) passes `getUser()` immediately.
- **Risks / interactions:** AUTH-02 sends successful `invite` verifications here — those have fresh cookies, so `getUser()` passes (compatible). The authenticated password-change surface in settings does not use this page (separate `changePassword` mutation). `getUser()` makes a network round-trip on every page view — acceptable for a rare, security-sensitive page. Do not use `getSession()` (CLAUDE.md: auth decisions use server-validated `getUser()`).
- **Files touched:** src/app/auth/update-password/page.tsx

## AUTH-08 — checkout success_url lands on /dashboard, racing the subscription gate
- **Finding:** supabase/functions/stripe-checkout/index.ts:123 (medium) — `success_url` = `/dashboard?checkout=success&…` and `cancel_url` = `/settings/billing?checkout=cancelled`; neither is in the proxy's subscription-gate allowlist, so a lapsed re-subscriber returns from Stripe before the webhook updates `users.subscription_status` and proxy.ts:347-353 bounces them to /pricing — payment looks failed.
- **Root cause:** The Edge Function predates (or ignores) the purpose-built allowlisted landing pages. `src/app/(owner)/billing/checkout/success/page.tsx` and `cancel/page.tsx` exist precisely for the Stripe round-trip (the proxy comment at proxy.ts:241-243 says so) but have zero inbound references.
- **Fix:** In `supabase/functions/stripe-checkout/index.ts`:
  - `success_url: ${frontendUrl}/billing/checkout/success?session_id={CHECKOUT_SESSION_ID}`
  - `cancel_url: ${frontendUrl}/billing/checkout/cancel`
  Both match the `pathname.startsWith("/billing/checkout")` allowlist (proxy.ts:246), which bypasses ONLY the subscription gate — auth is still enforced, and the buyer is authenticated (checkout required Bearer). The success page already renders session_id + "Go to Dashboard"/"View Plans" CTAs. No consumer reads `?checkout=success` on /dashboard (grep: only `billing=updated` has a dashboard consumer), so nothing else changes.
- **Why it fixes it:** Verifier evidence is the allowlist prefix mismatch; landing on an allowlisted route removes the stale-status race entirely — the user sees "Subscription Activated!" regardless of webhook lag, and clicks through to /dashboard only after the webhook has (typically) landed.
- **Risks / interactions:** Requires an Edge Function redeploy — owner-run (`bun scripts/deploy-edge-functions.ts`, CLI-401 gotcha); flag as a phase residual. Phase 36 BILL executes first and plausibly edits the same file (pricing/session-shape findings) — rebase on main after 36 merges. The success page's "Go to Dashboard" click can still race an unusually slow webhook (user bounces to /pricing) — that residual is inherent to webhook-driven status and out of scope; the critical "payment looks failed on return" symptom is gone.
- **Files touched:** supabase/functions/stripe-checkout/index.ts

## AUTH-09 — invalid OTP type redirects the callback to itself
- **Finding:** src/app/auth/callback/route.ts:72 (low) — `?error=invalid_type` redirects back to `/auth/callback` (the same GET handler), which on re-entry has no token/code and falls through to `/login?error=oauth_failed`; the accurate signal is discarded and the user is blamed for an OAuth failure that never happened.
- **Root cause:** The error redirect targets a route with no page — `/auth/callback` is a route handler, so the "error display" destination the author imagined doesn't exist; the two-hop chain and the misleading final error are the observable symptoms.
- **Fix:** Part of the class-wide callback rewrite (AUTH-01/AUTH-02): the invalid-type branch redirects directly to a user-facing page with an accurate code — `/login?error=invalid_link` — which the AUTH-04 login error map renders as "That sign-in link is invalid. Please request a new one." No self-redirect remains anywhere in the handler.
- **Why it fixes it:** Verifier evidence is the self-redirect + fall-through + no consumer of `invalid_type`; a single-hop redirect to a rendering page with a consumed error code eliminates all three.
- **Risks / interactions:** Same file/task as AUTH-01/AUTH-02; depends on AUTH-04's map including `invalid_link`. Reachable only via malformed/crafted links, so no legitimate-flow regression surface.
- **Files touched:** src/app/auth/callback/route.ts (shared with AUTH-01/AUTH-02), src/app/(auth)/login/page.tsx (error map, shared with AUTH-04)

## AUTH-10 — sign-out failure presented as success
- **Finding:** src/app/auth/signout/page.tsx:43 (low) — `handleSignOut`'s `onError` sets the same `signedOut(true)` as `onSuccess`, so a failed `auth.signOut()` (network error / auth-server 5xx, where supabase-js keeps the local session) renders "You have been signed out successfully" and auto-redirects to /login while a valid session persists and caches are uncleaned.
- **Root cause:** The error callback was written to converge on the success UI (probably to avoid a stuck state) instead of representing failure; `useSignOutMutation` already distinguishes the paths (`clearAuthData` only `onSuccess`, use-auth-mutations.ts:86-91) — the page collapses them back together.
- **Fix:** In `src/app/auth/signout/page.tsx`:
  1. Delete the `onError: () => setSignedOut(true)` callback (the mutation's own `onError` already logs).
  2. In the confirmation card, render a failure state off `signOut.isError`: a destructive `Alert` ("Sign out failed — check your connection and try again.", using `text-destructive-text` for the copy per the vivid-token rule) above the existing button, whose label becomes "Try Again" when `signOut.isError`. The button already re-runs `handleSignOut`, giving a real retry path.
- **Why it fixes it:** Verifier evidence is that success is claimed "with a live session and uncleaned caches"; with the fix the success card + /login redirect render only when supabase-js actually cleared the session (mutation resolved), and failures keep the user on the confirmation card with an honest retry.
- **Risks / interactions:** None cross-phase. Note supabase-js DOES clear the local session on 401/403/404 sign-out responses (treats them as success-ish) — those never reach `onError`, so the retry state is reserved for genuine failures. `authKeys.signoutCheck` query is unaffected.
- **Files touched:** src/app/auth/signout/page.tsx

## AUTH-11 — signup emailRedirectTo points at nonexistent /auth/confirm
- **Finding:** src/components/pricing/owner-subscribe-dialog.tsx:52 (low) — `signUp` uses `emailRedirectTo: ${origin}/auth/confirm`; no such route, page, or redirect exists, so under default Supabase templates (hook disabled/fallback) confirmation clicks 404. Currently inert only because the auth-email-send hook overrides all links.
- **Root cause:** Stale route reference — `/auth/confirm` was presumably renamed/replaced by `/auth/callback` at some point and this literal was never updated; nothing type-checks route strings.
- **Fix:** Change line 52 to `emailRedirectTo: ${window.location.origin}/auth/callback`. Under default templates the verify endpoint then redirects to `/auth/callback?code=…` (PKCE) which `exchangeCodeForSession` handles, landing on `/dashboard` via `next`'s default; with the hook active the value stays ignored (harmless). Sibling sweep (done): the only other `emailRedirectTo` in src is post-checkout (deleted by AUTH-06), and `resetPasswordForEmail`'s `redirectTo: /auth/update-password` is a real route — no other stale auth-route literals.
- **Why it fixes it:** Verifier evidence is the 404 under template fallback; pointing at the real, code-handling callback route removes the latent dead-end in every template configuration.
- **Risks / interactions:** None — one-line literal change, no behavior change while the hook is active. Signup-confirmation flow correctness after the click is governed by the callback route (AUTH-01/02 rewrite), which handles both `code` and `token_hash` shapes.
- **Files touched:** src/components/pricing/owner-subscribe-dialog.tsx

## AUTH-12 — proxy login redirect drops the destination's query string
- **Finding:** src/proxy.ts:221 (low) — all three login-redirect sites (221 unauthenticated, 234 MFA step-up, 330 gate-unknown) do `url.searchParams.set("redirect", pathname)`, losing `?page=2`-style state, while the cloned URL strands the ORIGINAL query params on /login where nothing reads them.
- **Root cause:** The redirect builder uses the destructured `pathname` (line 155) instead of path+search, and `request.nextUrl.clone()` as the base URL leaks the original query into the /login URL.
- **Fix:** Add one helper in `src/proxy.ts` and use it at all three sites (class-wide within the file):
  ```ts
  function buildLoginRedirect(request: NextRequest): URL {
    const url = new URL("/login", request.nextUrl.origin);
    url.searchParams.set(
      "redirect",
      request.nextUrl.pathname + request.nextUrl.search,
    );
    return url;
  }
  ```
  Each site becomes `return withCsp(redirectWithCookies(buildLoginRedirect(request), supabaseResponse))`. `searchParams.set` URL-encodes the value; the login consumer decodes it via `URLSearchParams.get` and `isValidRedirect` accepts path+query (verified: `new URL("/properties?page=2", origin)` passes the startsWith/hostname checks), and `router.push` navigates verbatim.
- **Why it fixes it:** Verifier evidence confirms the consumer already accepts path+query — only the producer truncates. Building a fresh `/login` URL also stops stranding meaningless params on the login page (the secondary defect in the finding).
- **Risks / interactions:** Update/extend `src/lib/supabase/__tests__/middleware-routing.test.ts` — the existing `redirect=/dashboard` assertion (line 197) still passes (empty search), add a case asserting `/properties?page=2` → `redirect=/properties?page=2`. AUTH-04's login fix must preserve the `redirect` param when stripping `error` (it does — planned together). AUTH-01's `/settings?email_change=…` round-trip depends on this fix to survive login. No other phase touches proxy.ts before 37.
- **Files touched:** src/proxy.ts, src/lib/supabase/__tests__/middleware-routing.test.ts

## AUTH-13 — billing portal ignores the client's returnUrl
- **Finding:** supabase/functions/stripe-billing-portal/index.ts:70 (low) — the function never reads the request body; `return_url` is hardcoded to `/dashboard?billing=updated`, silently discarding the `returnUrl` that `createCustomerPortalSession` posts (`/billing/plans` callers, plans/page.tsx:83,125).
- **Root cause:** The function was written for a single caller (the dashboard flow) and the body contract added later in `src/lib/stripe/stripe-client.ts:118` was never implemented server-side.
- **Fix:** In `supabase/functions/stripe-billing-portal/index.ts`, after auth:
  ```ts
  let returnUrl = `${frontendUrl}/dashboard?billing=updated`;
  try {
    const body = await req.json();
    if (typeof body?.returnUrl === "string") {
      const candidate = new URL(body.returnUrl);
      if (candidate.origin === new URL(frontendUrl).origin) {
        returnUrl = candidate.toString();
      }
    }
  } catch { /* empty/malformed body → keep default */ }
  ```
  and pass `return_url: returnUrl` to `stripe.billingPortal.sessions.create`. Origin validation against `NEXT_PUBLIC_APP_URL` prevents open-redirect via attacker-supplied returnUrl (the verifier explicitly requires this); invalid/foreign origins silently fall back to the default.
- **Why it fixes it:** Verifier evidence is "never calls req.json() anywhere"; reading and validating the body honors the existing client contract — /billing/plans users return to /billing/plans (also allowlisted, avoiding the lapsed-user /pricing bounce), while `useBillingPortalMutation` (posts `{}`) keeps the `/dashboard?billing=updated` toast flow byte-identical.
- **Risks / interactions:** Edge Function redeploy is owner-run (CLI-401 → `bun scripts/deploy-edge-functions.ts`) — same residual batch as AUTH-08. Phase 36 BILL may touch this function or its two callers first — rebase after 36. Deno Edge tests (if added) need `supabase functions serve`.
- **Files touched:** supabase/functions/stripe-billing-portal/index.ts

## Cross-cutting notes
- **Class-wide fix #1 — callback route exhaustive redirect map (AUTH-01, AUTH-02, AUTH-09):** one task rewrites `src/app/auth/callback/route.ts`: `VALID_OTP_TYPES` grows `email_change`; success and failure redirects become an exhaustive per-`ValidOtpType` map (signup/email → /dashboard | /auth/confirm-email?error=invalid_token; recovery → /auth/update-password | #error hash; magiclink → `next` | /login?error=link_expired; invite → /auth/update-password | /login?error=link_expired; email_change → /settings?email_change=confirmed | /settings?email_change=failed); `email_change` success keys on `!error` (not `data.session`) for secure-email-change double confirmation; invalid type → `/login?error=invalid_link` (no self-redirect). Update `otp-validation.test.ts` and add per-type redirect unit tests (the handler's exported helpers are already unit-tested — extend the pattern).
- **Class-wide fix #2 — login error surfacing (AUTH-04 + consumers of new codes):** the login mount effect maps `oauth_failed` / `link_expired` / `invalid_link` to `setAuthError` messages and strips ONLY the `error` param, preserving `redirect`. Must be planned in the same phase as fix #1 (producer/consumer pair).
- **Class-wide fix #3 — post-checkout retirement (AUTH-05 + AUTH-06):** delete `src/app/auth/post-checkout/page.tsx`, drop the robots.ts disallow. Keep the `stripe-checkout-session` Edge Function (live consumers: `/pricing/success`, `/pricing/complete` via `subscription-verification-keys.ts`). Sweep `tests/` for `post-checkout` references before deleting.
- **Recommended task order within the phase:** (1) callback rewrite + login error map + confirm-email resend (AUTH-01/02/03/04/09 — one coherent auth-link flow), (2) update-password session check (AUTH-07), (3) post-checkout deletion + robots (AUTH-05/06), (4) proxy redirect helper (AUTH-12), (5) signout error state (AUTH-10), (6) subscribe-dialog literal (AUTH-11), (7) Edge Functions (AUTH-08, AUTH-13).
- **Phase dependencies:** Phase 36 BILL lands first and plausibly edits `supabase/functions/stripe-checkout/index.ts`, `stripe-billing-portal/index.ts`, `billing/plans/page.tsx`, and the `stripe-checkout-session` response-shape mismatch with `/pricing/success`+`/pricing/complete` (do NOT fix that here) — rebase AUTH-08/AUTH-13 on post-36 main. Phase 38 FORM may touch `general-settings.tsx` after us (it rebases on AUTH-01's toast effect). Phase 47 A11Y may restyle confirm-email/signout components after us — no conflict.
- **Owner-run residuals:** redeploy `stripe-checkout` + `stripe-billing-portal` after merge (`bun scripts/deploy-edge-functions.ts`; CLI `functions deploy` 401s). `auth-email-send` is unchanged.
- **Verification hooks:** unit — otp-validation + middleware-routing tests; manual — email-change round trip from /settings, "Email not confirmed" login → resend, cross-device reset-link open shows ExpiredLinkContent, lapsed-owner re-subscribe returns to /billing/checkout/success, /billing/plans portal round-trips back to /billing/plans.
