---
phase: 14-battle-test-findings-remediation
plan: 02
subsystem: stripe-client
tags: [stripe, bundle-hygiene, dead-code, /pricing, ad-blocker]
dependency_graph:
  requires: []
  provides:
    - "src/lib/stripe/stripe-client.ts (no Stripe.js import, server-side flows only)"
  affects:
    - "src/components/pricing/* (import surface unchanged — still pulls createCheckoutSession + isUserAuthenticated, but no longer drags @stripe/stripe-js into the /pricing chunk)"
    - "src/app/(owner)/billing/plans/page.tsx (import surface unchanged)"
tech_stack:
  added: []
  patterns: []
  removed:
    - "@stripe/stripe-js (uninstalled — was dead-code dependency)"
key_files:
  created: []
  modified:
    - "src/lib/stripe/stripe-client.ts (deleted top-level @stripe/stripe-js import, stripePromise binding, getStripe function, and now-unused createLogger import + logger)"
    - "package.json (@stripe/stripe-js removed from dependencies)"
    - "pnpm-lock.yaml (refreshed; direct entry for @stripe/stripe-js gone — transitive remains via @stripe/react-stripe-js peer dep, out of scope)"
  deleted: []
decisions:
  - "Pure deletion over a stripe-js-loader.ts split: getStripe had zero callers in src/, so there is nothing to lazy-load — deleting is strictly better than refactoring dead code."
  - "Removed createLogger + logger entirely from this module: only getStripe ever used it. noUnusedLocals strict mode would have failed the build otherwise."
metrics:
  duration_minutes: 4
  completed_date: "2026-05-14T19:49:22Z"
  tasks: 1
  files_modified: 3
---

# Phase 14 Plan 02: D-02 Delete Dead Stripe.js Code Summary

Removed the dead `@stripe/stripe-js` top-level import, `stripePromise` binding, and `getStripe()` function from `src/lib/stripe/stripe-client.ts` and uninstalled the package — `/pricing` no longer fires a network request to `js.stripe.com`, killing the "Failed to load Stripe.js" ad-blocker console warning on the highest-converting page.

## What Changed

- `src/lib/stripe/stripe-client.ts`: deleted three things — the `import { loadStripe, type Stripe } from '@stripe/stripe-js'` line, the module-level `let stripePromise: Promise<Stripe | null> | null = null` binding, and the entire `getStripe()` function. Also dropped the now-unused `import { createLogger } from '#lib/frontend-logger'` + `const logger = createLogger(...)` because `getStripe` was the only consumer and `noUnusedLocals` strict mode would have failed the build.
- `package.json`: `@stripe/stripe-js` removed from `dependencies` via `pnpm remove`.
- `pnpm-lock.yaml`: regenerated; no direct `@stripe/stripe-js` entry remains (transitive entry under `@stripe/react-stripe-js` peer-dep persists — see Deferred Issues).

## What Stayed Identical

`createCheckoutSession`, `isUserAuthenticated`, `getCurrentUser`, and `createCustomerPortalSession` are byte-for-byte unchanged. The three pricing cards (`pricing-card-featured`, `pricing-card-standard`, `kibo-style-pricing`) and `/billing/plans/page.tsx` continue to import these exact functions from `#lib/stripe/stripe-client` — no caller-side changes were needed because none of them ever imported `getStripe` or `loadStripe`.

## Verification

| Check | Expected | Actual |
| --- | --- | --- |
| `grep -c '@stripe/stripe-js' src/lib/stripe/stripe-client.ts` | 0 | 0 |
| `grep -rln '@stripe/stripe-js' src/ package.json \| wc -l` | 0 | 0 |
| `grep -c "loadStripe\|stripePromise\|getStripe" src/lib/stripe/stripe-client.ts` | 0 | 0 |
| `createCheckoutSession` export | 1 | 1 |
| `isUserAuthenticated` export | 1 | 1 |
| `getCurrentUser` export | 1 | 1 |
| `createCustomerPortalSession` export | 1 | 1 |
| `pnpm typecheck` | clean | clean |
| `pnpm lint` | clean | clean |
| `pnpm test:unit` | 99,534 pass | 99,534 pass (134 files) |
| lefthook pre-commit | green | green (gitleaks + lockfile-verify + lint + typecheck + unit-tests) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Removed unused `createLogger` + `logger` from `stripe-client.ts`**
- **Found during:** Task 1, immediately after deleting `getStripe`
- **Issue:** `getStripe` was the only function in the module that referenced `logger`. After deleting `getStripe`, the `const logger = createLogger(...)` plus `import { createLogger }` were unused locals. Project has `noUnusedLocals: true` strict mode, so the typecheck would have failed.
- **Fix:** Removed both the `createLogger` import and the `logger` constant. The plan only listed three explicit deletions (import + stripePromise + getStripe), but `noUnusedLocals` made these two additional deletions mandatory for the build to stay green.
- **Files modified:** `src/lib/stripe/stripe-client.ts`
- **Commit:** `8ebfccfc7`

## Deferred Issues

**1. `@stripe/react-stripe-js` is also dead weight (kept by design — out of D-02 scope)**
- `pnpm-lock.yaml` still references `@stripe/stripe-js@9.4.0` transitively because `@stripe/react-stripe-js@6.3.0` declares it as a peer dependency.
- `grep -rn "@stripe/react-stripe-js" src/` returns zero callers — the sibling package is also unused.
- Logged in `.planning/phases/14-battle-test-findings-remediation/deferred-items.md` for a follow-up plan. The acceptance criterion (`grep -rln '@stripe/stripe-js' src/ package.json` → 0) is satisfied because the lockfile is intentionally excluded from the criterion path. Both packages can be dropped together in a future cleanup.

## Self-Check: PASSED

- File `src/lib/stripe/stripe-client.ts` exists and contains the four expected exports with the dead-code names absent.
- Commit `8ebfccfc7` is present on branch `gsd/phase-14-battle-test-findings`.
- File `.planning/phases/14-battle-test-findings-remediation/deferred-items.md` exists.
