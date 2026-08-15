# Deferred items — Phase 66

Out-of-scope discoveries logged during execution. Nothing here was fixed; each is
outside the scope boundary of the plan that found it.

## D1 — `next build` fails locally at `/blog/[slug]` page-data collection (found in plan 66-13)

```
✓ Compiled successfully in 8.0s
  Collecting page data using 17 workers ...
TypeError: Cannot read properties of undefined (reading 'includes')
> Build error occurred
Error: Failed to collect page data for /blog/[slug]
```

- **Reproduced with:** `SKIP_ENV_VALIDATION=true bun run build` on
  `gsd/phase-66-rental-application-intake`.
- **Why it is out of scope for 66-13:** the failure is in the public blog route's
  page-data collection, which reads blog rows from Supabase. Plan 66-13 adds three
  new files under `src/components/applications/` and `src/app/(owner)/applications/`
  and imports nothing the blog route touches. The compile step — which is where a
  defect in the new files would surface — succeeded.
- **Most likely cause:** the known local-environment gap recorded in project memory
  (`.env.local` is missing app vars, so anything that reaches the database during
  build-time page-data collection fails locally). CI runs `next build` with real
  secrets, so this is not necessarily a CI failure.
- **What 66-13 did instead of a full build to verify its own route:** read the
  emitted `.next/app-path-routes-manifest.json`
  (`/(owner)/applications/page -> /applications`) and confirmed
  `.next/server/app/(owner)/applications/page.js` plus its
  `page_client-reference-manifest.js` were written. Both are produced by the
  compile stage that succeeded, before the blog route failed.
- **Action for whoever owns it:** confirm against CI (or a shell with the full env)
  whether `/blog/[slug]` builds. If it fails there too, it is a real regression and
  needs its own fix.

## D2 — `documents-hub.spec.ts:130` is the pre-existing `e2e-smoke` blocker, and it is NOT a login failure

This is the failure that has kept `e2e-smoke` red since 2026-08-05. It belongs to
Phase 65, it fails on `main` independently of this branch, and it is **not** the
`loginAsOwner` failure it was reported as.

**What actually fails**

```
[owner-axe] › tests/e2e/tests/documents-hub.spec.ts:130:2
  › Documents landing (Phase 65, DOCS-01) › medallion ladder descends 48 -> 40 -> 32 as measured
  Error: element has no bounding box (not rendered)
    at widthOf (documents-hub.spec.ts:84:18)
    at documents-hub.spec.ts:136:17
```

`:136` is the **vault** medallion — `medallion(band(page, VAULT))`, i.e. the parent
of the first `svg[aria-hidden="true"]` inside `section[aria-labelledby="documents-vault"]`,
which is the `size-12` div at `(owner)/documents/page.tsx:86`.

**Where it fails**

| Run | Branch | Result |
|-----|--------|--------|
| 30967009216 | `main` @ `64c14d2a9` | `:130` failed 3/3 attempts — the only hard failure |
| 31281052043 | this PR | `:130` failed, plus `:157` |
| 31292925551 | this PR | `:130` failed, plus `:213` |
| 31316391774 | this PR | did not run — E-4 tripped `maxFailures: 1` first |

**Why it is not a login failure.** `main`'s failing run contains **zero**
occurrences of `Owner login failed`. Every attempt reaches the page and then fails
a measured-geometry read. The login errors seen on this PR are a different,
transient thing — see below.

**It will resurface.** The latest run never reached this spec because E-4 stopped
the suite at `maxFailures: 1`. With E-4 fixed the run proceeds further and this
becomes the blocking failure again.

**What is known about the cause.** `widthOf` (`documents-hub.spec.ts:84`) has the
identical one-shot `boundingBox()` shape that caused this phase's E-1 flake, and
it was fixed there by gating on an auto-retrying `toBeVisible()`. But E-1 was
FLAKY (it passed on a retry) while this fails 3/3 on every attempt, so the same
gate would most likely convert "no bounding box" into a 5s visibility timeout
rather than a pass — the element is probably genuinely boxless, not momentarily
so. **Deliberately not "fixed" here**: it cannot be reproduced locally (the page
is behind the proxy auth + subscription gate and `.env.local` carries only
`VERCEL_OIDC_TOKEN`), the run's Playwright artifacts were never uploaded, and a
change that only relabels the error would read as a fix it is not.

**Action for whoever owns it:** run `--project=owner-axe --grep "medallion ladder"`
with real secrets and read the trace. Determine whether the `size-12` div is
`display:none`, whether `medallion()` resolves to something other than that div,
or whether the band renders at all for this account's data state.

## D3 — `loginAsOwner` is transiently, not deterministically, redirected to `/login`

Two `reports-hub.spec.ts` tests threw `Owner login failed: Redirected to login
page` on run 31316391774 and **both passed on retry** — Playwright classed them
`flaky`, and they did not cause the job to fail. Not present on `main` at all.

The mechanism is identifiable and the product side is correct as written:
`updateSession` (`src/lib/supabase/middleware.ts:104-138`) deliberately coerces
**every** `getUser()` failure — network error, auth-server 5xx, rate limit — to
`user: null`, documented as fail-closed so middleware never 503s; the proxy then
redirects to `/login`. A valid injected session therefore lands on `/login`
whenever that one upstream round-trip does not succeed, and `loginAsOwner` treats
a single `/login` landing as terminal.

**Deliberately not changed.** Which upstream condition occurred (a network blip
vs. an auth rate limit) is only decidable from Supabase's own logs, and Playwright's
existing retries already absorb it. Ruled out: bad credentials (a sign-in failure
throws a different, earlier error), and the subscription gate (that path throws its
own distinct `/pricing` message, and both synthetic owners are `active` with
`trial_ends_at: null`).

## D4 — `DialogHeader` gives every dialog in the app the same additive `<p>` margin

Found while fixing the cycle-8 F2 finding on `@modal/(.)tenants/new/page.tsx`.

`ui/dialog.tsx:102-110` renders `DialogHeader` as `flex flex-col gap-2`. Radix
renders `DialogDescription` as a `<p>`, `DialogDescription` adds only
`text-muted-foreground text-sm`, and `globals.css:499` declares an unscoped
`p { margin-bottom: 1rem }` inside `@layer base`. The description is the LAST
child of that flex column in essentially every dialog in the app, so its 16px
bottom margin is **additive** to the header's own box rather than collapsing —
the same mechanism as F2, one level up.

Roughly 20 call sites are affected: `settings/category-*-dialog.tsx`,
`ledger/{add-line,record-receipt,track-since}-dialog.tsx`,
`auth/{two-factor-setup,change-password,mfa-verification,forgot-password}*.tsx`,
`leases/{rent-increase-notice,send-for-signature,renew-lease}*.tsx`,
`bulk-import/bulk-import-dialog.tsx`, `properties/units/*`, and others.

**Deliberately not changed here.** It is entirely pre-existing — no part of it
was introduced or touched by phase 66 — and it belongs in `DialogHeader` itself
(a one-line `[&>p]:mb-0` or an `mb-0` on `DialogDescription`'s own `cn()` base),
not in twenty call sites. Changing a shared primitive that every dialog in the
product renders through is not a change to make inside a phase-66 review cycle
with no visual UAT available (Vercel builds `main` only). The correct home is a
dedicated PR with a `computeParagraphCascade` guard test on `DialogHeader`, using
the harness added in `src/test/utils/base-rule-cascade.ts`.

## D5 — Per-client rate limiting for `/apply/[token]` belongs in the proxy, not the edge function

**Status:** deferred, needs an owner decision. Currently INERT (Upstash is down), becomes
relevant the moment that connection is repaired.

**What was established (perfect-PR cycle 9, after two wrong fixes):**

The `context` action of `apply-token` is called ONLY server-side, from the RSC
(`src/app/apply/[token]/apply-context.ts`, not a client module; the page is `force-dynamic`
and the fetch is `cache: "no-store"`). So one applicant page view is exactly one call, and
`getClientIp(req)` returns the **Next.js egress address for 100% of genuine traffic**. The
applicant's own address never reaches the function, and forwarding it would not be safe —
`verify_jwt = false` means a forged header would let a direct caller charge any bucket.

Two attempts to make that limiter mitigate T-66-06 both failed:

1. Keyed on the token alone -> a public kill switch, because D-03a publishes the token.
2. Keyed on `${tokenHash}:${getClientIp(req)}` -> defeated by simply GETting the public page,
   which lands the attacker in the same egress-keyed bucket real applicants share.

**The general result:** at this function an attacker and an applicant are indistinguishable —
same address, same shape, same arrival path. No key it can compute separates them, so no
configuration of this limiter mitigates T-66-06. The bucket has therefore been re-scoped to an
honest per-listing capacity ceiling (3,000/min, far above organic) and the address-only
product-wide ceiling was removed.

**What an actual mitigation requires — an owner decision between:**

- **Proxy-level limiting.** `src/proxy.ts` sees the real client address before the RSC runs.
  It currently has NO rate limiting at all. This is the natural home, but it is a different
  layer with its own blast radius (every route, every authenticated user) and needs its own
  design and review cycle.
- **A WAF/CDN rule** in front of the app, which never touches application code.
- **Accepting the risk.** The realistic impact is denial of service to applicants on one
  listing; there is no data exposure, and the DB-side per-link cap under the token row's
  `FOR UPDATE` lock remains the fail-closed abuse bound regardless.

**Do not** re-attempt this inside `apply-token`. Two attempts have now proven it cannot work
there, and both shipped a test that certified the property the code did not have.
