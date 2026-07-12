# Phase 14 Plan 01 Summary — Dedup + Failure Output (BLOG-09a/b)

**Status:** COMPLETE (2026-06-10). **Branch:** gsd/phase-14-cadence-dedupe-monitoring.

## What shipped
- **Pre-POST slug dedup (BLOG-09a):** `scripts/generate-blog-draft.ts` — after the judge gate + `applySlugOverride` + the dry-run early-return and BEFORE the HMAC POST, the generator probes `public.blogs` for `draft.slug` (any status). If it exists → logs + `return` (exit 0, **no POST, no wasted local-LLM generation**); the ingest EF's 23505/409 stays as the defense-in-depth backstop. Exported `blogSlugExists(probe, slug)` takes a **probe closure** rather than the client — decouples it from the deeply-generic `SupabaseClient` type (which blew up `tsc` with TS2589) and makes the unit fake a one-liner. Read-only SELECT of the slug column only; throws on a PostgREST error (never silent-false).
- **Greppable failure output (BLOG-09b):** `fail()` now writes via exported `formatGenFailure(reason) → "BLOG-GEN-FAIL: <reason>"`, so any failed run (incl. the top-level `main().catch`) surfaces a greppable line in the n8n Execute Command log.
- **+4 unit tests:** `blogSlugExists` resolves true (row) / false (no row) / rejects (PostgREST error); `formatGenFailure` emits the greppable prefix.

## Notes
- main()'s skip-before-POST wiring is verified by inspection (the dedup `return` precedes the payload/POST block); main() is the CLI orchestrator (guarded, needs the live LLM) so it isn't unit-harnessed — the load-bearing logic (`blogSlugExists`) is fully tested.
- typecheck + lint + the full pre-commit unit suite green.
