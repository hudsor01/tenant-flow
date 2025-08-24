-- CRITICAL PRODUCTION INDEXES FOR PERFORMANCE
-- These indexes are REQUIRED for production with paying customers

-- Units table indexes for common queries
CREATE INDEX IF NOT EXISTS idx_units_property_id ON "Unit"("propertyId");
CREATE INDEX IF NOT EXISTS idx_units_status ON "Unit"("status");
CREATE INDEX IF NOT EXISTS idx_units_property_status ON "Unit"("propertyId", "status");
CREATE INDEX IF NOT EXISTS idx_units_rent ON "Unit"("rent") WHERE "rent" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_units_created_at ON "Unit"("createdAt" DESC);

-- Properties table indexes for ownership queries  
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON "Property"("ownerId");
CREATE INDEX IF NOT EXISTS idx_properties_owner_created ON "Property"("ownerId", "createdAt" DESC);

-- Tenants table indexes
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON "Tenant"("ownerId");
CREATE INDEX IF NOT EXISTS idx_tenants_email ON "Tenant"("email");
CREATE INDEX IF NOT EXISTS idx_tenants_owner_email ON "Tenant"("ownerId", "email");

-- Leases table indexes for active lease queries
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON "Lease"("propertyId");
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON "Lease"("tenantId");
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON "Lease"("unitId");
CREATE INDEX IF NOT EXISTS idx_leases_status ON "Lease"("status");
CREATE INDEX IF NOT EXISTS idx_leases_end_date ON "Lease"("endDate") WHERE "status" = 'ACTIVE';

-- Maintenance table indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON "MaintenanceRequest"("propertyId");
CREATE INDEX IF NOT EXISTS idx_maintenance_unit_id ON "MaintenanceRequest"("unitId");
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON "MaintenanceRequest"("status");
CREATE INDEX IF NOT EXISTS idx_maintenance_priority_status ON "MaintenanceRequest"("priority", "status") 
  WHERE "status" IN ('PENDING', 'IN_PROGRESS');

-- User table indexes for auth lookups
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"("email");
CREATE INDEX IF NOT EXISTS idx_user_supabase_id ON "User"("supabaseId");

-- Subscription indexes for billing queries
CREATE INDEX IF NOT EXISTS idx_subscription_user_id ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS idx_subscription_stripe_id ON "Subscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS idx_subscription_status ON "Subscription"("status") 
  WHERE "status" IN ('active', 'trialing');

-- ANALYZE tables to update statistics for query planner
ANALYZE "Unit";
ANALYZE "Property";
ANALYZE "Tenant";
ANALYZE "Lease";
ANALYZE "MaintenanceRequest";
ANALYZE "User";
ANALYZE "Subscription";