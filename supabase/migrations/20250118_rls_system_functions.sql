-- Migration: Add RPC functions for system table access
-- These functions provide controlled access to PostgreSQL system tables
-- Following Supabase best practices for complex queries

-- Function to check RLS status for a table
CREATE OR REPLACE FUNCTION public.check_table_rls(table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Validate input
    IF table_name IS NULL OR table_name = '' THEN
        RAISE EXCEPTION 'Table name is required';
    END IF;
    
    -- Query pg_tables for RLS status
    SELECT jsonb_build_object(
        'tablename', pt.tablename,
        'rowsecurity', COALESCE(pt.rowsecurity, false),
        'exists', pt.tablename IS NOT NULL
    )
    INTO result
    FROM pg_tables pt
    WHERE pt.schemaname = 'public'
    AND pt.tablename = table_name;
    
    -- Return empty object if table not found
    IF result IS NULL THEN
        result := jsonb_build_object(
            'tablename', table_name,
            'rowsecurity', false,
            'exists', false
        );
    END IF;
    
    RETURN result;
END;
$$;

-- Function to get policies for a table
CREATE OR REPLACE FUNCTION public.get_policies_for_table(table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Validate input
    IF table_name IS NULL OR table_name = '' THEN
        RAISE EXCEPTION 'Table name is required';
    END IF;
    
    -- Query pg_policies for table policies
    SELECT jsonb_agg(
        jsonb_build_object(
            'policyname', pp.policyname,
            'permissive', pp.permissive,
            'roles', pp.roles,
            'cmd', pp.cmd,
            'qual', pp.qual,
            'with_check', pp.with_check
        )
    )
    INTO result
    FROM pg_policies pp
    WHERE pp.schemaname = 'public'
    AND pp.tablename = table_name;
    
    -- Return empty array if no policies found
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Function to check multiple tables RLS status at once (more efficient)
CREATE OR REPLACE FUNCTION public.check_tables_rls(table_names text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Validate input
    IF table_names IS NULL OR array_length(table_names, 1) IS NULL THEN
        RETURN '[]'::jsonb;
    END IF;
    
    -- Query pg_tables for multiple tables
    SELECT jsonb_agg(
        jsonb_build_object(
            'tablename', pt.tablename,
            'rowsecurity', COALESCE(pt.rowsecurity, false),
            'exists', true
        )
    )
    INTO result
    FROM pg_tables pt
    WHERE pt.schemaname = 'public'
    AND pt.tablename = ANY(table_names);
    
    -- Return result or empty array
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_table_rls(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_rls(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_policies_for_table(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_policies_for_table(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_tables_rls(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_tables_rls(text[]) TO service_role;

-- Add function comments for documentation
COMMENT ON FUNCTION public.check_table_rls(text) IS 
'Checks if Row Level Security is enabled for a specific table in the public schema';

COMMENT ON FUNCTION public.get_policies_for_table(text) IS 
'Retrieves all RLS policies defined for a specific table in the public schema';

COMMENT ON FUNCTION public.check_tables_rls(text[]) IS 
'Efficiently checks RLS status for multiple tables at once';