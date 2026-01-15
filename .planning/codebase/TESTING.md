# Testing Patterns

**Analysis Date:** 2026-01-15

## Test Framework

**Backend (Jest):**
- Framework: Jest 30.0.2
- Config: `apps/backend/jest.config.ts`
- Coverage target: 80% (per CLAUDE.md)
- Current coverage: 31% (per health report)

**Frontend (Vitest):**
- Framework: Vitest 3.0.7
- Config: `apps/frontend/vitest.config.ts`
- Coverage target: 80%
- Current coverage: 12% (per health report)

**E2E (Playwright):**
- Framework: Playwright 1.50.0
- Config: `apps/e2e-tests/playwright.config.ts`
- Browser: Chromium (primary)

**Run Commands:**
```bash
pnpm test:unit                        # All unit tests
pnpm test:unit:backend                # Backend only (Jest)
pnpm test:unit:frontend               # Frontend only (Vitest)
pnpm test:integration                 # Backend integration tests
pnpm test:e2e                         # All E2E tests (Playwright)
pnpm test:e2e:ui                      # Playwright with UI
pnpm test:e2e:debug                   # Debug mode

# Single file
pnpm --filter @repo/backend test:unit -- --testPathPattern="properties.service"
pnpm --filter @repo/frontend test:unit src/hooks/__tests__/use-tenant.test.ts
```

## Test File Organization

**Location:**
- Backend: `*.spec.ts` co-located with source files
- Frontend: `__tests__/*.test.ts` directories
- Integration: `apps/backend/test/integration/*.integration.spec.ts`
- E2E: `apps/e2e-tests/tests/*.spec.ts`

**Naming:**
- Backend unit: `{module}.service.spec.ts`, `{module}.controller.spec.ts`
- Frontend unit: `use-{hook}.test.ts`, `{component}.test.tsx`
- Integration: `{feature}.integration.spec.ts`
- E2E: `{flow}.spec.ts`

**Structure:**
```
apps/backend/src/modules/properties/
├── properties.controller.ts
├── properties.controller.spec.ts
├── properties.service.ts
├── properties.service.spec.ts
└── properties.module.ts

apps/frontend/src/hooks/
├── api/
│   └── use-properties.ts
└── __tests__/
    └── use-properties.test.ts
```

## Test Structure

**Suite Organization (Jest/Vitest):**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
// or: import { describe, it, expect, beforeEach } from '@jest/globals'

describe('PropertiesService', () => {
  let service: PropertiesService
  let mockSupabase: MockSupabaseClient

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    service = new PropertiesService(mockSupabase)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('findAll', () => {
    it('should return properties for user', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: mockProperties, error: null })
      })

      // Act
      const result = await service.findAll('user-id')

      // Assert
      expect(result).toEqual(mockProperties)
    })

    it('should throw NotFoundException when no properties', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null })
      })

      await expect(service.findAll('user-id')).rejects.toThrow(NotFoundException)
    })
  })
})
```

**Patterns:**
- Use `beforeEach` for per-test setup
- Use `afterEach` to restore mocks
- Arrange/Act/Assert structure
- One logical assertion per test
- Use `SilentLogger` for clean test output

## Mocking

**Framework:**
- Jest: Built-in `jest.fn()`, `jest.mock()`
- Vitest: `vi.fn()`, `vi.mock()`

**Supabase Mocking:**
```typescript
// Mock Supabase client
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: mockData, error: null })
}

vi.mock('#lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase)
}))
```

**Stripe Mocking:**
```typescript
vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    customers: { create: vi.fn(), retrieve: vi.fn() },
    subscriptions: { create: vi.fn() }
  }))
}))
```

**What to Mock:**
- Supabase client (database calls)
- Stripe API
- Email services (Resend)
- External HTTP calls
- BullMQ queues

**What NOT to Mock:**
- Zod validation schemas
- Pure utility functions
- Internal business logic

## Fixtures and Factories

**Test Data:**
```typescript
// Factory function pattern
function createMockProperty(overrides?: Partial<Property>): Property {
  return {
    id: 'prop-123',
    name: 'Test Property',
    address: '123 Test St',
    user_id: 'user-456',
    created_at: new Date().toISOString(),
    ...overrides
  }
}

// Usage
const property = createMockProperty({ name: 'Custom Name' })
```

**Location:**
- Factory functions: Define near test usage or in shared test utils
- Fixtures: `apps/backend/test/fixtures/` (if needed)

## Coverage

**Requirements:**
- Target: 80% line coverage (per CLAUDE.md)
- Current: 31% backend, 12% frontend (per health report)
- Focus: Critical paths (auth, billing, property management)

**Configuration:**
- Jest: `--coverage` flag, configured in `jest.config.ts`
- Vitest: `--coverage` flag, configured in `vitest.config.ts`

**View Coverage:**
```bash
pnpm --filter @repo/backend test:unit -- --coverage
pnpm --filter @repo/frontend test:unit -- --coverage
# Reports in coverage/ directory
```

## Test Types

**Unit Tests:**
- Scope: Single function/class in isolation
- Mocking: All external dependencies mocked
- Speed: <100ms per test
- Examples: `properties.service.spec.ts`, `use-properties.test.ts`

**Integration Tests:**
- Scope: Multiple modules together, real database
- Mocking: External services only (Stripe, email)
- Setup: Test database, seed data
- Location: `apps/backend/test/integration/`
- Examples: `billing.integration.spec.ts`

**E2E Tests:**
- Scope: Full user flows through UI
- Framework: Playwright
- Mocking: None (real application)
- Examples: Login flow, property creation, lease signing
- Location: `apps/e2e-tests/tests/`

## Common Patterns

**Async Testing:**
```typescript
it('should handle async operation', async () => {
  const result = await service.asyncMethod()
  expect(result).toBe('expected')
})
```

**Error Testing:**
```typescript
it('should throw on invalid input', async () => {
  await expect(service.create(null)).rejects.toThrow(BadRequestException)
})

// Specific error message
await expect(service.findById('invalid'))
  .rejects.toThrow('Property not found')
```

**TanStack Query Hook Testing:**
```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

it('should fetch properties', async () => {
  const wrapper = ({ children }) => (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  )

  const { result } = renderHook(() => useProperties(), { wrapper })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toHaveLength(3)
})
```

**NestJS Controller Testing:**
```typescript
describe('PropertiesController', () => {
  let controller: PropertiesController
  let mockService: jest.Mocked<PropertiesService>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PropertiesController],
      providers: [
        { provide: PropertiesService, useValue: createMockPropertiesService() }
      ]
    }).compile()

    controller = module.get(PropertiesController)
    mockService = module.get(PropertiesService)
  })

  it('should return properties', async () => {
    mockService.findAll.mockResolvedValue(mockProperties)

    const result = await controller.findAll(mockRequest)

    expect(result).toEqual(mockProperties)
  })
})
```

---

*Testing analysis: 2026-01-15*
*Update when test patterns change*
