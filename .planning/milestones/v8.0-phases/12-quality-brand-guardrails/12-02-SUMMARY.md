---
phase: 12-quality-brand-guardrails
plan: 02
subsystem: ui
tags: [react, nextjs, tanstack-query, supabase, rls, server-actions, blog, admin]

# Dependency graph
requires:
  - phase: 11-blog-ingest
    provides: in-review blog drafts inserted by the generator (status='in-review', author_user_id=null)
  - phase: 12-quality-brand-guardrails (plan 01)
    provides: self-critique judge gate so only quality drafts reach in-review
provides:
  - "/admin/blog approve/reject surface in the (admin) route group"
  - "admin-gated publishBlogPost/rejectBlogPost server actions (status flip + revalidatePath)"
  - "blogQueries.reviewQueue() admin-only in-review query factory + BlogReviewItem type"
  - "useApproveBlogMutation/useRejectBlogMutation TanStack mutations"
affects: [12-03 byline + E2E plan, blog publishing pipeline, admin tooling]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Defense-in-depth admin write: (admin) layout wall (L2) + server-action is_admin re-check (L3) + blogs_update_admin RLS (L4)"
    - "Sanitized markdown preview by reusing the public MarkdownContent (rehype-raw + rehype-sanitize); never dangerouslySetInnerHTML"
    - "Mutation throws on { ok:false } server-action result so the standard onError path fires (no silent success)"

key-files:
  created:
    - src/app/(admin)/admin/blog/page.tsx
    - src/app/(admin)/admin/blog/blog-review-client.tsx
    - src/app/actions/blog-publish.ts
    - src/hooks/api/use-blog-admin-mutations.ts
    - src/hooks/api/use-blog-admin-mutations.test.ts
  modified:
    - src/hooks/api/query-keys/blog-keys.ts

key-decisions:
  - "publishBlogPost is the ONLY code path that sets status='published' (T-12-09: nothing publishes without an explicit Approve)"
  - "requireAdminClient() helper returns the authenticated client on success so the is_admin re-check and the RLS-gated write share one session"
  - "Page fetches in-review drafts server-side via the cookie-aware server client with its own typed mapBlogReviewRow mapper (no any, no as unknown as)"

patterns-established:
  - "Admin server-action gating: getUser() -> users.is_admin re-check, generic client error + Sentry log, typed BlogActionResult discriminated union"
  - "Collapsible markdown preview rendered through the existing sanitized MarkdownContent default export"

requirements-completed: [BLOG-07]

# Metrics
duration: ~20min
completed: 2026-06-09
---

# Phase 12 Plan 02: Admin Blog Approve/Reject Surface Summary

**A `/admin/blog` review page that lists in-review drafts with a sanitized markdown preview and Approve/Reject actions, backed by admin-gated `publishBlogPost`/`rejectBlogPost` server actions that flip status through the `blogs_update_admin` RLS policy and revalidate the public ISR pages.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 3
- **Files created:** 5
- **Files modified:** 1

## Accomplishments
- Admin approve/reject surface in the existing `(admin)` group, inheriting the is_admin wall (not re-walled) and showing an Empty state when there are no drafts.
- Admin-gated `publishBlogPost(id, slug)` (status→`published` + `published_at` + `revalidatePath('/blog')` and `/blog/<slug>`) and `rejectBlogPost(id)` (status→`archived`), both re-checking `is_admin` and writing through the authenticated cookie-aware client — never the service role.
- `blogQueries.reviewQueue()` factory + `BlogReviewItem` Pick<> type for the in-review list (browser client).
- `useApproveBlogMutation`/`useRejectBlogMutation` calling the server actions, throwing on `{ ok:false }`, invalidating `blogQueries.all()` on success — proven by 6 passing unit tests including the error path.

## Task Commits

Each task was committed atomically:

1. **Task 1: Admin in-review query factory + publish/reject server action** - `8a704f620` (feat)
2. **Task 2: /admin/blog page + review client + approve/reject mutations** - `76f71ce28` (feat)
3. **Task 3: Approve/reject mutation tests** - `7ee1e2ad8` (test)

_TDD note: the Task 3 mutation hook (`use-blog-admin-mutations.ts`) landed in the Task 2 commit because the Task 2 client component imports it and the pre-commit hook enforces a green typecheck on every commit; the Task 3 commit adds the test that exercises it. See Deviations._

## Files Created/Modified
- `src/app/actions/blog-publish.ts` - "use server" admin-gated `publishBlogPost`/`rejectBlogPost`; cookie-aware authenticated client, `is_admin` re-check, typed `BlogActionResult`, Sentry-logged generic errors, `revalidatePath` on publish.
- `src/app/(admin)/admin/blog/page.tsx` - Server Component listing in-review drafts via the server client with a typed `mapBlogReviewRow` mapper; container classes match the analytics page; Empty state.
- `src/app/(admin)/admin/blog/blog-review-client.tsx` - "use client" review rows: title/slug/words/date, collapsible sanitized `MarkdownContent` preview, shadcn Approve/Reject Buttons disabled while pending, `bg-background`/`text-muted-foreground` tokens, no inline styles, 97 lines.
- `src/hooks/api/use-blog-admin-mutations.ts` - `useApproveBlogMutation`/`useRejectBlogMutation`; throws on `{ ok:false }`, invalidates `blogQueries.all()`.
- `src/hooks/api/use-blog-admin-mutations.test.ts` - 6 tests: call args, invalidation, and the `{ ok:false }` error path for both mutations (chai-6-safe `rejects.toMatchObject`).
- `src/hooks/api/query-keys/blog-keys.ts` - added `BlogReviewItem` type, `BLOG_REVIEW_COLUMNS`, and the `blogQueries.reviewQueue()` factory.

## Decisions Made
- `requireAdminClient()` helper centralizes the `getUser()` + `users.is_admin` re-check and returns the same authenticated client so the gate and the write reuse one session.
- `status='published'` is written in exactly one place (`publishBlogPost`) to satisfy "nothing auto-publishes" (T-12-09).
- The page uses its own typed `mapBlogReviewRow` (NOT NULL fields throw, nullable columns normalized) rather than `as unknown as`, consistent with the analytics page's row-mapper pattern.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Mutation hook committed with Task 2 instead of Task 3**
- **Found during:** Task 2 (admin page + review client)
- **Issue:** The Task 2 client component imports `use-blog-admin-mutations.ts` (a Task 3 artifact). The pre-commit hook runs typecheck on every commit, so the Task 2 commit could not be green without the hook present.
- **Fix:** Created `use-blog-admin-mutations.ts` (the Task 3 GREEN implementation) and staged it with the Task 2 commit so that commit typechecks independently; the Task 3 commit then adds the test that exercises it. The plan's `must_haves` artifacts, exports, and `key_links` are all satisfied; only the commit boundary for the hook moved.
- **Files modified:** src/hooks/api/use-blog-admin-mutations.ts (in Task 2 commit), src/hooks/api/use-blog-admin-mutations.test.ts (Task 3 commit)
- **Verification:** Each commit passed the pre-commit hook (lint + typecheck + full unit suite). Final: typecheck clean, biome clean on all 6 plan files, 6/6 mutation tests pass.
- **Committed in:** 76f71ce28 (Task 2) + 7ee1e2ad8 (Task 3)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Commit-boundary adjustment only, forced by the pre-commit typecheck gate; all artifacts and acceptance criteria delivered. No scope creep.

## Issues Encountered
- Biome import-ordering and formatting nits on first write (next/cache vs next/headers order; collapsed multi-line imports) — auto-fixed via `biome check --write`, then re-verified the test still passes after the reorder.

## Threat-Model Verification (12-02 register)
- **T-12-05 / T-12-08 (Elevation of Privilege):** server actions re-check `is_admin` before any write or revalidation; `revalidatePath` runs only inside `publishBlogPost` after a successful RLS-gated update. No public revalidate endpoint added.
- **T-12-06 (Tampering, elevated creds):** grep confirms no `service_role` / service-role client import in any plan file; only the authenticated cookie-aware client is used.
- **T-12-07 (XSS):** grep confirms no `dangerouslySetInnerHTML`; preview renders through the existing `MarkdownContent` (rehype-raw + rehype-sanitize).
- **T-12-09 (Auto-publish):** `status: "published"` is set in exactly one place (`publishBlogPost`), reached only by an explicit Approve click.

## Verification Results
- `bun run typecheck` — clean.
- `bunx biome check` on all 6 plan files — no fixes applied (clean).
- `bun run test:unit -- src/hooks/api/use-blog-admin-mutations.test.ts` — 6/6 pass.
- Each of the 3 task commits passed the full pre-commit hook (gitleaks, lint, typecheck, unit suite).

## Manual / Documented Verification (deferred to runtime)
Per the plan, E2E coverage for gating + the approve flow is added in Plan 12-03. Manual check to perform as an admin: the Phase-11 in-review draft (`tenant-screening-tips-for-new-landlords`) appears at `/admin/blog`, previews via the sanitized renderer, Approve → `published` + visible at `/blog`; Reject → `archived`, not public. Non-admins are redirected by the inherited `(admin)` wall.

## Next Phase Readiness
- Approve/reject surface and server actions are in place for Plan 12-03 (byline + E2E) to add E2E coverage of the gating + approve flow.
- No blockers. No new packages, no DB migrations.

## Self-Check: PASSED

All 5 created files + the SUMMARY exist on disk; all 3 task commits (`8a704f620`, `76f71ce28`, `7ee1e2ad8`) are present in git history.

---
*Phase: 12-quality-brand-guardrails*
*Completed: 2026-06-09*
