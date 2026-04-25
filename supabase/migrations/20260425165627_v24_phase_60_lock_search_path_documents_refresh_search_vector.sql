-- v2.4 Phase 60 cycle-5 audit fix: lock search_path on
-- public.documents_refresh_search_vector() to match project convention
-- (see 20251231065044_fix_function_search_paths.sql,
-- 20251231073922_fix_all_function_search_paths.sql,
-- 20260306120000_consolidate_trigger_functions.sql).
--
-- Cycle-5 audit caught that the function shipped without the SET clause,
-- creating a fresh `function_search_path_mutable` advisor warning. The
-- function is SECURITY INVOKER (not DEFINER), so the practical exploit
-- surface is narrow, but the divergence from project policy must be
-- closed.

alter function public.documents_refresh_search_vector() set search_path = public;
