---
phase: 13-perf-conversion
reviewed: 2026-05-13T00:00:00Z
depth: deep
cycle: 1
files_reviewed: 10
files_reviewed_list:
  - src/components/marketing/sticky-conversion-cta.tsx
  - src/components/marketing/lead-capture-modal.tsx
  - src/components/marketing/__tests__/sticky-conversion-cta.test.tsx
  - src/components/marketing/__tests__/lead-capture-modal.test.tsx
  - src/app/pricing/page.tsx
  - src/app/compare/[competitor]/page.tsx
  - src/app/compare/page.tsx
  - src/app/features/page.tsx
  - src/app/faq/page.tsx
  - supabase/functions/stripe-webhooks/index.ts
findings:
  P0: 0
  P1: 2
  P2: 5
  total: 7
status: issues_found
---

# Phase 13: Code Review Report — Cycle 1

**Branch:** `gsd/phase-13-perf-conversion`
**Phase commit:** `82325f4f4`
**Files in scope:** Conversion components (sticky CTA + lead modal), 5 modified marketing pages, Stripe webhook diagnostics.

## Summary

Solid first-cycle work. The Stripe webhook diagnostics fix is exactly right (catches the `_err` swallow, logs the verification error with a non-leaky signature prefix). The two new components handle SSR-safety, cleanup, and accessibility correctly, and the tests pin meaningful invariants. The pre-existing `as unknown as` on `stripe-webhooks/index.ts:88` is NOT new in this PR — confirmed via `git diff main...HEAD`.

Seven findings: zero P0, two P1, five P2. The P1s are correctness concerns (one stale-closure bug in the sticky CTA, one Sentry-quota DoS concern). The P2s cover code-quality / consistency / scope decisions.

---

## P1 Findings

### P1-01: Sticky CTA scroll listener never registers when component mounts AFTER user has already scrolled past the threshold (under the dismissed-then-TTL-expired path is fine, but the cold-load-deep-link path is broken)

**File:** `src/components/marketing/sticky-conversion-cta.tsx:42-58`

**Evidence:** The useEffect early-returns when a fresh dismissal is in localStorage. That's correct. But the listener-registration path runs `onScroll()` ONCE at mount (line 55) to capture the current scroll position. That works when the visitor lands at `scrollY = 0`. It also works when the visitor scrolls down after mount. What it does NOT handle: a deep link / anchor jump that puts the page at `scrollY > threshold` BEFORE the component's useEffect first runs. The line `onScroll()` reads `window.scrollY` synchronously at effect-init time, so the visible state IS set correctly on mount. So actually — this IS handled. Re-reading the code more carefully:

```ts
function onScroll() {
    setVisible(window.scrollY > scrollThresholdPx)
}
onScroll()  // ← reads current scrollY at mount
window.addEventListener('scroll', onScroll, { passive: true })
```

After re-tracing: `onScroll()` is called synchronously at mount, before the listener is registered. If the page is already scrolled past the threshold (e.g. user clicked `/compare/buildium#comparison` and the anchor scroll completed before hydration), `window.scrollY > scrollThresholdPx` is true and `setVisible(true)` fires immediately. The CTA appears.

**Verdict:** False alarm — the cold-load deep-link path IS handled by the explicit `onScroll()` call on line 55. Downgrading my own finding. Marking as **resolved during review; no fix needed**. Not actually a P1 — leaving the entry here as a record so the cycle-2 reviewer doesn't independently re-raise it.

**Status:** WITHDRAWN.

---

### P1-02: `LeadCaptureModal` form submit re-fires `mutation.mutate` if user double-taps the submit button (`mutation.isPending` guard is on the BUTTON's `disabled`, not on the submit handler — touch devices can fire two `submit` events before React re-renders the disabled state)

**File:** `src/components/marketing/lead-capture-modal.tsx:109-113, 150-152`

**Evidence:** `handleSubmit` calls `mutation.mutate(email)` unconditionally when an email is present. The disable guard lives only on the JSX (`<Button disabled={mutation.isPending}>`). React batches state updates; between two rapid form submissions (e.g. on a touch device, a double-tap that fires both `touchend` events into the same render commit window), `mutation.isPending` won't have flipped to `true` yet when the second submit fires. Result: two newsletter subscribe POSTs, two toasts.

The `newsletter-subscribe` Edge Function is presumably idempotent on email (it should be — re-subscribing the same email is a no-op for Resend audience inserts), but the user-facing UX is "two `toast.success` fires" or "one success + one error if the second hits a race against the first's INSERT." Not great.

**Fix:** Guard inside `handleSubmit`:
```ts
function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (mutation.isPending) return  // double-submit guard
    const email = inputRef.current?.value?.trim()
    if (email) mutation.mutate(email)
}
```

The state-based guard in JSX still helps for accessibility (button announces disabled). But the submit-handler guard is what actually prevents re-firing.

---

### P1-03: `captureWebhookError` on the "missing stripe-signature header" branch (`stripe-webhooks/index.ts:48-53`) is a Sentry-quota DoS surface

**File:** `supabase/functions/stripe-webhooks/index.ts:47-54`

**Evidence:** `https://<project>.supabase.co/functions/v1/stripe-webhooks` is a publicly-discoverable URL (the path is standard, scanners enumerate it). Every probe / bot / curl that hits this endpoint without a `stripe-signature` header now fires a discrete Sentry event via `Sentry.captureException`. Sentry's free tier is 5k events/month; the Team tier is 50k events/month. A modest probe flood (a few thousand requests/day across the global scanning population) can blow the quota and silently mute real errors via Sentry's rate limiting.

The 209-failure incident the audit pointed at had a *signature present* (i.e. real Stripe deliveries with a real header that failed verification). Those are bounded by Stripe's delivery rate. The "missing header" branch is unbounded — anything on the public internet can trigger it.

**Fix:** Demote the missing-header branch from `captureWebhookError` (which calls `captureException`) to `captureWebhookWarning` (which calls `captureMessage` at `warning` level) AND/OR drop it back to console-only for that one branch. The signature-verification-failed branch should keep `captureException` because that's where the operator needs the signal.

Concretely:
```ts
if (!signature) {
    // Console-only: this surface is publicly probable. Don't fire a
    // discrete Sentry event per probe — Sentry quota DoS risk.
    console.warn(JSON.stringify({
        level: 'warning',
        message: 'Missing stripe-signature header',
        action: 'verify_signature',
        reason: 'header_missing',
        user_agent: req.headers.get('user-agent'),
    }))
    return new Response('Missing stripe-signature header', { status: 400 })
}
```

If you want light Sentry visibility for trending (i.e. "did probe traffic 10x?"), use `captureWebhookWarning` instead — `captureMessage` at warning level still counts toward Sentry quota but at least it's deduped by message string and you can ignore the issue in Sentry without losing the real error signal.

---

## P2 Findings

### P2-01: `LeadCaptureModal` uses a raw `<input>` element with hand-rolled Tailwind classes instead of the project's `Input` component

**File:** `src/components/marketing/lead-capture-modal.tsx:132-140`

**Evidence:** Lines 132-140 hand-roll an input with `className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"`. The project has a canonical `Input` component at `src/components/ui/input.tsx` with `cva` variants. Hand-rolling duplicates the design tokens; if the canonical `Input` styling shifts (e.g. focus ring color migration), this one won't follow.

**Fix:**
```tsx
import { Input } from '#components/ui/input'
// ...
<Input
    ref={inputRef}
    type="email"
    placeholder="your@email.com"
    required
    autoFocus
    aria-label="Email address"
/>
```

---

### P2-02: `NEXT_PUBLIC_LEAD_CAPTURE_MODAL` env var is baked at BUILD TIME, not runtime — comment about "A/B test without a code deploy" is misleading

**File:** `src/components/marketing/lead-capture-modal.tsx:31-34`

**Evidence:** Comment reads "Gated by `NEXT_PUBLIC_LEAD_CAPTURE_MODAL=on` so we can A/B test the surface without a code deploy." But `NEXT_PUBLIC_*` env vars in Next.js are statically replaced at `next build` time. Toggling the value in Vercel's env panel requires a redeploy (rebuild) to take effect — there is no runtime read.

For a true A/B test (split traffic by cookie / bucket), the runtime needs to read the flag dynamically. For a binary on/off toggle (which is what this PR is setting up), the build-time bake is fine but the comment should be honest about it.

**Fix:** Reword the comment:
```ts
// Build-time flag — flip NEXT_PUBLIC_LEAD_CAPTURE_MODAL in Vercel and
// trigger a redeploy to enable the surface. For true split-traffic A/B
// testing, replace with a runtime feature flag (e.g. PostHog, Statsig).
```

---

### P2-03: `Dialog` close-via-overlay-click is the only "no thanks" path for the soft session-once guard — keyboard `Esc` is fine, but click-outside-to-dismiss might dismiss BEFORE `sessionStorage` is set

**File:** `src/components/marketing/lead-capture-modal.tsx:46-50, 55-60`

**Evidence:** Trace:
1. `useEffect` (line 46) checks `sessionStorage.getItem(SESSION_KEY) === 'true'` → if false, sets `enabled = true`.
2. `trigger()` (line 55-60) calls `sessionStorage.setItem(SESSION_KEY, 'true')` and `setOpen(true)`. The session-once flag is set BEFORE the modal opens. ✓

OK — re-tracing reveals the session-once flag is set inside `trigger()`, which fires when scroll-depth or exit-intent crosses the line. The user dismissing the modal via overlay click / Esc / "No thanks" button does NOT re-trigger anything, because `shownThisSession.current` (line 56) gates the trigger function AND `sessionStorage` is already set.

**Verdict:** Not actually a bug. Downgrading and withdrawing.

**Status:** WITHDRAWN.

---

### P2-04: Lead-capture modal scope decision — `/blog/[slug]` is excluded; verify the rationale

**File:** N/A — scope question.

**Evidence:** PR adds `LeadCaptureModal` to `/pricing` and `/compare/[competitor]`. Not added to `/blog/[slug]` (which is the highest-volume organic-traffic surface in the marketing tree).

I checked `src/app/blog/[slug]/blog-post-page.tsx` — blog posts already have:
1. A bottom-of-article "Start Free Trial" CTA card (lines 236-250).
2. A `<NewsletterSignup />` component (line 254).

The lead-capture modal's purpose (email-capture pop-up tied to the newsletter-subscribe Edge Function) directly overlaps with the existing inline NewsletterSignup. Showing both on blog posts would be redundant and aggressive.

**Verdict:** Scope decision is sound. Flagging here only so the cycle-2 reviewer doesn't independently re-raise it as "missing coverage."

**Status:** ACCEPTED-AS-IS.

---

### P2-05: `StickyConversionCta` cleanup function does not de-register the scroll listener when dismissed mid-page-life

**File:** `src/components/marketing/sticky-conversion-cta.tsx:60-63`

**Evidence:** `handleDismiss` does:
```ts
window.localStorage.setItem(storageKey, String(Date.now()))
setDismissed(true)
```

It does NOT call `window.removeEventListener('scroll', onScroll)`. The scroll handler stays registered until the component unmounts (i.e. SPA navigation away from the page). Every scroll event after dismissal still triggers `setVisible(window.scrollY > scrollThresholdPx)`. React bails on no-op state updates, so this is performance-neutral in practice. But it's loose hygiene — a dismissed CTA should stop listening.

**Fix:** Move `dismissed` into the effect's dependency array OR clean up the listener inside `handleDismiss`. Cleanest:

```ts
useEffect(() => {
    if (dismissed) return

    const raw = window.localStorage.getItem(storageKey)
    if (raw) {
        const ts = Number(raw)
        if (Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS) {
            setDismissed(true)
            return
        }
    }

    function onScroll() {
        setVisible(window.scrollY > scrollThresholdPx)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
}, [dismissed, scrollThresholdPx, storageKey])
```

When `dismissed` flips to `true`, the effect re-runs, sees the early-return, and the previous effect's cleanup function removes the listener. Honest hygiene.

---

### P2-06: `LeadCaptureModal` uses `process.env.NEXT_PUBLIC_LEAD_CAPTURE_MODAL` inside an effect; if Next.js' bundler ever decides this is dead code under `NEXT_PUBLIC_LEAD_CAPTURE_MODAL=undefined` at build, the whole effect could be stripped

**File:** `src/components/marketing/lead-capture-modal.tsx:46-50`

**Evidence:** Minor risk. Today Webpack/Turbopack inline `process.env.NEXT_PUBLIC_*` as string literals — including `undefined` becoming the literal string `"undefined"` (NOT the value `undefined`). The check `!== 'on'` returns `true` for `"undefined" !== 'on'`, which is correct. So the effect body is preserved, just exits early at runtime when unset. ✓

But the failure mode is subtle: if you ever invert this (e.g. `process.env.NEXT_PUBLIC_LEAD_CAPTURE_MODAL === 'off'`), the literal substitution behavior changes the intuition. Today's logic is safe.

**Verdict:** Not actually an issue under current logic. Downgrading.

**Status:** WITHDRAWN.

---

### P2-07: `mockStorage` reset uses `mockStorage = {}` inside the `clear: vi.fn(() => { mockStorage = {} })` closure — only rebinds the outer-scope variable for tests that explicitly call `.clear()`, which none of these tests do; minor

**File:** `src/components/marketing/__tests__/sticky-conversion-cta.test.tsx:57-59` (and parallel in `lead-capture-modal.test.tsx:74-76`)

**Evidence:** The `clear()` mock does `mockStorage = {}`, which rebinds the closed-over let. Other mock methods (`getItem`, `setItem`) still reference the OLD `mockStorage` object via closure. Result: if a test called `.clear()`, subsequent `getItem` / `setItem` calls would still operate on the old object. None of the tests call `.clear()`, so this never bites. But it's a latent bug in the mock.

**Fix:** Mutate in-place rather than rebinding:
```ts
clear: vi.fn(() => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k]
}),
```

Or simpler — drop `clear` entirely (no test uses it).

---

## Verdict

**FAIL — 7 findings raised, 3 withdrawn during write-up.**

**Final tally:** 0 P0, 2 P1 (P1-02 double-submit, P1-03 Sentry quota), 4 P2 (P2-01 raw input, P2-02 misleading comment, P2-05 dismiss cleanup, P2-07 mock clear closure). P2-04 accepted as a scope decision; P1-01, P2-03, P2-06 withdrawn.

**Required for cycle-2 to gate as zero-finding:** address P1-02, P1-03, P2-01, P2-02, P2-05, P2-07.

The cycle-1 → cycle-2 fix pass should not introduce regressions to: scroll-handler cleanup, SSR hydration safety, the Stripe signature-prefix safety analysis (Stripe's `t=<timestamp>,v1=<hex>` format means `slice(0, 12)` never leaks MAC bytes — CONFIRMED safe), or the test-isolation pattern (`vi.stubGlobal` in `beforeEach` + `vi.unstubAllGlobals` in `afterEach` is correct).

**Confirmed safe (do not regress):**
- `signature.slice(0, 12)` — only reveals `t=<unix-timestamp>` (10-digit epoch). MAC bytes start at position 16+. No secret leak.
- SSR hydration — both components return null on first render (initial state `visible=false`, `enabled=false`), so SSR HTML and client first-render HTML match. No mismatch warning.
- `QueryClientProvider` is available at runtime — root layout wraps every route in `Providers` → `QueryProvider`. `useMutation` in `LeadCaptureModal` works.
- `revalidate = 3600` + `generateStaticParams()` coexist correctly in Next.js 16; pre-renders all params at build, re-validates each on a 1h schedule.
- No other `catch (_*)` swallow patterns elsewhere in `supabase/functions/` or `src/` — `grep` confirmed empty across the tree.
- `duration-normal` is a pre-existing project convention (used in `globals.css` `@apply` blocks + `navbar.tsx`); the `--transition-duration-normal: 300ms` declaration powers it in Tailwind 4. Not a new violation.
- No `bg-white`, no bare `text-muted`, no `any`, no NEW `as unknown as`, no inline styles, no string-literal query keys, no emojis, no barrel files in the diff. Standard checks all green.

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep (cross-file analysis: traced QueryClientProvider availability through root layout, verified Sentry capture chain through shared `errors.ts`, traced env-flag substitution behavior through Next.js bundler semantics)_
