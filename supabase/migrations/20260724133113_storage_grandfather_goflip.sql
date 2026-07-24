-- METER-04 GO-FLIP: grandfather snapshot + storage enforcement enable.
--
-- THE METER-04 pre-flip grandfather gate (mirrors Phase 53's backlog-clear go-live).
-- Ordered so enforcement physically cannot block anyone who was already over quota:
--   (1) Stamp users.storage_grandfathered_at = now() for EVERY non-Max owner whose
--       CURRENT usage is at/over their plan quota (full exemption, D-04) — they keep
--       read/download/delete AND upload; enforcement applies only to owners who cross
--       the quota AFTER this flip.
--   (2) Flip app_config.storage_enforcement_enabled = 'true' as the LAST statement,
--       so the BEFORE INSERT guard (enforce_storage_quota, 20260724041621) stops being
--       a no-op only after the snapshot is taken.
--
-- Applied via the blocking human-verify checkpoint (owner-approved). The over-quota
-- population REPORT run at the checkpoint (MCP execute_sql) returned ZERO rows — no
-- owner is currently at/over quota (top owner ~35 MB vs the 1 GB minimum), so the
-- snapshot below stamps 0 grandfathers and the flip activates enforcement cleanly
-- with no retroactive lockout. Reversible: set the flag 'false' to disable.
--
-- Report query (the checkpoint decision input):
--   select u.id, lower(coalesce(u.subscription_plan,'')) as plan,
--          public.get_owner_storage_usage(u.id) as used_bytes,
--          public.get_owner_storage_limit_gb(u.id)::bigint*1024*1024*1024 as limit_bytes
--   from public.users u
--   where public.get_owner_storage_limit_gb(u.id) >= 0
--     and public.get_owner_storage_usage(u.id) >= public.get_owner_storage_limit_gb(u.id)::bigint*1024*1024*1024
--   order by used_bytes desc;

-- (1) Grandfather snapshot — full exemption for existing over-quota owners (skips
--     Max, whose limit is -1; skips already-grandfathered). Idempotent.
update public.users u
set storage_grandfathered_at = now()
where u.storage_grandfathered_at is null
  and public.get_owner_storage_limit_gb(u.id) >= 0
  and public.get_owner_storage_usage(u.id)
      >= public.get_owner_storage_limit_gb(u.id)::bigint * 1024 * 1024 * 1024;

-- (2) LAST statement: flip storage enforcement ON.
update public.app_config
set value = 'true'
where key = 'storage_enforcement_enabled';
