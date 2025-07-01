# Zod Enhancement Plan for TenantFlow

## Overview
While Zod won't fix the infinite recursion issues (those were RLS policy problems), it can significantly enhance data safety and prevent other types of bugs.

## High Impact Implementations

### 1. Safe Hook Data Validation
Add Zod schemas to validate the client-side data combination in our safe hooks:

```typescript
// src/schemas/entities.ts
export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  userId: z.string().nullable(),
  invitationStatus: z.enum(['PENDING', 'ACCEPTED', 'CANCELLED']),
  createdAt: z.string().datetime().transform(str => new Date(str))
})

export const LeaseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  unitId: z.string(),
  rentAmount: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'EXPIRED', 'TERMINATED'])
})

export const TenantWithLeasesSchema = TenantSchema.extend({
  leases: z.array(LeaseSchema.extend({
    unit: UnitSchema.extend({
      property: PropertySchema.nullable()
    }).nullable()
  }))
})
```

### 2. Real-time Data Validation
```typescript
// src/hooks/useRealtimeActivityFeed.ts
const RealtimeChangeSchema = z.object({
  table: z.string(),
  eventType: z.enum(['INSERT', 'UPDATE', 'DELETE']),
  new: z.record(z.unknown()).optional(),
  old: z.record(z.unknown()).optional()
})

const handleRealtimeChange = (payload: unknown) => {
  const result = RealtimeChangeSchema.safeParse(payload)
  if (!result.success) {
    logger.warn('Invalid realtime payload', result.error)
    return
  }
  // Process validated data
}
```

### 3. API Response Validation
```typescript
// src/lib/api-validation.ts
export const validateSupabaseResponse = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  fallback: T
): T => {
  const result = schema.safeParse(data)
  if (!result.success) {
    logger.warn('API response validation failed', result.error)
    return fallback
  }
  return result.data
}

// Usage in hooks:
const validatedTenants = validateSupabaseResponse(
  TenantWithLeasesSchema.array(),
  combinedData,
  []
)
```

## Medium Impact Implementations

### 4. Environment Variable Validation
```typescript
// src/lib/env.ts
const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
})

export const env = EnvSchema.parse(import.meta.env)
```

### 5. Form Data Transformation
```typescript
// Enhanced form validation with better error messages
const TenantFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone format').optional()
})
```

## Implementation Priority

### Phase 1: Critical Data Safety (Week 1)
- [ ] Add Zod validation to all safe hooks
- [ ] Validate real-time subscription data
- [ ] Add API response validation helper

### Phase 2: Enhanced Robustness (Week 2)
- [ ] Environment variable validation
- [ ] Enhanced form validation with better errors
- [ ] Database coercion schemas

### Phase 3: Developer Experience (Week 3)
- [ ] Schema documentation generation
- [ ] Type inference improvements
- [ ] Error reporting dashboard

## Benefits

### Immediate Benefits
- **Prevent UI Crashes**: Invalid data caught before reaching components
- **Better Error Messages**: Clear validation errors instead of cryptic runtime errors
- **Type Safety**: Runtime validation matches TypeScript types

### Long-term Benefits
- **Easier Debugging**: Know exactly what data is invalid and why
- **Schema Evolution**: Handle database changes gracefully
- **API Reliability**: Catch external API changes early

### Performance Considerations
- **Validation Overhead**: Minimal for small objects, consider caching for large datasets
- **Development vs Production**: More detailed validation in development
- **Error Boundaries**: Graceful fallbacks for validation failures

## Files to Modify

### New Files
- `src/schemas/entities.ts` - Core entity schemas
- `src/schemas/relationships.ts` - Complex relationship schemas
- `src/lib/api-validation.ts` - Validation helpers

### Modified Files
- `src/hooks/useTenants.ts` - Add tenant data validation
- `src/hooks/useLeases.ts` - Add lease data validation
- `src/hooks/useRealtimeActivityFeed.ts` - Add real-time validation
- `src/hooks/useTenantDetailData.ts` - Add detail data validation

## Success Metrics
- Zero UI crashes from malformed data
- Faster debugging with clear validation errors
- Better user experience with graceful error handling
- Easier onboarding for new developers with clear data contracts