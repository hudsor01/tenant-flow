-- ========================================
-- TenantFlow MVP Seed Data Script
-- ========================================
-- Purpose: Populate database with realistic test data for MVP demonstration
-- Run: psql <connection-string> -f seed.sql

-- ========================================
-- STEP 1: Get existing user ID
-- ========================================
DO $$
DECLARE
    v_user_id TEXT;
    v_property_1_id TEXT;
    v_property_2_id TEXT;
    v_property_3_id TEXT;
    v_unit_ids TEXT[];
    v_tenant_ids TEXT[];
    v_lease_ids TEXT[];
BEGIN
    -- Get the first user from the User table
    SELECT id INTO v_user_id FROM "User" LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in database. Please create a user first.';
    END IF;

    RAISE NOTICE 'Using user ID: %', v_user_id;

    -- ========================================
    -- STEP 2: Create 3 Properties
    -- ========================================

    -- Property 1: Luxury Apartment Complex
    INSERT INTO "Property" (
        "name",
        "address",
        "city",
        "state",
        "zipCode",
        "propertyType",
        "ownerId",
        "status",
        "description",
        "createdAt",
        "updatedAt"
    ) VALUES (
        'Sunset Towers',
        '123 Ocean Avenue',
        'Santa Monica',
        'CA',
        '90401',
        'APARTMENT',
        v_user_id,
        'ACTIVE',
        'Luxury waterfront apartment complex with ocean views',
        NOW() - INTERVAL '180 days',
        NOW() - INTERVAL '180 days'
    ) RETURNING id INTO v_property_1_id;

    -- Property 2: Modern Townhomes
    INSERT INTO "Property" (
        "name",
        "address",
        "city",
        "state",
        "zipCode",
        "propertyType",
        "ownerId",
        "status",
        "description",
        "createdAt",
        "updatedAt"
    ) VALUES (
        'Harbor View Residences',
        '456 Marina Boulevard',
        'San Diego',
        'CA',
        '92101',
        'TOWNHOUSE',
        v_user_id,
        'ACTIVE',
        'Modern townhomes near the waterfront',
        NOW() - INTERVAL '150 days',
        NOW() - INTERVAL '150 days'
    ) RETURNING id INTO v_property_2_id;

    -- Property 3: Downtown Condos
    INSERT INTO "Property" (
        "name",
        "address",
        "city",
        "state",
        "zipCode",
        "propertyType",
        "ownerId",
        "status",
        "description",
        "createdAt",
        "updatedAt"
    ) VALUES (
        'Metropolitan Plaza',
        '789 Downtown Street',
        'Los Angeles',
        'CA',
        '90012',
        'CONDO',
        v_user_id,
        'ACTIVE',
        'High-rise condo building in downtown LA',
        NOW() - INTERVAL '200 days',
        NOW() - INTERVAL '200 days'
    ) RETURNING id INTO v_property_3_id;

    RAISE NOTICE 'Created 3 properties';

    -- ========================================
    -- STEP 3: Create 10 Units
    -- ========================================

    -- Sunset Towers Units (4 units)
    WITH inserted_units AS (
        INSERT INTO "Unit" (
            "propertyId",
            "unitNumber",
            "bedrooms",
            "bathrooms",
            "squareFeet",
            "rent",
            "status",
            "createdAt",
            "updatedAt"
        ) VALUES
        (v_property_1_id, '101', 2, 2, 1200, 3500, 'OCCUPIED', NOW() - INTERVAL '180 days', NOW() - INTERVAL '30 days'),
        (v_property_1_id, '102', 2, 2, 1200, 3500, 'OCCUPIED', NOW() - INTERVAL '180 days', NOW() - INTERVAL '30 days'),
        (v_property_1_id, '201', 3, 2.5, 1600, 4200, 'OCCUPIED', NOW() - INTERVAL '180 days', NOW() - INTERVAL '60 days'),
        (v_property_1_id, '202', 3, 2.5, 1600, 4200, 'VACANT', NOW() - INTERVAL '180 days', NOW() - INTERVAL '5 days')
        RETURNING id
    )
    SELECT array_agg(id) INTO v_unit_ids FROM inserted_units;

    -- Harbor View Units (3 units)
    WITH inserted_units AS (
        INSERT INTO "Unit" (
            "propertyId",
            "unitNumber",
            "bedrooms",
            "bathrooms",
            "squareFeet",
            "rent",
            "status",
            "createdAt",
            "updatedAt"
        ) VALUES
        (v_property_2_id, 'A', 3, 2.5, 1800, 3800, 'OCCUPIED', NOW() - INTERVAL '150 days', NOW() - INTERVAL '45 days'),
        (v_property_2_id, 'B', 3, 2.5, 1800, 3800, 'OCCUPIED', NOW() - INTERVAL '150 days', NOW() - INTERVAL '45 days'),
        (v_property_2_id, 'C', 4, 3, 2200, 4500, 'MAINTENANCE', NOW() - INTERVAL '150 days', NOW() - INTERVAL '2 days')
        RETURNING id
    )
    SELECT v_unit_ids || array_agg(id) INTO v_unit_ids FROM inserted_units;

    -- Metropolitan Plaza Units (3 units)
    WITH inserted_units AS (
        INSERT INTO "Unit" (
            "propertyId",
            "unitNumber",
            "bedrooms",
            "bathrooms",
            "squareFeet",
            "rent",
            "status",
            "createdAt",
            "updatedAt"
        ) VALUES
        (v_property_3_id, '1501', 2, 2, 1400, 4000, 'OCCUPIED', NOW() - INTERVAL '200 days', NOW() - INTERVAL '90 days'),
        (v_property_3_id, '1502', 2, 2, 1400, 4000, 'OCCUPIED', NOW() - INTERVAL '200 days', NOW() - INTERVAL '90 days'),
        (v_property_3_id, '1601', 3, 2.5, 1800, 5000, 'VACANT', NOW() - INTERVAL '200 days', NOW() - INTERVAL '10 days')
        RETURNING id
    )
    SELECT v_unit_ids || array_agg(id) INTO v_unit_ids FROM inserted_units;

    RAISE NOTICE 'Created 10 units (6 occupied, 2 vacant, 1 maintenance)';

    -- ========================================
    -- STEP 4: Create 6 Tenants
    -- ========================================

    WITH inserted_tenants AS (
        INSERT INTO "Tenant" (
            "firstName",
            "lastName",
            "email",
            "phone",
            "userId",
            "createdAt",
            "updatedAt"
        ) VALUES
        ('Sarah', 'Johnson', 'sarah.johnson@email.com', '310-555-0101', v_user_id, NOW() - INTERVAL '150 days', NOW() - INTERVAL '150 days'),
        ('Michael', 'Chen', 'michael.chen@email.com', '310-555-0102', v_user_id, NOW() - INTERVAL '140 days', NOW() - INTERVAL '140 days'),
        ('Emily', 'Rodriguez', 'emily.rodriguez@email.com', '619-555-0103', v_user_id, NOW() - INTERVAL '130 days', NOW() - INTERVAL '130 days'),
        ('David', 'Kim', 'david.kim@email.com', '619-555-0104', v_user_id, NOW() - INTERVAL '120 days', NOW() - INTERVAL '120 days'),
        ('Jennifer', 'Martinez', 'jennifer.martinez@email.com', '213-555-0105', v_user_id, NOW() - INTERVAL '180 days', NOW() - INTERVAL '180 days'),
        ('Robert', 'Taylor', 'robert.taylor@email.com', '213-555-0106', v_user_id, NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days')
        RETURNING id
    )
    SELECT array_agg(id) INTO v_tenant_ids FROM inserted_tenants;

    RAISE NOTICE 'Created 6 tenants';

    -- ========================================
    -- STEP 5: Create 6 Active Leases
    -- ========================================

    WITH inserted_leases AS (
        INSERT INTO "Lease" (
            "propertyId",
            "unitId",
            "tenantId",
            "startDate",
            "endDate",
            "rentAmount",
            "securityDeposit",
            "status",
            "createdAt",
            "updatedAt"
        ) VALUES
        -- Sunset Towers Leases
        (v_property_1_id::uuid, v_unit_ids[1], v_tenant_ids[1], NOW() - INTERVAL '150 days', NOW() + INTERVAL '215 days', 3500, 7000, 'ACTIVE', NOW() - INTERVAL '150 days', NOW() - INTERVAL '30 days'),
        (v_property_1_id::uuid, v_unit_ids[2], v_tenant_ids[2], NOW() - INTERVAL '140 days', NOW() + INTERVAL '225 days', 3500, 7000, 'ACTIVE', NOW() - INTERVAL '140 days', NOW() - INTERVAL '30 days'),
        (v_property_1_id::uuid, v_unit_ids[3], v_tenant_ids[3], NOW() - INTERVAL '130 days', NOW() + INTERVAL '235 days', 4200, 8400, 'ACTIVE', NOW() - INTERVAL '130 days', NOW() - INTERVAL '60 days'),
        -- Harbor View Leases
        (v_property_2_id::uuid, v_unit_ids[5], v_tenant_ids[4], NOW() - INTERVAL '120 days', NOW() + INTERVAL '245 days', 3800, 7600, 'ACTIVE', NOW() - INTERVAL '120 days', NOW() - INTERVAL '45 days'),
        (v_property_2_id::uuid, v_unit_ids[6], v_tenant_ids[5], NOW() - INTERVAL '180 days', NOW() + INTERVAL '185 days', 3800, 7600, 'ACTIVE', NOW() - INTERVAL '180 days', NOW() - INTERVAL '45 days'),
        -- Metropolitan Plaza Leases
        (v_property_3_id::uuid, v_unit_ids[8], v_tenant_ids[6], NOW() - INTERVAL '90 days', NOW() + INTERVAL '275 days', 4000, 8000, 'ACTIVE', NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days')
        RETURNING id
    )
    SELECT array_agg(id) INTO v_lease_ids FROM inserted_leases;

    RAISE NOTICE 'Created 6 active leases';

    -- ========================================
    -- STEP 6: Create 3 Maintenance Requests
    -- ========================================

    INSERT INTO "MaintenanceRequest" (
        "unitId",
        "title",
        "description",
        "category",
        "priority",
        "status",
        "estimatedCost",
        "createdAt",
        "updatedAt"
    ) VALUES
    (v_unit_ids[7], 'HVAC System Repair', 'Air conditioning not cooling properly in unit C', 'HVAC', 'HIGH', 'IN_PROGRESS', 850, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
    (v_unit_ids[3], 'Leaking Faucet', 'Kitchen sink faucet has slow drip', 'PLUMBING', 'MEDIUM', 'OPEN', 150, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
    (v_unit_ids[1], 'Light Fixture Replacement', 'Bedroom ceiling light not working', 'ELECTRICAL', 'LOW', 'COMPLETED', 200, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days');

    RAISE NOTICE 'Created 3 maintenance requests';

    -- ========================================
    -- STEP 7: Create 10 Activity Log Entries
    -- ========================================

    INSERT INTO "Activity" (
        "userId",
        "entityType",
        "entityId",
        "action",
        "entityName",
        "createdAt"
    ) VALUES
    (v_user_id, 'property', v_property_1_id, 'created', 'Sunset Towers', NOW() - INTERVAL '180 days'),
    (v_user_id, 'property', v_property_2_id, 'created', 'Harbor View Residences', NOW() - INTERVAL '150 days'),
    (v_user_id, 'property', v_property_3_id, 'created', 'Metropolitan Plaza', NOW() - INTERVAL '200 days'),
    (v_user_id, 'tenant', v_tenant_ids[1], 'created', 'Sarah Johnson', NOW() - INTERVAL '150 days'),
    (v_user_id, 'tenant', v_tenant_ids[2], 'created', 'Michael Chen', NOW() - INTERVAL '140 days'),
    (v_user_id, 'lease', v_lease_ids[1], 'created', 'Unit 101 Lease', NOW() - INTERVAL '150 days'),
    (v_user_id, 'lease', v_lease_ids[2], 'created', 'Unit 102 Lease', NOW() - INTERVAL '140 days'),
    (v_user_id, 'maintenance', v_unit_ids[7], 'created', 'HVAC System Repair', NOW() - INTERVAL '2 days'),
    (v_user_id, 'maintenance', v_unit_ids[3], 'created', 'Leaking Faucet', NOW() - INTERVAL '5 days'),
    (v_user_id, 'unit', v_unit_ids[4], 'status_change', 'Unit 202', NOW() - INTERVAL '5 days');

    RAISE NOTICE 'Created 10 activity log entries';

    -- ========================================
    -- FINAL SUMMARY
    -- ========================================

    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEED DATA CREATED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Properties: 3';
    RAISE NOTICE 'Units: 10 (6 occupied, 2 vacant, 1 maintenance)';
    RAISE NOTICE 'Tenants: 6';
    RAISE NOTICE 'Leases: 6 active';
    RAISE NOTICE 'Maintenance Requests: 3 (1 open, 1 in progress, 1 completed)';
    RAISE NOTICE 'Activity Entries: 10';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Expected Dashboard Stats:';
    RAISE NOTICE '- Total Properties: 3';
    RAISE NOTICE '- Total Units: 10';
    RAISE NOTICE '- Occupancy Rate: 60%% (6/10 occupied)';
    RAISE NOTICE '- Total Monthly Rent: $38,000';
    RAISE NOTICE '- Active Tenants: 6';
    RAISE NOTICE '- Active Leases: 6';
    RAISE NOTICE '- Open Maintenance: 1';
    RAISE NOTICE '========================================';

END $$;