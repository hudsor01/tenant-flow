# TenantFlow E2E Testing Documentation

This directory contains the comprehensive End-to-End (E2E) testing infrastructure for TenantFlow, built with Playwright and integrated with the Turborepo monorepo structure.

## 📁 Directory Structure

```
tests/
├── e2e/                          # E2E test suites
│   ├── auth/                     # Authentication flow tests
│   ├── properties/               # Property management tests
│   ├── tenants/                  # Tenant management tests
│   ├── leases/                   # Lease management tests
│   ├── payments/                 # Payment tracking tests
│   ├── maintenance/              # Maintenance request tests
│   └── utils/                    # Test utilities and helpers
├── global-setup.ts              # Global test environment setup
├── global-teardown.ts           # Global test environment cleanup
├── seed-e2e-data.ts             # Test data seeding script
└── cleanup-e2e-data.ts          # Test data cleanup script
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js 22+** installed
2. **PostgreSQL** running (or Docker)
3. **All dependencies** installed: `npm install`

### Setup Test Environment

```bash
# One-time setup
npm run test:setup

# Or manual setup
./scripts/setup-test-env.sh
```

### Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run tests with browser visible
npm run test:e2e:headed

# Run tests with Playwright UI
npm run test:e2e:ui

# Run all tests (unit + E2E)
npm run test:all
```

### Advanced Usage

```bash
# Run specific test suite
npx playwright test auth/

# Run tests with grep pattern
npx playwright test --grep "login"

# Run tests on specific browser
npx playwright test --project=firefox

# Run tests with multiple workers
npx playwright test --workers=4

# Update visual snapshots
npx playwright test --update-snapshots

# Debug mode
npx playwright test --debug
```

## 📊 Test Categories

### Core User Flows

#### 🔐 Authentication (`auth/`)
- User registration and signup
- Login/logout functionality  
- Password reset flow
- Google OAuth integration
- Session persistence
- Route protection

#### 🏠 Property Management (`properties/`)
- Create, read, update, delete properties
- Property details and information
- Image uploads and gallery
- Property filtering and search
- Form validation

#### 👥 Tenant Management (`tenants/`)
- Tenant invitation system
- Tenant profile management
- Document uploads
- Status management (active/inactive)
- Communication and notifications

#### 📋 Lease Management (`leases/`)
- Lease creation and editing
- Lease document generation
- Lease renewal process
- Lease termination
- Payment schedule integration

#### 💰 Payment Tracking (`payments/`)
- Payment recording and tracking
- Payment status management
- Late fees and reminders
- Payment analytics and reports
- Filtering and search

#### 🔧 Maintenance Requests (`maintenance/`)
- Request creation and management
- Contractor assignment
- Work notes and updates
- Photo uploads
- Status tracking and notifications

## 🧪 Test Infrastructure

### Test Data Management

The testing infrastructure uses a comprehensive test data seeding system:

- **Deterministic test data** for reliable test execution
- **Automatic seeding** before test runs
- **Cleanup** after test completion
- **Isolated test users** with known credentials

#### Test Users

```typescript
// Available test users
TestUser.LANDLORD     // landlord@test.com / TestPassword123!
TestUser.TENANT_1     // tenant@test.com / TestPassword123!
TestUser.TENANT_2     // tenant2@test.com / TestPassword123!
```

#### Test Data

- 2 test properties with units
- 2 test tenants with active leases
- Sample payments (paid and pending)
- Maintenance requests with different statuses
- Notifications and activity data

### Database Management

```bash
# Seed test data manually
npm run test:seed

# Cleanup test data manually  
npm run test:cleanup
```

### Environment Configuration

Tests use separate environment files:

- `.env.test` - Root test configuration
- `apps/backend/.env.test` - Backend test settings
- `apps/frontend/.env.local.test` - Frontend test settings

## 🛠 Test Utilities

### Helper Functions (`utils/test-helpers.ts`)

```typescript
// Login as specific user type
await loginAs(page, 'LANDLORD')

// Wait for API responses
await waitForApiResponse(page, '/api/properties')

// Fill forms easily
await fillForm(page, { 'field-name': 'value' })

// Upload test files
await uploadTestFile(page, '[data-testid="upload"]', 'test.pdf')

// Wait for toast notifications
await waitForToast(page, 'Success message')

// Navigate to app sections
await navigateToSection(page, 'properties')
```

### Page Object Model

Tests follow the Page Object Model pattern for maintainability:

```typescript
// Example usage in tests
const propertyPage = new PropertyPage(page)
await propertyPage.createProperty(propertyData)
await propertyPage.expectPropertyVisible('New Property')
```

## 📱 Cross-Platform Testing

### Browser Support

Tests run across multiple browsers:
- **Chromium** (primary)
- **Firefox** 
- **WebKit** (Safari)

### Mobile Testing

Mobile viewports are tested:
- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)

### Responsive Design

Tests include viewport switching:

```typescript
await setMobileViewport(page)   // 375x667
await setDesktopViewport(page)  // 1920x1080
```

## 🔍 Debugging Tests

### Local Debugging

```bash
# Run with browser visible
npm run test:e2e:headed

# Run with Playwright UI (best for debugging)
npm run test:e2e:ui

# Debug specific test
npx playwright test auth/authentication.spec.ts --debug
```

### Debug Tools

- **Playwright Inspector** - Step through tests
- **Browser DevTools** - Inspect elements and network
- **Screenshots** - Automatic on failure
- **Videos** - Recorded for failed tests
- **Traces** - Full test execution traces

### Test Artifacts

All test artifacts are saved to `test-results/`:

```
test-results/
├── screenshots/     # Failure screenshots
├── videos/         # Test execution videos  
├── traces/         # Playwright traces
├── downloads/      # Downloaded files
└── playwright-report/  # HTML test report
```

## 🚀 CI/CD Integration

### GitHub Actions

Tests run automatically on:
- **Push** to main/develop branches
- **Pull requests** 
- **Nightly** scheduled runs
- **Manual** workflow dispatch

### Test Matrix

- **Unit Tests** - Fast feedback
- **Integration Tests** - Database integration
- **E2E Smoke Tests** - Core functionality
- **Cross-Browser Tests** - Compatibility
- **Mobile Tests** - Responsive design
- **Accessibility Tests** - WCAG compliance
- **Performance Tests** - Load and speed

### Parallel Execution

Tests run in parallel across:
- Multiple browser engines
- Multiple workers per browser
- Isolated test environments

## 📈 Performance Optimization

### Test Execution Speed

- **Parallel workers** for faster execution
- **Browser reuse** across tests
- **Smart test isolation** 
- **Optimized selectors** and waits

### Resource Management

- **Database connection pooling**
- **File cleanup** after tests
- **Memory management** for long test runs
- **Process cleanup** on exit

## 📋 Best Practices

### Writing Tests

1. **Use data-testid attributes** for reliable selectors
2. **Follow AAA pattern** (Arrange, Act, Assert)
3. **Keep tests independent** and isolated
4. **Use descriptive test names** 
5. **Test user flows**, not implementation details

### Test Organization

1. **Group related tests** in describe blocks
2. **Use proper beforeEach/afterEach** setup
3. **Share common logic** in helper functions
4. **Keep test files focused** on single features

### Maintenance

1. **Update selectors** when UI changes
2. **Review test failures** promptly
3. **Keep test data fresh** and relevant
4. **Monitor test execution time**

## 🔧 Configuration

### Playwright Configuration

Key settings in `playwright.config.ts`:

```typescript
// Test timeout and retries
timeout: 60000
retries: process.env.CI ? 2 : 0

// Parallel execution
workers: process.env.CI ? 1 : undefined
fullyParallel: true

// Screenshots and videos
screenshot: 'only-on-failure'
video: 'retain-on-failure'
```

### Environment Variables

Important environment variables:

```bash
# Test configuration
PLAYWRIGHT_BASE_URL=http://localhost:5173
TEST_DATABASE_URL=postgresql://...
PLAYWRIGHT_WORKERS=2

# Feature flags
CREATE_TEST_USERS=true
SEED_TEST_DATA=true
CLEANUP_AFTER_TESTS=true
```

## 🚨 Troubleshooting

### Common Issues

#### Tests timing out
- Increase `timeout` in playwright.config.ts
- Check server startup logs
- Verify database connectivity

#### Database connection errors
- Ensure PostgreSQL is running
- Check TEST_DATABASE_URL
- Verify database exists

#### Port conflicts
- Change default ports in configuration
- Kill existing processes: `pkill -f "vite\|nest"`

#### Browser issues
- Reinstall browsers: `npx playwright install`
- Check browser logs in test artifacts
- Try different browser engines

### Getting Help

1. **Check test logs** in `test-results/`
2. **Review CI logs** in GitHub Actions
3. **Run tests locally** with `--debug` flag
4. **Check database state** after failed tests

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

---

For questions or issues with the E2E testing infrastructure, please check the existing tests for examples or refer to the Playwright documentation.