-- =============================================================================
-- Migration: Add 'assigned' and 'needs_reassignment' to maintenance status constraint
-- Purpose: Support vendor assignment flow — new status transitions required by use-vendor.ts
-- Affected tables: maintenance_requests (status CHECK constraint)
-- Special considerations:
--   - Existing statuses (open, in_progress, completed, cancelled, on_hold) are preserved
--   - 'assigned' represents a maintenance request with a vendor actively assigned
--   - 'needs_reassignment' represents a request where the vendor was unassigned,
--     preserving audit trail (does NOT revert to 'open')
--   - No ENUM type used — text + CHECK constraint per CLAUDE.md policy
-- =============================================================================

-- Step 1: Drop the existing status check constraint so we can expand the allowed values.
-- The current constraint only permits: open, in_progress, completed, cancelled, on_hold
-- We must drop it before adding the replacement with the extended value set.
alter table public.maintenance_requests
  drop constraint if exists maintenance_requests_status_check;

-- Step 2: Add the new status check constraint with the two additional vendor-workflow values.
-- Full set after migration:
--   open              — request submitted, awaiting triage
--   assigned          — vendor has been assigned to the request
--   in_progress       — work has actively started
--   needs_reassignment — vendor was unassigned; request needs a new vendor (NOT reverting to 'open')
--   completed         — work is finished
--   cancelled         — request cancelled before completion
--   on_hold           — request paused (waiting on parts, approval, etc.)
alter table public.maintenance_requests
  add constraint maintenance_requests_status_check
  check (status in (
    'open',
    'assigned',
    'in_progress',
    'needs_reassignment',
    'completed',
    'cancelled',
    'on_hold'
  ));

-- Step 3: Update the constraint comment to reflect the expanded value set.
comment on constraint maintenance_requests_status_check on public.maintenance_requests is
  'Valid values: open, assigned, in_progress, needs_reassignment, completed, cancelled, on_hold';
