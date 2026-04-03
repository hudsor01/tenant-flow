---
phase: 30-frontend-import-validation-cleanup
plan: 02
status: complete
started: 2026-04-03T17:00:00Z
completed: 2026-04-03T17:05:00Z
---

## Summary

Replaced all inline phone validation schemas with the shared `phoneSchema` from `src/lib/validation/common.ts` across 3 schema files (6 phone fields total), ensuring consistent phone number validation (digits/+/()/- only, min 10 chars, max 20 chars) throughout the application.

## Key Changes

- `template-schemas.ts`: replaced 3 inline phone fields with `phoneSchema`/`phoneSchema.optional()`
- `contact.ts`: replaced 1 inline `z.string().optional()` with `phoneSchema.optional()`
- `tenants.ts`: replaced 2 inline `z.string().optional()` with `phoneSchema.optional()`
- Added `phoneSchema` imports to template-schemas.ts and contact.ts (tenants.ts already had it)

## Key Files

### Modified
- `src/app/(owner)/documents/templates/components/template-schemas.ts` — 3 phone fields
- `src/lib/validation/contact.ts` — 1 phone field
- `src/lib/validation/tenants.ts` — 2 phone fields

## Verification

- TypeScript compilation: PASS
- Unit tests: 1,499/1,499 PASS
- Zero inline `z.string()` phone validation remaining in target files
- All pre-commit hooks pass

## Self-Check: PASSED
