-- RLS Policy Bottleneck Analysis
-- Safe SQL script to analyze policy complexity and performance issues

-- 1. Count helper function calls in each policy
SELECT
  tablename,
  policyname,
  cmd,
  (length(qual) - length(replace(qual, 'get_current_owner_user_id', ''))) / length('get_current_owner_user_id') as owner_fn_calls,
  (length(qual) - length(replace(qual, 'get_current_tenant_id', ''))) / length('get_current_tenant_id') as tenant_fn_calls,
  (length(qual) - length(replace(qual, 'SELECT', ''))) / length('SELECT') as subquery_count,
  length(qual) as policy_size
FROM pg_policies
WHERE schemaname = 'public'
  AND qual IS NOT NULL
ORDER BY policy_size DESC
LIMIT 30;

-- 2. Identify policies with multiple OR clauses (potential performance issue)
SELECT
  tablename,
  policyname,
  (length(qual) - length(replace(qual, ' OR ', ''))) / 4 as or_count,
  length(qual) as policy_size
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '% OR %'
ORDER BY or_count DESC;

-- 3. Find policies with nested joins
SELECT
  tablename,
  policyname,
  cmd,
  (length(qual) - length(replace(qual, 'JOIN', ''))) / 4 as join_count
FROM pg_policies
WHERE schemaname = 'public'
  AND qual LIKE '%JOIN%'
ORDER BY join_count DESC;

-- 4. List all tables and their policy counts
SELECT
  tablename,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_policies,
  COUNT(*) as total_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY total_policies DESC;
