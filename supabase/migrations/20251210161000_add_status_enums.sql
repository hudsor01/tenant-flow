-- ============================================================================
-- Migration: Add PostgreSQL Enum Types for Status Columns
-- ============================================================================
-- Purpose: Convert text status columns to proper PostgreSQL enum types
-- for type safety and database-level validation.
--
-- Following official Supabase PostgreSQL Enums documentation:
-- https://supabase.com/docs/guides/database/postgres/enums
--
-- IMPORTANT: This migration requires careful ordering:
-- 1. Drop indexes on columns being converted
-- 2. Drop CHECK constraints (can't compare enum to text)
-- 3. Drop default constraints (can't auto-cast text defaults to enum)
-- 4. Create enum types
-- 5. Alter columns to use enum types
-- 6. Restore defaults with enum casting
-- 7. Recreate indexes with enum-aware definitions
-- (CHECK constraints NOT recreated - enum type handles validation)
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP INDEXES ON COLUMNS BEING CONVERTED TO ENUMS
-- ============================================================================
-- PostgreSQL cannot alter column types while indexes exist on those columns.

-- Leases table (lease_status column)
drop index if exists idx_leases_lease_status;
drop index if exists idx_leases_status;
drop index if exists idx_leases_draft;
drop index if exists idx_leases_pending_signature;

-- Units table (status column)
drop index if exists idx_units_status;

-- Properties table (status column)
drop index if exists idx_properties_status;

-- Maintenance requests table (status, priority columns)
drop index if exists idx_maintenance_requests_status;
drop index if exists idx_maintenance_requests_priority;

-- Rent payments table (status column)
drop index if exists idx_rent_payments_status;

-- Payment transactions table (status column)
drop index if exists idx_payment_transactions_status;

-- NOTE: Blogs table SKIPPED - has active n8n workflow pushing data every 15 min

-- ============================================================================
-- STEP 3: DROP CHECK CONSTRAINTS
-- ============================================================================
-- CHECK constraints compare column values to text arrays using = operator.
-- When column type changes to enum, this comparison breaks.
-- Enum types provide validation, so CHECK constraints are not needed.

alter table public.leases drop constraint if exists leases_lease_status_check;
alter table public.units drop constraint if exists units_status_check;
alter table public.properties drop constraint if exists properties_status_check;
alter table public.maintenance_requests drop constraint if exists maintenance_requests_status_check;
alter table public.maintenance_requests drop constraint if exists maintenance_requests_priority_check;
alter table public.rent_payments drop constraint if exists rent_payments_status_check;
alter table public.payment_transactions drop constraint if exists payment_transactions_status_check;
-- NOTE: blogs_status_check SKIPPED - active n8n workflow

-- ============================================================================
-- STEP 3: DROP DEFAULT CONSTRAINTS
-- ============================================================================
-- PostgreSQL cannot automatically cast text defaults to enum types.

alter table public.leases alter column lease_status drop default;
alter table public.units alter column status drop default;
alter table public.properties alter column status drop default;
alter table public.maintenance_requests alter column status drop default;
alter table public.maintenance_requests alter column priority drop default;
-- NOTE: blogs default SKIPPED - active n8n workflow

-- ============================================================================
-- STEP 4: CREATE ENUM TYPES
-- ============================================================================
-- Values match EXACTLY what's in existing CHECK constraints to ensure
-- all current data can be cast without errors.

-- Lease workflow states
create type lease_status as enum (
  'draft',
  'pending_signature',
  'active',
  'ended',
  'terminated'
);

-- Unit availability states (from CHECK: available, occupied, maintenance)
create type unit_status as enum (
  'available',
  'occupied',
  'maintenance',
  'reserved'
);

-- Payment processing states (from CHECK: pending, processing, succeeded, failed, canceled)
create type payment_status as enum (
  'pending',
  'processing',
  'succeeded',
  'failed',
  'canceled',
  'cancelled',
  'requires_action'
);

-- Maintenance request workflow (from CHECK: open, in_progress, completed, cancelled)
create type maintenance_status as enum (
  'open',
  'in_progress',
  'completed',
  'cancelled',
  'on_hold'
);

-- Maintenance priority levels (from CHECK: urgent, high, normal, low)
create type maintenance_priority as enum (
  'low',
  'normal',
  'medium',
  'high',
  'urgent'
);

-- Property status (from CHECK: active, inactive, sold)
create type property_status as enum (
  'active',
  'inactive',
  'sold'
);

-- NOTE: blog_status enum SKIPPED - active n8n workflow on blogs table

-- Notification types
create type notification_type as enum (
  'maintenance',
  'lease',
  'payment',
  'system'
);

-- ============================================================================
-- STEP 5: ALTER COLUMNS TO USE ENUM TYPES
-- ============================================================================

alter table public.leases
  alter column lease_status type lease_status using lease_status::lease_status;

alter table public.units
  alter column status type unit_status using status::unit_status;

alter table public.rent_payments
  alter column status type payment_status using status::payment_status;

alter table public.payment_transactions
  alter column status type payment_status using status::payment_status;

alter table public.maintenance_requests
  alter column status type maintenance_status using status::maintenance_status,
  alter column priority type maintenance_priority using priority::maintenance_priority;

alter table public.properties
  alter column status type property_status using status::property_status;

-- NOTE: blogs.status ALTER SKIPPED - active n8n workflow

alter table public.notifications
  alter column notification_type type notification_type using notification_type::notification_type;

-- ============================================================================
-- STEP 6: RESTORE DEFAULT CONSTRAINTS WITH ENUM TYPES
-- ============================================================================

alter table public.leases alter column lease_status set default 'draft'::lease_status;
alter table public.units alter column status set default 'available'::unit_status;
alter table public.properties alter column status set default 'active'::property_status;
alter table public.maintenance_requests alter column status set default 'open'::maintenance_status;
alter table public.maintenance_requests alter column priority set default 'normal'::maintenance_priority;
-- NOTE: blogs default restore SKIPPED - active n8n workflow

-- ============================================================================
-- STEP 7: RECREATE INDEXES
-- ============================================================================

-- Leases table
create index idx_leases_lease_status on public.leases using btree (lease_status);
create index idx_leases_draft on public.leases using btree (lease_status)
  where lease_status = 'draft'::lease_status;
create index idx_leases_pending_signature on public.leases using btree (lease_status)
  where lease_status = 'pending_signature'::lease_status;

-- Units table
create index idx_units_status on public.units using btree (status);

-- Properties table
create index idx_properties_status on public.properties using btree (status);

-- Maintenance requests table
create index idx_maintenance_requests_status on public.maintenance_requests using btree (status);
create index idx_maintenance_requests_priority on public.maintenance_requests using btree (priority);

-- Rent payments table
create index idx_rent_payments_status on public.rent_payments using btree (status);

-- Payment transactions table
create index idx_payment_transactions_status on public.payment_transactions using btree (status);

-- NOTE: Blogs index SKIPPED - active n8n workflow

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================
comment on type lease_status is 'Lease workflow states: draft -> pending_signature -> active -> ended/terminated';
comment on type unit_status is 'Unit availability states';
comment on type payment_status is 'Payment processing states from Stripe integration';
comment on type maintenance_status is 'Maintenance request workflow states';
comment on type maintenance_priority is 'Maintenance request priority levels';
comment on type property_status is 'Property lifecycle status';
-- NOTE: blog_status comment SKIPPED - enum not created due to active n8n workflow
comment on type notification_type is 'Notification category types';
