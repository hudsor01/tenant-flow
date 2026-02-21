# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Standards (Non-Negotiable)

### Zero Tolerance Rules

1. **No `any` types** - Use `unknown` with type guards, never `any`
2. **No custom abstractions** - Use native NestJS/React patterns directly
3. **No duplicate types** - Search `packages/shared/src/types/` before creating
4. **No commented-out code** - Delete it, don't comment it
5. **No inline styles** - Use Tailwind utilities or design tokens
6. **No emojis in code** - Use Lucide Icons for UI elements
7. **No barrel files or re-exports** - See rules below
8. **No PostgreSQL ENUMs** - Use `text` columns with `CHECK` constraints (see Database section)

### No Barrel Files / No Re-Exports (CRITICAL)

**NEVER create `index.ts` or `index.tsx` files that re-export from other modules.**

**NEVER re-export anything from another file.** Each file exports only what it defines.

```typescript
// ❌ FORBIDDEN - index.ts barrel file
export { Button } from './button'
export { Input } from './input'
export type { ButtonProps } from './button'

// ❌ FORBIDDEN - Re-exporting in any file
import { SomeType } from './types'
export { SomeType }  // NO!
export type { SomeType }  // NO!
export type { SomeType } from './types'  // NO!

// ✅ CORRECT - Import directly from the source file
import { Button } from '#components/ui/button'
import { Input } from '#components/ui/input'
import type { SomeType } from './types'
```

**Rules:**
- Import directly from the file that defines the export
- Never create index.ts files for "convenience"
- If a consumer needs a type, they import from the file that defines it
- Each file is responsible only for its own exports

### DRY (Don't Repeat Yourself)

Before creating anything new, search first:
```bash
rg "TypeName" packages/shared/src/types/     # Types
rg "ComponentName" apps/frontend/src/        # Components
rg "functionName" apps/backend/src/          # Backend functions
```

Consolidate code reused ≥2 places into:
- Types → `packages/shared/src/types/`
- Hooks → `apps/frontend/src/hooks/`
- Utilities → `apps/frontend/src/lib/` or `apps/backend/src/shared/`

### KISS (Keep It Simple)

- Prefer simple, readable solutions over clever abstractions
- Solve the current problem first, no premature optimization
- Use Server Components by default; only add `'use client'` when necessary
- Maximum component size: 300 lines (split larger components)
- Maximum function size: 50 lines (extract helper functions)

### YAGNI (You Aren't Gonna Need It)

- Do NOT implement features not immediately required
- No speculative coding, no "just in case" implementations
- Remove dead code immediately—don't comment it out "for later"
- If it's not needed now, it will not be developed

### Type System Rules

**Single source of truth: `packages/shared/src/types/`**

```typescript
// ✅ CORRECT - Direct path imports (explicit, tree-shakeable)
import type { Property } from '@repo/shared/types/core';
import type { Tenant } from '@repo/shared/types/domain';
import type { AuthUser } from '@repo/shared/types/auth';

// ❌ FORBIDDEN - Barrel imports (slow builds, circular deps, hidden coupling)
import type { Property, Tenant, Lease } from '@repo/shared';

// ❌ WRONG - Local type definitions that duplicate shared
interface Property { ... }
```

Type file purposes:
- `core.ts` - DB row aliases, enum string unions, insert/update helpers (PRIMARY)
- `relations.ts` - Joined types with eager-loaded relations
- `api-contracts.ts` - API request/response shapes
- `financial-statements.ts` - Income statement, cash flow, balance sheet types
- `analytics.ts` - Dashboard KPIs, occupancy, revenue chart types
- `database-rpc.ts` - Supabase RPC function return types
- `stripe.ts` - Stripe Connect account and subscription types
- `domain.ts` - Cross-domain business objects
- `auth.ts` - Authentication types
- `supabase.ts` - Generated database types (DO NOT EDIT)
- `frontend.ts` - UI-specific types only
- `sections/<domain>.ts` - Display types for complex joined shapes (e.g. `MaintenanceDisplayRequest`)

### Type Lookup Protocol (MANDATORY)

Before defining any new type, check in this exact order:

1. Search `packages/shared/src/types/TYPES.md` — master lookup table for all shared types
2. Check `packages/shared/src/types/supabase.ts` — raw DB rows via `Tables<'tablename'>`
3. Check `packages/shared/src/types/core.ts` — named row aliases and enum string unions
4. Check `packages/shared/src/types/relations.ts` — joined types with relations
5. Check `packages/shared/src/types/api-contracts.ts` — API shapes
6. Check `packages/shared/src/types/sections/<domain>.ts` — display types for that domain

**Zero tolerance**: If a type exists in shared, you MUST use it. Creating a local duplicate type that mirrors a shared type is a blocking violation. If you need a new shared type, add it to the appropriate shared file.

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Types/Interfaces | PascalCase | `PropertyData`, `TenantInput` |
| Functions/Methods | camelCase | `fetchProperties`, `createTenant` |
| Components | PascalCase | `PropertyCard`, `TenantForm` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `API_BASE_URL` |
| Files | kebab-case | `property-card.tsx`, `use-tenant.ts` |

### Error Handling

**Backend (NestJS)**: Use built-in exceptions only
```typescript
// ✅ CORRECT
throw new NotFoundException('Property not found');
throw new BadRequestException('Invalid input');
throw new ForbiddenException('Access denied');
throw new UnauthorizedException('Not authenticated');

// ❌ WRONG - Custom error classes
throw new CustomPropertyError('...');
```

**Frontend**: Handle via TanStack Query states
```typescript
const { data, error, isError } = useProperty(id);

if (isError) {
  return <ErrorBoundary error={error} />;
}
```

**Supabase errors**: Type as `PostgrestError`
```typescript
import type { PostgrestError } from '@supabase/supabase-js';

const { data, error } = await supabase.from('properties').select();
if (error) {
  // error is PostgrestError with { code, message, details, hint }
}
```

### API Base URL (Single Source of Truth)

```typescript
// ✅ CORRECT - Import from centralized constant
import { API_BASE_URL } from '@/lib/api-client';

// ❌ WRONG - Duplicate inline fallback
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600';
```

All backend routes use `/api/v1/` prefix (configured in `apps/backend/src/main.ts`).

---

## Project Overview

TenantFlow is a multi-tenant property management SaaS platform. Property managers and owners can manage properties, tenants, leases, maintenance requests, payments, and financial reporting.

**Tech Stack:**
- Frontend: Next.js 16 + React 19 + TailwindCSS 4 + TanStack Query/Form + Zustand (Vercel)
- Backend: NestJS 11 + PostgreSQL via Supabase + Stripe (Railway)
- Shared: TypeScript 5.9 strict mode + Zod 4 validation
- Package Manager: pnpm 10 with workspaces
- Secrets: Environment variables (`SUPABASE_*` prefix for Supabase, see turbo.json)

---

## Architecture

### Monorepo Structure

```
apps/
├── frontend/          # Next.js app (Vercel, localhost:3050)
├── backend/           # NestJS API (Railway, localhost:4650)
└── e2e-tests/         # Playwright tests
packages/
├── shared/            # Types, utilities, validation schemas
└── typescript-config/ # Shared TSConfig
supabase/
├── migrations/        # SQL migrations (timestamp-prefixed)
└── seed.sql          # Seed data
```

### Backend Structure (NestJS)

```
apps/backend/src/
├── modules/           # Domain modules (flat, no sub-modules)
│   ├── properties/
│   │   ├── properties.controller.ts
│   │   ├── properties.service.ts
│   │   └── properties.module.ts
│   ├── tenants/
│   ├── leases/
│   ├── maintenance/
│   └── billing/
├── shared/            # Global shared code (@Global() module)
│   ├── auth/          # Guards, strategies
│   ├── middleware/    # Security headers, rate limiting
│   └── shared.module.ts
├── database/          # Supabase client and services
└── app.module.ts
```

### Frontend Structure (Next.js)

```
apps/frontend/src/
├── app/               # Next.js App Router
│   ├── (owner)/       # Property owner routes
│   ├── (tenant)/      # Tenant portal routes
│   ├── api/           # API routes
│   └── auth/          # Auth pages
├── components/
│   ├── ui/            # ShadCN UI components
│   └── [domain]/      # Domain-specific components
├── hooks/
│   ├── api/           # TanStack Query hooks
│   └── use-*.ts       # Other hooks
├── stores/            # Zustand stores
└── lib/               # Utilities
```

---

## Essential Commands

### Development

```bash
pnpm dev                              # Start all services
pnpm --filter @repo/frontend dev      # Frontend only (localhost:3050)
pnpm --filter @repo/backend dev       # Backend only (localhost:4650)
```

### Quality Checks

```bash
pnpm typecheck                        # Type check all packages
pnpm lint                             # Lint all packages
pnpm lint:fix                         # Auto-fix lint issues
```

### Testing

```bash
# Unit Tests
pnpm test:unit                        # All unit tests
pnpm test:unit:backend                # Backend only (Jest)
pnpm test:unit:frontend               # Frontend only (Vitest)

# Single test file
pnpm --filter @repo/backend test:unit -- --testPathPattern="properties.service"
pnpm --filter @repo/frontend test:unit src/hooks/__tests__/use-tenant.test.ts

# Integration Tests
pnpm test:integration                 # Backend integration tests

# E2E Tests
pnpm test:e2e                         # All E2E tests (Playwright)
pnpm test:e2e:ui                      # With Playwright UI
pnpm test:e2e:debug                   # Debug mode
```

### Building

```bash
pnpm build:shared                     # Build shared package (run first if types change)
pnpm build                            # Build all packages
```

### Database

```bash
pnpm db:types                         # Regenerate TypeScript types + Zod schemas from live DB
pnpm db:push                          # Push migrations to remote
pnpm db:pull                          # Pull schema changes from remote
pnpm db:reset                         # Reset local database
```

**Auto-regeneration** (enforced, you can't skip this):
- Pre-commit hook runs `pnpm db:types` automatically before every commit
- All `validate` scripts regenerate types first
- Types are written to `packages/shared/src/types/supabase.ts`
- Zod schemas are regenerated in `packages/shared/src/validation/generated-schemas.ts`

**AI Schema Reference**: Serena memory `database-schema` contains full schema documentation

### Validation (before commits)

```bash
pnpm validate:quick                   # DB types + Typecheck + Lint + Unit tests
pnpm validate                         # DB types + Full validation suite
```

---

## Backend Patterns

### Ultra-Native NestJS Philosophy

Use official @nestjs/* packages directly. **Never create custom abstractions**.

**ALLOWED:**
- Official @nestjs/* packages
- Built-in pipes: `ParseUUIDPipe`, `ParseIntPipe`, `ValidationPipe`
- Built-in guards and interceptors
- Built-in exceptions

**FORBIDDEN:**
- Custom service layers, repositories, custom DTOs
- Custom decorators (`@CurrentUserId`, `@CurrentContext`)
- Custom validation pipes, interceptors
- Wrappers, helpers, factories, builders

### Zod DTO Pattern

All DTOs use `nestjs-zod` wrapping shared Zod schemas (single source of truth):

```typescript
// packages/shared/src/validation/properties.ts
export const propertyCreateSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  type: propertyTypeSchema,
});

// apps/backend/src/modules/properties/dto/create-property.dto.ts
import { createZodDto } from 'nestjs-zod';
import { propertyCreateSchema } from '@repo/shared/validation/properties';

export class CreatePropertyDto extends createZodDto(propertyCreateSchema) {}
```

**Benefits:**
- Single source of truth for validation (shared between frontend/backend)
- Automatic type inference from schema
- Automatic OpenAPI/Swagger documentation
- Consistent error messages

### Route Ordering (CRITICAL)

NestJS matches routes top-to-bottom (first match wins). **Static routes MUST come before dynamic routes**:

```typescript
@Controller('properties')
export class PropertiesController {
  // ✅ CORRECT ORDER: Static routes first

  @Get('stats')      // /properties/stats - FIRST
  getStats() {}

  @Get('summary')    // /properties/summary - SECOND
  getSummary() {}

  @Get(':id')        // /properties/:id - LAST (catches all)
  findOne(@Param('id') id: string) {}
}
```

**Why this matters**: If `:id` comes first, requests to `/properties/stats` would match `:id` with `id = "stats"`, causing 404 or wrong data.

**Common mistakes**:
- ❌ Putting `@Get(':id')` before `@Get('export')` - export requests fail
- ❌ Alphabetizing methods - breaks route matching
- ✅ Order by specificity: most specific (static) → least specific (dynamic)

### Controller Pattern

```typescript
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: AuthenticatedRequest) {
    return this.propertiesService.findAll(req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body(new ValidationPipe()) dto: CreatePropertyDto,
    @Request() req: AuthenticatedRequest
  ) {
    return this.propertiesService.create(dto, req.user.id);
  }
}
```

### Service Pattern

```typescript
@Injectable()
export class PropertiesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .rpc('get_user_properties', { user_id: userId });

    if (error) throw new NotFoundException('Properties not found');
    return data;
  }
}
```

---

## Frontend Patterns

### TanStack Query Hooks

Use the `queryOptions()` factory pattern for type-safe, reusable queries:

```typescript
// hooks/api/query-keys/property-keys.ts
import { queryOptions } from '@tanstack/react-query';
import { QUERY_CACHE_TIMES } from '#lib/constants';

export const propertyQueries = {
  all: () => ['properties'] as const,
  lists: () => [...propertyQueries.all(), 'list'] as const,

  // queryOptions factory - returns full query config
  list: (filters?: PropertyFilters) =>
    queryOptions({
      queryKey: [...propertyQueries.lists(), filters],
      queryFn: () => fetchProperties(filters),
      staleTime: QUERY_CACHE_TIMES.STANDARD,
    }),

  detail: (id: string) =>
    queryOptions({
      queryKey: [...propertyQueries.all(), 'detail', id],
      queryFn: () => fetchProperty(id),
      enabled: !!id,
    }),
};

// Usage in components - clean and type-safe
const { data } = useQuery(propertyQueries.detail(id));
const { data } = useSuspenseQuery(propertyQueries.list({ status: 'active' }));

// Prefetching
queryClient.prefetchQuery(propertyQueries.detail(id));
```

**Why `queryOptions()`?**
- Full type inference (queryKey, queryFn, return type)
- Reusable across `useQuery`, `useSuspenseQuery`, `prefetchQuery`
- Centralized query configuration
- Better IDE autocomplete

**Mutations pattern:**
```typescript
export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyQueries.lists() });
    },
  });
}
```

### State Management

| State Type | Tool | Location |
|------------|------|----------|
| Server state | TanStack Query | `hooks/api/` |
| Global UI state | Zustand | `stores/` |
| Form state | TanStack Form | Component-level |
| URL state | nuqs | Component-level |

```typescript
// ✅ CORRECT
const { data: properties } = useProperties();           // Server state
const theme = useAppStore(state => state.theme);        // UI state
const [search, setSearch] = useQueryState('search');    // URL state

// ❌ WRONG - useState for server data
const [properties, setProperties] = useState([]);
useEffect(() => { fetchProperties().then(setProperties) }, []);
```

### Supabase Auth (CRITICAL)

Always use `getAll`/`setAll` cookie methods:

```typescript
// ✅ CORRECT
cookies: {
  getAll() {
    return cookieStore.getAll();
  },
  setAll(cookiesToSet) {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    );
  },
}

// ❌ WRONG - Individual methods (DEPRECATED, WILL BREAK)
cookies: {
  get(name) { return cookieStore.get(name); },
  set(name, value) { cookieStore.set(name, value); },
  remove(name) { cookieStore.remove(name); },
}
```

---

## Database & RLS

### Row Level Security Policies

RLS is enabled on all tables. Policy rules:
- **SELECT**: `USING` clause only
- **INSERT**: `WITH CHECK` clause only
- **UPDATE**: Both `USING` and `WITH CHECK`
- **DELETE**: `USING` clause only

```sql
-- Performance: Always wrap auth.uid() in select
CREATE POLICY "Users can view their properties"
ON properties FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create properties"
ON properties FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = user_id);
```

### Migration Files

Location: `supabase/migrations/`
Format: `YYYYMMDDHHmmss_description.sql`

After creating migrations, regenerate types:
```bash
pnpm update-supabase-types
```

### Text Columns with CHECK Constraints (NOT Enums)

**NEVER use PostgreSQL ENUM types.** Use `text` columns with `CHECK` constraints instead.

**Why NOT enums:**
- Adding values requires `ALTER TYPE` (slow, locks table)
- Removing values is extremely difficult (requires recreating the type)
- Poor compatibility with some ORMs and migration tools
- Creates type dependencies across tables

**Pattern: Text + CHECK constraint:**
```sql
-- ✅ CORRECT: Text column with CHECK constraint
create table maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'open',
  priority text not null default 'normal',

  constraint maintenance_requests_status_check
    check (status in ('open', 'in_progress', 'completed', 'cancelled', 'on_hold')),

  constraint maintenance_requests_priority_check
    check (priority in ('low', 'normal', 'medium', 'high', 'urgent'))
);

-- Adding a new value is simple:
alter table maintenance_requests
  drop constraint maintenance_requests_status_check;

alter table maintenance_requests
  add constraint maintenance_requests_status_check
  check (status in ('open', 'in_progress', 'completed', 'cancelled', 'on_hold', 'waiting_parts'));

-- ❌ WRONG: PostgreSQL ENUM type
create type maintenance_status as enum ('open', 'in_progress', 'completed');
```

**Naming convention for constraints:** `{table_name}_{column_name}_check`

**Adding comments for documentation:**
```sql
comment on constraint maintenance_requests_status_check on maintenance_requests is
  'Valid values: open, in_progress, completed, cancelled, on_hold';
```

---

## Testing

- **Backend unit tests** (`*.spec.ts`): Co-located with source, use Jest, mock Supabase/Stripe/Email
- **Frontend unit tests** (`__tests__/*.test.ts`): Use Vitest, test hooks and utilities
- **Integration tests** (`test/integration/*.integration.spec.ts`): Test with real database
- **E2E tests** (`apps/e2e-tests/`): Playwright tests for full user flows
- Use `SilentLogger` for clean test output
- Test happy paths AND error scenarios

---

## Architectural Decision Records (ADRs)

ADRs document significant architectural decisions with context and rationale.

**Location**: `.planning/adr/`
**Format**: `NNNN-title-in-kebab-case.md`

**Template**:
```markdown
# ADR-NNNN: Title

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-XXXX

## Context
What is the issue that we're seeing that is motivating this decision?

## Decision
What is the change that we're proposing and/or doing?

## Consequences
What becomes easier or harder as a result of this change?
```

**When to create an ADR**:
- Choosing between technologies (e.g., Supabase vs Firebase)
- Architectural patterns (e.g., CQRS-like separation, RLS approach)
- Breaking changes to conventions
- Performance trade-offs

**Existing ADRs**: See `.planning/adr/` directory for current decisions (ADR-0001 through ADR-0008).

---

## UI/UX Standards

See `.claude/rules/ui-ux-standards.md` for complete guide. Key rules: touch targets ≥44px (`min-h-11`), max 5 typography levels, semantic color tokens, 200-300ms animations, all inputs labeled, icon buttons have `aria-label`.

---

## Key Directories

| Path | Purpose |
|------|---------|
| `apps/frontend/src/app/` | Next.js App Router pages |
| `apps/frontend/src/components/ui/` | ShadCN UI components |
| `apps/frontend/src/hooks/api/` | TanStack Query hooks |
| `apps/frontend/src/stores/` | Zustand stores |
| `apps/frontend/src/lib/api-client.ts` | API base URL constant |
| `apps/backend/src/modules/` | NestJS domain modules |
| `apps/backend/src/shared/` | Global shared module |
| `packages/shared/src/types/` | All TypeScript types |
| `supabase/migrations/` | Database migrations |
| `.claude/rules/` | Additional coding rules |

---

## MCP Servers

The following Model Context Protocol servers are configured for Claude Code:

| Server | URL/Command | Status | Purpose |
|--------|-------------|--------|---------|
| **supabase** | `https://mcp.supabase.com/mcp?project_ref=bshjmbshupiibfiewpxb` | ✓ Connected | Database ops, edge functions, storage |
| **stripe** | `https://mcp.stripe.com` | ⚠ Needs auth | Payments, customers, subscriptions |
| **sentry** | `https://mcp.sentry.dev/mcp` | ✓ Connected | Error tracking, issue management |
| **Neon** | `https://mcp.neon.tech/mcp` | ✓ Connected | Database branching, SQL execution |
| **shadcn** | `npx -y shadcn-ui-mcp-server` | ✓ Connected | UI component generation |
| **context7** | `npx -y @upstash/context7-mcp` | ✓ Connected | Documentation lookup |
| **serena** | `uvx serena start-mcp-server` | ✓ Connected | Semantic code tools |

**Authentication:**
```bash
claude /mcp  # Authenticate servers needing OAuth (Stripe, Supabase plugin)
```

### Servers to Add

| Server | Command | Env Vars | Purpose |
|--------|---------|----------|---------|
| **vercel** | `https://mcp.vercel.com` | OAuth | Deployments, logs, project management |
| **resend** | `npx -y mcp-send-email` | `RESEND_API_KEY`, `SENDER_EMAIL_ADDRESS` | Send emails via Resend API |
| **docuseal** | `npx -y docuseal-mcp` | `DOCUSEAL_API_KEY` | E-signature templates, submissions |

**Installation commands:**
```bash
# Vercel (OAuth-based)
claude mcp add --transport http vercel https://mcp.vercel.com

# Resend (requires API key - get from https://resend.com/api-keys)
# Add to ~/.claude.json mcpServers:
# "resend": { "command": "npx", "args": ["-y", "mcp-send-email"], "env": { "RESEND_API_KEY": "..." } }

# DocuSeal (requires API key - get from https://console.docuseal.com/api or self-hosted instance)
# Add to ~/.claude.json mcpServers:
# "docuseal": { "command": "npx", "args": ["-y", "docuseal-mcp"], "env": { "DOCUSEAL_API_KEY": "..." } }
```

**Docs:**
- Supabase MCP: https://supabase.com/docs/guides/getting-started/mcp
- Stripe MCP: https://docs.stripe.com/mcp
- Sentry MCP: https://docs.sentry.io/platforms/javascript/guides/claude/
- Vercel MCP: https://vercel.com/docs/mcp/vercel-mcp
- Resend MCP: https://resend.com/docs/knowledge-base/mcp-server
- DocuSeal MCP: https://github.com/rocketify-fr/docuseal-mcp-server

---

## Best Practices Reference

For v3.0 architectural patterns, see inline comments in source files and ADRs:

| Pattern | Source File | ADR |
|---------|-------------|-----|
| Supabase three-tier clients | `database/supabase.module.ts` | ADR-0004 |
| User client pool | `database/supabase-user-client-pool.ts` | ADR-0004 |
| RPC guidelines | `database/supabase-rpc.service.ts` | ADR-0005 |
| API response standards | `app.module.ts` header | ADR-0006 |
| Module architecture | `app.module.ts` header | ADR-0007 |
| Performance baselines | `app.module.ts` header | ADR-0008 |

**ADRs location:** `.planning/adr/`

---

## Common Gotchas

- **Route order**: Static routes before dynamic (backend)
- **Guards before pipes**: Auth runs before validation (backend)
- **`'use client'`**: Only add when needed (hooks, events, browser APIs)
- **Query keys**: Must be deterministic and unique
- **Shared types**: Run `pnpm build:shared` before frontend if types change
- **Database types**: `supabase.ts` is generated—don't edit manually
- **Enums**: Use database enums, not TypeScript enums
