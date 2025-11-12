# TanStack Query Playwright Tests

Comprehensive end-to-end tests for TanStack Query functionality in the TenantFlow frontend application. These tests verify real browser behavior for optimistic updates, infinite scrolling, cache management, error handling, and complete user workflows.

## Purpose

These tests ensure that TanStack Query integration works correctly from a **user's perspective**, testing:

- **Optimistic Updates** - Immediate UI feedback with proper rollback on failures
- **Infinite Scrolling** - Intersection observer triggers and performance
- **Error Handling** - Network failures, API errors, and recovery mechanisms 
- **Cache Behavior** - Invalidation, persistence, and stale-while-revalidate
- **Real User Workflows** - Complete business scenarios end-to-end
- **Performance** - Responsive UI under various network conditions

## File Structure

```
tests/tanstack/
├── README.md # This documentation
├── playwright.config.ts # TanStack-specific Playwright config
├── run-tanstack-tests.sh # Test runner script
├── tanstack-global-setup.ts # Global test setup
├── tanstack-global-teardown.ts # Global test cleanup
├── fixtures/
│ └── property-data.ts # Test data fixtures
├── utils/
│ └── tanstack-helpers.ts # Test utilities and helpers
└── Test Files:
 ├── optimistic-updates.spec.ts # Optimistic update tests
 ├── infinite-scrolling.spec.ts # Infinite scroll tests 
 ├── error-handling.spec.ts # Network error tests
 ├── cache-behavior.spec.ts # Cache management tests
 └── real-user-workflows.spec.ts # End-to-end workflow tests
```

## Quick Start

### Run All Tests
```bash
npm run test:tanstack
```

### Run Specific Test Suites
```bash
# Optimistic updates only
npm run test:tanstack:optimistic

# Infinite scrolling only 
npm run test:tanstack:infinite

# Error handling only
npm run test:tanstack:errors

# Cache behavior only
npm run test:tanstack:cache

# Real user workflows only
npm run test:tanstack:workflows
```

### Run Test Categories
```bash
# Critical business logic tests
npm run test:tanstack:critical

# Regression test suite
npm run test:tanstack:regression

# Performance testing
npm run test:tanstack:performance

# Quick smoke tests
npm run test:tanstack:smoke
```

### Debug Mode
```bash
# Run with browser visible and debugging enabled
npm run test:tanstack:debug

# Run on mobile viewport
npm run test:tanstack:mobile
```

## Test Categories

### Optimistic Updates (`optimistic-updates.spec.ts`)

Tests immediate UI updates for CRUD operations with proper rollback on failures.

**Key Scenarios:**
- Property creation with immediate table update
- Property updates with instant UI reflection
- Property deletion with immediate removal
- Dashboard stats updates with all operations
- Rollback behavior on API failures
- Multiple rapid operations handling
- Concurrent operation management

### ️ Infinite Scrolling (`infinite-scrolling.spec.ts`)

Tests infinite scroll implementation with intersection observer and performance.

**Key Scenarios:**
- Automatic loading of first page
- Intersection observer triggering at 10% visibility
- Loading indicators during fetch operations
- End-of-data handling
- Performance with large datasets
- Mobile viewport behavior
- Error recovery during scroll operations

### ️ Error Handling (`error-handling.spec.ts`)

Tests network error scenarios, retry behavior, and user-friendly error recovery.

**Key Scenarios:**
- Complete network failure handling
- API server errors (500, 502, 503, 504)
- Validation errors (422)
- Timeout handling
- Automatic retry with exponential backoff
- Maximum retry limits
- Intermittent connection recovery
- User error recovery experiences

### Cache Behavior (`cache-behavior.spec.ts`)

Tests cache invalidation, persistence, and stale-while-revalidate patterns.

**Key Scenarios:**
- Cache population on initial load
- Serving data from cache on subsequent visits
- Request deduplication for concurrent queries
- Cache invalidation after mutations
- Stale-while-revalidate behavior
- Background refetch on window focus/network reconnection
- Cache persistence across navigation
- Memory management and garbage collection

### Real User Workflows (`real-user-workflows.spec.ts`)

Tests complete business scenarios from a user's perspective.

**Key Scenarios:**
- Complete property lifecycle (create → navigate → persist → update → delete)
- Dashboard integration workflows
- Error recovery workflows with user actions
- Performance with realistic usage patterns
- Multi-tab session management
- Browser back/forward navigation
- Form validation and completion flows

## ️ Test Utilities

### Helper Classes

- **`TanStackQueryHelper`** - Query cache inspection and manipulation
- **`NetworkSimulator`** - Network condition simulation (slow, offline, errors)
- **`PropertyTableHelper`** - Property table interaction utilities
- **`PropertyFormHelper`** - Form filling and submission helpers
- **`DashboardStatsHelper`** - Dashboard metrics verification
- **`PerformanceHelper`** - Performance measurement utilities

### Test Fixtures

- **`property-data.ts`** - Consistent test data generation
- Mock API responses for different scenarios
- Network delay simulation constants
- Validation error test cases

## Configuration

### Playwright Config (`playwright.config.ts`)

Optimized for TanStack Query testing:

- **Timeout**: 60 seconds for complex workflows
- **Workers**: Single worker to avoid cache conflicts 
- **Retries**: 2 in CI, 1 locally
- **Trace**: Retained on failure for debugging
- **Video**: Retained on failure for visual debugging

### Browser Projects

- **`tanstack-query-chrome`** - Main desktop Chrome testing
- **`tanstack-query-mobile`** - Mobile viewport testing
- **`tanstack-query-network-sim`** - Network simulation testing

### Test Execution Modes

- **Normal**: Standard headless execution
- **Debug**: Visible browser with debugging enabled
- **Trace**: Full trace recording for analysis
- **UI**: Interactive test execution mode

## Test Reports

Test results are generated in multiple formats:

- **HTML Report**: `tanstack-test-results/index.html`
- **JSON Results**: `tanstack-test-results/results.json`
- **JUnit XML**: For CI integration

View reports:
```bash
npx playwright show-report tanstack-test-results
```

## Advanced Usage

### Custom Test Runner

The `run-tanstack-tests.sh` script provides advanced options:

```bash
# Run specific test type with specific browser and mode
./tests/tanstack/run-tanstack-tests.sh [TEST_TYPE] [BROWSER] [MODE]

# Examples:
./tests/tanstack/run-tanstack-tests.sh optimistic chrome debug
./tests/tanstack/run-tanstack-tests.sh all mobile trace
./tests/tanstack/run-tanstack-tests.sh critical network ui
```

**Test Types:**
- `all` - All test suites
- `optimistic` - Optimistic updates only
- `infinite` - Infinite scrolling only
- `error` - Error handling only
- `cache` - Cache behavior only
- `workflow` - User workflows only
- `critical` - Critical business logic tests
- `regression` - Regression test suite
- `performance` - Performance tests
- `smoke` - Quick smoke tests

**Browsers:**
- `chrome` - Desktop Chrome (default)
- `mobile` - Mobile viewport
- `network` - Network simulation mode

**Modes:**
- `normal` - Standard execution (default)
- `debug` - Visible browser with debugging
- `trace` - Full trace recording
- `video` - Video recording enabled
- `ui` - Interactive UI mode

### Environment Variables

- `PLAYWRIGHT_TEST_BASE_URL` - Override base URL for testing
- `CI` - Enables CI-specific configuration
- `DEBUG` - Enable debug output

### Performance Monitoring

Performance metrics are collected during test execution:

- Scroll performance measurements
- Page load times
- Network request timing
- Memory usage patterns
- UI responsiveness metrics

## Debugging

### Common Issues

1. **QueryClient not exposed**
 - Ensure the global setup properly exposes `window.__QUERY_CLIENT__`
 - Check browser console for exposure confirmation

2. **Cache conflicts between tests** 
 - Tests run sequentially to avoid cache conflicts
 - Each test clears cache in `beforeEach`

3. **Network simulation not working**
 - Verify route mocking is properly configured
 - Check browser network tab during test execution

4. **Intersection observer not triggering**
 - Verify proper scroll positioning
 - Check element visibility thresholds

### Debug Mode

Run tests with visible browser and debugging:

```bash
npm run test:tanstack:debug
```

This enables:
- Visible browser window
- Slower execution for observation
- DevTools available for inspection
- Step-by-step execution

### Trace Analysis

Generate and analyze test traces:

```bash
# Run with tracing
./tests/tanstack/run-tanstack-tests.sh all chrome trace

# View trace
npx playwright show-trace trace.zip
```

## CI/CD Integration

These tests are designed for CI/CD environments:

- **Deterministic**: Consistent results across runs
- **Fast**: Optimized for quick feedback
- **Reliable**: Proper error handling and cleanup
- **Informative**: Detailed failure reporting

### GitHub Actions Example

```yaml
- name: Run TanStack Query Tests
 run: npm run test:tanstack:critical

- name: Run Full TanStack Query Suite
 run: npm run test:tanstack
 if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

## Maintenance

### Adding New Tests

1. **Create test file** in appropriate category
2. **Use existing helpers** for consistency
3. **Follow naming conventions** for test descriptions
4. **Update test runner** script if needed
5. **Document new scenarios** in this README

### Updating Test Data

1. **Modify fixtures** in `fixtures/property-data.ts`
2. **Update helper methods** as needed
3. **Ensure backwards compatibility** with existing tests
4. **Test data cleanup** in global teardown

### Performance Monitoring

Regular performance benchmarking ensures tests remain fast and reliable:

- Monitor test execution times
- Track memory usage patterns 
- Verify scroll performance metrics
- Analyze network request efficiency

## Success Metrics

These tests ensure:

- **Zero production bugs** related to TanStack Query
- **Consistent user experience** across all scenarios
- **Proper error handling** and recovery
- **Optimal performance** under various conditions
- **Reliable cache behavior** and data consistency

Every test verifies **real user experience** rather than implementation details, ensuring confidence in production deployments.