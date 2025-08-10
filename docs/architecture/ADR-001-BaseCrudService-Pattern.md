# ADR-001: BaseCrudService Pattern Implementation

**Date**: 2025-08-02  
**Status**: PROPOSED  
**Deciders**: TenantFlow Development Team  
**Technical Story**: Eliminate 680+ lines of duplicated CRUD code across backend services

## Context and Problem Statement

The TenantFlow backend has grown to include 4 core domain services (Properties, Leases, Maintenance, Documents) that each implement similar CRUD operations with nearly identical patterns:

- Ownership verification logic
- Error handling and logging
- Basic CRUD operations (create, read, update, delete)
- Statistics aggregation methods
- Query parameter parsing and validation

This duplication leads to:
- **Maintenance Burden**: Changes require updates across multiple services
- **Inconsistency Risk**: Different implementations may behave differently
- **Code Bloat**: 680+ lines of essentially duplicate code
- **Testing Overhead**: Same patterns tested multiple times

## Decision Drivers

- **DRY Principle**: Eliminate code duplication while maintaining readability
- **NestJS Compatibility**: Solution must work with existing DI and decorator patterns
- **Type Safety**: Maintain full TypeScript type safety across all operations
- **Extensibility**: Allow service-specific logic without breaking abstraction
- **Zero Breaking Changes**: Existing API contracts must remain intact
- **Multi-tenant Architecture**: Preserve RLS and ownership verification patterns

## Considered Options

### Option 1: Enhanced BaseRepository (Rejected)
- **Pros**: Minimal changes, extends existing pattern
- **Cons**: Still leaves business logic duplication in services
- **Impact**: Only addresses data access layer, not business logic patterns

### Option 2: Shared Utility Functions (Rejected)
- **Pros**: Simple to implement, no architectural changes
- **Cons**: Doesn't address structural duplication, still requires manual integration
- **Impact**: Marginal improvement, doesn't solve core problem

### Option 3: BaseCrudService Abstract Class (Selected)
- **Pros**: Complete elimination of duplication, maintains NestJS patterns, extensible
- **Cons**: Requires careful design to avoid over-abstraction
- **Impact**: Significant code reduction with improved maintainability

## Decision Outcome

**Chosen Option**: BaseCrudService Abstract Class

We will implement a `BaseCrudService<T, TCreate, TUpdate, TQuery>` abstract class that:

1. **Provides Standard CRUD Operations**
   - `getByOwner(ownerId, query)` - List resources with filtering
   - `getByIdOrThrow(id, ownerId)` - Get single resource with ownership verification
   - `create(data, ownerId)` - Create new resource
   - `update(id, data, ownerId)` - Update existing resource
   - `delete(id, ownerId)` - Delete resource
   - `getStats(ownerId)` - Aggregate statistics

2. **Extension Points for Service-Specific Logic**
   ```typescript
   // Abstract methods for customization
   protected abstract validateCreate(data: TCreate): Promise<void>
   protected abstract validateUpdate(data: TUpdate): Promise<void>
   protected abstract verifyOwnership(id: string, ownerId: string): Promise<void>
   protected abstract buildStatsQuery(ownerId: string): Promise<unknown>
   
   // Optional hooks for additional logic
   protected beforeCreate?(data: TCreate, ownerId: string): Promise<TCreate>
   protected afterCreate?(result: T, data: TCreate, ownerId: string): Promise<T>
   protected beforeUpdate?(id: string, data: TUpdate, ownerId: string): Promise<TUpdate>
   protected afterUpdate?(result: T, id: string, data: TUpdate, ownerId: string): Promise<T>
   ```

3. **Dependency Injection Integration**
   ```typescript
   export abstract class BaseCrudService<T, TCreate, TUpdate, TQuery> {
     constructor(
       protected readonly repository: BaseRepository<T, TCreate, TUpdate>,
       protected readonly errorHandler: ErrorHandlerService,
       protected readonly logger: Logger
     ) {}
   }
   ```

## Architecture Benefits

### Code Reduction
- **Properties Service**: 422 lines → ~150 lines (65% reduction)
- **Leases Service**: 205 lines → ~80 lines (61% reduction)
- **Maintenance Service**: 402 lines → ~180 lines (55% reduction)
- **Documents Service**: 289 lines → ~120 lines (59% reduction)
- **Total Reduction**: ~680 lines → ~270 lines (60% reduction)

### Improved Maintainability
- Single location for CRUD pattern updates
- Consistent error handling across all services
- Standardized logging and monitoring patterns
- Simplified testing with shared test utilities

### Enhanced Type Safety
```typescript
// Full generic type support
class PropertiesService extends BaseCrudService<
  Property,           // T - Entity type
  CreatePropertyDto,  // TCreate - Creation DTO
  UpdatePropertyDto,  // TUpdate - Update DTO
  PropertyQueryDto    // TQuery - Query parameters
> {
  // Service-specific methods only
}
```

## Implementation Strategy

### Phase 1: Foundation
1. Create `BaseCrudService` abstract class
2. Define extension point interfaces
3. Implement core CRUD operations with error handling

### Phase 2: Migration
1. Migrate Properties service (simplest case)
2. Migrate Leases service (date validation patterns)
3. Migrate Documents service (file validation patterns)
4. Migrate Maintenance service (notification patterns)

### Phase 3: Validation
1. Comprehensive testing of each migrated service
2. Performance benchmarking
3. API contract validation
4. Integration testing

## Positive Consequences

- **Reduced Maintenance**: Single point of change for CRUD patterns
- **Consistency**: Uniform behavior across all domain services
- **Type Safety**: Generic type system prevents runtime errors
- **Testability**: Shared test utilities and patterns
- **Onboarding**: New developers learn one pattern, apply everywhere
- **Documentation**: Single set of patterns to document and maintain

## Negative Consequences

- **Initial Complexity**: Learning curve for abstract class pattern
- **Over-abstraction Risk**: Must balance generalization with service-specific needs
- **Migration Effort**: Requires careful refactoring of existing services
- **Debugging Complexity**: Stack traces may be deeper with abstract layers

## Mitigation Strategies

### Over-abstraction Prevention
- Keep extension points focused and minimal
- Allow services to override any method if needed
- Provide clear documentation on when to extend vs override

### Migration Risk Reduction
- Implement comprehensive test coverage before migration
- Use feature flags for gradual rollout
- Maintain parallel implementations during transition

### Developer Experience
- Provide clear examples and documentation
- Create migration guide with step-by-step instructions
- Include TypeScript types and IDE support

## Compliance

This decision aligns with:
- **NestJS Best Practices**: Proper use of DI and decorators
- **SOLID Principles**: Single responsibility, open/closed principle
- **TypeScript Guidelines**: Full type safety and generic usage
- **TenantFlow Architecture**: Multi-tenant patterns and RLS compliance

## Related Decisions

- **ADR-002**: Migration sequence and rollback procedures
- **ADR-003**: Testing strategy for BaseCrudService pattern
- **ADR-004**: Documentation standards for abstract service patterns

## References

- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [TypeScript Generic Constraints](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [Martin Fowler - Template Method Pattern](https://refactoring.guru/design-patterns/template-method)
- [Clean Architecture Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)