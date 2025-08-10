# BaseCrudService Implementation Guide

## Overview

The `BaseCrudService` provides a standardized abstraction layer for CRUD operations across all entities in the TenantFlow application. It implements consistent patterns for multi-tenant data access, error handling, validation, and logging.

## Architecture

```
Controller → Service (extends BaseCrudService) → Repository (extends BaseRepository) → Prisma
```

### Benefits

- **680+ lines of code reduction** across 4 services
- **Consistent error handling** and logging patterns
- **Multi-tenant security** built-in with ownership validation
- **Type safety** with TypeScript generics
- **Route compatibility** with alias methods
- **Extensible hooks** for entity-specific business logic

## Implementation Steps

### 1. Define Your DTOs

```typescript
// Create interfaces for your entity operations
export interface YourEntityCreateDto {
  name: string
  // ... other required fields
}

export interface YourEntityUpdateDto {
  name?: string
  // ... other optional fields
}

export interface YourEntityQueryDto extends BaseQueryOptions {
  status?: string
  // ... entity-specific filters
}

export interface YourEntityStats extends BaseStats {
  totalCount: number
  // ... entity-specific statistics
}
```

### 2. Extend BaseCrudService

```typescript
@Injectable()
export class YourEntityService extends BaseCrudService<
  YourEntity,                    // Entity type
  YourEntityCreateDto,           // Create DTO
  YourEntityUpdateDto,           // Update DTO
  YourEntityQueryDto,            // Query DTO
  YourEntityRepository           // Repository type
> {
  protected readonly entityName = 'YourEntity'

  constructor(
    protected readonly repository: YourEntityRepository,
    errorHandler: ErrorHandlerService
  ) {
    super(errorHandler)
  }

  // Implement required abstract methods...
}
```

### 3. Implement Required Abstract Methods

#### findByIdAndOwner
```typescript
protected async findByIdAndOwner(id: string, ownerId: string): Promise<YourEntity | null> {
  return await this.repository.findFirst({
    where: { id, ownerId },
    include: { /* related entities */ }
  })
}
```

#### calculateStats
```typescript
protected async calculateStats(ownerId: string): Promise<YourEntityStats> {
  const totalCount = await this.repository.count({ where: { ownerId } })
  
  return {
    totalCount,
    // ... other statistics
  }
}
```

#### prepareCreateData
```typescript
protected prepareCreateData(data: YourEntityCreateDto, ownerId: string): unknown {
  return {
    ...data,
    ownerId,
    // ... any transformations or defaults
  }
}
```

#### prepareUpdateData
```typescript
protected prepareUpdateData(data: YourEntityUpdateDto): unknown {
  return {
    ...data,
    updatedAt: new Date(),
    // ... any transformations
  }
}
```

#### createOwnerWhereClause
```typescript
protected createOwnerWhereClause(id: string, ownerId: string): unknown {
  return { id, ownerId }
}
```

### 4. Add Entity-Specific Business Logic

#### Validation Hooks
```typescript
protected validateCreateData(data: YourEntityCreateDto): void {
  if (!data.name?.trim()) {
    throw new ValidationException('Name is required', 'name')
  }
}

protected async validateDeletion(entity: YourEntity, ownerId: string): Promise<void> {
  // Check for dependencies before deletion
  const dependentCount = await this.checkDependencies(entity.id)
  if (dependentCount > 0) {
    throw new ValidationException('Cannot delete entity with dependencies')
  }
}
```

#### Custom Methods
```typescript
// Add entity-specific methods beyond standard CRUD
async customBusinessOperation(id: string, ownerId: string): Promise<void> {
  const entity = await this.getByIdOrThrow(id, ownerId)
  
  // Perform business logic
  // ...
  
  this.logger.log('Custom operation completed', { id, ownerId })
}
```

## Built-in Features

### Multi-Tenant Security
- All operations automatically filter by `ownerId`
- Ownership validation on get/update/delete operations
- Throws `NotFoundException` for unauthorized access

### Error Handling
- Consistent error logging with operation context
- Automatic Prisma error transformation
- Structured error metadata for debugging

### Route Compatibility
- Alias methods: `findAllByOwner`, `findById`, `findOne`, `remove`
- Compatible with existing controller patterns
- No breaking changes required

### Validation
- Input validation for IDs and owner IDs
- Query parameter parsing and validation
- Pagination limits (max 1000 records)

### Logging
- Structured logging with operation context
- Performance timing for operations
- Entity metadata in log entries

## Testing Guidelines

### Unit Tests
```typescript
describe('YourEntityService', () => {
  let service: YourEntityService
  let repository: jest.Mocked<YourEntityRepository>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        YourEntityService,
        { provide: YourEntityRepository, useValue: mockRepository },
        { provide: ErrorHandlerService, useValue: mockErrorHandler }
      ]
    }).compile()

    service = module.get(YourEntityService)
    repository = module.get(YourEntityRepository)
  })

  describe('getByOwner', () => {
    it('should return entities for owner', async () => {
      const mockEntities = [{ id: '1', ownerId: 'owner1' }]
      repository.findManyByOwner.mockResolvedValue(mockEntities)

      const result = await service.getByOwner('owner1')
      expect(result).toEqual(mockEntities)
    })
  })

  // ... more tests
})
```

### Integration Tests
```typescript
describe('YourEntityService Integration', () => {
  // Test with real database
  // Test multi-tenant isolation
  // Test error scenarios
})
```

## Migration Strategy

### Phase 1: Create New Service Class
1. Create new service extending `BaseCrudService`
2. Implement all abstract methods
3. Add entity-specific business logic
4. Write comprehensive tests

### Phase 2: Update Controllers
1. Replace service injection with new service
2. Update any controller-specific logic
3. Test all endpoints

### Phase 3: Remove Old Service
1. Delete old service file
2. Update imports and dependencies
3. Run full test suite

## Common Patterns

### Complex Queries
```typescript
async getEntitiesWithRelations(ownerId: string, query: YourEntityQueryDto) {
  // Use repository directly for complex queries
  return await this.repository.findMany({
    where: { ownerId, ...this.buildComplexWhere(query) },
    include: { /* complex relations */ }
  })
}
```

### Transactions
```typescript
async createWithRelatedEntities(data: ComplexCreateDto, ownerId: string) {
  return await this.repository.prismaClient.$transaction(async (tx) => {
    const entity = await tx.yourEntity.create({ /* ... */ })
    await tx.relatedEntity.createMany({ /* ... */ })
    return entity
  })
}
```

### Caching
```typescript
async getById(id: string, ownerId: string): Promise<YourEntity> {
  const cacheKey = `entity:${id}:${ownerId}`
  const cached = await this.cache.get(cacheKey)
  
  if (cached) return cached
  
  const entity = await this.getByIdOrThrow(id, ownerId)
  await this.cache.set(cacheKey, entity, 300) // 5 minutes
  
  return entity
}
```

## Best Practices

### Do's
- ✅ Use the base service for all standard CRUD operations
- ✅ Override validation hooks for entity-specific rules
- ✅ Add comprehensive error logging
- ✅ Test multi-tenant isolation thoroughly
- ✅ Use TypeScript generics for type safety
- ✅ Follow naming conventions for consistency

### Don'ts
- ❌ Don't bypass ownership validation
- ❌ Don't expose internal repository methods directly
- ❌ Don't skip error handling for custom methods
- ❌ Don't ignore validation in hook methods
- ❌ Don't hardcode entity names or error messages

## Troubleshooting

### Common Issues

**TypeScript compilation errors:**
- Ensure all generic types are properly defined
- Check that DTOs extend the correct base interfaces
- Verify repository type matches the service generic

**Runtime errors:**
- Check that all abstract methods are implemented
- Verify repository injection in constructor
- Ensure proper error handling in custom methods

**Test failures:**
- Mock all repository dependencies properly
- Test with realistic data scenarios
- Verify error cases are handled correctly

### Performance Considerations

- Use appropriate includes for related data
- Implement pagination for large datasets
- Consider caching for frequently accessed entities
- Monitor query performance with logging

## Support

For questions or issues with the BaseCrudService implementation:

1. Check existing service implementations for examples
2. Review the example file: `base-crud.service.example.ts`
3. Consult with the Backend Architecture Specialist
4. Create unit tests to validate your implementation