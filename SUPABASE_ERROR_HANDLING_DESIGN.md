# Centralized Supabase Error Handling - Design Document

## Overview

This document describes a **focused, incremental refactor** to centralize Supabase/PostgREST error handling and query utilities. The goal is to eliminate ~100+ instances of duplicated error checking, null handling, and logging patterns across our NestJS services while maintaining backward compatibility.

**This is NOT a backend rewrite.** Existing service signatures remain unchanged, and we can migrate one module at a time without breaking production.

---

## Problem Statement

### Current Pain Points

1. **Scattered error handling**: Every Supabase query has ad-hoc `if (error || !data)` checks
2. **Inconsistent logging**: Some services log `error.message`, others log full objects, context varies
3. **Duplicated PGRST116 logic**: Optimistic locking conflict detection appears in 10+ places
4. **Null check variations**: `if (error || !data)` vs `if (error) { ... } if (!data) { ... }`
5. **Missing structured context**: Logs often lack resource type, ID, operation name

### Evidence from Codebase Analysis

```typescript
// Pattern A: properties.service.ts:138-149
const { data, error } = await client.from('property').select('*').eq('id', id).single()
if (error || !data) {
  this.logger.error('Failed to fetch...', { error })
  return null
}

// Pattern B: properties.service.ts:514-530 (optimistic locking)
const { data, error } = await query.select().single()
if (error || !data) {
  if (error?.code === 'PGRST116' || !data) {
    throw new ConflictException('Resource was modified by another user...')
  }
  throw new BadRequestException('Failed to update...')
}

// Pattern C: leases.service.ts:336-350 (similar but slightly different)
const { data, error } = await client.from('lease').select('*').eq('id', id).single()
if (error || !data) {
  this.logger.error('Failed to fetch...', { error })
  return null
}
```

**This same pattern appears in 54+ service files.** Each variation increases maintenance burden and creates inconsistency.

---

## Solution: Centralized Error Handling Module

### Design Principles

1. **Gradual migration**: Services can adopt helpers one method at a time
2. **Backward compatible**: No breaking changes to existing service signatures
3. **Opt-in**: New code uses helpers, old code continues working
4. **Type-safe**: Leverage TypeScript for compile-time guarantees
5. **DRY**: Eliminate duplicated error checking, logging, and mapping logic

---

## Implementation

### 1. Centralized Error Mapping

**File**: `apps/backend/src/shared/supabase/supabase-error-handler.ts`

```typescript
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  Injectable,
  Logger
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Options for structured error logging and context
 */
export interface SupabaseErrorContext {
  /** Resource type (e.g., 'property', 'lease', 'tenant') */
  resource?: string
  /** Resource ID */
  id?: string | number
  /** Operation being performed (e.g., 'findOne', 'update', 'delete') */
  operation?: string
  /** User ID for audit trails */
  userId?: string
  /** Additional context for debugging */
  metadata?: Record<string, unknown>
}

/**
 * Centralized Supabase/PostgREST error handler
 *
 * Maps PostgREST error codes to appropriate NestJS HTTP exceptions
 * with structured logging and consistent error messages.
 *
 * @example
 * ```typescript
 * const { data, error } = await client.from('property').select('*').eq('id', id).single()
 * if (error) {
 *   this.errorHandler.mapAndThrow(error, {
 *     resource: 'property',
 *     id,
 *     operation: 'findOne'
 *   })
 * }
 * ```
 */
@Injectable()
export class SupabaseErrorHandler {
  private readonly logger = new Logger(SupabaseErrorHandler.name)
  private readonly isDevelopment: boolean

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development'
  }

  /**
   * Maps Supabase/PostgREST errors to NestJS HTTP exceptions
   *
   * @param error - Supabase error object
   * @param context - Structured context for logging
   * @throws {NotFoundException} for PGRST116 (not found)
   * @throws {ConflictException} for 23505 (unique violation)
   * @throws {BadRequestException} for 23503 (foreign key violation)
   * @throws {ForbiddenException} for 42501 (insufficient privilege)
   * @throws {UnauthorizedException} for PGRST301/302 (JWT errors)
   * @throws {InternalServerErrorException} for unknown errors
   */
  mapAndThrow(error: PostgrestError, context: SupabaseErrorContext = {}): never {
    // Log structured error before throwing
    this.logError(error, context)

    const { resource, id } = context
    const resourceLabel = resource ? `${resource}${id ? ` (${id})` : ''}` : 'Resource'

    // Map PostgREST error codes to HTTP exceptions
    switch (error.code) {
      case 'PGRST116':
        // Not found (404)
        throw new NotFoundException(`${resourceLabel} not found`)

      case '23505':
        // Unique constraint violation (409)
        throw new ConflictException(
          this.extractConstraintMessage(error) || `${resourceLabel} already exists`
        )

      case '23503':
        // Foreign key violation (400)
        throw new BadRequestException(
          `Invalid reference: ${this.extractConstraintMessage(error) || 'related resource not found'}`
        )

      case '42501':
        // Insufficient privilege (403)
        throw new ForbiddenException(`Insufficient permissions to access ${resourceLabel}`)

      case 'PGRST301':
      case 'PGRST302':
        // JWT errors (401)
        throw new UnauthorizedException('Invalid or expired authentication token')

      case '22P02':
        // Invalid input syntax (400)
        throw new BadRequestException(`Invalid input format for ${resourceLabel}`)

      case '23514':
        // Check constraint violation (400)
        throw new BadRequestException(
          this.extractConstraintMessage(error) || `${resourceLabel} failed validation`
        )

      default:
        // Unknown error (500)
        throw new InternalServerErrorException(
          this.isDevelopment
            ? `Database error: ${error.message} (code: ${error.code})`
            : 'An unexpected error occurred'
        )
    }
  }

  /**
   * Checks if error is optimistic locking conflict (PGRST116 with version mismatch)
   *
   * @param error - Supabase error object
   * @param expectedVersion - Expected version number
   * @returns true if this is an optimistic locking conflict
   */
  isOptimisticLockingConflict(error: PostgrestError | null): boolean {
    return error?.code === 'PGRST116'
  }

  /**
   * Throws ConflictException for optimistic locking failures
   *
   * @param context - Error context
   */
  throwOptimisticLockingError(context: SupabaseErrorContext = {}): never {
    const { resource = 'Resource', id } = context
    const resourceLabel = id ? `${resource} (${id})` : resource

    this.logger.warn('Optimistic locking conflict detected', {
      resource: context.resource,
      id: context.id,
      operation: context.operation,
      expectedVersion: context.metadata?.expectedVersion
    })

    throw new ConflictException(
      `${resourceLabel} was modified by another user. Please refresh and try again.`
    )
  }

  /**
   * Logs structured error with full context
   */
  private logError(error: PostgrestError, context: SupabaseErrorContext): void {
    const logPayload = {
      level: 'error',
      supabaseErrorCode: error.code,
      supabaseErrorMessage: error.message,
      supabaseErrorDetails: error.details,
      supabaseErrorHint: error.hint,
      resource: context.resource,
      id: context.id,
      operation: context.operation,
      userId: context.userId,
      ...context.metadata
    }

    this.logger.error(
      `Supabase error: ${context.operation || 'unknown'} ${context.resource || 'resource'}`,
      logPayload
    )
  }

  /**
   * Extracts human-readable constraint message from error details
   */
  private extractConstraintMessage(error: PostgrestError): string | null {
    if (!error.details) return null

    // Extract constraint name from details like:
    // "Key (email)=(test@example.com) already exists."
    const keyMatch = error.details.match(/Key \((.+?)\)=\((.+?)\)/)
    if (keyMatch) {
      const [, field, value] = keyMatch
      return `${field} '${value}' is already in use`
    }

    return error.details
  }
}
```

---

### 2. Typed Query Helpers

**File**: `apps/backend/src/shared/supabase/supabase-query-helpers.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common'
import type { PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js'
import { SupabaseErrorHandler, type SupabaseErrorContext } from './supabase-error-handler'

/**
 * Typed query helpers for common Supabase operations
 *
 * Eliminates boilerplate error checking, null handling, and logging
 * across service methods.
 */
@Injectable()
export class SupabaseQueryHelpers {
  constructor(private readonly errorHandler: SupabaseErrorHandler) {}

  /**
   * Executes a .single() query with automatic error handling
   *
   * @template T - Result type
   * @param queryPromise - Supabase query promise
   * @param context - Error context for logging
   * @returns Resolved data (never null)
   * @throws {NotFoundException} if data is null or error.code is PGRST116
   * @throws {HttpException} for other Supabase errors
   *
   * @example
   * ```typescript
   * const property = await this.queryHelpers.querySingle(
   *   client.from('property').select('*').eq('id', propertyId).single(),
   *   { resource: 'property', id: propertyId, operation: 'findOne', userId }
   * )
   * ```
   */
  async querySingle<T>(
    queryPromise: PromiseLike<PostgrestSingleResponse<T>>,
    context: SupabaseErrorContext = {}
  ): Promise<T> {
    const { data, error } = await queryPromise

    // Handle Supabase errors
    if (error) {
      this.errorHandler.mapAndThrow(error, context)
    }

    // Handle null data (resource not found or RLS denied access)
    if (!data) {
      const { resource = 'Resource', id } = context
      const resourceLabel = id ? `${resource} (${id})` : resource
      throw new NotFoundException(`${resourceLabel} not found`)
    }

    return data
  }

  /**
   * Executes a .single() query with optimistic locking
   *
   * @template T - Result type
   * @param queryPromise - Supabase query promise (must include .eq('version', expectedVersion))
   * @param context - Error context (must include metadata.expectedVersion)
   * @returns Resolved data
   * @throws {ConflictException} if version mismatch (PGRST116)
   * @throws {NotFoundException} if resource not found
   * @throws {HttpException} for other errors
   *
   * @example
   * ```typescript
   * const updatedProperty = await this.queryHelpers.querySingleWithVersion(
   *   client.from('property')
   *     .update(updateData)
   *     .eq('id', propertyId)
   *     .eq('version', expectedVersion)
   *     .select()
   *     .single(),
   *   {
   *     resource: 'property',
   *     id: propertyId,
   *     operation: 'update',
   *     metadata: { expectedVersion }
   *   }
   * )
   * ```
   */
  async querySingleWithVersion<T>(
    queryPromise: PromiseLike<PostgrestSingleResponse<T>>,
    context: SupabaseErrorContext & { metadata: { expectedVersion: number } }
  ): Promise<T> {
    const { data, error } = await queryPromise

    // Detect optimistic locking conflict (PGRST116 = 0 rows affected)
    if (error || !data) {
      if (this.errorHandler.isOptimisticLockingConflict(error)) {
        this.errorHandler.throwOptimisticLockingError(context)
      }
      if (error) {
        this.errorHandler.mapAndThrow(error, context)
      }
      // Data is null but no error = not found
      const { resource = 'Resource', id } = context
      throw new NotFoundException(`${resource}${id ? ` (${id})` : ''} not found`)
    }

    return data
  }

  /**
   * Executes a list query with automatic error handling
   *
   * @template T - Result type
   * @param queryPromise - Supabase query promise
   * @param context - Error context for logging
   * @returns Resolved data array (never null, defaults to empty array)
   * @throws {HttpException} for Supabase errors
   *
   * @example
   * ```typescript
   * const properties = await this.queryHelpers.queryList(
   *   client.from('property').select('*').eq('ownerId', userId),
   *   { resource: 'property', operation: 'findAll', userId }
   * )
   * ```
   */
  async queryList<T>(
    queryPromise: PromiseLike<PostgrestResponse<T>>,
    context: SupabaseErrorContext = {}
  ): Promise<T[]> {
    const { data, error } = await queryPromise

    if (error) {
      this.errorHandler.mapAndThrow(error, context)
    }

    return data ?? []
  }

  /**
   * Executes a count query with automatic error handling
   *
   * @param queryPromise - Supabase query promise with .count()
   * @param context - Error context for logging
   * @returns Total count (defaults to 0 on error)
   *
   * @example
   * ```typescript
   * const totalProperties = await this.queryHelpers.queryCount(
   *   client.from('property').select('*', { count: 'exact', head: true }).eq('ownerId', userId),
   *   { resource: 'property', operation: 'count', userId }
   * )
   * ```
   */
  async queryCount(
    queryPromise: PromiseLike<PostgrestResponse<unknown>>,
    context: SupabaseErrorContext = {}
  ): Promise<number> {
    const { count, error } = await queryPromise

    if (error) {
      this.errorHandler.mapAndThrow(error, context)
    }

    return count ?? 0
  }
}
```

---

### 3. Module Registration

**File**: `apps/backend/src/shared/supabase/supabase-helpers.module.ts`

```typescript
import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SupabaseErrorHandler } from './supabase-error-handler'
import { SupabaseQueryHelpers } from './supabase-query-helpers'

/**
 * Global module for Supabase error handling and query helpers
 *
 * Makes error handler and query helpers available to all services
 * without explicit imports in feature modules.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [SupabaseErrorHandler, SupabaseQueryHelpers],
  exports: [SupabaseErrorHandler, SupabaseQueryHelpers]
})
export class SupabaseHelpersModule {}
```

**Update**: `apps/backend/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common'
import { SupabaseHelpersModule } from './shared/supabase/supabase-helpers.module'
// ... other imports

@Module({
  imports: [
    SupabaseHelpersModule, // Add before feature modules
    // ... other modules
  ]
})
export class AppModule {}
```

---

## Migration Strategy

### Phase 1: Infrastructure Setup (1 day)

1. Create `supabase-error-handler.ts`, `supabase-query-helpers.ts`, and module
2. Register global module in `app.module.ts`
3. Add unit tests for error mapping logic
4. Deploy to staging without migrating any services (no behavior changes)

### Phase 2: Single Module Migration (1 day)

**Pilot module**: `properties.service.ts` (70 lines)

**Before** (properties.service.ts:130-152):
```typescript
async findOne(req: Request, propertyId: string): Promise<Property | null> {
  const token = getTokenFromRequest(req)
  if (!token) {
    this.logger.error('No authentication token found in request')
    return null
  }
  const client = this.supabase.getUserClient(token)

  const { data, error } = await client
    .from('property')
    .select('*')
    .eq('id', propertyId)
    .single()

  if (error || !data) {
    this.logger.warn('Property not found or access denied', { propertyId })
    return null
  }

  return data as Property
}
```

**After** (with helper):
```typescript
async findOne(req: Request, propertyId: string): Promise<Property> {
  const token = getTokenFromRequest(req)
  if (!token) {
    throw new UnauthorizedException('Authentication required')
  }
  const client = this.supabase.getUserClient(token)
  const userId = (req as AuthenticatedRequest).user.id

  return this.queryHelpers.querySingle<Property>(
    client.from('property').select('*').eq('id', propertyId).single(),
    {
      resource: 'property',
      id: propertyId,
      operation: 'findOne',
      userId
    }
  )
}
```

**Benefits**:
- **22 lines → 13 lines** (41% reduction)
- Consistent structured logging
- Proper exception types (NotFoundException vs null)
- No manual null checks

**Before** (properties.service.ts:510-537):
```typescript
const { data, error } = await query.select().single()

if (error || !data) {
  if (error?.code === 'PGRST116' || !data) {
    this.logger.warn('Optimistic locking conflict detected', {
      propertyId,
      expectedVersion
    })
    throw new ConflictException(
      'Property was modified by another user. Please refresh and try again.'
    )
  }

  this.logger.error('Failed to update property', { error, propertyId })
  throw new BadRequestException('Failed to update property')
}

return data as Property
```

**After** (with helper):
```typescript
return this.queryHelpers.querySingleWithVersion<Property>(
  query.select().single(),
  {
    resource: 'property',
    id: propertyId,
    operation: 'update',
    userId,
    metadata: { expectedVersion }
  }
)
```

**Benefits**:
- **18 lines → 10 lines** (44% reduction)
- Automatic PGRST116 detection and logging
- Consistent conflict messages across all services

### Phase 3: Gradual Rollout (2-3 weeks)

**Migration order** (by dependency + impact):

1. **Core entities** (Properties, Units, Leases) - 3 services, ~210 lines
2. **Tenant-related** (Tenants, RentPayments) - 2 services, ~140 lines
3. **Maintenance** (Maintenance, MaintenancePhotos) - 2 services, ~120 lines
4. **Billing/Stripe** (PaymentMethods, StripeSync) - 2 services, ~80 lines
5. **Remaining services** - 45 services, ~500 lines

**Per-service checklist**:
- [ ] Inject `SupabaseQueryHelpers` in constructor
- [ ] Replace `findOne()` methods with `querySingle()`
- [ ] Replace `update()` optimistic locking with `querySingleWithVersion()`
- [ ] Replace `findAll()` methods with `queryList()`
- [ ] Update tests to expect NotFoundException instead of null
- [ ] Verify error responses in Postman/integration tests

**Key principle**: **One service at a time**. Each PR is small, reviewable, and independently deployable.

---

## Adjacent Cleanup Tasks (Parallel Tracks)

These improvements can run in parallel with error handler migration:

### CQ-006: Enforce QUERY_CACHE_TIMES Constants

**Status**: Constants exist (`query-config.ts`), but not consistently used

**Current state**:
```typescript
// Some hooks use constants:
useQuery({ queryKey, queryFn, ...QUERY_CACHE_TIMES.DETAIL })

// Others have inline values:
useQuery({ queryKey, queryFn, staleTime: 5 * 60 * 1000 }) // ❌ Magic number
```

**Target state**:
```typescript
// All hooks import from constants:
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

useQuery({ queryKey, queryFn, ...QUERY_CACHE_TIMES.DETAIL })
```

**Migration plan**:
1. Audit 40+ API hooks in `apps/frontend/src/hooks/api/`
2. Replace inline cache times with constants
3. Add ESLint rule to prevent magic numbers in `useQuery`

**Estimated effort**: 2-3 hours (simple find-and-replace)

---

### CQ-005: Audit getAdminClient() Usage

**Status**: 138 usages identified, not all need admin bypass

**Decision tree**:
```
Does operation need cross-user access?
├─ YES (e.g., tenant payments visible to owner) → Keep getAdminClient()
└─ NO (e.g., user viewing own properties) → Use getUserClient()
```

**Examples to migrate**:
```typescript
// ❌ Unnecessary admin bypass
const client = this.supabase.getAdminClient()
const { data } = await client.from('property').select('*').eq('ownerId', userId)

// ✅ RLS automatically filters by user
const client = this.supabase.getUserClient(token)
const { data } = await client.from('property').select('*') // RLS handles filtering
```

**Migration plan**:
1. Grep for `getAdminClient()` (138 occurrences)
2. Review each usage for legitimate bypass need
3. Replace with `getUserClient()` where RLS is sufficient
4. Document remaining admin usages with comments

**Estimated effort**: 1 week (requires careful review)

---

### CQ-007: Shared Query Invalidation Utilities

**Status**: Duplicated invalidation logic in 50+ mutation hooks

**Current pattern**:
```typescript
// Repeated in use-property.ts, use-lease.ts, use-unit.ts, etc.
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: propertyKeys.all })
  queryClient.invalidateQueries({ queryKey: propertyKeys.detail(data.id) })
  queryClient.invalidateQueries({ queryKey: propertyKeys.stats() })
}
```

**Proposed utility** (`apps/frontend/src/lib/query-invalidation.ts`):
```typescript
import type { QueryClient } from '@tanstack/react-query'

export function invalidateEntityQueries<T extends { id: string }>(
  queryClient: QueryClient,
  entity: string,
  data: T,
  additionalKeys?: string[][]
): void {
  queryClient.invalidateQueries({ queryKey: [`${entity}-list`] })
  queryClient.invalidateQueries({ queryKey: [`${entity}-detail`, data.id] })
  queryClient.invalidateQueries({ queryKey: [`${entity}-stats`] })

  additionalKeys?.forEach(key => {
    queryClient.invalidateQueries({ queryKey: key })
  })
}
```

**Usage**:
```typescript
onSuccess: (data) => {
  invalidateEntityQueries(queryClient, 'property', data)
}
```

**Migration plan**:
1. Create utility with standard patterns
2. Migrate high-traffic hooks first (properties, leases, tenants)
3. Update remaining hooks gradually

**Estimated effort**: 3-4 hours

---

## Client-Side Benefits

The centralized backend error handling **immediately improves** the frontend experience:

### Current Frontend Error Handling

**File**: `apps/frontend/src/lib/mutation-error-handler.ts`

```typescript
// Already checks status codes from backend
if (status === 409) {
  toast.error('Conflict', {
    description: displayMessage || 'This item already exists or has been modified'
  })
}

if (status === 404) {
  toast.error('Not Found', {
    description: displayMessage || 'The requested resource was not found'
  })
}
```

**Current frontend already has**:
- Centralized `handleMutationError()` for all mutations
- `isConflictError()` helper for 409 detection
- `handleConflictError()` for cache invalidation on optimistic locking failures

### What Backend Changes Enable

**Before backend refactor** (inconsistent status codes):
```typescript
// Backend returns 400 for "not found" ❌
// Backend returns 400 for "conflict" ❌
// Frontend receives generic "Bad Request" errors
```

**After backend refactor** (consistent status codes):
```typescript
// Backend returns 404 for "not found" ✅
// Backend returns 409 for "unique violation" ✅
// Backend returns 409 for "optimistic locking conflict" ✅
// Frontend's existing error handlers now work correctly
```

### Example: Optimistic Locking Flow

**Backend** (with new helpers):
```typescript
// properties.service.ts
return this.queryHelpers.querySingleWithVersion<Property>(
  query.eq('version', expectedVersion).select().single(),
  { resource: 'property', id: propertyId, metadata: { expectedVersion } }
)
// ✅ Automatically throws ConflictException (409) on version mismatch
```

**Frontend** (no changes needed):
```typescript
// use-property.ts (already implemented)
onError: (err, { id }, context) => {
  if (isConflictError(err)) {
    // ✅ Detects 409, shows conflict toast, invalidates cache
    handleConflictError('property', id, queryClient, [propertyKeys.detail(id)])
  } else {
    handleMutationError(err, 'Update property')
  }
}
```

**Result**: Optimistic locking works end-to-end with **zero frontend changes**.

---

## Testing Strategy

### Unit Tests

**File**: `apps/backend/src/shared/supabase/__tests__/supabase-error-handler.spec.ts`

```typescript
describe('SupabaseErrorHandler', () => {
  let errorHandler: SupabaseErrorHandler
  let configService: ConfigService

  beforeEach(() => {
    configService = { get: jest.fn().mockReturnValue('development') } as any
    errorHandler = new SupabaseErrorHandler(configService)
  })

  describe('mapAndThrow', () => {
    it('should throw NotFoundException for PGRST116', () => {
      const error = { code: 'PGRST116', message: 'Not found' }

      expect(() => {
        errorHandler.mapAndThrow(error, { resource: 'property', id: '123' })
      }).toThrow(NotFoundException)

      expect(() => {
        errorHandler.mapAndThrow(error, { resource: 'property', id: '123' })
      }).toThrow('property (123) not found')
    })

    it('should throw ConflictException for 23505', () => {
      const error = {
        code: '23505',
        message: 'Unique violation',
        details: 'Key (email)=(test@example.com) already exists.'
      }

      expect(() => {
        errorHandler.mapAndThrow(error, { resource: 'user' })
      }).toThrow(ConflictException)

      expect(() => {
        errorHandler.mapAndThrow(error, { resource: 'user' })
      }).toThrow("email 'test@example.com' is already in use")
    })

    // ... tests for all error codes
  })

  describe('isOptimisticLockingConflict', () => {
    it('should return true for PGRST116', () => {
      const error = { code: 'PGRST116', message: 'Not found' }
      expect(errorHandler.isOptimisticLockingConflict(error)).toBe(true)
    })

    it('should return false for other error codes', () => {
      const error = { code: '23505', message: 'Unique violation' }
      expect(errorHandler.isOptimisticLockingConflict(error)).toBe(false)
    })
  })
})
```

### Integration Tests

**File**: `apps/backend/src/modules/properties/__tests__/properties.service.integration.spec.ts`

```typescript
describe('PropertiesService (with query helpers)', () => {
  it('should throw NotFoundException when property not found', async () => {
    const propertyId = 'non-existent-id'

    await expect(
      service.findOne(mockRequest, propertyId)
    ).rejects.toThrow(NotFoundException)

    await expect(
      service.findOne(mockRequest, propertyId)
    ).rejects.toThrow('property (non-existent-id) not found')
  })

  it('should throw ConflictException on version mismatch', async () => {
    const propertyId = 'existing-property-id'
    const outdatedVersion = 5

    await expect(
      service.update(mockRequest, propertyId, { name: 'Updated' }, outdatedVersion)
    ).rejects.toThrow(ConflictException)

    await expect(
      service.update(mockRequest, propertyId, { name: 'Updated' }, outdatedVersion)
    ).rejects.toThrow('was modified by another user')
  })
})
```

---

## Rollback Plan

If issues arise during migration:

1. **Per-service rollback**: Revert individual service to old pattern (helpers are additive, not breaking)
2. **Module removal**: Remove `SupabaseHelpersModule` from `app.module.ts` (no runtime dependency if unused)
3. **Gradual adoption**: Services continue working with old patterns while new services use helpers

**Key insight**: Because helpers are **opt-in** and don't modify existing behavior, there's no "big bang" risk. Each service migration is an independent, reversible change.

---

## Success Metrics

### Code Quality
- [ ] **Reduce duplicated error handling**: From 100+ instances to ~10 (90% reduction)
- [ ] **Consistent logging**: 100% of Supabase queries emit structured logs
- [ ] **Type safety**: All `.single()` queries return non-null types

### Developer Experience
- [ ] **Faster service development**: New CRUD services require 50% less boilerplate
- [ ] **Easier debugging**: Structured logs with full context (resource, ID, user, operation)
- [ ] **Fewer bugs**: Centralized error mapping prevents status code inconsistencies

### Production Impact
- [ ] **Better error monitoring**: Structured logs enable Datadog/LogRocket filtering
- [ ] **Consistent API responses**: Frontend error handlers work reliably across all endpoints
- [ ] **Zero breaking changes**: Existing API contracts remain unchanged

---

## Next Steps

1. **Review this design doc** with team (30 min)
2. **Create implementation branch**: `feature/centralized-supabase-errors`
3. **Phase 1**: Infrastructure setup + tests (1 day)
4. **Phase 2**: Migrate `properties.service.ts` as pilot (1 day)
5. **Phase 3**: Roll out to remaining services (2-3 weeks, 2-3 services/day)

---

## References

- **Existing global filter**: `apps/backend/src/shared/filters/database-exception.filter.ts`
- **Frontend error handler**: `apps/frontend/src/lib/mutation-error-handler.ts`
- **Query cache constants**: `apps/frontend/src/lib/constants/query-config.ts`
- **PostgREST error codes**: https://postgrest.org/en/stable/errors.html
- **NestJS exception filters**: https://docs.nestjs.com/exception-filters

---

## Appendix: Error Code Reference

| Code | Type | HTTP Status | When It Happens |
|------|------|-------------|-----------------|
| `PGRST116` | Not Found | 404 | Query returns 0 rows (including version mismatch) |
| `23505` | Unique Violation | 409 | Duplicate key (e.g., email already exists) |
| `23503` | FK Violation | 400 | Referenced row doesn't exist |
| `42501` | Insufficient Privilege | 403 | RLS policy blocks access |
| `PGRST301` | JWT Expired | 401 | Auth token expired |
| `PGRST302` | JWT Invalid | 401 | Malformed token |
| `22P02` | Invalid Input | 400 | Type mismatch (e.g., string in UUID field) |
| `23514` | Check Constraint | 400 | Value violates CHECK constraint |

---

**Document Version**: 1.0
**Last Updated**: 2025-11-11
**Author**: Senior TypeScript/NestJS Engineer
**Status**: Ready for Implementation
