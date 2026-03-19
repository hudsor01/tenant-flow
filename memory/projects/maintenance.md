# Maintenance

**Also called:** maintenance, maintenance requests, work orders
**Status:** Active

## What It Is

Maintenance request workflow — tenants submit requests, owners track status, vendors are assigned. Includes status tracking, photo uploads, and stats via RPC.

## Key Files

| File | Purpose |
|------|---------|
| src/hooks/api/query-keys/maintenance-keys.ts | Query key factory |

## Key Conventions

- Stats use consolidated RPC `get_maintenance_stats()` — not multiple HEAD queries.
- Photos: `inspection_photos` table has `updated_at` with `set_updated_at()` trigger.
- Kanban boards use scroll-snap on mobile, grid on desktop.

## RLS Notes

- Tenants: read/write their own maintenance requests only
- Owners: read all requests on their properties
