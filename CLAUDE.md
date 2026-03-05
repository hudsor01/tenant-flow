# CLAUDE.md

## Zero Tolerance Rules
1. **No `any` types** — use `unknown` with type guards
2. **No barrel files / re-exports** — never create `index.ts` that re-exports; import directly from the defining file
3. **No duplicate types** — search `src/shared/types/` before creating any type
4. **No commented-out code** — delete it
5. **No inline styles** — Tailwind utilities or design tokens only
6. **No PostgreSQL ENUMs** — use `text` columns with `CHECK` constraints
7. **No emojis in code** — Lucide Icons for UI

## Type Lookup Order (mandatory before defining any type)
1. `src/shared/types/TYPES.md` — master lookup
2. `supabase.ts` → `core.ts` → `relations.ts` → `api-contracts.ts` → `sections/<domain>.ts`

If a shared type exists, use it. Creating a local duplicate is a blocking violation.

## Project
TenantFlow — multi-tenant property management SaaS.
- **Frontend**: Next.js 16 + React 19 + TailwindCSS 4 + TanStack Query/Form + Zustand (`localhost:3050`)
- **Backend**: Supabase + Stripe (Edge Functions in `supabase/functions/`)
- **Shared types**: `src/shared/types/`
- **Package manager**: pnpm 10 (standard Next.js layout, no workspaces)

## Key Commands
```bash
pnpm dev                          # Next.js dev server on port 3050
pnpm typecheck && pnpm lint       # quality checks
pnpm test:unit                    # Vitest unit tests (--project unit)
pnpm test:unit -- --run src/path/to/test.ts  # single test file
pnpm test:component               # Vitest component tests (--project component)
pnpm test:integration             # RLS integration tests (Vitest --project integration)
pnpm test:rls                     # (alias: pnpm test:integration)
pnpm test:e2e                     # Playwright E2E tests
pnpm db:types                     # regenerate types from live DB
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
- Error monitoring RPCs are admin-only (`user_type = 'ADMIN'`)
- Amount convention: All `amount` columns (`rent_due.amount`, `rent_payments.amount`, etc.) store **dollars** as `numeric(10,2)`. Convert to cents (`Math.round(amount * 100)`) ONLY at the Stripe API boundary in Edge Functions. Never divide by 100 in display code.
- Autopay retry: `rent_due` has `autopay_attempts`, `autopay_last_attempt_at`, `autopay_next_retry_at` columns for pg_cron retry scheduling (3 attempts over 7 days).
- Webhook idempotency: `stripe_webhook_events.status` tracks `processing` / `succeeded` / `failed`. Never delete records on failure.
- Shared leases: Per-tenant portions computed dynamically from `lease_tenants.responsibility_percentage`. Each tenant pays `rent_due.amount * percentage / 100`.

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
- Atomic multi-table writes use SECURITY DEFINER RPCs: `record_rent_payment` (upserts payment + updates rent_due status), `set_default_payment_method` (atomic default swap), `toggle_autopay` (tenant-validated autopay toggle).

## Edge Functions
Server-side logic runs as Supabase Edge Functions (Deno runtime).

- Location: `supabase/functions/<function-name>/index.ts`
- Shared utilities: `supabase/functions/_shared/` (cors.ts, resend.ts)
- Import map: `supabase/functions/deno.json`
- Auth pattern: extract Bearer token, then `supabase.auth.getUser(token)` to verify — derive user identity from JWT, never from request body params
- CORS: use `getCorsHeaders(req)` and early-return `handleCorsOptions(req)` for preflight
- Deploy: `supabase functions deploy <function-name>`
- Stripe SDK: All Edge Functions use `stripe@20` with `apiVersion: '2026-02-25.clover'` (Deno import map in `supabase/functions/deno.json`).
- Payment metadata: Always validate `tenant_id`, `lease_id`, `rent_due_id` from Stripe metadata. Never use empty string fallbacks.
- Payment method deletion: Must call `detach-payment-method` Edge Function which detaches from Stripe API before DB deletion. No DB-only deletion allowed.
- Auth emails: sent via Resend through `supabase/functions/auth-email-send/index.ts` — configured as Supabase Auth Hook (Authentication > Hooks > Send Email)
- Email templates: `supabase/functions/_shared/auth-email-templates.ts` — 5 branded templates (signup, recovery, invite, magiclink, email_change) with inline CSS and XSS-safe escaping

## Security Model
RLS (Row Level Security) is the primary access-control layer. Proxy middleware enforces route-level auth.

- RLS enforced on every table — frontend never uses service role key
- Wrap `auth.uid()` in subselect for performance: `(select auth.uid())`
- Helper functions: `get_current_owner_user_id()`, `get_current_tenant_id()`, `get_tenant_unit_ids()`
- Policy rules: see `.claude/rules/rls-policies.md`
- One policy per operation per role — never `FOR ALL` on authenticated tables
- All SECURITY DEFINER RPCs validate `auth.uid()` — caller cannot request another user's data
- Error monitoring RPCs are admin-only (`user_type = 'ADMIN'` via `is_admin()`)
- Integration tests: `tests/integration/rls/` — 70 tests across 10 domains
- `user_type` is immutable after initial selection — BEFORE UPDATE trigger on `users` table prevents changes once set beyond `PENDING`

## Proxy Middleware (Route Protection)
- `proxy.ts` at project root — executes on all non-static, non-API requests
- `updateSession` utility in `src/lib/supabase/middleware.ts` handles Supabase token refresh with `getAll`/`setAll` cookie pattern
- Public routes skip auth: `/`, `/auth/*`, `/pricing`, `/features`, etc. (see `proxy.ts` for full list)
- Role-based enforcement: TENANT -> `/tenant/*`, OWNER/ADMIN -> `/dashboard/*`, PENDING -> `/auth/select-role`
- `redirectWithCookies` helper preserves session cookies on all redirects (prevents session loss)

## Naming
| Thing | Convention |
|-------|------------|
| Types/Interfaces | PascalCase |
| Functions/Components | camelCase / PascalCase |
| Constants | UPPER_SNAKE_CASE |
| Files | kebab-case |

## Common Gotchas
- Supabase auth: always `getAll`/`setAll` cookie methods (never `get`/`set`/`remove`)
- Auth decisions: always use `getUser()` (server-validated), never `getSession()` for security decisions. `getSession()` only acceptable for reading the access_token string to pass as Bearer header.
- No module-level Supabase client in hooks — create `createClient()` inside each mutation/query function
- Single auth query key factory: `authKeys` from `src/hooks/api/use-auth.ts`. No other key definitions allowed.
- Pagination: use `count` from Supabase response, never `data.length`
- MCP servers: supabase, sentry, shadcn, context7, stripe, n8n configured in project
- Amount units: `rent_due.amount` is dollars (numeric). Multiply by 100 only in Edge Functions when calling Stripe API. `formatCurrency(amountInDollars)` is the only currency formatter.
- Stripe schema: `stripe.*` tables (subscriptions, invoices, etc.) are queryable via PostgREST with existing RLS. Use for billing display — do not call Stripe API for read operations.
- Subscription status: Query `stripe.subscriptions` for real status (`active`, `past_due`, `canceled`, `unpaid`). Do NOT check `users.stripe_customer_id` existence.
