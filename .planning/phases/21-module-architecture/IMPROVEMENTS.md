# Module Architecture Improvements

**Created:** 2026-01-18
**Purpose:** Track module architecture refactoring opportunities for future phases
**Reference:** ADR-0007 Module Architecture Recommendations

## Summary

| Priority | Count | Effort |
|----------|-------|--------|
| High | 2 | Medium |
| Medium | 3 | Medium-High |
| Low | 2 | Low |

## Improvements

### High Priority

#### IMP-001: Extract Shared Stripe Services

**Module:** billing
**Issue:** `forwardRef()` circular dependencies between StripeModule ↔ WebhooksModule ↔ SubscriptionsModule
**Impact:** Circular dependencies make the module harder to test and reason about

**Proposed Fix:**
1. Create `billing/shared/stripe-shared.module.ts`
2. Move: `stripe.service.ts`, `stripe-customer.service.ts`, `stripe-shared.service.ts`
3. Import `StripeSharedModule` into Connect, Subscriptions, Webhooks
4. Remove all `forwardRef()` usage

**Effort:** Medium (2-4 hours)
**Risk:** Low - internal refactor, no API changes
**Dependencies:** None

---

#### IMP-002: Relocate Role-Based Services

**Module:** billing
**Issue:** `stripe-tenant.service.ts` (489 lines) and `stripe-owner.service.ts` (422 lines) are role-based, not domain-based

**Proposed Fix:**
1. Move `stripe-tenant.service.ts` → `billing/subscriptions/`
2. Move `stripe-owner.service.ts` → `billing/connect/`
3. Update imports in controllers
4. Root billing module shrinks from 7 to 3 services

**Effort:** Medium (2-4 hours)
**Risk:** Low - service location change, no logic changes
**Dependencies:** IMP-001 (should be done first)

---

### Medium Priority

#### IMP-003: Tenant Module Service Consolidation

**Module:** tenants
**Issue:** 16 services is excessive for a single domain (12,259 lines total)
**Impact:** Hard to understand service boundaries, potential duplication

**Analysis Required:**
- Audit all 16 services
- Identify duplicate/overlapping functionality
- Consider moving query logic to RPCs

**Target:** Consolidate to 8-10 services (40-50% reduction)

**Effort:** High (8-16 hours) - requires analysis before execution
**Risk:** Medium - changing active code paths
**Dependencies:** Tenant module audit needed first

---

#### IMP-004: Leases Module Review

**Module:** leases
**Issue:** 10,201 lines with 10 services and 6 controllers
**Impact:** Approaching threshold, should be monitored

**Recommended Actions:**
1. Review for service consolidation opportunities
2. Consider extracting lease document generation to PDF module
3. Move complex lease calculations to RPCs

**Effort:** Medium (4-8 hours)
**Risk:** Low-Medium
**Dependencies:** None

---

#### IMP-005: PDF Module Specialization

**Module:** pdf
**Issue:** 8,600 lines - large but specialized
**Impact:** Currently acceptable, but verify all PDF logic is centralized

**Recommended Actions:**
1. Audit other modules for inline PDF generation
2. Move any PDF-related code to this module
3. Consider lazy-loading for performance

**Effort:** Medium (4-8 hours)
**Risk:** Low
**Dependencies:** None

---

### Low Priority

#### IMP-006: Module Documentation

**Modules:** All (25/28 lack README.md)
**Issue:** Modules lack documentation

**Proposed Fix:**
Add README.md to each module with:
- Purpose
- API endpoints
- Services and responsibilities
- Dependencies

**Effort:** Low (15-30 min per module × 25 = 6-12 hours total)
**Risk:** None - documentation only
**Dependencies:** None

---

#### IMP-007: Establish Module Monitoring

**Modules:** All
**Issue:** No automated tracking of module growth

**Proposed Fix:**
1. Add script to track module sizes
2. CI check warning when module exceeds 5k lines
3. CI check failing when module exceeds 8k lines

**Effort:** Low (2-4 hours)
**Risk:** None - tooling only
**Dependencies:** None

---

## Execution Order

**Recommended sequence:**

1. **IMP-001** (Extract Shared Stripe) - Eliminates circular deps
2. **IMP-002** (Relocate Role Services) - Shrinks billing root
3. **IMP-006** (Documentation) - Can be done anytime, low risk
4. **IMP-007** (Monitoring) - Prevents future issues
5. **IMP-003** (Tenant Consolidation) - Requires deeper analysis
6. **IMP-004** (Leases Review) - Monitor first, act if grows
7. **IMP-005** (PDF Centralization) - Low priority optimization

## Future Phases

These improvements can be addressed in:
- **Phase 24+:** Billing refactoring (IMP-001, IMP-002)
- **Phase 25+:** Tenant consolidation (IMP-003)
- **Ongoing:** Documentation and monitoring (IMP-006, IMP-007)

---
*Updated: 2026-01-18*
*Related: ADR-0007 Module Architecture*
