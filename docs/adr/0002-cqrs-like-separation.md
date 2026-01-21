# ADR-0002: CQRS-Like Query/Command Separation

## Status
Accepted

## Context
TenantFlow has distinct read and write patterns:

**Read patterns (Queries)**:
- Dashboard aggregations across multiple tables
- Paginated lists with filtering and sorting
- Analytics with time-series data
- Caching-friendly, read-heavy workloads

**Write patterns (Commands)**:
- CRUD operations on entities
- State transitions (lease signing, payment processing)
- Side effects (notifications, webhooks)
- Strict validation and business rules

A pure CRUD approach would conflate these concerns, leading to:
- Fat controllers/services doing both read and write
- Difficult caching strategies
- Complex query optimization mixed with business logic

### Options Considered

1. **Pure CRUD**: Single service per entity handles everything
2. **Full CQRS with Event Sourcing**: Separate read/write models with events
3. **CQRS-like separation**: Logical separation without event sourcing

## Decision
We chose **CQRS-like separation** - logical separation of read and write concerns without the complexity of full event sourcing.

### Implementation

**Query Side (Read)**:
```
modules/owner-dashboard/
├── dashboard.controller.ts    # Aggregated dashboard queries
├── analytics/                 # Complex read models
│   ├── analytics.controller.ts
│   └── analytics.service.ts
└── reports/                   # Generated reports
    ├── reports.controller.ts
    └── reports.service.ts
```

**Command Side (Write)**:
```
modules/properties/
├── properties.controller.ts   # CRUD + state changes
└── properties.service.ts      # Business logic + validation
```

### Key Patterns

**Separate read models for dashboards**:
```typescript
// Query side - optimized for reads
@Controller('owner-dashboard')
export class DashboardController {
  @Get('summary')
  async getSummary() {
    // Uses denormalized views, caching
    return this.dashboardService.getSummary();
  }
}

// Command side - handles mutations
@Controller('properties')
export class PropertiesController {
  @Post()
  async create(@Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(dto);
  }
}
```

**Cache invalidation on writes**:
```typescript
// After successful mutation
queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
```

**Different validation strategies**:
- Queries: Minimal validation (just auth)
- Commands: Full Zod schema validation via DTOs

## Consequences

### Positive
- **Clear separation of concerns**: Read optimization separate from business logic
- **Easier caching**: Query endpoints can be aggressively cached
- **Simpler testing**: Read models tested with different strategies than commands
- **Performance**: Query endpoints optimized with database views/functions

### Negative
- **More files**: Separate controllers for dashboard vs CRUD
- **Duplication risk**: Some shared logic between read/write
- **Learning curve**: New developers must understand the separation

### Mitigations
- **Shared types**: `packages/shared/src/types/` for DTOs/responses
- **Consistent naming**: `*Controller` for HTTP, `*Service` for business logic
- **Documentation**: This ADR and CLAUDE.md explain the pattern

## References
- Martin Fowler's CQRS: https://martinfowler.com/bliki/CQRS.html
- `apps/backend/src/modules/owner-dashboard/` - Query side implementation
- `apps/backend/src/modules/properties/` - Command side implementation
