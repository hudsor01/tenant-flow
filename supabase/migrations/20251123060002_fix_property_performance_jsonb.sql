-- Fix JSONB/JSON type mismatch in get_property_performance_cached
-- Issue: Using json_agg with json_build_object but storing in JSONB and using JSONB literal '[]'::JSONB
-- Solution: Change to jsonb_agg and jsonb_build_object for consistency

CREATE OR REPLACE FUNCTION public.get_property_performance_cached(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'property_name', p.name,
      'property_id', p.id,
      'total_units', (SELECT COUNT(*) FROM units WHERE property_id = p.id),
      'occupied_units', (SELECT COUNT(*) FROM units WHERE property_id = p.id AND status = 'occupied'),
      'vacant_units', (SELECT COUNT(*) FROM units WHERE property_id = p.id AND status = 'available'),
      'occupancy_rate', COALESCE(
        ROUND(
          ((SELECT COUNT(*)::DECIMAL FROM units WHERE property_id = p.id AND status = 'occupied') /
           NULLIF((SELECT COUNT(*)::DECIMAL FROM units WHERE property_id = p.id), 0)) * 100,
          2
        ),
        0
      ),
      'annual_revenue', COALESCE(
        (SELECT SUM(rent_amount) * 12 FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = p.id) AND lease_status = 'active'),
        0
      ),
      'monthly_revenue', COALESCE(
        (SELECT SUM(rent_amount) FROM leases WHERE unit_id IN (SELECT id FROM units WHERE property_id = p.id) AND lease_status = 'active'),
        0
      ),
      'potential_revenue', COALESCE(
        (SELECT SUM(rent_amount) FROM units WHERE property_id = p.id),
        0
      ),
      'address', p.address_line1,
      'property_type', p.property_type,
      'status', CASE
        WHEN (SELECT COUNT(*) FROM units WHERE property_id = p.id) = 0 THEN 'NO_UNITS'
        WHEN (SELECT COUNT(*) FROM units WHERE property_id = p.id AND status = 'occupied') = 0 THEN 'VACANT'
        WHEN (SELECT COUNT(*) FROM units WHERE property_id = p.id AND status = 'occupied') = (SELECT COUNT(*) FROM units WHERE property_id = p.id) THEN 'FULL'
        ELSE 'PARTIAL'
      END
    )
  ), '[]'::JSONB) INTO v_result
  FROM properties p
  WHERE p.property_owner_id = p_user_id;

  RETURN v_result;
END;
$$;

-- Ensure permissions are maintained
GRANT EXECUTE ON FUNCTION public.get_property_performance_cached(UUID) TO authenticated;
