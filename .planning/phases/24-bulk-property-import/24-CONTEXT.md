# Phase 24: Bulk Property Import - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Owner can bulk import properties via CSV upload with validation and error reporting. The CSV is parsed and validated client-side, previewed in a table, and committed to the database on confirmation. No unit creation -- properties only. No server-side file storage of the CSV.

</domain>

<decisions>
## Implementation Decisions

### CSV Format & Template
- Provide a downloadable CSV template with headers and one example row
- Required columns: name, address_line1, city, state, postal_code, property_type
- Optional columns: address_line2, country (defaults to "US")
- property_type values must match existing enum: SINGLE_FAMILY, MULTI_UNIT, APARTMENT, COMMERCIAL, CONDO, TOWNHOUSE, OTHER
- State must be 2 uppercase letters (e.g., CA, TX)
- Postal code must match 5-digit or ZIP+4 format

### Validation & Error UX
- Client-side CSV parsing with Papa Parse (no Edge Function needed)
- Reuse existing Zod `propertyInputSchema` from `src/lib/validation/properties.ts` for row validation
- Validation errors displayed in an inline per-row error table: row number, field name, error message
- User fixes CSV and re-uploads -- no inline editing of invalid rows
- All-or-nothing import: if any row fails validation, no rows are imported

### Import Preview & Confirmation
- After successful parsing/validation, show all rows in a preview table with green checkmark per row
- User sees total count and confirms before committing to database
- On confirmation, rows are inserted sequentially via existing PostgREST `.insert()` (not bulk RPC)
- Maximum 100 properties per CSV upload
- Progress indicator during import (X of Y imported)

### Import Access Point
- "Import CSV" button on the Properties list page, next to the existing "Add Property" button
- Opens a full-page or dialog flow: upload -> validate -> preview -> confirm -> result

### Claude's Discretion
- Whether to use a dialog or full page for the import flow
- Exact layout of the preview table columns
- Success/failure summary presentation after import completes
- Whether to use Papa Parse or native FileReader + manual splitting (Papa Parse recommended for robustness)
- Loading/progress animation style during bulk insert

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Property validation
- `src/lib/validation/properties.ts` -- Property Zod schemas (propertyInputSchema, propertyCreateSchema, property types)
- `src/hooks/api/use-property-mutations.ts` -- useCreatePropertyMutation with cache invalidation pattern

### File upload patterns
- `src/components/ui/file-upload/` -- Existing file upload component system (dropzone, validation, store)
- `src/components/ui/dropzone.tsx` -- Standalone dropzone component
- `src/types/file-upload.ts` -- File upload type definitions

### Properties UI
- `src/app/(owner)/properties/page.tsx` -- Properties list page (import button goes here)
- `src/app/(owner)/properties/new/page.tsx` -- Single property creation (reference for form fields)
- `src/hooks/api/query-keys/property-keys.ts` -- Property query key factory for cache invalidation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `propertyInputSchema` from `src/lib/validation/properties.ts` -- validates all property fields with Zod, can validate each CSV row
- `useCreatePropertyMutation` from `src/hooks/api/use-property-mutations.ts` -- handles single property insert with cache invalidation
- `file-upload` component system in `src/components/ui/file-upload/` -- dropzone, validation, progress tracking
- `Empty` compound component from `#components/ui/empty` -- for empty/initial state of import dialog
- `Button`, `Dialog`, `Table` shadcn components available

### Established Patterns
- Property creation uses PostgREST `.insert()` via Supabase client (no Edge Function)
- `owner_user_id` is set from authenticated user, not sent in payload
- Cache invalidation after property mutations: `propertyQueries.lists()` + `ownerDashboardKeys.all`
- Soft-delete pattern: properties use `status: 'active'` by default
- File validation uses Zod schemas at the boundary

### Integration Points
- Properties list page (`src/app/(owner)/properties/page.tsx`) -- add "Import CSV" button
- Property query key factory -- invalidate after bulk import
- Dashboard stats keys -- invalidate after bulk import (new properties affect stats)

</code_context>

<specifics>
## Specific Ideas

- No CSV library currently in package.json -- Papa Parse needs to be added as a dependency
- The import is purely client-side: parse CSV in browser, validate with Zod, insert via PostgREST
- No need for Supabase Storage or Edge Functions -- the CSV file never leaves the browser

</specifics>

<deferred>
## Deferred Ideas

- Bulk unit creation via CSV -- separate feature, could be a future phase
- Import properties with units in a single CSV (nested data) -- too complex for initial implementation
- Server-side CSV processing via Edge Function -- not needed given client-side approach

</deferred>

---

*Phase: 24-bulk-property-import*
*Context gathered: 2026-03-18*
