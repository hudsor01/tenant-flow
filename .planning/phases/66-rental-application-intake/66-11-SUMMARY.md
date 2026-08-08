---
phase: 66-rental-application-intake
plan: 11
subsystem: public-surface
tags: [rsc, server-component, public-page, non-enumeration, noindex, force-dynamic, apply-01, apply-06, ui-20, t-66-02]

# Dependency graph
requires:
  - phase: 66-02
    provides: "TOKEN_UNAVAILABLE_COPY — the single locked constant every dead-token state renders"
  - phase: 66-07
    provides: "the apply-token Edge Function's context action and its uniform 200 + reason envelope"
  - phase: 66-08
    provides: "that function deployed to production, so the fetcher points at a live endpoint"
provides:
  - "src/app/apply/[token]/apply-context.ts - fetchApplyContext + formatListingRent, deliberately carrying no per-reason copy"
  - "src/app/apply/[token]/page.tsx - the Server Component shell, noindex metadata, force-dynamic, and the three card states"
  - "src/app/apply/[token]/__tests__/apply-context.test.ts - 44 assertions over the fetcher AND the render, including the byte-identity proof"
affects:
  - 66-12 (inserts RentalApplicationForm into the valid branch's CardContent and threads `token` down from ApplyPage)
  - 66-17 (the E2E spec drives this page; E-9 and E-10 assert the rendered head and the HTTP status)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An async Server Component rendered in Vitest by awaiting the component function and passing the element tree to renderToStaticMarkup — gives real markup assertions without a Next.js server"
    - "Security-property assertions written against EACH OTHER rather than against per-state expected strings, so the assertion cannot survive the divergence it exists to prevent"
    - "A deliberate ABSENCE (no per-reason message map) pinned by an export-shape assertion rather than only by a source grep"
    - "Prose that names a forbidden identifier is reworded, because a comment satisfies a whole-file grep exactly as well as a declaration does"

key-files:
  created:
    - src/app/apply/[token]/apply-context.ts
    - src/app/apply/[token]/page.tsx
    - src/app/apply/[token]/__tests__/apply-context.test.ts
  modified: []

key-decisions:
  - "The context-error copy is a local const in page.tsx, not a new export in application-copy.ts. That module holds strings that are requirement-level or are themselves controls; adding ordinary UI copy dilutes the signal that everything in it is load-bearing. It is also outside this plan's files_modified."
  - "SummaryRow returns null for a null value rather than rendering /sign's 'N/A'. UI-SPEC A-5 omits the row, and an 'N/A' rent on a public listing summary reads as a broken page to a first-time viewer."
  - "The <dt> carries no font-medium even though /sign's does. 500 is outside this phase's declared 400/600 two-weight contract and the three sanctioned exceptions are all inherited primitives, not authored markup. The label/value distinction is carried by the colour token."
  - "Render-level assertions were added to the Task 1 test file (an additive deviation) because the plan left the byte-identity property to E2E only, and that is the single assertion most likely to be written vacuously."

requirements-completed: [APPLY-01, APPLY-06]

# Metrics
duration: 22min
completed: 2026-08-07
---

# Phase 66 Plan 11: The Public Apply Page Shell Summary

**A Server Component that renders one card for every dead-token state from one locked constant, emits `noindex, nofollow` in the rendered head, never caches, and whose identical-render property is proved by comparing the three states against each other rather than against their own expected strings.**

## Performance

- **Duration:** ~22 min
- **Tasks:** 2 of 2
- **Files created:** 3 (111-line fetcher, 215-line page, 379-line test)
- **Assertions:** 44 across 18 tests, all passing
- **Mutations applied:** 13, all caught

## Task Commits

1. **Task 1: the context fetcher and the deliberate absence of a reason map** — `f57605ba9` (feat)
2. **Task 2: the Server Component page, its metadata, and the three card states** — `0e45fef02` (feat)

## The property the brief said not to break

**All three unavailable states render byte-identically, at HTTP 200.** Stated precisely, because the two halves of that claim were established by different means:

| Half of the claim | How it was established | Strength |
|---|---|---|
| The three states render **byte-identical markup** | Unit test: the page is awaited and rendered through `renderToStaticMarkup` for `invalid_token`, `expired_token` and `revoked_token`, and the three strings are asserted `.toBe()` **each other** | Proved, and proved non-vacuous by mutation P1 |
| A bad token returns **HTTP 200**, not 404 | Probed against a real `next start` server: `/apply/garbage-token-zzz` and `/apply/<64 chars>` both returned **HTTP 200** | Proved end-to-end |
| The **live endpoint** collapses the states | Probed live: garbage, 64×`a` and 64×`f` all returned HTTP 200 and the byte-identical body `{"valid":false,"reason":"invalid_token"}` | Confirmed live |

The one thing **not** proved at the HTTP layer is the three *unavailable* states rendering identically **through a running server**, because that needs real tokens sitting in expired and revoked states in production. The local server ran against a placeholder Supabase host, so its renders exercised the `context_error` branch. That gap is exactly what UI-SPEC E-10 assigns to plan 66-17's E2E spec, and it is covered at the render layer here.

**Two different bad tokens rendered identical visible text through the live server.** The whole documents differ in exactly two places, neither of which carries token state:

1. Next.js's own RSC flight payload (`self.__next_f.push`) serializes the routed URL segment — that is the viewer's own URL, which they already hold.
2. A per-request `sentry-trace` / `baggage` meta pair, which is random per request and appears on every page in the app.

The token appears **nowhere** in the page's own output. Normalizing those two values away, the documents are identical.

## Non-Vacuity Evidence

Thirteen mutations, applied one at a time to the committed source, suite re-run, tree restored and diffed clean after each.

**Task 1 — the fetcher (6/6 caught):**

| Mutation | Result |
|---|---|
| M1 — reintroduce a `REASON_MESSAGE`-shaped map | **1 fail**: `exports no per-reason message map` |
| M2 — drop `cache: "no-store"` | **1 fail**: `posts the RAW token ... and never caches the response` |
| M3 — `formatListingRent(null)` returns `"N/A"` | **1 fail**: `returns null for a missing rent so the row is OMITTED` |
| M4 — no early return on a missing env var | **1 fail**: `returns context_error WITHOUT attempting a fetch` |
| M5 — a non-2xx maps to `invalid_token` | **1 fail**: `maps a non-2xx response to the recoverable context_error` |
| **M6 — `expired_token` carries an extra field the others do not** | **2 fail**, incl. `returns invalid, expired and revoked in ONE shape that differs only by the reason string` |

**Task 2 — the render (7/7 caught):**

| Mutation | Result |
|---|---|
| **P1 — `expired_token` gets its own sympathetic title** | **2 fail**: `renders invalid, expired and revoked to BYTE-IDENTICAL markup`, `names none of the four states` |
| P2 — drop `robots` noindex/nofollow | **1 fail**: `declares noindex/nofollow and force-dynamic` |
| P3 — `force-dynamic` downgraded to `auto` | **1 fail**: same |
| P4 — null rows render `N/A` instead of being omitted | **1 fail**: `omits the unit and rent rows entirely when they are null` |
| P5 — an owner contact affordance appears in the summary | **1 fail**: `renders the listing summary ... and no owner contact details` |
| P6 — `context_error` collapsed into `TOKEN_UNAVAILABLE_COPY` | **1 fail**: `renders a transport fault DIFFERENTLY` |
| P7 — the token echoed into the rendered footer | **1 fail**: `renders invalid, expired and revoked to BYTE-IDENTICAL markup` |

M6 and P1 are the two that matter. Both are the exact one-line edit a well-meaning reviewer makes in the name of helpfulness, and both are caught **only** because the three states are asserted against each other. The vacuous form of P1's assertion — `expect(expired).toContain("isn't available")` — keeps passing after P1 is applied, because P1 leaves the body copy alone and changes only the title.

**P1 initially failed only ONE test.** The state-naming assertion had been written against `revoked_token` alone, so an `expired`-only divergence slipped past it. The test was changed to loop over all three reasons before the commit landed, after which P1 fails two. This is recorded because it is the same vacuity class the plan warned about, found in my own test.

## Verification

| Gate | Result |
|---|---|
| `bun run test:unit -- src/app/apply/[token]/__tests__/apply-context.test.ts` | **18 tests / 44 assertions, pass** |
| `bun run test:unit` (full suite, via lefthook pre-commit on both commits) | **pass** |
| `bun run typecheck` (root + integration + e2e projects) | **pass** |
| `bun run lint` (`biome check`, 1350 files) | **pass** |
| `next build` with CI-parity placeholder env | **pass** — `/apply/[token]` listed as **`ƒ (Dynamic)`**, i.e. `force-dynamic` took effect |
| `next start` → `GET /apply/<garbage>` | **HTTP 200** |
| `next start` → rendered head | **`<meta name="robots" content="noindex, nofollow">` present** (UI-SPEC E-9, ahead of 66-17) |
| `next start` → response headers | **`Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`** |
| Live `POST /functions/v1/apply-token` `{action:"context"}` × 3 bad tokens | **HTTP 200, byte-identical bodies** |

Task 1 acceptance greps:

| Check | Result |
|---|---|
| `grep -c 'REASON_MESSAGE' apply-context.ts` | **0** |
| `grep -q 'no-store' apply-context.ts` | **present** |

Task 2 acceptance greps:

| Check | Result |
|---|---|
| `use client` | **0** |
| `space-y-` (and bare `space-y`) | **0** |
| `useState` / `useEffect` / `createClient` | **0** |
| `owner_email` / `ownerEmail` / `owner_phone` / `ownerPhone` | **0** |
| `bg-white` | **0** |
| bare `text-muted` (not `text-muted-foreground`) | **0** |
| `force-dynamic`, `index: false`, `TOKEN_UNAVAILABLE_COPY` | **all present** |
| `page.tsx` line count | **215** (limit 300) |
| Longest function (`ApplyPage`) | **36 code lines** (limit 50) |

Every `mb-0` in `page.tsx` carries a one-line comment naming the parent box that makes it necessary (§D-3): the two header lines and the footer are flex items of `gap-*` columns, and the notice body sits inside `CardContent`, which is a flex item of the `Card` and therefore establishes its own block formatting context, so the base `p { margin-bottom: 1rem }` cannot collapse out through it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The `REASON_MESSAGE` gate was tripped by the comment explaining the divergence**

- **Found during:** Task 1
- **Issue:** The plan requires `grep -c 'REASON_MESSAGE' == 0` **and** requires a header comment explaining why no such map exists. The natural wording names the identifier, and a comment satisfies a grep exactly as well as a declaration does. Count was 1.
- **Fix:** Reworded to "THERE IS NO PER-REASON MESSAGE MAP HERE", with a parenthetical stating that the gate is a whole-file grep and that the note therefore names the concept and never the identifier.
- **Files modified:** `src/app/apply/[token]/apply-context.ts`
- **Commit:** `f57605ba9`

**2. [Rule 3 - Blocking] The `space-y-` gate was tripped the same way, twice**

- **Found during:** Task 2
- **Issue:** The plan requires `grep -c 'space-y-' == 0` and simultaneously requires the file to explain that `/sign` uses that utility here and must not be copied. Both comments spelled it out.
- **Fix:** Both reworded to "Tailwind's vertical-space utility" / "the vertical-space utility /sign uses in the same position", with the D-2 reference intact and a note that the gate is a whole-file grep on the utility prefix. Count is now 0 for `space-y-` and for bare `space-y`.
- **Files modified:** `src/app/apply/[token]/page.tsx`
- **Commit:** `0e45fef02`

This is the third and fourth instance of this class in this phase (66-07 recorded two). The pattern is now explicit enough to state as a rule: **when a plan pairs a whole-file absence grep with a mandated comment about the thing being forbidden, write the comment about the concept and never the token.**

**3. [Rule 3 - Blocking] The plan's test command cannot run as written**

- **Found during:** Task 1
- **Issue:** `bun run test:unit -- --run <file>` is a CAC duplicate-flag error — `package.json#scripts.test:unit` already injects `--run`.
- **Fix:** Run as `bun run test:unit -- <file>`. Same pre-existing gap 66-07 recorded.

**4. [Rule 1 - Bug] `next build` rewrote `next-env.d.ts` and it was reverted, not committed**

- **Found during:** post-Task-2 verification
- **Issue:** `next build` rewrites the generated `next-env.d.ts` import from `./.next/dev/types/routes.d.ts` to `./.next/types/routes.d.ts`. The committed file is the dev variant. Committing the build variant would have shipped a build artifact that degrades the local dev typecheck path.
- **Fix:** `git checkout -- next-env.d.ts` (a single named file, never a blanket reset). Typecheck re-run and passing afterwards. The working tree is clean apart from three untracked entries that pre-date this plan.

### Additive to the Plan

**Render-level assertions were added to the Task 1 test file.** The plan scopes byte-identity entirely to 66-17's E2E ("jsdom cannot prove either"). That is true of the rendered `<head>` and the HTTP status, but **not** of the card markup: an async Server Component can be awaited and rendered through `renderToStaticMarkup`, because every component beneath it is synchronous. Seven of the eighteen tests are render tests, and they are the ones that catch P1 and P4–P7. Leaving byte-identity to E2E alone would have left this plan's central security property with no local gate at all.

The plan's `files_modified` names the test file, so this is additive within a declared file rather than a new one.

### Stated Position, Not a Silent Overrun

**The context-error copy lives in `page.tsx`, not `application-copy.ts`.** The plan mandates that the unavailable branch read `TOKEN_UNAVAILABLE_COPY` from the shared module and says only that the context-error branch needs "recoverable copy". `application-copy.ts` is 66-02's locked module of requirement-level and control strings; this string is neither, and it is outside this plan's `files_modified`. It is a local `const` with a docblock stating why.

## Known Stubs

**One, and it is the plan's own instruction.** The valid branch's `CardContent` contains the listing summary and a marked insertion point for `<RentalApplicationForm>`, which plan **66-12** adds. The plan says explicitly *"Do not stub the form"*, and it is not stubbed — there is no placeholder input, no disabled submit button and no mock data source, because a submit affordance that submits nothing is worse on this surface than an obviously unfinished one.

Consequence to carry forward: **`/apply/<valid>` currently renders the listing summary and nothing to fill in.** That is this plan's intended terminal state, not a defect, and 66-12 closes it. The one wiring note for 66-12: `ListingCard` does not currently receive `token`, so 66-12 must thread it from `ApplyPage` through `ApplyCard` into `ListingCard` (it is deliberately not passed today because an unused parameter fails `noUnusedParameters`).

## Threat Flags

None beyond the plan's register. Every disposition in `<threat_model>` is addressed and gated:

| Threat | Disposition | Where |
|---|---|---|
| T-66-02 token-state enumeration | mitigate | One `TOKEN_UNAVAILABLE_COPY` card for all four states, no reason switch inside it, no message map in the fetcher; mutations M1, M6, P1 |
| T-66-10 capability URL indexed | mitigate | `robots: { index: false, follow: false }`, **verified present in the rendered head** of a running server; mutation P2 |
| T-66-11 owner contact published | mitigate | Owner display name only; grep gate at 0 and a rendered-text assertion (`@`, `mailto:`, `tel:` absent); mutation P5 |
| T-66-38 revoked link served from cache | mitigate | `force-dynamic` (confirmed `ƒ` in the build route table) + `cache: "no-store"`, and the live response carries `Cache-Control: ... no-store ...`; mutations P3, M2 |
| T-66-39 client-side state on a shared device | mitigate | The page holds no state: no `use client`, no hooks, all gated at 0 |
| T-66-SC package installs | mitigate | Zero packages. `Card`, `CardHeader`, `CardTitle`, `CardContent` and `AlertCircle` all pre-existed |

**One observation worth recording, not a defect.** The root layout (`src/app/layout.tsx:105`) renders a global "Skip to main content" link on every page, so it appears on `/apply` too. UI-SPEC §A-1 says this page adds no skip link — it does not — and the global one resolves correctly, because the page's landmark is `<main id="main-content">`, which is the anchor that link targets. Removing the app-wide skip link is out of scope and would be a regression elsewhere.

## Issues Encountered

**`next build` fails locally without CI-parity env, for a reason unrelated to this plan.** `/blog/[slug]`'s `generateStaticParams` queries Supabase at build time; with no `NEXT_PUBLIC_SUPABASE_URL` it fails on `undefined`, and with a real URL but a placeholder key it fails on `Invalid API key`. The blog page's own comment (lines 112–114) documents that CI supplies `https://placeholder.supabase.co` precisely for this. Running the build with the exact env block from `ci-cd.yml:59-64` passes. Nothing in this plan touches `src/app/blog`.

The consequence for verification honesty: the running-server probes were done against the placeholder host, so they exercised the `context_error` branch. Everything they establish — HTTP 200, the rendered robots meta, the no-store header, the token never appearing in page output — is independent of which branch rendered. The unavailable-branch HTTP probe belongs to 66-17.

## Next Phase Readiness

- **66-12 (the form):** insert into `ListingCard`'s `CardContent`, which is already `flex flex-col gap-6 px-4 sm:px-6` (Spacing exception 3). Thread `token` from `ApplyPage` → `ApplyCard` → `ListingCard`. `CardContent`'s `px-4` at <640px is what buys the 311px field width E-4 asserts; do not widen it back to `px-6`. Carry-forward from 66-07 still open: the honeypot input's `name` must come from `HONEYPOT_FIELD`, never the literal.
- **66-17 (E2E):** E-9 and E-10 are the two this plan could not fully close. E-9 is already observably true against a real server and should still be asserted there. E-10's status half is true; its "byte-identical to the expired-token render" half needs a link row in an expired or revoked state in the fixture. Note that a whole-document byte comparison **will** differ on the per-request `sentry-trace` meta and on the token inside the RSC flight payload — assert on rendered **text**, as E-10's wording ("its text is byte-identical") already says.
- **The two-weight typography contract** is honoured with one authored divergence from `/sign`: no `font-medium` on the `<dt>`. If 66-12 or 66-13 mirrors `/sign`'s `SummaryRow` elsewhere, mirror this version, not `/sign`'s.

No blockers.

## Self-Check: PASSED

Files:

- `src/app/apply/[token]/apply-context.ts` — FOUND (111 lines)
- `src/app/apply/[token]/page.tsx` — FOUND (215 lines)
- `src/app/apply/[token]/__tests__/apply-context.test.ts` — FOUND (379 lines, 44 assertions)

Commits:

- `f57605ba9` — FOUND in git log
- `0e45fef02` — FOUND in git log

Working tree clean for every file this plan touched. The three untracked entries (`.agents/`, `.github/instructions/`, `skills-lock.json`) pre-date this plan and were left alone. `next-env.d.ts` was reverted to its committed state after the build rewrote it.

---
*Phase: 66-rental-application-intake*
*Completed: 2026-08-07*
