# TenantFlow Test Fix Workflow

**Priority: Critical** - 10 failing frontend test suites blocking development

You have access to `npm`, `git`, and all TenantFlow commands. Please fix the failing frontend tests systematically.

<detailed_sequence_of_steps>

# Test Fix Process - Detailed Sequence of Steps

## 1. Identify Failing Tests

1. First, run the failing tests to get current status:
   ```bash
   cd apps/frontend
   npm run test:unit
   ```

2. Get a detailed view of specific failures:
   ```bash
   npm run test:unit -- --verbose
   ```

3. Identify the failing test files for systematic fixing:
   ```bash
   npm run test:unit 2>&1 | grep -E "(FAIL|FAILED)" | head -20
   ```

## 2. Analyze First Failing Test

1. Read the first failing test file to understand what's broken:
   ```xml
   <read_file>
   <path>apps/frontend/src/[first-failing-test-path]</path>
   </read_file>
   ```

2. Read the component being tested:
   ```xml
   <read_file>
   <path>apps/frontend/src/[component-being-tested]</path>
   </read_file>
   ```

3. Check for React 19 compatibility issues:
   ```xml
   <search_files>
   <path>apps/frontend/src</path>
   <regex>act\(|ReactDOM\.render|enzyme</regex>
   <file_pattern>*.test.ts,*.test.tsx,*.spec.ts,*.spec.tsx</file_pattern>
   </search_files>
   ```

## 3. Ask User for Test Fixing Strategy

1. Present findings and ask for approach:
   ```xml
   <ask_followup_question>
   <question>I've identified the failing tests. Here's what I found:

   [Summary of failing tests and likely causes]

   Common issues appear to be:
   1. React 19 compatibility (act() wrapping, render changes)
   2. Import path updates needed
   3. Mock data structure changes
   4. Async testing patterns

   Would you like me to:
   1. Fix all React 19 compatibility issues first
   2. Fix tests one file at a time with your approval
   3. Focus on the most critical test failures first

   Which approach should I take?</question>
   <options>["Fix React 19 issues first", "One file at a time", "Critical failures first", "Let me review the failures myself"]</options>
   </ask_followup_question>
   ```

## 4. Fix Tests Systematically

1. For each failing test file, make the necessary fixes:
   - Update React 19 patterns (act() wrapping)
   - Fix import paths to use @repo/shared
   - Update mock data structures
   - Fix async testing patterns

2. After each fix, verify the specific test passes:
   ```bash
   npm run test:unit -- path/to/fixed/test.spec.ts
   ```

3. Keep user informed of progress:
   ```xml
   <ask_followup_question>
   <question>Fixed test file [filename]. The test now passes! 

   Remaining failing tests: [count]

   Should I continue with the next failing test?</question>
   <options>["Yes, continue", "Let me review this fix first", "Stop here"]</options>
   </ask_followup_question>
   ```

## 5. Validate All Tests Pass

1. After fixing individual tests, run the full test suite:
   ```bash
   npm run test:unit
   ```

2. If any tests are still failing, repeat the process:
   ```bash
   npm run test:unit -- --verbose | grep -A 5 -B 5 "FAIL"
   ```

## 6. Run Pre-commit Validation

1. Ensure all checks pass:
   ```bash
   npm run claude:check
   ```

2. If successful, ask user about committing:
   ```xml
   <ask_followup_question>
   <question>All frontend tests are now passing! 🎉

   Test results:
   - ✅ All unit tests pass
   - ✅ TypeScript compilation succeeds
   - ✅ Linting passes

   Would you like me to commit these test fixes?</question>
   <options>["Yes, commit the fixes", "Let me review the changes first", "No, I'll handle the commit"]</options>
   </ask_followup_question>
   ```

## 7. Commit Test Fixes

1. If user approves, create a comprehensive commit:
   ```bash
   git add .
   git status
   ```

2. Create descriptive commit message:
   ```bash
   cat << EOF | git commit -F -
   fix: resolve 10 failing frontend test suites

   - Update tests for React 19 compatibility
   - Fix import paths to use @repo/shared types
   - Update mock data structures for current schema
   - Improve async testing patterns with proper act() wrapping
   - Ensure all test utilities are properly imported

   All frontend unit tests now pass ✅

   🤖 Generated with [Claude Code](https://claude.ai/code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   ```

3. Confirm commit success:
   ```bash
   git log --oneline -1
   ```

</detailed_sequence_of_steps>

<test_fix_patterns>

# Common React 19 Test Fix Patterns

## Pattern 1: act() Wrapping for State Updates
```typescript
// Old pattern (React 18)
fireEvent.click(button)
expect(component).toHaveTextContent('Updated')

// New pattern (React 19)
await act(async () => {
  fireEvent.click(button)
})
expect(component).toHaveTextContent('Updated')
```

## Pattern 2: Import Path Updates
```typescript
// Old pattern
import { PropertyType } from '../types/property'

// New pattern
import { PropertyType } from '@repo/shared'
```

## Pattern 3: Mock Data Structure Updates
```typescript
// Check current shared types first
<read_file>
<path>packages/shared/src/types/properties.ts</path>
</read_file>

// Update mock data to match current schema
const mockProperty = {
  id: 'prop_123',
  org_id: 'org_456',  // Ensure org_id is included
  name: 'Test Property',
  // ... other required fields
}
```

## Pattern 4: Async Testing with React 19
```typescript
// Old pattern
test('async component', () => {
  render(<AsyncComponent />)
  waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })
})

// New pattern
test('async component', async () => {
  await act(async () => {
    render(<AsyncComponent />)
  })
  
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })
})
```

</test_fix_patterns>

<verification_commands>

# Verification Commands

```bash
# Run specific test file
npm run test:unit -- path/to/test.spec.ts

# Run tests in watch mode for active development
npm run test:unit -- --watch

# Run tests with coverage
npm run test:coverage

# Check for React 19 compatibility issues
npm run test:unit -- --verbose 2>&1 | grep -i "act\|async\|warning"

# Full pre-commit validation
npm run claude:check
```

</verification_commands>