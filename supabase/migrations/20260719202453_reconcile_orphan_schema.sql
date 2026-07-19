-- Migration: reconcile orphan schema (CLEAN-01 / CLEAN-02)
-- Purpose: Idempotently drop demolished-feature schema objects so the repo
--   migration history reconciles with prod. These are VERIFY-THEN-RECONCILE
--   drops, not substantive data-loss operations:
--     - payout_events, get_payout_timing_stats(), get_autopay_health(uuid) came
--       from the Stripe-Connect "2-day payout" launch-readiness instrumentation
--       (20260413120000) which was NEVER applied to prod. TenantFlow does not
--       facilitate rent payments or run Stripe Connect (CLAUDE.md), so the
--       autopay/payout SLA feature was demolished before launch.
--     - leases.docuseal_document_url (20260504015457) is a DocuSeal remnant;
--       e-signature was migrated to the built-in token-based flow
--       (20260617142623), so the column is orphaned.
--   Prod introspection (MCP execute_sql, 2026-07-19) confirmed ALL FOUR objects
--   are already ABSENT in prod. Every statement below uses `if exists` so it is
--   a harmless no-op whether the object is present or absent — the migration
--   only reconciles repo history with prod; it never destroys live data.
--   payout_events never held a row, so no archive table is created (plain drop).
-- Affected: public.payout_events, public.get_payout_timing_stats(),
--   public.get_autopay_health(uuid), public.leases.docuseal_document_url
-- Requirements: CLEAN-01, CLEAN-02
-- Threats: T-52-12 (config drift) — accepted; idempotent no-ops reconcile only.

-- CLEAN-01: drop the payout_events table (cascade removes its trigger, indexes,
-- and RLS policy). Zero rows ever — plain drop, no archive.
drop table if exists public.payout_events cascade;

-- CLEAN-01: drop the two Stripe-Connect payout aggregate functions.
-- get_payout_timing_stats() is zero-arg; get_autopay_health takes (uuid).
drop function if exists public.get_payout_timing_stats() cascade;
drop function if exists public.get_autopay_health(uuid) cascade;

-- CLEAN-02: drop the orphaned DocuSeal audit-URL column from leases.
alter table public.leases drop column if exists docuseal_document_url;
