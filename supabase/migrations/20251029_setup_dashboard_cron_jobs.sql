-- Dashboard Stats Cron Jobs
-- Automated snapshot creation and maintenance using pg_cron
-- Requires pg_cron extension to be enabled

-- Note: pg_cron must be enabled in Supabase dashboard or via:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily snapshot at midnight UTC
-- Captures current dashboard stats for all users
SELECT cron.schedule(
  'daily-dashboard-snapshot',
  '0 0 * * *', -- Every day at midnight UTC
  $$SELECT create_dashboard_stats_snapshot();$$
);

-- Weekly cleanup at 2 AM UTC on Sundays
-- Removes old daily snapshots beyond 2-year retention policy
SELECT cron.schedule(
  'weekly-dashboard-cleanup',
  '0 2 * * 0', -- Every Sunday at 2 AM UTC
  $$SELECT cleanup_dashboard_history();$$
);

-- Hourly materialized view refresh during business hours (9 AM - 5 PM UTC)
-- Ensures dashboard data is fresh without constant refresh overhead
-- Note: Ends at 5 PM to avoid overlap with off-hours refresh at 6 PM
SELECT cron.schedule(
  'hourly-dashboard-refresh',
  '0 9-17 * * *', -- Every hour from 9 AM to 5 PM UTC
  $$SELECT refresh_dashboard_stats_mv();$$
);

-- Off-hours refresh (every 4 hours during 6 PM - 9 AM UTC)
-- Reduces refresh frequency during low-traffic periods
SELECT cron.schedule(
  'off-hours-dashboard-refresh',
  '0 18,22,2,6 * * *', -- At 6 PM, 10 PM, 2 AM, 6 AM UTC
  $$SELECT refresh_dashboard_stats_mv();$$
);

-- View scheduled jobs
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE command LIKE '%dashboard%'
ORDER BY jobid;

COMMENT ON EXTENSION pg_cron IS 
'Automated job scheduler for dashboard snapshots and materialized view refresh.';
