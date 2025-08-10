# Type System Architecture Guide

## Overview

TenantFlow uses a comprehensive type system that bridges domain types with API layer requirements while maintaining full type safety. This guide documents the patterns and utilities implemented to resolve TypeScript compilation errors and establish clear type hierarchies.

## Core Problem Solved

**Issue**: React Query hooks expected `Record<string, unknown>` for API parameters, but our custom domain types lacked proper index signatures, causing TypeScript compilation errors.

**Solution**: Implemented type adapter utilities that maintain type safety while satisfying API layer requirements.

## Type Adapter Pattern

### Core Utilities

All type adapter utilities are located in `packages/shared/src/utils/type-adapters.ts`:

#### 1. Query Parameter Adapter
```typescript
import { createQueryAdapter } from '@repo/shared'

// Before (causing type errors)
const response = await apiClient.get('/properties', { params: query })

// After (type-safe)
const response = await apiClient.get('/properties', { 
  params: createQueryAdapter(query) 
})
```

#### 2. Mutation Data Adapter
```typescript
import { createMutationAdapter } from '@repo/shared'

// Before (requiring unsafe type casting)
const response = await apiClient.post('/properties', data as Record<string, unknown>)

// After (type-safe)
const response = await apiClient.post('/properties', createMutationAdapter(data))
```

### Key Features

- **Type Safety**: No `any` types or unsafe casting required
- **Data Sanitization**: Handles Date serialization, undefined filtering, nested object handling
- **Validation**: Built-in parameter validation and error handling
- **Performance**: Minimal overhead with optimized filtering

## Type Hierarchy

### 1. Base Query Types

All query types extend `BaseQuery` which provides `Record<string, unknown>` compatibility:

```typescript
// packages/shared/src/types/queries.ts
export interface BaseQuery extends Record<string, unknown> {
  limit?: number
  offset?: number
  page?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PropertyQuery extends BaseQuery {
  propertyType?: string
  status?: string
  city?: string
  // ... other fields
}
```

### 2. API Input Types

Domain-specific input types for mutations:

```typescript
// packages/shared/src/types/api-inputs.ts
export interface CreatePropertyInput extends Record<string, unknown> {
  name: string
  address: string
  city: string
  // ... other fields
}
```

### 3. Domain Entity Types

Core business entities remain pure without API concerns:

```typescript
// packages/shared/src/types/properties.ts
export interface Property {
  id: string
  name: string
  address: string
  // ... domain fields
}
```

## Implementation Examples

### React Query Hook Pattern

```typescript
// apps/frontend/src/hooks/api/use-properties.ts
import { createMutationAdapter, createQueryAdapter } from '@repo/shared'

export function useProperties(
  query?: PropertyQuery,
  options?: { enabled?: boolean }
): UseQueryResult<Property[], Error> {
  return useQuery({
    queryKey: queryKeys.propertyList(query),
    queryFn: async () => {
      const response = await apiClient.get<Property[]>('/properties', { 
        params: createQueryAdapter(query)  // Type-safe conversion
      })
      return response.data
    },
    enabled: options?.enabled ?? true,
  })
}

export function useCreateProperty(): UseMutationResult<
  Property,
  Error,
  CreatePropertyInput
> {
  return useMutation({
    mutationFn: async (data: CreatePropertyInput) => {
      const response = await apiClient.post<Property>(
        '/properties', 
        createMutationAdapter(data)  // Type-safe conversion
      )
      return response.data
    },
    // ... other configuration
  })
}
```

## Type Validation Utilities

### Enum Validation
```typescript
import { validateEnumValue, UNIT_STATUS } from '@repo/shared'

const status = validateEnumValue(userInput, UNIT_STATUS, 'VACANT')
// Returns typed enum value with fallback
```

### Parameter Validation
```typescript
import { validateApiParams } from '@repo/shared'

validateApiParams(data, ['name', 'address'])
// Throws if required fields are missing
```

### Safe Type Conversion
```typescript
import { safeParseNumber, safeParseDate } from '@repo/shared'

const rent = safeParseNumber(formData.rent) // Returns number | undefined
const date = safeParseDate(formData.date)   // Returns Date | undefined
```

## Error Handling

### Type Adapter Errors
```typescript
import { TypeAdapterError } from '@repo/shared'

try {
  const adapted = createMutationAdapter(data)
} catch (error) {
  if (error instanceof TypeAdapterError) {
    console.log(`Failed during ${error.operation}:`, error.message)
  }
}
```

## Migration Guide

### Converting Existing Hooks

1. **Import adapters**:
   ```typescript
   import { createMutationAdapter, createQueryAdapter } from '@repo/shared'
   ```

2. **Replace type casting**:
   ```typescript
   // Before
   data as Record<string, unknown>
   
   // After
   createMutationAdapter(data)
   ```

3. **Update query params**:
   ```typescript
   // Before
   params: query
   
   // After
   params: createQueryAdapter(query)
   ```

### New Hook Development

Follow the established patterns:

1. Import domain types from `@repo/shared`
2. Import adapter utilities
3. Use `createQueryAdapter()` for GET requests
4. Use `createMutationAdapter()` for POST/PUT/DELETE requests
5. Maintain proper error handling

## Benefits

### Type Safety
- No `any` types in the codebase
- Compile-time validation of API contracts
- IntelliSense support for all parameters

### Maintainability
- Clear separation between domain and API concerns
- Reusable patterns across all API hooks
- Centralized type transformation logic

### Performance
- Minimal runtime overhead
- Optimized parameter filtering
- Proper date serialization

### Developer Experience
- Consistent API patterns
- Clear error messages
- Easy debugging with structured errors

## Future Considerations

### API Versioning
Type adapters can be extended to handle API versioning:

```typescript
export function createVersionedAdapter(data: unknown, version: 'v1' | 'v2') {
  // Version-specific transformation logic
}
```

### Schema Validation
Integration with runtime validation libraries:

```typescript
import { z } from 'zod'

export function createValidatedAdapter<T>(data: T, schema: z.ZodSchema<T>) {
  const validated = schema.parse(data)
  return createMutationAdapter(validated)
}
```

### GraphQL Integration
Adapters can be extended for GraphQL operations:

```typescript
export function createGraphQLVariables(params: Record<string, unknown>) {
  // GraphQL-specific parameter transformation
}
```

## Conclusion

The type adapter pattern provides a robust, type-safe bridge between domain types and API requirements. It eliminates the need for unsafe type casting while maintaining full TypeScript compliance and developer experience.

This architecture supports the long-term maintainability of the TenantFlow codebase by establishing clear patterns that can be consistently applied across all API interactions.