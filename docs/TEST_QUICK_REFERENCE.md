# Test Automation Quick Reference

**Last Updated:** December 29, 2025
**Quick Access:** Commands, patterns, and cheat sheet for TenantFlow testing

---

## 🚀 Common Commands

### Run Tests

```bash
# All tests (unit + integration + E2E)
pnpm test:all

# Unit tests only (fast)
pnpm test:unit
pnpm test:unit:backend   # Backend only (Jest)
pnpm test:unit:frontend  # Frontend only (Vitest)

# Integration tests
pnpm test:integration

# E2E tests (Playwright)
pnpm test:e2e
pnpm test:e2e:ui        # With Playwright UI
pnpm test:e2e:debug     # Debug mode

# Watch mode (auto-rerun on file change)
pnpm test:unit:watch

# Coverage report
pnpm test:unit:coverage
# Open: apps/backend/coverage/index.html
```

### Run Single Test File

```bash
# Backend (Jest)
pnpm --filter @repo/backend test:unit -- --testPathPattern="properties.service"
pnpm --filter @repo/backend test:unit -- src/modules/billing/stripe.service.spec.ts

# Frontend (Vitest)
pnpm --filter @repo/frontend test:unit src/hooks/__tests__/use-tenant.test.ts

# E2E (Playwright)
cd apps/e2e-tests
npx playwright test tests/owner/owner-dashboard.e2e.spec.ts
```

### Debug Failing Test

```bash
# Backend: Add --verbose to see full output
pnpm --filter @repo/backend test:unit -- --verbose --testPathPattern="failing-test"

# Frontend: Run single test with console output
pnpm --filter @repo/frontend test:unit -- --reporter=verbose path/to/test.ts

# E2E: Debug mode with browser UI
cd apps/e2e-tests
npx playwright test --debug tests/owner/owner-dashboard.e2e.spec.ts
```

---

## 📋 Test File Naming Conventions

| Type | Location | Naming |
|------|----------|--------|
| Backend Unit | `apps/backend/src/modules/**/*.spec.ts` | `service-name.service.spec.ts` |
| Backend Integration | `apps/backend/test/integration/**/*.spec.ts` | `feature-name.integration.spec.ts` |
| Backend Property-Based | `apps/backend/src/modules/**/*.property.spec.ts` | `feature-name.property.spec.ts` |
| Backend N+1 Prevention | `apps/backend/src/modules/**/*.n1.spec.ts` | `service-name.n1.spec.ts` |
| Frontend Unit | `apps/frontend/src/**/__tests__/*.test.tsx` | `component-name.test.tsx` |
| E2E | `apps/e2e-tests/tests/**/*.e2e.spec.ts` | `feature-name.e2e.spec.ts` |
| Smoke | `apps/e2e-tests/tests/smoke/**/*.smoke.spec.ts` | `feature-name.smoke.spec.ts` |

---

## 🧪 Test Patterns & Templates

### Backend Unit Test (NestJS Service)

```typescript
import { Test } from '@nestjs/testing'
import { MyService } from './my.service'
import { SupabaseService } from '../../database/supabase.service'
import { SilentLogger } from '../../__test__/silent-logger'
import { AppLogger } from '../../logger/app-logger.service'

describe('MyService', () => {
  let service: MyService
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
      getUserClient: jest.fn(() => mockClient),
      getAdminClient: jest.fn(() => mockClient)
    } as unknown as jest.Mocked<SupabaseService>

    // Create test module
    const module = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: AppLogger, useValue: new SilentLogger() }
      ]
    }).compile()

    service = module.get<MyService>(MyService)
  })

  describe('methodName', () => {
    it('should return expected result for valid input', async () => {
      // Arrange
      const input = { id: '123' }
      const expectedOutput = { id: '123', name: 'Test' }

      mockSupabase.getUserClient().single.mockResolvedValueOnce({
        data: expectedOutput,
        error: null
      })

      // Act
      const result = await service.methodName(input)

      // Assert
      expect(result).toEqual(expectedOutput)
      expect(mockSupabase.getUserClient().from).toHaveBeenCalledWith('table_name')
    })

    it('should throw NotFoundException when record not found', async () => {
      // Arrange
      mockSupabase.getUserClient().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' }
      })

      // Act & Assert
      await expect(service.methodName({ id: 'invalid' }))
        .rejects.toThrow(NotFoundException)
    })
  })
})
```

---

### Backend Integration Test (RLS)

```typescript
import { describe, it, expect, beforeAll } from '@jest/globals'
import { authenticateAs, TEST_USERS } from './setup'

describe('RLS: Feature Isolation', () => {
  let ownerA: AuthenticatedTestClient
  let ownerB: AuthenticatedTestClient

  beforeAll(async () => {
    ownerA = await authenticateAs(TEST_USERS.OWNER_A)
    ownerB = await authenticateAs(TEST_USERS.OWNER_B)
  })

  it('should prevent Owner A from accessing Owner B data', async () => {
    // Attempt cross-tenant access
    const { data, error } = await ownerA.client
      .from('properties')
      .select('*')
      .eq('owner_user_id', ownerB.user_id) // Malicious query

    // Verify RLS blocked access
    expect(data).toEqual([]) // Empty result
  })
})
```

---

### Frontend Component Test (Vitest + React Testing Library)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from './my-component'

describe('MyComponent', () => {
  it('should render with provided props', () => {
    render(<MyComponent title="Test Title" />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('should call onClick handler when button clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<MyComponent onClick={handleClick} />)

    await user.click(screen.getByRole('button', { name: /submit/i }))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should show loading state while fetching data', async () => {
    render(<MyComponent />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })
  })
})
```

---

### E2E Test (Playwright)

```typescript
import { test, expect } from '@playwright/test'

test.describe('Owner Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', process.env.E2E_OWNER_EMAIL!)
    await page.fill('input[type="password"]', process.env.E2E_OWNER_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('should display property count on dashboard', async ({ page }) => {
    await page.goto('/dashboard')

    // Wait for data to load
    await page.waitForSelector('[data-testid="total-properties"]')

    const propertyCount = await page.locator('[data-testid="total-properties"]').textContent()
    expect(propertyCount).not.toBe('0')
  })

  test('should navigate to properties page when clicking properties card', async ({ page }) => {
    await page.goto('/dashboard')

    await page.click('[data-testid="properties-card"]')

    await expect(page).toHaveURL('/properties')
  })
})
```

---

### Property-Based Test (fast-check)

```typescript
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { calculateProratedRent } from './rent-calculator'

describe('Rent Calculation Properties', () => {
  it('prorated rent should never exceed monthly rent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 5000 }), // monthlyRent
        fc.integer({ min: 1, max: 31 }),      // daysInMonth
        fc.integer({ min: 1, max: 31 }),      // daysOccupied
        (monthlyRent, daysInMonth, daysOccupied) => {
          const prorated = calculateProratedRent(monthlyRent, daysOccupied, daysInMonth)

          // Property: Prorated ≤ Monthly
          expect(prorated).toBeLessThanOrEqual(monthlyRent)
        }
      )
    )
  })

  it('prorated rent should be proportional to days occupied', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 5000 }),
        fc.integer({ min: 1, max: 31 }),
        fc.integer({ min: 1, max: 31 }),
        (monthlyRent, daysInMonth, daysOccupied) => {
          fc.pre(daysOccupied <= daysInMonth) // Precondition

          const prorated = calculateProratedRent(monthlyRent, daysOccupied, daysInMonth)
          const expectedRatio = daysOccupied / daysInMonth

          // Property: Ratio matches
          expect(prorated / monthlyRent).toBeCloseTo(expectedRatio, 2)
        }
      )
    )
  })
})
```

---

### N+1 Query Prevention Test

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals'
import { Test } from '@nestjs/testing'
import { MyService } from './my.service'
import { SupabaseService } from '../../database/supabase.service'

describe('MyService - N+1 Prevention', () => {
  let service: MyService
  let queryCount: number

  beforeEach(async () => {
    queryCount = 0

    // Mock client that tracks query count
    const createMockClient = () => {
      const mockClient = {
        from: jest.fn().mockImplementation(() => {
          queryCount++ // Count each query
          return mockClient
        }),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis()
      }
      return mockClient
    }

    const mockSupabase = {
      getUserClient: jest.fn().mockReturnValue(createMockClient())
    } as unknown as jest.Mocked<SupabaseService>

    const module = await Test.createTestingModule({
      providers: [
        MyService,
        { provide: SupabaseService, useValue: mockSupabase }
      ]
    }).compile()

    service = module.get<MyService>(MyService)
  })

  it('should use batch query instead of N queries', async () => {
    queryCount = 0

    // Setup: 10 items that could trigger N+1
    const items = Array.from({ length: 10 }, (_, i) => `item-${i}`)

    await service.getDataForItems(items)

    // Assertion: Should be 1 query (batch), not 10 (one per item)
    expect(queryCount).toBeLessThanOrEqual(1)
  })
})
```

---

## 🎯 Testing Checklist

### Before Every Commit

- [ ] All tests pass locally (`pnpm test:unit`)
- [ ] No new TypeScript errors (`pnpm typecheck`)
- [ ] No new linting errors (`pnpm lint`)
- [ ] Tests added for new features
- [ ] Coverage does not decrease

### Before Every PR

- [ ] All CI checks pass (unit, integration, E2E)
- [ ] Coverage report reviewed
- [ ] Security tests added if applicable (RLS, auth)
- [ ] N+1 prevention test if query-heavy
- [ ] E2E test for user-facing features

### For New Services

- [ ] Unit test file created BEFORE implementation
- [ ] ≥80% statement coverage
- [ ] All public methods tested
- [ ] Edge cases covered (null, validation errors)
- [ ] Integration test if critical path
- [ ] RLS test if data isolation required

---

## 🔍 Debugging Tips

### Test Fails Intermittently (Flaky)

**Common Causes:**
1. Race conditions (async/await missing)
2. Shared state between tests (not cleaning up)
3. Timing issues (hardcoded timeouts)

**Solutions:**
```typescript
// ✅ GOOD: Properly await async operations
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})

// ❌ BAD: Hardcoded timeout
await new Promise(resolve => setTimeout(resolve, 1000))

// ✅ GOOD: Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  cleanup()
})
```

---

### Test Fails in CI but Passes Locally

**Common Causes:**
1. Environment variables missing
2. Different database state
3. Timezone differences

**Solutions:**
```typescript
// ✅ GOOD: Mock environment variables
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:4600'

// ✅ GOOD: Reset database state
beforeEach(async () => {
  await cleanupTestData()
})

// ✅ GOOD: Use UTC for date comparisons
const date = new Date().toISOString() // Always UTC
```

---

### Mock Not Working

**Common Issues:**
```typescript
// ❌ BAD: Mock after import
import { myFunction } from './my-module'
jest.mock('./my-module')

// ✅ GOOD: Mock before import
jest.mock('./my-module')
import { myFunction } from './my-module'

// ❌ BAD: Mock doesn't match implementation
jest.fn().mockReturnValue('string') // But actual returns Promise

// ✅ GOOD: Match async/sync behavior
jest.fn().mockResolvedValue('string') // For Promise
```

---

## 📊 Coverage Targets

| Layer | Target | Enforcement |
|-------|--------|-------------|
| Backend Unit | 80% | CI fails if <80% |
| Frontend Unit | 80% | CI fails if <80% |
| Integration | 50+ tests | Manual review |
| E2E Critical Paths | 100% | Manual review |

**View Coverage Report:**
```bash
# Backend
pnpm test:unit:coverage
open apps/backend/coverage/index.html

# Frontend
cd apps/frontend
pnpm test:unit --coverage
open coverage/index.html
```

---

## 🚨 Critical Test Areas (Must Have Tests)

1. **Security (RLS)**
   - Cross-tenant data isolation
   - Admin client user_id filtering
   - Auth token validation

2. **Financial (Money Accuracy)**
   - Rent calculations
   - Payment processing
   - Revenue aggregation
   - Late fee calculation

3. **State Transitions**
   - Property lifecycle (active → inactive → archived)
   - Lease status changes
   - Payment status updates

4. **Performance (N+1)**
   - List queries with pagination
   - Aggregate queries with joins
   - Nested data fetching

5. **User-Facing Workflows (E2E)**
   - Login → Create property → Add unit → Invite tenant
   - Tenant accept invite → View dashboard → Make payment
   - Owner view analytics → Generate report

---

## 📚 Resources

**Documentation:**
- [Full Assessment Report](./TEST_AUTOMATION_ASSESSMENT_REPORT.md)
- [Action Plan](./TEST_ACTION_PLAN.md)
- [Testing Best Practices](https://martinfowler.com/testing/)

**Tools:**
- Jest Docs: https://jestjs.io/docs/getting-started
- Vitest Docs: https://vitest.dev/guide/
- Playwright Docs: https://playwright.dev/docs/intro
- fast-check Docs: https://fast-check.dev/docs/

**Internal:**
- Test utilities: `apps/backend/test/integration/rls/setup.ts`
- Mock factories: `apps/backend/src/test-utils/mocks.ts`
- Silent logger: `apps/backend/src/__test__/silent-logger.ts`

---

## 💡 Quick Wins for Coverage

**Low-Hanging Fruit (Easy to Test):**
1. Utility functions (pure functions, no I/O)
2. Validation logic (input → output)
3. Formatters/transformers
4. Constants and configuration

**High Impact (Critical Logic):**
1. Payment processing
2. Rent calculations
3. RLS policies
4. State transitions

**Start Here:**
```bash
# 1. Run coverage report
pnpm test:unit:coverage

# 2. Open HTML report
open apps/backend/coverage/index.html

# 3. Navigate to module with lowest coverage
# 4. Click on file to see untested lines (red)
# 5. Write tests for red lines, prioritize:
#    - Public methods
#    - Complex logic (if/else, loops)
#    - Error handling
```

---

**Last Updated:** December 29, 2025
**Maintained By:** Engineering Team
**Questions:** Contact tech lead or open discussion in #testing Slack channel
