-- Get full policy definitions for critical bottlenecks
\x

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN (
    'documents_select',
    'documents_update_owner',
    'documents_delete_owner',
    'payment_transactions_select',
    'payment_schedules_select',
    'rent_due_select'
  )
ORDER BY tablename, cmd;
