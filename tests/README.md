# Testing Guide (2025 Best Practices)

## Quick Start

```bash
# Run all E2E tests (Playwright manages dev server automatically)
pnpm test:e2e

# Run with UI mode (recommended for development)
pnpm test:e2e:ui

# Run specific project
pnpm test:e2e:chromium  # Authenticated tests
pnpm test:e2e:public    # Public pages & auth flows
```

## Test Structure

### Projects

**1. `setup`** - Runs once to create authenticated session
- Creates `playwright/.auth/user.json` with admin user cookies

**2. `chromium`** - Authenticated desktop tests
- Uses stored auth from setup
- Tests: dashboard, properties, tenants, protected routes
- Skips: auth flows, landing pages, security tests

**3. `public`** - Unauthenticated tests
- Fresh browser, no cookies
- Tests: auth flows, login, security, production readiness

## Environment Setup

### Required Environment Variables (via Doppler)

```bash
# E2E Test Credentials
E2E_ADMIN_EMAIL=test-admin@tenantflow.app
E2E_ADMIN_PASSWORD=TestPassword123!
E2E_MANAGER_EMAIL=test-manager@tenantflow.app  # landlord role
E2E_MANAGER_PASSWORD=TestPassword123!
E2E_TENANT_EMAIL=test-tenant@tenantflow.app
E2E_TENANT_PASSWORD=TestPassword123!
E2E_OWNER_EMAIL=owner@example.com  # user role
E2E_OWNER_PASSWORD=TestPassword123!
```

### How It Works

1. **Playwright starts dev server automatically** - No manual server management needed
2. **Doppler injects secrets** - All credentials come from Doppler
3. **Setup runs once** - Creates authenticated session for protected route tests
4. **Tests run in parallel** - Separate projects for auth vs. no-auth

## Writing Tests

### Use Centralized Credentials

```typescript
import { getCredentials } from '../utils/credentials'

test('my test', async ({ page }) => {
  const { email, password } = getCredentials('admin')
  // Use email and password
})
```

### Available Roles

- `admin` - Admin user
- `landlord` - Property manager (mapped from E2E_MANAGER)
- `tenant` - Tenant user
- `user` - Regular user (mapped from E2E_OWNER)

## Debugging

```bash
# View test in browser
pnpm test:e2e:headed

# Interactive debugging
pnpm test:e2e:debug

# Inspect failed test trace
pnpm exec playwright show-trace test-results/[test-name]/trace.zip

# View test report
pnpm exec playwright show-report
```

## Best Practices

1. ✅ Let Playwright manage the dev server
2. ✅ Use centralized credentials helper
3. ✅ Separate auth and no-auth projects
4. ✅ Use UI mode for development
5. ❌ Don't manually start dev servers
6. ❌ Don't hardcode credentials

**Last Updated**: 2025-10-07 (Modern best practices)