-- CRIT-04 filter-audit completeness (Phase 25 review cycle 2). Final same-class
-- function: get_lead_paint_compliance_report counted soft-deleted (inactive)
-- leases in every compliance aggregate (it scans FROM public.leases with no
-- status filter). Scope the report to non-deleted leases with a single base
-- predicate. This function is NOT authenticated-callable (service_role/admin
-- report, EXECUTE revoked in v3.0), so a soft-deleted lease could not leak
-- through the app — fixed here purely for class-completeness (P3).
-- search_path stays '' (empty); fully-qualified names preserved; only the base
-- WHERE predicate is added.
CREATE OR REPLACE FUNCTION public.get_lead_paint_compliance_report()
 RETURNS TABLE(total_pre_1978_leases bigint, compliant_leases bigint, non_compliant_leases bigint, compliance_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE property_built_before_1978 = true) as total_pre_1978_leases,
    COUNT(*) FILTER (WHERE property_built_before_1978 = true AND lead_paint_disclosure_acknowledged = true) as compliant_leases,
    COUNT(*) FILTER (WHERE property_built_before_1978 = true AND (lead_paint_disclosure_acknowledged = false OR lead_paint_disclosure_acknowledged IS NULL)) as non_compliant_leases,
    ROUND(
      COUNT(*) FILTER (WHERE property_built_before_1978 = true AND lead_paint_disclosure_acknowledged = true)::numeric /
      NULLIF(COUNT(*) FILTER (WHERE property_built_before_1978 = true), 0) * 100,
      2
    ) as compliance_percentage
  FROM public.leases
  WHERE lease_status <> 'inactive';
END;
$function$;
