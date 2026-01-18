# ADR-0007: Module Architecture Recommendations

## Status

Accepted

## Context

TenantFlow's NestJS backend has grown to 26 modules. While most follow the single-responsibility principle, some have grown disproportionately large. This ADR documents the current architecture and recommends improvements.

### Current Module Inventory

| Module | Lines | Services | Controllers | Status |
|--------|-------|----------|-------------|--------|
| billing | 14,086 | 15 | 10 | Oversized (god module) |
| tenants | 12,259 | 16 | 4 | Oversized |
| leases | 10,201 | 10 | 6 | Large but acceptable |
| pdf | 8,600 | 8 | 3 | Acceptable (specialized) |
| financial | 5,283 | 7 | 6 | Good |
| rent-payments | 4,614 | 6 | 2 | Good |
| reports | 4,231 | 7 | 4 | Good |
| properties | 3,936 | 8 | 2 | Good |
| notifications | 3,603 | 7 | 3 | Good |
| analytics | 3,475 | 6 | 5 | Good |
| maintenance | 3,054 | 6 | 2 | Good |
| Others (15) | <3,000 | 1-4 | 1-2 | Good |

**Total:** 26 modules, ~80,000 lines of TypeScript

### Complexity Thresholds

Based on industry standards and maintainability:
- **Good:** <5,000 lines per module
- **Watch:** 5,000-8,000 lines
- **Action Required:** >8,000 lines

### Issues Identified

#### 1. Billing Module (God Module)

**Size:** 14,086 lines, 15 services, 10 controllers

**Current Structure:**
```
billing/
├── stripe.module.ts (root, imports sub-modules)
├── connect/
│   ├── connect.module.ts
│   ├── connect-setup.service.ts (514 lines)
│   ├── connect-billing.service.ts
│   ├── connect-payouts.service.ts
│   └── connect.controller.ts, payouts.controller.ts
├── subscriptions/
│   ├── subscriptions.module.ts
│   ├── subscription.service.ts
│   ├── payment-method.service.ts
│   └── subscription.controller.ts, payment-methods.controller.ts
├── webhooks/
│   ├── webhooks.module.ts
│   ├── webhook.service.ts
│   ├── webhook-processor.service.ts
│   └── handlers/ (4 specialized handlers)
└── (root services: 7 services, 5 controllers)
```

**Issues:**
- Sub-modules use `forwardRef()` indicating circular dependencies
- Root module still has 7 services (stripe, billing, sync, tenant, owner, customer, shared)
- Services like `stripe-tenant.service.ts` (489 lines) and `stripe-owner.service.ts` (422 lines) are role-based, not domain-based

#### 2. Tenants Module

**Size:** 12,259 lines, 16 services, 4 controllers

**Issues:**
- 16 services is excessive for a single domain
- Likely contains tenant-related queries that could be RPCs

#### 3. Circular Dependencies

**Location:** billing/ sub-modules

```
StripeModule ──forwardRef──► WebhooksModule
     ▲                           │
     └────────forwardRef─────────┘

SubscriptionsModule ──forwardRef──► StripeModule
```

This indicates shared services that should be extracted.

## Decision

### Recommendation 1: Extract Shared Stripe Services

**Problem:** `forwardRef` between billing sub-modules indicates shared dependencies.

**Solution:** Create `StripeSharedModule` with common services:
- `StripeService` (SDK wrapper)
- `StripeCustomerService`
- `StripeSharedService`

```
billing/
├── shared/
│   ├── stripe-shared.module.ts
│   ├── stripe.service.ts
│   ├── stripe-customer.service.ts
│   └── stripe-shared.service.ts
├── connect/
├── subscriptions/
└── webhooks/
```

**Benefit:** Eliminates `forwardRef`, clearer dependency graph.

### Recommendation 2: Split Billing Root Services by Domain

**Current root services:**
- `billing.service.ts` - General billing operations
- `stripe-sync.service.ts` - Data synchronization
- `stripe-tenant.service.ts` - Tenant-facing operations (489 lines)
- `stripe-owner.service.ts` - Owner-facing operations (422 lines)

**Proposed:**
- Move `stripe-tenant.service.ts` → `subscriptions/` (tenant subscription management)
- Move `stripe-owner.service.ts` → `connect/` (owner Connect operations)
- Keep `billing.service.ts` and `stripe-sync.service.ts` in root

**Result:** Root module shrinks to 2-3 services.

### Recommendation 3: Tenant Module Service Consolidation

**Current:** 16 services

**Analysis needed:** Review services for:
- Duplicate functionality
- Query logic that should be RPCs
- Services that should be merged

**Recommendation:** Audit and consolidate to 8-10 services (target: 50% reduction).

### Recommendation 4: Documentation Standard

**Current:** 25/28 modules lack README.md

**Recommendation:** Each module should have:
```markdown
# {Module} Module

## Purpose
Brief description of domain responsibility.

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/v1/{resource} | ... |

## Services
- `{Name}Service` - Responsibility

## Dependencies
- {ModuleName} - Why needed
```

## Implementation Strategy

### Phase 1: Documentation (Low risk)
1. Add README.md to all modules
2. Document current architecture
3. No code changes

### Phase 2: Extract Shared Stripe (Medium risk)
1. Create `billing/shared/` directory
2. Move shared services
3. Remove `forwardRef` usage
4. Verify no breaking changes

### Phase 3: Refactor Billing Root (Medium risk)
1. Move tenant services to subscriptions
2. Move owner services to connect
3. Update imports
4. Verify all tests pass

### Phase 4: Tenant Module Audit (Future)
1. Review 16 services
2. Identify consolidation opportunities
3. Execute merges
4. Update tests

## Consequences

### Positive

- **Reduced coupling:** Eliminating `forwardRef` makes dependencies explicit
- **Better discoverability:** Smaller modules are easier to navigate
- **Clearer boundaries:** Domain responsibilities become obvious
- **Easier testing:** Smaller modules have fewer dependencies to mock

### Negative

- **Migration effort:** Moving services requires updating imports
- **Risk of breakage:** Refactoring active code paths
- **Team coordination:** Changes affect multiple areas

### Trade-offs

- **Keeping billing monolithic:** Easier in short term, harder to maintain long term
- **Full module split:** Lower risk refactoring but more files to manage
- **This approach:** Balanced - extract shared, relocate by domain

## Module Size Guidelines

For future development:

| Metric | Good | Warning | Action |
|--------|------|---------|--------|
| Lines of code | <5,000 | 5,000-8,000 | >8,000 |
| Services | <8 | 8-12 | >12 |
| Controllers | <4 | 4-6 | >6 |

When a module exceeds warning thresholds:
1. Consider domain decomposition
2. Extract sub-modules
3. Move services to appropriate domains

## Related Decisions

- ADR-0004: Supabase Client Patterns
- ADR-0005: RPC Usage Patterns
- ADR-0006: API Response Standards

## References

- [NestJS Modules Documentation](https://docs.nestjs.com/modules)
- [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single_responsibility_principle)
- [Domain-Driven Design Module Boundaries](https://martinfowler.com/bliki/BoundedContext.html)

---
*Date: 2026-01-18*
*Author: Claude (automated via Phase 21)*
