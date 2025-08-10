# BaseCrudService Migration Methodology

## Overview

This document provides a systematic approach for migrating existing services to the BaseCrudService pattern. The methodology has been refined through the PropertiesService migration and incorporates lessons learned.

## Migration Phases

### Phase 1: Analysis & Preparation (30 minutes)

#### 1.1 Service Analysis
```bash
# Analyze current service structure
wc -l src/[service]/[service].service.ts
grep -n "async.*(" src/[service]/[service].service.ts
```

**Document**:
- Current line count
- Number of CRUD methods
- Custom business logic methods
- Dependencies and imports
- Test coverage

#### 1.2 DTO Analysis
Review and document existing DTOs:
```typescript
// Identify current DTO patterns
interface Current[Entity]CreateDto { /* ... */ }
interface Current[Entity]UpdateDto { /* ... */ }
interface Current[Entity]QueryDto { /* ... */ }
```

#### 1.3 Test Coverage Assessment
```bash
# Check existing tests
find src/[service] -name "*.test.ts" -o -name "*.spec.ts"
npm test -- [service].service
```

### Phase 2: Foundation Setup (45 minutes)

#### 2.1 Create New DTOs
```typescript
// src/[service]/dto/[entity].dto.ts
export interface [Entity]CreateDto {
  // Required fields for creation
  name: string
  // ... other required fields
}

export interface [Entity]UpdateDto {
  // Optional fields for updates
  name?: string
  // ... other optional fields
}

export interface [Entity]QueryDto extends BaseQueryOptions {
  // Entity-specific query filters
  status?: string
  // ... other filters
}

export interface [Entity]Stats extends BaseStats {
  totalCount: number
  // ... entity-specific statistics
}
```

#### 2.2 Update Repository (if needed)
```typescript
// Ensure repository extends BaseRepository
export class [Entity]Repository extends BaseRepository<[Entity]> {
  constructor(prisma: PrismaService) {
    super(prisma, '[entity]')
  }
  
  // Add custom repository methods if needed
}
```

#### 2.3 Create New Service Class
```typescript
// src/[service]/[service].service.new.ts
@Injectable()
export class [Entity]Service extends BaseCrudService<
  [Entity],
  [Entity]CreateDto,
  [Entity]UpdateDto,
  [Entity]QueryDto,
  [Entity]Repository
> {
  protected readonly entityName = '[entity]'
  
  constructor(
    protected readonly repository: [Entity]Repository,
    errorHandler: ErrorHandlerService
  ) {
    super(errorHandler)
  }
  
  // Implement required abstract methods
  // (See detailed implementation below)
}
```

### Phase 3: Abstract Method Implementation (60 minutes)

#### 3.1 findByIdAndOwner Implementation
```typescript
protected async findByIdAndOwner(id: string, ownerId: string): Promise<[Entity] | null> {
  return await this.repository.findFirst({
    where: { id, ownerId },
    include: {
      // Include related entities as needed
      // Example: units: true, leases: true
    }
  })
}
```

**Considerations**:
- Include necessary related data
- Verify ownerId field name (might be `organizationId` or similar)
- Check for soft delete patterns

#### 3.2 calculateStats Implementation
```typescript
protected async calculateStats(ownerId: string): Promise<[Entity]Stats> {
  // Basic stats - expand as needed
  const totalCount = await this.repository.count({ 
    where: { ownerId } 
  })
  
  // Add entity-specific statistics
  const activeCount = await this.repository.count({
    where: { ownerId, status: 'ACTIVE' }
  })
  
  return {
    totalCount,
    activeCount,
    // ... other statistics
  }
}
```

#### 3.3 prepareCreateData Implementation
```typescript
protected prepareCreateData(data: [Entity]CreateDto, ownerId: string): unknown {
  return {
    ...data,
    ownerId,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Add any default values or transformations
    status: data.status || 'ACTIVE'
  }
}
```

#### 3.4 prepareUpdateData Implementation
```typescript
protected prepareUpdateData(data: [Entity]UpdateDto): unknown {
  return {
    ...data,
    updatedAt: new Date(),
    // Apply any necessary transformations
    // Remove undefined values if needed
    ...Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    )
  }
}
```

#### 3.5 createOwnerWhereClause Implementation
```typescript
protected createOwnerWhereClause(id: string, ownerId: string): unknown {
  return { 
    id, 
    ownerId  // Adjust field name if different
  }
}
```

### Phase 4: Business Logic Migration (45 minutes)

#### 4.1 Validation Hooks
```typescript
protected validateCreateData(data: [Entity]CreateDto): void {
  // Required field validation
  if (!data.name?.trim()) {
    throw new ValidationException(
      '[Entity] name is required',
      'name',
      { field: 'name', value: data.name }
    )
  }
  
  // Business rule validation
  // Example: unique constraints, format validation, etc.
}

protected validateUpdateData(data: [Entity]UpdateDto): void {
  // Update-specific validation
  if (data.name !== undefined && !data.name?.trim()) {
    throw new ValidationException(
      '[Entity] name cannot be empty',
      'name'
    )
  }
}

protected async validateDeletion(entity: [Entity], ownerId: string): Promise<void> {
  // Check for dependencies before deletion
  const dependentCount = await this.checkDependencies(entity.id)
  if (dependentCount > 0) {
    throw new ValidationException(
      'Cannot delete [entity] with active dependencies'
    )
  }
}
```

#### 4.2 Custom Business Methods
```typescript
// Migrate existing custom methods
async customBusinessOperation(id: string, ownerId: string): Promise<void> {
  const entity = await this.getByIdOrThrow(id, ownerId)
  
  // Apply business logic
  // Use existing patterns but ensure ownership validation
  
  this.logger.log('Custom operation completed', {
    entityName: this.entityName,
    id,
    ownerId
  })
}

// Add entity-specific methods as needed
async getEntitiesWithComplexFiltering(
  ownerId: string, 
  complexQuery: ComplexQueryDto
): Promise<[Entity][]> {
  // Use repository directly for complex queries
  return await this.repository.findMany({
    where: {
      ownerId,
      ...this.buildComplexWhere(complexQuery)
    },
    include: { /* complex relations */ }
  })
}
```

### Phase 5: Testing Implementation (60 minutes)

#### 5.1 Create Test File
```typescript
// src/[service]/[service].service.test.ts
describe('[Entity]Service', () => {
  let service: [Entity]Service
  let repository: jest.Mocked<[Entity]Repository>
  let errorHandler: jest.Mocked<ErrorHandlerService>

  beforeEach(async () => {
    const mockRepository = createMockRepository()
    const mockErrorHandler = createMockErrorHandler()

    const module = await Test.createTestingModule({
      providers: [
        [Entity]Service,
        { provide: [Entity]Repository, useValue: mockRepository },
        { provide: ErrorHandlerService, useValue: mockErrorHandler }
      ]
    }).compile()

    service = module.get([Entity]Service)
    repository = module.get([Entity]Repository)
    errorHandler = module.get(ErrorHandlerService)
  })

  // Test all BaseCrudService methods
  describe('getByOwner', () => {
    it('should return entities for owner', async () => {
      const mockEntities = [createMockEntity()]
      repository.findMany.mockResolvedValue(mockEntities)

      const result = await service.getByOwner('owner1')
      
      expect(result).toEqual(mockEntities)
      expect(repository.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'owner1' }
      })
    })
  })

  // Test custom business methods
  describe('customBusinessOperation', () => {
    it('should perform custom operation', async () => {
      const mockEntity = createMockEntity()
      repository.findFirst.mockResolvedValue(mockEntity)

      await service.customBusinessOperation('id1', 'owner1')

      expect(repository.findFirst).toHaveBeenCalledWith({
        where: { id: 'id1', ownerId: 'owner1' }
      })
    })
  })
})
```

#### 5.2 Service Contract Validation
```typescript
describe('[Entity]Service Contract', () => {
  it('should implement ICrudService interface', async () => {
    const validator = new ServiceContractValidator(service)
    const compliance = validator.validateCompliance()
    
    expect(compliance.isCompliant).toBe(true)
    expect(compliance.missingMethods).toHaveLength(0)
    expect(compliance.methodCount).toBeGreaterThan(5)
  })

  it('should provide alias methods for compatibility', () => {
    expect(typeof service.findAllByOwner).toBe('function')
    expect(typeof service.findById).toBe('function')
    expect(typeof service.remove).toBe('function')
  })
})
```

### Phase 6: Integration & Testing (30 minutes)

#### 6.1 Update Module Configuration
```typescript
// src/[service]/[service].module.ts
@Module({
  imports: [
    CommonModule,  // Provides BaseCrudService dependencies
    PrismaModule,
  ],
  controllers: [[Entity]Controller],
  providers: [
    [Entity]Service,
    [Entity]Repository,
  ],
  exports: [[Entity]Service]
})
export class [Entity]Module {}
```

#### 6.2 Run Integration Tests
```bash
# Test the new service
npm test -- [service].service

# Run contract validation
npm run test:contract -- [service]

# Test controller integration
npm test -- [service].controller
```

### Phase 7: Controller Migration (30 minutes)

#### 7.1 Update Controller Methods
```typescript
@Controller('[entities]')
export class [Entity]Controller {
  constructor(private readonly [entity]Service: [Entity]Service) {}

  @Get()
  async findAll(@CurrentUser() user: User, @Query() query: [Entity]QueryDto) {
    return await this.[entity]Service.getByOwner(user.organizationId, query)
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return await this.[entity]Service.getByIdOrThrow(id, user.organizationId)
  }

  @Post()
  async create(@Body() createDto: [Entity]CreateDto, @CurrentUser() user: User) {
    return await this.[entity]Service.create(createDto, user.organizationId)
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: [Entity]UpdateDto,
    @CurrentUser() user: User
  ) {
    return await this.[entity]Service.update(id, updateDto, user.organizationId)
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    return await this.[entity]Service.delete(id, user.organizationId)
  }
}
```

### Phase 8: Legacy Cleanup (15 minutes)

#### 8.1 Replace Old Service
```bash
# Backup old service
mv src/[service]/[service].service.ts src/[service]/[service].service.legacy.ts

# Rename new service
mv src/[service]/[service].service.new.ts src/[service]/[service].service.ts
```

#### 8.2 Update Imports
```bash
# Find and update imports
grep -r "old[Entity]Service" src/
# Update any remaining references
```

#### 8.3 Final Testing
```bash
# Run full test suite
npm test

# Test API endpoints
npm run test:e2e -- [service]

# Validate contract compliance
npm run test:contract
```

## Migration Checklist

### Pre-Migration ✅
- [ ] Service analysis completed
- [ ] Current line count documented
- [ ] Test coverage assessed
- [ ] Dependencies identified

### Implementation ✅
- [ ] DTOs defined with proper interfaces
- [ ] Repository extends BaseRepository
- [ ] Service extends BaseCrudService
- [ ] All abstract methods implemented
- [ ] Business logic preserved
- [ ] Validation hooks added

### Testing ✅
- [ ] Unit tests written
- [ ] Integration tests passing
- [ ] Service contract validated
- [ ] Mock data realistic
- [ ] Edge cases covered

### Integration ✅
- [ ] Module configuration updated
- [ ] Controller methods updated
- [ ] API endpoints tested
- [ ] Error handling verified
- [ ] Multi-tenancy enforced

### Cleanup ✅
- [ ] Legacy service archived
- [ ] Imports updated
- [ ] Full test suite passing
- [ ] Documentation updated
- [ ] Code review completed

## Quality Gates

### Phase Completion Criteria

#### Phase 1-2: Foundation
- All DTOs properly typed
- Repository integration working
- Basic service structure complete

#### Phase 3-4: Implementation
- All abstract methods implemented
- Business logic preserved
- Custom methods migrated

#### Phase 5: Testing
- >90% test coverage maintained
- Service contract validation passing
- Integration tests green

#### Phase 6-7: Integration
- Controller endpoints working
- API tests passing
- No breaking changes

#### Phase 8: Cleanup
- Legacy code removed
- Full test suite passing
- Documentation updated

## Performance Validation

### Benchmarking Process
```typescript
// Before migration
const beforeMetrics = await measureServicePerformance(oldService)

// After migration  
const afterMetrics = await measureServicePerformance(newService)

// Compare results
const improvement = calculateImprovement(beforeMetrics, afterMetrics)
expect(improvement.responseTime).toBeLessThanOrEqual(0) // No regression
expect(improvement.memoryUsage).toBeLessThanOrEqual(0) // Prefer reduction
```

### Performance Criteria
- **Response Time**: No regression (±5% acceptable)
- **Memory Usage**: Reduction expected (10-30%)
- **Query Count**: Same or fewer database queries
- **Error Rate**: Maintained or improved

## Risk Mitigation

### Rollback Plan
1. **Feature Flag**: Implement service switching capability
2. **Backup**: Keep legacy service as backup
3. **Monitoring**: Real-time performance monitoring
4. **Automated Tests**: Comprehensive test coverage

### Common Pitfalls
1. **Ownership Field Mismatches**: Verify field names (ownerId vs organizationId)
2. **Include Statements**: Don't forget necessary related data
3. **Validation Logic**: Preserve existing business rules
4. **Test Updates**: Update method names in tests
5. **Error Handling**: Maintain error context and logging

## Success Metrics

### Code Quality
- **Lines of Code**: 30-40% reduction expected
- **Cyclomatic Complexity**: Reduced through standardization
- **Type Safety**: Enhanced with generics
- **Test Coverage**: Maintained at >90%

### Development Velocity
- **New Service Creation**: <30 minutes with template
- **Bug Resolution**: Faster with consistent patterns
- **Code Review Time**: Reduced due to familiarity

### System Performance
- **Memory Usage**: 10-30% reduction per service
- **Response Times**: Maintained or improved
- **Error Rates**: Reduced through consistent handling

## Documentation Requirements

### Per-Service Documentation
- Migration notes and lessons learned
- Custom business logic documentation
- Performance impact analysis
- Test coverage report

### Team Knowledge Sharing
- Migration retrospective
- Pattern documentation updates
- Training materials
- Troubleshooting guide updates

---

**Methodology Version**: 1.0  
**Last Updated**: August 2, 2025  
**Based On**: PropertiesService migration experience  
**Next Review**: After next 2 service migrations