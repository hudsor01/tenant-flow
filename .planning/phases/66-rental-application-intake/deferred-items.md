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
