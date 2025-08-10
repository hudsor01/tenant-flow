# Store Export Conflicts Resolution

## Issues Resolved

The `stores/index.ts` barrel export was experiencing selector name conflicts where multiple store files were exporting selectors with identical names, causing TypeScript conflicts and import ambiguity.

### Conflicting Selectors (Before Fix):
- `selectSelectedProperty` exported from both `property-store.ts` and `selection-store.ts`
- `selectSelectedTenant` exported from both `tenant-store.ts` and `selection-store.ts` 
- `selectSelectedLease` exported from both `lease-store.ts` and `selection-store.ts`

## Resolution Strategy

### 1. Domain Store Selectors (Property, Tenant, Lease)
Changed from wildcard exports (`export *`) to explicit named exports with prefixed selector names:

```typescript
// Before (conflicting)
export * from './property-store'
export * from './tenant-store' 
export * from './lease-store'

// After (explicit, non-conflicting)
export {
  usePropertyStore,
  selectProperties,
  selectSelectedProperty as selectPropertyStoreSelectedProperty, // Prefixed
  selectPropertyFilters,
  selectIsLoading as selectPropertyIsLoading,
} from './property-store'
```

### 2. Selection Store Selectors
Kept selection store selectors with "Global" prefix to distinguish from domain-specific selectors:

```typescript
export {
  selectSelectedProperty as selectGlobalSelectedProperty,
  selectSelectedTenant as selectGlobalSelectedTenant,
  selectSelectedUnit as selectGlobalSelectedUnit,
  selectSelectedLease as selectGlobalSelectedLease,
  // ... other exports
} from './selection-store'
```

## Usage Guidelines

### For Domain-Specific Selection:
```typescript
import { selectPropertyStoreSelectedProperty, usePropertyStore } from '@/stores'

// Use domain store for entity-specific selection
const selectedProperty = usePropertyStore(selectPropertyStoreSelectedProperty)
```

### For Global Context/Cross-Entity Selection:
```typescript
import { selectGlobalSelectedProperty, useSelectionStore } from '@/stores'

// Use selection store for cross-component context sharing
const selectedProperty = useSelectionStore(selectGlobalSelectedProperty)
```

## Store Architecture

### Domain Stores (Property, Tenant, Lease)
- **Purpose**: Entity-specific CRUD operations and state management
- **Selection**: Store-specific selected entity for operations within that domain
- **Naming**: `selectPropertyStoreSelectedProperty`, `selectTenantStoreSelectedTenant`, etc.

### Selection Store
- **Purpose**: Cross-component context sharing and bulk operations
- **Selection**: Global context for sharing selection state between different components
- **Naming**: `selectGlobalSelectedProperty`, `selectGlobalSelectedTenant`, etc.

### Other Stores
- UI Store: Theme, layout, accessibility preferences
- Auth Store: User authentication and session management
- Feature Flag Store: Feature toggles and A/B testing
- Modal Store: Modal state management
- Notification Store: Toast and notification management
- Navigation Store: Breadcrumbs and page context
- Form Store: Form draft state and auto-save
- Workflow Store: Multi-step process management

## Migration Utilities

The migration utilities handle transitioning from old monolithic stores to the new modular architecture:

- `migrateFromOldStores()`: Called automatically during app initialization
- Migrates theme preferences, feature flags, user data, and organization context
- Maintains backward compatibility with existing persisted state

## Best Practices

1. **Use explicit exports** rather than wildcard exports to avoid naming conflicts
2. **Prefix selectors** when multiple stores have similar concepts (e.g., `selectPropertyStoreSelectedProperty`)
3. **Choose the right store** - domain stores for CRUD operations, selection store for context sharing
4. **Import specifically** what you need rather than importing everything from the barrel export
5. **Document new stores** and their purpose in this guide when adding them

## Verification

All store exports have been verified to work correctly:
- ✅ TypeScript compilation passes
- ✅ Linting passes
- ✅ Production build succeeds
- ✅ No import conflicts
- ✅ Existing components continue to work

The modular store architecture provides better performance through selective subscriptions and clearer separation of concerns while maintaining a clean barrel export API.