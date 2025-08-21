# State Management Migration Guide

## Overview
We've refactored our state management to eliminate DRY violations and create a more maintainable architecture using factory patterns.

## Key Changes

### 1. Unified Factory Pattern (`atom-factory.ts`)
- **New**: `createEntityAtoms()` factory for consistent CRUD operations
- **Benefits**: Eliminates duplicate code, consistent API, automatic query management

### 2. Refactored Business Atoms
- `properties.ts` → `properties-refactored.ts`
- `tenants.ts` → `tenants-refactored.ts`

## Migration Steps

### Properties Migration

#### Old Pattern:
```typescript
import { 
  propertiesAtom, 
  selectedPropertyAtom,
  setPropertyFiltersAtom 
} from '@/atoms/business/properties'

// Using atoms
const properties = useAtomValue(propertiesAtom)
const setFilters = useSetAtom(setPropertyFiltersAtom)
```

#### New Pattern:
```typescript
import { 
  propertiesAtom,
  selectedPropertyAtom,
  setPropertyFiltersAtom 
} from '@/atoms'

// Same usage - backward compatible
const properties = useAtomValue(propertiesAtom)
const setFilters = useSetAtom(setPropertyFiltersAtom)

// Or use the new unified API
import { PropertiesState } from '@/atoms'
// PropertiesState provides a cleaner interface
```

### Tenants Migration

#### Old Pattern:
```typescript
// Manual CRUD operations
import { 
  tenantsAtom,
  setTenantsAtom,
  addTenantAtom,
  updateTenantAtom,
  deleteTenantAtom 
} from '@/atoms/business/tenants'

// Manual updates
const setTenants = useSetAtom(setTenantsAtom)
const addTenant = useSetAtom(addTenantAtom)
const updateTenant = useSetAtom(updateTenantAtom)
const deleteTenant = useSetAtom(deleteTenantAtom)
```

#### New Pattern:
```typescript
// Using mutations (recommended)
import { 
  createTenantMutationAtom,
  updateTenantMutationAtom,
  deleteTenantMutationAtom 
} from '@/atoms'

// Use with jotai-tanstack-query
const createMutation = useAtomValue(createTenantMutationAtom)
const updateMutation = useAtomValue(updateTenantMutationAtom)
const deleteMutation = useAtomValue(deleteTenantMutationAtom)

// Mutations handle cache invalidation automatically
await createMutation.mutate(newTenantData)
```

### Removed/Deprecated Atoms

The following atoms have been removed or replaced:

1. **`setTenantsAtom`** - Use `tenantsQueryAtom` refetch instead
2. **`addTenantAtom`** - Use `createTenantMutationAtom`
3. **`updateTenantAtom`** - Use `updateTenantMutationAtom`
4. **`deleteTenantAtom`** - Use `deleteTenantMutationAtom`
5. **`activeTenentsAtom`** (typo) - Use `activeTenantsAtom`

### Server State Management

#### Old Pattern:
```typescript
// Duplicate query atoms
import { serverPropertiesQueryAtom } from '@/atoms/server/queries'
import { propertiesQueryAtom } from '@/atoms/business/properties'
// Two different atoms for the same data!
```

#### New Pattern:
```typescript
// Single source of truth
import { propertiesQueryAtom } from '@/atoms'
// One atom with proper cache management
```

## Benefits of New Architecture

### 1. **DRY Principle**
- No more duplicate query atoms
- Consistent CRUD patterns
- Reusable factory functions

### 2. **Better TypeScript Support**
- Full type inference
- Consistent interfaces
- Type-safe mutations

### 3. **Automatic Cache Management**
- Query invalidation on mutations
- Optimistic updates support
- Proper loading/error states

### 4. **Simplified API**
```typescript
// Old: Multiple imports and manual state management
import { tenantsAtom, setTenantsAtom, tenantsLoadingAtom, tenantsErrorAtom } from '...'

// New: Unified factory-generated atoms
import { TenantsState } from '@/atoms'
// Everything is included and consistent
```

## Creating New Entity Atoms

Use the factory for any new entities:

```typescript
import { createEntityAtoms } from '@/atoms/utils/atom-factory'

const leaseAtoms = createEntityAtoms<Lease, LeaseFilters>({
  name: 'leases',
  api: {
    getAll: () => LeasesApi.getLeases(),
    getById: (id) => LeasesApi.getLease(id),
    create: (data) => LeasesApi.createLease(data),
    update: (id, data) => LeasesApi.updateLease(id, data),
    delete: (id) => LeasesApi.deleteLease(id)
  },
  filterFn: (lease, filters) => {
    // Custom filter logic
    return true
  }
})

// Automatically get all these atoms:
// - queryAtom, dataAtom, loadingAtom, errorAtom
// - selectedAtom, selectAtom, clearSelectionAtom
// - filtersAtom, filteredDataAtom, setFiltersAtom, clearFiltersAtom
// - countAtom, filteredCountAtom
// - byIdAtom, detailQueryAtom
// - createMutation, updateMutation, deleteMutation
// - refetchAtom, queryKeys
```

## Gradual Migration Strategy

1. **Phase 1**: Update imports (backward compatible)
   - Change import paths to use new consolidated exports
   - Test existing functionality

2. **Phase 2**: Adopt mutations
   - Replace manual CRUD operations with mutations
   - Benefit from automatic cache updates

3. **Phase 3**: Use unified API
   - Adopt `AppState`, `Actions`, and `Selectors` APIs
   - Simplify component code

4. **Phase 4**: Remove old code
   - Delete deprecated atom files
   - Update all references

## Common Issues and Solutions

### Issue: "Cannot find exported member"
**Solution**: Check the migration table above for the new atom name

### Issue: "Type mismatch with mutations"
**Solution**: Mutations now return TanStack Query mutation objects, not setter functions

### Issue: "Loading states not working"
**Solution**: Use the generated `loadingAtom` instead of manual loading state

## Need Help?

- Check the factory implementation: `atoms/utils/atom-factory.ts`
- See examples: `atoms/business/properties-refactored.ts`
- Review the unified API: `atoms/index.ts`