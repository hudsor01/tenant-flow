# Request Context Migration Guide

## Overview

This guide shows how to migrate from manual ID passing patterns to @fastify/request-context for cleaner, more maintainable service methods in the TenantFlow backend.

## Before vs After Summary

### Before (Manual Threading)
```typescript
// Verbose service methods
async findProperties(userId: string, organizationId: string, authToken?: string) {
  // Manual parameter threading
  // Risk of parameter confusion
  // Repeated validation logic
}

// Controller passes everything manually
@Get()
async getProperties(@CurrentUser() user: ValidatedUser) {
  return this.propertiesService.findProperties(user.id, user.organizationId, token)
}
```

### After (Request Context)
```typescript
// Clean service methods
async findProperties() {
  const { userId, organizationId } = this.requestContext.requireOrganizationContext()
  // Automatic context access
  // Built-in logging and monitoring
}

// Simplified controller
@Get()
async getProperties() {
  return this.propertiesService.findProperties() // No manual ID passing!
}
```

## Migration Steps

### Step 1: Update Service Constructor

**Before:**
```typescript
@Injectable()
export class PropertiesService {
  constructor(private supabaseService: SupabaseService) {}
}
```

**After:**
```typescript
@Injectable()
export class PropertiesService {
  constructor(
    private supabaseService: SupabaseService,
    private requestContext: RequestContextService
  ) {}
}
```

### Step 2: Replace Manual ID Parameters

**Before:**
```typescript
async findAll(ownerId: string, authToken?: string): Promise<Property[]> {
  const supabase = authToken 
    ? this.supabaseService.getUserClient(authToken)
    : this.supabaseService.getAdminClient()
    
  const { data, error } = await supabase
    .from('Property')
    .select('*')
    .eq('ownerId', ownerId)
    
  if (error) {
    this.logger.error('Failed to fetch properties:', error)
    throw new BadRequestException(error.message)
  }
  
  return data
}
```

**After:**
```typescript
async findAll(): Promise<Property[]> {
  const userId = this.requestContext.getUserId()
  
  if (!userId) {
    throw new UnauthorizedException('User context required')
  }
  
  // Context automatically provides user-scoped client
  const supabase = this.supabaseService.getUserClient()
  
  const { data, error } = await supabase
    .from('Property')
    .select('*')
    .eq('ownerId', userId)
    
  if (error) {
    // Enhanced logging with correlation ID
    this.requestContext.error('Failed to fetch properties', error)
    throw new BadRequestException(error.message)
  }
  
  return data
}
```

### Step 3: Update Multi-Tenant Operations

**Before:**
```typescript
async findOne(id: string, ownerId: string, authToken?: string): Promise<Property> {
  // Manual tenant validation
  if (!ownerId) {
    throw new BadRequestException('Owner ID required')
  }
  
  const supabase = this.getClient(authToken)
  const { data, error } = await supabase
    .from('Property')
    .select('*')
    .eq('id', id)
    .eq('ownerId', ownerId) // Manual tenant scoping
    .single()
    
  if (error || !data) {
    throw new NotFoundException('Property not found')
  }
  
  return data
}
```

**After:**
```typescript
async findOne(id: string): Promise<Property> {
  // Automatic tenant validation
  const { userId, organizationId } = this.requestContext.requireOrganizationContext()
  
  const supabase = this.supabaseService.getUserClient()
  const { data, error } = await supabase
    .from('Property')
    .select('*')
    .eq('id', id)
    .eq('ownerId', userId) // Context-derived tenant scoping
    .single()
    
  if (error || !data) {
    this.requestContext.error('Property not found', error, { propertyId: id })
    throw new NotFoundException('Property not found')
  }
  
  return data
}
```

### Step 4: Update Controllers

**Before:**
```typescript
@Controller('properties')
export class PropertiesController {
  @Get()
  async findAll(@CurrentUser() user: ValidatedUser) {
    return this.propertiesService.findAll(user.id, token)
  }
  
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: ValidatedUser
  ) {
    return this.propertiesService.findOne(id, user.id, token)
  }
}
```

**After:**
```typescript
@Controller('properties')
export class PropertiesController {
  @Get()
  async findAll() {
    // No manual ID passing required!
    return this.propertiesService.findAll()
  }
  
  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Simplified - context handles user/tenant automatically
    return this.propertiesService.findOne(id)
  }
}
```

## Service Patterns

### Pattern 1: Simple Context Access
```typescript
async getMyData() {
  const userId = this.requestContext.getUserId()
  // Use userId...
}
```

### Pattern 2: Required Organization Context
```typescript
async updateTenantResource(id: string, data: any) {
  const { userId, organizationId } = this.requestContext.requireOrganizationContext()
  // Both user and org guaranteed to exist
}
```

### Pattern 3: Optional Context (Migration-Friendly)
```typescript
async flexibleMethod(userIdOverride?: string) {
  const userId = userIdOverride || this.requestContext.getUserId()
  
  if (!userId) {
    throw new Error('User ID required')
  }
  // Handle both old and new patterns
}
```

### Pattern 4: Enhanced Logging
```typescript
async monitoredOperation() {
  this.requestContext.log('Starting operation', { customData: 'value' })
  
  try {
    // Do work...
    this.requestContext.log('Operation completed')
  } catch (error) {
    this.requestContext.error('Operation failed', error)
    throw error
  }
}
```

## Performance Benefits

### Before (Manual Pattern)
- ❌ Verbose function signatures
- ❌ Repeated parameter validation
- ❌ Manual correlation ID handling
- ❌ Inconsistent logging format
- ❌ Easy to miss tenant validation

### After (Context Pattern)
- ✅ Clean, simple interfaces
- ✅ Automatic context validation
- ✅ Built-in correlation tracking
- ✅ Consistent structured logging
- ✅ Enforced multi-tenant security

## Implementation Checklist

### Core Setup (Already Complete)
- [x] RequestContextService implemented
- [x] Request context hooks service created
- [x] @fastify/request-context configured in main.ts
- [x] UnifiedAuthGuard populates context

### Service Migration (Gradual)
- [ ] Update PropertiesService
- [ ] Update TenantsService  
- [ ] Update LeasesService
- [ ] Update MaintenanceService
- [ ] Update other services...

### Controller Migration (Gradual)
- [ ] Update PropertiesController
- [ ] Update TenantsController
- [ ] Update LeasesController
- [ ] Update other controllers...

### Testing
- [ ] Update service unit tests
- [ ] Update controller integration tests
- [ ] Update E2E tests

## Best Practices

### 1. Gradual Migration
```typescript
// Support both patterns during transition
async findProperties(userIdOverride?: string) {
  const userId = userIdOverride || this.requestContext.getUserId()
  // Allows gradual migration without breaking changes
}
```

### 2. Context Validation
```typescript
// Always validate context when required
async secureOperation() {
  const { userId, organizationId } = this.requestContext.requireOrganizationContext()
  // Throws clear error if context missing
}
```

### 3. Background Job Handling
```typescript
// Check context availability for jobs
async backgroundTask() {
  if (this.requestContext.hasContext()) {
    this.logger.warn('Background task has request context - check call path')
  }
  // Use regular logging for background operations
}
```

### 4. Error Context
```typescript
// Include context in error messages
try {
  // operation
} catch (error) {
  this.requestContext.error('Operation failed', error, {
    additionalContext: 'specific_operation_details'
  })
  throw error
}
```

## Troubleshooting

### Common Issues

**1. "No request context available"**
```typescript
// Check if you're in a request context
if (!this.requestContext.hasContext()) {
  // Handle background job or startup case
}
```

**2. "User context required but not available"**
```typescript
// Ensure route uses UnifiedAuthGuard
@UseGuards(UnifiedAuthGuard)
async protectedRoute() {
  // Context will be populated by guard
}
```

**3. "Organization context required but not available"**
```typescript
// Check user has organizationId in token/database
const user = await this.authService.validateToken(token)
// user.organizationId must be populated
```

### Debug Logging
```typescript
// Add debug logging to troubleshoot context issues
const context = this.requestContext.getCurrentContext()
this.logger.debug('Current context', context)
```

## Next Steps

1. **Start with one service** - PropertiesService is a good candidate
2. **Test thoroughly** - Ensure existing functionality works
3. **Update controllers** - Remove manual ID passing
4. **Repeat for other services** - Gradual migration
5. **Remove old patterns** - Once all services migrated

The migration can be done gradually without breaking existing functionality, making it safe to implement in production.