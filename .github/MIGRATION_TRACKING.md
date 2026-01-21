# Schema Migration Tracking: property_owners → stripe_connected_accounts

**Status**: 🚧 IN PROGRESS
**Priority**: HIGH
**Estimated Completion**: TBD

## Quick Stats

- **Backend References**: 54 files with `property_owner_id`
- **New Field Usage**: 356 references to `owner_user_id`
- **Migration Progress**: ~40%

## Critical Path Item
### 🔴 Blocking (Must Fix Before Merge)

- [x] Update `property-stats.service.ts` to use new schema
- [x] Update `lease-expiry-checker.service.ts` to use new schema
- [x] Update `property-ownership.guard.ts` to use new schema
- [x] Verify all test files updated and passing
- [x] Create database migration script with rollback

### 🟡 High Priority (Should Fix Soon)

- [ ] Audit and update all RLS policies
- [ ] Update TypeScript types in `@repo/shared`
- [ ] Add API backward compatibility layer
- [ ] Update frontend API client calls
- [ ] Document breaking changes in CHANGELOG

### 🟢 Medium Priority (Can Be Follow-up PR)

- [ ] Performance testing for new schema
- [ ] Remove old `property_owners` table (after migration stable)
- [ ] Update API documentation
- [ ] Mobile app updates (if applicable)

## Files Requiring Updates

### Backend Services

```bash
# Files with property_owner_id (54 total)
apps/backend/src/modules/dashboard/services/property-stats.service.ts
apps/backend/src/modules/leases/lease-expiry-checker.service.ts
apps/backend/src/shared/guards/property-ownership.guard.ts

# Find all:
rg "property_owner_id" apps/backend/src -l
```

### Test Files

```bash
# Find test files needing updates:
rg "property_owner_id" apps/backend/src --glob "*.spec.ts" -l
rg "property_owner_id" apps/backend/src --glob "*.test.ts" -l
```

### Frontend (If Applicable)

```bash
# Find frontend references:
rg "property_owner_id" apps/frontend/src -l
```

## Testing Checklist

- [ ] All unit tests passing
- [ ] Integration tests updated
- [ ] RLS policies tested
- [ ] API endpoints return correct data
- [ ] Frontend displays correct information
- [ ] No performance regressions

## Commands to Track Progress

```bash
# Count remaining property_owner_id references
rg "property_owner_id" apps/backend/src | wc -l

# Count owner_user_id references
rg "owner_user_id" apps/backend/src | wc -l

# Find files still using old field
rg "property_owner_id" apps/backend/src -l

# Run tests
pnpm --filter @repo/backend test:unit
```

## Review Checklist

Before marking migration complete:

- [ ] All backend code updated
- [ ] All tests passing
- [ ] RLS policies audited and tested
- [ ] TypeScript types updated
- [ ] Frontend integration complete
- [ ] Documentation updated
- [ ] Migration script tested on staging
- [ ] Rollback plan documented and tested

## Related Files

- Migration Documentation: `/docs/schema-migration-property-owners.md`
- Database Migrations: `/supabase/migrations/`
- Backend Services: `/apps/backend/src/modules/`
- Shared Types: `/packages/shared/src/types/`

---

**Note**: This is a tracking file for the ongoing migration. Update this file as progress is made.
