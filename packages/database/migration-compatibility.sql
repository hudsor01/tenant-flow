-- Migration Compatibility Framework for Zero-Downtime Deployments
-- Implements backwards compatibility for 2 versions following Apple's engineering principles
-- Created: 2025-01-16

-- =====================================================
-- MIGRATION VERSION TRACKING
-- =====================================================

-- Table to track migration compatibility
CREATE TABLE IF NOT EXISTS migration_compatibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    version_introduced VARCHAR(50) NOT NULL,
    compatibility_versions TEXT[] NOT NULL, -- Array of compatible versions
    breaking_change BOOLEAN DEFAULT FALSE,
    rollback_script TEXT,
    forward_script TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_migration_compatibility_version
    ON migration_compatibility(version_introduced);
CREATE INDEX IF NOT EXISTS idx_migration_compatibility_breaking
    ON migration_compatibility(breaking_change);

-- =====================================================
-- SCHEMA VERSIONING FUNCTIONS
-- =====================================================

-- Function to check if migration is compatible with current system
CREATE OR REPLACE FUNCTION is_migration_compatible(
    p_migration_name VARCHAR(255),
    p_current_version VARCHAR(50)
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_compatibility_versions TEXT[];
    v_is_compatible BOOLEAN := FALSE;
BEGIN
    -- Get compatibility versions for the migration
    SELECT compatibility_versions
    INTO v_compatibility_versions
    FROM migration_compatibility
    WHERE migration_name = p_migration_name;

    -- If migration not found, assume compatible (new migration)
    IF NOT FOUND THEN
        RETURN TRUE;
    END IF;

    -- Check if current version is in compatibility list
    SELECT p_current_version = ANY(v_compatibility_versions) INTO v_is_compatible;

    RETURN COALESCE(v_is_compatible, FALSE);
END;
$$;

-- Function to register a new migration with compatibility info
CREATE OR REPLACE FUNCTION register_migration(
    p_migration_name VARCHAR(255),
    p_version_introduced VARCHAR(50),
    p_compatibility_versions TEXT[],
    p_breaking_change BOOLEAN DEFAULT FALSE,
    p_rollback_script TEXT DEFAULT NULL,
    p_forward_script TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO migration_compatibility (
        migration_name,
        version_introduced,
        compatibility_versions,
        breaking_change,
        rollback_script,
        forward_script
    ) VALUES (
        p_migration_name,
        p_version_introduced,
        p_compatibility_versions,
        p_breaking_change,
        p_rollback_script,
        p_forward_script
    )
    ON CONFLICT (migration_name) DO UPDATE SET
        version_introduced = EXCLUDED.version_introduced,
        compatibility_versions = EXCLUDED.compatibility_versions,
        breaking_change = EXCLUDED.breaking_change,
        rollback_script = EXCLUDED.rollback_script,
        forward_script = EXCLUDED.forward_script,
        updated_at = NOW();
END;
$$;

-- =====================================================
-- BACKWARDS COMPATIBLE COLUMN CHANGES
-- =====================================================

-- Function to add column with backwards compatibility
CREATE OR REPLACE FUNCTION add_column_compatible(
    p_table_name TEXT,
    p_column_name TEXT,
    p_column_type TEXT,
    p_default_value TEXT DEFAULT NULL,
    p_not_null BOOLEAN DEFAULT FALSE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sql TEXT;
    v_column_exists BOOLEAN;
BEGIN
    -- Check if column already exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = p_table_name
        AND column_name = p_column_name
    ) INTO v_column_exists;

    -- Only add if it doesn't exist
    IF NOT v_column_exists THEN
        v_sql := format('ALTER TABLE %I ADD COLUMN %I %s', p_table_name, p_column_name, p_column_type);

        -- Add default value if specified
        IF p_default_value IS NOT NULL THEN
            v_sql := v_sql || format(' DEFAULT %s', p_default_value);
        END IF;

        -- Add NOT NULL constraint if specified (only safe with default)
        IF p_not_null AND p_default_value IS NOT NULL THEN
            v_sql := v_sql || ' NOT NULL';
        END IF;

        EXECUTE v_sql;

        RAISE NOTICE 'Column %.% added successfully', p_table_name, p_column_name;
    ELSE
        RAISE NOTICE 'Column %.% already exists, skipping', p_table_name, p_column_name;
    END IF;
END;
$$;

-- Function to drop column with safety checks
CREATE OR REPLACE FUNCTION drop_column_compatible(
    p_table_name TEXT,
    p_column_name TEXT,
    p_force BOOLEAN DEFAULT FALSE
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_column_exists BOOLEAN;
BEGIN
    -- Check if column exists
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = p_table_name
        AND column_name = p_column_name
    ) INTO v_column_exists;

    IF v_column_exists THEN
        IF p_force THEN
            EXECUTE format('ALTER TABLE %I DROP COLUMN %I', p_table_name, p_column_name);
            RAISE NOTICE 'Column %.% dropped', p_table_name, p_column_name;
        ELSE
            RAISE NOTICE 'Column %.% exists but force=false, skipping for safety', p_table_name, p_column_name;
        END IF;
    ELSE
        RAISE NOTICE 'Column %.% does not exist, skipping', p_table_name, p_column_name;
    END IF;
END;
$$;

-- =====================================================
-- FUNCTION VERSIONING FOR ZERO DOWNTIME
-- =====================================================

-- Function to create versioned function with fallback
CREATE OR REPLACE FUNCTION create_function_version(
    p_function_name TEXT,
    p_version INTEGER,
    p_function_body TEXT,
    p_parameters TEXT DEFAULT '',
    p_return_type TEXT DEFAULT 'VOID'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_versioned_name TEXT;
    v_sql TEXT;
BEGIN
    v_versioned_name := format('%s_v%s', p_function_name, p_version);

    -- Create versioned function
    v_sql := format(
        'CREATE OR REPLACE FUNCTION %s(%s) RETURNS %s AS $func$ %s $func$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public',
        v_versioned_name,
        p_parameters,
        p_return_type,
        p_function_body
    );

    EXECUTE v_sql;

    -- Create or update main function to point to latest version
    v_sql := format(
        'CREATE OR REPLACE FUNCTION %s(%s) RETURNS %s AS $main$ BEGIN RETURN %s(%s); END; $main$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public',
        p_function_name,
        p_parameters,
        p_return_type,
        v_versioned_name,
        CASE WHEN p_parameters = '' THEN '' ELSE
            string_agg(split_part(unnest(string_to_array(p_parameters, ',')), ' ', 1), ', ')
        END
    );

    EXECUTE v_sql;

    RAISE NOTICE 'Function % version % created and set as current', p_function_name, p_version;
END;
$$;

-- =====================================================
-- INDEX MANAGEMENT FOR ZERO DOWNTIME
-- =====================================================

-- Function to create index concurrently with error handling
CREATE OR REPLACE FUNCTION create_index_safe(
    p_index_name TEXT,
    p_table_name TEXT,
    p_columns TEXT,
    p_unique BOOLEAN DEFAULT FALSE,
    p_where_clause TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sql TEXT;
    v_index_exists BOOLEAN;
BEGIN
    -- Check if index already exists
    SELECT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = p_index_name
    ) INTO v_index_exists;

    IF v_index_exists THEN
        RAISE NOTICE 'Index % already exists, skipping', p_index_name;
        RETURN;
    END IF;

    -- Build CREATE INDEX CONCURRENTLY statement
    v_sql := 'CREATE';

    IF p_unique THEN
        v_sql := v_sql || ' UNIQUE';
    END IF;

    v_sql := v_sql || format(' INDEX CONCURRENTLY %I ON %I (%s)', p_index_name, p_table_name, p_columns);

    IF p_where_clause IS NOT NULL THEN
        v_sql := v_sql || ' WHERE ' || p_where_clause;
    END IF;

    EXECUTE v_sql;

    RAISE NOTICE 'Index % created successfully', p_index_name;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create index %: %', p_index_name, SQLERRM;
        -- In production, you might want to log this to a monitoring table
END;
$$;

-- =====================================================
-- MIGRATION VALIDATION
-- =====================================================

-- Function to validate system compatibility before applying migrations
CREATE OR REPLACE FUNCTION validate_migration_compatibility(
    p_target_version VARCHAR(50)
) RETURNS TABLE (
    compatible BOOLEAN,
    blocking_migrations TEXT[],
    warnings TEXT[],
    recommendations TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_compatible BOOLEAN := TRUE;
    v_blocking_migrations TEXT[] := '{}';
    v_warnings TEXT[] := '{}';
    v_recommendations TEXT[] := '{}';
    v_migration RECORD;
BEGIN
    -- Check all migrations for compatibility
    FOR v_migration IN
        SELECT migration_name, breaking_change, compatibility_versions
        FROM migration_compatibility
        WHERE breaking_change = TRUE
    LOOP
        -- Check if target version is compatible
        IF NOT (p_target_version = ANY(v_migration.compatibility_versions)) THEN
            v_compatible := FALSE;
            v_blocking_migrations := array_append(v_blocking_migrations, v_migration.migration_name);
        END IF;
    END LOOP;

    -- Add warnings for deprecated features
    IF array_length(v_blocking_migrations, 1) > 0 THEN
        v_warnings := array_append(v_warnings,
            'Breaking changes detected that may affect deployment');
    END IF;

    -- Add recommendations
    v_recommendations := array_append(v_recommendations,
        'Test all migrations in staging environment before production deployment');
    v_recommendations := array_append(v_recommendations,
        'Ensure rollback scripts are available for all breaking changes');

    RETURN QUERY SELECT v_compatible, v_blocking_migrations, v_warnings, v_recommendations;
END;
$$;

-- =====================================================
-- INITIAL COMPATIBILITY REGISTRATIONS
-- =====================================================

-- Register this migration framework itself
SELECT register_migration(
    'migration_compatibility_framework',
    '1.0.0',
    ARRAY['1.0.0', '1.1.0', '1.2.0'], -- Compatible with next 2 minor versions
    FALSE, -- Not a breaking change
    NULL, -- No rollback script needed
    NULL -- No forward script needed
);

-- Grant permissions for the framework
GRANT EXECUTE ON FUNCTION is_migration_compatible(VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_migration_compatibility(VARCHAR) TO authenticated;
GRANT SELECT ON migration_compatibility TO authenticated;

COMMENT ON TABLE migration_compatibility IS 'Tracks migration compatibility for zero-downtime deployments';
COMMENT ON FUNCTION is_migration_compatible IS 'Checks if a migration is compatible with current system version';
COMMENT ON FUNCTION register_migration IS 'Registers a new migration with compatibility information';
COMMENT ON FUNCTION validate_migration_compatibility IS 'Validates system compatibility before applying migrations';