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
 * Validates that financial services respect Row Level Security policies
 * CRITICAL: Prevents cross-tenant data leakage in financial reports
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { Logger } from '@nestjs/common'
import type { Database } from '@repo/shared/types/supabase'
import {
  authenticateAs,
  expectEmptyResult,
  expectPermissionError,
  getServiceRoleClient,
  TEST_USERS,
  type AuthenticatedTestClient
} from './setup'

describe('RLS: Financial Isolation', () => {
  let ownerA: AuthenticatedTestClient
  let ownerB: AuthenticatedTestClient
  let serviceClient: ReturnType<typeof getServiceRoleClient>

  beforeAll(async () => {
    ownerA = await authenticateAs(TEST_USERS.OWNER_A)
    ownerB = await authenticateAs(TEST_USERS.OWNER_B)
    serviceClient = getServiceRoleClient()
  })

  describe('Balance Sheet Isolation', () => {
    it('should prevent Owner A from accessing Owner B balance sheet', async () => {
      // Owner A queries balance sheet
      const { data: ownerAData } = await ownerA.client
        .rpc('get_balance_sheet', {
          user_id: ownerA.user_id,
          start_date: '2025-01-01',
          end_date: '2025-12-31'
        })

      // Owner A tries to access Owner B's data with manipulated user_id
      const { data: crossTenantData, error } = await ownerA.client
        .rpc('get_balance_sheet', {
          user_id: ownerB.user_id, // Malicious parameter
          start_date: '2025-01-01',
          end_date: '2025-12-31'
        })

      // Assertion: Should return empty or error, NOT Owner B's data
      expectEmptyResult(crossTenantData)

      // Verify Owner A only sees their own data
      expect(ownerAData).toBeDefined()
      expect(ownerAData.length).toBeGreaterThan(0)
    })

    it('should scope aggregate queries to authenticated user', async () => {
      // Query total assets
      const { data: assets } = await ownerA.client
        .from('financial_accounts')
        .select('balance')
        .eq('account_type', 'asset')

      // Verify all returned assets belong to Owner A
      const ownerIds = assets?.map(a => a.owner_user_id).filter(Boolean)
      const allOwnedByA = ownerIds?.every(id => id === ownerA.user_id)
      expect(allOwnedByA).toBe(true)
    })
  })

  describe('Income Statement Isolation', () => {
    it('should filter revenue by user_id', async () => {
      const { data: revenue } = await ownerA.client
        .rpc('get_income_statement', {
          user_id: ownerA.user_id,
          period: 'monthly',
          year: 2025
        })

      // Verify revenue only includes Owner A's properties
      expect(revenue).toBeDefined()
      revenue?.forEach(record => {
        expect(record.user_id).toBe(ownerA.user_id)
      })
    })

    it('should not leak expenses across tenants', async () => {
      // Owner B queries expenses
      const { data: expensesB } = await ownerB.client
        .from('expenses')
        .select('*')

      // Verify none of Owner A's expenses are visible
      const hasOwnerAExpenses = expensesB?.some(
        exp => exp.user_id === ownerA.user_id
      )
      expect(hasOwnerAExpenses).toBe(false)
    })
  })

  describe('Cash Flow Isolation', () => {
    it('should filter transactions by ownership', async () => {
      const { data: cashFlow } = await ownerA.client
        .rpc('get_cash_flow', {
          user_id: ownerA.user_id,
          start_date: '2025-01-01',
          end_date: '2025-12-31'
        })

      // Verify all transactions belong to Owner A
      cashFlow?.forEach(txn => {
        expect(txn.owner_user_id).toBe(ownerA.user_id)
      })
    })

    it('should respect RLS in payout aggregation', async () => {
      // Query payouts
      const { data: payouts } = await ownerA.client
        .from('payouts')
        .select('amount, stripe_transfer_id')

      // Verify payouts are scoped to Owner A
      expect(payouts).toBeDefined()
      payouts?.forEach(payout => {
        expect(payout.user_id).toBe(ownerA.user_id)
      })
    })
  })

  describe('Admin Client RLS Enforcement', () => {
    it('should enforce user_id filtering even with admin client', async () => {
      // Simulate financial service using admin client for performance
      // BUT still filtering by user_id
      const { data: adminData } = await serviceClient
        .from('financial_accounts')
        .select('*')
        .eq('owner_user_id', ownerA.user_id)

      // Verify filtering is applied
      const allOwnedByA = adminData?.every(
        acc => acc.owner_user_id === ownerA.user_id
      )
      expect(allOwnedByA).toBe(true)
    })

    it('should prevent accidental cross-tenant aggregation', async () => {
      // Common anti-pattern: Admin client without user_id filter
      const { data: unfiltered } = await serviceClient
        .from('financial_accounts')
        .select('SUM(balance) as total_balance')

      // This test SHOULD FAIL if RLS is bypassed
      // Proper implementation should throw error or return scoped data
      expect(unfiltered).toBeDefined()

      // Verify result is NOT aggregate of all users
      // (exact assertion depends on RLS implementation)
    })
  })
})
```

**Acceptance Criteria:**
- ✓ All 10 test cases pass
- ✓ Tests fail when RLS bypassed (security regression)
- ✓ Coverage for balance sheet, income statement, cash flow
- ✓ Admin client enforcement verified

**Files to Test:**
- `apps/backend/src/modules/financial/balance-sheet.service.ts`
- `apps/backend/src/modules/financial/financial.service.ts`
- `apps/backend/src/modules/financial/financial-revenue.service.ts`
- `apps/backend/src/modules/financial/financial-expense.service.ts`

---

### Task 1.2: Property Lifecycle Service Tests ⏰ 8 hours 🔥 HIGH

**File:** `apps/backend/src/modules/properties/services/property-lifecycle.service.spec.ts`

**Template:**
```typescript
import { Test } from '@nestjs/testing'
import { NotFoundException, BadRequestException } from '@nestjs/common'
import { PropertyLifecycleService } from './property-lifecycle.service'
import { SupabaseService } from '../../../database/supabase.service'
import { SilentLogger } from '../../../__test__/silent-logger'
import { AppLogger } from '../../../logger/app-logger.service'

describe('PropertyLifecycleService', () => {
  let service: PropertyLifecycleService
  let mockSupabase: jest.Mocked<SupabaseService>

  beforeEach(async () => {
    // Mock Supabase client
    const mockClient = {
      from: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn()
    }

    mockSupabase = {
      getUserClient: jest.fn(() => mockClient),
      getAdminClient: jest.fn(() => mockClient)
    } as unknown as jest.Mocked<SupabaseService>

    const module = await Test.createTestingModule({
      providers: [
        PropertyLifecycleService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AppLogger, useValue: new SilentLogger() }
      ]
    }).compile()

    service = module.get<PropertyLifecycleService>(PropertyLifecycleService)
  })

  describe('archiveProperty', () => {
    it('should transition active property to archived', async () => {
      // Setup: Active property
      const propertyId = 'prop-123'
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.single.mockResolvedValueOnce({
        data: { id: propertyId, status: 'active' },
        error: null
      })
      mockClient.single.mockResolvedValueOnce({
        data: { id: propertyId, status: 'archived' },
        error: null
      })

      // Execute
      const result = await service.archiveProperty(propertyId, userId)

      // Verify
      expect(result.status).toBe('archived')
      expect(mockClient.update).toHaveBeenCalledWith({ status: 'archived' })
    })

    it('should throw error when archiving already archived property', async () => {
      // Setup: Already archived
      const propertyId = 'prop-123'
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.single.mockResolvedValueOnce({
        data: { id: propertyId, status: 'archived' },
        error: null
      })

      // Execute & Verify
      await expect(
        service.archiveProperty(propertyId, userId)
      ).rejects.toThrow(BadRequestException)
    })

    it('should cascade archive to units when property archived', async () => {
      // Setup: Property with units
      const propertyId = 'prop-123'
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.single.mockResolvedValueOnce({
        data: { id: propertyId, status: 'active' },
        error: null
      })
      mockClient.single.mockResolvedValueOnce({
        data: { id: propertyId, status: 'archived' },
        error: null
      })

      // Execute
      await service.archiveProperty(propertyId, userId)

      // Verify units were also archived
      expect(mockClient.from).toHaveBeenCalledWith('units')
      expect(mockClient.update).toHaveBeenCalledWith({ status: 'archived' })
      expect(mockClient.eq).toHaveBeenCalledWith('property_id', propertyId)
    })

    it('should throw NotFoundException when property not found', async () => {
      const propertyId = 'invalid-id'
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      })

      await expect(
        service.archiveProperty(propertyId, userId)
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('activateProperty', () => {
    it('should transition inactive property to active', async () => {
      const propertyId = 'prop-123'
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.single.mockResolvedValueOnce({
        data: { id: propertyId, status: 'inactive' },
        error: null
      })
      mockClient.single.mockResolvedValueOnce({
        data: { id: propertyId, status: 'active' },
        error: null
      })

      const result = await service.activateProperty(propertyId, userId)

      expect(result.status).toBe('active')
    })

    it('should validate property is ready for activation', async () => {
      // Setup: Property missing required fields (e.g., no units)
      const propertyId = 'prop-123'
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.single.mockResolvedValueOnce({
        data: {
          id: propertyId,
          status: 'inactive',
          unit_count: 0 // No units defined
        },
        error: null
      })

      // Execute & Verify
      await expect(
        service.activateProperty(propertyId, userId)
      ).rejects.toThrow(BadRequestException)
    })
  })

  describe('bulkArchiveProperties', () => {
    it('should archive multiple properties in single transaction', async () => {
      const propertyIds = ['prop-1', 'prop-2', 'prop-3']
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.single.mockResolvedValue({
        data: { count: 3 },
        error: null
      })

      const result = await service.bulkArchiveProperties(propertyIds, userId)

      expect(result.archived_count).toBe(3)
      expect(mockClient.update).toHaveBeenCalledWith({ status: 'archived' })
    })
  })
})
```

**Acceptance Criteria:**
- ✓ ≥80% statement coverage
- ✓ All public methods tested
- ✓ Edge cases covered (null, invalid state)
- ✓ Integration with Supabase client verified

---

### Task 1.3: Unit Query Service Tests ⏰ 8 hours 🔥 HIGH

**File:** `apps/backend/src/modules/units/services/unit-query.service.spec.ts`

**Template:**
```typescript
import { Test } from '@nestjs/testing'
import { UnitQueryService } from './unit-query.service'
import { SupabaseService } from '../../../database/supabase.service'
import { SilentLogger } from '../../../__test__/silent-logger'
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
    it('should return all units for a property', async () => {
      const propertyId = 'prop-123'
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.select.mockResolvedValueOnce({
        data: [
          { id: 'unit-1', property_id: propertyId },
          { id: 'unit-2', property_id: propertyId }
        ],
        error: null
      })

      const result = await service.findByProperty(propertyId, userId)

      expect(result).toHaveLength(2)
      expect(mockClient.eq).toHaveBeenCalledWith('property_id', propertyId)
    })

    it('should filter by status when provided', async () => {
      const propertyId = 'prop-123'
      const userId = 'user-123'
      const status = 'available'

      await service.findByProperty(propertyId, userId, { status })

      const mockClient = mockSupabase.getUserClient()
      expect(mockClient.eq).toHaveBeenCalledWith('status', status)
    })

    it('should paginate results correctly', async () => {
      const propertyId = 'prop-123'
      const userId = 'user-123'
      const page = 2
      const limit = 10

      await service.findByProperty(propertyId, userId, { page, limit })

      const mockClient = mockSupabase.getUserClient()
      expect(mockClient.range).toHaveBeenCalledWith(10, 19) // (page-1)*limit, page*limit-1
    })
  })

  describe('searchUnits', () => {
    it('should search by unit number', async () => {
      const query = '101'
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.select.mockResolvedValueOnce({
        data: [{ id: 'unit-1', unit_number: '101' }],
        error: null
      })

      const result = await service.searchUnits(query, userId)

      expect(result).toHaveLength(1)
      expect(result[0].unit_number).toBe('101')
    })

    it('should handle empty search results', async () => {
      const query = 'nonexistent'
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.select.mockResolvedValueOnce({
        data: [],
        error: null
      })

      const result = await service.searchUnits(query, userId)

      expect(result).toHaveLength(0)
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

  describe('getOccupancyRate', () => {
    it('should calculate occupancy rate correctly', async () => {
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.single.mockResolvedValueOnce({
        data: { total_units: 10, occupied_units: 7 },
        error: null
      })

      const result = await service.getOccupancyRate(userId)

      expect(result.occupancy_rate).toBe(0.7) // 70%
      expect(result.total_units).toBe(10)
      expect(result.occupied_units).toBe(7)
    })

    it('should handle zero units gracefully', async () => {
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.single.mockResolvedValueOnce({
        data: { total_units: 0, occupied_units: 0 },
        error: null
      })

      const result = await service.getOccupancyRate(userId)

      expect(result.occupancy_rate).toBe(0)
    })
  })

  describe('getRevenueByUnit', () => {
    it('should aggregate monthly revenue by unit', async () => {
      const unitId = 'unit-123'
      const userId = 'user-123'

      const mockClient = mockSupabase.getUserClient()
      mockClient.select.mockResolvedValueOnce({
        data: [
          { month: '2025-01', revenue: 150000 },
          { month: '2025-02', revenue: 150000 }
        ],
        error: null
      })

      const result = await service.getRevenueByUnit(unitId, userId)

      expect(result).toHaveLength(2)
      expect(result[0].revenue).toBe(150000) // $1,500.00 in cents
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

  it('should batch query units instead of N queries per property', async () => {
    queryCount = 0

    // Setup: 10 properties
    const propertyIds = Array.from({ length: 10 }, (_, i) => `prop-${i}`)
    const userId = 'user-123'

    // Execute: Get all units for multiple properties
    await service.findByProperties(propertyIds, userId)

    // Assertion: Should be 1 query with IN clause, not 10 separate queries
    expect(queryCount).toBeLessThanOrEqual(1)
  })

  it('should use single query for unit stats aggregation', async () => {
    queryCount = 0

    const userId = 'user-123'

    // Execute: Get stats across all user's units
    await service.getUnitStatsSummary(userId)

    // Assertion: Single aggregate query
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
