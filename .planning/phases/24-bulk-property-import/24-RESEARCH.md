# Phase 24: Bulk Property Import - Research

**Researched:** 2026-03-18
**Domain:** CSV parsing, client-side validation, bulk database insertion
**Confidence:** HIGH

## Summary

Phase 24 converts an existing stub implementation of bulk property import into a working feature. The UI scaffolding already exists -- dialog, stepper, upload/validate/confirm steps, and tests -- but the actual CSV parsing uses a naive `String.split()` approach with incorrect column names, and the mutation returns a hardcoded "not yet available" error. The work is primarily about replacing the naive CSV parser with Papa Parse + Zod validation, aligning column names with the database schema, and implementing the actual sequential PostgREST insert logic.

The existing `propertyCreateSchema` from `src/lib/validation/properties.ts` can validate each CSV row directly after mapping CSV column names to schema field names. The `propertyMutations.create()` factory already handles `owner_user_id` injection from the authenticated user, so each row insert follows the same path as manual property creation.

**Primary recommendation:** Install Papa Parse for robust CSV parsing, replace `parseCSVFile` with a new `parseAndValidateCSV` function that uses Papa Parse + Zod, fix column mismatches (template uses `address` but schema expects `address_line1`), and wire the confirm step to sequentially call PostgREST `.insert()` with progress tracking.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Client-side CSV parsing with Papa Parse (no Edge Function needed)
- Reuse existing Zod `propertyInputSchema` from `src/lib/validation/properties.ts` for row validation
- Validation errors displayed in an inline per-row error table: row number, field name, error message
- User fixes CSV and re-uploads -- no inline editing of invalid rows
- All-or-nothing import: if any row fails validation, no rows are imported
- Maximum 100 properties per CSV upload
- On confirmation, rows are inserted sequentially via existing PostgREST `.insert()` (not bulk RPC)
- Required columns: name, address_line1, city, state, postal_code, property_type
- Optional columns: address_line2, country (defaults to "US")
- "Import CSV" button on the Properties list page, next to the existing "Add Property" button
- Opens a dialog flow: upload -> validate -> preview -> confirm -> result

### Claude's Discretion
- Whether to use a dialog or full page for the import flow (existing code uses dialog -- keep it)
- Exact layout of the preview table columns
- Success/failure summary presentation after import completes
- Whether to use Papa Parse or native FileReader + manual splitting (Papa Parse recommended)
- Loading/progress animation style during bulk insert

### Deferred Ideas (OUT OF SCOPE)
- Bulk unit creation via CSV -- separate feature
- Import properties with units in a single CSV (nested data)
- Server-side CSV processing via Edge Function
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROP-01 | Owner can bulk import properties via CSV upload (backend processes and creates records) | Existing UI scaffolding in place; needs Papa Parse integration, sequential PostgREST insert with progress, cache invalidation |
| PROP-02 | Bulk import validates CSV data and reports errors before committing | Replace naive `String.split()` parser with Papa Parse + Zod `propertyCreateSchema` validation; fix column name mismatches |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| papaparse | 5.5.3 | CSV parsing | Handles quoted fields, commas in values, newlines in fields, BOM, encoding -- edge cases naive splitting misses |
| @types/papaparse | 5.5.2 | TypeScript types for Papa Parse | Type safety for parse config and results |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod (v4) | existing | Row validation | `propertyCreateSchema` validates each parsed row |
| @tanstack/react-query | existing | Mutations and cache | Sequential insert mutation + invalidation |
| sonner | existing | Toast notifications | Success/error toasts after import |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Papa Parse | Native `String.split()` | Current impl; breaks on commas in values, quoted fields, multiline values |
| Papa Parse | d3-dsv | Lighter but less error handling, no streaming, fewer edge cases |

**Installation:**
```bash
pnpm add papaparse && pnpm add -D @types/papaparse
```

## Architecture Patterns

### Existing Code That Needs Modification

The bulk import feature already has UI scaffolding with these files:

```
src/components/properties/
  bulk-import-dialog.tsx        # Dialog wrapper (minimal changes needed)
  bulk-import-stepper.tsx       # Step orchestration (major changes: real mutation)
  bulk-import-upload-step.tsx   # File upload UI (column name fixes in requirements card)
  bulk-import-validate-step.tsx # Preview table (column name fixes, error detail)
  bulk-import-confirm-step.tsx  # Progress/result display (minor changes)
  csv-utils.ts                  # CSV parsing (major rewrite: Papa Parse + Zod)
  __tests__/csv-utils.test.ts   # CSV tests (update for new function signatures)
  __tests__/bulk-import-*.test.tsx  # Component tests (update assertions)
```

### Pattern 1: CSV Parse + Zod Validate Pipeline
**What:** Replace `parseCSVFile` with `parseAndValidateCSV` that uses Papa Parse for parsing and Zod for validation.
**When to use:** When the file is selected and transitions to the validate step.

```typescript
// Source: Project conventions + Papa Parse docs
import Papa from 'papaparse'
import { propertyCreateSchema } from '#lib/validation/properties'

interface ValidatedRow {
  row: number
  data: Record<string, string>
  errors: Array<{ field: string; message: string }>
  parsed: PropertyCreate | null  // null if validation failed
}

interface ParseResult {
  rows: ValidatedRow[]
  tooManyRows: boolean
  totalRowCount: number
}

const CSV_MAX_ROWS = 100

export function parseAndValidateCSV(csvText: string): ParseResult {
  const { data, errors } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase(),
    transform: (value: string) => value.trim(),
  })

  // Papa Parse errors are parsing-level (not row validation)
  // Handle them as needed

  const tooManyRows = data.length > CSV_MAX_ROWS
  const rowsToValidate = data.slice(0, CSV_MAX_ROWS)

  const rows: ValidatedRow[] = rowsToValidate.map((rawRow, index) => {
    // Map CSV columns to schema fields
    const mapped = {
      name: rawRow.name ?? '',
      address_line1: rawRow.address_line1 ?? '',
      address_line2: rawRow.address_line2 ?? undefined,
      city: rawRow.city ?? '',
      state: (rawRow.state ?? '').toUpperCase(),
      postal_code: rawRow.postal_code ?? '',
      country: rawRow.country || 'US',
      property_type: (rawRow.property_type ?? '').toUpperCase(),
    }

    const result = propertyCreateSchema.safeParse(mapped)

    if (result.success) {
      return {
        row: index + 1,
        data: rawRow,
        errors: [],
        parsed: result.data,
      }
    }

    // Extract Zod errors into field-level messages
    const fieldErrors = result.error.issues.map(issue => ({
      field: issue.path.join('.') || 'unknown',
      message: issue.message,
    }))

    return {
      row: index + 1,
      data: rawRow,
      errors: fieldErrors,
      parsed: null,
    }
  })

  return { rows, tooManyRows, totalRowCount: data.length }
}
```

### Pattern 2: Sequential Insert with Progress
**What:** Insert validated rows one at a time via PostgREST, tracking progress.
**When to use:** On the confirm step when user clicks "Import Properties."

```typescript
// Source: Existing propertyMutations.create() pattern
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { requireOwnerUserId } from '#lib/require-owner-user-id'
import type { PropertyCreate } from '#lib/validation/properties'

interface ImportProgress {
  current: number
  total: number
  succeeded: number
  failed: number
}

async function bulkInsertProperties(
  rows: PropertyCreate[],
  onProgress: (progress: ImportProgress) => void
): Promise<BulkImportResult> {
  const supabase = createClient()
  const user = await getCachedUser()
  const ownerId = requireOwnerUserId(user?.id)

  const errors: Array<{ row: number; error: string }> = []
  let succeeded = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const { error } = await supabase
        .from('properties')
        .insert({ ...row, owner_user_id: ownerId })

      if (error) {
        errors.push({ row: i + 1, error: error.message })
      } else {
        succeeded++
      }
    } catch {
      errors.push({ row: i + 1, error: 'Unexpected error' })
    }

    onProgress({
      current: i + 1,
      total: rows.length,
      succeeded,
      failed: errors.length,
    })
  }

  return {
    success: errors.length === 0,
    imported: succeeded,
    failed: errors.length,
    errors,
  }
}
```

### Pattern 3: Cache Invalidation After Import
**What:** Invalidate property lists and dashboard caches after successful import.
**When to use:** After bulk insert completes in the mutation's onSuccess/onSettled.

```typescript
// Source: Existing useCreatePropertyMutation pattern
queryClient.invalidateQueries({ queryKey: propertyQueries.lists() })
queryClient.invalidateQueries({ queryKey: propertyQueries.all() })
queryClient.invalidateQueries({ queryKey: ownerDashboardKeys.all })
```

### Anti-Patterns to Avoid
- **Naive CSV splitting:** Current `parseCSVFile` uses `line.split(',')` which breaks on commas inside quoted values (e.g., "123 Main St, Apt 2"). Use Papa Parse.
- **Column name mismatch:** Current template uses `address` but database expects `address_line1`. Must align template headers with schema fields.
- **Preview limit masking errors:** Current parser limits to 10 rows for preview but doesn't validate remaining rows. All rows (up to 100) must be validated.
- **Partial inserts without rollback:** Since PostgREST doesn't support client-side transactions across multiple inserts, the all-or-nothing validation must happen before any inserts begin. Never start inserting if validation found errors.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | `String.split(',')` | Papa Parse | Handles RFC 4180 edge cases: quoted fields, embedded commas, embedded newlines, BOM, encoding detection |
| Row validation | Custom field checks | Zod `propertyCreateSchema.safeParse()` | Already exists, already tested, gives structured error messages |
| File download | Manual blob/link creation | Existing `triggerCsvDownload` | Already implemented in csv-utils.ts |
| Property insertion | Custom insert function | Existing `supabase.from('properties').insert()` pattern | Matches `propertyMutations.create()` pattern with RLS |

**Key insight:** The existing stub already has correct UI structure. The work is replacing internals (parser, mutation), not building UI from scratch.

## Common Pitfalls

### Pitfall 1: Column Name Mismatch
**What goes wrong:** Template CSV uses `address` but `propertyCreateSchema` expects `address_line1`. Users upload CSV from template, validation fails on every row.
**Why it happens:** Stub was built with simplified column names before checking the actual Zod schema.
**How to avoid:** Template headers must exactly match the schema field names: `name`, `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country`, `property_type`.
**Warning signs:** Existing `csv-utils.ts` line 3-11 has `address` and `description` columns that don't exist in `propertyCreateSchema`.

### Pitfall 2: All-or-Nothing Not Actually Enforced
**What goes wrong:** Validation passes rows individually, some insert and some fail, leaving partial data.
**Why it happens:** Sequential inserts can fail mid-way (RLS, constraints, network).
**How to avoid:** Validate ALL rows with Zod before starting any inserts. If any row has errors, block the Import button entirely. During insert, if any single insert fails, the result shows partial success (the user decision says "all-or-nothing" for validation, but inserts may partially succeed).
**Warning signs:** Import button enabled when error rows exist.

### Pitfall 3: Papa Parse Header Normalization
**What goes wrong:** User CSV has `Address_Line1` or `ADDRESS_LINE1` but parser expects `address_line1`.
**Why it happens:** CSV headers are user-typed and case-sensitive by default.
**How to avoid:** Use Papa Parse `transformHeader` to normalize: `(h) => h.trim().toLowerCase()`.
**Warning signs:** Valid data rejected due to case mismatch in header names.

### Pitfall 4: state Field Case Sensitivity
**What goes wrong:** User enters `ca` lowercase but Zod regex requires `[A-Z]{2}`.
**Why it happens:** `propertyInputSchema` enforces uppercase state codes.
**How to avoid:** Uppercase the `state` value before validation: `(rawRow.state ?? '').toUpperCase()`.
**Warning signs:** Valid state codes rejected in validation preview.

### Pitfall 5: property_type Case Sensitivity
**What goes wrong:** User enters `apartment` but schema expects `APARTMENT`.
**Why it happens:** `propertyTypeSchema` uses exact enum values.
**How to avoid:** Uppercase `property_type` before validation.
**Warning signs:** All rows fail with "invalid property type" despite correct values.

### Pitfall 6: Existing Tests Expect Old API
**What goes wrong:** Tests import `parseCSVFile` and test against `address` column.
**Why it happens:** Tests were written for the stub implementation.
**How to avoid:** Update tests to use the new `parseAndValidateCSV` function and correct column names.
**Warning signs:** Tests fail after csv-utils.ts rewrite.

## Code Examples

### CSV Template with Correct Column Names
```typescript
// Source: CONTEXT.md decisions + propertyCreateSchema analysis
export const CSV_TEMPLATE_HEADERS = [
  'name',
  'address_line1',
  'address_line2',
  'city',
  'state',
  'postal_code',
  'country',
  'property_type',
] as const

export const CSV_TEMPLATE_SAMPLE_ROWS = [
  ['Sunset Apartments', '123 Main St', '', 'San Francisco', 'CA', '94105', 'US', 'APARTMENT'],
  ['Oak House', '456 Oak Ave', 'Unit B', 'Los Angeles', 'CA', '90001', 'US', 'SINGLE_FAMILY'],
] as const
```

### Papa Parse Configuration
```typescript
// Source: Papa Parse docs
import Papa from 'papaparse'

const parseResult = Papa.parse<Record<string, string>>(csvText, {
  header: true,           // First row is headers
  skipEmptyLines: true,   // Ignore blank lines
  transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  transform: (value: string) => value.trim(),
})
// parseResult.data = array of objects keyed by header
// parseResult.errors = array of parse-level errors (not validation)
```

### Zod Validation Per Row (using propertyCreateSchema)
```typescript
// Source: Existing src/lib/validation/properties.ts
import { propertyCreateSchema } from '#lib/validation/properties'

// propertyCreateSchema = propertyInputSchema.omit({ owner_user_id: true })
// Fields: name, address_line1, address_line2?, city, state, postal_code, country?, property_type, status?
const result = propertyCreateSchema.safeParse({
  name: 'Test Property',
  address_line1: '123 Main St',
  city: 'NYC',
  state: 'NY',
  postal_code: '10001',
  property_type: 'APARTMENT',
})
// result.success: boolean
// result.data: PropertyCreate (if success)
// result.error.issues: ZodIssue[] (if failure)
```

## State of the Art

| Old Approach (Current Stub) | Current Approach (To Implement) | Impact |
|-----------------------------|--------------------------------|--------|
| `line.split(',')` CSV parsing | Papa Parse `parse()` with header mode | Handles all CSV edge cases |
| Basic string checks (`!rowData.name`) | Zod `propertyCreateSchema.safeParse()` | Reuses existing schema, structured errors |
| Hardcoded "not yet available" mutation | Sequential PostgREST `.insert()` with progress | Actual property creation |
| `address` column name | `address_line1` column name | Matches database schema |
| Preview limited to 10 rows | Validate all rows (up to 100) | Complete validation coverage |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 with jsdom |
| Config file | vitest.config.ts (unit project) |
| Quick run command | `pnpm test:unit -- --run src/components/properties/__tests__/csv-utils.test.ts` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROP-02 | CSV parsed with Papa Parse handling edge cases | unit | `pnpm test:unit -- --run src/components/properties/__tests__/csv-utils.test.ts` | Yes (needs update) |
| PROP-02 | Each row validated against propertyCreateSchema | unit | `pnpm test:unit -- --run src/components/properties/__tests__/csv-utils.test.ts` | Yes (needs update) |
| PROP-02 | Validation errors include row number, field, message | unit | `pnpm test:unit -- --run src/components/properties/__tests__/csv-utils.test.ts` | Yes (needs update) |
| PROP-02 | Max 100 rows enforced | unit | `pnpm test:unit -- --run src/components/properties/__tests__/csv-utils.test.ts` | Yes (needs update) |
| PROP-01 | Dialog renders and opens | unit | `pnpm test:unit -- --run src/components/properties/__tests__/bulk-import-dialog.test.tsx` | Yes |
| PROP-01 | Upload step shows correct field requirements | unit | `pnpm test:unit -- --run src/components/properties/__tests__/bulk-import-upload-step.test.tsx` | Yes (needs update) |
| PROP-01 | Validate step shows preview with correct columns | unit | `pnpm test:unit -- --run src/components/properties/__tests__/bulk-import-validate-step.test.tsx` | Yes (needs update) |
| PROP-01 | Confirm step shows progress and result | unit | `pnpm test:unit -- --run src/components/properties/__tests__/bulk-import-confirm-step.test.tsx` | Yes |

### Sampling Rate
- **Per task commit:** `pnpm test:unit -- --run src/components/properties/__tests__/csv-utils.test.ts`
- **Per wave merge:** `pnpm validate:quick`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None -- existing test infrastructure covers all phase requirements. Tests need updating for new APIs and column names, not new test files.

## Sources

### Primary (HIGH confidence)
- `src/lib/validation/properties.ts` -- Examined propertyCreateSchema, propertyInputSchema, field validations
- `src/components/properties/csv-utils.ts` -- Examined current stub CSV parser
- `src/components/properties/bulk-import-*.tsx` -- Examined all 4 step components
- `src/hooks/api/query-keys/property-keys.ts` -- Examined propertyMutations.create() pattern
- `src/hooks/api/use-property-mutations.ts` -- Examined cache invalidation pattern
- `src/types/api-contracts.ts` -- Examined ImportStep, ParsedRow, BulkImportResult types
- `npm view papaparse version` -- Confirmed 5.5.3 latest
- `npm view @types/papaparse version` -- Confirmed 5.5.2 latest

### Secondary (MEDIUM confidence)
- Papa Parse documentation (well-established library, 11+ years, RFC 4180 compliant)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Papa Parse is the de facto CSV parsing library for JavaScript; only dependency to add
- Architecture: HIGH - Existing stub code thoroughly examined; changes are surgical replacements of internals
- Pitfalls: HIGH - All identified from direct code analysis (column mismatches, case sensitivity issues, naive parsing)

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (stable domain, no fast-moving dependencies)
