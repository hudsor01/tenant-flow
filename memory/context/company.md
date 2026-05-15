# TenantFlow Stack & Context

## About

TenantFlow is a multi-tenant property management SaaS. Solo project by Richard Hudson.
Owners manage properties/units/leases. Tenants pay rent, submit maintenance requests.

## Stack

| Tool | Used for | Notes |
|------|----------|-------|
| Next.js 16 | Frontend framework | App Router, React 19, port 3050 |
| Supabase | DB + Auth + Edge Functions | PostgreSQL hosted, primary backend |
| Stripe | Payments + subscriptions | stripe@20, apiVersion 2026-02-25.clover |
| Vercel | Frontend deploy | CSP enforced via vercel.json |
| Sentry | Error monitoring | Picks up user_errors table via cron |
| shadcn/ui | UI component library | lucide-react for all icons |
| TanStack Query | Server state management | queryOptions() factory pattern |
| TanStack Form | Form state | Zod schemas for validation |
| Zustand | Client UI state | Not server state |
| nuqs | URL state | Query params |
| pnpm 10 | Package manager | Never use npm/yarn |
| Tailwind CSS v4 | Styling | Utilities only, no inline styles |

## Key Commands

| Command | What |
|---------|------|
| pnpm dev | Start dev server (port 3050) |
| pnpm validate:quick | types + lint + unit tests |
| pnpm typecheck && pnpm lint | CI quality gate |
| pnpm test:unit | Vitest unit tests |
| pnpm test:integration | RLS security tests |
| pnpm test:e2e | Playwright E2E tests |
| pnpm db:types | Regenerate Supabase types from live DB |
| gh issue list --assignee=@me | View open GitHub issues |

## User Types

| Type | Routes | Description |
|------|--------|-------------|
| OWNER | /dashboard/* | Property owner — pays subscription, manages properties |
| TENANT | /tenant/* | Renter — pays rent, submits maintenance requests |
| ADMIN | /admin/* | Platform admin — error monitoring RPCs only |
| PENDING | /auth/select-role | New user — no role assigned yet |

## Architectural Rules (Zero Tolerance)

- No `any` types — use `unknown` with type guards
- No barrel files — no index.ts re-exports; import directly
- No duplicate types — check src/types/ before creating any type
- No inline styles — Tailwind or globals.css only
- No PostgreSQL ENUMs — text columns with CHECK constraints
- No @radix-ui/react-icons — lucide-react only
- No `as unknown as` assertions — use typed mapper functions at RPC boundaries
- No string literal query keys — always use queryOptions() factories
- Amount columns store dollars — ×100 only at Stripe API boundary in Edge Functions

## Key File Locations

| What | Where |
|------|-------|
| Shared types | src/types/ |
| Validation schemas | src/lib/validation/ |
| Query key factories | src/hooks/api/query-keys/ |
| Edge Functions | supabase/functions/ |
| Shared Edge Fn utilities | supabase/functions/_shared/ |
| DB migrations | supabase/migrations/ |
| Generated types (don't edit) | src/types/supabase.ts |
| Route middleware | proxy.ts (project root) |
| RLS integration tests | tests/integration/rls/ |
| E2E tests | tests/e2e/tests/ |

## Cron Jobs (pg_cron, run 3 AM UTC window)

| Job | What |
|-----|------|
| expire-leases | Expire active leases past end_date |
| calculate_late_fees | Calculate late fees on overdue rent |
| process-autopay-charges | Process autopay for due rent via Edge Fn |
| cleanup-security-events | Archive + delete events > 90 days |
| cleanup-errors | Archive + delete errors > 90 days |
| cleanup-webhook-events | Archive webhooks (90d succeeded / 180d failed) |
| check-cron-health | Monitor job failures hourly via cron.job_run_details |
| process-account-deletions | GDPR: anonymize users past 30-day grace period |

## Public Routes (skip auth)

`/`, `/auth/*`, `/pricing`, `/features`

All other routes require authentication and role-based enforcement via proxy.ts.
