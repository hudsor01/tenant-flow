# Test Fixing Context Rules

## Test Analysis Approach
- **Systematic**: Fix tests one file at a time, validate each fix
- **Root Cause**: Identify underlying issues (React 19, imports, mocks)
- **Pattern Recognition**: Look for common patterns across failing tests
- **Validation**: Run individual test files after each fix

## React 19 Test Migration Patterns
```typescript
// Before (React 18)
test('component updates state', () => {
  render(<Component />)
  fireEvent.click(screen.getByRole('button'))
  expect(screen.getByText('Updated')).toBeInTheDocument()
})

// After (React 19)
test('component updates state', async () => {
  await act(async () => {
    render(<Component />)
  })
  
  await act(async () => {
    fireEvent.click(screen.getByRole('button'))
  })
  
  expect(screen.getByText('Updated')).toBeInTheDocument()
})
```

## Common Test Fixes Needed
1. **act() Wrapping**: All state updates need act() wrapper
2. **Import Updates**: Update to use @repo/shared types
3. **Mock Data**: Update mock structures to match current schema
4. **Async Patterns**: Proper async/await in test utilities

## Test Debugging Commands
```bash
# Run specific failing test
npm run test:unit -- path/to/test.spec.ts

# Run tests in watch mode
npm run test:unit -- --watch

# Get detailed error output
npm run test:unit -- --verbose

# Check for React warnings
npm run test:unit -- --verbose 2>&1 | grep -i warning
```

## Mock Update Patterns
- **API Responses**: Update mock responses to match current API schema
- **Component Props**: Ensure props match current component interfaces
- **Store State**: Update store mocks to match current state structure
- **Service Methods**: Mock service methods match actual implementations

## Test File Organization
- **Setup Files**: Update test setup files for React 19 compatibility
- **Test Utilities**: Create reusable test utilities for common patterns
- **Mock Factories**: Create factories for generating consistent test data
- **Helper Functions**: Extract common test logic into helper functions

## Validation After Fixes
1. Individual test file passes
2. Full test suite passes
3. No React warnings in console
4. TypeScript compilation succeeds
5. `npm run claude:check` passes