# CLAUDE.md

## Zero Tolerance Rules
1. **No `any` types** — use `unknown` with type guards
2. **No barrel files / re-exports** — never create `index.ts` that re-exports; import directly from the defining file
3. **No duplicate types** — search `src/types/` before creating any type
4. **No commented-out code** — delete it
5. **No inline styles** — Tailwind utilities or `globals.css` custom properties only
6. **No PostgreSQL ENUMs** — use `text` columns with `CHECK` constraints
7. **No emojis in code** — Lucide Icons for UI
8. **No `as unknown as` type assertions** — use typed mapper functions at RPC/PostgREST boundaries
9. **No string literal query keys** — always use `queryOptions()` factories from `src/hooks/api/query-keys/`
10. **No `@radix-ui/react-icons`** — `lucide-react` is the sole icon library

## Type Lookup Order (mandatory before defining any type)
1. `src/types/` — browse directory for existing types
2. `supabase.ts` -> `core.ts` -> `relations.ts` -> `api-contracts.ts` -> `sections/<domain>.ts`

If a type exists in `src/types/`, use it. Creating a local duplicate is a blocking violation.

## Project
TenantFlow — landlord-only property management SaaS. No rent payment facilitation, no tenant portal, no tenant auth accounts. Tenants are records, not users.

- **Frontend**: Next.js 16 + React 19 + TailwindCSS 4 + TanStack Query / Form + Zustand (`localhost:3050`)
- **Backend**: Supabase (PostgREST + RPCs + Edge Functions in `supabase/functions/`) + Stripe
- **Monitoring**: Sentry (Next.js SDK, source maps, tunnel `/monitoring`)
- **Package manager**: pnpm 10.x, Node 24.x
- **Hosting**: Vercel (deploys from `main` only)
- **React Compiler**: enabled

## Key Commands
```bash
pnpm dev                          # dev server on port 3050 (Turbopack)
pnpm typecheck && pnpm lint       # quality checks
pnpm test:unit                    # Vitest unit tests
pnpm test:unit -- --run src/path/to/test.ts  # single test file
pnpm test:integration             # RLS integration tests (hits prod)
pnpm db:types                     # regen src/types/supabase.ts (atomic, see scripts/db-types.sh)
pnpm validate:quick               # types + lint + unit tests
```

## TypeScript Strictness
Full strict mode incl. `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `checkJs`. Prefix unused callback params with `_` or remove. Prefetch-only `useQuery()` calls go without variable assignment.

## Testing
- **Unit:** Vitest 4 + jsdom, 80% coverage threshold (enforced via lefthook pre-commit). `vi.hoisted()` for any mock variable referenced in `vi.mock()`. `.rejects.toMatchObject({ message: expect.stringContaining(...) })` instead of `.rejects.toThrow('string')` (chai 6 bug).
- **RLS integration:** `tests/integration/rls/` — dual-client (ownerA/ownerB) authenticated against prod. Sequential. Synthetic test accounts only — never personal credentials.
- **E2E:** Playwright in `tests/e2e/`.
- **Edge Function tests:** Deno in `supabase/functions/tests/`, requires `supabase functions serve` running.
- **Skipped tests:** investigate and fix; never leave `.skip` permanently.

## CI Pipeline
- **PRs:** lint + typecheck + `next build` + E2E smoke tests + RLS security tests. `e2e-smoke` and `rls-security` fail hard if required secrets are missing.
- **Push to main:** E2E smoke tests only (`checks` and `rls-security` are PR-gated).
- **RLS security tests:** also run via weekly cron + `workflow_dispatch` (independent of branch state).
- **Coverage / unit tests:** local only via lefthook pre-commit (CI trusts local hooks)
- **Secret scanning:** gitleaks in pre-commit

### Lefthook
- **commit-msg:** commitlint (conventional commits)
- **pre-commit** (parallel): gitleaks, lockfile-verify, lint, typecheck, unit-tests
- **pre-push:** lockfile sync check

## Architecture Rules
- Server Components by default; `'use client'` only for hooks / event handlers / browser APIs
- Max 300 lines per component, 50 lines per function
- State: TanStack Query for server state, Zustand for UI, TanStack Form for forms, nuqs for URL
- Mutations invalidate related query keys + `ownerDashboardKeys.all`
- Soft-delete: properties use `status: 'inactive'` — filter `.neq('status', 'inactive')`

## Performance
- Dynamic-import heavy libs (`recharts`, `react-markdown`) via `next/dynamic` with `ssr: false` and CSS-only loading skeletons
- Table list views use `useVirtualizer` from `@tanstack/react-virtual`
- Stats consolidate via single RPCs (e.g. `get_maintenance_stats()`, `get_lease_stats()`) — not multiple HEAD queries
- All other queries inherit global `refetchOnWindowFocus: true`
- `optimizePackageImports` for `@tanstack/*` in `next.config.ts`

## Query Key Factories
All query keys use `queryOptions()` factories in `src/hooks/api/query-keys/`. Never string literal arrays. Browse `src/hooks/api/query-keys/` for the current factory list (it grows).

```typescript
import { queryOptions } from '@tanstack/react-query'
export const propertyQueries = {
  all: () => queryOptions({ queryKey: ['properties'], queryFn: ... }),
  detail: (id: string) => queryOptions({ queryKey: ['properties', id], queryFn: ... }),
}
```

## Hook Organization
- Flat domain naming: `use-lease.ts`, `use-properties.ts`, etc. — not nested
- Max 300 lines per hook file — split by domain if exceeded
- No module-level Supabase client — `createClient()` inside each mutation/query function

## RPC / PostgREST Return Typing
Typed mapper at every boundary. Never `as unknown as`.

```typescript
function mapDocumentRow(raw: Record<string, unknown>): DocumentRow {
  // validate enum-shaped fields via Zod safeParse, throw on missing NOT NULL fields
}
const { data } = await supabase.from('documents').select(...)
return ((data ?? []) as Record<string, unknown>[]).map(mapDocumentRow)
```

Reference example: `mapDocumentRow` in `src/hooks/api/query-keys/document-keys.ts`.

## Database
- Migrations: `supabase/migrations/YYYYMMDDHHmmss_description.sql`
- RLS on every table; frontend never uses service role
- `supabase.ts` is generated — never edit manually; `pnpm db:types` is atomic
- Migrations applied via Supabase MCP `apply_migration` get prod-assigned timestamps that may not match the repo filename — always reconcile via `mcp__supabase__list_migrations` after MCP applies (see `migration-mcp-prod-drift.md` memory)
- All `amount` columns store **dollars** as `numeric(10,2)`. Convert to cents only at the Stripe API boundary.

### Schema Conventions
- `owner_user_id` is the canonical owner column on `properties`, `leases`, `maintenance_requests`, `documents` — references `users.id` directly
- `users.is_admin boolean` controls admin access (the legacy `user_type` was migrated out)
- `set_updated_at()` is the only `updated_at` trigger function — never duplicate

### Cron Jobs (pg_cron)
All pg_cron jobs use named SECURITY DEFINER functions with `SET search_path = public`. Never inline SQL in `cron.schedule()`. Cleanup jobs run in the 3 AM UTC window. Archive-then-delete for all retention. Use `FOR UPDATE SKIP LOCKED` for concurrent-safe row processing.

For the active job list, grep `cron.schedule(` in `supabase/migrations/` — the set changes per release.

### GDPR
- 30-day grace period (`deletion_requested_at` on `users`)
- Anonymization replaces PII with `[deleted]` placeholders; financial records preserved intact
- Owner deletion blocked if active leases or pending payments exist
- Functions: `request_account_deletion()`, `cancel_account_deletion()`, `anonymize_deleted_user(uuid)`, `process_account_deletions()` cron
- Does NOT delete from `auth.users` — Supabase Auth handles that

### Data Retention
| Table | Retention | Archive |
|-------|-----------|---------|
| `security_events` | 90d | `security_events_archive` |
| `user_errors` | 90d | `user_errors_archive` |
| `stripe_webhook_events` (succeeded) | 90d | `stripe_webhook_events_archive` |
| `stripe_webhook_events` (failed) | 180d | `stripe_webhook_events_archive` |

Archive tables are service_role-only. Cleanup batches use `LIMIT 10000` + `FOR UPDATE SKIP LOCKED`.

## Data Access
PostgREST + RPCs only. No custom backend.

```typescript
const { data, error, count } = await supabase
  .from('properties')
  .select('*', { count: 'exact' })
  .neq('status', 'inactive')
  .order('created_at', { ascending: false })
  .range(from, to)
```

- `{ count: 'exact' }` for pagination — never `data.length`
- Soft-deleted tables: always filter `.neq('status', 'inactive')`
- `.single()` for exactly-one, `.limit(1)` + `[0]` for zero-or-one
- All list queries MUST have `.limit()` or `.range()` — no unbounded `select('*')`
- Prefer specific column lists over `*` for list queries; reserve `*` for detail queries

## Edge Functions
Deno runtime, `supabase/functions/<name>/index.ts`.

- Shared utilities: `supabase/functions/_shared/` (cors, resend, errors, env, escape-html, rate-limit)
- Auth pattern: extract Bearer, then `supabase.auth.getUser(token)` — never derive identity from request body
- CORS: `getCorsHeaders(req)` + early-return `handleCorsOptions(req)`. Fail-closed when `FRONTEND_URL` unset.
- Errors: `errorResponse()` from `_shared/errors.ts` — never expose raw `err.message` to clients. Generic `{ error: 'An error occurred' }` + Sentry/console logging.
- Env validation: `validateEnv({ required, optional })` from `_shared/env.ts` inside `Deno.serve` (not module level)
- Rate limiting on unauthenticated functions: `rateLimit()` from `_shared/rate-limit.ts` (Upstash sliding window, 10 req/min per IP, fail-open on errors). Sentry tunnel `/monitoring` rate-limited at 60 req/min in proxy.ts.
- XSS escaping: `escapeHtml()` from `_shared/escape-html.ts` for all user values in HTML templates
- CSP enforced via `vercel.json`
- Parallelize independent DB queries with `Promise.all()`. Use `Promise.allSettled` only when partial failure is acceptable.
- Browse `supabase/functions/` for the current function set.

## Security
- RLS on every table; service-role key never reaches frontend
- Wrap `auth.uid()` in subselect for performance: `(select auth.uid())`
- Helper functions: `get_current_owner_user_id()`, `is_admin()`
- One policy per operation per role — never `FOR ALL` on authenticated tables
- All SECURITY DEFINER RPCs validate `auth.uid()` and lock `search_path = public`
- Admin-only RPCs gate on `is_admin()`
- Integration tests in `tests/integration/rls/` cover owner isolation and cross-role boundaries

## Proxy Middleware
- `src/proxy.ts` (Next.js 16; replaces deprecated root `middleware.ts`)
- `updateSession` in `src/lib/supabase/middleware.ts` handles Supabase token refresh with `getAll`/`setAll` cookie pattern
- Public routes skip auth (see `PUBLIC_ROUTES` in `proxy.ts` for the current set)
- Authenticated users must have `subscription_status IN ('active', 'trialing')` to access dashboard routes
- `redirectWithCookies` helper preserves session cookies on every redirect

## Naming
| Thing | Convention |
|-------|------------|
| Types/Interfaces | PascalCase |
| Functions/Components | camelCase / PascalCase |
| Constants | UPPER_SNAKE_CASE |
| Files | kebab-case |

## Path Aliases
`#` prefix subpath imports defined in BOTH `tsconfig.json#paths` AND `package.json#imports`:
`#app/*`, `#components/*`, `#contexts/*`, `#lib/*`, `#hooks/*`, `#stores/*`, `#types/*`, `#providers/*`, `#test/*`, `#utils/*`, `#config/*`, `#env`, `#proxy`

## Common Gotchas
- Supabase auth: always `getAll`/`setAll` cookie methods. Never `get`/`set`/`remove`. Never `auth-helpers-nextjs`.
- Auth decisions: always `getUser()` (server-validated). `getSession()` only to read the access_token string for Bearer.
- Single auth query key factory: `authKeys` from `src/hooks/api/use-auth.ts`. No other auth key definitions.
- Pagination: use `count` from Supabase response. Never `data.length`.
- Stripe schema: `stripe.*` tables (subscriptions, invoices, etc.) are queryable via PostgREST under existing RLS. Use for billing display — don't call Stripe API for reads.
- Subscription status: query `stripe.subscriptions` for real status. Don't infer from `users.stripe_customer_id` existence.
- `next/image` does NOT support `blob:` URLs — use `<img>` for `URL.createObjectURL()` previews
- Edge Function tests need `supabase functions serve` running locally
- `SKIP_ENV_VALIDATION=true` required for `next build` in CI

## Accessibility
- Icon-only buttons: `aria-label`, not just `title`
- `text-muted-foreground` for muted text (never bare `text-muted`)
- `bg-background` for surfaces (never `bg-white` — breaks dark mode)
- Skip-to-content link in app shell
- Breadcrumb `<nav>` requires `aria-label="Breadcrumb"`
- Mobile sidebar overlay: Escape key handler + focus management

## Components
- Use shadcn `Switch` for toggles — never custom CSS toggle divs
- `NotFoundPage` from `#components/shared/not-found-page` for all 404s
- `ErrorPage` from `#components/shared/error-page` for all error boundaries
- `Empty` compound component from `#components/ui/empty` for list-page empty states

## Marketing Pages
- `src/components/layout/page-layout.tsx` wraps all marketing pages (navbar + footer + grid pattern + `page-offset-navbar`). Never re-add `page-offset-navbar` to children.
- Section spacing: `section-spacing` (5rem padding-block); section gap on homepage `section-gap` (4rem)
- Container: `max-w-7xl mx-auto px-6 lg:px-8`. Legal/text pages use `max-w-4xl`.

## Forms
- Multi-step forms use `useUnsavedChangesWarning(isDirty)` from `#hooks/use-unsaved-changes`
- `autoFocus` on the primary input of key forms (login email, property name, etc.)

## Workflow
Active workflow: superpowers (skill plugins) + perfect-PR merge gate (two consecutive zero-finding review cycles required). `.planning/` is a frozen archive (v1.0–v2.3 records). Do not invoke any `/gsd:*` commands; that runtime was removed. See memory `workflow-superpowers-perfect-pr.md` for the full rationale.
