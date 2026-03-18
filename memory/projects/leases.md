# Leases

**Also called:** leases, lease management, lease lifecycle
**Status:** Active

## What It Is

Full lease lifecycle management — create, sign, renew, expire. Supports single-tenant and shared leases (multiple tenants with percentage responsibility splits). Lease templates for reuse.

## Key Files

| File | Purpose |
|------|---------|
| src/hooks/api/query-keys/lease-keys.ts | Query key factory |

## Key Conventions

- `leases` table has single owner column `owner_user_id` (legacy `property_owner_id` was dropped).
- Lease expiry handled by `expire_leases()` cron function (runs nightly 11 PM UTC).
- Shared leases: each tenant's rent = `rent_due.amount * responsibility_percentage / 100`.
- `lease_tenants.responsibility_percentage` — per-tenant portion of rent.
- Stats via `get_lease_stats()` RPC — not multiple HEAD queries.

## RLS Notes

- Owners: full CRUD on their own leases
- Tenants: read-only access to their own active lease
