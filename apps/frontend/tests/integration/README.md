# Integration Tests

Integration tests verify end-to-end functionality with real backend APIs and authentication.

## Directory Structure

```
tests/integration/
├── hooks/
│ └── api/
│ └── use-property-images.test.tsx # Property image upload/delete lifecycle
└── README.md
```

## Requirements

- **Running backend** (Railway or local)
- **Valid authentication session**
- **Doppler secrets** configured
- **Database access**

## Running Integration Tests

### Option 1: All Integration Tests
```bash
pnpm --filter @repo/frontend test:integration
```

### Option 2: Specific Test File
```bash
pnpm --filter @repo/frontend test:integration -- use-property-images
```

### Option 3: Run with Backend
```bash
# Terminal 1: Start backend
doppler run -- pnpm --filter @repo/backend dev

# Terminal 2: Run integration tests
doppler run -- pnpm --filter @repo/frontend test:integration
```

## Difference from Unit Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|-------------------|
| **Location** | `src/**/__tests__/*.test.tsx` | `tests/integration/**/*.test.tsx` |
| **Mocking** | All APIs mocked | Real API calls |
| **Auth** | Mocked | Real session required |
| **Speed** | Fast (<2s) | Slow (10-30s) |
| **Run On** | Every commit | Pre-deploy, on-demand |
| **Dependencies** | None | Backend + DB + Auth |

## When to Write Integration Tests

 **Do write integration tests for:**
- Multi-step workflows (upload → verify → delete)
- External service integration (Supabase, Stripe)
- Complex state management across components
- File upload/download flows
- Payment processing

 **Don't write integration tests for:**
- Component rendering (use unit tests)
- Form validation logic (use unit tests)
- UI interactions (use unit tests)
- Simple CRUD operations (use unit tests)

## CI/CD Strategy

```yaml
# Unit tests run on every PR
test:
 - pnpm test:unit

# Integration tests run before deploy
pre-deploy:
 - doppler run -- pnpm test:integration
```

## Best Practices

1. **Use real test data factories** (not hardcoded IDs)
2. **Clean up after tests** (delete created resources)
3. **Run serially** (avoid race conditions with shared state)
4. **Use retries** (network flakiness)
5. **Test happy path** (primary user flows)
6. **Mock external services** (email, SMS) when possible

## Example Test

```typescript
describe('Property Image Upload Integration', () => {
 let testPropertyId: string

 // Setup: Create real property
 beforeAll(async () => {
 const property = await createProperty({
 name: `Test ${Date.now()}`,
 // ...
 })
 testPropertyId = property.id
 })

 // Cleanup: Delete property
 afterAll(async () => {
 await deleteProperty(testPropertyId)
 })

 it('should upload and delete image', async () => {
 // Real API calls, real file upload
 const uploaded = await uploadImage(testPropertyId, file)
 expect(uploaded.url).toBeDefined()

 await deleteImage(uploaded.id)
 // Verify deletion
 })
})
```
