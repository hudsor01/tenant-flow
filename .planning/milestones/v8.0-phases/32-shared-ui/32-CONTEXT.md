# Phase 32 — Shared UI, Data-Table & Uploads — CONTEXT (locked decisions)

Source: 2026-07-02 hunt requirements UIX-01..05 + PROP-04/05, verified against current source by the phase-32 understand Workflow (2026-07-09). **No DB migrations in this phase** — all frontend + validation-schema changes.

## UIX-01 — data-table filters + pagination inert
**Root cause:** all 6 client-data consumers use the *server-side* `useDataTable` with `enableAdvancedFilter: true` (hard no-ops `onColumnFiltersChange` at `use-data-table.ts:211`) + `pageCount: -1` + `manualPagination: true` → filters frozen, "Page 1 of -1", all rows on one page. The correct client-side sibling `useClientDataTable` already exists and is proven by `portfolio-data-table.tsx`.
**Decision:** migrate these 6 consumers `useDataTable` → `useClientDataTable`; delete their `pageCount: -1` + `enableAdvancedFilter: true` props (the client hook accepts neither). **Companion (critical):** add an explicit `id` to every filterable/faceted column def (bare `accessorKey` leaves `column.id` undefined → nuqs key collision + faceted `status` filter + URL round-trip break). Match `portfolio-columns.tsx`.
- Files: `src/app/(owner)/units/page.tsx`, `src/app/(owner)/analytics/financial/_components/lease-table.tsx`, `src/app/(owner)/analytics/property-performance/top-properties-table.tsx`, `src/app/(owner)/analytics/property-performance/active-units-table.tsx`, `src/components/analytics/lease-insights-section.tsx`, `src/components/analytics/maintenance-insights-section.tsx`.
- Do NOT change `use-data-table.ts` (maintenance-table.client.tsx correctly depends on its manual pagination — leave it). Do NOT delete `useDataTable`.
- Intended visible change: those tables now paginate to `pageSize`. Update any test/e2e asserting "all N rows visible".

## UIX-02 — image upload double-uploads + premature success (`use-supabase-upload.ts`)
**Root cause:** (A) retry-list unions two filters so a failed file appears twice → uploaded twice → 2 storage objects + 2 `property_images` rows; (B) `isSuccess` is a count comparison against a never-reset `successes` → can read true from a prior batch. Only consumer = `PropertyImageDropzone` (avatar + inspection have their own upload paths).
**Decision (all in the hook):**
1. Retry list = single filter: `files.filter(f => f.errors.length === 0 && !successes.includes(f.name))` (dedup + skip succeeded + skip client-invalid). Delete the `filesWithErrors` ternary.
2. `isSuccess = files.length > 0 && !loading && errors.length === 0 && files.every(f => successes.includes(f.name))` (membership on the CURRENT batch, not a count).
3. Reset `successes` (`setSuccesses([])`) in the files-cleared effect.

## UIX-03 — `sanitizeSearchInput` strips `.` and breaks email/dotted search
**Decision:** stop stripping value chars. Split into two functions:
- `normalizeSearchInput(input)` = `trim().slice(0, 100)` — for `.ilike(col, `%${s}%`)` callers (postgrest-js puts the value in a discrete param; no metachar handling needed).
- `escapeOrValue(input)` = normalize + `\\`→`\\\\` then `"`→`\\"` — for raw `.or()` logic strings; **wrap the value in double quotes at the call site** (`name.ilike."%${escapeOrValue(s)}%"`) so `, . ( ) :` are literal.
- Caller edits: `.ilike()` callers (`use-vendor.ts`, `unit-keys.ts`) → `normalizeSearchInput`; `.or()` caller (`property-keys.ts`) → `escapeOrValue` + double-quote wrap. Verify every caller; keep length cap.

## UIX-04 — mutation error handler leaks raw Postgres internals (`mutation-error-handler.ts`)
**Note:** this file was just modified in Phase 31 (branches on 409/plan-limit/403/404/5xx then a terminal `else` with raw message). Do NOT disturb those branches or the Sentry capture.
**Decision:** add a module-level `POSTGRES_ERROR_MESSAGES` map (23505 unique, 23514 check, 23503 FK, 23502 not-null, 42501 RLS) + a `GENERIC_MUTATION_ERROR` fallback. Extract `pgCode = errObj?.code`. Before the terminal else: if `customMessage` → use it (caller copy always wins); else if code in the map → friendly copy; else if code is "leaky" (`/^(22|23)/`, `42501`, `PGRST*`) → generic friendly; else keep the current `toast.error(message)`. **Keep PL/pgSQL RAISE codes P0001/P0002 as-is** (author-written, user-safe — e.g. plan-limit, term-lock messages). Sentry capture unchanged.

## UIX-05 — avatar re-upload serves stale cache (`use-profile-avatar-mutations.ts`)
**Decision:** bake a version token into the stored URL at upload time: after `getPublicUrl(path)`, persist `avatar_url = `${publicUrl}?v=${Date.now()}`` to `users`. Keep the deterministic path + `upsert` (in-place overwrite → no orphan objects). One change fixes both the CDN/browser cache key and the React `src` re-render. (Rejected: versioned path — drops upsert, orphans objects.)

## PROP-04 — "Duplex" property type doesn't round-trip
**Decision: REMOVE Duplex from the taxonomy** (no migration). A duplex is a 2-unit MULTI_UNIT; the existing reverse-map `duplex → MULTI_UNIT` shows it was already consolidated, and no DB row can currently be a real Duplex (nothing to backfill). Delete the 5 `duplex` occurrences:
- `src/components/properties/types.ts` — remove `| "duplex"` from `PropertyType`.
- `src/components/properties/properties.tsx` — remove `duplex: "MULTI_UNIT",` from `PROPERTY_TYPE_TO_API`.
- `src/components/properties/property-toolbar.tsx` — remove the Duplex `<option>`.
- `src/components/properties/property-bulk-edit-dialog.tsx` — remove the Duplex `<option>`.
- `src/app/(owner)/properties/components/property-transforms.ts` — remove the dead `duplex: "duplex",` map entry.
- Do NOT touch `status-types.ts` / `validation/properties.ts` (already have no Duplex).

## PROP-05 — clearing an optional edit field doesn't null the column
**Decision:** in each edit path, send explicit `null` when the optional field is cleared (empty string/undefined), instead of omitting it via conditional-spread / `?? undefined` + `omitUndefined` — while never nulling untouched or NOT-NULL fields. Widen validation types to `.nullable()` where needed:
- property `address_line2` — `property-form.client.tsx` handleEditSubmit (PropertyUpdate already allows null).
- unit `square_feet` — `unit-form.client.tsx` + widen `unitInputSchema.square_feet` `.nullable()` (`validation/units.ts`).
- vendor `email`/`phone`/`notes` — vendor edit form + widen `VendorUpdateInput` (`types/domain.ts`; `Vendor` type already null-friendly).
- maintenance `estimated_cost`/`scheduled_date` — `use-maintenance-form.ts` edit branch + widen `maintenanceRequestUpdateSchema` nullable (`validation/maintenance.ts`).
- **NOT NULL columns that must never be nulled:** properties(name/address_line1/city/state/postal_code/country/property_type/status/owner_user_id), units(property_id/unit_number/bedrooms/bathrooms/rent_*/status/owner_user_id), vendors(name/trade/status/owner_user_id), maintenance(unit_id/tenant_id/title/description/priority/status/owner_user_id).

## Cross-cutting
- No migrations. No new query-key factories (reuse existing). Follow CLAUDE.md (no `any`, typed mappers, no barrel, log-only catches defer to the mutation toast — consistent with Phase 31 FORMFIX-08).
- Gate: perfect-PR (two consecutive zero-finding review cycles), run as a Workflow (dimension fan-out → adversarial-verify).
