---
status: partial
phase: 65-documents-landing
source: [65-VERIFICATION.md]
started: 2026-08-03T18:05:00Z
updated: 2026-08-03T15:55:00Z
---

## Current Test

number: 2
name: Visual check of the three-band ladder at desktop and 375px
expected: |
  Band weighting descends (size-12 -> size-10 -> size-8 medallions), Band 3 collapses
  lg:grid-cols-4 -> sm:grid-cols-2 -> 1 column, and the Empty block's md:py-6 companion
  actually compacts the empty-state panel at md+ widths.
awaiting: user response

## Tests

### 1. Confirm the reversed 308 does not stick in browser/intermediary caches (WR-05 / L-01)
expected: Authenticated GET /documents returns 200 (or the auth redirect to sign-in) with no `location: /documents/vault`, and `Cache-Control` on the response is not cacheable as permanent.
result: pass
method: root-cause analysis, not live observation — the failure mode was proven unreachable rather than observed absent
resolution: |
  The test's premise is false: this codebase has never been capable of emitting a
  cacheable permanent redirect for /documents. Five independent lines of evidence,
  each verified rather than assumed:

  1. STREAMING CONTEXT. `src/app/(owner)/loading.tsx` exists and is inherited by
     /documents. Next.js 16.2.12 docs for `permanentRedirect` state: "When used in a
     streaming context, this will insert a meta tag to emit the redirect on the client
     side." A segment with loading.tsx is a streaming context, so the old page served a
     200 HTML shell with a client-side redirect — not an HTTP 308 at all.

  2. NO HISTORICAL WINDOW. `git log --diff-filter=A` shows `(owner)/loading.tsx` and
     `(owner)/documents/page.tsx` were added in the SAME commit (80fea490c). The
     streaming context has coexisted with the redirect for its entire life; there was
     never a period during which a bare 308 shipped.

  3. NEVER A CONFIG REDIRECT. `git log -S'"/documents"' -- next.config.ts` returns
     nothing. It was never a next.config.js `redirects()` entry, which is where a
     genuinely long-cacheable 308 would originate.

  4. NEXT NEVER MAKES IT CACHEABLE. In Next 16.2.12 the Server Component redirect path
     (`app-render.js:1979-1991` and `:4292-4297`) sets only `res.statusCode` and the
     `location` header. No long-lived Cache-Control is attached anywhere on that path.

  5. FORCE-DYNAMIC, CONFIRMED LIVE. `(owner)/layout.tsx:1` is
     `export const dynamic = "force-dynamic"`. Production (which still runs the OLD
     pre-phase-65 code) was queried directly: `curl -sSI https://tenantflow.app/documents`
     returns `307` to `/login?redirect=%2Fdocuments` with
     `cache-control: public, max-age=0, must-revalidate`. `max-age=0` +
     `must-revalidate` forbids reuse without revalidating against the server.

  Conclusion: no browser or intermediary can be holding a cached permanent redirect for
  /documents, so the reversal cannot be defeated by one. The post-deploy curl check
  originally proposed would have been a tautology.

  Confirmed independently for the NEW code: no `permanentRedirect`/`redirect(` remains
  anywhere under `src/app/(owner)/documents/`, no `/documents` rule exists in
  `next.config.ts` or `vercel.json`, and the built manifest maps
  `/(owner)/documents/page` -> `/documents` as a real dynamic route.

### 2. Visual check of the three-band ladder at desktop and 375px
expected: Band weighting descends correctly (`size-12` -> `size-10` -> `size-8` medallions), Band 3 collapses `lg:grid-cols-4` -> `sm:grid-cols-2` -> 1 column, and the Empty block's `md:py-6` companion actually compacts the empty-state panel at md+ widths.
why_human: No visual-regression or axe sweep is registered for /documents; layout and spacing correctness at breakpoints cannot be confirmed by grep or unit tests. Requires a rendering browser against an authenticated session.
result: [pending]
blocked_by: release-build
reason: |
  Vercel builds `main` only for this project — confirmed twice: zero preview deploys
  across the last 20 deployments (all `target: production`, ref `main`), and a
  time-windowed query covering the branch push returned no deployments. The branch was
  pushed to origin, but no preview URL exists or will be created by the git integration.
  /documents also sits behind the proxy's auth + subscription gate, so any check needs a
  real logged-in session.

## Summary

total: 2
passed: 1
issues: 0
pending: 1
skipped: 0
blocked: 1

## Gaps
