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

**Type files:** `supabase.ts` (generated), `core.ts`, `relations.ts`, `api-contracts.ts`, `domain.ts`, `backend-domain.ts`, `frontend.ts`, `auth.ts`, `analytics.ts`, `errors.ts`, `health.ts`, `notifications.ts`, `reports.ts`, `stats.ts`, `stripe.ts`, `data-table.ts`, `database-rpc.ts`, `file-upload.ts`, `financial-statements.ts`, `lease-generator.types.ts`, `query-results.ts`, `activity.ts`, `analytics-page-data.ts`
**Section types:** `sections/dashboard.ts`, `sections/inspections.ts`, `sections/leases.ts`, `sections/maintenance.ts`, `sections/payments.ts`, `sections/tenant-portal.ts`, `sections/tenants.ts`

## Project
TenantFlow — multi-tenant property management SaaS.
- **Frontend**: Next.js 16.1 + React 19.2 + TailwindCSS 4.2 + TanStack Query 5.90 / Form 1.28 + Zustand 5 (`localhost:3050`)
- **Backend**: Supabase (@supabase/supabase-js 2.97, @supabase/ssr 0.8) + Stripe 20.3 (Edge Functions in `supabase/functions/`)
- **Monitoring**: Sentry 10.40 (Next.js SDK, source maps, tunnel route `/monitoring`)
- **Types**: `src/types/`
- **Validation schemas**: `src/lib/validation/`
- **Package manager**: pnpm 10.29 (standard Next.js layout, no workspaces)
- **Node**: 24.x
- **Hosting**: Vercel (deploys from `main` branch only)
- **React Compiler**: enabled (`reactCompiler: true` in next.config.ts)

## Key Commands
```bash
pnpm dev                          # Next.js dev server on port 3050 (Turbopack)
pnpm typecheck && pnpm lint       # quality checks
pnpm test:unit                    # Vitest unit tests (--project unit) — 1,469 tests, 106 files
pnpm test:unit -- --run src/path/to/test.ts  # single test file
pnpm test:unit -- --coverage      # unit tests with coverage (enforced via lefthook pre-commit)
pnpm test:component               # Vitest component tests (--project component)
pnpm test:integration             # RLS integration tests (Vitest --project integration) — 21 test files
pnpm test:rls                     # (alias: pnpm test:integration)
pnpm test:e2e                     # Playwright E2E tests — 2 spec files
pnpm db:types                     # regenerate types from live DB
pnpm validate:quick               # types + lint + unit tests
cd supabase/functions && deno test --allow-all --no-check tests/  # Edge Function tests (Deno)
```

## TypeScript Strictness
- Full strict mode: `strict`, `noUnusedLocals`, `noUnusedParameters`, `isolatedModules`, `checkJs`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`
- Unused callback parameters: prefix with underscore (`_param`) or remove entirely
- Prefetch-only `useQuery()` calls: call without variable assignment when only cache warming is needed

## Testing Conventions
- **Unit tests:** Vitest 4.0 with jsdom, `src/**/*.test.ts` pattern, 80% coverage threshold
- **RLS integration tests:** `tests/integration/rls/`, dual-client pattern (ownerA/ownerB), sequential execution
- **Edge Function tests:** Deno test runner in `supabase/functions/tests/`, integration-style via `functions.invoke()` or raw `fetch` for header control
- **E2E tests:** Playwright 1.58 in `tests/e2e/tests/` (health-check + homepage specs)
- **Archived E2E tests:** `tests/e2e/tests/_archived/` (preserved but not run, recoverable)
- **Coverage threshold:** 80% lines/functions/branches/statements (enforced locally via lefthook pre-commit)
- **Skipped tests:** investigate and fix rather than leaving `.skip` permanently
- **Tenant RLS tests:** use `describe.skipIf(!credentials)` with `getTenantTestCredentials()` returning null when env vars missing
- **Vitest mocking:** use `vi.hoisted()` for any mock variable referenced inside `vi.mock()` factory functions
- **Vitest 4.x + chai 6.x bug:** `.rejects.toThrow('string')` crashes — use `.rejects.toMatchObject({ message: expect.stringContaining('...') })` instead

## CI Pipeline
- **PRs:** lint + typecheck + `next build` (clean, no cache, `SKIP_ENV_VALIDATION=true`)
- **Push to main:** additionally runs E2E smoke tests (informational via `continue-on-error`)
- **RLS security tests:** run on every PR to main (no path filter — catches policy drift regardless of changed files)
- **Coverage and unit tests:** local only via lefthook pre-commit (CI trusts local hooks)
- **Edge Function tests:** local only (manual or pre-push, requires `supabase functions serve`)
- **Secret scanning:** gitleaks in pre-commit only (secrets caught before reaching repo)
- **CI ignores:** `**.md`, `.planning/**`, `.vscode/**`, `docs/**`, `LICENSE`

### Lefthook Hooks
- **commit-msg:** commitlint (conventional commits)
- **pre-commit** (parallel): gitleaks, duplicate-types check, lockfile verify, lint, typecheck, unit tests with coverage
- **pre-push:** lockfile sync check

## Architecture Rules
- Server Components by default; `'use client'` only when required (hooks, event handlers, browser APIs)
- Max 300 lines per component, 50 lines per function
- State: TanStack Query for server state, Zustand for UI, TanStack Form for forms, nuqs for URL
- Mutations must invalidate related query keys including `ownerDashboardKeys.all` in addition to their own domain keys
- Soft-delete: properties use `status: 'inactive'`, filter with `.neq('status', 'inactive')`

## Performance Conventions
- Dynamic import heavy libraries (`recharts`, `react-markdown`) via `next/dynamic` with `ssr: false` and custom loading animations
- Chart loading: `ChartLoadingSkeleton` from `#components/shared/chart-loading-skeleton` (CSS-only rising bars animation)
- Blog loading: `BlogLoadingSkeleton` from `#components/shared/blog-loading-skeleton` (CSS-only text-reveal animation)
- Table list views use `useVirtualizer` from `@tanstack/react-virtual` directly on tbody rows
- Stats queries use consolidated RPCs: `get_maintenance_stats()`, `get_lease_stats()` (not multiple HEAD queries)
- Tenant portal hooks use `resolveTenantId()` from `use-tenant-portal-keys.ts` (shared cached resolution)
- Tenant payment queries use `refetchOnWindowFocus: 'always'` (time-sensitive data exception)
- All other queries inherit global `refetchOnWindowFocus: true` (only refetch when stale)
- `optimizePackageImports` in `next.config.ts` for `@tanstack/*`

## Query Key Factories
All query keys use `queryOptions()` factories in `src/hooks/api/query-keys/`. Never use string literal arrays like `['blogs']`.

**Factory files:**
- `analytics-keys.ts` — analytics/revenue trends AND occupancy trends (shared across dashboard + analytics + reports)
- `billing-keys.ts` — billing, subscriptions, invoices
- `blog-keys.ts` — blog posts
- `financial-keys.ts` — financials, expenses
- `inspection-keys.ts` — inspections (+mutation options)
- `lease-keys.ts` — leases (+mutation options)
- `maintenance-keys.ts` — maintenance requests, vendors
- `payment-keys.ts` — payments, rent collection, autopay (+mutation options)
- `property-keys.ts` — properties
- `property-stats-keys.ts` — property statistics
- `report-keys.ts` — reports, report runs (parallel `Promise.all` for multi-RPC queries)
- `report-analytics-keys.ts` — report analytics
- `template-definition-keys.ts` — lease templates
- `tenant-keys.ts` — tenants (+mutation options)
- `tenant-invitation-keys.ts` — tenant invitations (+mutation options)
- `unit-keys.ts` — units

**Pattern:**
```typescript
import { queryOptions } from '@tanstack/react-query'
export const propertyQueries = {
  all: () => queryOptions({ queryKey: ['properties'], queryFn: ... }),
  detail: (id: string) => queryOptions({ queryKey: ['properties', id], queryFn: ... }),
}
```

## Hook Organization
- Flat domain naming: `use-tenant-payments.ts` (not `use-tenant-portal-payments.ts`)
- Max 300 lines per hook file — split by domain if exceeded
- No module-level Supabase client — create `createClient()` inside each mutation/query function
- Expense CRUD hooks kept inline in `use-financials.ts` (from() queries, not rpc())
- Tenant portal hooks use shared `resolveTenantId()` — never resolve tenant ID inline

## RPC Return Typing
Use typed mapper functions at RPC boundaries. Never use `as unknown as` to cast PostgREST responses.

```typescript
// Correct: mapper function
function mapDashboardStats(raw: Record<string, unknown>): DashboardStats {
  return { revenue: Number(raw.revenue), ... }
}
const { data } = await supabase.rpc('get_dashboard_stats', params)
return data ? mapDashboardStats(data) : null

// Wrong: type assertion
const data = result.data as unknown as DashboardStats
```

Exception: 24 structurally required `as unknown as` assertions for PostgREST string vs domain union literals are documented and acceptable.

## Stripe Webhooks
Webhook processing uses a handler module pattern in `supabase/functions/stripe-webhooks/`:
- `index.ts` — entry point, signature verification, event routing
- Handler modules per event type for separation of concerns
- All handlers use `errorResponse()` from `_shared/errors.ts`

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

### Schema Conventions
- `owner_user_id` is the canonical owner column on all tables (properties, leases, maintenance_requests, documents) — references `users.id` directly
- `set_updated_at()` is the only trigger function for `updated_at` columns — never create duplicates
- `property_owners` table stores Stripe Connect data only (`stripe_account_id`, `charges_enabled`, `onboarding_completed_at`) — not used for ownership lookups
- `leases` has single owner column `owner_user_id`
- `documents` has direct `owner_user_id` column for fast RLS checks (backfilled from parent entities)
- `blogs.author_user_id` tracks content authorship (FK to `users.id`, ON DELETE SET NULL)
- `activity.user_id` is NOT NULL with ON DELETE CASCADE (activity records follow user lifecycle)
- `inspection_photos` has `updated_at` column with `set_updated_at()` trigger

### Cron Jobs (pg_cron)
All pg_cron jobs use named SECURITY DEFINER functions with `SET search_path = public`. Never use inline SQL in `cron.schedule()`.

**Scheduled jobs (3 AM UTC window):**

| Job Name | Schedule | Function | Purpose |
|----------|----------|----------|---------|
| `expire-leases` | `0 23 * * *` | `expire_leases()` | Expire active leases past end_date, notify owner |
| `calculate_late_fees` | (existing) | `calculate_late_fees()` | Calculate late fees on overdue rent |
| `queue_lease_reminders` | (existing) | `queue_lease_reminders()` | Send upcoming rent reminders |
| `process-autopay-charges` | (existing) | via Edge Function | Process autopay for due rent |
| `cleanup-security-events` | `0 3 * * *` | `cleanup_old_security_events()` | Archive + delete events > 90 days |
| `cleanup-errors` | `15 3 * * *` | `cleanup_old_errors()` | Archive + delete errors > 90 days |
| `cleanup-webhook-events` | `30 3 * * *` | `cleanup_old_webhook_events()` | Archive webhooks (90d succeeded / 180d failed) |
| `check-cron-health` | `0 * * * *` | `check_cron_health()` | Monitor job failures hourly via `cron.job_run_details` |
| `process-account-deletions` | `45 3 * * *` | `process_account_deletions()` | GDPR: anonymize users past 30-day grace period |

**Conventions:**
- Cleanup jobs run at 3 AM UTC window (3:00, 3:15, 3:30, 3:45)
- Archive-then-delete pattern for all data retention (never hard delete without archiving)
- `check_cron_health` monitors all jobs hourly via `cron.job_run_details`, logs failures to `user_errors` for Sentry pickup
- Use `FOR UPDATE SKIP LOCKED` for concurrent-safe row processing

### GDPR Patterns
- Account deletion uses 30-day grace period (`deletion_requested_at` on users table)
- Anonymization replaces PII with `[deleted]` / `[deleted user]` placeholders — never deletes financial records (rent_payments, rent_due preserved intact)
- Owner deletion blocked if active leases or pending payments exist
- Functions: `request_account_deletion()` (user-callable), `cancel_account_deletion()` (user-callable), `anonymize_deleted_user(uuid)` (cron-only)
- `process_account_deletions()` cron runs daily, handles each user independently (one failure does not block others)
- Does NOT delete from `auth.users` — that is handled by Supabase Auth separately

### Data Retention
| Table | Retention | Archive Table | Policy |
|-------|-----------|---------------|--------|
| `security_events` | 90 days | `security_events_archive` | Archive then delete |
| `user_errors` | 90 days | `user_errors_archive` | Archive then delete |
| `stripe_webhook_events` (succeeded) | 90 days | `stripe_webhook_events_archive` | Archive then delete |
| `stripe_webhook_events` (failed) | 180 days | `stripe_webhook_events_archive` | Longer retention for forensics |

- Archive tables use `*_archive` suffix with identical schema
- Archive tables are service_role-only access (no authenticated user policies)
- Cleanup cron jobs process in batches with `LIMIT 10000` and `FOR UPDATE SKIP LOCKED`

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
- All list queries MUST have `.limit()` or pagination `.range()` — no unbounded `select('*')` on growing tables
- Prefer specific column `.select('col1, col2')` over `.select('*')` for list queries
- Use `.select('*')` only for detail (single record) queries where all columns are needed

## Edge Functions
Server-side logic runs as Supabase Edge Functions (Deno runtime).

- Location: `supabase/functions/<function-name>/index.ts`
- Shared utilities: `supabase/functions/_shared/` (cors.ts, resend.ts, errors.ts, env.ts, escape-html.ts, rate-limit.ts)
- Import map: `supabase/functions/deno.json` (supabase-js 2.97, Sentry/Deno 9, Stripe 20, Upstash ratelimit/redis)
- Auth pattern: extract Bearer token, then `supabase.auth.getUser(token)` to verify — derive user identity from JWT, never from request body params
- CORS: use `getCorsHeaders(req)` and early-return `handleCorsOptions(req)` for preflight. CORS is fail-closed — no CORS headers returned when `FRONTEND_URL` is not set.
- Deploy: `supabase functions deploy <function-name>`
- Payment metadata: Always validate `tenant_id`, `lease_id`, `rent_due_id` from Stripe metadata. Never use empty string fallbacks.
- Payment method deletion: Must call `detach-payment-method` Edge Function which detaches from Stripe API before DB deletion. No DB-only deletion allowed.
- Auth emails: sent via Resend through `supabase/functions/auth-email-send/index.ts` — configured as Supabase Auth Hook (Authentication > Hooks > Send Email)
- Email templates: `supabase/functions/_shared/auth-email-templates.ts` — 5 branded templates (signup, recovery, invite, magiclink, email_change) with inline CSS and XSS-safe escaping
- Error responses: All Edge Functions use `errorResponse()` from `_shared/errors.ts` — never expose `err.message`, `dbError.message`, or stack traces to clients. Generic `{ error: 'An error occurred' }` with Sentry + console.error logging.
- Env validation: All Edge Functions call `validateEnv({ required: [...], optional: [...] })` from `_shared/env.ts` inside `Deno.serve` handler (not at module level). Missing required vars return 500 immediately.
- Rate limiting: Unauthenticated Edge Functions (`tenant-invitation-accept`, `tenant-invitation-validate`, `stripe-checkout-session`) use `rateLimit()` from `_shared/rate-limit.ts` (Upstash Redis sliding window, 10 req/min per IP). Rate limiter fails open on errors. Sentry tunnel `/monitoring` rate-limited at 60 req/min in proxy.ts.
- XSS escaping: All user-provided values in HTML templates (docuseal, generate-pdf) are wrapped with `escapeHtml()` from `_shared/escape-html.ts`.
- CSP: Content-Security-Policy enforced via vercel.json on all pages.
- Env secrets for rate limiting: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` must be set in Supabase Edge Function secrets.
- Parallelize independent DB queries with `Promise.all()` — never sequential queries where results are independent
- Use `Promise.all` (not `Promise.allSettled`) when any failure should abort the operation

**Edge Functions (19):** auth-email-send, detach-payment-method, docuseal, docuseal-webhook, export-report, export-user-data, generate-pdf, newsletter-subscribe, send-tenant-invitation, stripe-autopay-charge, stripe-billing-portal, stripe-checkout, stripe-checkout-session, stripe-connect, stripe-rent-checkout, stripe-webhooks, tenant-invitation-accept, tenant-invitation-validate

## Security Model
RLS (Row Level Security) is the primary access-control layer. Proxy middleware enforces route-level auth.

- RLS enforced on every table — frontend never uses service role key
- Wrap `auth.uid()` in subselect for performance: `(select auth.uid())`
- Helper functions: `get_current_owner_user_id()`, `get_current_tenant_id()`, `get_tenant_unit_ids()`
- Policy rules: see `.claude/rules/rls-policies.md`
- One policy per operation per role — never `FOR ALL` on authenticated tables
- All SECURITY DEFINER RPCs validate `auth.uid()` — caller cannot request another user's data
- Error monitoring RPCs are admin-only (`user_type = 'ADMIN'` via `is_admin()`)
- Integration tests: `tests/integration/rls/` — 21 test files covering owner isolation, tenant isolation, and cross-role boundaries
- `user_type` is immutable after initial selection — BEFORE UPDATE trigger on `users` table prevents changes once set beyond `PENDING`

## Proxy Middleware (Route Protection)
- `proxy.ts` at project root (Next.js 16 replaces deprecated `middleware.ts`)
- `updateSession` utility in `src/lib/supabase/middleware.ts` handles Supabase token refresh with `getAll`/`setAll` cookie pattern
- Public routes skip auth: `/`, `/login`, `/pricing`, `/about`, `/blog`, `/contact`, `/faq`, `/features`, `/help`, `/privacy`, `/terms`, `/security-policy`, `/support`, `/resources`, `/search`, `/accept-invite`, `/auth/*`
- Role-based enforcement: TENANT -> `/tenant/*`, OWNER/ADMIN -> `/dashboard/*`, PENDING -> `/auth/select-role`
- `redirectWithCookies` helper preserves session cookies on all redirects (prevents session loss)

## Naming
| Thing | Convention |
|-------|------------|
| Types/Interfaces | PascalCase |
| Functions/Components | camelCase / PascalCase |
| Constants | UPPER_SNAKE_CASE |
| Files | kebab-case |

## Path Aliases
All imports use `#` prefix aliases (Node.js subpath imports in package.json + tsconfig paths):
`#app/*`, `#components/*`, `#contexts/*`, `#lib/*`, `#hooks/*`, `#stores/*`, `#types/*`, `#providers/*`, `#test/*`, `#utils/*`, `#shared/*`, `#config/*`, `#env`, `#proxy`

## Common Gotchas
- Supabase auth: always `getAll`/`setAll` cookie methods (never `get`/`set`/`remove`)
- Auth decisions: always use `getUser()` (server-validated), never `getSession()` for security decisions. `getSession()` only acceptable for reading the access_token string to pass as Bearer header.
- No module-level Supabase client in hooks — create `createClient()` inside each mutation/query function
- Single auth query key factory: `authKeys` from `src/hooks/api/use-auth.ts`. No other key definitions allowed.
- Query keys: always use factory from `src/hooks/api/query-keys/` — never string literals like `['blogs']`
- Pagination: use `count` from Supabase response, never `data.length`
- Amount units: `rent_due.amount` is dollars (numeric). Multiply by 100 only in Edge Functions when calling Stripe API. `formatCurrency(amountInDollars)` is the only currency formatter.
- Stripe schema: `stripe.*` tables (subscriptions, invoices, etc.) are queryable via PostgREST with existing RLS. Use for billing display — do not call Stripe API for read operations.
- Subscription status: Query `stripe.subscriptions` for real status (`active`, `past_due`, `canceled`, `unpaid`). Do NOT check `users.stripe_customer_id` existence.
- Report hooks: report hooks query real `reports` and `report_runs` tables, and aggregate data via existing RPCs (not stub data).
- Vendored UI components: `src/components/ui/tour.tsx` is a vendored Dice UI upstream copy — exempt from 300-line rule.
- `next/image` does NOT support blob: URLs — use `<img>` for `URL.createObjectURL()` previews (file-upload-item.tsx)
- `gitleaks protect --staged` runs in pre-commit — secrets caught before reaching repo
- Edge Function tests need `supabase functions serve` (or `supabase start`) running locally
- Tenant RLS integration tests need `E2E_TENANT_EMAIL` and `E2E_TENANT_PASSWORD` env vars (tests skip gracefully without them)
- `SKIP_ENV_VALIDATION=true` required for `next build` in CI (no runtime env vars available)

## Accessibility Rules
- All icon buttons must have `aria-label` (not just `title`)
- Use `text-muted-foreground` for muted text, never bare `text-muted`
- Use `bg-background` instead of `bg-white` for dark-mode safety
- Skip-to-content link required in app shell components
- Breadcrumb `<nav>` requires `aria-label="Breadcrumb"`
- Mobile sidebar overlay requires Escape key handler and focus management

## Component Conventions
- 73 UI components in `src/components/ui/`, 9 shared components in `src/components/shared/`
- Use shadcn `Switch` for toggles — never custom CSS toggle divs
- Use `NotFoundPage` from `#components/shared/not-found-page` for all 404 pages (generic message, not entity-specific)
- Use `ErrorPage` from `#components/shared/error-page` for all error boundaries (retry + dashboard link)
- Use `Empty` compound component from `#components/ui/empty` for list page empty states
- Tenant delete is soft-delete (status: 'inactive') with active-lease blocking guard
- Kanban boards use scroll-snap on mobile, grid on desktop

## Marketing Page Layout
- **Navbar** (`src/components/layout/navbar.tsx`): Full-width bar (not floating pill), transparent at top, backdrop blur on scroll. `text-base` nav links, `text-xl` logo.
- **PageLayout** (`src/components/layout/page-layout.tsx`): Wraps all marketing pages. Provides navbar + footer + grid pattern + `page-offset-navbar` automatically. **Never add `page-offset-navbar` to child content** — it's already applied by PageLayout.
- **Footer** (`src/components/layout/footer.tsx`): Shared across all marketing pages via PageLayout.
- **Sections** (`src/components/sections/`): hero-section, features-section, how-it-works, comparison-table, testimonials-section, stats-showcase, premium-cta, home-faq, logo-cloud, hero-dashboard-mockup
- **Section spacing**: All marketing sections use `section-spacing` (5rem padding-block). Exception: logo-cloud uses `pb-6` only (sits inside hero section).
- **Section gap**: Homepage uses `section-gap` (4rem) between sections via `containerClass="flex flex-col section-gap"`.
- **Container pattern**: `max-w-7xl mx-auto px-6 lg:px-8` for full-width sections. Legal/text pages use `max-w-4xl`.
- **Logo cloud** (`src/components/sections/logo-cloud.tsx`): Uses wordmark SVGs with per-logo explicit widths for visual consistency. Grayscale 80% default, full color on hover.
- **CSS variables** (in `globals.css`): `--layout-navbar-spacing: spacing-20` (5rem), `--layout-section-padding-y: spacing-20` (5rem), `--layout-gap-section: spacing-16` (4rem).

## Form Conventions
- Multi-step forms should use `useUnsavedChangesWarning(isDirty)` from `#hooks/use-unsaved-changes`
- Add `autoFocus` to primary input on key forms (login email, property name, etc.)
