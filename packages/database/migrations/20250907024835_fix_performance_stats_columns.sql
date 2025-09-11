-- Fix performance stats function with correct PostgreSQL column names

CREATE OR REPLACE FUNCTION get_database_performance_stats()
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'index_usage', (
        SELECT json_agg(
          json_build_object(
            'schemaname', schemaname,
            'tablename', relname,
            'indexname', indexrelname,
            'idx_scan', idx_scan,
            'idx_tup_read', idx_tup_read,
            'idx_tup_fetch', idx_tup_fetch
          )
        )
        FROM pg_stat_user_indexes 
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 20
      ),
      'table_stats', (
        SELECT json_agg(
          json_build_object(
            'schemaname', schemaname,
            'tablename', relname,
            'seq_scan', seq_scan,
            'seq_tup_read', seq_tup_read,
            'idx_scan', idx_scan,
            'idx_tup_fetch', idx_tup_fetch,
            'n_tup_ins', n_tup_ins,
            'n_tup_upd', n_tup_upd,
            'n_tup_del', n_tup_del
          )
        )
        FROM pg_stat_user_tables 
        WHERE schemaname = 'public'
        ORDER BY seq_scan + idx_scan DESC
        LIMIT 10
      ),
      'cache_hit_ratio', (
        SELECT CASE 
          WHEN (sum(heap_blks_hit) + sum(heap_blks_read)) = 0 THEN 0
          ELSE ROUND(
            (sum(heap_blks_hit)::float / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 
            2
          )
        END
        FROM pg_statio_user_tables
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;