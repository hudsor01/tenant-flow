# TenantFlow Database Schema

> **AI/Human-Readable Schema Reference**
> Last updated: December 2024 | 63+ migrations | 30+ tables | 30+ RPC functions | 200+ RLS policies

## Quick Reference

| Schema | Purpose | Managed By |
|--------|---------|------------|
| `public` | Main application data | You |
| `stripe` | Stripe sync (read-only mirror) | Stripe webhook sync |
| `auth` | Users, sessions, tokens | Supabase Auth |
| `storage` | File buckets, objects | Supabase Storage |

---

## Core Domain Model

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  users (auth)   │     │ property_owners │     │   properties    │
│  ─────────────  │     │ ─────────────── │     │ ─────────────── │
│  id (uuid, PK)  │◄────│ user_id (FK)    │◄────│ property_owner  │
│  email          │     │ stripe_account  │     │ _id (FK)        │
│  user_type      │     │ business_name   │     │ name, address   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌────────────────────────────────┤
                        ▼                                ▼
              ┌─────────────────┐              ┌─────────────────┐
              │     units       │              │ property_images │
              │ ─────────────── │              │ ─────────────── │
              │ property_id(FK) │              │ property_id(FK) │
              │ unit_number     │              │ image_url       │
              │ rent_amount     │              └─────────────────┘
              │ status          │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌───────────────┐ ┌──────────┐ ┌─────────────────────┐
│    leases     │ │ rent_due │ │ tenant_invitations  │
│ ───────────── │ │ ──────── │ │ ─────────────────── │
│ unit_id (FK)  │ │ unit_id  │ │ unit_id (FK)        │
│ tenant_id(FK) │ │ lease_id │ │ email               │
│ start_date    │ │ due_date │ │ invitation_code     │
│ end_date      │ │ amount   │ │ accepted_by_user_id │
│ rent_amount   │ └──────────┘ └─────────────────────┘
│ lease_status  │
└───────┬───────┘
        │
        ├──────────────┬─────────────────┐
        ▼              ▼                 ▼
┌───────────────┐ ┌──────────────┐ ┌─────────────────────┐
│ lease_tenants │ │rent_payments │ │maintenance_requests │
│ ───────────── │ │ ──────────── │ │ ─────────────────── │
│ lease_id (FK) │ │ lease_id(FK) │ │ unit_id (FK)        │
│ tenant_id(FK) │ │ tenant_id    │ │ tenant_id (FK)      │
│ is_primary    │ │ amount       │ │ status, priority    │
└───────────────┘ │ status       │ │ description         │
                  │ due_date     │ └─────────────────────┘
                  └──────────────┘
```

---

## Public Schema Tables

### Core Entities

#### `users`
Central user table (synced from auth.users via trigger).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Matches auth.users.id |
| `email` | text | User email |
| `full_name` | text | Display name |
| `first_name` | text | First name |
| `last_name` | text | Last name |
| `phone` | text | Phone number |
| `user_type` | text | `OWNER`, `TENANT`, `MANAGER`, `ADMIN` |
| `stripe_customer_id` | text | Stripe customer for billing |
| `status` | text | `active`, `inactive`, `suspended` |
| `avatar_url` | text | Profile image URL |
| `onboarding_status` | text | `not_started`, `in_progress`, `completed` |

#### `property_owners`
Stripe Connect account for property owners (1:1 with users).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users) | Owner's user ID |
| `stripe_account_id` | text | Stripe Connect account `acct_xxx` |
| `business_name` | text | Business display name |
| `business_type` | text | `individual`, `company` |
| `charges_enabled` | boolean | Can receive payments |
| `payouts_enabled` | boolean | Can receive payouts |
| `onboarding_status` | text | Connect onboarding status |

#### `properties`
Rental properties owned by property owners.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `property_owner_id` | uuid (FK → users) | Owner's user ID |
| `name` | text | Property name |
| `address_line1` | text | Street address |
| `address_line2` | text | Apt/Suite (optional) |
| `city`, `state`, `postal_code` | text | Location |
| `country` | text | Default `US` |
| `property_type` | text | `single_family`, `multi_family`, etc. |
| `status` | text | `active`, `inactive`, `sold` |

**Relationships**: Has many `units`, `property_images`, `tenant_invitations`

#### `units`
Individual rental units within properties.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `property_id` | uuid (FK → properties) | Parent property |
| `property_owner_id` | uuid (FK → users) | Denormalized for RLS |
| `unit_number` | text | Unit identifier (e.g., "101", "A") |
| `bedrooms` | integer | Number of bedrooms |
| `bathrooms` | numeric(3,1) | Number of bathrooms |
| `square_feet` | integer | Unit size |
| `rent_amount` | integer | Monthly rent in cents |
| `status` | text | `available`, `occupied`, `maintenance` |

**Relationships**: Has many `leases`, `maintenance_requests`, `rent_due`

#### `tenants`
Tenant profile (extends user with tenant-specific data).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users) | Tenant's user account |
| `date_of_birth` | date | DOB for verification |
| `ssn_last_four` | text | Last 4 of SSN (encrypted) |
| `identity_verified` | boolean | ID verification status |
| `emergency_contact_name` | text | Emergency contact |
| `emergency_contact_phone` | text | Emergency phone |
| `emergency_contact_relationship` | text | Relationship |

**Relationships**: Has many `leases` (via `lease_tenants`), `rent_payments`, `maintenance_requests`

#### `leases`
Rental agreements between owners and tenants.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `unit_id` | uuid (FK → units) | Leased unit |
| `primary_tenant_id` | uuid (FK → tenants) | Primary tenant |
| `property_owner_id` | uuid (FK → users) | Owner (denormalized) |
| `start_date` | date | Lease start |
| `end_date` | date | Lease end |
| `rent_amount` | integer | Monthly rent (cents) |
| `security_deposit` | integer | Deposit amount (cents) |
| `payment_day` | integer | Day of month rent is due (1-28) |
| `late_fee_amount` | integer | Late fee (cents) |
| `late_fee_days` | integer | Days before late fee applies |
| `lease_status` | text | `pending`, `active`, `ended`, `terminated` |
| `stripe_subscription_id` | text | For recurring payments |
| `auto_pay_enabled` | boolean | Autopay status |

**Relationships**: Has many `lease_tenants`, `rent_payments`

#### `lease_tenants`
Join table for multiple tenants on a lease.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `lease_id` | uuid (FK → leases) | Parent lease |
| `tenant_id` | uuid (FK → tenants) | Tenant on lease |
| `is_primary` | boolean | Primary tenant flag |
| `responsibility_percentage` | integer | Rent split (default 100) |

### Payments & Billing

#### `rent_payments`
Individual rent payment records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `lease_id` | uuid (FK → leases) | Associated lease |
| `tenant_id` | uuid (FK → tenants) | Paying tenant |
| `stripe_payment_intent_id` | text | Stripe PI `pi_xxx` |
| `amount` | integer | Payment amount (cents) |
| `status` | text | `pending`, `processing`, `succeeded`, `failed`, `canceled` |
| `payment_method_type` | text | `card`, `bank_account`, etc. |
| `period_start` | date | Billing period start |
| `period_end` | date | Billing period end |
| `due_date` | date | When payment was due |
| `paid_date` | timestamptz | When payment succeeded |
| `late_fee_amount` | integer | Late fee applied (cents) |
| `application_fee_amount` | integer | Platform fee (cents) |

#### `payment_methods`
Saved payment methods for tenants.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `tenant_id` | uuid (FK → tenants) | Owner of method |
| `stripe_payment_method_id` | text | Stripe PM `pm_xxx` |
| `type` | text | `card`, `bank_account`, `ach`, `sepa_debit` |
| `last_four` | text | Last 4 digits |
| `brand` | text | Card brand (Visa, etc.) |
| `is_default` | boolean | Default payment method |

#### `payment_transactions`
Transaction attempts for payments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `rent_payment_id` | uuid (FK → rent_payments) | Parent payment |
| `payment_method_id` | uuid (FK → payment_methods) | Method used |
| `stripe_payment_intent_id` | text | Stripe PI |
| `status` | text | `pending`, `processing`, `succeeded`, `failed`, `canceled` |
| `amount` | integer | Amount attempted (cents) |
| `failure_reason` | text | Error message if failed |
| `retry_count` | integer | Number of retries |

### Maintenance

#### `maintenance_requests`
Maintenance tickets from tenants.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `unit_id` | uuid (FK → units) | Affected unit |
| `tenant_id` | uuid (FK → tenants) | Requesting tenant |
| `property_owner_id` | uuid (FK → users) | Owner (denormalized) |
| `title` | text | Request title |
| `description` | text | Issue description |
| `status` | text | `open`, `in_progress`, `completed`, `cancelled` |
| `priority` | text | `urgent`, `high`, `normal`, `low` |
| `assigned_to` | uuid | Assigned contractor/staff |
| `scheduled_date` | date | Scheduled repair date |
| `completed_at` | timestamptz | Completion timestamp |
| `estimated_cost` | integer | Estimated cost (cents) |
| `actual_cost` | integer | Final cost (cents) |

#### `expenses`
Expenses related to maintenance.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `maintenance_request_id` | uuid (FK) | Related request |
| `vendor_name` | text | Vendor/contractor |
| `amount` | integer | Cost (cents) |
| `expense_date` | date | Date of expense |

### Invitations & Onboarding

#### `tenant_invitations`
Invitations sent to potential tenants.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `email` | text | Invitee email |
| `unit_id` | uuid (FK → units) | Target unit |
| `property_owner_id` | uuid (FK → users) | Inviting owner |
| `invitation_code` | text | Unique code |
| `invitation_url` | text | Accept link |
| `status` | text | `pending`, `accepted`, `expired` |
| `expires_at` | timestamptz | Expiration time |
| `accepted_at` | timestamptz | When accepted |
| `accepted_by_user_id` | uuid | User who accepted |

### Documents & Storage

#### `documents`
File attachments for entities.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `entity_type` | text | `lease`, `property`, `tenant`, etc. |
| `entity_id` | uuid | ID of parent entity |
| `document_type` | text | `contract`, `id`, `proof_of_income`, etc. |
| `file_path` | text | Storage path |
| `storage_url` | text | Public/signed URL |
| `file_size` | integer | Size in bytes |

#### `property_images`
Images for properties.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `property_id` | uuid (FK → properties) | Parent property |
| `image_url` | text | Image URL |
| `display_order` | integer | Sort order |

### Notifications

#### `notifications`
In-app notifications for users.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK → users) | Recipient |
| `notification_type` | text | Type code |
| `title` | text | Notification title |
| `message` | text | Body text |
| `is_read` | boolean | Read status |
| `action_url` | text | Link to action |

#### `notification_logs`
Delivery tracking for notifications.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `notification_id` | uuid (FK) | Parent notification |
| `status` | text | `pending`, `sent`, `failed`, `bounced` |
| `delivery_channel` | text | `email`, `sms`, `in_app`, `push` |
| `attempt_count` | integer | Delivery attempts |

### Analytics & Reporting

#### `reports`
Saved report configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `property_owner_id` | uuid (FK) | Report owner |
| `report_type` | text | Report type code |
| `title` | text | Report name |
| `schedule_cron` | text | Cron schedule (if recurring) |
| `is_active` | boolean | Active status |

#### `report_runs`
Execution history for reports.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `report_id` | uuid (FK) | Parent report |
| `execution_status` | text | `pending`, `running`, `completed`, `failed` |
| `file_path` | text | Output file path |
| `execution_time_ms` | integer | Run time |

#### `activity`
Activity feed for dashboard.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid | Actor |
| `activity_type` | text | Type code |
| `entity_type` | text | Related entity type |
| `entity_id` | uuid | Related entity ID |
| `title` | text | Activity title |
| `description` | text | Details |

### Webhooks & Events

#### `webhook_events`
Incoming webhook payloads.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `webhook_source` | text | `stripe`, `auth`, `custom` |
| `event_type` | text | Event type code |
| `external_id` | text | External event ID (for idempotency) |
| `raw_payload` | jsonb | Full payload |
| `processed_at` | timestamptz | When processed |

#### `webhook_attempts`
Processing attempts for webhooks.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `webhook_event_id` | uuid (FK) | Parent event |
| `status` | text | `pending`, `processing`, `succeeded`, `failed` |
| `retry_count` | integer | Attempt number |
| `failure_reason` | text | Error message |

### Security & Audit

#### `security_audit_log`
Security event log.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid | Actor |
| `event_type` | text | `login`, `logout`, `password_change`, etc. |
| `entity_type` | text | Affected entity type |
| `entity_id` | uuid | Affected entity ID |
| `details` | jsonb | Event details |

#### `user_access_log`
API access log.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid | Actor |
| `endpoint` | text | API endpoint |
| `method` | text | HTTP method |
| `status_code` | integer | Response status |
| `ip_address` | text | Client IP |

### User Settings

#### `user_preferences`
User settings and preferences.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | Owner |
| `theme` | text | `light`, `dark` |
| `language` | text | Locale code |
| `timezone` | text | IANA timezone |
| `notifications_enabled` | boolean | Global notification toggle |

#### `subscriptions`
Platform subscriptions (owner billing).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `user_id` | uuid (FK) | Subscriber |
| `stripe_subscription_id` | text | Stripe sub `sub_xxx` |
| `stripe_customer_id` | text | Stripe customer |
| `status` | text | `active`, `canceled`, `past_due`, `trialing` |
| `current_period_start` | timestamptz | Billing period start |
| `current_period_end` | timestamptz | Billing period end |

---

## Stripe Schema (Read-Only Mirror)

The `stripe` schema contains tables synced from Stripe via webhooks. **Do not write directly** - data is managed by Stripe webhook handlers.

### Key Tables

| Table | Purpose |
|-------|---------|
| `stripe.customers` | Stripe Customer objects |
| `stripe.subscriptions` | Stripe Subscription objects |
| `stripe.invoices` | Stripe Invoice objects |
| `stripe.payment_intents` | Stripe PaymentIntent objects |
| `stripe.payment_methods` | Stripe PaymentMethod objects |
| `stripe.charges` | Stripe Charge objects |
| `stripe.products` | Stripe Product catalog |
| `stripe.prices` | Stripe Price objects |
| `stripe.events` | Raw Stripe events (for debugging) |

---

## RPC Functions

### Dashboard & Analytics

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `get_dashboard_stats` | `p_user_id uuid` | `json` | Comprehensive dashboard stats (properties, tenants, units, leases, maintenance, revenue) |
| `get_dashboard_time_series` | `p_user_id uuid, p_metric_name text, p_days int` | `jsonb` | Time-series data for dashboard charts |
| `get_billing_insights` | `owner_id uuid, start_date timestamp, end_date timestamp` | `jsonb` | Revenue, churn rate, MRR |
| `get_maintenance_analytics` | `user_id uuid` | `jsonb` | Maintenance metrics (resolution time, completion rate) |
| `get_occupancy_trends_optimized` | `p_user_id uuid, p_months int` | `jsonb` | Monthly occupancy trends |
| `get_revenue_trends_optimized` | `p_user_id uuid, p_months int` | `jsonb` | Monthly revenue trends |
| `get_property_performance_cached` | `p_user_id uuid` | `jsonb` | Property performance with caching |
| `get_property_performance_trends` | `p_user_id uuid` | `jsonb` | Property performance over time |
| `get_metric_trend` | `p_user_id uuid, p_metric_name text, p_period text` | `jsonb` | Generic metric trend calculation |

### Lease Management

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `sign_lease_and_check_activation` | `p_lease_id uuid, p_signer_type text, p_signature_ip text, p_signed_at timestamptz, p_signature_method signature_method` | `TABLE(success bool, both_signed bool, error_message text)` | Atomic lease signing with race condition prevention |
| `activate_lease_with_pending_subscription` | `p_lease_id uuid` | `TABLE(success bool, error_message text)` | Activate lease after both parties sign |
| `assert_can_create_lease` | `p_unit_id uuid, p_start_date date, p_end_date date` | `void` | Validate lease creation (throws on conflict) |

### Tenant Queries

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `get_tenants_by_owner` | `p_user_id uuid` | `SETOF uuid` | Get tenant IDs for properties owned by user |
| `get_tenants_with_lease_by_owner` | `p_user_id uuid` | `SETOF uuid` | Get tenant IDs with active leases for owner |
| `get_tenant_accessible_lease_ids` | `p_user_id uuid` | `SETOF uuid` | Lease IDs accessible to tenant |
| `get_owner_accessible_lease_tenant_ids` | `p_user_id uuid` | `SETOF uuid` | Lease-tenant IDs accessible to owner |

### User & Auth

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `get_current_user_type` | - | `text` | Get current user's type (OWNER/TENANT/etc.) |
| `get_current_tenant_id` | - | `uuid` | Get current user's tenant ID |
| `get_current_property_owner_id` | - | `uuid` | Get current user's property_owner ID |
| `get_user_profile` | `p_user_id text` | varies | Get user profile data |
| `custom_access_token_hook` | `event jsonb` | `jsonb` | JWT claims enhancement |
| `check_user_feature_access` | `p_user_id text, p_feature text` | `boolean` | Feature access check |
| `get_user_plan_limits` | `p_user_id text` | `TABLE(...)` | Subscription plan limits |

### Payment Processing

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `upsert_rent_payment` | varies | varies | Create or update rent payment |
| `record_processed_stripe_event_lock` | `p_stripe_event_id text` | `TABLE(success bool)` | Idempotent event processing |

### Webhook & Event Processing

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `acquire_webhook_event_lock` | varies | varies | Distributed lock for webhook processing |
| `acquire_webhook_event_lock_with_id` | varies | varies | Lock with specific ID |
| `acquire_internal_event_lock` | varies | varies | Internal event processing lock |
| `cleanup_old_internal_events` | - | varies | Cleanup old events |

### Health & Monitoring

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `health_check` | - | `jsonb` | Database health check |
| `get_slow_rls_queries` | - | varies | Performance monitoring |
| `get_common_errors` | - | varies | Error aggregation |
| `log_user_error` | varies | varies | Error logging |

---

## Enums

| Enum | Values |
|------|--------|
| `signature_method` | `in_app`, `docuseal` |

---

## Key Indexes

Performance-critical indexes (created in migrations):

```sql
-- RLS performance indexes
CREATE INDEX idx_properties_owner ON properties(property_owner_id);
CREATE INDEX idx_units_property ON units(property_id);
CREATE INDEX idx_units_owner ON units(property_owner_id);
CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_leases_tenant ON leases(primary_tenant_id);
CREATE INDEX idx_leases_owner ON leases(property_owner_id);
CREATE INDEX idx_maintenance_unit ON maintenance_requests(unit_id);
CREATE INDEX idx_maintenance_owner ON maintenance_requests(property_owner_id);
CREATE INDEX idx_rent_payments_lease ON rent_payments(lease_id);
CREATE INDEX idx_rent_payments_tenant ON rent_payments(tenant_id);

-- Webhook idempotency
CREATE UNIQUE INDEX idx_webhook_events_external ON webhook_events(webhook_source, external_id);
```

---

## RLS Policy Summary

All tables have Row Level Security enabled. Key patterns:

### Owner Access
```sql
-- Owners see their own properties
USING ((select auth.uid()) = property_owner_id)
```

### Tenant Access
```sql
-- Tenants see leases they're on
USING (
  id IN (
    SELECT lease_id FROM lease_tenants lt
    JOIN tenants t ON t.id = lt.tenant_id
    WHERE t.user_id = (select auth.uid())
  )
)
```

### Service Role Bypass
Service role (`service_role`) bypasses all RLS for backend operations.

---

## Storage Buckets

| Bucket | Purpose | Public |
|--------|---------|--------|
| `property-images` | Property photos | Yes |
| `profile-avatars` | User avatars | Yes |
| `lease-documents` | Lease PDFs (signed) | No |
| `documents` | General documents | No |

---

## Common Query Patterns

### Get owner's properties with units
```sql
SELECT p.*,
  (SELECT json_agg(u) FROM units u WHERE u.property_id = p.id) as units
FROM properties p
WHERE p.property_owner_id = auth.uid();
```

### Get tenant's active lease with unit/property
```sql
SELECT l.*,
  u.unit_number, u.rent_amount,
  p.name as property_name, p.address_line1
FROM leases l
JOIN units u ON u.id = l.unit_id
JOIN properties p ON p.id = u.property_id
JOIN lease_tenants lt ON lt.lease_id = l.id
JOIN tenants t ON t.id = lt.tenant_id
WHERE t.user_id = auth.uid()
AND l.lease_status = 'active';
```

### Get overdue payments
```sql
SELECT rp.*, t.id as tenant_id, u.first_name, u.last_name
FROM rent_payments rp
JOIN tenants t ON t.id = rp.tenant_id
JOIN users u ON u.id = t.user_id
WHERE rp.status = 'pending'
AND rp.due_date < CURRENT_DATE;
```

---

## Migrations

63 migrations in `supabase/migrations/`. Key ones:

| Migration | Description |
|-----------|-------------|
| `20251101000000_base_schema.sql` | Initial schema (125KB) |
| `20251128100000_separate_tenant_invitation_from_lease.sql` | Tenant invitation refactor |
| `20251128110000_sign_lease_atomic.sql` | Atomic lease signing RPC |
| `20251202200000_webhook_idempotency_atomic.sql` | Webhook deduplication |
| `20251223200000_database_optimization_suite.sql` | Performance indexes |
| `20251225130000_optimize_rpc_functions.sql` | RPC optimization |
| `20251225140000_add_financial_analytics_functions.sql` | Analytics RPCs |
| `20251225182240_fix_rls_policy_security_and_performance.sql` | RLS optimization |

---

## Updating This Document

After schema changes:
```bash
# Regenerate TypeScript types
pnpm db:types

# Review migration and update this document
```
