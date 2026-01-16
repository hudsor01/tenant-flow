# Coding Conventions

**Analysis Date:** 2026-01-15

## Naming Patterns

**Files:**
- `kebab-case.ts` for all modules (`property-card.tsx`, `use-tenant.ts`)
- `*.spec.ts` for backend tests (Jest), `*.test.ts` for frontend tests (Vitest)
- `*.dto.ts` for NestJS Data Transfer Objects
- `*.module.ts`, `*.controller.ts`, `*.service.ts` for NestJS components
- `UPPERCASE.md` for important docs (CLAUDE.md, README.md)

**Functions:**
- camelCase for all functions (`fetchProperties`, `createTenant`)
- No special prefix for async functions
- `handle{Event}` for event handlers (`handleClick`, `handleSubmit`)
- `use{Name}` for React hooks (`useProperties`, `useTenant`)

**Variables:**
- camelCase for variables (`tenantData`, `propertyList`)
- UPPER_SNAKE_CASE for constants (`MAX_FILE_SIZE`, `API_BASE_URL`)
- No underscore prefix for private members (TypeScript private keyword)

**Types:**
- PascalCase for interfaces, no I prefix (`Property`, not `IProperty`)
- PascalCase for type aliases (`PropertyData`, `TenantInput`)
- PascalCase for enums (use text CHECK constraints, not TypeScript enums)

## Code Style

**Formatting (Prettier):**
- Config: `.prettierrc` in root
- Tab indentation (not spaces)
- No semicolons
- Single quotes for strings
- Trailing commas where valid

**Linting (ESLint):**
- Config: `eslint.config.mjs` (flat config)
- TypeScript-ESLint recommended rules
- No `any` types (use `unknown` with type guards)
- No unused variables
- Run: `pnpm lint`, `pnpm lint:fix`

**TypeScript:**
- Strict mode enabled
- No implicit any
- Strict null checks
- Path aliases: `#` for frontend, `@repo/` for packages

## Import Organization

**Order:**
1. Node.js built-ins (if any)
2. External packages (`react`, `@tanstack/react-query`, etc.)
3. Internal packages (`@repo/shared/types/core`)
4. Path alias imports (`#components/ui/button`)
5. Relative imports (`./utils`, `../types`)
6. Type imports (`import type { Property }`)

**Grouping:**
- Blank line between groups
- Alphabetical within each group (Prettier handles)
- Type imports at end of each group

**Path Aliases:**
- `#` → `apps/frontend/src/` (frontend only)
- `@repo/shared` → `packages/shared/` (cross-package)
- Direct imports only, NO barrel file re-exports

## Error Handling

**Patterns:**
- Backend: Throw NestJS built-in exceptions (`NotFoundException`, `BadRequestException`)
- Frontend: Handle via TanStack Query error states
- Never create custom error classes
- Always include descriptive error messages

**Error Types:**
- `NotFoundException` - Resource not found (404)
- `BadRequestException` - Invalid input (400)
- `UnauthorizedException` - Not authenticated (401)
- `ForbiddenException` - Not authorized (403)

**Supabase Errors:**
- Type as `PostgrestError` from `@supabase/supabase-js`
- Check `error.code` for specific handling

## Logging

**Framework:**
- Backend: Winston logger (`apps/backend/src/shared/logger/`)
- Frontend: Console for development only

**Patterns:**
- Structured logging with context objects
- Log at service boundaries, not in utilities
- Levels: debug, info, warn, error
- No `console.log` in production backend code

## Comments

**When to Comment:**
- Explain why, not what
- Document business logic and edge cases
- Explain workarounds or non-obvious decisions
- Avoid obvious comments

**JSDoc/TSDoc:**
- Required for public API functions in shared package
- Optional for internal functions if signature is clear
- Use `@param`, `@returns`, `@throws` tags

**TODO Comments:**
- Format: `// TODO: description`
- Link to issue if exists: `// TODO: Fix race condition (issue #123)`
- Avoid leaving TODOs without actionable context

## Function Design

**Size:**
- Maximum 50 lines per function
- Maximum 300 lines per component/file
- Extract helper functions for complex logic

**Parameters:**
- Maximum 3 parameters
- Use options object for 4+ parameters
- Destructure objects in parameter list

**Return Values:**
- Explicit return statements
- Return early for guard clauses
- Consistent return types (don't mix undefined/null)

## Module Design

**Exports:**
- Named exports preferred
- NO default exports (except legacy React components)
- Each file exports only what it defines

**Barrel Files:**
- **FORBIDDEN** - Never create `index.ts` re-exports
- Import directly from source file
- This prevents circular dependencies and improves tree-shaking

**Example:**
```typescript
// ❌ FORBIDDEN
export { Button } from './button'
export type { ButtonProps } from './button'

// ✅ CORRECT
import { Button } from '#components/ui/button'
import type { ButtonProps } from '#components/ui/button'
```

## React Patterns

**Components:**
- Server Components by default
- Add `'use client'` only when needed (hooks, events, browser APIs)
- Props typed inline or with separate interface

**State:**
- Server state: TanStack Query
- Global UI state: Zustand
- Form state: TanStack Form
- URL state: nuqs

**Hooks:**
- Custom hooks in `hooks/` directory
- API hooks use `queryOptions()` factory pattern
- Name hooks `use{Resource}` or `use{Action}`

## Database Patterns

**Types:**
- Never use PostgreSQL ENUM types
- Use `text` columns with `CHECK` constraints
- Generate types via `pnpm db:types`

**RLS Policies:**
- Separate policies for SELECT, INSERT, UPDATE, DELETE
- Always use `(select auth.uid())` pattern (with select wrapper)
- Role-specific: `to authenticated` or `to anon`

---

*Convention analysis: 2026-01-15*
*Update when patterns change*
