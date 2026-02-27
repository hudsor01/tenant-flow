# CLAUDE.md

## Zero Tolerance Rules
1. **No `any` types** — use `unknown` with type guards
2. **No barrel files / re-exports** — never create `index.ts` that re-exports; import directly from the defining file
3. **No duplicate types** — search `packages/shared/src/types/` before creating any type
4. **No commented-out code** — delete it
5. **No inline styles** — Tailwind utilities or design tokens only
6. **No PostgreSQL ENUMs** — use `text` columns with `CHECK` constraints
7. **No emojis in code** — Lucide Icons for UI

## Type Lookup Order (mandatory before defining any type)
1. `packages/shared/src/types/TYPES.md` — master lookup
2. `supabase.ts` → `core.ts` → `relations.ts` → `api-contracts.ts` → `sections/<domain>.ts`

If a shared type exists, use it. Creating a local duplicate is a blocking violation.

## Project
TenantFlow — multi-tenant property management SaaS.
- **Frontend**: Next.js 16 + React 19 + TailwindCSS 4 + TanStack Query/Form + Zustand (`localhost:3050`)
- **Backend**: Supabase + Stripe (Edge Functions in `supabase/functions/`)
- **Shared types**: `packages/shared/src/types/`
- **Package manager**: pnpm 10 workspaces

## Key Commands
```bash
pnpm dev                          # all services
pnpm typecheck && pnpm lint       # quality checks
pnpm test:unit                    # Vitest unit tests
pnpm --filter @repo/frontend test:unit -- --run src/path/to/test.ts
pnpm db:types                     # regenerate types from live DB (runs pre-commit)
pnpm build:shared                 # required after shared type changes
pnpm validate:quick               # types + lint + unit tests
```

## Architecture Rules
- Server Components by default; `'use client'` only when required
- Max 300 lines per component, 50 lines per function
- State: TanStack Query for server state, Zustand for UI, TanStack Form for forms, nuqs for URL
- Mutations must invalidate related query keys including dashboard keys
- Soft-delete: properties use `status: 'inactive'`, filter with `.neq('status', 'inactive')`

## Database
- Migrations: `supabase/migrations/YYYYMMDDHHmmss_description.sql`
- RLS on all tables — see `.claude/rules/rls-policies.md`
- `supabase.ts` is generated — never edit manually
- Valid `rent_payments.status`: `pending | processing | succeeded | failed | canceled`

## Data Access Patterns
All data access goes through Supabase PostgREST and RPC. There is no custom backend API server.

```typescript
// PostgREST queries via supabase-js
const { data, error, count } = await supabase
  .from('properties')
  .select('*', { count: 'exact' })
  .neq('status', 'inactive')      // soft-delete filter — required on properties
  .order('created_at', { ascending: false })
  .range(from, to)

// RPC for complex operations (dashboard stats, reports, etc.)
const { data } = await supabase.rpc('get_dashboard_stats', {
  p_owner_user_id: userId
})
```

- Always use `{ count: 'exact' }` for pagination — never `data.length`
- Soft-deleted tables (properties): always filter `.neq('status', 'inactive')`
- Use `.single()` for exactly-one results, `.limit(1)` + `[0]` when zero-or-one

## Edge Functions
Server-side logic runs as Supabase Edge Functions (Deno runtime).

- Location: `supabase/functions/<function-name>/index.ts`
- Shared utilities: `supabase/functions/_shared/` (cors.ts, resend.ts)
- Import map: `supabase/functions/deno.json`
- Auth pattern: extract Bearer token, then `supabase.auth.getUser(token)` to verify
- CORS: use `getCorsHeaders(req)` and early-return `handleCorsOptions(req)` for preflight
- Deploy: `supabase functions deploy <function-name>`

## Security Model
RLS (Row Level Security) is the only access-control layer. No middleware auth, no backend guards.

- RLS enforced on every table — frontend never uses service role key
- Wrap `auth.uid()` in subselect for performance: `(select auth.uid())`
- Helper functions: `get_current_owner_user_id()`, `get_current_tenant_id()`, `get_tenant_unit_ids()`
- Policy rules: see `.claude/rules/rls-policies.md`
- One policy per operation per role — never `FOR ALL` on authenticated tables
- Integration tests: `apps/integration-tests/src/rls/` — 60 tests across 7 domains

## Naming
| Thing | Convention |
|-------|------------|
| Types/Interfaces | PascalCase |
| Functions/Components | camelCase / PascalCase |
| Constants | UPPER_SNAKE_CASE |
| Files | kebab-case |

## Common Gotchas
- Run `pnpm build:shared` if frontend can't find shared types
- Supabase auth: always `getAll`/`setAll` cookie methods (never `get`/`set`/`remove`)
- Pagination: use `count` from Supabase response, never `data.length`
- MCP servers: supabase, sentry, shadcn, context7, serena configured in project
