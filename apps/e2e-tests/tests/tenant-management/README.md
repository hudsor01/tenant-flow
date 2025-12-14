# Tenant Management E2E Tests

Comprehensive end-to-end and visual regression tests for the tenant management feature.

## Test Files

### 1. `tenant-management.e2e.spec.ts`
Complete user workflow testing from tenant creation to deletion.

**Coverage:**
- Full lifecycle: create → view → edit → delete
- Form validation and error handling
- Search, filter, and pagination
- List sorting and bulk operations
- Keyboard navigation and accessibility
- Export functionality
- Network error scenarios
- Concurrent edit conflicts

### 2. `tenant-forms.visual.spec.ts`
Visual regression testing for UI consistency across states and viewports.

**Coverage:**
- Initial, filled, and validation error states
- 7 responsive breakpoints (320px to 1920px)
- Dark mode compatibility
- Focus, hover, and loading states
- Multi-step form progression

## Running Tests

### All Tenant Tests
```bash
# From project root
pnpm test:e2e:tenant

# Or directly from e2e-tests
cd apps/e2e-tests
pnpm test:chromium -- tenant-management/
```

### Specific Test Files
```bash
# E2E workflows only
pnpm exec playwright test tenant-management/tenant-management.e2e.spec.ts

# Visual regression only
pnpm test:e2e:visual

# Specific test case
pnpm exec playwright test -g "complete tenant lifecycle"
```

### Interactive Mode
```bash
# Debug mode with browser visible
pnpm exec playwright test --project=chromium-tenant-management --headed --debug

# UI mode for test exploration
pnpm test:e2e:ui
```

### Update Visual Baselines
```bash
# After intentional UI changes
pnpm exec playwright test --project=chromium-visual --update-snapshots
```

## Test Data

Tests use `@faker-js/faker` for random but realistic test data:

```typescript
const tenantData = {
 firstName: faker.person.firstName(), // "John"
 lastName: faker.person.lastName(), // "Doe"
 email: faker.internet.email(), // "john.doe@example.com"
 phone: faker.phone.number('(###) ###-####'), // "(555) 123-4567"
}
```

## Prerequisites

1. **Frontend Running**: Dev server must be accessible at `http://localhost:3000`
 ```bash
 pnpm --filter @repo/frontend dev
 ```

2. **Backend Running**: API must be accessible at `http://localhost:3001`
 ```bash
 pnpm --filter @repo/backend dev
 ```

3. **Database Setup**: Supabase must be configured with proper schemas
 ```bash
 pnpm db:push
 ```

4. **Playwright Installed**: Browsers must be installed
 ```bash
 pnpm exec playwright install chromium
 ```

## Configuration

Tests inherit from root `playwright.config.ts`:

```typescript
// Root config
baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
webServer: {
 command: 'doppler run -- pnpm --filter @repo/frontend dev',
 url: 'http://localhost:3000',
 reuseExistingServer: true,
}
```

### Project-Specific Settings

**chromium-tenant-management**:
- Device: Desktop Chrome
- Test pattern: `**/*.e2e.spec.ts`
- Purpose: User workflow validation

**chromium-visual**:
- Device: Desktop Chrome
- Test pattern: `**/*.visual.spec.ts`
- Purpose: Visual regression detection

## CI/CD Integration

Tests run automatically in GitHub Actions:

### Workflow: `.github/workflows/e2e-tests.yml`

**Trigger Conditions:**
- All PRs to main/develop
- All pushes to main
- Manual workflow dispatch

**Jobs:**
1. `e2e-tenant-management` - Full workflow testing (20min timeout)
2. `e2e-visual-regression` - UI consistency checks (15min timeout)
3. `e2e-smoke-tests` - Quick critical path validation (10min timeout)

**Artifacts Uploaded:**
- Test results (JSON)
- HTML reports
- Failed test screenshots
- Visual regression diffs

## Debugging Failed Tests

### 1. Check CI Artifacts
```bash
# Download from GitHub Actions
# Navigate to failed run → Artifacts → playwright-report-tenant
```

### 2. Run Locally with Same Conditions
```bash
# Use CI environment variable
CI=true pnpm test:e2e:tenant

# Capture trace for debugging
pnpm exec playwright test --trace on
```

### 3. Inspect Visual Diffs
```bash
# View side-by-side comparison
open test-results/tenant-form-initial-chromium-visual/tenant-form-initial-actual.png
open apps/e2e-tests/tests/__snapshots__/tenant-form-initial-chromium-visual.png
```

### 4. Use Playwright Inspector
```bash
# Step through test execution
pnpm exec playwright test --debug -g "create tenant"
```

## Common Issues

### Issue: "page.goto: net::ERR_CONNECTION_REFUSED"
**Cause**: Frontend not running
**Fix**: Start dev server: `pnpm --filter @repo/frontend dev`

### Issue: "Timeout 10000ms exceeded waiting for selector"
**Cause**: Element selector doesn't match actual UI
**Fix**: Inspect DOM and update selector in test file

### Issue: "Screenshot comparison failed"
**Cause**: Intentional UI change or flaky font rendering
**Fix**: Update baselines: `pnpm test:e2e:visual --update-snapshots`

### Issue: "Test failed with 'Create Tenant' button not found"
**Cause**: Authentication required but not provided
**Fix**: Implement auth setup in `apps/e2e-tests/tests/auth.setup.ts`

## Test Best Practices

### 1. Use Semantic Locators
```typescript
// Good - accessible and resilient
page.getByRole('button', { name: /create tenant/i })
page.getByLabel('Email')

// Bad - brittle
page.locator('.btn-primary')
page.locator('#email-input')
```

### 2. Wait for Stable State
```typescript
// Good - explicit wait
await page.waitForLoadState('networkidle')
await expect(page.getByText('Success')).toBeVisible()

// Bad - arbitrary timeout
await page.waitForTimeout(5000)
```

### 3. Use Test Steps for Readability
```typescript
await test.step('Create tenant', async () => {
 // Test implementation
})
```

### 4. Clean Up Test Data
```typescript
// Use faker for unique data to avoid conflicts
const uniqueEmail = faker.internet.email()

// Delete created tenants in teardown if needed
test.afterEach(async () => {
 await cleanupTestTenant(uniqueEmail)
})
```

## Metrics & Coverage

**Current Coverage:**
- E2E Workflows: 10+ complete user journeys
- Visual Tests: 15+ screenshot comparisons
- Responsive Breakpoints: 7 device sizes
- Error Scenarios: 5+ failure modes

**Success Criteria:**
- All E2E workflows pass in < 10 minutes
- Visual regression diffs < 100px changes
- Zero flaky tests (pass 100% of the time)
- Mobile compatibility verified

## Next Steps

1. Add authentication state persistence
2. Implement database seeding for consistent test data
3. Add performance benchmarking
4. Expand mobile device coverage
5. Add accessibility audit integration

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Visual Testing Guide](https://playwright.dev/docs/test-snapshots)
- [CI/CD Best Practices](https://playwright.dev/docs/ci)
- [Debugging Guide](https://playwright.dev/docs/debug)
