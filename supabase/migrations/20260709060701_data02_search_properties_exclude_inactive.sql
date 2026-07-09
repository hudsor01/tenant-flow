-- DATA-02 (tail): search_properties full-text search returned soft-deleted
-- (status='inactive') properties — it had no status filter at all, violating the
-- documented soft-delete convention (all property reads filter status <> 'inactive').
-- Add the filter so deleted properties never surface in search. CREATE OR REPLACE.
CREATE OR REPLACE FUNCTION public.search_properties(p_user_id uuid, p_search_term text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, address_line1 text, city text, state text, rank real)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.address_line1,
    p.city,
    p.state,
    ts_rank(p.search_vector, plainto_tsquery('english', p_search_term)) AS rank
  FROM properties p
  WHERE p.owner_user_id = p_user_id
    AND p.status <> 'inactive'
    AND p.search_vector @@ plainto_tsquery('english', p_search_term)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$function$;
