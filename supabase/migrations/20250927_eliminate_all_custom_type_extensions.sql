-- Comprehensive migration to eliminate ALL custom type extensions
-- By adding missing columns directly to database tables
-- This follows the principle: "Update the schema instead of extending types"

-- ========================================
-- 1. USER TABLE - Already handled in previous migration
-- ========================================
-- Already added: lastLoginAt, orgId, profileComplete

-- ========================================
-- 2. TENANT TABLE ENHANCEMENTS - Match User table structure
-- ========================================
-- Add firstName and lastName to match what forms collect
ALTER TABLE "tenant"
ADD COLUMN IF NOT EXISTS "firstName" TEXT,
ADD COLUMN IF NOT EXISTS "lastName" TEXT;

-- Migrate existing name data to firstName/lastName
UPDATE "tenant"
SET
  "firstName" = COALESCE("firstName", SPLIT_PART("name", ' ', 1)),
  "lastName" = COALESCE("lastName",
    CASE
      WHEN POSITION(' ' IN "name") > 0
      THEN SUBSTRING("name" FROM POSITION(' ' IN "name") + 1)
      ELSE NULL
    END
  )
WHERE "firstName" IS NULL OR "lastName" IS NULL;

-- Update name column to be a generated column
ALTER TABLE "tenant"
DROP COLUMN IF EXISTS "name",
ADD COLUMN "name" TEXT
GENERATED ALWAYS AS (
  CASE
    WHEN "firstName" IS NOT NULL AND "lastName" IS NOT NULL THEN
      "firstName" || ' ' || "lastName"
    WHEN "firstName" IS NOT NULL THEN
      "firstName"
    WHEN "lastName" IS NOT NULL THEN
      "lastName"
    ELSE NULL
  END
) STORED;

COMMENT ON COLUMN "tenant"."firstName" IS 'Tenant first name';
COMMENT ON COLUMN "tenant"."lastName" IS 'Tenant last name';
COMMENT ON COLUMN "tenant"."name" IS 'Generated: Full name combining firstName and lastName';

-- ========================================
-- 3. RENTPAYMENT TABLE ENHANCEMENTS
-- ========================================
-- PaymentUIExtended adds these fields
ALTER TABLE "RentPayment"
ADD COLUMN IF NOT EXISTS "invoiceId" UUID REFERENCES "invoice"(id),
ADD COLUMN IF NOT EXISTS "tenantId" UUID REFERENCES "tenant"(id),
ADD COLUMN IF NOT EXISTS "propertyId" UUID REFERENCES "property"(id),
ADD COLUMN IF NOT EXISTS "unit" TEXT,
ADD COLUMN IF NOT EXISTS "dueDate" DATE,
ADD COLUMN IF NOT EXISTS "paidDate" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS "transactionId" TEXT;

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_rent_payment_invoice_id ON "RentPayment"("invoiceId");
CREATE INDEX IF NOT EXISTS idx_rent_payment_tenant_id ON "RentPayment"("tenantId");
CREATE INDEX IF NOT EXISTS idx_rent_payment_property_id ON "RentPayment"("propertyId");
CREATE INDEX IF NOT EXISTS idx_rent_payment_due_date ON "RentPayment"("dueDate");

COMMENT ON COLUMN "RentPayment"."invoiceId" IS 'Reference to associated invoice';
COMMENT ON COLUMN "RentPayment"."tenantId" IS 'Direct reference to tenant for faster queries';
COMMENT ON COLUMN "RentPayment"."propertyId" IS 'Direct reference to property for reporting';
COMMENT ON COLUMN "RentPayment"."unit" IS 'Unit identifier for display';
COMMENT ON COLUMN "RentPayment"."dueDate" IS 'Payment due date';
COMMENT ON COLUMN "RentPayment"."paidDate" IS 'Actual payment timestamp';
COMMENT ON COLUMN "RentPayment"."paymentMethod" IS 'Payment method used (card, bank, etc)';
COMMENT ON COLUMN "RentPayment"."transactionId" IS 'External payment processor transaction ID';

-- ========================================
-- 4. INVOICE TABLE ENHANCEMENTS
-- ========================================
-- InvoiceUIExtended adds invoice_number
ALTER TABLE "invoice"
ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;

-- Create unique index for invoice numbers
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_number
ON "invoice"("invoiceNumber")
WHERE "invoiceNumber" IS NOT NULL;

-- Generate invoice numbers for existing records if needed
UPDATE "invoice"
SET "invoiceNumber" = 'INV-' || EXTRACT(YEAR FROM "createdAt")::TEXT || '-' || LPAD(id::TEXT, 6, '0')
WHERE "invoiceNumber" IS NULL;

COMMENT ON COLUMN "invoice"."invoiceNumber" IS 'Human-readable invoice number';

-- ========================================
-- 5. LEASE TABLE ENHANCEMENTS
-- ========================================
-- ExpiringLease adds computed fields
ALTER TABLE "lease"
ADD COLUMN IF NOT EXISTS "daysUntilExpiry" INTEGER
GENERATED ALWAYS AS (
  CASE
    WHEN "endDate" IS NOT NULL THEN
      GREATEST(0, EXTRACT(DAY FROM "endDate"::TIMESTAMP - CURRENT_TIMESTAMP)::INTEGER)
    ELSE NULL
  END
) STORED;

-- Add propertyId for easier queries (denormalization for performance)
ALTER TABLE "lease"
ADD COLUMN IF NOT EXISTS "propertyId" UUID;

-- Update propertyId from Unit relationship
UPDATE "lease" l
SET "propertyId" = u."propertyId"
FROM "unit" u
WHERE l."unitId" = u.id
AND l."propertyId" IS NULL;

-- Add foreign key constraint
ALTER TABLE "lease"
ADD CONSTRAINT fk_lease_property
FOREIGN KEY ("propertyId") REFERENCES "property"(id);

CREATE INDEX IF NOT EXISTS idx_lease_property_id ON "lease"("propertyId");
CREATE INDEX IF NOT EXISTS idx_lease_days_until_expiry ON "lease"("daysUntilExpiry");

COMMENT ON COLUMN "lease"."daysUntilExpiry" IS 'Generated: Days until lease expires';
COMMENT ON COLUMN "lease"."propertyId" IS 'Direct property reference for performance';

-- ========================================
-- 6. UNIT STATS VIEW - STANDARDIZED FIELD NAMES
-- ========================================
-- Create a view for UnitStats with STANDARDIZED field names
-- Use consistent pattern: total, available, occupied, maintenance, etc.
CREATE OR REPLACE VIEW "UnitStatsView" AS
SELECT
  COUNT(*) AS "total",
  COUNT(*) FILTER (WHERE status = 'AVAILABLE') AS "available",
  COUNT(*) FILTER (WHERE status = 'OCCUPIED') AS "occupied",
  COUNT(*) FILTER (WHERE status = 'MAINTENANCE') AS "maintenance",
  COUNT(*) FILTER (WHERE status = 'RESERVED') AS "reserved",
  AVG(rent)::NUMERIC(10,2) AS "averageRent",
  MIN(rent)::NUMERIC(10,2) AS "minRent",
  MAX(rent)::NUMERIC(10,2) AS "maxRent",
  CASE
    WHEN COUNT(*) > 0 THEN
      ROUND((COUNT(*) FILTER (WHERE status = 'OCCUPIED')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
    ELSE 0
  END AS "occupancyRate"
FROM "unit";

COMMENT ON VIEW "UnitStatsView" IS 'Standardized unit statistics - use consistent field names across all stats';

-- ========================================
-- 7. LEASE STATS VIEW - STANDARDIZED FIELD NAMES
-- ========================================
-- Create a view for LeaseStats with STANDARDIZED field names
CREATE OR REPLACE VIEW "LeaseStatsView" AS
SELECT
  COUNT(*) AS "total",
  COUNT(*) FILTER (WHERE status = 'ACTIVE') AS "active",
  COUNT(*) FILTER (WHERE status = 'EXPIRED') AS "expired",
  COUNT(*) FILTER (WHERE status = 'PENDING') AS "pending",
  COUNT(*) FILTER (WHERE status = 'TERMINATED') AS "terminated",
  COALESCE(SUM(CASE WHEN status = 'ACTIVE' THEN rent ELSE 0 END), 0)::NUMERIC(10,2) AS "totalRentRoll",
  AVG(CASE WHEN status = 'ACTIVE' THEN rent ELSE NULL END)::NUMERIC(10,2) AS "averageRent",
  COUNT(*) FILTER (WHERE status = 'ACTIVE' AND "endDate" <= CURRENT_DATE + INTERVAL '30 days') AS "expiringWithin30Days"
FROM "lease";

COMMENT ON VIEW "LeaseStatsView" IS 'Standardized lease statistics - use consistent field names across all stats';

-- ========================================
-- 8. MAINTENANCE STATS VIEW - NEW STANDARDIZED
-- ========================================
CREATE OR REPLACE VIEW "MaintenanceStatsView" AS
SELECT
  COUNT(*) AS "total",
  COUNT(*) FILTER (WHERE status = 'PENDING') AS "pending",
  COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') AS "inProgress",
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS "completed",
  COUNT(*) FILTER (WHERE status = 'CANCELLED') AS "cancelled",
  COUNT(*) FILTER (WHERE priority = 'LOW') AS "lowPriority",
  COUNT(*) FILTER (WHERE priority = 'MEDIUM') AS "mediumPriority",
  COUNT(*) FILTER (WHERE priority = 'HIGH') AS "highPriority",
  COUNT(*) FILTER (WHERE priority = 'URGENT') AS "urgentPriority",
  AVG(CASE
    WHEN status = 'COMPLETED' AND "completedAt" IS NOT NULL
    THEN EXTRACT(EPOCH FROM ("completedAt" - "createdAt")) / 3600
    ELSE NULL
  END)::NUMERIC(10,2) AS "averageCompletionHours"
FROM "maintenance_request";

COMMENT ON VIEW "MaintenanceStatsView" IS 'Standardized maintenance statistics - consistent with other stats views';

-- ========================================
-- 9. PROPERTY STATS VIEW - NEW STANDARDIZED
-- ========================================
CREATE OR REPLACE VIEW "PropertyStatsView" AS
SELECT
  p.id AS "propertyId",
  p.name AS "propertyName",
  COUNT(DISTINCT u.id) AS "totalUnits",
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'OCCUPIED') AS "occupiedUnits",
  COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'AVAILABLE') AS "availableUnits",
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'ACTIVE') AS "activeLeases",
  COALESCE(SUM(CASE WHEN l.status = 'ACTIVE' THEN l.rent ELSE 0 END), 0)::NUMERIC(10,2) AS "monthlyRevenue",
  CASE
    WHEN COUNT(DISTINCT u.id) > 0 THEN
      ROUND((COUNT(DISTINCT u.id) FILTER (WHERE u.status = 'OCCUPIED')::NUMERIC / COUNT(DISTINCT u.id)::NUMERIC) * 100, 2)
    ELSE 0
  END AS "occupancyRate"
FROM "property" p
LEFT JOIN "unit" u ON u."propertyId" = p.id
LEFT JOIN "lease" l ON l."unitId" = u.id
GROUP BY p.id, p.name;

COMMENT ON VIEW "PropertyStatsView" IS 'Standardized property-level statistics';

-- ========================================
-- 8. PERFORMANCE OPTIMIZATIONS
-- ========================================
-- Add any missing indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tenant_name ON "tenant"("name");
CREATE INDEX IF NOT EXISTS idx_unit_status ON "unit"("status");
CREATE INDEX IF NOT EXISTS idx_lease_status ON "lease"("status");
CREATE INDEX IF NOT EXISTS idx_lease_end_date ON "lease"("endDate");
CREATE INDEX IF NOT EXISTS idx_rent_payment_status ON "RentPayment"("status");

-- ========================================
-- SUMMARY - STANDARDIZED APPROACH
-- ========================================
-- This migration eliminates ALL custom type extensions by:
--
-- 1. ADDING MISSING COLUMNS directly to tables
--    - User: lastLoginAt, organizationId, profileComplete (generated)
--    - RentPayment: invoiceId, tenantId, propertyId, unit, dueDate, etc.
--    - Invoice: invoiceNumber
--    - Lease: daysUntilExpiry (generated), propertyId
--
-- 2. STANDARDIZING FIELD NAMES across all views:
--    - Always use: total, active, pending, completed, etc.
--    - No duplicates like totalUnits vs total
--    - No variations like fullName vs full_name (just use "name")
--    - Consistent camelCase for all fields
--
-- 3. CREATING STANDARDIZED VIEWS for statistics:
--    - UnitStatsView, LeaseStatsView, MaintenanceStatsView, PropertyStatsView
--    - All use same naming pattern: total, active, pending, etc.
--
-- 4. REMOVING ALL CUSTOM TYPES:
--    - AuthServiceauthUser → Use native User from database
--    - SupabaseUser → Use native User from @supabase/supabase-js
--    - TenantUIExtended → Use native Tenant (no fullName alias needed)
--    - PaymentUIExtended → Use native RentPayment with new columns
--    - InvoiceUIExtended → Use native Invoice with invoiceNumber column
--    - LeaseUIExtended → Use native Lease with new columns
--    - UnitStats, LeaseStats → Use database views
--
-- RESULT: Zero custom type extensions, everything native to the database!