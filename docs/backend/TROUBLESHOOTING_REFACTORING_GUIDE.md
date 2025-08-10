# Backend Refactoring Troubleshooting Guide

## Overview

This guide provides solutions for common issues encountered during the BaseCrudService migration and consolidation process.

## Common Migration Issues

### 1. TypeScript Compilation Errors

#### Issue: Generic Type Mismatches
```
Error: Type 'PropertyRepository' is not assignable to parameter of type 'BaseRepository<Property>'
```

**Root Cause**: Repository type doesn't extend BaseRepository properly

**Solution**:
```typescript
// ✅ Correct repository definition
export class PropertyRepository extends BaseRepository<Property> {
  constructor(prisma: PrismaService) {
    super(prisma, 'property')
  }
}

// ✅ Correct service generic typing
export class PropertiesService extends BaseCrudService<
  Property,           // Entity type
  PropertyCreateDto,  // Create DTO
  PropertyUpdateDto,  // Update DTO  
  PropertyQueryDto,   // Query DTO
  PropertyRepository  // Repository type (must extend BaseRepository)
> {
  // Implementation...
}
```

#### Issue: DTO Interface Incompatibility
```
Error: Property 'search' is missing in type 'CustomQueryDto' but required in type 'BaseQueryOptions'
```

**Root Cause**: Query DTO doesn't extend BaseQueryOptions

**Solution**:
```typescript
// ✅ Correct DTO definition
export interface PropertyQueryDto extends BaseQueryOptions {
  propertyType?: PropertyType
  // Entity-specific fields...
}

// ❌ Incorrect - missing extension
export interface PropertyQueryDto {
  propertyType?: PropertyType
}
```

#### Issue: Abstract Method Implementation Missing
```
Error: Non-abstract class 'PropertiesService' does not implement inherited abstract member 'findByIdAndOwner'
```

**Solution**: Implement all required abstract methods:
```typescript
// Required abstract methods
protected async findByIdAndOwner(id: string, ownerId: string): Promise<Property | null> {
  return await this.repository.findFirst({
    where: { id, ownerId },
    include: { /* related entities */ }
  })
}

protected async calculateStats(ownerId: string): Promise<BaseStats> {
  const totalCount = await this.repository.count({ where: { ownerId } })
  return { totalCount }
}

protected prepareCreateData(data: PropertyCreateDto, ownerId: string): unknown {
  return { ...data, ownerId }
}

protected prepareUpdateData(data: PropertyUpdateDto): unknown {
  return { ...data, updatedAt: new Date() }
}

protected createOwnerWhereClause(id: string, ownerId: string): unknown {
  return { id, ownerId }
}
```

### 2. Test Integration Issues

#### Issue: Method Name Mismatches
```
Error: TypeError: service.createProperty is not a function
```

**Solution**: Update tests to use BaseCrudService method names:
```typescript
// ❌ Legacy test expectations
await service.createProperty(propertyData, ownerId)
await service.getPropertiesByOwner(ownerId)
await service.updateProperty(id, updateData, ownerId)
await service.deleteProperty(id, ownerId)

// ✅ BaseCrudService method names
await service.create(propertyData, ownerId)
await service.getByOwner(ownerId)
await service.update(id, updateData, ownerId)
await service.delete(id, ownerId)

// ✅ Or use alias methods for compatibility
await service.findAllByOwner(ownerId)
await service.findById(id, ownerId)
await service.remove(id, ownerId)
```

#### Issue: Mock Setup Errors
```
Error: Cannot spy on a property that is not a function
```

**Solution**: Properly mock the BaseCrudService methods:
```typescript
// ✅ Correct mock setup
const mockRepository = {
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn()
}

const mockErrorHandler = {
  handleError: jest.fn()
}

beforeEach(async () => {
  const module = await Test.createTestingModule({
    providers: [
      PropertiesService,
      { provide: PropertiesRepository, useValue: mockRepository },
      { provide: ErrorHandlerService, useValue: mockErrorHandler }
    ]
  }).compile()

  service = module.get(PropertiesService)
})
```

### 3. Controller Integration Issues

#### Issue: Controller Method Calls Fail
```
Error: TypeError: this.propertiesService.getPropertiesByOwner is not a function
```

**Root Cause**: Controller uses legacy service method names

**Solution**: Update controller to use BaseCrudService methods:
```typescript
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  async findAll(@CurrentUser() user: User, @Query() query: PropertyQueryDto) {
    // ✅ Use BaseCrudService method
    return await this.propertiesService.getByOwner(user.organizationId, query)
    
    // ✅ Or use alias method for compatibility
    // return await this.propertiesService.findAllByOwner(user.organizationId, query)
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    // ✅ Use BaseCrudService method
    return await this.propertiesService.getByIdOrThrow(id, user.organizationId)
  }
}
```

### 4. Repository Integration Issues

#### Issue: Repository Method Not Found
```
Error: TypeError: this.repository.findManyByOwner is not a function
```

**Root Cause**: Custom repository methods not aligned with BaseRepository

**Solution**: Use BaseRepository methods or implement custom ones:
```typescript
// ✅ Use BaseRepository standard methods
export class PropertyRepository extends BaseRepository<Property> {
  // BaseRepository provides: findFirst, findMany, create, update, delete, count
  
  // Add custom methods if needed
  async findWithUnits(ownerId: string): Promise<Property[]> {
    return this.findMany({
      where: { ownerId },
      include: { units: true }
    })
  }
}
```

### 5. Multi-tenancy Issues

#### Issue: Cross-tenant Data Access
```
Error: Property not found (accessing another tenant's data)
```

**Root Cause**: Ownership validation not working correctly

**Solution**: Verify owner validation implementation:
```typescript
// ✅ Correct ownership validation
protected async findByIdAndOwner(id: string, ownerId: string): Promise<Property | null> {
  return await this.repository.findFirst({
    where: { 
      id, 
      ownerId  // Critical: must include ownerId in where clause
    }
  })
}

// ❌ Incorrect - missing ownership validation
protected async findByIdAndOwner(id: string, ownerId: string): Promise<Property | null> {
  return await this.repository.findFirst({
    where: { id }  // Missing ownerId validation
  })
}
```

### 6. Performance Issues

#### Issue: N+1 Query Problems
```
Warning: Multiple database queries detected for single operation
```

**Solution**: Optimize includes and query patterns:
```typescript
// ✅ Efficient query with proper includes
protected async findByIdAndOwner(id: string, ownerId: string): Promise<Property | null> {
  return await this.repository.findFirst({
    where: { id, ownerId },
    include: {
      units: true,           // Include related data in single query
      leases: {
        include: {
          tenant: true
        }
      }
    }
  })
}

// ❌ Inefficient - may cause N+1 queries
async getPropertyWithDetails(id: string, ownerId: string): Promise<PropertyDetails> {
  const property = await this.getByIdOrThrow(id, ownerId)
  const units = await this.getUnitsForProperty(id)  // Separate query
  const leases = await this.getLeasesForProperty(id) // Another query
  // Creates N+1 query pattern
}
```

## Error Handling Troubleshooting

### 1. Error Context Missing

#### Issue: Generic error messages without context
```
Error: Internal server error (no additional context)
```

**Solution**: Ensure proper error handling implementation:
```typescript
// ✅ Proper error context
async create(data: PropertyCreateDto, ownerId: string): Promise<Property> {
  try {
    // Validate input
    this.validateCreateData(data)
    
    // Prepare data
    const createData = this.prepareCreateData(data, ownerId)
    
    // Execute operation
    const result = await this.repository.create(createData)
    
    this.logger.log('Property created successfully', {
      entityName: this.entityName,
      propertyId: result.id,
      ownerId
    })
    
    return result
  } catch (error) {
    this.logger.error('Property creation failed', {
      entityName: this.entityName,
      ownerId,
      data: JSON.stringify(data),
      error: error.message
    })
    
    throw this.errorHandler.handleError(error, {
      operation: 'create',
      entityName: this.entityName,
      ownerId
    })
  }
}
```

### 2. Validation Errors

#### Issue: Inconsistent validation behavior
```
Error: Validation failed but no specific error details
```

**Solution**: Implement validation hooks:
```typescript
// ✅ Proper validation implementation
protected validateCreateData(data: PropertyCreateDto): void {
  if (!data.name?.trim()) {
    throw new ValidationException(
      'Property name is required',
      'name',
      { field: 'name', value: data.name }
    )
  }
  
  if (!data.address?.trim()) {
    throw new ValidationException(
      'Property address is required',
      'address',
      { field: 'address', value: data.address }
    )
  }
  
  // Additional validation logic...
}
```

## Database & Migration Issues

### 1. RLS Policy Conflicts

#### Issue: Row-Level Security preventing operations
```
Error: new row violates row-level security policy for table "properties"
```

**Solution**: Verify RLS policies and service context:
```typescript
// Ensure proper tenant context is set
await this.multiTenantPrisma.withTenantContext(ownerId, async (prisma) => {
  return await prisma.property.create(data)
})
```

### 2. Index Performance Issues

#### Issue: Slow queries during migration
```
Warning: Query execution time exceeded threshold
```

**Solution**: Check and add missing indexes:
```sql
-- Add indexes for owner-based queries
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner_type ON properties(owner_id, property_type);

-- Compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_properties_search ON properties(owner_id, name, address);
```

## Development Environment Issues

### 1. Prisma Client Generation

#### Issue: Prisma client not updated after schema changes
```
Error: Unknown argument `organizationId` on type `PropertyWhereInput`
```

**Solution**:
```bash
# Regenerate Prisma client
cd apps/backend
npx prisma generate

# Run migrations if needed
npx prisma migrate dev
```

### 2. Module Import Errors

#### Issue: Circular dependency or import errors
```
Error: Cannot resolve dependency 'PropertiesService'
```

**Solution**: Check module imports and dependencies:
```typescript
// ✅ Correct module structure
@Module({
  imports: [
    CommonModule,      // Provides BaseCrudService dependencies
    PrismaModule,      // Provides Prisma services
  ],
  controllers: [PropertiesController],
  providers: [
    PropertiesService,
    PropertiesRepository,
    // ErrorHandlerService provided by CommonModule
  ],
  exports: [PropertiesService]
})
export class PropertiesModule {}
```

## Testing Troubleshooting

### 1. Integration Test Failures

#### Issue: Service contract validation failures
```
Error: Service does not implement required interface
```

**Solution**: Use ServiceContractValidator:
```typescript
describe('PropertiesService Contract', () => {
  it('should implement ICrudService interface', async () => {
    const validator = new ServiceContractValidator(service)
    const compliance = validator.validateCompliance()
    
    expect(compliance.isCompliant).toBe(true)
    expect(compliance.missingMethods).toHaveLength(0)
  })
})
```

### 2. Mock Data Issues

#### Issue: Test data doesn't match production patterns
```
Error: Invalid test data structure
```

**Solution**: Use realistic test data:
```typescript
// ✅ Realistic test data factory
const createMockProperty = (overrides?: Partial<Property>): Property => ({
  id: 'prop-123',
  name: 'Test Property',
  address: '123 Test St',
  city: 'Test City',
  state: 'TS',
  zipCode: '12345',
  ownerId: 'owner-123',
  propertyType: PropertyType.RESIDENTIAL,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
})
```

## Performance Troubleshooting

### 1. Memory Usage Issues

#### Issue: High memory consumption after migration
```
Warning: Memory usage increased significantly
```

**Solution**: Profile service instantiation:
```typescript
// Check for memory leaks in service creation
const memoryBefore = process.memoryUsage()
const service = new PropertiesService(repository, errorHandler)
const memoryAfter = process.memoryUsage()

console.log('Memory usage:', {
  heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
  external: memoryAfter.external - memoryBefore.external
})
```

### 2. Query Performance Degradation

#### Issue: Slower response times after migration
```
Warning: API response times increased
```

**Solution**: Profile database queries:
```typescript
// Add query performance monitoring
const startTime = Date.now()
const result = await this.repository.findMany(query)
const duration = Date.now() - startTime

if (duration > 1000) {
  this.logger.warn('Slow query detected', {
    operation: 'findMany',
    duration,
    query: JSON.stringify(query)
  })
}
```

## Getting Help

### Internal Resources
1. **Architecture Documentation**: `src/common/services/README.md`
2. **Example Implementation**: `src/common/services/base-crud.service.example.ts`
3. **Test Templates**: `src/test/base-crud-service.test.template.ts`

### Escalation Path
1. Check existing service implementations for patterns
2. Review BaseCrudService example and documentation
3. Run ServiceContractValidator for compliance issues
4. Consult Backend Architecture Specialist
5. Create unit tests to isolate and validate issues

### Debugging Tools
```bash
# Type checking in chunks
npm run typecheck:chunks

# Lint and fix common issues
npm run claude:check

# Run specific service tests
npm test -- properties.service

# Validate RLS policies
npm run rls:test
```

### Common Commands
```bash
# Fix common import issues
npm run fix:barrel-imports

# Security audit
npm run security:audit

# Performance monitoring
npm run accelerate:monitor
```

---

**Last Updated**: August 2, 2025  
**Maintained By**: Documentation Agent  
**Next Review**: After each major migration milestone