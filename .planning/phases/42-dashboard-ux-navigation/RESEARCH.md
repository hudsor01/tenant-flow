# Phase 42 Research — Dashboard UX & Navigation
_Fix-approach research + will-fix validation for DASH-01..23. Source: .planning/audits/2026-07-11-full-audit.md_

## DASH-01 — Leases layout never renders `@modal` slot
- **Finding:** src/app/(owner)/leases/layout.tsx:9 (high) — layout destructures only `{ children }`, so the `leases/@modal/` interceptors resolve into a slot that is never rendered; soft nav to `/leases/new` changes the URL and shows nothing.
- **Root cause:** The segment-level `@modal` parallel slots (leases, properties, units, maintenance) were scaffolded but their binding layouts never accept/render the `modal` prop. The ONLY working modal pattern in the app is the root one: `(owner)/layout.tsx:59-78` renders `modal` via `ModalLayout`, fed by `(owner)/@modal` (tenants interceptors + `default.tsx`). The segment slots are structurally orphaned — dead slots that still CLAIM soft navigations, producing URL-changes-but-nothing-renders and (cross-segment) unmatched-children 404s.
- **Fix (CLASS-WIDE, covers DASH-01/02/03/04 and re-homes DASH-05/07/08/15):** Hoist every segment-level interceptor into the proven `(owner)/@modal` slot, exactly like the working tenants modals, and delete the four segment `@modal` directories entirely:
  - Delete `src/app/(owner)/leases/@modal/`, `src/app/(owner)/properties/@modal/`, `src/app/(owner)/units/@modal/`, `src/app/(owner)/maintenance/@modal/` (all `(.)new`, `(.)edit/[id]`, `default.tsx` files).
  - Create under `src/app/(owner)/@modal/`:
    - `(.)properties/new/page.tsx` (see DASH-09 for content changes)
    - `(.)properties/[id]/edit/page.tsx` (content of the current properties `(.)edit/[id]` page, unchanged logic — `PropertyForm mode="edit"` already closes via `handleEditSubmit`'s `if (!onSuccess) router.back()`)
    - `(.)units/new/page.tsx` and `(.)units/[id]/edit/page.tsx` (see DASH-04/15 notes: pass `onSuccess={() => router.back()}`, page becomes `"use client"`)
    - `(.)maintenance/new/page.tsx` and `(.)maintenance/[id]/edit/page.tsx` (see DASH-02/07)
    - `(.)leases/[id]/edit/page.tsx` (see DASH-05 — must add the terms-lock gate)
    - **No** `(.)leases/new` interceptor (see DASH-06 — the wizard page is canonical).
  - Add `src/app/(owner)/@modal/[...catchAll]/page.tsx` returning `null` (official Next.js pattern for dismissing a slot modal when the app navigates away). This is REQUIRED: several forms navigate on success (`AddTenantForm` pushes `/leases/new?…` or `/tenants`, `UnitForm` pushes `/units`), and without a catch-all an unmatched `@modal` slot retains its previous (open-modal) state on soft navigation. It also fixes the latent stuck-open tenants modal today.
  - The segment layouts (`leases/layout.tsx`, `properties/layout.tsx`, `units/layout.tsx`) need NO change — they stay metadata-only; with the segment slots deleted there is no orphaned `modal` prop left to drop.
- **Why it fixes it:** Verifier evidence states the only layout rendering a `modal` slot is `(owner)/layout.tsx`, bound solely to `(owner)/@modal`, and that the tenants interceptors there work. Relocating the lease/property/unit/maintenance interceptors into that same slot puts them under the one layout that renders them; soft navigation then shows a real modal over the current page, and hard navigation still falls through to the full pages (`leases/new`, `properties/new`, etc.). Deleting the segment slots removes the dead interceptors that were claiming navigations into an unrendered slot.
- **Risks / interactions:** New route topology — must verify all four flows manually (soft nav from list, soft nav from dashboard quick action, hard reload on the open-modal URL, browser back). The catch-all changes slot resolution for every owner route (renders `null` — same visible result as `default.tsx`, but validate no interference with the tenants interceptors, which are more specific and win matching). `next build` route-type generation must pass. Colocated modal test exists for tenants (`@modal/(.)tenants/new/page.test.tsx`) — 80% coverage gate may require equivalent colocated tests for the new modal pages. No earlier phase (36-41) touches these route files.
- **Files touched:** src/app/(owner)/@modal/[...catchAll]/page.tsx, src/app/(owner)/@modal/(.)properties/new/page.tsx, src/app/(owner)/@modal/(.)properties/[id]/edit/page.tsx, src/app/(owner)/@modal/(.)units/new/page.tsx, src/app/(owner)/@modal/(.)units/[id]/edit/page.tsx, src/app/(owner)/@modal/(.)maintenance/new/page.tsx, src/app/(owner)/@modal/(.)maintenance/[id]/edit/page.tsx, src/app/(owner)/@modal/(.)leases/[id]/edit/page.tsx, src/app/(owner)/leases/@modal/(.)new/page.tsx (delete), src/app/(owner)/leases/@modal/(.)edit/[id]/page.tsx (delete), src/app/(owner)/leases/@modal/default.tsx (delete), src/app/(owner)/properties/@modal/(.)new/page.tsx (delete), src/app/(owner)/properties/@modal/(.)edit/[id]/page.tsx (delete), src/app/(owner)/properties/@modal/default.tsx (delete), src/app/(owner)/units/@modal/(.)new/page.tsx (delete), src/app/(owner)/units/@modal/(.)edit/[id]/page.tsx (delete), src/app/(owner)/units/@modal/default.tsx (delete), src/app/(owner)/maintenance/@modal/(.)new/page.tsx (delete), src/app/(owner)/maintenance/@modal/(.)edit/[id]/page.tsx (delete), src/app/(owner)/maintenance/@modal/default.tsx (delete)
- **Decision:** Hoist-to-`(owner)/@modal` (Option A) over Option B (render the `modal` prop in each segment layout + fix `(.)edit/[id]` → `(.)[id]/edit` nesting + add a `maintenance/layout.tsx` + per-segment children `default.tsx` files to stop cross-segment 404s). Option A is the pattern already proven working (tenants), fixes the mis-nesting class for free (paths are naturally expressed as `(.)<segment>/[id]/edit`), fixes the dashboard-origin 404s (the `(owner)`-level children slot keeps its previous page on interception), and deletes four dead directories instead of adding four layout+default scaffolds.

## DASH-02 — Maintenance segment has no layout to render its `@modal` slot
- **Finding:** src/app/(owner)/maintenance/@modal/(.)new/page.tsx:7 (high) — `maintenance/` has `@modal` interceptors but no `layout.tsx` at all, so the New/Edit maintenance modals are unrenderable dead code; soft nav to `/maintenance/new` renders nothing.
- **Root cause:** Same class as DASH-01 — a segment `@modal` slot with no binding layout that renders it.
- **Fix:** Covered by the DASH-01 class fix: delete `maintenance/@modal/`, recreate the two interceptors as `(owner)/@modal/(.)maintenance/new/page.tsx` and `(owner)/@modal/(.)maintenance/[id]/edit/page.tsx`. `MaintenanceForm` already calls `router.back()` in its form-level `onSuccess` (maintenance-form.client.tsx:63-65), which closes a RouteModal correctly and returns from the full page correctly — no form change needed. Do NOT add a `maintenance/layout.tsx`; nothing needs it (metadata for `/maintenance/new` already lives in `maintenance/new/layout.tsx`).
- **Why it fixes it:** The interceptors move under `(owner)/layout.tsx`, the one layout that renders the `modal` slot (verifier: "(owner)/layout.tsx:61-74 … fed solely by (owner)/@modal"). All five cited soft-nav sources (maintenance-view.client.tsx:137/161, maintenance-view-tabs.tsx:41, maintenance-table.client.tsx:88, dashboard/page.tsx:90) then open a visible modal.
- **Risks / interactions:** For visual parity (DASH-07 cosmetic note), the recreated modals should carry the same heading/description as the full pages ("New maintenance request" / "Edit maintenance request — Update request details and communicate changes with your team."). DASH-19's `autoFocus` on the title field applies inside this modal too (Radix Dialog default-focus interplay is benign — React commits `autoFocus` on mount).
- **Files touched:** (see DASH-01 file list — maintenance entries)

## DASH-03 — Properties layout never renders `@modal` slot
- **Finding:** src/app/(owner)/properties/layout.tsx:9 (high) — properties modals structurally unrenderable; `(.)new` still claims soft navs (properties/page.tsx:141, dashboard/page.tsx:78) so "Add Property" does nothing visible.
- **Root cause:** Same class as DASH-01.
- **Fix:** Covered by the DASH-01 class fix: interceptors move to `(owner)/@modal/(.)properties/new` and `(owner)/@modal/(.)properties/[id]/edit`; `properties/@modal/` deleted; `properties/layout.tsx` untouched. The relocated `(.)properties/[id]/edit` nesting simultaneously resolves DASH-08's mis-targeting. The new-property modal content changes per DASH-09.
- **Why it fixes it:** Same mechanism as DASH-01, tied to this finding's evidence: the `(.)new` interceptor will now render inside the `(owner)` layout's `modal` slot instead of being silently dropped, so `router.push("/properties/new")` from the list or dashboard opens the modal over the current page.
- **Risks / interactions:** `properties/new/page.tsx` renders `PropertyForm` (desktop) + `MobilePropertyForm` (mobile); the modal keeps the existing desktop-only `PropertyForm` (unchanged from the current dead modal — acceptable, mobile users who soft-nav get the modal with the standard form).
- **Files touched:** (see DASH-01 file list — properties entries)

## DASH-04 — Units layout never renders `@modal` slot
- **Finding:** src/app/(owner)/units/layout.tsx:9 (high) — `units/@modal/(.)new` + `(.)edit/[id]` never render; "Add Unit" (units/page.tsx:271) soft-navs into nothing.
- **Root cause:** Same class as DASH-01, plus a latent close-behavior defect: `UnitForm` create unconditionally `router.push("/units")` (unit-form.client.tsx:152) before `onSuccess?.()` — inside a modal that push would leave the modal to be dismissed only by the new catch-all, losing the "close in place" UX.
- **Fix:** Covered by the DASH-01 class fix, plus:
  - `(owner)/@modal/(.)units/new/page.tsx` and `(.)units/[id]/edit/page.tsx` become `"use client"` pages passing `onSuccess={() => router.back()}` to `UnitForm`.
  - In `src/components/units/unit-form.client.tsx` create path, replace the unconditional `router.push("/units")` with: call `onSuccess()` when provided, else `router.push("/units")` (mirrors `PropertyForm.handleEditSubmit`'s `if (!onSuccess) router.back()` convention). The full page `/units/new` passes no `onSuccess`, so its behavior is unchanged.
- **Why it fixes it:** Slot relocation makes the interceptors renderable (per evidence, only `(owner)/layout.tsx:61-74` renders a modal slot); the `onSuccess` wiring makes a successful create/edit dismiss the modal via `router.back()` instead of leaving it open or bulk-navigating to `/units` from wherever the user was.
- **Risks / interactions:** `unit-form.client.tsx` is also touched by Phase 38 FORM-15 (rent decimal/integer input, unit-form-fields.tsx:104) and Phase 51 HYG-31 — Phase 42 lands after 38, rebase accordingly. The units full pages (`units/new/page.tsx`, `units/[id]/edit/page.tsx`) keep their "Fallback when intercepting route fails" comments accurate at last.
- **Files touched:** src/components/units/unit-form.client.tsx (+ see DASH-01 file list — units entries)

## DASH-05 — Edit-lease interceptor mis-nested AND missing terms-lock gate
- **Finding:** src/app/(owner)/leases/@modal/(.)edit/[id]/page.tsx:14 (medium) — interceptor matches `/leases/edit/[id]` (a URL nothing links to) instead of `/leases/[id]/edit`; it also renders an editable `LeaseForm` without the `isLeaseTermsLocked` gate its full-page sibling enforces (leases/[id]/edit/page.tsx:25-30).
- **Root cause:** Two defects: (1) the `(.)edit/[id]` folder nesting mis-encodes the intercepted path (the `(.)` marker resolves relative to `/leases`, so it matches `/leases/edit/[id]`); (2) the modal drifted from the full page when the terms-lock gate was added there (26-06 signature work) but not in the (dead, so never noticed) modal.
- **Fix:** Recreate as `src/app/(owner)/@modal/(.)leases/[id]/edit/page.tsx` (correct nesting falls out of the DASH-01 hoist) with the gate ported verbatim from the full page:
  - `const termsLocked = lease ? isLeaseTermsLocked(lease) : false;` (import from `#components/leases/lease-terms-lock`)
  - `useEffect(() => { if (termsLocked) router.replace(\`/leases/${id}\`); }, [termsLocked, router, id]);`
  - While `termsLocked`, render the skeleton inside `RouteModal` (never the editable form) — mirrors leases/[id]/edit/page.tsx:67-79.
  - Pass `onSuccess={() => router.back()}` to `LeaseForm` so a successful edit closes the modal (LeaseForm's edit path performs no navigation itself; without this the modal stays open on an emptied/`updated` form — same class as DASH-09).
- **Why it fixes it:** The evidence shows all edit navigations use `/leases/${id}/edit` (leases/page.tsx:161, lease-header.tsx:200); `(.)leases/[id]/edit` under `(owner)/@modal` intercepts exactly that path, making the modal reachable — and the ported gate closes the latent signed-lease-edit bypass the verifier flagged as the risk of "fixing the routing without adding the gate".
- **Risks / interactions:** `router.replace` to the lease detail from inside an open modal is a soft navigation — the new `[...catchAll]` (DASH-01) is what dismisses the modal during that bounce; without it the locked-lease redirect would strand an open dialog. Depends on Phase 38 (FORM-02 removes the phantom `version` field send in lease-form.tsx) only at the file-adjacency level, not logically.
- **Files touched:** src/app/(owner)/@modal/(.)leases/[id]/edit/page.tsx (see DASH-01 for the deletions)

## DASH-06 — New-lease modal renders single-step LeaseForm, page renders the wizard
- **Finding:** src/app/(owner)/leases/@modal/(.)new/page.tsx:20 (medium) — modal mounts bare `LeaseForm mode="create"` (no search-param preselection, lands on `/leases`) while the full page mounts `LeaseCreationWizard` (reads `?property/?unit/?tenant`, FORMFIX-04, lands on the lease detail); soft nav from add-tenant-form silently discards the preselection handoff.
- **Root cause:** The interceptor was written against an older single-form flow and never updated when `/leases/new` became the multi-step wizard; an intercepted route must be a faithful overlay of its page, and this one diverges in component, param handling, and success destination.
- **Fix:** Do NOT recreate a `(.)leases/new` interceptor in the hoisted slot — delete the modal outright (part of the DASH-01 deletions). `/leases/new` then always renders the full `LeaseCreationWizard` page, on both soft and hard navigation, from every entry point (leases list links at page.tsx:204/231, dashboard quick action page.tsx:82, add-tenant-form.tsx:89 handoff with query params).
- **Why it fixes it:** With no interceptor claiming `/leases/new`, the soft navigation the verifier traced (`router.push('/leases/new?tenant=…&property=…')`) resolves to the wizard page whose `useSearchParams` seeding (lease-creation-wizard.tsx:57-71) consumes the preselection — nothing is discarded, and success routes to `/leases/{id}` as designed. Sibling parity is restored by having exactly one experience.
- **Risks / interactions:** After deletion, `LeaseForm mode="create"` has zero callers (the wizard owns creation; LeaseForm remains for edit) — leave the create branch for Phase 51 HYG to sweep or note it for the planner; do not expand scope here. The add-tenant modal's success push to `/leases/new?…` is a soft nav from inside an open modal — the `[...catchAll]` from DASH-01 dismisses the tenant modal as the wizard page loads (today it would stay stuck open).
- **Files touched:** src/app/(owner)/leases/@modal/(.)new/page.tsx (delete; see DASH-01)
- **Decision:** Delete the interceptor rather than mount `LeaseCreationWizard` inside `RouteModal`. The wizard is a 4-step flow with sticky header, unsaved-changes warning, and preselection params — cramming it into a `max-w-3xl` dialog is worse UX and a bigger blast radius (Suspense boundary for `useSearchParams` inside the modal, step overflow, double-scroll). A full page is the appropriate surface for multi-step creation; modals stay for the short single-form entities.

## DASH-07 — Edit-maintenance interceptor targets `/maintenance/edit/[id]`
- **Finding:** src/app/(owner)/maintenance/@modal/(.)edit/[id]/page.tsx:14 (medium) — `(.)edit/[id]` matches only `/maintenance/edit/[id]`; all three edit actions push `/maintenance/${id}/edit`, so the modal is unreachable dead code; also missing the sibling page's heading/description.
- **Root cause:** Same `(.)edit/[id]` mis-nesting class as DASH-05/08/15 (path segments inverted relative to the real route), plus cosmetic drift from the full page.
- **Fix:** Covered by the DASH-01 hoist: recreate as `(owner)/@modal/(.)maintenance/[id]/edit/page.tsx` with the existing modal's query/skeleton/notFound logic, adding the heading block from the full page ("Edit maintenance request" / "Update request details and communicate changes with your team.") inside the `RouteModal` for sibling parity.
- **Why it fixes it:** `(.)maintenance/[id]/edit` under `(owner)/@modal` intercepts `/maintenance/{id}/edit` — the exact path the verifier confirmed all three edit actions use (maintenance-details.client.tsx:213, columns.tsx:248, maintenance-header-card.tsx:89).
- **Risks / interactions:** None beyond the DASH-01 class risks; `MaintenanceForm` already closes via `router.back()` on success.
- **Files touched:** (see DASH-01 file list — maintenance entries)

## DASH-08 — Edit-property interceptor targets `/properties/edit/[id]`
- **Finding:** src/app/(owner)/properties/@modal/(.)edit/[id]/page.tsx:23 (medium) — intercepts a URL nothing links to (`/properties/edit/[id]`); every edit action navigates `/properties/${id}/edit`; the file's own doc comment contradicts its folder structure.
- **Root cause:** Same `(.)edit/[id]` mis-nesting class.
- **Fix:** Covered by the DASH-01 hoist: recreate as `(owner)/@modal/(.)properties/[id]/edit/page.tsx` (the audit's own "correct is … (owner)/@modal/(.)properties/[id]/edit following the working tenants pattern"). Content carries over unchanged — the edit path of `PropertyForm` already ends with `if (!onSuccess) router.back()` (property-form.client.tsx:238-240), which closes the modal.
- **Why it fixes it:** The interceptor now matches the exact URLs pushed by properties/page.tsx:149, portfolio-columns.tsx:196, and property-details.client.tsx:122 per the verifier's grep, and it renders inside the one layout with a modal slot.
- **Risks / interactions:** None beyond the DASH-01 class risks.
- **Files touched:** (see DASH-01 file list — properties entries)

## DASH-09 — New-property modal neither closes nor navigates after successful create
- **Finding:** src/app/(owner)/properties/@modal/(.)new/page.tsx:19 (medium) — `PropertyForm mode="create" showSuccessState={false}` with no `onSuccess`: create path skips `setIsSubmitted`, runs `form.reset()`, `onSuccess?.()` is a no-op, and `RouteModal` closes only via `router.back()` — the dialog stays open showing a blanked form.
- **Root cause:** The create path of `PropertyForm` has no default dismissal (unlike the edit path's `if (!onSuccess) router.back()`), and the modal page never supplies the `onSuccess` that is the only dismissal hook.
- **Fix:** The recreated `src/app/(owner)/@modal/(.)properties/new/page.tsx` becomes a `"use client"` component that renders `<PropertyForm mode="create" showSuccessState={false} onSuccess={() => router.back()} />`. No change to `property-form.client.tsx` itself — `onSubmit` already calls `onSuccess?.()` after `handleCreateSubmit` (including the image-upload branch), so `router.back()` fires exactly once after a fully successful create.
- **Why it fixes it:** Per the verifier's trace (property-form.client.tsx:131 `onSuccess?.()` no-op; route-modal.tsx:59-63 closes solely via `onOpenChange → router.back()`), supplying `onSuccess={() => router.back()}` is precisely the missing dismissal call; the full page keeps its `PropertyFormSuccessState` because it passes `showSuccessState` default (true) and no `onSuccess`.
- **Risks / interactions:** `onSuccess` fires after `form.reset()` — the brief reset is invisible because the modal unmounts on back-navigation. Same-pattern siblings handled in this phase: unit modals (DASH-04), lease edit modal (DASH-05); maintenance needs nothing (form-level `router.back()`).
- **Files touched:** src/app/(owner)/@modal/(.)properties/new/page.tsx

## DASH-10 — Document deletion has no confirmation
- **Finding:** src/components/documents/documents-section.tsx:174 (medium) — `handleDelete` runs `deleteMutation.mutateAsync({ id, storagePath })` (DB row + storage blob, irreversible) directly from the Remove button click (document-row.tsx:140).
- **Root cause:** The delete flow skips the confirmation step every sibling destructive flow has (property-units-delete-dialog, property-image-gallery, terminate-lease-dialog, maintenance columns). One mis-click permanently destroys an upload.
- **Fix (CLASS-WIDE with DASH-21, shared pattern):** Use the existing `ConfirmDialog` from `#components/ui/confirm-dialog` (already the pattern in active-sessions-section). In `documents-section.tsx`: add `const [pendingDelete, setPendingDelete] = useState<DocumentRowData | null>(null)`; pass `onDelete={setPendingDelete}` to `DocumentRow` (line 329) instead of `handleDelete`; render one `<ConfirmDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)} title="Remove document?" description=… confirmText="Remove" loading={deleteMutation.isPending} onConfirm={() => { const doc = pendingDelete; setPendingDelete(null); if (doc) void handleDelete(doc); }} />`. `handleDelete` itself is unchanged (it already closes the preview via `setOpenId(null)` in `finally`). `document-row.tsx` needs no change — `onDelete` is already a prop.
- **Why it fixes it:** The irreversible mutation (document-keys.ts:329 per evidence) now only runs from the AlertDialog's confirm action, matching every sibling destructive flow; a stray click on Remove opens a cancellable dialog instead of deleting.
- **Risks / interactions:** AlertDialog stacks over the preview Dialog (Radix supports nested portals — same as existing delete dialogs launched from dialogs). Keep the confirm copy specific (file name) so the user knows what they are deleting.
- **Files touched:** src/components/documents/documents-section.tsx

## DASH-11 — Lease "View Unit Details" links to a non-existent route
- **Finding:** src/components/leases/detail/lease-sidebar.tsx:53 (medium) — `href={/properties/${unit.property_id}/units/${unit.id}}` — no such route exists (no `[id]/units/[unitId]` segment, no `/units/[id]` detail page); every lease with a unit renders this button and clicking it 404s.
- **Root cause:** The link targets an imagined nested unit-detail route that was never built; the app's canonical unit-level destination is `/units/[id]/edit` (that is what the units list itself links per units/page.tsx:193).
- **Fix:** Change the `Link` to `href={\`/units/${unit.id}/edit\`}` and relabel the button "View Unit" → keep the `Building` icon. After the DASH-01 class fix, soft-navigating there opens the Edit Unit modal over the lease detail — a unit-scoped surface showing all unit fields — and hard nav lands on the full edit page.
- **Why it fixes it:** The verifier confirmed the only unit-scoped routes are `/units/[id]/edit` (plus the property detail); pointing the button at the real, unit-scoped route eliminates the guaranteed 404.
- **Risks / interactions:** None; `unit.id` is already non-null inside the `{unit && …}` guard.
- **Files touched:** src/components/leases/detail/lease-sidebar.tsx
- **Decision:** `/units/${unit.id}/edit` over `/properties/${unit.property_id}` (property detail with `PropertyUnitsTable`). The edit route is the app's established per-unit affordance and stays scoped to the exact unit the lease references; the property detail would force the user to visually locate the unit in a table. Alternative recorded: property detail if the planner prefers a read-only destination.

## DASH-12 — Profile "View All" pushes non-existent `/activity`; hardcoded fake activity rows
- **Finding:** src/components/profiles/owner/recent-activity-section.tsx:17 (medium) — `router.push("/activity")` 404s (no such route), and lines 24-81 are three fully hardcoded rows ("Updated profile information"/"Recently", etc.) presented as real user activity.
- **Root cause:** Placeholder UI shipped to production: the section fabricates activity with no data fetch and links to a page that was never built.
- **Fix:** Remove the section. Delete `src/components/profiles/owner/recent-activity-section.tsx` and remove its import (line 22) + render (line 249) from `src/app/(owner)/profile/page.tsx`.
- **Why it fixes it:** Both defects the verifier confirmed (dead `/activity` push; fabricated rows) are removed at the root — no fake data is shown and no dead route is linked. Honest-UI principle: better no section than an invented one.
- **Risks / interactions:** Profile page layout: check the surrounding grid/spacing after removal (the component sits in a BlurFade sequence — renumbering delays is unnecessary; just remove). `src/app/(owner)/profile/__tests__/profile-page.test.tsx` may assert on the section — update the test if it does.
- **Files touched:** src/components/profiles/owner/recent-activity-section.tsx (delete), src/app/(owner)/profile/page.tsx
- **Decision:** Remove, rather than back it with real data. A real feed exists in embryo (prod `activity` table + `get_user_dashboard_activities` RPC, zero frontend callers) but its only writers are the lease-signature triggers — a feed that would render near-empty for almost every owner, and building an `/activity` route + query factory + RLS-verified read path is a feature, not a UX correction. Recorded alternative: wire `get_user_dashboard_activities` + build `/activity` in a future milestone if an activity feed is actually wanted.

## DASH-13 — Financial breakdown "View details" is a dead `href="#"` link
- **Finding:** src/app/(owner)/analytics/financial/_components/breakdown-list.tsx:18 (low) — `<Link href="#">View details</Link>` in every breakdown card navigates nowhere; sibling dead anchor `<a href="#">Download insight summary</a>` at analytics/financial/page.tsx:103-109.
- **Root cause:** Dead-affordance placeholders: links rendered before their destinations/behaviors were decided.
- **Fix (covers both instances of the `href="#"` class in this phase):**
  1. `breakdown-list.tsx`: add an optional `detailsHref?: string` prop; render the "View details" `Link` only when provided, pointing at the real drill-down.
  2. `analytics/financial/page.tsx`: pass `detailsHref="/financials/income-statement"` to the Revenue Sources instance (line 155) and `detailsHref="/financials/expenses"` to the Expense Categories instance (line 173) — both routes exist. Remove the dead "Download insight summary" anchor (lines 103-109) entirely; the adjacent `ExportButtons` (line 102) already provides the export affordance. Drop the now-unused `FileDown` import.
- **Why it fixes it:** Every rendered "View details" affordance now navigates to a real financial drill-down page, and the redundant dead anchor is gone — matching the verifier's two confirmed `href="#"` sites.
- **Risks / interactions:** None; `/financials/income-statement` and `/financials/expenses` are live routes with layouts. `noUnusedLocals` will enforce the import cleanup.
- **Files touched:** src/app/(owner)/analytics/financial/_components/breakdown-list.tsx, src/app/(owner)/analytics/financial/page.tsx
- **Decision:** Point at real destinations rather than dropping the links — the breakdown cards summarize exactly what those two financial pages detail, so the affordance is honest once wired. Alternative (delete the links) recorded for the planner if income-statement/expenses are judged too coarse as "details".

## DASH-14 — Expenses list empty states are ad-hoc divs
- **Finding:** src/app/(owner)/financials/expenses/_components/expense-table.tsx:178 (low) — both the zero-expenses state (178-190) and the filtered-no-results state (163-175, raw `<button>`) are hand-rolled instead of the mandated `Empty` compound.
- **Root cause:** Empty-state convention (CLAUDE.md Components: `Empty` from `#components/ui/empty`) not applied — file predates or ignored the compound component.
- **Fix (CLASS-WIDE, covers DASH-14/16/17/20/22):** Convert every ad-hoc empty state in the five flagged files to the `Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/`EmptyContent` compound, following the leases/page.tsx:191-205 reference usage. For this file: zero-expenses → `Empty` with `EmptyMedia variant="icon"` (Receipt), `EmptyTitle` "No expenses yet", `EmptyDescription` current copy; filtered-no-results → `Empty` with `EmptyTitle` "No expenses match your filters" and an `EmptyContent` containing a proper `Button variant="ghost"`/link-styled button wired to `onClearFilters` (replaces the raw `<button>`).
- **Why it fixes it:** Direct application of the project rule the verifier cited; visual/markup parity with sibling list pages (units, leases) that already comply.
- **Risks / interactions:** Phase 41 COMP-05 (expense date TZ) and Phase 47 A11Y-28 (search input label) touch the same file — 42 lands after 41 (rebase) and before 47 (they adapt). Pure markup swap; keep copy identical so tests/snapshots only need selector updates.
- **Files touched:** src/app/(owner)/financials/expenses/_components/expense-table.tsx

## DASH-15 — Edit-unit interceptor targets `/units/edit/[id]`
- **Finding:** src/app/(owner)/units/@modal/(.)edit/[id]/page.tsx:11 (low) — intercepts `/units/edit/{id}`; the only edit navigation is `/units/${unit.id}/edit` (units/page.tsx:193); dead code (doubly dead: units/layout.tsx never rendered the slot).
- **Root cause:** Same `(.)edit/[id]` mis-nesting class as DASH-05/07/08.
- **Fix:** Covered by the DASH-01 hoist: recreate as `(owner)/@modal/(.)units/[id]/edit/page.tsx`, made `"use client"` and passing `onSuccess={() => router.back()}` to `UnitForm` (per DASH-04 — UnitForm's edit path performs no navigation of its own, so without this the modal would stay open after save).
- **Why it fixes it:** `(.)units/[id]/edit` under `(owner)/@modal` intercepts exactly `/units/{id}/edit`, the path the verifier's grep confirmed as the sole edit navigation, rendered by the one layout with a modal slot.
- **Risks / interactions:** None beyond the DASH-01/DASH-04 class notes.
- **Files touched:** (see DASH-01 file list — units entries)

## DASH-16 — Document vault defines a private local `EmptyState`
- **Finding:** src/components/documents/documents-vault.client.tsx:571 (low) — file-local `EmptyState` (571-590) used at 483 (error) and 499 (zero-documents) duplicates the mandated `Empty` compound.
- **Root cause:** Component duplication + empty-state convention violation (same class as DASH-14).
- **Fix:** Part of the DASH-14 class sweep: delete the local `EmptyState` function; replace both call sites with the compound — error state: `Empty` + `EmptyMedia` (AlertTriangle, keep `text-destructive` on the ICON — vivid tokens are icon-safe) + `EmptyTitle` "We couldn't load your documents." + `EmptyContent` with the existing Try-again `Button`; zero/no-match state: `Empty` + `EmptyMedia` (FolderArchive) + `EmptyTitle`/`EmptyDescription` with the existing conditional copy + `EmptyContent` with the existing clear-filters action if present.
- **Why it fixes it:** Removes the duplicate implementation and lands the mandated compound at both usage sites the verifier identified.
- **Risks / interactions:** File is large ("use client" vault) — keep the change surgical; no behavior change (`refetch`, filter-clear handlers unchanged).
- **Files touched:** src/components/documents/documents-vault.client.tsx

## DASH-17 — Inspections list empty state is ad-hoc
- **Finding:** src/components/inspections/inspection-list.client.tsx:135 (low) — "No inspections yet" (129-146) hand-built from div/ClipboardList/h3/p.
- **Root cause:** Same empty-state class as DASH-14.
- **Fix:** Part of the DASH-14 class sweep: convert to `Empty` + `EmptyMedia variant="icon"` (ClipboardList) + `EmptyHeader`/`EmptyTitle` "No inspections yet" + `EmptyDescription` (current copy) + `EmptyContent` wrapping the existing `Link href="/inspections/new"` Button.
- **Why it fixes it:** Applies the mandated compound; copy and CTA unchanged.
- **Risks / interactions:** Phase 48 SEO-07 adds pagination to this file after us — no conflict (different block).
- **Files touched:** src/components/inspections/inspection-list.client.tsx

## DASH-18 — Lease "Maintenance Requests" quick action's `unit_id` param is dead
- **Finding:** src/components/leases/detail/lease-sidebar.tsx:39 (low) — links `/maintenance?unit_id=${lease.unit_id}` but `MaintenanceViewClient` reads only `tab`; the promised unit filter silently does nothing.
- **Root cause:** The link encodes an intent (unit-scoped maintenance view) the destination never implemented — even though the data layer already supports it (`maintenanceQueries.list()` accepts `MaintenanceFilters.unit_id` and applies `.eq("unit_id", …)`, maintenance-keys.ts:99-101).
- **Fix:** Implement the URL-driven unit filter in `src/components/maintenance/maintenance-view.client.tsx` (it already uses `useSearchParams`):
  - `const unitIdFilter = searchParams.get("unit_id")` and pass `maintenanceQueries.list(unitIdFilter ? { unit_id: unitIdFilter } : undefined)` at line 55.
  - When filtering, render a dismissible filter chip above the views — "Filtered to unit {unit_number}" (fetch the label via `useQuery({ ...unitQueries.detail(unitIdFilter), enabled: !!unitIdFilter })`; fall back to "one unit" while loading) with an X that `router.replace("/maintenance")`.
  - Filtered zero-results renders the DASH-20 `Empty` state with filter-aware copy ("No maintenance requests for this unit") and a clear-filter action instead of the global zero-state CTA.
  - Leave the stats row global (RPC-backed, owner-wide) — the chip disambiguates list scope. `handleTabChange` already preserves foreign params (it only sets/deletes `tab`).
  - `lease-sidebar.tsx` link stays exactly as-is — it becomes correct.
- **Why it fixes it:** The verifier's defect is "the param is dead"; wiring it into the existing filter-capable query factory makes the unit-scoped click deliver a unit-scoped list, with visible indication (chip) that a filter is active.
- **Risks / interactions:** Same-file overlap with DASH-20 (empty-state conversion) — implement as one coordinated edit. Query key changes shape when filtered (`[...lists(), {unit_id}]`) — cache invalidation via `maintenanceQueries.lists()` prefix still covers it. Phase 47 A11Y-37 touches sibling maintenance-view-tabs.tsx afterwards.
- **Files touched:** src/components/maintenance/maintenance-view.client.tsx
- **Decision:** Implement the filter rather than downgrade the link to plain `/maintenance`. The query layer already supports `unit_id` (zero backend work), and the lease-detail use case ("show this unit's requests") is real; deleting the param would fix the lie by removing the feature. Alternative (link to `/maintenance`) recorded as the minimal fallback.

## DASH-19 — Maintenance form missing `autoFocus` on primary input
- **Finding:** src/components/maintenance/maintenance-form-fields.tsx:153 (low) — no field in the form sets `autoFocus`; every comparable key form complies (property-info-section.tsx:26, add-tenant-info-fields.tsx:55, selection-step.tsx:192, login-form.tsx:73).
- **Root cause:** CLAUDE.md Forms rule (`autoFocus` on the primary input of key forms) not applied when the form was built.
- **Fix (CLASS-WIDE with DASH-23):** Add `autoFocus` to the title `Input` (id="title", line ~165) in `maintenance-form-fields.tsx`. Title is the primary text input (the preceding property/unit/tenant selects are pickers, mirroring how add-unit-panel focuses `unit_number` rather than a select).
- **Why it fixes it:** Opening `/maintenance/new` (page or, post-DASH-01, modal) starts with the caret in the title field, matching the verified sibling convention.
- **Risks / interactions:** Inside the recreated maintenance modal, React's `autoFocus` on mount wins over Radix Dialog's default first-focusable focus — same behavior the tenants modal exhibits with add-tenant-info-fields' autoFocus. Applies in edit mode too (consistent with property form's unconditional autoFocus).
- **Files touched:** src/components/maintenance/maintenance-form-fields.tsx

## DASH-20 — Maintenance list zero-state is ad-hoc
- **Finding:** src/components/maintenance/maintenance-view.client.tsx:121 (low) — lines 121-147 hand-roll the "No maintenance requests" state with custom divs and a raw styled Link.
- **Root cause:** Same empty-state class as DASH-14.
- **Fix:** Part of the DASH-14 class sweep: convert to `Empty` + `EmptyMedia variant="icon"` (Wrench) + `EmptyTitle` "No maintenance requests" + `EmptyDescription` (current copy) + `EmptyContent` with a `Button asChild` wrapping the `Link href="/maintenance/new"` (replaces the raw styled Link). Coordinate with DASH-18: when `unit_id` filter is active, swap title/description/action to the filter-aware variant.
- **Why it fixes it:** Applies the mandated compound (leases/page.tsx:191 is the cited reference) and removes the visual divergence from sibling lists.
- **Risks / interactions:** Same-file edit as DASH-18 — one task. BlurFade wrapper can stay around the `Empty`.
- **Files touched:** src/components/maintenance/maintenance-view.client.tsx

## DASH-21 — "Remove Contact" deletes emergency contact with no confirmation
- **Finding:** src/components/settings/owner-emergency-contact-section.tsx:181 (low) — button wires `onClick={handleDelete}`, which immediately awaits `deleteMutation.mutateAsync()` nulling all three `emergency_contact_*` columns; siblings confirm first.
- **Root cause:** Same missing-confirmation class as DASH-10.
- **Fix:** Same pattern as DASH-10: add `const [confirmOpen, setConfirmOpen] = useState(false)`; "Remove Contact" button `onClick={() => setConfirmOpen(true)}`; render `<ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="Remove emergency contact?" description="This clears the saved name, phone, and relationship." confirmText="Remove" loading={isDeleting} onConfirm={() => { setConfirmOpen(false); void handleDelete(); }} />` (`ConfirmDialog` from `#components/ui/confirm-dialog`, exactly like subscription-cancel/active-sessions).
- **Why it fixes it:** The destructive mutation only runs from an explicit confirm, closing the verified inconsistency with every other settings destructive action.
- **Risks / interactions:** Phase 38 FORM-13 adds try/catch around this same `handleDelete` (unhandled rejection) — Phase 42 rebases on that; the ConfirmDialog wrapping is orthogonal to the error handling inside `handleDelete`.
- **Files touched:** src/components/settings/owner-emergency-contact-section.tsx

## DASH-22 — Tenants list empty states are ad-hoc
- **Finding:** src/components/tenants/tenants.tsx:119 (low) — zero-tenants state (119-145, raw styled `<button>`) and "No tenants match your filters" (222-234) hand-rolled.
- **Root cause:** Same empty-state class as DASH-14.
- **Fix:** Part of the DASH-14 class sweep: zero-tenants → `Empty` + `EmptyMedia variant="icon"` (Users) + `EmptyTitle` "No tenants yet" + `EmptyDescription` (current tenants-are-records copy) + `EmptyContent` with a proper `Button` (UserPlus icon, "Add Your First Tenant") wired to the existing `handleAddClick`; filtered-no-results → `Empty` + `EmptyTitle` "No tenants match your filters" + `EmptyContent` clear-filters `Button` wired to `clearFilters`.
- **Why it fixes it:** Applies the mandated compound; the verifier cited units/leases pages as the compliant references — this brings tenants to parity.
- **Risks / interactions:** None; handlers unchanged. Keep BlurFade wrapper.
- **Files touched:** src/components/tenants/tenants.tsx

## DASH-23 — Unit form missing `autoFocus` on `unit_number`
- **Finding:** src/components/units/unit-form-fields.tsx:56 (low) — no `autoFocus` anywhere in the form; add-unit-panel.tsx:147 sets it on the identical `unit_number` `field.TextField`, proving prop support and convention coverage.
- **Root cause:** Same missing-autoFocus class as DASH-19.
- **Fix:** Part of the DASH-19 class fix: add `autoFocus` to the `unit_number` `field.TextField` (line 56-63) — `TextField` spreads `...inputProps` onto `Input`, so the prop passes through (verified in src/lib/forms/fields/text-field.tsx:19-31).
- **Why it fixes it:** Opening `/units/new` (page or modal) focuses the unit number, matching add-unit-panel and the project forms rule. `unit_number` (not the property select) is the primary input, mirroring add-unit-panel's choice.
- **Risks / interactions:** Phase 38 FORM-15 and Phase 51 HYG-31 touch this file (rent input, duplicate Property type) — 42 rebases on 38.
- **Files touched:** src/components/units/unit-form-fields.tsx

## Cross-cutting notes
- **Class fix 1 — modal architecture (DASH-01..09, 15):** One structural change: hoist all segment `@modal` interceptors into `(owner)/@modal/(.)<segment>/…` (the proven tenants pattern), delete the four segment `@modal` dirs, add `(owner)/@modal/[...catchAll]/page.tsx` (returns null) so navigate-away/success-push dismisses any open modal (also fixes the latent stuck-open tenants modal after AddTenantForm's success pushes). Modal-dismissal convention established: every modal page passes `onSuccess={() => router.back()}` where the form supports it (PropertyForm create, UnitForm create/edit, LeaseForm edit); MaintenanceForm already back-navigates internally; PropertyForm edit back-navigates when `onSuccess` is absent. `UnitForm` create path changes to prefer `onSuccess` over its default `router.push("/units")`. Lease creation deliberately has NO interceptor (wizard page is canonical). Verification for this class must be behavioral (drive soft nav, hard reload, back button on all four entities), not just typecheck.
- **Class fix 2 — Empty compound sweep (DASH-14, 16, 17, 20, 22):** Five files converted in one sweep to `Empty`/`EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/`EmptyContent` per leases/page.tsx reference; local vault `EmptyState` deleted. Use one executor task so styling decisions (icon sizing, `variant="icon"`, CTA as `Button`) stay uniform — the v8.0 lesson (FORMFIX-08) says sweep siblings together, not one-per-review-cycle.
- **Class fix 3 — destructive-action confirmation (DASH-10, 21):** Reuse `ConfirmDialog` from `#components/ui/confirm-dialog`; no new component.
- **Class fix 4 — autoFocus (DASH-19, 23):** Two one-line prop additions.
- **Phase dependencies:** Phase 38 FORM lands first and touches four of our files (lease-form.tsx FORM-02, maintenance-form-fields.tsx FORM-11, owner-emergency-contact-section.tsx FORM-13, unit-form-fields.tsx FORM-15) — plan Phase 42 edits against post-38 state. Phase 41 COMP-05 touches expense-table.tsx before us. Phases 47 (A11Y-28/37), 48 (SEO-07), 51 (HYG-31, plus the now-dead `LeaseForm mode="create"` branch left by DASH-06) land after and adapt to our changes.
- **Dead-code note for HYG (51):** after DASH-06 deletes the lease `(.)new` interceptor, `LeaseForm mode="create"` has zero callers — flag for the Phase 51 sweep rather than expanding Phase 42 scope.
- **Tests:** colocated modal test pattern exists (`(owner)/@modal/(.)tenants/new/page.test.tsx`); the 80% pre-commit coverage gate likely requires equivalent tests for the new modal pages and the ConfirmDialog flows. `profile-page.test.tsx` may need updating after RecentActivitySection removal.
