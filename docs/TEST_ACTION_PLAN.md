# Test Automation Action Plan - Prioritized Roadmap

**Project:** TenantFlow Property Management
**Status:** 🟡 Coverage at 50% (Target: 80%)
**Timeline:** 3 months (300 hours effort)

---

## Sprint 1 (Weeks 1-2): Critical Security & New Services

### Task 1.1: Financial RLS Security Tests ⏰ 16 hours 🔥 CRITICAL

**File:** `apps/backend/test/integration/rls/financial-isolation.integration.spec.ts`

**Template:**
```typescript
/**
 * Financial RLS Integration Tests
 * Validates expenses + maintenance_requests isolation via RLS policies.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import {
  authenticateAs,
  expectEmptyResult,
  expectPermissionError,
  isTestUserAvailable,
  shouldSkipRlsTests,
  TEST_USERS,
  type AuthenticatedTestClient
} from './setup'

const describeRls = shouldSkipRlsTests ? describe.skip : describe

type ExpenseRow = Database['public']['Tables']['expenses']['Row']
type MaintenanceRequestRow =
  Database['public']['Tables']['maintenance_requests']['Row']

type ExpenseWithOwner = ExpenseRow & {
  maintenance_requests?: Pick<MaintenanceRequestRow, 'owner_user_id'> | null
}

describeRls('RLS: Financial Isolation', () => {
  const testLogger = new Logger('RLSFinancialIsolationTest')
  let ownerA: AuthenticatedTestClient
  let ownerB: AuthenticatedTestClient | null = null
  let tenantA: AuthenticatedTestClient | null = null

  beforeAll(async () => {
    ownerA = await authenticateAs(TEST_USERS.OWNER_A)
    if (isTestUserAvailable('OWNER_B')) {
      ownerB = await authenticateAs(TEST_USERS.OWNER_B)
    }
    if (isTestUserAvailable('TENANT_A')) {
      tenantA = await authenticateAs(TEST_USERS.TENANT_A)
    }
  })

  it('owner A can read expenses and sees only their own records', async () => {
    const { data, error } = await ownerA.client
      .from('expenses')
      .select('id, maintenance_requests(owner_user_id)')

    expect(error).toBeNull()
    const rows = (data ?? []) as ExpenseWithOwner[]
    if (rows.length === 0) {
      testLogger.warn('Owner A has no expenses to validate ownership')
      return
    }

    rows.forEach(row => {
      expect(row.maintenance_requests?.owner_user_id).toBe(ownerA.user_id)
    })
  })

  it('owner A cannot read owner B expenses', async () => {
    if (!ownerB) return
    const { data: ownerBExpense } = await ownerB.client
      .from('expenses')
      .select('id')
      .limit(1)
      .maybeSingle()
    if (!ownerBExpense) return

    const { data, error } = await ownerA.client
      .from('expenses')
      .select('id')
      .eq('id', ownerBExpense.id)

    if (error) {
      expectPermissionError(error, 'owner A querying owner B expense')
    } else {
      expectEmptyResult(data, 'owner A querying owner B expense')
    }
  })

  it('owner A can read maintenance requests and sees only their own records', async () => {
    const { data, error } = await ownerA.client
      .from('maintenance_requests')
      .select('id, owner_user_id')

    expect(error).toBeNull()
    const rows = (data ?? []) as MaintenanceRequestRow[]
    if (rows.length === 0) {
      testLogger.warn('Owner A has no maintenance requests to validate ownership')
      return
    }

    rows.forEach(row => {
      expect(row.owner_user_id).toBe(ownerA.user_id)
    })
  })

  it('tenant cannot read expenses', async () => {
    if (!tenantA) return
    const { data, error } = await tenantA.client
      .from('expenses')
      .select('id')
      .limit(1)

    if (error) {
      expectPermissionError(error, 'tenant querying expenses')
    } else {
      expectEmptyResult(data, 'tenant querying expenses')
    }
  })
})
```

**Acceptance Criteria:**
- ✓ Expenses + maintenance_requests isolation validated
- ✓ Cross-tenant access returns empty or permission error
- ✓ Tenant expense access blocked
- ✓ Tests skip cleanly when optional users/RLS flags are missing

**Files to Test:**
- `apps/backend/test/integration/rls/financial-isolation.integration.spec.ts`

---

### Task 1.2: Property Lifecycle Service Tests ⏰ 8 hours 🔥 HIGH

**File:** `apps/backend/src/modules/properties/services/property-lifecycle.service.spec.ts`

**Template:**
```typescript
import { Test } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { PropertyLifecycleService } from './property-lifecycle.service'
import { SupabaseService } from '../../../database/supabase.service'
import { PropertyCacheInvalidationService } from './property-cache-invalidation.service'
import { PropertiesService } from '../properties.service'
import { SilentLogger } from '../../../__tests__/silent-logger'
import { AppLogger } from '../../../logger/app-logger.service'

describe('PropertyLifecycleService', () => {
  let service: PropertyLifecycleService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PropertyLifecycleService,
        { provide: SupabaseService, useValue: { getUserClient: jest.fn() } },
        { provide: PropertiesService, useValue: { findOne: jest.fn() } },
        {
          provide: PropertyCacheInvalidationService,
          useValue: { invalidatePropertyCaches: jest.fn() }
        },
        { provide: AppLogger, useValue: new SilentLogger() }
      ]
    }).compile()

    service = module.get<PropertyLifecycleService>(PropertyLifecycleService)
  })

  describe('remove', () => {
    it('soft deletes property and invalidates caches', async () => {
      // assert update payload includes status: inactive + updated_at
    })

    it('throws when auth token is missing', async () => {
      await expect(
        service.remove({} as never, 'prop-1')
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('markAsSold', () => {
    it('marks property as sold with date + price', async () => {
      // assert status, date_sold, sale_price set and message formatted
    })

    it('throws when property not found', async () => {
      await expect(
        service.markAsSold({} as never, 'prop-1', new Date(), 100000)
      ).rejects.toThrow(BadRequestException)
    })
  })
})
```

**Acceptance Criteria:**
- ✓ ≥80% statement coverage
- ✓ remove + markAsSold covered (success + error cases)
- ✓ Edge cases covered (missing token, missing property, DB error)
- ✓ Cache invalidation verified on remove

---

### Task 1.3: Unit Query Service Tests ⏰ 8 hours 🔥 HIGH

**File:** `apps/backend/src/modules/units/services/unit-query.service.spec.ts`

**Template:**
```typescript
import { Test } from '@nestjs/testing'
import { UnitQueryService } from './unit-query.service'
import { SupabaseService } from '../../../database/supabase.service'
import { SilentLogger } from '../../../__tests__/silent-logger'
import { AppLogger } from '../../../logger/app-logger.service'

describe('UnitQueryService', () => {
  let service: UnitQueryService
  let mockSupabase: jest.Mocked<SupabaseService>

  beforeEach(async () => {
    const mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis()
    }

    mockSupabase = {
      getUserClient: jest.fn(() => mockClient)
    } as unknown as jest.Mocked<SupabaseService>

    const module = await Test.createTestingModule({
      providers: [
        UnitQueryService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AppLogger, useValue: new SilentLogger() }
      ]
    }).compile()

    service = module.get<UnitQueryService>(UnitQueryService)
  })

  describe('findByProperty', () => {
    it('should return units for a property in unit_number order', async () => {
      const result = await service.findByProperty('mock-token', 'property-123')
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('findAll', () => {
    it('applies filters, pagination, and sorting', async () => {
      await service.findAll('mock-token', {
        property_id: 'property-123',
        status: 'available',
        search: 'A1',
        limit: 25,
        offset: 50,
        sortBy: 'unit_number',
        sortOrder: 'asc'
      })
    })
  })

  describe('findOne', () => {
    it('throws when unit is missing or token is missing', async () => {
      await expect(service.findOne('', 'unit-1')).rejects.toThrow()
      await expect(service.findOne('mock-token', '')).rejects.toThrow()
    })
  })

  describe('getAvailable', () => {
    it('returns available units for property', async () => {
      const result = await service.getAvailable('mock-token', 'property-123')
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
```

---

### Task 1.4: Unit Stats Service Tests ⏰ 8 hours 🔥 HIGH

**File:** `apps/backend/src/modules/units/services/unit-stats.service.spec.ts`

**Template:**
```typescript
import { Test } from '@nestjs/testing'
import { UnitStatsService } from './unit-stats.service'
import { SupabaseService } from '../../../database/supabase.service'

describe('UnitStatsService', () => {
  let service: UnitStatsService
  let mockSupabase: jest.Mocked<SupabaseService>

  beforeEach(async () => {
    // Setup mocks
    const mockClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }

    mockSupabase = {
      getUserClient: jest.fn(() => mockClient)
    } as unknown as jest.Mocked<SupabaseService>

    const module = await Test.createTestingModule({
      providers: [
        UnitStatsService,
        { provide: SupabaseService, useValue: mockSupabase }
      ]
    }).compile()

    service = module.get<UnitStatsService>(UnitStatsService)
  })

  describe('getStats', () => {
    it('calculates totals, occupancy, and rent metrics', async () => {
      const result = await service.getStats('mock-token')
      expect(result).toHaveProperty('occupancyRate')
      expect(result).toHaveProperty('totalPotentialRent')
    })

    it('throws when token is missing', async () => {
      await expect(service.getStats('')).rejects.toThrow()
    })
  })

  describe('getAnalytics', () => {
    it('returns analytics rows and supports property filter', async () => {
      const result = await service.getAnalytics('mock-token', {
        timeframe: '12m',
        property_id: 'property-123'
      })
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getUnitStatistics', () => {
    it('combines stats + analytics into summary/breakdown', async () => {
      const result = await service.getUnitStatistics('mock-token')
      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('financial')
    })
  })
})
```

---

### Task 1.5: N+1 Query Prevention Tests ⏰ 8 hours 🔥 HIGH

**File:** `apps/backend/src/modules/units/services/unit-query.service.n1.spec.ts`

**Template:**
```typescript
import { Test } from '@nestjs/testing'
import { UnitQueryService } from './unit-query.service'
import { SupabaseService } from '../../../database/supabase.service'

describe('UnitQueryService - N+1 Prevention', () => {
  let service: UnitQueryService
  let queryCount: number

  beforeEach(async () => {
    queryCount = 0

    // Create mock client that tracks query count
    const createMockClient = () => {
      const mockClient = {
        from: jest.fn().mockImplementation(() => {
          queryCount++ // Count each .from() call
          return mockClient
        }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis()
      }
      return mockClient
    }

    const mockSupabase = {
      getUserClient: jest.fn().mockReturnValue(createMockClient())
    } as unknown as jest.Mocked<SupabaseService>

    const module = await Test.createTestingModule({
      providers: [
        UnitQueryService,
        { provide: SupabaseService, useValue: mockSupabase }
      ]
    }).compile()

    service = module.get<UnitQueryService>(UnitQueryService)
  })

  it('findAll uses a single query', async () => {
    await service.findAll('mock-token', { status: 'available' })
    expect(queryCount).toBe(1)
  })

  it('findByProperty uses a single query', async () => {
    await service.findByProperty('mock-token', 'property-123')
    expect(queryCount).toBe(1)
  })

  it('getAvailable uses a single query', async () => {
    await service.getAvailable('mock-token', 'property-123')
    expect(queryCount).toBe(1)
  })

  it('findOne uses a single query', async () => {
    await service.findOne('mock-token', 'unit-123')
    expect(queryCount).toBe(1)
  })
})
```

---

## Sprint 2 (Weeks 3-4): Integration Tests & Coverage Increase

### Task 2.1: Billing Subscription Integration Tests ⏰ 15 hours 📈 MEDIUM

**File:** `apps/backend/test/integration/billing-subscription-lifecycle.integration.spec.ts`

**Test Cases:**
- Create subscription with valid payment method
- Update subscription plan (upgrade/downgrade)
- Cancel subscription (immediate vs. end of period)
- Reactivate canceled subscription
- Handle failed payment webhook
- Verify RLS in subscription queries

---

### Task 2.2: Payment Processing Integration Tests ⏰ 15 hours 📈 MEDIUM

**File:** `apps/backend/test/integration/payment-processing-e2e.integration.spec.ts`

**Test Cases:**
- Create PaymentIntent → Stripe webhook → Database update → Notification
- Handle successful payment webhook
- Handle failed payment webhook
- Refund processing workflow
- Dispute handling workflow
- Payment method update flow

---

### Task 2.3: Increase Backend Coverage (billing module) ⏰ 32 hours 📈 MEDIUM

**Target:** billing/ module from 20% → 80% (+60%)

**Files to Test:**
```
apps/backend/src/modules/billing/
├── stripe-customer.service.spec.ts (NEW)
├── stripe-payment-method.service.spec.ts (NEW)
├── stripe-subscription.service.spec.ts (NEW)
├── stripe.service.spec.ts (enhance existing)
└── webhook-processor.service.spec.ts (enhance existing)
```

**Strategy:**
1. Run coverage: `pnpm test:unit:coverage`
2. Open `coverage/index.html` → Navigate to `billing/`
3. Identify untested functions (red lines)
4. Add tests: happy path → validation errors → edge cases

---

## Sprint 3 (Weeks 5-6): Coverage Push & TDD Adoption

### Task 3.1: Increase Backend Coverage (properties module) ⏰ 24 hours 📈 MEDIUM

**Target:** properties/ module from 23% → 80% (+57%)

**Files to Test:**
```
apps/backend/src/modules/properties/services/
├── property-analytics.service.spec.ts (NEW)
├── property-bulk-import.service.spec.ts (NEW)
├── property-financial-analytics.service.spec.ts (NEW)
├── property-maintenance-analytics.service.spec.ts (NEW)
└── property-occupancy-analytics.service.spec.ts (NEW)
```

---

### Task 3.2: Implement TDD Process & Training ⏰ 0 hours (process change) 📈 MEDIUM

**Changes:**
1. **Pre-commit Hook:** Require test file when adding service file
2. **PR Template:** Add checklist "Tests written BEFORE implementation?"
3. **Team Training:** 2-hour TDD workshop with live coding

**Example Workflow:**
```bash
# 1. RED: Write failing test first
git add property-lifecycle.service.spec.ts
git commit -m "test: add failing test for property archival"

# 2. GREEN: Implement feature
git add property-lifecycle.service.ts
git commit -m "feat: implement property archival logic"

# 3. REFACTOR: Clean up
git commit -m "refactor: extract validation to helper"
```

---

## Sprint 4-6 (Weeks 7-12): Long-Term Quality Improvements

### Task 4.1: Property-Based Testing Expansion ⏰ 60 hours 🎯 LOW

**Target:** 17 → 50 property-based tests

**Focus Areas:**
- Rent calculations (prorated rent, late fees)
- Lease term validation
- Financial aggregations
- Date range queries

---

### Task 4.2: Visual Regression Testing ⏰ 40 hours 🎯 LOW

**Tools:** Playwright + Percy/Chromatic

**Coverage:**
- Dashboard layouts (owner/tenant)
- Property cards (grid/list views)
- Financial reports (charts, tables)
- Mobile responsive breakpoints

---

### Task 4.3: Accessibility Testing ⏰ 32 hours 🎯 MEDIUM

**Tools:** axe-core + Playwright

**Coverage:**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatibility

---

## Progress Tracking Template

### Weekly Scorecard

```markdown
## Week [X] Testing Progress

### Coverage Metrics
- Backend Coverage: [X]% (Last week: [Y]%, Target: 80%)
- Frontend Coverage: [X]% (Last week: [Y]%, Target: 80%)
- Integration Tests: [X] tests (Last week: [Y], Target: 50)

### Tests Added This Week
- [ ] Financial RLS tests (10 cases)
- [ ] Property lifecycle tests (8 cases)
- [ ] Unit query service tests (6 cases)
- [ ] N+1 prevention tests (4 cases)

### Blockers
- None / [Describe blocker]

### Next Week Plan
- [Task 1]
- [Task 2]
- [Task 3]
```

---

## Definition of Done Checklist

**For Every New Service:**
- [ ] Unit test file created BEFORE implementation
- [ ] ≥80% statement coverage
- [ ] All public methods tested
- [ ] Edge cases covered (null, validation, errors)
- [ ] N+1 prevention test if applicable
- [ ] Integration test if critical path

**For Every PR:**
- [ ] All tests pass (unit, integration, E2E)
- [ ] Coverage does not decrease
- [ ] No new security warnings
- [ ] Test file changes reviewed by tech lead

---

## Success Metrics (3-Month Goals)

| Metric | Baseline | Month 1 | Month 2 | Month 3 (Target) |
|--------|----------|---------|---------|------------------|
| Backend Coverage | 50% | 60% | 70% | 80% |
| Integration Tests | 19 | 25 | 35 | 50 |
| Security Tests | 4 | 6 | 8 | 12 |
| N+1 Tests | 2 | 5 | 10 | 20 |
| TDD Adoption | 10% | 25% | 40% | 70% |
| Test Deletions | 1,015 YTD | <10/month | <5/month | <5/month |

---

## Resource Allocation

**Sprint 1 (Critical):**
- Engineer 1 (Senior): Financial RLS tests (16h) + Property lifecycle (8h) = 24h
- Engineer 2 (Mid): Unit query (8h) + Unit stats (8h) + N+1 tests (8h) = 24h
- **Total:** 48 hours

**Sprint 2-3 (Coverage Push):**
- Engineer 1: Integration tests (30h) + Billing coverage (32h) = 62h
- Engineer 2: Properties coverage (24h) + Frontend coverage (24h) = 48h
- **Total:** 110 hours

**Sprint 4-6 (Long-Term):**
- Engineer 1: Property-based tests (60h) + Accessibility (32h) = 92h
- Engineer 2: Visual regression (40h) + E2E expansion (20h) = 60h
- **Total:** 152 hours

**Grand Total: 310 hours (~3 months with 2 engineers)**

---

## Conclusion

This action plan prioritizes:
1. **Security first** (Financial RLS tests)
2. **New service coverage** (Property lifecycle, unit query/stats)
3. **Performance** (N+1 prevention)
4. **Coverage targets** (80% backend/frontend)
5. **Cultural shift** (TDD adoption)

Execute in order: Sprint 1 is CRITICAL, Sprints 2-3 are HIGH priority, Sprints 4-6 are long-term quality improvements.

**Next Steps:**
1. Review this plan with team
2. Assign Sprint 1 tasks
3. Set up weekly progress tracking
4. Schedule TDD training workshop
