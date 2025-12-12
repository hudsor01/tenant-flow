-- Migration: Add performance indexes for dashboard/analytics workloads
-- Context: Week 1 Missing Database Indexes (PERFORMANCE_IMPROVEMENTS.md)

-- Optimizes dashboard stats, occupancy analytics, and unit filtering
CREATE INDEX IF NOT EXISTS idx_units_property_status ON public.units(property_id, status);

-- Optimizes lease lookups by owner and unit with status filters
CREATE INDEX IF NOT EXISTS idx_leases_owner_status ON public.leases(property_owner_id, lease_status);
CREATE INDEX IF NOT EXISTS idx_leases_unit_status ON public.leases(unit_id, lease_status);

-- Optimizes rent payment status queries and lease payment lookups
CREATE INDEX IF NOT EXISTS idx_rent_payments_lease_status ON public.rent_payments(lease_id, status);
CREATE INDEX IF NOT EXISTS idx_rent_payments_status_partial ON public.rent_payments(status) WHERE status = 'succeeded';
