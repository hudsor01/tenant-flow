---
phase: 13-seo-01-reclaim-integration
plan: 01
subsystem: seo
tags: [seo, blog-reclaim, generator, drift-guard]
requires: [BLOG-08]
provides:
  - RECLAIM_QUEUE const (top-10 ghost slugs, drift-guarded)
  - "--slug <ghost-slug> override on the blog generator"
affects:
  - scripts/generate-blog-draft.ts
  - src/lib/seo/reclaim-queue.ts
tech-stack:
  added: []
  patterns:
    - "pure exported arg-parse helpers (parseSlugOverride / parsePositionals / applySlugOverride) unit-tested without spawning the CLI"
    - "compile-time drift guard: reclaim-queue test asserts every queue slug is a current DELETED_BLOG_REDIRECTS source"
key-files:
  created:
    - src/lib/seo/reclaim-queue.ts
    - src/lib/seo/__tests__/reclaim-queue.test.ts
  modified:
    - scripts/generate-blog-draft.ts
    - scripts/generate-blog-draft.test.ts
decisions:
  - "category stored as plain string in ReclaimQueueItem (no Category import from scripts/) — keeps scripts out of src/ runtime deps; the test asserts membership in the five valid categories"
  - "added parsePositionals helper so --slug + value is skipped when computing topic/category, making BOTH `<topic> software-vault --slug <ghost>` and `--slug <ghost> <topic> software-vault` resolve identically (deviation, Rule 2)"
  - "applySlugOverride / parseSlugOverride THROW typed Errors (not fail()/exit) so they are assertable; main()'s existing .catch(() => fail()) converts to exit"
metrics:
  duration: ~12m
  completed: 2026-06-09
---

# Phase 13 Plan 01: Generator `--slug` Override + Seeded Reclaim Queue Summary

Added the reclaim MECHANISM front-half (BLOG-08): a `--slug <ghost-slug>` override on `scripts/generate-blog-draft.ts` that pins a draft to an EXACT deleted ghost slug (re-validated against the same slug gate), plus a drift-guarded `RECLAIM_QUEUE` of the top-10 ghost slugs to feed it.

## What Was Built

### Task 1 — `RECLAIM_QUEUE` const + drift-guard test (commit `95fcc9281`)
- `src/lib/seo/reclaim-queue.ts` exports `interface ReclaimQueueItem { readonly slug; readonly topic; readonly category }` (all `string` — no `Category` import from `scripts/`) and `const RECLAIM_QUEUE: readonly ReclaimQueueItem[]` with the 10 audit slugs verbatim, a humanized sentence-case `topic` hint per slug, and `category: "software-vault"` for all 10 (each is a competitor/pricing/listicle ghost). File-header cites BLOG-08b + ANALYSIS-2026-05-29.md and states the invariant: every slug must remain a `DELETED_BLOG_REDIRECTS` source until `reclaim-finalize` removes it on publish.
- `src/lib/seo/__tests__/reclaim-queue.test.ts` imports `RECLAIM_QUEUE` from `../reclaim-queue` and `DELETED_BLOG_REDIRECTS` from `../blog-redirects`; defines the slug regex + valid-category set locally (no `scripts/` import) and asserts: exactly 10 entries, every slug passes the gate (regex + length 3-120), every slug is a current redirect source (drift guard), every category is valid, slugs are unique, every topic is non-empty.

### Task 2 — `--slug` override on the generator (commit `aefe3b7b6`)
- `scripts/generate-blog-draft.ts`:
  - `parseSlugOverride(argv): string | undefined` — returns the token after `--slug`, `undefined` when absent, THROWS on a dangling/flag-valued `--slug` (no silent no-op).
  - `applySlugOverride(draft, override): Draft` — when set, re-validates the override against the same `SLUG_REGEX` + length 3-120 rule `runGates()` uses and THROWS on violation, then returns `{ ...draft, slug: override }`; when `undefined`, returns the draft unchanged.
  - `parsePositionals(argv)` — `--slug`-aware topic/category extraction (skips the `--slug` flag + its value and all other `--flags`), so a ghost slug is never mistaken for a positional in either arg order.
  - `main()` computes `slugOverride` alongside `dryRun`/`topic`/`category`, then applies `draft = applySlugOverride(draft, slugOverride)` AFTER gates+judge and BEFORE the dry-run print / HMAC POST, so the printed/posted slug is the override.
  - Usage doc comment + the `fail()` usage string now mention `--slug <ghost-slug>`.
- `scripts/generate-blog-draft.test.ts`: 15 new tests (parse happy paths incl. `--slug` before/after the topic, absent→undefined, dangling/flag-valued `--slug`→throws; override pins slug, undefined passes through, regex-invalid / >120 / <3 → throws; ghost slug accepted; `parsePositionals` keeps topic/category in both orderings and never uses the `--slug` value as category) alongside the existing 9 judge-gate tests — no regressions.

## Threat Mitigations Applied
- **T-13-01** (override bypassing the slug gate): `applySlugOverride` re-validates against the same regex + length rule and throws before the draft is returned — never reaches the HMAC POST.
- **T-13-02** (malformed argv): `parseSlugOverride` hard-errors on a dangling/flag-valued `--slug`; `parsePositionals` skips the `--slug`/value pair so a ghost slug can't be silently used as category.
- **T-13-04** (queue drift): `reclaim-queue.test.ts` asserts every queue slug is a current `DELETED_BLOG_REDIRECTS` source — drift fails before a stale queue can mislead the owner.

## Deviations from Plan

### Auto-added functionality

**1. [Rule 2 - Robustness] Added `parsePositionals` helper for order-independent topic/category parse**
- **Found during:** Task 2.
- **Issue:** The plan requires BOTH `<topic> software-vault --slug <ghost> --dry-run` AND `--slug <ghost> <topic> software-vault --dry-run` to resolve identically (CONTEXT verification line). The original `topic = argv[2]` / `catArg = argv[3]` parse breaks the second ordering (argv[2] would be `--slug`) and risks treating the ghost slug as the category positional.
- **Fix:** Extracted `parsePositionals(argv)` which walks `argv.slice(2)`, skipping every flag and the `--slug` flag+value pair, and returns the remaining positionals as `{ topic, category }`. Exported + unit-tested (4 cases covering both orderings + the never-use-slug-value-as-category guard).
- **Files modified:** `scripts/generate-blog-draft.ts`, `scripts/generate-blog-draft.test.ts`.
- **Commit:** `aefe3b7b6`.

No other deviations — plan executed as written.

## Manual Smoke (owner-run, NOT in CI)
Per Task 2 acceptance, the full-pipeline smoke requires LM Studio (Mistral + qwen3-embedding loaded) + `.env.local` creds, which are scrubbed from the agent shell. The owner should run:

```
bun scripts/generate-blog-draft.ts "<topic>" software-vault --slug top-3-property-management-apps-for-commercial-landlords --dry-run
```

Expected: the dry-run prints `slug: top-3-property-management-apps-for-commercial-landlords` and `judge: PASS`. The parse + override + gate-revalidation logic that produces that slug is fully unit-tested (the override path is deterministic and order-independent); only the model generation + judge run requires the local LLM.

## Verification Results
- `bun run test:unit -- src/lib/seo/__tests__/reclaim-queue.test.ts` — 6/6 green.
- `bun run test:unit -- scripts/generate-blog-draft.test.ts` — 24/24 green (9 existing judge + 15 new).
- Both files together — 30/30 green.
- `bun run typecheck` — clean (no `any`, no `as unknown as`, no scripts→src import).
- `bunx biome check <files>` — clean; `bun run lint` — exit 0.
- Pre-commit hook (gitleaks, lockfile, lint, typecheck, full unit suite, commitlint) passed on both commits.

## Known Stubs
None.

## Commits
- `95fcc9281` — feat(13-01): seed reclaim queue with drift-guarded top-10 ghost slugs
- `aefe3b7b6` — feat(13-01): add --slug ghost-slug override to blog generator

## Self-Check: PASSED
- All 5 created/modified files present on disk.
- Both task commits (`95fcc9281`, `aefe3b7b6`) exist in git history.
