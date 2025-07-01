# Safe Query Patterns for TenantFlow

## Overview
This document outlines safe data fetching patterns to prevent infinite recursion in RLS policies and ensure long-term database stability.

## The Problem
Complex Supabase queries with nested joins can trigger infinite recursion when:
1. Table A policy references Table B 
2. Table B policy references Table A
3. A complex query touches both tables simultaneously

## The Solution: Step-by-Step Fetching

### ❌ Dangerous Pattern (Complex Joins)
```typescript
// DON'T DO THIS - Can cause infinite recursion
const { data } = await supabase
  .from('Tenant')
  .select(`
    *,
    leases:Lease (
      *,
      unit:Unit (
        *,
        property:Property (*)
      ),
      payments:Payment (*)
    )
  `)
```

### ✅ Safe Pattern (Step-by-Step)
```typescript
// DO THIS - Safe step-by-step fetching
// Step 1: Get basic tenant data
const { data: tenants } = await supabase
  .from('Tenant')
  .select('*')
  .eq('userId', user.id)

// Step 2: Get lease data separately
const tenantIds = tenants.map(t => t.id)
const { data: leases } = await supabase
  .from('Lease')
  .select('*')
  .in('tenantId', tenantIds)

// Step 3: Get unit data separately
const unitIds = leases.map(l => l.unitId)
const { data: units } = await supabase
  .from('Unit')
  .select('*')
  .in('id', unitIds)

// Step 4: Get property data separately
const propertyIds = units.map(u => u.propertyId)
const { data: properties } = await supabase
  .from('Property')
  .select('*')
  .in('id', propertyIds)
  .eq('ownerId', user.id) // Security check

// Step 5: Combine client-side
const tenantsWithData = tenants.map(tenant => ({
  ...tenant,
  leases: leases.filter(l => l.tenantId === tenant.id).map(lease => ({
    ...lease,
    unit: units.find(u => u.id === lease.unitId),
    // ... etc
  }))
}))
```

## Safe Patterns by Entity

### Tenant Access
- **Own Profile**: Use `userId = auth.uid()` 
- **Invited Tenants**: Use `invitedBy = auth.uid()`
- **Property Owner Access**: Step-by-step via Property -> Unit -> Lease -> Tenant

### Lease Access  
- **Property Owners**: Via Unit -> Property ownership chain (safe)
- **Tenants**: Via Tenant -> Lease (safe)
- **Never**: Direct Tenant -> Lease joins in complex queries

### Payment Access
- **Property Owners**: Step-by-step via Lease -> Unit -> Property
- **Tenants**: Step-by-step via Lease -> Tenant

## RLS Policy Guidelines

### ✅ Safe RLS Policies
- Direct ownership checks (`ownerId = auth.uid()`)
- Simple foreign key checks  
- One-way references (A -> B, but not B -> A)

### ❌ Dangerous RLS Policies
- Circular references (A -> B -> A)
- Complex multi-table joins in policies
- Deep nested subqueries

## Implementation Checklist

### For New Hooks
- [ ] Use step-by-step fetching pattern
- [ ] Combine data client-side
- [ ] Handle missing data gracefully
- [ ] Add proper error handling

### For Existing Hooks
- [ ] Identify complex joins
- [ ] Convert to step-by-step pattern
- [ ] Test for infinite recursion
- [ ] Verify data integrity

### For RLS Policies
- [ ] Audit for circular dependencies
- [ ] Simplify complex policies
- [ ] Test with realistic data loads
- [ ] Monitor for recursion errors

## Benefits of Safe Patterns

1. **No Infinite Recursion**: Step-by-step queries can't trigger circular policies
2. **Better Performance**: Smaller, focused queries are often faster
3. **Easier Debugging**: Clear data flow and error isolation
4. **Better Security**: Explicit access control at each step
5. **More Maintainable**: Easier to understand and modify

## Files Using Safe Patterns

- ✅ `src/hooks/useTenants.ts` - Converted to safe pattern
- ✅ `src/hooks/useLeases.ts` - Converted to safe pattern  
- ✅ `src/hooks/useRealtimeActivityFeed.ts` - Converted to safe pattern
- ✅ `src/hooks/useTenantDetailData.ts` - Converted to safe pattern
- ✅ `src/hooks/useActivityFeed.ts` - Converted to safe pattern
- ⚠️ `src/hooks/usePayments.ts` - Needs conversion
- ⚠️ Other hooks - Need audit

## Monitoring & Maintenance

- Monitor logs for "infinite recursion" errors
- Regular audit of new hooks for dangerous patterns
- Test complex queries in development first
- Use safe patterns as default for all new development