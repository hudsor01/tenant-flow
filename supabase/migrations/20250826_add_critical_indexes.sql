-- CRITICAL PRODUCTION INDEXES FOR PERFORMANCE
-- These indexes are REQUIRED for production with paying customers

-- Units table indexes for common queries
CREATE INDEX IF NOT EXISTS idx_units_property_id ON "unit"("propertyId");
CREATE INDEX IF NOT EXISTS idx_units_status ON "unit"("status");
CREATE INDEX IF NOT EXISTS idx_units_property_status ON "unit"("propertyId", "status");
CREATE INDEX IF NOT EXISTS idx_units_rent ON "unit"("rent") WHERE "rent" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_units_created_at ON "unit"("createdAt" DESC);

-- Properties table indexes for ownership queries  
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON "property"("ownerId");
CREATE INDEX IF NOT EXISTS idx_properties_owner_created ON "property"("ownerId", "createdAt" DESC);

-- Tenants table indexes
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON "tenant"("ownerId");
CREATE INDEX IF NOT EXISTS idx_tenants_email ON "tenant"("email");
CREATE INDEX IF NOT EXISTS idx_tenants_owner_email ON "tenant"("ownerId", "email");

-- Leases table indexes for active lease queries
CREATE INDEX IF NOT EXISTS idx_leases_property_id ON "lease"("propertyId");
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON "lease"("tenantId");
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON "lease"("unitId");
CREATE INDEX IF NOT EXISTS idx_leases_status ON "lease"("status");
CREATE INDEX IF NOT EXISTS idx_leases_end_date ON "lease"("endDate") WHERE "status" = 'ACTIVE';

-- Maintenance table indexes
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON "maintenance_request"("propertyId");
CREATE INDEX IF NOT EXISTS idx_maintenance_unit_id ON "maintenance_request"("unitId");
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON "maintenance_request"("status");
CREATE INDEX IF NOT EXISTS idx_maintenance_priority_status ON "maintenance_request"("priority", "status") 
  WHERE "status" IN ('PENDING', 'IN_PROGRESS');

-- User table indexes for auth lookups
CREATE INDEX IF NOT EXISTS idx_user_email ON "users"("email");
CREATE INDEX IF NOT EXISTS idx_user_supabase_id ON "users"("supabaseId");

-- Subscription indexes for billing queries
CREATE INDEX IF NOT EXISTS idx_subscription_user_id ON "subscription"("userId");
CREATE INDEX IF NOT EXISTS idx_subscription_stripe_id ON "subscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS idx_subscription_status ON "subscription"("status") 
  WHERE "status" IN ('active', 'trialing');

-- ANALYZE tables to update statistics for query planner
ANALYZE "unit";
ANALYZE "property";
ANALYZE "tenant";
ANALYZE "lease";
ANALYZE "maintenance_request";
ANALYZE "users";
ANALYZE "subscription";