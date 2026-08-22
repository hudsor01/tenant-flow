-- =============================================================================
-- Phase 66.1 review follow-up -- correct two LIVE database comments that assert
-- things the code no longer does, or never did.
--
-- Comments are not cosmetic in this project. `_shared/errors.ts` carried a
-- comment claiming it "handles missing DSN gracefully" over a captureException
-- call that transmitted nothing, and that sentence is the reason sixteen edge
-- functions went unmonitored for months: it answered the question a reader would
-- otherwise have asked. Both comments below are the same failure mode, and both
-- are readable straight out of production via obj_description / col_description,
-- so an operator or auditor querying the database is told something untrue BY
-- the database.
--
-- Corrected here rather than by editing the applied migrations that created
-- them: migrations are append-only, and rewriting one would leave the repo
-- describing a state production does not have.
-- =============================================================================

-- 1. rental_application_links.submission_count
--    Created by 20260807003342 when the limiter in front of this cap really did
--    fail open. Phase 66.1 moved that limiter onto public.check_rate_limit and
--    deleted the fail-open branch, so "fails open by design" is now false. The
--    cap remains the innermost bound; what changed is that the outer layer no
--    longer disappears exactly when the database is in trouble.
comment on column public.rental_application_links.submission_count is
  'Number of applications submitted through this link. The cap check in submit_rental_application reads and increments this under the token row lock, making it the innermost fail-closed abuse control (D-04a). Phase 66.1 replaced the fail-open Upstash limiter in front of it with public.check_rate_limit, which also fails closed; that limiter is the outer layer, not the gate.';

-- 2. rate_limit_counters
--    The original comment justified storing RAW client IPs unhashed on two
--    stated preconditions, one of which was never implemented: "a bounded life
--    of at most two windows". Nothing enforces that. `expires_at` is an inert
--    marker; the only deletion path is cleanup_rate_limit_counters(), and the
--    only caller of that is the pg_cron job at 25 3 * * *. So a row created at
--    03:26 on a 60-second window is logically dead at 03:28 and is physically
--    deleted almost twenty-four hours later.
--
--    The retention bound is stated truthfully here rather than quietly dropped,
--    because it is load-bearing: it is half the argument for not hashing the
--    addresses. Tightening the sweep to hourly would make the original claim
--    close to true and is the better fix; it is deliberately NOT done in a
--    review pass, because changing a scheduled job's cadence in production is a
--    design decision, not a correction.
comment on table public.rate_limit_counters is
  'RATE-01 sliding-window rate-limit counters, one row per (bucket_key, window_index). Written only by public.check_rate_limit(), swept by public.cleanup_rate_limit_counters(). service_role-only, with no archive copy anywhere. bucket_key holds RAW client IPs on the IP-keyed surfaces. Rows are logically dead two windows after creation, but the only deletion path is the daily pg_cron sweep at 03:25 UTC, so actual retention is up to ~24h -- NOT the two windows an earlier version of this comment claimed. Anyone relying on the retention bound as a privacy argument must either tighten the sweep or hash the key. fillfactor 70 with request_count deliberately unindexed so increments stay HOT.';
