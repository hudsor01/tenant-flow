# Phase 20: API Request/Response Standardization - Context

**Created:** 2026-01-18
**Purpose:** Document research findings before planning

## Phase Goal (from Roadmap)

"Consistent Zod validation, response formats, error handling"

## Research Findings

### Current State Analysis

**Zod Validation (Already Comprehensive):**
- 33 DTOs using `createZodDto()` pattern across modules
- Global `ZodValidationPipe` configured in `main.ts` and `app.module.ts`
- Shared validation schemas in `packages/shared/src/validation/` (22 files)
- Auto-generated schemas from Supabase in `generated-schemas.ts`

**Response Formats (Varied):**

| Pattern | Example | Usage |
|---------|---------|-------|
| Paginated | `{ data, total, limit, offset, hasMore }` | properties.controller.ts |
| Wrapped | `{ data }` | analytics controllers |
| Success | `{ success: true }` | simple POST endpoints |
| Raw array | `[...]` | some list endpoints |
| Raw object | `{...}` | detail endpoints |

**Error Handling (Good Foundation):**
- `DatabaseExceptionFilter` handles PostgrestError → HTTP mapping
- Error codes: PGRST116→404, 23505→409, 42501→403, etc.
- NestJS built-in exceptions used consistently
- Error response format: `{ statusCode, message, error, details? }`

**Swagger Documentation:**
- Full Swagger setup in `main.ts`
- `@ApiOperation`, `@ApiResponse` decorators used
- Tags for logical grouping

### What's Already Working

1. **Request Validation** - Zod schemas + global pipe = complete coverage
2. **Error Handling** - Database and HTTP errors properly mapped
3. **Swagger** - API documentation auto-generated
4. **Error Codes** - Centralized in `@repo/shared/constants/error-codes`

### Gaps Identified

1. **No Response Type Definitions** - Output types not formalized in shared package
2. **Inconsistent List Response** - Some use `{ data, total, ... }`, some return raw arrays
3. **No API Response Wrapper ADR** - Standard patterns not documented

### Constraints

From prior phases:
- Phase 18: Use admin client for webhooks, user client for authenticated
- Phase 19: Use RPCs for atomic operations, direct queries for CRUD
- CLAUDE.md: Use built-in NestJS exceptions only

From CONCERNS.md:
- No API-specific concerns noted
- Backend 31% test coverage - changes need tests

## Approach

Given the codebase already has strong validation infrastructure:

1. **Audit, don't rebuild** - Document existing patterns
2. **Create ADR** - Formalize API response/error standards
3. **Minimal changes** - Only fix critical inconsistencies

## Scope Estimate

Single plan (similar to Phases 18 and 19 - mostly verification/documentation):
- Task 1: Audit API response patterns across controllers
- Task 2: Document API standards in ADR
- Task 3: Identify and log inconsistencies (don't fix - log for future)

## Dependencies

- Phase 19 complete (RPC patterns documented)
- No code changes expected unless critical inconsistencies found

## References

Key files for this phase:
- `apps/backend/src/main.ts` - Global configuration
- `apps/backend/src/shared/filters/database-exception.filter.ts` - Error handling
- `packages/shared/src/validation/*.ts` - Validation schemas
- `apps/backend/src/modules/*/dto/*.dto.ts` - Request DTOs
