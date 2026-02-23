-- Migration: Add composite indexes for query performance
-- Purpose: Improve query performance for rent_payments and maintenance_requests
--          filtering by tenant/unit with status conditions
-- Affected tables: rent_payments, maintenance_requests
-- Impact: Reduces full table scans on common filtered queries

-- Composite index on rent_payments(tenant_id, status)
-- Covers: tenant payment history queries filtered by payment status
-- Used by: tenant portal payment views, late fee detection, payment reminders
create index if not exists idx_rent_payments_tenant_status
  on rent_payments (tenant_id, status)
  where tenant_id is not null;

-- Composite index on maintenance_requests(unit_id, status)
-- Covers: unit-level maintenance queries filtered by request status
-- Used by: property overview, maintenance list views, analytics
create index if not exists idx_maintenance_requests_unit_status
  on maintenance_requests (unit_id, status)
  where unit_id is not null;
