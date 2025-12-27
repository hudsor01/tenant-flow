-- Fix the monitoring function (had column ambiguity issue)

CREATE OR REPLACE FUNCTION public.get_slow_rls_queries(
  min_avg_time_ms numeric DEFAULT 100
)
RETURNS TABLE (
  query_preview text,
  call_count bigint,
  mean_time_ms numeric,
  max_time_ms numeric,
  total_time_ms numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    substring(pss.query, 1, 100) as query_preview,
    pss.calls as call_count,
    round(pss.mean_exec_time::numeric, 2) as mean_time_ms,
    round(pss.max_exec_time::numeric, 2) as max_time_ms,
    round(pss.total_exec_time::numeric, 2) as total_time_ms
  FROM pg_stat_statements pss
  WHERE (pss.query LIKE '%get_current_%' OR pss.query LIKE '%auth.uid%')
    AND pss.mean_exec_time >= min_avg_time_ms
  ORDER BY pss.mean_exec_time DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_slow_rls_queries IS
'Returns slow queries related to RLS policies for performance monitoring';
