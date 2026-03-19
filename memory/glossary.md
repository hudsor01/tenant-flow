# Glossary

TenantFlow shorthand, acronyms, and domain terms.

## Architecture Acronyms

| Term | Meaning | Context |
|------|---------|---------|
| RLS | Row Level Security | Supabase — enforced on every table, primary access-control layer |
| tRPC | Type-safe RPC layer | Frontend calls backend procedures via tRPC routers |
| CSP | Content Security Policy | Enforced in vercel.json on all pages |
| GDPR | General Data Protection Regulation | Account deletion + anonymization flow |
| ISR | Incremental Static Regeneration | Next.js caching strategy |
| SSG | Static Site Generation | Default Next.js rendering mode |
| JWT | JSON Web Token | Auth token issued by Supabase Auth |

## Domain Terms

| Term | Meaning |
|------|---------|
| rent_due | Record of rent owed for a billing period (amount in dollars) |
| owner_user_id | Canonical owner column on all tables (references users.id) |
| soft delete | Set status: 'inactive' — filter with .neq('status', 'inactive') |
| responsibility_percentage | Each tenant's share of rent on a shared lease |
| autopay | Scheduled Stripe charge via pg_cron (3 attempts over 7 days) |
| autopay_attempts | Column on rent_due tracking retry count |
| autopay_next_retry_at | Column on rent_due for pg_cron retry scheduling |
| set_updated_at | Only trigger function for updated_at columns — never create duplicates |
| get_current_owner_user_id | RLS helper function for owner policies |
| get_current_tenant_id | RLS helper function for tenant policies |

## Code Shorthand

| Shorthand | Meaning |
|-----------|---------|
| typecheck | pnpm typecheck — TypeScript validation |
| validate:quick | pnpm validate:quick — types + lint + unit tests |
| db:types | pnpm db:types — regenerate Supabase types from live DB |
| the webhook | supabase/functions/stripe-webhooks/ |
| the proxy | proxy.ts — Next.js middleware for route protection |
| Edge Fn | Supabase Edge Function in supabase/functions/ (Deno runtime) |
| query factory | queryOptions() factory in src/hooks/api/query-keys/ |

## Feature Area Aliases

| Alias | What it means |
|-------|---------------|
| billing / payments / subscriptions | Stripe subscription + payment features |
| tenant portal / tenant UI | Tenant-facing UI at /tenant/* |
| maintenance | maintenance_requests module + vendor management |
| leases / lease management | Lease lifecycle, templates, shared leases |
| properties / units | Property + unit CRUD (soft-delete pattern) |
| auth / login / oauth | JWT + Supabase Auth + Google OAuth |
| reports / analytics | Report runs, revenue/occupancy trends |
| docs / documents | Lease and property document storage (Supabase Storage) |

## Stripe-Specific Terms

| Term | Meaning |
|------|---------|
| checkout session | supabase/functions/stripe-checkout-session/ |
| webhook idempotency | stripe_webhook_events.status: processing/succeeded/failed |
| stripe.* tables | stripe.subscriptions, stripe.invoices — queryable via PostgREST |
| payment element | Stripe UI component for payment method collection |
| default_payment_method | Stripe field set after first successful payment via set_default_payment_method RPC |

## Database Conventions

| Convention | Detail |
|------------|--------|
| amounts | Stored as dollars (numeric(10,2)) — multiply ×100 only at Stripe API boundary |
| soft delete | properties: status: 'inactive', filter .neq('status', 'inactive') |
| tenant soft delete | tenants: status: 'inactive', blocking guard for active leases |
| no PostgreSQL ENUMs | Use text columns with CHECK constraints |
| archive pattern | Archive-then-delete for security_events, user_errors, stripe_webhook_events |
