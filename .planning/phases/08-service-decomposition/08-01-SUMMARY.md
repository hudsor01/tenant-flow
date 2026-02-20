---
phase: 08-service-decomposition
plan: 01
status: complete
duration: ~5 min
---

## Summary

Split utility.service.ts (590 lines) into focused single-responsibility services.

## Changes

### Files Created
- `apps/backend/src/shared/services/search.service.ts` (211 lines)
  - Global search across properties, tenants, units, leases
  - SQL injection protection via sql-safe.utils

- `apps/backend/src/shared/services/password.service.ts` (128 lines)
  - Password strength validation
  - Score calculation and feedback generation

### Files Modified
- `apps/backend/src/shared/services/utility.service.ts`
  - Reduced from 590 → 286 lines (52% reduction)
  - Now focused on user ID mapping and account management

- `apps/backend/src/shared/services/services.module.ts`
  - Added SearchService, PasswordService to providers/exports

## Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| utility.service.ts | 590 lines | 286 lines | -52% |
| New services | 0 | 2 | +2 |
| Total lines | 590 | 625 | +6% |
| Test suites passing | 135 | 135 | 0 |
| Tests passing | 1602 | 1602 | 0 |

## Decisions

1. **PDF service not split**: pdf-generator.service.ts (604 lines) assessed as acceptable
   - Already well-structured with related functionality
   - PDF module has 8 supporting services for different concerns
   - Splitting would add complexity without clear benefit

2. **Search service independent**: No external consumers found, clean extraction

3. **Password service pure**: No database dependencies, only validation logic

## Verification

- [x] search.service.ts created with searchByName
- [x] password.service.ts created with validatePasswordStrength
- [x] utility.service.ts reduced to 286 lines
- [x] services.module.ts exports new services
- [x] `pnpm --filter @repo/backend typecheck` passes
- [x] `pnpm --filter @repo/backend test:unit` passes (135 suites, 1602 tests)
