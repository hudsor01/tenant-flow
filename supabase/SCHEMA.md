# TenantFlow Database Schema

> **AI/Human-Readable Schema Reference**
> Last updated: June 2026 | 230+ migrations | 48 public tables + `stripe` FDW | RLS on every table
>
> **Source of truth for columns/types is the generated `src/types/supabase.ts`** (run `bun run db:types`).
> This document is a stable, hand-maintained *overview*; it deliberately does NOT enumerate every
> column (those drift per migration). Verify exact columns against `supabase.ts` or the live DB
> (Supabase MCP `list_tables` / `execute_sql`), never against a hand-written snapshot.

## Product Shape (read this first)

TenantFlow is a **landlord-only** property-management SaaS. Tenants are **records the landlord
manages, never user accounts** — there is no tenant portal, tenant auth, tenant login, or tenant
invitation flow. The platform does **not** facilitate rent payments and has **no Stripe Connect /
marketplace / payouts**. The only billing is the **landlord's own Stripe subscription** (denormalized
onto `public.users.subscription_*`). The pre-pivot rent-facilitation + tenant-portal tables were
demolished in `20260418183608_demolish_rent_and_tenant_portal.sql` and follow-ups; the dead Connect /
`tenants.user_id` columns were dropped in `20260616040851` + `20260616161248`.

## Conventions (stable invariants)

| Convention | Rule |
|-----------|------|
| Owner column | `owner_user_id uuid` (references `users.id`) on `properties`, `units`, `tenants`, `leases`, `maintenance_requests`, `documents`, `inspections`, `vendors`, … — NOT `property_owner_id` |
| Admin flag | `users.is_admin boolean` (the legacy `user_type` was migrated out) |
| Enums | **No PostgreSQL ENUMs** — value sets are `text` columns with `CHECK` constraints |
| Money | `amount` columns store **dollars** as `numeric(10,2)`; convert to cents only at the Stripe API boundary |
| Soft delete | `properties.status = 'inactive'` (filter `.neq('status','inactive')`); `expenses` also soft-delete via `status` |
| RLS | Enabled on **every** table; owner-scoped via `owner_user_id = (select auth.uid())`. `service_role` bypasses RLS for backend/Edge-Function work |
| `updated_at` | maintained by the single `set_updated_at()` trigger function |

## Quick Reference — Schemas

| Schema | Purpose | Managed By |
|--------|---------|------------|
| `public` | Main application data (48 tables) | You (migrations) |
| `stripe` | **Read-only Foreign Data Wrapper** (24 foreign tables proxying live Stripe API via the `wrappers` extension + vault-stored key — see `20260528223442_install_stripe_wrapper.sql`). Never write here; mutations go through the Stripe API in Edge Functions. | Stripe FDW |
| `auth` | Users, sessions, tokens | Supabase Auth |
| `storage` | File buckets, objects | Supabase Storage |

---

## Public Schema Tables (by domain)

> Exact columns: see `src/types/supabase.ts`. Each table below carries owner-scoped RLS unless noted.

### Identity & billing
- `users` — central user (synced from `auth.users`). Carries `is_admin` + the denormalized billing
  fields `stripe_customer_id`, `subscription_status`, `subscription_id`, `subscription_plan`,
  `subscription_current_period_end`, `subscription_cancel_at_period_end`, `subscription_source`,
  `trial_ends_at`. Subscription status reads from here directly.
- `user_preferences`, `notification_settings`, `user_tour_progress`, `user_feature_access`

### Properties & units
- `properties` (soft-delete via `status`), `units`, `property_images`

### Tenants & leases
- `tenants` — **records, not users**: contact + emergency-contact fields, `status`. No `user_id`.
- `leases` — `lease_status ∈ {draft, pending_signature, active, ended, terminated, expired}`;
  e-signature columns (`owner/tenant_signed_at`, `*_signature_ip/_user_agent/_method`,
  `tenant_signature_name`, `*_signature_consent_at`, `signed_document_path/hash`,
  `landlord_notice_address`, `immediate_family_members`).
- `lease_tenants` (owner-scoped via the `leases` join), `lease_signing_tokens` (single-use SHA-256
  token hashes for tenant magic-link signing; service-role write only), `lease_reminders`

### Maintenance & vendors
- `maintenance_requests`, `maintenance_request_photos`, `vendors`, `expenses`

### Inspections
- `inspections`, `inspection_rooms`, `inspection_photos`

### Documents
- `documents` — `document_type` is a soft FK to `document_categories.slug`, validated by the
  `validate_document_category` trigger (the Phase-61 CHECK was dropped).
- `document_categories` (per-owner taxonomy), `document_template_definitions`

### Notifications
- `notifications`, `notification_logs`

### Analytics, reporting & onboarding
- `reports`, `report_runs`, `activity`, `onboarding_funnel_events`, `gate_events` (paid-feature gate hits)

### Blog / AI content engine
- `blogs`, `blog_rag_chunks`

### Email deliverability
- `email_deliverability` (+ `email_deliverability_archive`), `email_suppressions`

### Webhooks & event processing
- `webhook_events`, `webhook_attempts`, `webhook_metrics`, `processed_internal_events`,
  `stripe_webhook_events` (+ `stripe_webhook_events_archive`, 90d/180d retention)

### Security & audit (service-role / admin)
- `security_events` (+ `security_events_archive`, 90d), `security_audit_log`, `user_access_log`,
  `user_errors` (+ `user_errors_archive`, 90d)

### Config
- `app_config` — keyed config (e.g. n8n webhook URLs)

---

## RPC Functions (selected; SECURITY DEFINER + `search_path=public`)

> Full set: grep `CREATE OR REPLACE FUNCTION` in `supabase/migrations/`.

### Lease e-signature (service_role only)
| Function | Returns | Description |
|----------|---------|-------------|
| `record_lease_signature(p_lease_id, p_signature_ip, p_signature_user_agent, p_signed_at, p_method)` | `TABLE(success, both_signed, error_message)` | Owner in-app signature; **durably** flips `lease_status → active` + inserts the owner notification atomically when both parties have signed. |
| `sign_lease_with_token(p_token_hash, p_signature_ip, p_signature_user_agent, p_signed_at, p_signer_name)` | `TABLE(success, both_signed, lease_id, error_message)` | Tenant token-based signature; same durable activation. Rebinds to the lease's current primary-tenant email (`tenant_changed` on mismatch). |
| `get_lease_signing_context(p_token_hash)` | `TABLE(valid, reason, lease_id, …)` | Read-only render context for the public `/sign/[token]` page. |

### Dashboard, analytics & stats
`get_dashboard_stats`, `get_dashboard_time_series`, consolidated stats RPCs
(`get_maintenance_stats`, `get_lease_stats`, etc.), `get_*_trends_optimized`,
`get_property_performance_*`. Admin-only RPCs gate on `is_admin()`.

### User, auth & billing
`is_admin`, `get_current_owner_user_id`, `get_user_profile`, `check_user_feature_access`,
`get_user_plan_limits`, `get_subscription_status`, `get_user_invoices` (reads `stripe.invoices`
through the FDW).

### Webhook & event processing
`acquire_webhook_event_lock*`, `acquire_internal_event_lock`, `record_processed_stripe_event_lock`,
`cleanup_old_internal_events`.

---

## CHECK-Constrained Text Values (examples)

Per the "No PostgreSQL ENUMs" rule, value sets are enforced via `CHECK` constraints on `text` columns.

| Column | Allowed values |
|--------|----------------|
| `leases.lease_status` | `draft`, `pending_signature`, `active`, `ended`, `terminated`, `expired` |
| `leases.owner_signature_method` / `tenant_signature_method` | `in_app` |
| `properties.status` | `active`, `inactive`, `sold` |
| `tenants.status` | `active`, `inactive`, `pending`, `moved_out` |
| `units.status` | `available`, `occupied`, `maintenance`, `reserved` |

---

## RLS Policy Summary

Every table has RLS enabled. One policy per operation per role (never `FOR ALL` on authenticated tables).

```sql
-- Owner access (the universal pattern)
USING (owner_user_id = (select auth.uid()))
```

- Child tables (`lease_tenants`, `inspection_*`, `maintenance_request_photos`, …) are owner-scoped
  via a join to their parent.
- `service_role` bypasses RLS for Edge-Function / backend work.
- Helper functions: `get_current_owner_user_id()`, `is_admin()`. `auth.uid()` is always wrapped in a
  subselect for performance.

---

## Storage

Lease PDFs: the finalized **signed** lease PDF is rendered by the signing flow (pdf-lib) and stored at
`tenant-documents/lease/<lease_id>/signed-lease.pdf` (+ a sha256 pointer on the lease). The *unsigned*
preview is streamed in-memory and never persisted. The legacy `lease-documents` bucket was demolished
(PR #677, 2026-05-07).

For the live bucket list, use Supabase MCP `list_storage_buckets`. Storage objects cannot be deleted
via SQL (`storage.protect_delete()` trigger) — use the Storage API.

---

## Updating This Document

This is a stable overview — update it only when a **domain** or **convention** changes (a new table
group, a renamed owner column, a new top-level RPC family). For day-to-day column accuracy, regenerate
and trust the types:

```bash
bun run db:types   # regenerates src/types/supabase.ts (the column source of truth)
```
