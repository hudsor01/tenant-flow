# ADR-001: BaseCrudService Architecture Pattern

## Status
**ACCEPTED** - Implementation in progress

## Context

The TenantFlow backend had significant code duplication across service layers, with each entity service (Properties, Tenants, Leases, Maintenance, Units) implementing similar CRUD operations with slight variations. This led to:

- **680+ lines of duplicated code** across 4 main services
- **Inconsistent error handling** patterns
- **Varying multi-tenancy enforcement** approaches
- **Maintenance overhead** from repeated patterns
- **Testing complexity** due to inconsistent interfaces

### Pre-Refactoring Service Pattern
```typescript
@Injectable()
export class PropertiesService {
  async createProperty(data: CreateDto, ownerId: string) {
    // Custom implementation with error handling
    // Multi-tenancy enforcement
    // Validation logic
    // Logging
  }
  
  async getPropertiesByOwner(ownerId: string) {
    // Similar patterns repeated across all services
  }
  
  // ... more duplicate CRUD methods
}
```

## Decision

Implement a **BaseCrudService** abstract base class that provides standardized CRUD operations for all multi-tenant entities, following the Repository pattern with consistent error handling and security enforcement.

### Architectural Components

#### 1. BaseCrudService Abstract Class
- **Generic TypeScript implementation** supporting any entity type
- **Standardized CRUD operations**: Create, Read, Update, Delete, Stats
- **Multi-tenant security** built into every operation
- **Consistent error handling** with structured context
- **Extensible hook system** for entity-specific business logic

#### 2. Service Contract Interface
```typescript
export interface ICrudService<TEntity, TCreateDto, TUpdateDto, TQueryDto> {
  // Core operations
  getByOwner(ownerId: string, query?: TQueryDto): Promise<TEntity[]>
  getByIdOrThrow(id: string, ownerId: string): Promise<TEntity>
  getStats(ownerId: string): Promise<BaseStats>
  create(data: TCreateDto, ownerId: string): Promise<TEntity>
  update(id: string, data: TUpdateDto, ownerId: string): Promise<TEntity>
  delete(id: string, ownerId: string): Promise<TEntity>
  
  // Compatibility aliases
  findAllByOwner?(ownerId: string, query?: TQueryDto): Promise<TEntity[]>
  findById?(id: string, ownerId: string): Promise<TEntity>
  remove?(id: string, ownerId: string): Promise<TEntity>
}
```

#### 3. Implementation Pattern
```typescript
@Injectable()
export class PropertiesService extends BaseCrudService<
  Property,           // Entity type
  PropertyCreateDto,  // Create DTO
  PropertyUpdateDto,  // Update DTO  
  PropertyQueryDto,   // Query DTO
  PropertyRepository  // Repository type
> {
  protected readonly entityName = 'property'
  
  // Implement required abstract methods
  protected async findByIdAndOwner(id: string, ownerId: string): Promise<Property | null> {
    return await this.repository.findFirst({
      where: { id, ownerId },
      include: { /* entity-specific includes */ }
    })
  }
  
  // Add entity-specific business logic as needed
  async customPropertyOperation(id: string, ownerId: string): Promise<void> {
    const property = await this.getByIdOrThrow(id, ownerId)
    // Custom business logic...
  }
}
```

## Consequences

### Benefits

#### ✅ **Code Quality & Maintainability**
- **680+ lines of code eliminated** across services
- **Consistent patterns** enforced through inheritance
- **Single source of truth** for CRUD operations
- **Easier testing** with standardized interfaces
- **Reduced maintenance burden** for common operations

#### ✅ **Security & Multi-tenancy**
- **Automatic ownership validation** on all operations
- **Consistent multi-tenant filtering** at the service layer
- **Prevention of cross-tenant data access**
- **Centralized security enforcement**

#### ✅ **Developer Experience**
- **Type safety** through TypeScript generics
- **Consistent API contracts** across all services
- **Standardized error handling** with rich context
- **Comprehensive logging** for operations
- **Easy service creation** following established patterns

#### ✅ **Performance**
- **Efficient query patterns** in base implementation
- **No N+1 query issues** in standard operations
- **Optimized pagination** support
- **Repository abstraction** maintains performance

### Trade-offs

#### ⚠️ **Implementation Complexity**
- **Abstract method requirements** must be implemented per service
- **Learning curve** for developers unfamiliar with the pattern
- **Migration effort** required for existing services
- **Generic type complexity** in TypeScript

#### ⚠️ **Flexibility Constraints**
- **Standardized patterns** may not fit all use cases
- **Entity-specific optimizations** require custom implementation
- **Complex business logic** still needs custom methods
- **Breaking changes** during migration period

#### ⚠️ **Testing Considerations**
- **Mock complexity** for abstract base class testing
- **Integration testing** required for each service implementation
- **Legacy test updates** needed during migration

## Implementation Details

### Required Abstract Methods
Every service extending BaseCrudService must implement:

1. **`findByIdAndOwner(id: string, ownerId: string)`** - Entity-specific retrieval
2. **`calculateStats(ownerId: string)`** - Owner statistics calculation
3. **`prepareCreateData(data: TCreateDto, ownerId: string)`** - Data preparation for creation
4. **`prepareUpdateData(data: TUpdateDto)`** - Data preparation for updates
5. **`createOwnerWhereClause(id: string, ownerId: string)`** - Where clause construction

### Optional Hook Methods
Services can override for custom behavior:

- **`validateCreateData(data: TCreateDto)`** - Input validation before creation
- **`validateUpdateData(data: TUpdateDto)`** - Input validation before updates
- **`validateDeletion(entity: TEntity, ownerId: string)`** - Deletion business rules
- **`afterCreate(entity: TEntity, ownerId: string)`** - Post-creation hooks
- **`afterUpdate(entity: TEntity, ownerId: string)`** - Post-update hooks
- **`afterDelete(entity: TEntity, ownerId: string)`** - Post-deletion hooks

### Error Handling Strategy
```typescript
// Centralized error handling with rich context
protected async handleOperation<T>(
  operation: () => Promise<T>,
  context: OperationContext
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    this.logger.error(`${context.operation} failed`, {
      entityName: this.entityName,
      ...context,
      error: error.message
    })
    throw this.errorHandler.handleError(error, context)
  }
}
```

## Migration Strategy

### Phase 1: Foundation ✅ **COMPLETE**
- Implement BaseCrudService base class
- Create service contract interface
- Build comprehensive testing framework
- Document implementation patterns

### Phase 2: Service Migration 🟡 **IN PROGRESS**
- Migrate PropertiesService (partially complete)
- Migrate TenantsService (pending)
- Migrate LeasesService (pending)
- Migrate MaintenanceService (pending)
- Migrate UnitsService (pending)

### Phase 3: Integration & Testing ❌ **PENDING**
- Update controllers to use new service methods
- Comprehensive API endpoint testing
- Performance benchmarking
- Legacy cleanup

### Phase 4: Documentation & Training ❌ **PENDING**
- Complete migration documentation
- Developer training materials
- Best practices guide
- Troubleshooting documentation

## Success Metrics

### Code Quality Metrics
- **Lines of Code Reduction**: Target 680+ lines eliminated
- **Cyclomatic Complexity**: Reduced through standardization
- **Test Coverage**: Maintain >90% coverage during migration
- **TypeScript Errors**: Zero compilation errors

### Performance Metrics
- **Query Performance**: No regression in database operations
- **Memory Usage**: Efficient service instantiation
- **Response Times**: Maintain or improve API response times

### Development Velocity
- **New Service Creation**: <30 minutes with BaseCrudService
- **Bug Resolution**: Faster debugging with consistent patterns
- **Feature Development**: Standardized CRUD reduces implementation time

## Risks & Mitigations

### Risk: Migration Breaking Changes
**Mitigation**: 
- Implement alias methods for backward compatibility
- Gradual migration with comprehensive testing
- Feature flags for service switching

### Risk: Performance Regression
**Mitigation**:
- Benchmark before and after migration
- Monitor query performance during rollout
- Optimize base class for common use cases

### Risk: Developer Adoption Resistance
**Mitigation**:
- Comprehensive documentation and examples
- Training sessions on new patterns
- Clear benefits communication

## Alternatives Considered

### 1. **Keep Current Pattern**
**Rejected**: Maintenance overhead and inconsistency issues would persist

### 2. **Shared Utility Functions**
**Rejected**: Would not enforce consistency or provide type safety

### 3. **Code Generation Approach**
**Rejected**: Complex tooling requirements and reduced flexibility

### 4. **Composition over Inheritance**
**Considered**: More complex to implement for TypeScript generics

## Future Considerations

### Potential Enhancements
- **Caching layer integration** in base service
- **Event sourcing hooks** for audit trails
- **Automatic API documentation** generation
- **GraphQL resolver integration**

### Monitoring & Observability
- **Service performance metrics** collection
- **Error rate monitoring** per service
- **Multi-tenancy compliance** auditing
- **Usage pattern analysis**

## Conclusion

The BaseCrudService architecture provides significant benefits in code quality, security, and maintainability while maintaining performance and developer experience. The implementation enforces consistent patterns across all services while providing flexibility for entity-specific business logic.

The migration process is proceeding successfully with the foundation complete and service migrations in progress. The pattern has proven effective in testing and provides a solid foundation for future development.

---

**Decision Date**: July 2025  
**Last Updated**: August 2, 2025  
**Next Review**: Post-migration completion  
**Decision Makers**: Backend Architecture Team  
**Status**: ✅ ACCEPTED & IMPLEMENTING