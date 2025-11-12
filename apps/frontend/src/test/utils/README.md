# Test Utilities Guide

Centralized testing utilities for maintainable, production-ready tests. This directory contains shared factories, render utilities, and mock helpers used across all frontend tests.

## Structure

```
test/utils/
├── test-factories.ts # Data builders and factories
├── test-render.tsx # Custom render with providers
├── test-mocks.ts # Mock helpers for common modules
└── index.ts # Central export point
```

## Quick Start

```typescript
import { render, screen, buildMockTenant, TenantBuilder } from '@/test/utils'

test('displays tenant name', () => {
 const tenant = buildMockTenant({ name: 'Jane Doe' })

 render(<TenantCard tenant={tenant} />)

 expect(screen.getByText('Jane Doe')).toBeInTheDocument()
})
```

## Factories

### Simple Factories

Build test data with sensible defaults and easy overrides:

```typescript
import { buildMockTenant, buildMockUser, buildMockProperty } from '@/test/utils'

// Use defaults
const tenant = buildMockTenant()
// { id: 'tenant-1', name: 'John Doe', email: 'john.doe@example.com', ... }

// Override specific fields
const customTenant = buildMockTenant({
 name: 'Jane Smith',
 email: 'jane@example.com'
})
```

**Available Factories:**
- `buildMockTenant(overrides?)` - Tenant with contact info
- `buildMockUser(overrides?)` - User with subscription
- `buildMockProperty(overrides?)` - Property with address
- `buildMockLease(overrides?)` - Lease with dates and rent

### Builder Pattern

For complex test scenarios, use fluent builders:

```typescript
import { TenantBuilder, UserBuilder } from '@/test/utils'

const tenant = new TenantBuilder()
 .withId('custom-id')
 .withName('Jane', 'Doe')
 .withEmail('jane@example.com')
 .withLeases([lease1, lease2])
 .withoutEmergencyContact()
 .build()

const user = new UserBuilder()
 .withRole('ADMIN')
 .withSubscription('ENTERPRISE', 'ACTIVE')
 .build()
```

**Builder Methods:**

**TenantBuilder:**
- `.withId(id)` - Set tenant ID
- `.withName(first, last)` - Set full name
- `.withEmail(email)` - Set email
- `.withPhone(phone)` - Set phone
- `.withEmergencyContact(contact)` - Set emergency contact
- `.withLeases(leases[])` - Add leases
- `.withoutEmergencyContact()` - Remove emergency contact
- `.build()` - Return final object

**UserBuilder:**
- `.withId(id)` - Set user ID
- `.withEmail(email)` - Set email
- `.withRole(role)` - Set role ('OWNER' | 'TENANT' | 'ADMIN')
- `.withSubscription(tier, status)` - Set subscription
- `.build()` - Return final object

## Custom Render

### Basic Render

Automatically wraps components in `QueryClientProvider`:

```typescript
import { render, screen } from '@/test/utils'

test('renders component', () => {
 render(<MyComponent />)
 expect(screen.getByText('Hello')).toBeInTheDocument()
})
```

**No more boilerplate:**
```typescript
// OLD WAY - Repetitive
const queryClient = new QueryClient()
render(
 <QueryClientProvider client={queryClient}>
 <MyComponent />
 </QueryClientProvider>
)

// NEW WAY - Clean
render(<MyComponent />)
```

### Custom Query Client Config

Override default settings when needed:

```typescript
render(<MyComponent />, {
 queryClientConfig: {
 defaultOptions: {
 queries: { staleTime: 5000 }
 }
 }
})
```

### Shared Wrapper

For describe blocks with common setup:

```typescript
import { createTestWrapper } from '@/test/utils'

describe('MyComponent', () => {
 const { Wrapper } = createTestWrapper()

 test('first test', () => {
 render(<MyComponent />, { wrapper: Wrapper })
 })

 test('second test', () => {
 render(<MyComponent />, { wrapper: Wrapper })
 })
})
```

## Mocks

### Query Mocks

Type-safe mocks for TanStack Query:

```typescript
import { createMockQuery } from '@/test/utils'

const mockQuery = createMockQuery({
 data: buildMockTenant(),
 isLoading: false,
 isError: false
})

mockUseTenant.mockReturnValue(mockQuery)
```

**Loading State:**
```typescript
const loadingQuery = createMockQuery({
 data: undefined,
 isLoading: true
})
```

**Error State:**
```typescript
const errorQuery = createMockQuery({
 data: null,
 isError: true,
 error: new Error('Failed to load')
})
```

### Mutation Mocks

Mock mutations with callbacks:

```typescript
import { createMockMutation } from '@/test/utils'

const mockMutation = createMockMutation({
 onSuccess: (data) => {
 toast.success('Success!')
 router.push('/success')
 },
 isPending: false
})

mockUseDeleteTenant.mockReturnValue(mockMutation)
```

**Pending State:**
```typescript
const pendingMutation = createMockMutation({
 isPending: true
})
```

## Best Practices

### 1. Use `test()` Instead of `it()`

```typescript
// MODERN
test('renders loading state', () => {
 // ...
})

// OUTDATED
it('renders loading state', () => {
 // ...
})
```

### 2. Organize with Nested `describe()` Blocks

```typescript
describe('TenantDetails', () => {
 describe('Loading and Error States', () => {
 test('renders loading skeleton', () => {})
 test('renders error message', () => {})
 })

 describe('Display and Rendering', () => {
 test('displays contact information', () => {})
 test('displays created dates', () => {})
 })

 describe('Actions', () => {
 test('has edit button', () => {})
 test('opens delete dialog', () => {})
 })
})
```

### 3. Use AAA Pattern (Arrange, Act, Assert)

```typescript
test('deletes tenant successfully', async () => {
 // Arrange - Setup test data and mocks
 const user = userEvent.setup()
 const tenant = buildMockTenant()
 mockUseTenant.mockReturnValue(createMockQuery({ data: tenant }))

 render(<TenantDetails id="tenant-1" />)

 // Act - Perform user actions
 await user.click(screen.getByRole('button', { name: /Delete/i }))
 await user.click(screen.getByRole('button', { name: /Confirm/i }))

 // Assert - Verify expected outcomes
 expect(toast.success).toHaveBeenCalledWith('Tenant deleted')
 expect(router.push).toHaveBeenCalledWith('/tenants')
})
```

### 4. Use `beforeEach()` for Common Setup

```typescript
describe('TenantList', () => {
 beforeEach(() => {
 jest.clearAllMocks()
 mockUseTenants.mockReturnValue(
 createMockQuery({ data: [buildMockTenant()], isLoading: false })
 )
 })

 test('renders tenant list', () => {
 render(<TenantList />)
 expect(screen.getByText('John Doe')).toBeInTheDocument()
 })

 test('filters tenants', async () => {
 render(<TenantList />)
 // Test uses same mock setup from beforeEach
 })
})
```

### 5. Prefer Semantic Queries

```typescript
// BEST - Accessibility-first
screen.getByRole('button', { name: /Delete/i })
screen.getByRole('heading', { level: 1 })
screen.getByLabelText('Email Address')

// GOOD - User-visible text
screen.getByText('John Doe')
screen.getByPlaceholderText('Enter email')

// AVOID - Test IDs (not user-facing)
screen.getByTestId('delete-button')
```

### 6. Test User Behavior, Not Implementation

```typescript
// GOOD - Tests what user sees and does
test('allows editing tenant name', async () => {
 const user = userEvent.setup()
 render(<TenantForm />)

 await user.type(screen.getByLabelText('Name'), 'Jane Doe')
 await user.click(screen.getByRole('button', { name: /Save/i }))

 expect(screen.getByText('Saved successfully')).toBeInTheDocument()
})

// BAD - Tests internal state
test('updates state on input change', () => {
 const { rerender } = render(<TenantForm />)
 // Testing component internals instead of user experience
})
```

## Migration Guide

### From Old Pattern to New Pattern

**Before:**
```typescript
import React from 'react'
import { render as rtlRender } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const mockTenant = {
 id: 'tenant-1',
 name: 'John Doe',
 email: 'john@example.com',
 // ... 15 more fields
}

it('renders tenant details', () => {
 const queryClient = new QueryClient()

 rtlRender(
 <QueryClientProvider client={queryClient}>
 <TenantDetails tenant={mockTenant} />
 </QueryClientProvider>
 )

 expect(screen.getByText('John Doe')).toBeInTheDocument()
})
```

**After:**
```typescript
import { render, screen, buildMockTenant } from '@/test/utils'

test('renders tenant details', () => {
 const tenant = buildMockTenant()

 render(<TenantDetails tenant={tenant} />)

 expect(screen.getByText('John Doe')).toBeInTheDocument()
})
```

**Benefits:**
- 80% less boilerplate
- Type-safe test data
- Consistent mocking patterns
- Single import statement
- Modern conventions (`test` vs `it`)

## Examples

See production examples in:
- [tenant-details.test.tsx](../../app/(protected)/tenant/__tests__/tenant-details.test.tsx) - Complete refactored test with all patterns
- [customer-portal.test.tsx](../../test/components/pricing/customer-portal.test.tsx) - Component testing patterns

## Resources

- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro)
- [TanStack Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)
- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
