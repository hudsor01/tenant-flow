# Phase 14 — Deferred Items

Out-of-scope discoveries logged during plan execution. Not fixed in the plan that surfaced them.

## From 14-02 (D-02 — delete dead Stripe.js code)

- **`@stripe/react-stripe-js` is also dead weight.** Found while running `pnpm remove @stripe/stripe-js`: the lockfile still references `@stripe/stripe-js@9.4.0` because `@stripe/react-stripe-js@6.3.0` declares it as a peer dependency. `grep -rn "@stripe/react-stripe-js" src/` returns zero callers in source. Plan 14-02's scope was strictly D-02 (`@stripe/stripe-js`), so this is logged here for a follow-up plan. Removing it would let `@stripe/stripe-js` actually leave `pnpm-lock.yaml` too.
  - **Files:** `package.json` line 136 (`"@stripe/react-stripe-js": "^6.3.0"`)
  - **Action:** `pnpm remove @stripe/react-stripe-js` in a future plan; verify lockfile no longer mentions either `@stripe/*-stripe-js` package.

## From 14-04 (D-04 — route-scoped /blog/loading.tsx)

- **Pre-existing untracked items unrelated to 14-04**, present at session start per the `gitStatus` snapshot:
  - `.planning/sentry-coverage/` — pre-existing planning artifacts directory
  - `.planning/v1.0-cleanup/` — pre-existing planning artifacts directory
  - `BATTLE-TEST-BROWSER-AGENT.txt` — pre-existing scratch file
  - **Action:** Out of scope for 14-04 (D-04 strictly added two new files under `src/app/blog/`). Each untracked item belongs to a separate workstream; whoever owns those workstreams should commit, gitignore, or delete them.

