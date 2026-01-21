# API Response Inconsistencies

**Created:** 2026-01-18
**Purpose:** Track API response format deviations for future standardization
**Standard:** See ADR-0006 for expected patterns

## Summary

| Priority | Count | Impact |
|----------|-------|--------|
| Medium | 4 | Frontend must handle multiple response shapes |
| Low | 3 | Minor inconsistencies, low user impact |

## Inconsistencies

### Medium Priority

#### 1. Tenants List Missing Pagination Fields

**File:** `apps/backend/src/modules/tenants/tenants.controller.ts`
**Endpoint:** `GET /tenants`
**Current:** `{ data, total }`
**Expected:** `{ data, total, limit, offset, hasMore }`
**Impact:** Frontend cannot determine pagination state

```typescript
// Current (line ~90)
return {
  data,
  total: data.length
}

// Expected
return {
  data,
  total: data.length,
  limit: query.limit ?? 10,
  offset: query.offset ?? 0,
  hasMore: data.length >= (query.limit ?? 10)
}
```

#### 2. Leases Controller Spreads Service Result

**File:** `apps/backend/src/modules/leases/leases.controller.ts`
**Endpoint:** `GET /leases`
**Current:** `{ ...data, hasMore }` (spreads service result)
**Expected:** Controller should construct full response
**Impact:** Response structure depends on service implementation

```typescript
// Current (line ~76-79)
return {
  ...data,
  hasMore: data.data.length >= data.limit
}

// Expected - explicit construction
return {
  data: data.data,
  total: data.total,
  limit: data.limit,
  offset: data.offset,
  hasMore: data.data.length >= data.limit
}
```

#### 3. Rent Payments Uses Custom Wrappers

**File:** `apps/backend/src/modules/rent-payments/rent-payments.controller.ts`
**Endpoints:** Multiple
**Current:** Mix of `{ success: true, analytics }`, `{ payments: [...] }`, `{ failedAttempts: [...] }`
**Expected:** Consistent response shapes
**Impact:** Frontend needs endpoint-specific handling

| Endpoint | Current | Expected |
|----------|---------|----------|
| `GET /analytics` | `{ success: true, analytics }` | `analytics` (raw) or standard wrapper |
| `GET /history` | `{ payments: [...] }` | `{ data: [...], total, ... }` |
| `GET /failed-attempts` | `{ failedAttempts: [...] }` | `{ data: [...], total, ... }` |

#### 4. Reports Wrapper Differs from Others

**File:** `apps/backend/src/modules/reports/reports.controller.ts`
**Endpoints:** All report endpoints
**Current:** `{ success: true, data }` for all reports
**Expected:** `data` (raw) for detail-like responses
**Impact:** Minor - consistent within domain, differs from other modules

### Low Priority

#### 5. Analytics Simple Success Response

**File:** `apps/backend/src/modules/analytics/analytics.controller.ts`
**Endpoints:** POST endpoints
**Current:** `{ success: true }`
**Expected:** Same (acceptable for fire-and-forget analytics)
**Impact:** None - appropriate for async event ingestion

#### 6. Stripe Controller Returns Custom Objects

**File:** `apps/backend/src/modules/billing/stripe.controller.ts`
**Endpoint:** `GET /stripe/account`
**Current:** Custom subset of Stripe account object
**Expected:** Same (intentional data filtering)
**Impact:** None - security-conscious filtering

#### 7. Stripe Balance Returns Raw Stripe Object

**File:** `apps/backend/src/modules/billing/stripe.controller.ts`
**Endpoint:** `GET /stripe/account/balance`
**Current:** Raw Stripe balance object
**Expected:** Same (pass-through to typed Stripe response)
**Impact:** None - Stripe types are well-documented

## Not Inconsistencies

The following patterns are **correct** per ADR-0006:

| Pattern | Controllers | Status |
|---------|-------------|--------|
| Full paginated response | properties, units, maintenance | Compliant |
| Raw object for details | All controllers | Compliant |
| `{ message }` for deletes | properties, tenants, units, leases, maintenance | Compliant |

## Recommendations

### Immediate Actions (None)

Per Phase 20 scope, no code changes are required. This document is for future reference.

### Future Consideration

If standardizing responses becomes a priority:

1. **Update tenants.controller.ts** to include full pagination fields
2. **Refactor leases.controller.ts** to construct response explicitly
3. **Consider rent-payments response standardization** when updating frontend
4. **Keep reports pattern** (consistent within domain, low impact)

### Breaking Change Warning

Any changes to response formats may require frontend updates. Coordinate with frontend team before implementing fixes.

---
*Updated: 2026-01-18*
*Related: ADR-0006 API Response Standards*
