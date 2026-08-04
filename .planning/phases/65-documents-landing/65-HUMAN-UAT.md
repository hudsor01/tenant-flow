---
status: complete
phase: 65-documents-landing
source: [65-VERIFICATION.md]
started: 2026-08-03T18:05:00Z
updated: 2026-08-03T21:20:00Z
---

## Current Test

[none — both items resolved]

## Tests

### 1. Confirm the reversed 308 does not stick in browser/intermediary caches (WR-05 / L-01)
expected: Authenticated GET /documents returns 200 (or the auth redirect to sign-in) with no `location: /documents/vault`, and `Cache-Control` on the response is not cacheable as permanent.
result: pass
method: root-cause analysis, not live observation — the failure mode was proven unreachable rather than observed absent
resolution: |
  The test's premise is false: no window ever existed in which /documents served a
  redirect that a browser could cache. CORRECTED after re-verification pushed back on
  the original write-up — two of its claims were overstated and are retracted below.

  LOAD-BEARING EVIDENCE (each independently confirmed twice):

  1. FORCE-DYNAMIC PREDATES THE REDIRECT BY TWO MONTHS. `export const dynamic =
     "force-dynamic"` landed on `(owner)/layout.tsx` in `6e036280a` on 2026-03-06.
     `permanentRedirect` did not appear in `documents/page.tsx` until `acd33dcc6` on
     2026-05-15. The route was therefore dynamic — and so uncacheable — for the entire
     lifetime of the redirect. This is the proof; it does not depend on which internal
     Next code path emitted the response.
  2. NEVER A CONFIG REDIRECT. `git log -S'"/documents"' -- next.config.ts` is empty, so
     it was never a `next.config.js` `redirects()` entry, which is where a genuinely
     long-cacheable 308 would originate.
  3. CONFIRMED LIVE. `curl -sSI https://tenantflow.app/documents` — production still
     runs the pre-65 code — returns 307 to /login with `cache-control: public,
     max-age=0, must-revalidate`. Reproduced independently during re-verification.

  RETRACTED — claimed in the first write-up, not upheld:

  - "Streaming context means it was never an HTTP 308." The `(owner)/loading.tsx`
     segment does put the route in a streaming context, and the Next docs do say
     `permanentRedirect` inserts a client-side meta tag there. But re-verification read
     `app-render.js` at the cited lines and could NOT confirm that this synchronous,
     zero-`await` redirect component took the streaming path rather than the ordinary
     synchronous redirect path. Treat the emitted status as UNKNOWN; the conclusion
     does not rest on it.
  - "loading.tsx and documents/page.tsx were added in the same commit, so there was no
     window without it." The FILE was added in `80fea490c`, but the `permanentRedirect`
     CONTENT arrived in `acd33dcc6` two months later. The original claim conflated file
     creation with redirect introduction. Point 1 above supersedes it and is stronger.

  The post-deploy curl check originally proposed would have been a tautology either way.

### 2. Visual check of the three-band ladder at desktop and 375px
expected: Band weighting descends correctly (`size-12` -> `size-10` -> `size-8` medallions), Band 3 collapses `lg:grid-cols-4` -> `sm:grid-cols-2` -> 1 column, and the Empty block's `md:py-6` companion actually compacts the empty-state panel at md+ widths.
result: pass
method: |
  Measured in a real rendering browser, not eyeballed. The deploy blocker was routed
  around rather than waited on: the REAL page components were rendered to markup
  (mocking only the two data hooks), that markup was served against the REAL compiled
  stylesheet from `.next/static/chunks/*.css` (282KB, carrying both the globals.css
  @layer base rules and every utility), and the boxes were measured with Playwright
  driving system Chrome at three viewports.

  Valid for these three claims specifically because all of them are decided by
  viewport-width media queries and fixed-size utilities, none of which depend on the
  app shell's sidebar. Tile PIXEL widths would differ under the real shell; column
  COUNT, medallion size and padding do not.

  KNOWN LIMITATION, raised by re-verification: the harness was throwaway and is NOT
  committed, so this measurement is not re-runnable from the repo. The temp render
  harness lived briefly under `src/**/__tests__/` and was deleted immediately (repo
  cleanliness confirmed via `git status` after each use). Re-verification cross-checked
  every numeric claim against the static Tailwind-affecting source instead — no custom
  breakpoints or spacing in `@theme` — and confirmed the numbers are what the current
  source deterministically produces. So the evidence stands on its own, but reproducing
  it means rebuilding the harness. Recorded rather than glossed.
resolution: |
  | Viewport | size-12 | size-10 | size-8 | Band 3 columns |
  |----------|---------|---------|--------|----------------|
  | 1280     | 48px    | 40px    | 32px   | 4              |
  | 900      | 48px    | 40px    | 32px   | 2              |
  | 375      | 48px    | 40px    | 32px   | 1              |

  - Medallion ladder descends exactly 48 -> 40 -> 32 at every viewport (§I-1, §I-3).
  - Band 3 collapses `lg:grid-cols-4` -> `sm:grid-cols-2` -> 1 column exactly as
    specified.
  - Empty compaction confirmed: computed padding is 24px top AND bottom at 1280 —
    i.e. `py-6 md:py-6` holds at md+ instead of `Empty`'s base `md:p-12` (48px).
    L-07's warning that `py-6` alone would not compact is therefore correctly handled.
  - No horizontal document overflow at 375px.

  Six perfect-PR fixes were also confirmed in a real browser rather than by
  class-contract pin:
  - recent list `padding-left: 0px` (global `ul,ol` indent neutralized)
  - `margin-top: 0px` with `margin-bottom: 16px` — the bottom margin is the parent's
    `space-y-4`, which is exactly what `my-0` would have destroyed
  - `<li>` `margin-bottom: 0px` (base `li` rule neutralized)
  - row rhythm `display: flex`, `row-gap: 4px`, measured gaps [4,4,4,4] at both 1280
    and 375 — NOT flattened
  - meta line `margin-bottom: 0px` (base `p` rule neutralized)
  - PrintablesBand description -> grid measured 16px, not the 32px the flex-item
    margin trap produced

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
