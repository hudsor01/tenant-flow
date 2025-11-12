# Frontend Testing Strategy

## Overview

This directory contains tests that **actually work** before committing code. We've abandoned unrealistic E2E auth tests in favor of practical component and API tests.

---

## Directory Structure

```
tests/
├── api/ # API tests (Playwright request)
│ └── tenant-portal.api.spec.ts
├── component/ # Component tests (Vitest + React Testing Library)
│ └── tenant-portal.component.spec.tsx
├── e2e/ # E2E tests (minimal, public pages only)
│ └── notification-system-public.spec.ts
└── README.md # This file
```

---

## Test Types

### 1. Component Tests (`tests/component/`)

**Purpose:** Test UI components in isolation without backend dependencies

**Tech Stack:**
- Vitest
- React Testing Library
- JSDOM (no real browser)

**What We Test:**
- Component rendering with different data states
- User interactions (clicks, form inputs)
- Conditional rendering logic
- Loading and error states
- Edge cases

**Example:**
```typescript
it('should display lease details when lease exists', async () => {
 const mockLease = {
 id: 'lease-1',
 rentAmount: 1500,
 startDate: '2024-01-01',
 endDate: '2024-12-31',
 }

 vi.mocked(useCurrentLease).mockReturnValue({
 data: mockLease,
 isLoading: false,
 })

 render(<TenantPortalContent />)

 expect(screen.getByText('$1,500')).toBeInTheDocument()
})
```

**Run:**
```bash
pnpm test tests/component/
```

---

### 2. API Tests (`tests/api/`)

**Purpose:** Test backend APIs without browser overhead

**Tech Stack:**
- Playwright request API
- No browser (direct HTTP)

**What We Test:**
- API response contracts
- Request validation
- Error handling (4xx, 5xx)
- Authorization checks
- Business logic

**Example:**
```typescript
test('should create setup intent and return client secret', async () => {
 const response = await apiContext.post('/payment-methods/setup-intent')

 expect(response.status()).toBe(201)
 
 const body = await response.json()
 expect(body).toHaveProperty('clientSecret')
 expect(body.clientSecret).toMatch(/^seti_/)
})
```

**Run:**
```bash
pnpm test:api tests/api/
```

---

### 3. E2E Tests (`tests/e2e/`)

**Purpose:** Test ONLY public pages (no auth required)

**Tech Stack:**
- Playwright browser automation

**What We Test:**
- Public pages (homepage, pricing, etc.)
- UI elements on public pages
- NO authenticated flows (impossible to test reliably)

**Why So Limited?**
- Auth is external (Supabase OAuth)
- Can't bootstrap test users
- Containers don't solve third-party dependencies

**Run:**
```bash
pnpm test:e2e
```

---

## What We DON'T Test (And Why)

### E2E Auth Flows
**Reason:** Supabase is external, OAuth requires real providers, test users don't exist

**Alternative:** Production monitoring (Sentry), feature flags, smoke tests

---

### Stripe Payment Collection in E2E
**Reason:** Requires Stripe test mode API keys, can't mock in browser

**Alternative:** Component tests (mock Stripe hooks), API tests (mock Stripe SDK)

---

### Email Notifications
**Reason:** External email provider (SendGrid, Resend, etc.)

**Alternative:** Test email service separately, monitor in production

---

## Quick Commands

### Run All Component Tests
```bash
pnpm test tests/component/
```

### Run All API Tests
```bash
pnpm test:api tests/api/
```

### Run E2E Tests (Public Only)
```bash
pnpm test:e2e
```

### Run All Tests
```bash
pnpm test:all
```

### Run with Coverage
```bash
pnpm test:coverage
```

---

## Pre-Commit Testing Workflow

### Step 1: Component Tests
```bash
cd apps/frontend
pnpm test tests/component/tenant-portal.component.spec.tsx
```

**Expected:** 100% passing, ~2-5 seconds

---

### Step 2: API Tests
```bash
pnpm test:api tests/api/tenant-portal.api.spec.ts
```

**Expected:** 100% passing, ~5-10 seconds

---

### Step 3: Type Check
```bash
pnpm typecheck
```

**Expected:** No errors

---

### Step 4: Lint
```bash
pnpm lint
```

**Expected:** No errors

---

## Test Configuration

### Vitest Config (`vitest.config.ts`)
```typescript
export default defineConfig({
 test: {
 environment: 'jsdom',
 setupFiles: ['./tests/setup.ts'],
 coverage: {
 provider: 'v8',
 reporter: ['text', 'json', 'html'],
 },
 },
})
```

### Playwright Config (`playwright.config.ts`)
```typescript
export default defineConfig({
 testDir: './tests',
 projects: [
 {
 name: 'api',
 testMatch: /.*\.api\.spec\.ts/,
 use: { baseURL: 'http://localhost:3001' },
 },
 {
 name: 'e2e-public',
 testMatch: /.*public\.spec\.ts/,
 use: { browserName: 'chromium' },
 },
 ],
})
```

---

## Mocking Strategy

### Mock Hooks (Component Tests)
```typescript
vi.mock('@/hooks/api/use-payment-methods', () => ({
 usePaymentMethods: vi.fn(),
 useSetDefaultPaymentMethod: vi.fn(),
}))

// In test
vi.mocked(usePaymentMethods).mockReturnValue({
 data: mockData,
 isLoading: false,
})
```

### Mock API (API Tests)
```typescript
const apiContext = await playwright.request.newContext({
 baseURL: 'http://localhost:3001',
 extraHTTPHeaders: {
 Authorization: 'Bearer mock-jwt-token',
 },
})

const response = await apiContext.post('/payment-methods/save', {
 data: { stripePaymentMethodId: 'pm_test_123' },
})
```

---

## Common Issues & Solutions

### Issue: Component Test Fails with "Cannot find module"
**Solution:** Check import paths use correct aliases (`@/` prefix)

---

### Issue: API Test Fails with 401 Unauthorized
**Solution:** Ensure mock JWT token is set in `extraHTTPHeaders`

---

### Issue: E2E Test Times Out
**Solution:** E2E tests should only test public pages. Remove auth-dependent tests.

---

## Related Documentation

- **Full Testing Guide:** `/docs/TENANT_PORTAL_TESTING_GUIDE.md`
- **Quick Reference:** `/docs/TENANT_PORTAL_QUICK_REFERENCE.md`
- **E2E Cleanup:** `/docs/E2E_TEST_CLEANUP.md`

---

## Philosophy

> **"Test what you can test. Monitor what you can't."**

- Component tests: Fast, reliable, no dependencies
- API tests: Fast, reliable, no browser
- E2E auth tests: Slow, flaky, impossible
- Production monitoring: Real bugs, real users, real value

We build **realistic tests** that catch bugs, not **perfect tests** that never run.
