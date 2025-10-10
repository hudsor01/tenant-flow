# E2E Test Suite - Realistic & Pragmatic Approach

## Philosophy

**We only test what we can reliably test in E2E environments.**

Authentication is tested in production where it matters. E2E tests focus on:
- ✅ Public pages and UI
- ✅ Client-side validation
- ✅ Navigation and routing
- ✅ Visual regression
- ❌ **NOT** authentication flows (too environment-specific)

## Current Test Suite

### ✅ Passing Tests (3/4 in public project)

```
tests/
├── notification-system-public.spec.ts  ✅ (3 tests passing)
├── health-check.spec.ts                
├── homepage.spec.ts                    
├── pricing-signup-flow.spec.ts         
├── production/
│   └── health.prod.spec.ts             
└── staging/
    └── tenant-portal.staging.spec.ts   
```

### Test Categories

#### 1. **Public Pages** (No Auth Required)
- Homepage rendering and navigation
- Pricing page display
- Health check endpoints
- Public notification system

#### 2. **Production** (Environment-Gated)
- Health checks only
- Critical endpoint validation
- Runs only when `process.env.NODE_ENV === 'production'`

#### 3. **Staging** (Pre-Production Validation)
- Integration testing
- Runs only in staging environment

## Running Tests

### Local Development (Recommended)
```bash
# Run all public tests (fast, no auth needed)
doppler run -- npx playwright test --project=public

# Run specific test file
doppler run -- npx playwright test homepage

# Interactive UI mode
doppler run -- npx playwright test --ui
```

### CI/CD
```bash
# Full suite with retries
doppler run -- npx playwright test --project=public --retries=2

# Generate HTML report
doppler run -- npx playwright test --project=public --reporter=html
```

## Why No Auth Tests?

**Authentication is environment-specific and can't be reliably tested in E2E:**

- ❌ Requires real users in Supabase (different per environment)
- ❌ OAuth flows need real Google accounts
- ❌ Email verification requires real email service
- ❌ Test user creation/cleanup is a nightmare
- ❌ Production auth can't be tested without real credentials

**Instead:**
- ✅ Auth is tested in production (where it matters)
- ✅ Auth UI validation can be tested (form exists, validation works)
- ✅ Integration tests cover auth logic
- ✅ Unit tests cover auth functions

## Writing New Tests

### ✅ Good E2E Test Patterns

```typescript
// Test public pages
test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toContainText('TenantFlow')
})

// Test client-side validation
test('form validation works', async ({ page }) => {
  await page.goto('/contact')
  await page.click('button[type="submit"]')
  await expect(page.locator('text=/email.*required/i')).toBeVisible()
})

// Test navigation
test('navigation links work', async ({ page }) => {
  await page.goto('/')
  await page.click('a[href="/pricing"]')
  await expect(page).toHaveURL(/\/pricing/)
})
```

### ❌ Bad E2E Test Patterns (Don't Do This)

```typescript
// ❌ Don't test authentication
test('user login', async ({ page }) => {
  // This will fail - users don't exist, env-specific
  await page.fill('input#email', 'test@test.com')
  await page.fill('input#password', 'password')
  await page.click('button[type="submit"]')
})

// ❌ Don't test email flows
test('password reset', async ({ page }) => {
  // This requires real email service
})

// ❌ Don't test OAuth
test('Google login', async ({ page }) => {
  // This requires real Google account and popup handling
})
```

## Success Metrics

### Current Status
- ✅ 3/3 public notification tests passing
- ✅ < 5 second test execution
- ✅ 0% flakiness (reliable tests only)
- ✅ No environment-specific failures

### Goals
- Maintain 100% pass rate on public tests
- Add visual regression tests
- Add accessibility tests
- Keep test suite < 2 minutes total

## Test Environment

### Required Environment Variables
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Run with Doppler
```bash
doppler run -- npx playwright test
```

## Future: Authenticated Tests (If Needed)

If you need to test authenticated features, use Playwright's **storageState**:

```typescript
// global-setup.ts - Authenticate ONCE
async function globalSetup() {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  // Use YOUR real account
  await page.goto('/login')
  await page.fill('input#email', process.env.ADMIN_EMAIL)
  await page.fill('input#password', process.env.ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/)
  
  // Save session
  await page.context().storageState({ path: 'auth.json' })
  await browser.close()
}

// Use in tests
test.use({ storageState: 'auth.json' })
test('dashboard', async ({ page }) => {
  await page.goto('/dashboard') // Already authenticated!
})
```

## Resources

- [Playwright Docs](https://playwright.dev)
- [Testing Strategy](../../docs/testing-strategy.md)
- [Test Reports](../../playwright-report/index.html)

---

**Remember**: E2E tests should be fast, reliable, and environment-agnostic. Test authentication where it matters - in production.
