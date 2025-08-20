# TenantFlow Coding Standards

## Required Pre-Commit Validation
```bash
npm run claude:check  # MUST pass before any commit
```

## Code Quality Standards
- **TypeScript Strict**: Use strict mode, no implicit any
- **Error Handling**: Comprehensive try-catch blocks with specific error types
- **Input Validation**: Zod schemas for all user inputs and API endpoints
- **Security**: Never hardcode secrets, API keys, or sensitive data

## Testing Requirements
- **Unit Tests**: Required for all services and business logic
- **E2E Tests**: Required for critical user flows (auth, payment, signup)
- **Test Coverage**: Minimum 80% coverage across the codebase
- **React 19 Testing**: Use proper act() wrapping for state updates

## File Organization
- **Naming Conventions**: PascalCase for components, camelCase for functions
- **Import Order**: External libs → Internal modules → Relative imports
- **Component Structure**: Server components in pages, client components minimal
- **Service Structure**: Service → Repository → Database pattern

## Code Patterns to Follow
- **Prefer Editing**: Edit existing files over creating new ones
- **Pattern Consistency**: Follow established patterns in neighboring files
- **Shared Utilities**: Use utilities from `packages/shared`
- **Error Boundaries**: Implement proper error boundaries for components

## Code Patterns to Avoid
- **Client Components**: Don't use 'use client' unless absolutely necessary
- **Direct DB Access**: Never bypass RLS with direct database queries
- **Type Any**: Avoid any types, use proper TypeScript definitions
- **Skipped Tests**: Don't skip tests without explicit documented reason