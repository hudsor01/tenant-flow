# Phase 39 Research — Data Layer & Cache Integrity
_Fix-approach research + will-fix validation for DATA-01..18. Source: .planning/audits/2026-07-11-full-audit.md_

## DATA-01 — inspection update wipes rooms from detail cache
- **Finding:** src/hooks/api/use-inspection-mutations.ts:43 (high) — `useUpdateInspection`'s `updateDetail` writes the bare updated row (no `rooms`) over the enriched detail cache, collapsing the Rooms section after every save.
- **Root cause:** Tier-2 `updateDetail` full-replaces the detail cache with the mutation's return value, but `inspectionMutations.update()` returns `narrowInspectionEnums(updated)` from a bare `.select().single()` (inspection-mutation-options.ts:52-60) while `inspectionQueries.detailQuery(id)` returns an enriched shape (`rooms` with signed photo URLs, inspection-keys.ts:145-159). The shape mismatch type-checks silently because `Inspection.rooms` is optional. `setQueryData` also stamps `dataUpdatedAt = now`, so the poisoned entry is "fresh" for the full 5-min DETAIL staleTime, and only `lists()` is invalidated.
- **Fix:** In `useUpdateInspection` (use-inspection-mutations.ts:36-52): delete the `updateDetail` block and add the detail key to the invalidate list, exactly matching the same-file siblings `useCompleteInspection`/`useSubmitForTenantReview`:
  ```ts
  invalidate: [inspectionQueries.detailQuery(id).queryKey, inspectionQueries.lists()],
  ```
  Do NOT change `inspectionMutations.update()` — the bare row return is fine once nobody writes it into the enriched cache. This is one instance of the class-wide Tier-2 fix (see Cross-cutting notes; siblings DATA-02, DATA-03, DATA-06).
- **Why it fixes it:** The verifier showed the only cache write to `['inspections','detail',id]` after an update is the room-less `setQueryData`. Invalidation instead marks the entry stale and (because inspection-detail.client.tsx keeps the query mounted) triggers an immediate refetch through `detailQuery`'s queryFn, which rebuilds `rooms` + signed URLs. No shape-mismatched value ever enters the cache.
- **Risks / interactions:** One extra detail round-trip per save (identical cost profile to the existing complete/submit mutations — acceptable and consistent). No other phase touches use-inspection-mutations.ts. DASH (42) and SEO (48) touch `inspection-list.client.tsx` only — no overlap.
- **Files touched:** src/hooks/api/use-inspection-mutations.ts

## DATA-02 — lease renew poisons lease detail cache with embed-less row
- **Finding:** src/hooks/api/use-lease-lifecycle-mutations.ts:52 (high) — `useRenewLeaseMutation`'s `updateDetail` writes the bare renewed row into `leaseQueries.detail(id)`, marked fresh, so the lease detail page renders without the `units`/`properties` embed (blank address block) for up to 5 minutes.
- **Root cause:** Same Tier-2 class as DATA-01: `leaseMutations.renew()` returns a bare `.select().single()` row (lease-mutation-options.ts:182-191, no embeds) while `leaseQueries.detail(id)`'s queryFn selects `*, tenants:primary_tenant_id(...), units(..., properties(...))` (lease-keys.ts:98-115). `setQueryData` even CREATES a fresh entry when none existed, so first navigation to the detail page within staleTime renders the embed-less row with no refetch. Invalidate list never touches `['leases','detail',id]`.
- **Fix:** In `useRenewLeaseMutation` (use-lease-lifecycle-mutations.ts:45-60): delete `updateDetail` and switch `invalidate` to the function-of-variables form so the detail key is included (variables are `{ id, data }`); merge with the DATA-18 fix (same callback object):
  ```ts
  ...createMutationCallbacks<Lease, { id: string; data: { end_date: string; rent_amount?: number } }>(queryClient, {
    invalidate: ({ id }) => [
      leaseQueries.lists(),
      leaseQueries.detail(id).queryKey,
      tenantQueries.lists(),
      unitQueries.all(),
      ownerDashboardKeys.all,
    ],
    successMessage: "Lease renewed successfully",
    errorContext: "Renew lease",
  }),
  ```
  (`createMutationCallbacks` already supports `invalidate` as a function of variables — create-mutation-callbacks.ts:125-133 — and Tier-1/2 `onSuccess` passes variables.)
- **Why it fixes it:** `invalidateQueries` on a non-existent key is a no-op (no phantom fresh entry is created), and on an existing entry it marks it stale/refetches — so `lease-details.client.tsx`'s `lease.units?.properties?.address_line1` read always comes from the embed-carrying queryFn, per the verifier's failure path.
- **Risks / interactions:** FORM (Phase 38) fixes FORM-04 in lease-mutation-options.ts (phantom `version` column) — different file than this fix, but Phase 39 executes after 38, so rebase over it; do not touch `renew()`'s mutationFn. Renew dialog (renew-lease-dialog.tsx) relies on `onSuccess` ordering (FORMFIX-08 comment) — invalidation still runs inside `onSuccess` before the dialog's own callback, unchanged.
- **Files touched:** src/hooks/api/use-lease-lifecycle-mutations.ts

## DATA-03 — tenant update/delete never touch the withLease detail key
- **Finding:** src/hooks/api/use-tenant-mutations.ts:47 (high) — `useUpdateTenantMutation` invalidates only `tenantQueries.lists()` + dashboard and `setQueryData`s `detail(id)`; the tenant detail page reads `tenantQueries.withLease(id)` (`['tenants','with-lease',id]`), so saved edits don't appear for up to 5 minutes. `useDeleteTenantMutation` leaves a live `withLease` entry for a deleted tenant.
- **Root cause:** Key-prefix mismatch: `withLease(id)` lives under `['tenants','with-lease',id]`, which neither `lists()` (`['tenants','list']`) nor `detail(id)` (`['tenants','detail',id]`) prefix-matches. The withLease entry is deterministically seeded fresh by `useTenantList`'s select (use-tenant.ts:44-46), so after `tenant-edit-form.client.tsx` saves and `router.push(/tenants/${id})`, the pre-edit data renders with no refetch. Additionally the update mutation returns a base `Tenant` (`mapTenantBaseRow`, tenant-mutation-options.ts:67) while `updateDetail` claims `TenantWithLeaseInfo` — the same Tier-2 shape lie as DATA-01/02/06.
- **Fix:** Two edits in use-tenant-mutations.ts, plus one helper change:
  1. `useUpdateTenantMutation`: drop `updateDetail`, fix the generic to the truth (`createMutationCallbacks<Tenant, { id: string; data: TenantUpdate }>`), and use function-form invalidate:
     ```ts
     invalidate: ({ id }) => [
       tenantQueries.lists(),
       tenantQueries.detail(id).queryKey,
       tenantQueries.withLease(id).queryKey,
       ownerDashboardKeys.all,
     ],
     ```
     (This is the pattern `useMarkTenantAsMovedOutMutation` already uses at lines 98-103.)
  2. `useDeleteTenantMutation`: remove BOTH per-tenant cache entries. Change `removeDetail` in `src/hooks/create-mutation-callbacks.ts` to return an array of keys — `removeDetail?: (data: TData, variables: TVariables) => ReadonlyArray<readonly unknown[]>` — and loop `queryClient.removeQueries` over them (create-mutation-callbacks.ts:51 + 185-188). Then tenant delete returns `[tenantQueries.detail(deletedId).queryKey, tenantQueries.withLease(deletedId).queryKey]`. Update the three other `removeDetail` callers to wrap their single key in an array: use-lease-mutations.ts:185, use-unit.ts:134, use-property-mutations.ts:142.
     Removal (not invalidation) is required for delete: tenant delete is a soft-delete to `status:'inactive'` and `withLease`'s queryFn fetches by id with no status filter, so invalidation would re-populate the deleted tenant's entry.
- **Why it fixes it:** Per the verifier, the failure is exactly that no invalidated key prefix-matches `['tenants','with-lease',id]`; adding that key (update) and removing it (delete) closes both paths. Dropping `updateDetail` also stops overwriting the seeded `TenantWithLeaseInfo` entry under `detail(id)` with a lease-less base row.
- **Risks / interactions:** The `removeDetail` signature change touches use-unit.ts / use-lease-mutations.ts / use-property-mutations.ts (mechanical one-line wraps) — typecheck enforces completeness. **`src/hooks/create-mutation-callbacks.test.ts:115` directly exercises `removeDetail` with the old single-key signature (`removeDetail: (_data, vars) => ["items", vars.deletedId]`, returning a `string[]`) and asserts a single `removeQueries` call — it MUST be updated in lockstep** to return an array-of-keys (`[["items", vars.deletedId]]`) and assert one `removeQueries` call per key, or the plan's own typecheck/unit gate fails. (This is the validator-caught completeness gap: the test lives outside `src/hooks/api/__tests__/` so the original sweep scope missed it.) No other v9.0 phase touches create-mutation-callbacks.ts.
- **Files touched:** src/hooks/api/use-tenant-mutations.ts, src/hooks/create-mutation-callbacks.ts, src/hooks/create-mutation-callbacks.test.ts, src/hooks/api/use-lease-mutations.ts, src/hooks/api/use-unit.ts, src/hooks/api/use-property-mutations.ts

## DATA-04 — inspectionQueries.list() unbounded
- **Finding:** src/hooks/api/query-keys/inspection-keys.ts:46 (medium) — live inspections list selects all columns + three embeds with `{ count: 'exact' }`, no `.limit()`/`.range()`; count is fetched and discarded.
- **Root cause:** Missing bound on a live list query (violates CLAUDE.md "All list queries MUST have `.limit()` or `.range()`"); the `count: 'exact'` was added without any consumer, so every fetch pays a COUNT(*) for nothing.
- **Fix:** In `inspectionQueries.list()` (inspection-keys.ts:39-83): add a named constant `const INSPECTION_LIST_LIMIT = 100;` (mirrors `LIST_DISPLAY_LIMIT` in document-keys.ts:38) and chain `.limit(INSPECTION_LIST_LIMIT)` after `.order(...)`; drop the dead `{ count: "exact" }` option. Also bound the sibling flagged in the verifier evidence: `byLeaseQuery` (lines 85-102) gets `.limit(50)` (naturally lease-scoped, generous). Part of the class-wide unbounded-list sweep (DATA-04/07/08/09/13/14/15/16/17).
- **Why it fixes it:** The verifier's failure mode is silent truncation at PostgREST's 1000-row ceiling with no affordance plus a discarded COUNT; an explicit bound makes the fetch deterministic and removes the dead count round-trip. Return contract stays `InspectionListItem[]`, so `useInspections` → `inspection-list.client.tsx` need no changes.
- **Risks / interactions:** Owners with >100 inspections see the newest 100 (previously: silently newest ~1000) — a deliberate display cap, consistent with documents. DASH (Phase 42) and SEO (48) rework `inspection-list.client.tsx`; keeping the array contract here avoids a cross-phase API break — if DASH wants "showing N of M" pagination it adds `.range()` + count then, on top of this bound.
- **Files touched:** src/hooks/api/query-keys/inspection-keys.ts
- **Decision:** Chose bound-only (`.limit(100)`, keep `InspectionListItem[]` contract, drop dead count) for least blast radius. Alternative: full `.range()` pagination returning `{ data, total }` with the count surfaced in the UI — rejected here because it changes the hook contract of a component DASH (Phase 42) is about to redesign; that phase is the right owner of a pagination affordance.

## DATA-05 — propertyStatsQueries.stats() mixes unit and property denominators
- **Finding:** src/hooks/api/query-keys/property-stats-keys.ts:140 (medium) — `total` counts properties, `occupied` counts units (including units of inactive properties), yielding `vacant = total - occupied` negative and `occupancyRate > 100%`.
- **Root cause:** The three HEAD counts aggregate two different entity types into one `PropertyStats` shape whose fields (`total/occupied/vacant`, src/types/stats.ts:10-17) are all property-denominated. The `units` count also has no property-status join filter, so soft-deleted properties' units leak in. (Bonus dead code: `activeResult` is fetched and error-checked but never used.)
- **Fix:** In `stats()` (property-stats-keys.ts:111-155): make every count property-denominated and drop the dead query:
  ```ts
  const [totalResult, occupiedResult] = await Promise.all([
    supabase.from("properties").select("id", { count: "exact", head: true })
      .neq("status", "inactive"),
    supabase.from("properties").select("id, units!inner(id)", { count: "exact", head: true })
      .neq("status", "inactive")
      .eq("units.status", "occupied"),
  ]);
  ```
  `occupied` = non-inactive properties with at least one occupied unit (the `units!inner` filter counts parent rows); `vacant = total - occupied` is now non-negative; `occupancyRate = occupied/total ≤ 100`. Add a JSDoc line on the queryFn stating the property-denominated semantics ("occupied = properties with ≥1 occupied unit"). Update the `usePropertyStats` unit test ("should aggregate stats from multiple PostgREST queries", use-properties.test.tsx:233) for the 3-query → 2-query shape.
- **Why it fixes it:** The verifier's concrete failure (2 properties, 5 occupied units → vacant=-3, rate=250%) is impossible once both operands count the same entity; the `!inner` join through already-status-filtered properties also excludes soft-deleted properties' units, closing the second leak.
- **Risks / interactions:** `usePropertyStats` has no page consumer (tests only), so no visual regression surface; the `markSold` invalidation reference (use-property-mutations.ts:50) keys off the queryKey, unchanged. TYPE (Phase 40) touches property-keys.ts, not property-stats-keys.ts.
- **Files touched:** src/hooks/api/query-keys/property-stats-keys.ts, src/hooks/api/__tests__/use-properties.test.tsx
- **Decision:** Chose the in-place PostgREST fix (2 HEAD counts, least blast radius). Alternatives recorded: (a) a `get_property_stats(p_user_id)` RPC matching the `get_unit_stats`/`get_tenant_stats` PERF pattern — more consistent with CLAUDE.md's "stats consolidate via single RPCs" and could fill the hardcoded `totalMonthlyRent/averageRent: 0`, but costs a migration + types regen for a hook with zero page consumers; (b) deleting the factory + hook as dead code — rejected because it is exported public API wired into markSold invalidation and covered by tests.

## DATA-06 — lease update wipes units/tenants embeds from detail cache
- **Finding:** src/hooks/api/use-lease-mutations.ts:159 (medium) — `useUpdateLeaseMutation`'s `updateDetail` writes the embed-less `.select().single()` row into `leaseQueries.detail(id)`; the detail query is never invalidated, so the property/address block disappears for up to 5 minutes after any edit.
- **Root cause:** Same Tier-2 class as DATA-01/02: mutation return shape (bare `leases` row) ⊄ detail queryFn shape (`*, tenants:..., units(..., properties(...))`), and the invalidate list (`lists`/tenant/unit/dashboard) never prefix-matches `['leases','detail',id]`. A second same-class write exists in `useLeaseList` (use-lease.ts:41-47): it seeds `leaseQueries.detail(lease.id)` with LIST rows whose embeds use different aliases (`tenant:`/`unit:` vs the detail shape's `tenants`/`units`) — the seeded entry is stamped fresh and produces the identical blank-address failure on first navigation.
- **Fix:** Class-wide, two edits:
  1. `useUpdateLeaseMutation` (use-lease-mutations.ts:147-167): drop `updateDetail`, switch to function-form invalidate including the detail key (variables are `{ id, data, version? }` — type the generics `createMutationCallbacks<Lease, { id: string; data: LeaseUpdate; version?: number }>` and import `LeaseUpdate` from `#lib/validation/leases`):
     ```ts
     invalidate: ({ id }) => [
       leaseQueries.lists(),
       leaseQueries.detail(id).queryKey,
       tenantQueries.lists(),
       unitQueries.all(),
       ownerDashboardKeys.all,
     ],
     ```
  2. Delete the detail-seeding `useEffect` in `useLeaseList` (use-lease.ts:41-47). `useLease` already gets instant paint via `useEntityDetail`'s list-cache `placeholderData`, which — unlike `setQueryData` — does not mark the entry fresh, so the real detail queryFn still fetches the embed-carrying shape.
- **Why it fixes it:** Per the verifier, both cache writes that can put an embed-less/mis-aliased row under `['leases','detail',id]` are removed, and the detail key is now explicitly invalidated on update, so `lease-details.client.tsx:52`'s `lease.units?.properties` always reads the queryFn's shape.
- **Risks / interactions:** Losing the seeding means the first detail visit always fetches (placeholder shows list-row fields meanwhile) — correctness over a 5-minute-stale shortcut. HYG (Phase 51) dedupes `LeaseFilters`/`LeaseListItem` types in lease-keys.ts — no conflict (this fix doesn't move types). FORM (38) edits lease-mutation-options.ts before this phase — no shared lines.
- **Files touched:** src/hooks/api/use-lease-mutations.ts, src/hooks/api/use-lease.ts

## DATA-07 — admin blog review queue unbounded (server fetch)
- **Finding:** src/hooks/api/query-keys/blog-keys.ts:175 (low) — the review queue selects all `status='in-review'` rows including full `content` bodies with no bound (finding anchors the factory; the server sibling is DATA-08's pair at src/app/(admin)/admin/blog/page.tsx:20-24).
- **Root cause:** Neither the client factory nor the server-side initial fetch bounds the query; the blog factory historically produced 218 posts, so a backed-up queue ships hundreds of multi-KB draft bodies in one round trip and silently truncates at PostgREST max-rows.
- **Fix:** Class-wide with DATA-08 (one fix, both sites): export a named constant from blog-keys.ts next to `BLOG_REVIEW_COLUMNS`:
  ```ts
  export const BLOG_REVIEW_QUEUE_LIMIT = 50;
  ```
  and chain `.limit(BLOG_REVIEW_QUEUE_LIMIT)` in `reviewQueue()` (blog-keys.ts:173-177). The UI reviews one draft at a time, so 50 oldest-first... (order stays `created_at desc` as today) is generous.
- **Why it fixes it:** Bounds the fetch to a fixed worst case (50 × draft body) regardless of queue depth; no more silent truncation semantics — the cap is explicit and shared with the server fetch so both paths render the same window.
- **Risks / interactions:** A queue deeper than 50 shows the newest 50 until some are approved/rejected (each mutation invalidates and refetches) — acceptable for an admin work queue. ADMIN (Phase 50) touches admin/blog/page.tsx + blog-review-client.tsx after this phase; it rebases over the shared constant.
- **Files touched:** src/hooks/api/query-keys/blog-keys.ts

## DATA-08 — admin blog review queue unbounded (client sibling)
- **Finding:** src/hooks/api/query-keys/blog-keys.ts:177 (low) — the identical unbounded select on the client path, refetching on every approve/reject invalidation and on window focus.
- **Root cause:** Same as DATA-07 — the queryFn and the server component fetch were written as twins, both without a bound.
- **Fix:** Covered by the DATA-07 class fix: import `BLOG_REVIEW_QUEUE_LIMIT` in `src/app/(admin)/admin/blog/page.tsx` (it already imports `BLOG_REVIEW_COLUMNS`/`mapBlogReviewRow` from blog-keys.ts) and chain `.limit(BLOG_REVIEW_QUEUE_LIMIT)` on the server query at lines 20-24. One constant, two call sites — they cannot drift.
- **Why it fixes it:** Both the SSR initial payload and every client refetch (approve/reject invalidation, window focus after the 2-min BLOG staleTime) are now bounded to the same explicit cap, matching the verifier's two flagged sites.
- **Risks / interactions:** Same as DATA-07. `BlogReviewClient` receives `initialDrafts` from the server fetch and the client query hydrates over it — both now the same 50-row window, so no hydration mismatch.
- **Files touched:** src/app/(admin)/admin/blog/page.tsx, src/hooks/api/query-keys/blog-keys.ts

## DATA-09 — documentCategoryQueries.list() unbounded
- **Finding:** src/hooks/api/query-keys/document-category-keys.ts:108 (low) — categories list chains `.select().order().order()` with no bound; the lone unbounded list among its sibling factories.
- **Root cause:** Missing `.limit()` — rule violation even though per-owner category counts are small (7 defaults + customs).
- **Fix:** Add a named constant `const CATEGORY_LIST_LIMIT = 100;` above `documentCategoryQueries` and chain `.limit(CATEGORY_LIST_LIMIT)` after the second `.order()` (lines 107-113). 100 is far beyond any realistic per-owner custom-category count (slugs are 1-50 chars, seeded 7 defaults) while satisfying the zero-tolerance rule.
- **Why it fixes it:** The verifier confirms this is the lone unbounded sibling; the explicit generous bound brings it in line with document-keys' `LIST_DISPLAY_LIMIT` pattern with zero practical behavior change.
- **Risks / interactions:** None — RLS-scoped rows, no consumer sees fewer rows in practice. No other phase touches this file.
- **Files touched:** src/hooks/api/query-keys/document-category-keys.ts

## DATA-10 — expenseQueries.list() total falls back to data.length
- **Finding:** src/hooks/api/query-keys/expense-keys.ts:193 (low) — `total: count ?? data?.length ?? 0` with `count: 'exact'` only requested when BOTH limit and offset are provided, so `{ limit: 25 }` callers get `total` capped at 25; the exported `PaginatedExpenses` contract lies on every non-fully-paginated path.
- **Root cause:** The count-only-when-paginated micro-optimization (lines 159-167) combined with a `data.length` fallback — the exact anti-pattern CLAUDE.md bans ("use `count`, never `data.length`"). Any code path that returns `PaginatedExpenses.total` without a real count is a contract lie, latent or not.
- **Fix:** In `list()` (expense-keys.ts:150-199): always request the count and never fall back:
  - line 167: `.select(EXPENSE_SELECT, { count: "exact" })` unconditionally (drop the `isPaginated ? ... : undefined` ternary and the misleading comment above it);
  - line 193: `total: count ?? 0`.
  Keep the limit/range/throw branching (it already satisfies the bounded-list rule). `isPaginated` remains only if still referenced; otherwise delete the variable.
- **Why it fixes it:** With `count` always requested, `total` is the true row count on every path — the verifier's `{ limit: 25 }` scenario now returns the real total, and `data.length` can never masquerade as a pagination total.
- **Risks / interactions:** One COUNT(*) per fetch on the legacy `useExpenses()` path — the same cost every other list factory in the codebase (property/tenant/unit/lease/blog) already pays unconditionally; consistency beats the micro-optimization that caused the bug. TYPE (Phase 40) fixes the local `Expense` interface in this file (TYPE-04) after this phase — different lines, note for rebase.
- **Files touched:** src/hooks/api/query-keys/expense-keys.ts
- **Decision:** Chose "always request count" over the alternative of splitting the contract (return `Expense[]` on the non-paginated path and reserve `PaginatedExpenses` for the paginated one). The split is more surgical about COUNT cost but changes the exported return type and the `useExpenses` consumer for a latent defect — higher blast radius for no correctness gain.

## DATA-11 — leaseQueries.list() advertises search/property_id but ignores them
- **Finding:** src/hooks/api/query-keys/lease-keys.ts:70 (low) — `LeaseFilters` declares `search` and `property_id` and `useLeaseList` forwards `search`, but the queryFn applies only status/unit_id/tenant_id; a filtered call would cache the FULL unfiltered list under the filtered queryKey.
- **Root cause:** Dead advertised API: the filter interface and the hook signature promise capabilities the queryFn never implemented. Because the queryKey embeds the filters object, the lie is cache-poisoning (wrong rows cached under the filtered key) rather than merely ignored.
- **Fix:** Shrink the API to the truth. Remove `search` and `property_id` from `LeaseFilters` (lease-keys.ts:15-23) and remove `search` from `useLeaseList`'s params + the `...(search && { search })` forwarding (use-lease.ts:20-34). No call site breaks: `leases/page.tsx:106` passes only `{ limit, offset }` (search is deliberately client-side per the LEASE-01 comment at lines 44-49), and `new-inspection-form.client.tsx:26` passes no search/property_id.
- **Why it fixes it:** With the fields gone, the compiler makes it impossible to request a lease search/property filter that silently returns everything — the verifier's `useLeaseList({ search: 'smith' })` poisoning scenario can no longer be expressed.
- **Risks / interactions:** HYG-09 (Phase 51) dedupes `LeaseFilters` against `src/types/api-contracts.ts` — that dedup should adopt this narrowed shape (note it in the HYG plan). If server-side lease search is ever wanted, it needs `units!inner`/tenant-embed filters — see Decision.
- **Files touched:** src/hooks/api/query-keys/lease-keys.ts, src/hooks/api/use-lease.ts
- **Decision:** Chose dropping the dead fields. Alternative: implement them — `property_id` via `unit:units!inner(...)` + `.eq('units.property_id', ...)`, `search` via inner-joined tenant/unit embeds with escaped `ilike` (per the property/tenant/unit sibling pattern). Rejected because (a) zero live callers, (b) leases/page.tsx explicitly chose client-side search (LEASE-01) so a server search path would duplicate that decision, and (c) `!inner` embeds change row semantics for leases with missing relations.

## DATA-12 — maintenance list property_id branch drops the other filters
- **Finding:** src/hooks/api/query-keys/maintenance-keys.ts:75 (low) — the `filters?.property_id` branch applies only `.eq("units.property_id", ...)`; `unit_id`/`priority`/`status` are silently ignored, while the else branch applies all three; wrong rows cache under the fully-filtered queryKey.
- **Root cause:** Fork-and-forget: the property branch was added as a parallel copy of the query (lines 75-92) instead of a conditional on one shared builder, so the filter chain only grew on one side.
- **Fix:** Collapse `list()`'s two branches (maintenance-keys.ts:58-140) into a single builder so every filter applies on every path:
  ```ts
  let q = supabase
    .from("maintenance_requests")
    .select(
      filters?.property_id
        ? `${MAINTENANCE_SELECT_COLUMNS}, units!inner(property_id)`
        : MAINTENANCE_SELECT_COLUMNS,
      { count: "exact" },
    )
    .order("created_at", { ascending: false });
  if (filters?.property_id) q = q.eq("units.property_id", filters.property_id);
  if (filters?.unit_id) q = q.eq("unit_id", filters.unit_id);
  if (filters?.priority) q = q.eq("priority", filters.priority);
  if (filters?.status) q = q.eq("status", filters.status);
  q = q.range(offset, offset + limit - 1);
  ```
  then one `mapMaintenanceRow` pass + the existing error/total handling. This also deletes the awkward `let data/error/count` triple-declaration block (lines 66-117).
- **Why it fixes it:** Structurally, no filter can be branch-local anymore — the verifier's `{ property_id, status: 'open' }` case now applies both predicates, and the cached value matches its queryKey.
- **Risks / interactions:** Latent today (sole caller passes no filters), so no visible behavior change; the select-string union type is absorbed by the existing `Record<string, unknown>` → `mapMaintenanceRow` boundary. HYG-33 (Phase 51) dedupes `MaintenanceFilters` — no conflict. Combined in one file-edit with DATA-13.
- **Files touched:** src/hooks/api/query-keys/maintenance-keys.ts

## DATA-13 — maintenanceQueries.overdue() unbounded
- **Finding:** src/hooks/api/query-keys/maintenance-keys.ts:289 (low) — `overdue()` filters/orders but never bounds the result, unlike its direct sibling `urgent()` which caps at 50.
- **Root cause:** Missing `.limit()` on an exported (currently consumer-less) list factory — sibling inconsistency from copy-editing `urgent()` without the cap.
- **Fix:** Chain `.limit(50)` after `.order("scheduled_date", ...)` in `overdue()` (lines 283-302), matching `urgent()` exactly. Part of the class-wide unbounded-list sweep.
- **Why it fixes it:** Explicit bound satisfies the rule and makes the factory safe for any future adopter; identical to the verified-correct sibling at line 217.
- **Risks / interactions:** None — no component consumes it (grep-verified in the finding). Same file as DATA-12; one PR-edit.
- **Files touched:** src/hooks/api/query-keys/maintenance-keys.ts
- **Decision:** Chose bounding over deleting the dead factory. Deletion is defensible (zero consumers) but dead-code removal is HYG's (Phase 51) charter; bounding keeps this phase's diff behavior-only and leaves the delete/keep call to the dedicated hygiene pass.

## DATA-14 — propertyQueries.withUnits() unbounded double-star select
- **Finding:** src/hooks/api/query-keys/property-keys.ts:94 (low) — `withUnits()` runs `.select("*, units(*)")` with no bound; doubly violates the bounded-lists and specific-columns rules; its wrapper `usePropertiesWithUnits` has no component consumer (referenced only by its own unit test).
- **Root cause:** Dead exported factory + hook that predates the data-access rules; any future adopter inherits an unbounded `*, units(*)` fetch.
- **Fix:** Delete it: remove `withUnits()` from property-keys.ts (lines 89-105), remove `usePropertiesWithUnits` from use-properties.ts (lines 62-64), and remove the `usePropertiesWithUnits` describe block + import from src/hooks/api/__tests__/use-properties.test.tsx (lines ~214-232). Grep confirmed these three files are the only references.
- **Why it fixes it:** Root cause is dead rule-violating code — deletion removes the violation and the trap entirely instead of polishing an API nobody calls; the verifier itself scoped impact as latent-only.
- **Risks / interactions:** `unitQueries.byProperty`/`listByProperty` (bounded by DATA-17) already cover the "units for a property" need for any future feature. TYPE-01 (Phase 40) edits `propertyQueries.detail()` in this file after this phase — different factory, trivial rebase. Coverage threshold: deleting the hook and its test together keeps the 80% gate neutral.
- **Files touched:** src/hooks/api/query-keys/property-keys.ts, src/hooks/api/use-properties.ts, src/hooks/api/__tests__/use-properties.test.tsx
- **Decision:** Chose deletion. Alternative: keep and harden (`PROPERTY_SELECT_COLUMNS` + enumerated `units(...)` columns + `.limit(50)`) if the planner prefers zero API removals in a correctness phase — functional either way, but keeping consumer-less rule-bait contradicts the fallow-cleanup precedent (#841).

## DATA-15 — propertyQueries.images() unbounded
- **Finding:** src/hooks/api/query-keys/property-keys.ts:170 (low) — `property_images` fetched with `.select("*")` + order, no bound; sibling `maintenanceQueries.photos` caps the identical per-parent media pattern at 20.
- **Root cause:** Missing bound on a per-parent child list; also a lazy `*` projection.
- **Fix:** In `images()` (lines 165-193): enumerate the columns — `.select("id, property_id, image_url, display_order, created_at")` (the full `property_images` row per src/types/supabase.ts, so `Tables<"property_images">[]` typing is unchanged) — and chain `.limit(50)` after `.order("display_order", ...)`. 50 is generous for a property gallery while bounding the every-detail-view fetch.
- **Why it fixes it:** Matches the verified-correct sibling pattern (maintenance photos) with an explicit cap; a property with N images no longer fetches all N rows on every detail view.
- **Risks / interactions:** A gallery with >50 images shows the first 50 by display_order — acceptable explicit cap. Same file as DATA-14; combined edit. TYPE-01 (Phase 40) rebases over it.
- **Files touched:** src/hooks/api/query-keys/property-keys.ts

## DATA-16 — reportQueries.runs() unbounded select("*") on an append-only table
- **Finding:** src/hooks/api/query-keys/report-keys.ts:103 (low) — `runs()` selects `*` from `report_runs` (grows per scheduled execution) with no bound; no live consumer.
- **Root cause:** Missing bound + `*` projection on an append-only table — the exact table class that will eventually exceed max-rows.
- **Fix:** In `runs()` (report-keys.ts:96-113): replace the projection with the full explicit column list from the generated types — `.select("id, report_id, execution_status, file_path, file_size, execution_time_ms, error_message, started_at, completed_at, created_at")` — and chain `.limit(50)` after `.order("created_at", { ascending: false })` (most-recent-50 runs is the natural window for a run-history view).
- **Why it fixes it:** Bounded, column-explicit fetch removes both rule violations; newest-first ordering means the cap keeps exactly the rows any future run-history UI would show.
- **Risks / interactions:** None live (grep-verified consumer-less). TYPE-06 (Phase 40) rewrites `monthlyRevenue()` in this same file after this phase — different factory, trivial rebase.
- **Files touched:** src/hooks/api/query-keys/report-keys.ts
- **Decision:** Chose bounding over deleting the latent factory — same rationale as DATA-13 (dead-code adjudication belongs to HYG Phase 51; this phase makes every query rule-conformant).

## DATA-17 — unitQueries.listByProperty()/byProperty() unbounded
- **Finding:** src/hooks/api/query-keys/unit-keys.ts:112 (low) — both per-property unit queryFns (lines 110-117 and 158-165) have no `.limit()`/`.range()`; both are live (properties page, lease form, property units table).
- **Root cause:** Missing bounds on two near-identical live factories (they differ only in queryKey).
- **Fix:** Add one named constant near `UNIT_SELECT_COLUMNS` — `const UNITS_BY_PROPERTY_LIMIT = 500;` — and chain `.limit(UNITS_BY_PROPERTY_LIMIT)` after `.order("unit_number", ...)` in BOTH `listByProperty()` and `byProperty()`. 500 comfortably exceeds any realistic single-property unit count while staying under the PostgREST 1000 ceiling, so no live data is ever cut.
- **Why it fixes it:** Explicit shared bound on both flagged sites; per the verifier, >1000 units/property is unrealistic, so this is a pure rule-conformance fix with zero visible change — and past the cap the truncation is now an explicit documented constant rather than a server-side surprise.
- **Risks / interactions:** None functional. The two factories are byte-identical queryFns under different keys — flag the consolidation opportunity to HYG (Phase 51, which already touches this file for HYG-34) rather than merging keys in a correctness phase (merging would change invalidation semantics for existing consumers).
- **Files touched:** src/hooks/api/query-keys/unit-keys.ts

## DATA-18 — lease renew skips unit/tenant invalidation
- **Finding:** src/hooks/api/use-lease-lifecycle-mutations.ts:51 (low) — renew invalidates only `[leaseQueries.lists(), ownerDashboardKeys.all]`; renewing flips `lease_status` to `'active'` (which can flip the unit to occupied via the `sync_unit_status_from_lease` trigger) and changes the `end_date`/`rent_amount` that tenant list views embed — both stay stale up to their staleTime.
- **Root cause:** Renew's invalidation set was written narrower than its write set: the mutation's DB side effects (unit status via trigger, lease fields embedded in tenant list rows) touch entities whose query keys the same-file sibling `useTerminateLeaseMutation` already invalidates (`tenantQueries.lists()`, `unitQueries.all()`).
- **Fix:** Covered by the combined DATA-02 edit (see the code block there): `useRenewLeaseMutation`'s invalidate becomes `({ id }) => [leaseQueries.lists(), leaseQueries.detail(id).queryKey, tenantQueries.lists(), unitQueries.all(), ownerDashboardKeys.all]` — the terminate/update invalidation set plus the detail key. `tenantQueries` and `unitQueries` are already imported in this file.
- **Why it fixes it:** Matches the invalidation set of every other lifecycle mutation that mutates `lease_status` (terminate, update, delete), so tenant views re-fetch the new `end_date`/`rent_amount`/`lease_status` embeds and unit views reflect the trigger-driven status flip — the two staleness paths the verifier documented.
- **Risks / interactions:** Slightly broader refetch after renewals (tenant lists + all unit queries) — identical cost to a terminate, by design. Single combined edit with DATA-02; no other phase touches this file.
- **Files touched:** src/hooks/api/use-lease-lifecycle-mutations.ts

## Cross-cutting notes

**Class fix 1 — Tier-2 `updateDetail`/seeding shape-mismatch (DATA-01, DATA-02, DATA-03, DATA-06).** One rule, applied everywhere: a cache entry may only be written directly (`setQueryData`) when the written value's shape is a superset of that key's queryFn return shape; otherwise the key must be invalidated. Implementation sweep:
- Convert the four mismatched `updateDetail` sites to detail-key invalidation (inspection update, lease update, lease renew, tenant update) and fix their `createMutationCallbacks` generics to the mutation's true return/variables types.
- Delete the mis-aliased list→detail seeding effect in `useLeaseList` (use-lease.ts:41-47) — same defect class, same consumer page, caught in the DATA-06 sweep so it doesn't trickle out in a later review cycle.
- Audited the remaining `updateDetail` users for shape safety — `use-vendor.ts:112`, `use-unit.ts:109`, `use-property-mutations.ts:117`, `use-maintenance.ts:79`: in all four the mutation returns a full/mapped row that is a superset of the detail queryFn's un-enriched shape → no change needed. The tenant list/allTenants seeding (use-tenant.ts) writes the SAME select shape into detail/withLease keys → shape-consistent, keep.
- Add a JSDoc warning on `MutationCallbackConfig.updateDetail` (create-mutation-callbacks.ts:48-49) codifying the superset rule so the class doesn't regrow.
- `removeDetail` changes contract from one key to an array of keys (DATA-03); all four callers updated in the same commit — typecheck enforces exhaustiveness.

**Class fix 2 — unbounded list queries (DATA-04, 07, 08, 09, 13, 14, 15, 16, 17).** Every fix is an explicit named-constant bound following document-keys.ts's `LIST_DISPLAY_LIMIT` precedent: `INSPECTION_LIST_LIMIT = 100` (+ `.limit(50)` on `byLeaseQuery`), `BLOG_REVIEW_QUEUE_LIMIT = 50` (shared client+server), `CATEGORY_LIST_LIMIT = 100`, `.limit(50)` on `overdue()`, `runs()`, `images()`, `UNITS_BY_PROPERTY_LIMIT = 500` on both per-property unit factories; `withUnits()` deleted outright (dead). Dead-but-exported factories were bounded, not deleted (except withUnits, which has zero consumers including pages), leaving dead-code adjudication to HYG (Phase 51). A follow-up grep gate for the executor: `grep -n "\.order(" src/hooks/api/query-keys/*.ts` and verify each list-returning queryFn chains `.limit(`/`.range(` — confirms no sibling was missed.

**Phase-order interactions.**
- Phase 38 (FORM) lands FORM-04 in `lease-mutation-options.ts` before this phase — DATA edits only the lease HOOK files, not the mutation-options file; rebase is trivial but do not re-touch `leaseMutations.update/renew` mutationFns.
- Phase 40 (TYPE) touches `expense-keys.ts` (TYPE-04), `property-keys.ts` (TYPE-01), `report-keys.ts` (TYPE-06) AFTER this phase — DATA's edits to those files land first; TYPE plans should be drafted against post-39 state.
- Phase 42 (DASH) + 48 (SEO) touch `inspection-list.client.tsx` — DATA deliberately avoids that file (bound-only DATA-04 fix keeps the `InspectionListItem[]` contract).
- Phase 50 (ADMIN) touches `admin/blog/page.tsx` + `blog-review-client.tsx` — DATA's `.limit()` on the server fetch lands first.
- Phase 51 (HYG) dedupes `LeaseFilters`/`MaintenanceFilters`/`UnitFilters`/`PropertyFilters` — must adopt the DATA-11-narrowed `LeaseFilters` (no `search`/`property_id`).

**Test impact.** `src/hooks/api/__tests__/use-properties.test.tsx` changes with DATA-05 (2-query stats) and DATA-14 (delete withUnits block). Sweep `src/hooks/api/__tests__/` for tests asserting the removed `setQueryData`-on-update behavior (tenant/lease/inspection mutation tests) and the expense count behavior — update assertions to expect invalidation instead. 80% coverage gate stays neutral because deleted code leaves with its tests.
