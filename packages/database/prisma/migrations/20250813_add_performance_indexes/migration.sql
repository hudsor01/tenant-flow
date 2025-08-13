-- Migration: Add performance indexes for ownerId + status combinations
-- Date: 2025-08-13
-- Purpose: Improve query performance for property and maintenance operations

-- Property table indexes (ownerId already exists, add compound indexes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_property_owner_type" ON "Property" ("ownerId", "propertyType");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_property_owner_created" ON "Property" ("ownerId", "createdAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_property_city_state" ON "Property" ("city", "state"); -- For location-based queries

-- Unit table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_unit_property_status" ON "Unit" ("propertyId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_unit_status" ON "Unit" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_unit_property_created" ON "Unit" ("propertyId", "createdAt" DESC);

-- MaintenanceRequest table indexes - critical for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_maintenance_unit_status" ON "MaintenanceRequest" ("unitId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_maintenance_status_priority" ON "MaintenanceRequest" ("status", "priority");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_maintenance_created_status" ON "MaintenanceRequest" ("createdAt" DESC, "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_maintenance_assigned" ON "MaintenanceRequest" ("assignedTo") WHERE "assignedTo" IS NOT NULL;

-- Composite index for owner-based queries (MaintenanceRequest via Unit -> Property -> ownerId)
-- This supports the common query pattern: find maintenance requests for properties owned by X
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_maintenance_owner_lookup" ON "MaintenanceRequest" ("unitId", "status", "priority");

-- Lease table indexes (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Lease') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_lease_unit_status" ON "Lease" ("unitId", "status");
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_lease_status_dates" ON "Lease" ("status", "startDate", "endDate");
    END IF;
END
$$;

-- Tenant table indexes (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Tenant') THEN
        CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tenant_status" ON "Tenant" ("status") WHERE "status" IS NOT NULL;
    END IF;
END
$$;

-- Add partial indexes for common status filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_unit_occupied" ON "Unit" ("propertyId", "createdAt" DESC) WHERE "status" = 'OCCUPIED';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_unit_vacant" ON "Unit" ("propertyId", "createdAt" DESC) WHERE "status" = 'VACANT';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_maintenance_open" ON "MaintenanceRequest" ("unitId", "priority", "createdAt" DESC) WHERE "status" = 'OPEN';
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_maintenance_in_progress" ON "MaintenanceRequest" ("unitId", "createdAt" DESC) WHERE "status" = 'IN_PROGRESS';

-- Add indexes for audit/logging queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_property_updated" ON "Property" ("updatedAt" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_maintenance_updated" ON "MaintenanceRequest" ("updatedAt" DESC);

-- Statistics update for better query planning
ANALYZE "Property";
ANALYZE "Unit";  
ANALYZE "MaintenanceRequest";