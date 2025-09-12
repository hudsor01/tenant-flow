# CLAUDE.md

Guidance for Claude Code working with this repository.

Read the CLAUDE_SESSION_NOTES.md for the latest in migrations, activities etc
and overall context before proceeeding with the rest of this file

## MANDATORY RULES - NO EXCEPTIONS

### NO EMOJIS RULE
- Never use emojis in communication unless user explicitly requests them
- Never use emojis in code, comments, or file content
- Use Lucide Icons instead for visual elements in UI components
- Keep all responses professional and emoji-free
- Focus on clear, direct technical communication

### MODERN SAAS DESIGN PRINCIPLES
- **Ultra-Clean Minimalism**: Abundant white space, typography hierarchy, subtle shadows, neutral color palettes
- **Conversion-Focused Layout**: Hero above fold, social proof early, progressive disclosure, multiple CTAs
- **Performance & Polish**: Fast animations (200-300ms), micro-interactions, perfect mobile, accessibility first
- **Clear Copywriting**: Benefit-focused headlines, scannable content, numbers & specifics, action-oriented CTAs
- **Visual Consistency**: Design tokens, limited color palette (2-3 colors max), icon consistency, button hierarchy
- **Component-Based Architecture**: Reusable blocks, consistent spacing, scalable system

### CORE PRINCIPLES
- **DRY**: Search before writing (`rg -r "functionName"`). Consolidate code reused ≥2 places
- **KISS**: Choose simplest solution. Delete code instead of adding when possible
- **NO ABSTRACTIONS**: Use native platform features directly. No wrappers, factories, or custom layers
- **PRODUCTION MINDSET**: Security first, platform-native, performance-conscious, reliability-focused

### TYPESCRIPT SHARED TYPES ARCHITECTURE - MANDATORY COMPLIANCE

**ABSOLUTE PROHIBITIONS - ZERO TOLERANCE**
- **NEVER create new type files** without explicit approval and architectural review
- **NEVER duplicate type definitions** - search existing types first with `rg -r "TypeName"`
- **NEVER import from removed paths** - all legacy type paths are forbidden
- **NEVER use custom utility types** when native TypeScript 5.9.2 equivalents exist
- **NEVER break the single source of truth** - consolidation is permanent

**MANDATORY TYPE IMPORT PATTERNS**

CORRECT - Single source imports:
- import type { ApiResponse, DashboardStats, PropertyStats } from '@repo/shared'
- import type { User, Property, Unit, Tenant } from '@repo/shared'
- import type { ValidatedUser, AuthUser } from '@repo/shared'

FORBIDDEN - Legacy/removed paths:
- import type { ApiResponse } from '@repo/shared/types/common' - REMOVED
- import type { TenantStats } from '@repo/shared/types/stats' - REMOVED  
- import type { ValidatedUser } from '@repo/shared/types/backend' - REMOVED
- import type { StorageUploadResult } from '@repo/shared/types/storage' - REMOVED

**CONSOLIDATED TYPE ARCHITECTURE - IMMUTABLE STRUCTURE**

File Structure:
- core.ts - PRIMARY: All shared types, utilities, patterns
- index.ts - EXPORT HUB: Single import source
- domain.ts - CONSOLIDATED: Contact, storage, websocket, theme
- backend-domain.ts - CONSOLIDATED: Backend context, config, performance
- auth.ts - AUTH DOMAIN: User management, authentication
- supabase-generated.ts - SUPABASE: Generated database types
- frontend.ts - FRONTEND: UI-specific types only
- Only minimal essential files allowed

**NATIVE TYPESCRIPT 5.9.2 PATTERNS - USE THESE ONLY**

Required Patterns:
- Native Result Pattern: ApiResponse with success/error discriminated union
- Native Template Literals: CamelCase string manipulation types  
- Native Conditional Types: DeepReadonly using recursive conditional logic
- Native Utility Types: CreateInput using Omit, UpdateInput using Partial
- Use built-in TypeScript utilities instead of custom implementations

**TYPE LOCATION RULES - STRICT ENFORCEMENT**

1. **Core Types** (`types/core.ts`):
   - All shared API patterns (ApiResponse, QueryParams, Pagination)
   - Entity types from Supabase (User, Property, Unit, Tenant, etc.)
   - Common utilities (DeepReadonly, DeepPartial, Result<T,E>)
   - Dashboard statistics (DashboardStats, PropertyStats, etc.)

2. **Domain Types** (`types/domain.ts`):
   - Contact forms, storage uploads, websocket messages
   - Session management, user management configs
   - Theme types, webhook event types

3. **Backend Types** (`types/backend-domain.ts`):
   - ValidatedUser, Context, AuthenticatedContext
   - Router output interfaces, config types
   - Performance metrics, health checks

4. **Auth Types** (`types/auth.ts`):
   - AuthUser, LoginCredentials, RegisterCredentials
   - JWT payload types, authentication flows
   - Permission enums, security validation

**MODIFICATION RULES - BREAKING CHANGE PROTOCOL**

**Before Adding ANY Type:**
1. Search existing: `rg -r "NewTypeName" packages/shared/src/`
2. Check if native TypeScript utility exists
3. Verify it belongs in existing consolidated file
4. Follow naming conventions: `PascalCase` for types, `camelCase` for properties

**Before Modifying Existing Types:**
1. Run full typecheck: `npm run typecheck`  
2. Check breaking changes across frontend/backend
3. Update with backward compatibility when possible
4. Document migration path if breaking

**PERFORMANCE & DEVELOPER EXPERIENCE ENFORCEMENT**

- **Single Import Rule**: `import type { A, B, C } from '@repo/shared'` - never scatter imports
- **Build Performance**: Modifications must not increase TypeScript compilation time
- **IDE Performance**: Types must provide instant intellisense without lag
- **Zero Circular Dependencies**: Violations break the build immediately

**VALIDATION REQUIREMENTS**

Every type change MUST pass:
- npm run typecheck - All packages compile
- npm run build:backend - Backend builds successfully  
- npm run build:frontend - Frontend builds successfully
- npm run test:unit - Type-dependent tests pass

**MIGRATION ENFORCEMENT - NO LEGACY SUPPORT**

- **Zero Legacy Compatibility**: Old import paths must fail compilation
- **Forced Migration**: Developers MUST use new consolidated patterns
- **Documentation**: All legacy patterns removed from examples/docs
- **Training**: New developers start with modern patterns only

**SUCCESS METRICS - CONTINUOUS MONITORING**

- **File Count**: Shared types directory capped at ≤20 essential files
- **Duplication**: Zero tolerance for duplicate type definitions
- **Build Speed**: TypeScript compilation ≤3 seconds for shared package
- **Developer Velocity**: New types added to existing files, not new files

**VIOLATION CONSEQUENCES**: Code that violates these rules will be rejected in PR reviews and must be refactored before merge. This architecture is production-tested and performance-optimized - deviations compromise system stability.

**QUICK REFERENCE - COMMON TYPE TASKS**

Search before creating:
- rg -r "UserProfile|DashboardData|ApiResponse" packages/shared/src/

Add to existing files:
- Edit packages/shared/src/types/core.ts for new shared types
- Use consolidated imports from '@repo/shared'

Test immediately:
- npm run typecheck
- npm run build:backend

**MIGRATION GUIDE FOR EXISTING CODE**

OLD to NEW Migration Examples:

Before - Scattered imports:
- import { ApiResponse } from '@repo/shared/types/common'
- import { TenantStats } from '@repo/shared/types/stats' 
- import { ValidatedUser } from '@repo/shared/types/backend'

After - Single consolidated import:
- import type { ApiResponse, TenantStats, ValidatedUser } from '@repo/shared'

Before - Custom utility types:
- type MyDeepPartial<T> = { [P in keyof T]?: MyDeepPartial<T[P]> }

After - Native TypeScript utilities:
- import type { DeepPartial } from '@repo/shared'

### BACKEND RULES (75% code reduction achieved)
**FORBIDDEN**: Custom DTOs, validation decorators, service layers, repositories, middleware, interceptors, wrappers, helper classes, factories, builders, custom error handlers

**ONLY USE**: Built-in NestJS pipes (ParseUUIDPipe, DefaultValuePipe, ParseIntPipe), Native exceptions (BadRequestException, NotFoundException), Direct PostgreSQL RPC via Supabase, JSON Schema definitions

Protected files: `apps/backend/ULTRA_NATIVE_ARCHITECTURE.md`

## NestJS Dependency Injection Crisis Prevention

### Coffee Shop Rule
Controller=Cashier (takes orders), Service=Barista (makes coffee), Database=Machine (does work) | WRONG: Cashier making coffee | RIGHT: Cashier→Barista→Machine

### 6-Point DI Failure Checklist
When you get "Cannot read properties of undefined (reading 'X')":
1. **Missing Service in Module providers[]** - Service not registered in @Module providers
2. **Wrong Injection Pattern** - Controller directly accessing database instead of service layer  
3. **Missing @Injectable()** - Service class needs @Injectable() decorator
4. **Missing Module Imports** - Service needs another service but module doesn't import it
5. **Circular Dependencies** - Services importing each other, use @Global() modules instead
6. **Parameter Mismatch** - Constructor parameter name/type doesn't match injection

### Emergency Commands
Check logs: `doppler run -- npm run dev` | Find modules: `rg -A5 "@Module" --type ts` | Check providers: `rg "providers.*\[" --type ts`

### Ultra-Native Patterns
**Controller**: Service layer + PinoLogger only, delegate to services, use built-in pipes | **Service**: SupabaseService + PinoLogger only, direct RPC calls under 30 lines | **Module**: imports/providers/exports arrays, @Global() for shared services

### Critical Rules  
**No Abstractions**: Direct PostgreSQL RPC via Supabase, no repositories/DTOs/wrappers | **Built-in NestJS**: ParseUUIDPipe, exceptions, guards only | **Error Handling**: Simple logging + NestJS exceptions

### Mandatory Testing
**Every update/action/implementation requires test proving production functionality** | **Test Coverage**: Controllers, Services, Critical paths with edge cases | **Production Mirroring**: Tests must replicate actual production behavior exactly

### Success Verification
Server starts with "dependencies initialized" | Public endpoints work | Protected endpoints work with auth | No undefined property errors

### UI/UX RULES
- Reuse existing pages/layouts/components first
- Use shadcn components vs creating custom
- Flat component organization in existing folders
- Central Zustand store instead of component state (except temporary UI states)
- Direct store access via hooks - no prop drilling
- Sync Tailwind and Magic UI themes for primary color
- Use shadcn charts for charting needs

### NATIVE PLATFORM REPLACEMENTS
- **Auth**: Supabase Auth | **Storage**: Supabase Storage | **Real-time**: Supabase Realtime
- **Jobs**: BullMQ/Vercel Cron | **Email**: Resend API | **Validation**: Zod schemas
- **Data**: TanStack Query | **Forms**: React Hook Form | **State**: Zustand
- **Styles**: Tailwind classes | **Components**: Radix/ShadCN | **Dates**: date-fns
- **HTTP**: Native fetch

### UI COMPONENT PATTERNS
- **Buttons**: Radix Button + Tailwind | **Forms**: Radix Form + React Hook Form
- **Modals**: Radix Dialog | **Dropdowns**: Radix Select | **Tooltips**: Radix Tooltip
- **Loading**: Radix Progress | **Layouts**: CSS Grid + Tailwind
- **Animations**: Tailwind transitions + Framer Motion | **Themes**: CSS variables
- **Responsive**: Tailwind prefixes | **Focus**: Radix utilities | **Keyboard**: Radix handlers

### BEFORE EVERY CHANGE
1. Does this exist? (Search first!)
2. Can I use native platform feature?
3. Can I delete code instead?
4. Is this the simplest solution?
5. Will another developer understand immediately?
6. Does this follow accessibility standards?
7. Is this predictable and consistent?

## Tech Stack

**Frontend (Vercel)**
- Next.js 15.5.0 + React 19.1.1 (Turbopack required)
- Radix UI + TailwindCSS 4.1.12 + ShadCN
- TanStack Query 5.85.5, Zustand 5.0.8, React Hook Form 7.62.0
- Framer Motion 12.23.12, Lucide Icons 0.540.0, Recharts 3.1.2

**Backend (Railway)**
- NestJS 11.1.6 + Fastify 11.x
- Supabase 2.56.0, Stripe 18.4.0, Resend 6.0.1
- In-memory cache + Database query cache
- Health: `/health/ping`

**Shared**
- Node.js 22.x (Railway: 24.x Docker), npm 11.5.2, Turborepo 2.5.6
- TypeScript 5.9.2 strict, Zod 4.0.17

## Commands

**Dev**: `npm run dev` | **Clean**: `npm run dev:clean`
**Quality**: `npm run claude:check` | `npm run lint` | `npm run typecheck` | `npm run test:unit`
**Build**: `npm run build` | `build:frontend` | `build:backend`
**Test**: `test:integration` | `test:e2e` | `test:production`
**Database**: `npm run update-supabase-types`
**Secrets**: `secrets:generate` | `secrets:check` | `secrets:export`

## Architecture

**State Management**
- Zustand: Global UI state, session, notifications, theme
- TanStack Query: Server state, caching, optimistic updates
- React Hook Form: Form state (no abstractions)
- URL State: Navigation, filters via Next.js router

**Frontend Structure**
- `components/`: Pure UI (Radix + ShadCN)
- `hooks/api/`: TanStack Query hooks
- `lib/`: Utilities, API clients, validation
- `stores/`: Zustand global state
- `providers/`: React context providers

**Backend Structure**
- `shared/`: Guards, decorators, filters, types
- `auth/`, `billing/`, `properties/`, `tenants/`, `maintenance/`, `dashboard/`: Domain modules

**Data Flow**
- Read: Component → TanStack Query → API → Backend → Supabase
- Write: Component → Server Action → Backend → Supabase → Webhook → Cache Update
- Real-time: Supabase Realtime → Frontend → Cache invalidation

## Monorepo

- `apps/`: frontend, backend
- `packages/`: shared (build first), emails, tailwind-config, typescript-config

Build dependencies: shared → frontend/backend

## Deployment

**Frontend (Vercel)**: https://tenantflow.app - Auto-deploys from main
**Backend (Railway)**: Dockerfile, startCommand = `node apps/backend/dist/main.js`

## Critical Files

- `apps/frontend/src/stores/app-store.ts`: Main Zustand store
- `apps/frontend/src/lib/api-client.ts`: Core API client
- `apps/frontend/src/lib/query-keys.ts`: TanStack Query cache keys
- `apps/backend/src/shared/`: Backend utilities
- `packages/shared/src/types/`: Shared TypeScript types

## Testing Strategy

### MANDATORY TEST COVERAGE
- **Controllers**: All endpoints with auth, validation, error handling
- **Services**: All business logic with edge cases and error scenarios  
- **Critical Paths**: Auth, billing, user management, core business entities

### TEST QUALITY STANDARDS
- **Edge Cases**: Invalid inputs, missing data, network failures
- **Security**: Authorization, input validation, data sanitization
- **Performance**: Concurrent requests, timeout handling
- **Integration**: Database operations, external service calls

### TEST ORGANIZATION
- Unit tests: `/src/**/*.spec.ts`
- Integration tests: `/src/**/*.integration.spec.ts`
- Use SilentLogger for clean test output
- Mock external dependencies (Supabase, Stripe, Email)

### TESTING METHODOLOGY
```typescript
// Proven pattern for 100% coverage
describe('validation', () => {
  it('validates production input patterns', async () => {
    await expect(controller.method(user, 'invalid-uuid'))
      .rejects.toThrow('Invalid unit ID')
  })
})

it('mirrors production behavior exactly', async () => {
  // Test actual edge cases, including bugs/quirks
  service.method.mockResolvedValue(mockData)
  const result = await controller.method(user, edgeCaseParams)
  expect(result).toEqual(expectedProductionBehavior)
})
```

### CURRENT TESTING STATUS
- **Controllers**: 5/17 tested (Dashboard/Maintenance have 100% coverage)
- **Services**: 15/22 tested (Auth, Database, PDF, Business Logic covered)
- **Critical Missing**: Auth controllers, Stripe controllers (security/financial risk)
- **Quality**: Excellent infrastructure, proven methodology established

## Session Notes

**File**: `CLAUDE_SESSION_NOTES.md` in project root
**Update**: After EVERY meaningful action, discovery, or decision
**Include**: Current context, recent changes, discoveries, TODOs

## Success Metrics

Your success = Production-ready code with zero duplication
Every line must justify its existence
When in doubt, delete it
