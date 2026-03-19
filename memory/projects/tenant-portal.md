# Tenant Portal

**Also called:** tenant portal, tenant UI, tenant-facing, /tenant/*
**Status:** Active

## What It Is

The tenant-facing side of TenantFlow. Tenants pay rent, set up autopay, submit and track maintenance requests, view their lease, and manage their account.

## Key Files

| File | Purpose |
|------|---------|
| src/hooks/api/use-tenant-payments.ts | Tenant payment hooks (flat naming, max 300 lines) |
| src/hooks/api/query-keys/payment-keys.ts | Payment query key factory |
| supabase/functions/tenant-invitation-accept/ | Accept invite — rate-limited (10 req/min per IP) |
| supabase/functions/tenant-invitation-validate/ | Validate invite token — rate-limited |

## Key Conventions

- All tenant portal hooks use `resolveTenantId()` from `use-tenant-portal-keys.ts` — never resolve tenant ID inline.
- Tenant payment queries use `refetchOnWindowFocus: 'always'` — time-sensitive data exception to the global rule.
- Shared leases: per-tenant portions computed from `lease_tenants.responsibility_percentage`. Each tenant pays `rent_due.amount * percentage / 100`.
- Tenant delete is soft-delete (`status: 'inactive'`) with active-lease blocking guard.
- `tenant-invitation-accept` and `tenant-invitation-validate` are unauthenticated Edge Fns — rate-limited at 10 req/min per IP via Upstash Redis.

## RLS Notes

- Tenants can only read/write their own data
- `get_current_tenant_id()` and `get_tenant_unit_ids()` are the RLS helper functions
- One policy per operation per role — never `FOR ALL`
