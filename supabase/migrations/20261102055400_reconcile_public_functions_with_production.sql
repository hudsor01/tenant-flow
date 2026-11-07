-- =============================================================================
-- Make the replayed chain's public functions production's, as read 2026-11-02
-- =============================================================================
-- WHY. Replayed from empty, the ledger did not reproduce production's public
-- functions. Against a read-only listing of production (SOURCE, below), the
-- chain through 20261005215446 differed in 34 bodies and 104 ACLs, created 10
-- functions production does not have, and lacked 2 that production has:
--   - Bodies: 33 differ in comments or whitespace only. set_updated_at()
--     differs in what it does: production's sets NEW.updated_at or
--     NEW._updated_at, whichever column the table has (it reads
--     information_schema.columns), and neither if it has none; the chain's sets
--     NEW.updated_at whatever the table, so on the chain no row of documents
--     (which has the trigger and no updated_at column) could be updated.
--   - ACLs: on each of the 104 the chain grants EXECUTE to a role production's
--     ACL lacks (PUBLIC, anon, authenticated, service_role or
--     supabase_auth_admin), and lacks no grant production has.
--   - Chain only: check_user_feature_access(uuid,text),
--     cleanup_old_webhook_data(integer) and (integer,integer),
--     detect_webhook_health_issues(), get_owner_accessible_lease_tenant_ids(uuid),
--     get_tenant_accessible_lease_ids(uuid), get_tenant_lease_ids(),
--     get_tenant_property_ids(), record_webhook_metrics_batch(jsonb),
--     refresh_webhook_views().
--   - Production only: cleanup_stripe_sync_history(), set_updated_at_metadata().
-- No file in the ledger produces these functions as production has them. The
-- migration-replay job runs its fixtures on the replayed chain, so until this
-- file they ran against bodies and grants production does not have.
--
-- WHAT. One DO block, so the file applies whole or not at all.
--   1. Bodies. Each of the 36 functions (the 34 bodies that differ, and the 2
--      production-only functions) that is missing, or whose
--      md5(pg_get_functiondef) is not production's, is created from
--      production's pg_get_functiondef text, verbatim. CREATE OR REPLACE keeps an
--      existing function's owner and ACL.
--   2. ACLs. For each of the 149 functions whose ACL text is not production's,
--      EXECUTE is revoked from every grantee production's ACL lacks. A REVOKE
--      leaves the other entries in their order, and on the replayed chain that
--      is production's text exactly, so nothing is granted (a catalog that would
--      need a GRANT fails step 4 and keeps nothing). Production's 7 `<default>`
--      rows (NULL: 6 trigger functions the chain grants explicitly, and
--      set_updated_at_metadata(), which CREATE gives the default privileges'
--      grants) cannot be set back to NULL. Their ACL is reduced to the default's
--      own entries, acldefault('f', owner) = {=X/postgres,postgres=X/postgres}:
--      EXECUTE for PUBLIC and the owner, which is what NULL grants.
--   3. Drops. Each of the 10 chain-only functions that exists is dropped,
--      without CASCADE (on the replayed chain nothing depends on any of them).
--   4. Self-check, raising (so 1-3 roll back) unless the catalog's listing is
--      production's: every public function that is not an extension member, as
--      in SOURCE, its ACL written `<default>` when it is NULL or equal to
--      acldefault('f', owner) (production has no explicit ACL equal to the
--      default, so its rows read as SOURCE read them), plus the listing's 14
--      pg_stat_monitor rows as embedded below (no migration installs
--      pg_stat_monitor, so the replay has none); C-sorted and joined by
--      newlines, the md5 must be SOURCE's. A chain-only function left over is a
--      row the listing does not have, so it fails this too.
--
-- A NO-OP ON PRODUCTION. Before anything runs, the block checks its constants:
-- the listing they spell has SOURCE's md5, each body's md5 is its listing
-- row's, and no function to drop is in the listing. Every CREATE, REVOKE and
-- DROP then runs only behind a guard that the catalog differs from that listing
-- (a body's md5, an ACL's text, a chain-only function existing), so on a
-- catalog equal to the listing none runs. Production's catalog was equal to it
-- on 2026-11-02; if it has moved since, step 4 raises and nothing changes.
-- On the replay, applying this file a second time ran no CREATE, REVOKE or
-- DROP: on the replayed catalog, and again with production's two other
-- differences put in (pg_stat_monitor's 14 functions installed in public, and
-- the 7 `<default>` ACLs set to NULL).
--
-- SOURCE. Production, read only, 2026-11-02, under search_path
-- "$user", public, extensions (under public alone, match_blog_rag_chunks'
-- argument reads extensions.vector):
--   select p.oid::regprocedure::text, md5(pg_get_functiondef(p.oid)),
--          coalesce(p.proacl::text, '<default>'), p.provolatile, p.prosecdef
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.prokind = 'f';
-- 163 rows, 149 functions and 14 pg_stat_monitor members. As
-- `sig | md5 | acl | volatility | security definer (t/f)`, C-sorted and joined
-- by newlines, they have md5 30d50a870d65915c47d23e10908562d1. Each body below
-- is the function's pg_get_functiondef text, byte for byte, ending in its one
-- newline; its md5 is the listing's.
--
-- ORDER. Sorts after the last file production has applied (20261005215446)
-- and before this PR's first (20261102055449), so production applies it
-- first: 20261102055400, 20261102055449, 20261102163709, 20261102184501,
-- 20261102184502, 20261102184503, 20261102184504, 20261102200501,
-- 20261102230101. Those files then replace 9 of the functions listed here and
-- add 3.
--
-- AFTER APPLYING IT ON PRODUCTION, and before the next file, the SOURCE query
-- (read only) must return the listing again, md5
-- 30d50a870d65915c47d23e10908562d1: every function's pg_get_functiondef
-- unchanged. Step 4 asserts this inside the apply.

do $recon$
declare
  -- Production's listing, 2026-11-02: every public function that is not an extension member, as
  -- sig | md5(pg_get_functiondef) | proacl ('<default>' = NULL) | provolatile | prosecdef.
  v_functions constant text[] := array[
    'acquire_internal_event_lock(text,text,text) | 689a5be271042a1332268f67f518b10c | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'acquire_webhook_event_lock_with_id(text,text,text,jsonb) | ed8cf8a52fce1f10533c130979571aa1 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'anonymize_deleted_user(uuid) | 86599b323228ed9e6ddb20049f7c427a | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'anonymize_old_rental_applications() | d86985c6eae4ee8ab202e31b7e43334d | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'audit_for_all_policies(text) | ee1effdb8cb6ae2bfe0ab6f3bcb1073d | {postgres=X/postgres,authenticated=X/postgres} | s | t',
    'bulk_import_create_lease(uuid,uuid,date,date,numeric,numeric,integer,text,text) | a2b15dde3faa5d86d377df473998390f | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'calculate_maintenance_metrics(uuid,uuid,uuid,uuid) | 0ecb70d4870047f3e9db118bc6b4937a | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'calculate_monthly_metrics(uuid) | d80bc6fc4c9d15a52d1a18bacac9f4ac | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'cancel_account_deletion() | 03b8b45e3e9c8e3dabfb87888950ca87 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'check_cron_health() | 4c8d01ba259c7bd5bab9f8ea32ca602f | {postgres=X/postgres} | v | t',
    'check_rate_limit(text,integer,integer) | d6f7767741c0d4ce51f4abffe51bec99 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'check_stripe_sync_status() | 42fe27431552185fd0c2000637903cdd | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'check_user_feature_access(text,text) | 3ffe0d6f6baad02669a67d766c21a104 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'claim_lease_reminders(integer) | a625eb5c4e2ef217c27437bd097764b4 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'cleanup_cron_job_run_details() | d35b700c42de0785ca0837c1510719fb | {postgres=X/postgres} | v | t',
    'cleanup_old_email_deliverability() | 9eea1aa56f5e4fd9a10eead003f90121 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'cleanup_old_errors() | 27589b215f6faf0d91b4875adfc9c587 | {postgres=X/postgres} | v | t',
    'cleanup_old_internal_events(integer) | aaf7b54900633318818cebf875b3cbba | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'cleanup_old_notifications() | 954ffb393ee93de577b911260df0af15 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'cleanup_old_security_events() | 1d4838716755faf6e92158292e01b5ab | {postgres=X/postgres} | v | t',
    'cleanup_old_webhook_events() | 4e0e4fcf35f02992eac1e0b456b2fc8b | {postgres=X/postgres} | v | t',
    'cleanup_orphan_documents() | 1642c3c2228ddf40ffd052fbd0046cfd | {postgres=X/postgres} | v | t',
    'cleanup_pg_net_http_responses() | 684da05d7e86be2631f5725acce10cd1 | {postgres=X/postgres} | v | t',
    'cleanup_rate_limit_counters() | 29657d81d0fbcee447d04ad3062390ad | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'cleanup_stripe_sync_history() | 6742f03489a16ff8cd4cb300f79b83ba | {postgres=X/postgres} | v | t',
    'confirm_lease_subscription(uuid,text) | 306c5f57104c3d25425445785ad4f957 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'create_application_link(uuid,integer) | c0309aebfa70bee2971fc30839ed733c | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'create_notification(uuid,text,text,text,text,uuid,text) | e04a739a26fbbefb4d002bfcf5a9ac02 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'create_primary_lease_tenant() | c703f9ffb150e8826dc1ea5d9fa9ef92 | {postgres=X/postgres} | v | t',
    'cron_job_slot_counts(text,text) | d733a1f8a4be503865aa96fab47a3165 | {postgres=X/postgres,service_role=X/postgres} | s | t',
    'custom_access_token_hook(jsonb) | aa116df0bbc3a03710e9c57dc1837ac4 | {postgres=X/postgres} | s | t',
    'documents_refresh_search_vector() | 53a0e61b0ad8c6e9ba2b9c9051c43db2 | <default> | v | f',
    'enforce_property_plan_limit() | 03a7a1715f577d5f35ee54517ee9af60 | {postgres=X/postgres} | v | t',
    'enforce_storage_quota() | 5205110d550554a9eab98af3c5f36102 | <default> | v | t',
    'enforce_unit_plan_limit() | 82fbc0fe88426c4931a47c3a51c3ff3c | {postgres=X/postgres} | v | t',
    'ensure_public_user_for_auth() | 786184afd0916861225243e6cad9658c | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'expire_leases() | 54b447fccd60dced169a04429e403b4c | {postgres=X/postgres} | v | t',
    'expire_trials() | e1ce6568950635fda8443a58ea11f8c5 | {postgres=X/postgres} | v | t',
    'fn_record_first_property_funnel_event() | a240bda8853ad618eec0a0a571d6dac1 | {postgres=X/postgres} | v | t',
    'fn_record_first_tenant_funnel_event() | 11fe452ea1ab0561fa742652cf6d6e13 | {postgres=X/postgres} | v | t',
    'fn_record_signup_funnel_event() | 4269f0745c65cc083beaf3fd4f337a93 | {postgres=X/postgres} | v | t',
    'generate_rent_charges() | eeb3c7c245f4852f1125bb797c06a264 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'get_application_context(text) | dcff7b17d403cab6fe0029abd3ac629c | {postgres=X/postgres,service_role=X/postgres} | s | t',
    'get_billing_insights(uuid,timestamp without time zone,timestamp without time zone) | e86079092fda8ff53f8759f498376c03 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_blog_categories() | 25cdc737840ea6b45df45e4b9268f6a5 | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres} | s | f',
    'get_collection_rate(uuid,date) | 59c67d309aa559d539ed1c5488e909b9 | {postgres=X/postgres,authenticated=X/postgres} | s | t',
    'get_common_errors(integer,integer) | 1f0601b74f14193cb3a01c031ee0faf5 | {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres} | s | t',
    'get_current_owner_user_id() | 1b349e85ad717d31117fd309857e6c7d | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | s | t',
    'get_dashboard_data_v2(uuid) | 0082acad3d01ec06631c4338dbd79515 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_dashboard_stats(uuid) | 262ef332c0a2cbca1140381c10b1961e | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_dashboard_time_series(uuid,text,integer) | 1429247684b225721fee02a3c43a563b | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_deliverability_stats(integer) | 18f4752bd018715207c13591de6b34ab | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_error_prone_users(integer,integer) | 25ea9ba32ae03c364ff89c87838a8c08 | {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres} | s | t',
    'get_error_summary(integer) | c5c842d21fa902127d312314495db984 | {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres} | s | t',
    'get_esign_usage_current_month() | 4e2c27c038a19d134a8352a6c4fe8edd | {postgres=X/postgres,authenticated=X/postgres} | s | t',
    'get_expense_summary(uuid,date,date) | 65a377172524c63e35fe1a77ab7a5271 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_financial_overview(uuid,date,date) | 17dac7ac09d40fd7da932245c827da69 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_funnel_stats(timestamp with time zone,timestamp with time zone) | ab4906e2bd411ebae392ac0ee8228323 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_gate_conversion_stats(integer) | 62645b7e27c47dddb0768d5a3999285d | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_invoice_statistics(uuid) | 826c7a154c1acd912ff2a71e2396c7f8 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_lead_paint_compliance_report() | d10b6e1a25162fd8410324d9c2e54bc2 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'get_lease_ledger(uuid) | 9e7c4a2c2fd66527a251966357c80bb1 | {postgres=X/postgres,authenticated=X/postgres} | s | t',
    'get_lease_ledger_summary(uuid) | aeb25619331edd7a8844f2d899e707c2 | {postgres=X/postgres,authenticated=X/postgres} | s | t',
    'get_lease_signing_context(text) | c8f2afce6094223d7da80e5bf386ad7b | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'get_lease_stats(uuid) | 7c9076840cdf10ee9360f54226415c96 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_maintenance_analytics(uuid) | 38dee6de3aa129f7d429db7719352a60 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_maintenance_stats(uuid,timestamp with time zone) | ec594d881cf678a5dd7d03cb5be6a0e4 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_metric_trend(uuid,text,text) | 9fa6fed188781da28866292a4e3d58fc | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_occupancy_trends_optimized(uuid,integer) | cd3d85466231ba7c4b1ec8fef6930e4e | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_owner_storage_limit_gb(uuid) | 7d826a11478dc8694dda15256acc820f | {postgres=X/postgres,service_role=X/postgres} | s | t',
    'get_owner_storage_usage(uuid) | f34a23c6f6b361c81c969e16677d1aea | {postgres=X/postgres,service_role=X/postgres} | s | t',
    'get_property_performance_analytics(uuid,uuid,text,integer) | f3806db2d065f7ba8a56307be49707be | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_property_performance_cached(uuid) | feb5847e3c1cd59307979d04c4a5a523 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_property_performance_trends(uuid) | 042b2fda4968d0ab480ea28f32467eaf | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_property_performance_with_trends(uuid,text,integer) | 6423b173bc0a35aeef47fda528a68846 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_revenue_trends_optimized(uuid,integer) | 8a8ab6877446a85c6a6c64ee30e34117 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_slow_rls_queries(numeric) | e277bf853f5b7c6c7711b676f1907aa0 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'get_storage_usage_summary() | 7be3122d6755c16987c6a9a015607407 | {postgres=X/postgres,authenticated=X/postgres} | s | t',
    'get_stripe_customer_by_user_id(uuid) | f3430b3f2a044d453e3c81bee159932d | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_subscription_status(text) | 6876d3a413b2f02c0fa16db1a4f9fb47 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | s | t',
    'get_tenant_stats(uuid) | 0139562cbe999e972e8bbbe2b16b9eae | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'get_tenants_by_owner(uuid) | 991db4ec99e9a3bacc3b0cd661847e16 | {postgres=X/postgres,authenticated=X/postgres} | s | f',
    'get_tenants_with_lease_by_owner(uuid) | 5df29472ecb6005692d9c1cb73f31641 | {postgres=X/postgres,authenticated=X/postgres} | s | f',
    'get_unit_stats(uuid) | 6164d948de58f4d3cad5a1e041f1966e | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'get_user_dashboard_activities(text,integer,integer) | f6a27078da6ac40becbb4e667d07930c | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_user_id_by_stripe_customer(text) | 5ea36c5e3d921052a6ee90923c838c58 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'get_user_invoices(integer) | 41a8e267954b368dc9aa33ab2272e93c | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_user_plan_limits(uuid) | 12d9f5758490d5c4b71fb24480d5df82 | {postgres=X/postgres,service_role=X/postgres} | s | t',
    'get_user_profile(uuid) | 3f904a7e4f3e304599d2e9d08e2d12a3 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'get_user_sessions(uuid) | f548298b7497b67070164dd40cf8918b | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'guard_user_self_update() | 66bb5c0bec4ae96868b6fd6dfcb85980 | <default> | v | f',
    'handle_new_user_seed_categories() | 11ffa8d7503e76c2b9c4241ef8a0e03e | {postgres=X/postgres} | v | t',
    'handle_property_image_upload() | b5b2c7b56e009fe2c268fa49868d76bd | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'health_check() | bdb4e5c6c8e75723bee486d49dfd20e7 | {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | f',
    'invoke_send_lease_reminders() | 7bb4f7a086df274342c4b5dcab38ed3b | {postgres=X/postgres} | v | t',
    'is_admin() | 99e80cf321a61ea0bc4df1b016049476 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | s | t',
    'is_notification_suppressed(text) | 7ef022f35c33da188b22862380f8a3e4 | {postgres=X/postgres,service_role=X/postgres} | s | t',
    'link_stripe_customer_to_user(text,text) | 74638ae488983f57f757485402524e8b | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'log_document_created_activity() | ecfda7ab8135ac3d49528c78a384028e | {postgres=X/postgres} | v | t',
    'log_lease_created_activity() | 58789bcb1ae71ba10e5c447f6f8a6f4e | {postgres=X/postgres} | v | t',
    'log_lease_signature_activity() | 73c62891a4de291fca31a8bb6c2405e3 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'log_maintenance_created_activity() | d55615abf15331b53c5f75d6cc56df97 | {postgres=X/postgres} | v | t',
    'log_property_created_activity() | 53934fa38700e71e2c08dc4256707a8f | {postgres=X/postgres} | v | t',
    'log_security_event_lease_signed() | 783f9d0fc62576eb29f0ec9cff055486 | {postgres=X/postgres} | v | t',
    'log_security_event_property_created() | 4ba5937a780b47229f3419d3312c439a | {postgres=X/postgres} | v | t',
    'log_security_event_property_deleted() | f3eb2777bddf2d2749ee85281b954b87 | {postgres=X/postgres} | v | t',
    'log_security_event_user_anonymized() | d282ce528f4865943e591b99d29db50c | {postgres=X/postgres} | v | t',
    'log_user_error(text,text,text,text,jsonb,text,inet) | 81e54a17c1fdd7e887eab9b4e4b8e57c | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'match_blog_rag_chunks(vector,integer) | a84651fd8804b31930f8c8cd3dab7999 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | s | t',
    'meter_esign_send(uuid,uuid) | 22231f24e067829c45e714d121dc00a5 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'notify_critical_error() | 25648b26b12340e7a5d439e779a24e12 | {postgres=X/postgres} | v | t',
    'notify_n8n_maintenance() | 260e402d999e747338c6e6686b2b8cdb | {postgres=X/postgres} | v | t',
    'notify_owner_lease_esign() | d578ea619a547816428253f4207a101d | {postgres=X/postgres} | v | t',
    'notify_owner_maintenance() | 399af589771d344b6723fd4efea42338 | {postgres=X/postgres} | v | t',
    'process_account_deletions() | 391e037195f98ab09507809220859a5f | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'process_subscription_status_change(text,text,text) | eb1a450e8055147a7597359421aa3737 | {postgres=X/postgres} | v | t',
    'queue_lease_reminders() | c3cb00090b8593287f01b8ae1a5acc30 | {postgres=X/postgres} | v | t',
    'reassign_document_category(uuid,uuid) | 10eaefb4f9d5132cd44474dd86a45631 | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'record_application_conversion(uuid,uuid) | 367bbb8d4342b62a6b3b01b050f6f4e5 | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'record_lease_signature(uuid,text,text,timestamp with time zone,text) | 1d7da7146639d099f2f828c948a5d6e6 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'reject_cross_owner_lease_fk() | 19563870c4a5cf8051928e76db969d04 | {postgres=X/postgres} | v | t',
    'reject_cross_owner_lease_tenant_fk() | 076bf6a1df9e4aac6f4864c6e0f86242 | {postgres=X/postgres} | v | t',
    'reject_signature_audit_tampering() | cfcbfc31a145afb3570eb3f71efff623 | {postgres=X/postgres} | v | t',
    'reject_signed_lease_term_edits() | dd7fbd9110c00071c29f5a52d94d8fbe | {postgres=X/postgres} | v | t',
    'rent_ledger_append_only() | b61dcf784d14c922ba6f29249f92de41 | <default> | v | f',
    'reorder_document_categories(jsonb) | 63a77b8e36df1a9e1d97e0df4cbefd27 | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'request_account_deletion() | 02be3790b8f2759ebc26d3df02a8d06e | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'require_stripe_schema() | 8734dfd81c4905f6b66e0ed6dcdffd2e | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'reverse_charge(uuid) | 9b2e1292c27fa4e9f10dba46d40ea0a6 | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'reverse_receipt(uuid) | 3b2b0ead1bdccbfa9db9a6050a5b5ba2 | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'revoke_application_link(uuid) | 09d4628e10213b8af42e8e4b2981dbae | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'revoke_user_session(uuid,uuid) | 4e005ff246663506852ee85b42906f51 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'search_documents(text,text,text[],timestamp with time zone,timestamp with time zone,integer,integer) | 4b2dd103e3ba2a79082e41ade8fbe1e0 | {postgres=X/postgres,authenticated=X/postgres} | s | t',
    'search_properties(uuid,text,integer) | 348ba9ce683c916fd19a69897e3b63b9 | {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} | v | t',
    'seed_default_document_categories(uuid) | efb992ddf20d600cc5551163ab6d52ac | {postgres=X/postgres} | v | t',
    'seed_storage_object_for_test(uuid,text,text,bigint) | fe357379a8170fdd1af351df2c80b51b | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'set_application_notes(uuid,text) | 170cf7056bc90f3aeea6b293c53d7033 | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'set_application_status(uuid,text,text) | 8838049dac0e8897ec659372f0aea952 | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'set_trial_on_signup() | 9de0946423d0fa52cc62b9e2be83f673 | {postgres=X/postgres} | v | t',
    'set_updated_at() | ca2b087c5a5b9f962d727f1f05d17766 | <default> | v | f',
    'set_updated_at_metadata() | 05cb883f86b0aaad512c3e668f71c6d0 | <default> | v | f',
    'sign_lease_with_token(text,text,text,timestamp with time zone,text) | 146bff0743e838a242c32996499b6239 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'start_lease_ledger(uuid,date,numeric) | 6f751cdbfed23e48dad63308988fbb2b | {postgres=X/postgres,authenticated=X/postgres} | v | t',
    'storage_object_owner(text,text) | abe6c91c0385d4f6fab8f4c06e2b5249 | {postgres=X/postgres,service_role=X/postgres} | s | t',
    'submit_rental_application(text,uuid,jsonb,text,text) | 0e2c3d6d45b4c6a67acdafbd55d09b97 | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'sync_unit_status_from_lease() | dd2025d207f35127be33c8b357ffa88c | {postgres=X/postgres,service_role=X/postgres} | v | t',
    'update_property_search_vector() | ad045f118ad5cb6a1575bc81317abe71 | <default> | v | f',
    'validate_blog_post() | 33667bfe24d7566b1e7effaa292c8bcd | {postgres=X/postgres} | v | t',
    'validate_document_category() | 08cf72f8cdf18cd3c3cd90a6799acc8b | {postgres=X/postgres} | v | t'
  ];
  -- The listing's other 14 rows: pg_stat_monitor's members, owned by supabase_admin. No migration
  -- installs pg_stat_monitor, so the replay has none; step 4 never reads these from the catalog,
  -- and they enter its md5 as written here, which makes that md5 production's whole listing.
  v_extension_rows constant text[] := array[
    'decode_error_level(integer) | 7bc8da528e1766c6e9b132edc311f448 | {=X/supabase_admin,supabase_admin=X/supabase_admin} | v | f',
    'get_cmd_type(integer) | fc0446bbf525b7836cf4d8347903e1ff | {=X/supabase_admin,supabase_admin=X/supabase_admin} | v | f',
    'get_histogram_timings() | 756170a1a7e6b2afb372f289aebb3bb3 | {=X/supabase_admin,supabase_admin=X/supabase_admin} | v | f',
    'histogram(integer,bigint) | fac44272145513e4e0ff40688924636e | <default> | v | f',
    'pg_stat_monitor_internal(boolean) | d91b1de38130beb010c9c17857d73ef3 | {=X/supabase_admin,supabase_admin=X/supabase_admin} | v | f',
    'pg_stat_monitor_reset() | cfea8756b2e4a9792e8e0d8521348359 | {supabase_admin=X/supabase_admin} | v | f',
    'pg_stat_monitor_version() | 2e9363eb161c9262aa0440091eef2451 | <default> | v | f',
    'pgsm_create_11_view() | e23c4545b5807a1c0f9cf8a25506690a | {supabase_admin=X/supabase_admin} | v | f',
    'pgsm_create_13_view() | 843751a7e0112a312cc2c2f2e75bc881 | {supabase_admin=X/supabase_admin} | v | f',
    'pgsm_create_14_view() | 46144200efc7fda49673ca7933f47420 | {supabase_admin=X/supabase_admin} | v | f',
    'pgsm_create_15_view() | 703b5404af7a4d50dde77c1264177c5c | {supabase_admin=X/supabase_admin} | v | f',
    'pgsm_create_17_view() | 1011e281976688a6a08e5df6aef1709c | {supabase_admin=X/supabase_admin} | v | f',
    'pgsm_create_view() | c7207b1f68732db23a58adc245db96f3 | {supabase_admin=X/supabase_admin} | v | f',
    'range() | ae3b1e7b610551440281b52659353677 | {=X/supabase_admin,supabase_admin=X/supabase_admin} | v | f'
  ];
  -- The chain creates these; production has none of them.
  v_chain_only constant text[] := array[
    'check_user_feature_access(uuid,text)',
    'cleanup_old_webhook_data(integer)',
    'cleanup_old_webhook_data(integer,integer)',
    'detect_webhook_health_issues()',
    'get_owner_accessible_lease_tenant_ids(uuid)',
    'get_tenant_accessible_lease_ids(uuid)',
    'get_tenant_lease_ids()',
    'get_tenant_property_ids()',
    'record_webhook_metrics_batch(jsonb)',
    'refresh_webhook_views()'
  ];
  v_listing_md5 constant text := '30d50a870d65915c47d23e10908562d1';
  r record;
  v_sig text;
  v_want text;
  v_oid oid;
  v_acl aclitem[];
  v_default aclitem[];
  v_target aclitem[];
  v_grantee oid;
  v_actual text[];
  v_md5 text;
  v_diff text;
  v_body_guards integer := 0;
  v_created integer := 0;
  v_acl_guards integer := 0;
  v_acl_changed integer := 0;
  v_revoked integer := 0;
  v_drop_guards integer := 0;
  v_dropped integer := 0;
begin
  -- Production's listing was read, and its bodies render, under this path: with public alone,
  -- match_blog_rag_chunks' argument reads extensions.vector.
  perform set_config('search_path', '"$user", public, extensions', true);

  -- Before anything runs, the constants are production's: the listing they spell has the
  -- md5 read from production, and none of the functions to drop is in it.
  select md5(string_agg(l, E'\n' order by l collate "C"))
    into v_md5
    from unnest(v_functions || v_extension_rows) as l;
  if v_md5 is distinct from v_listing_md5 then
    raise exception 'recon self-check: the embedded listing has md5 %, not production''s %',
      v_md5, v_listing_md5;
  end if;
  foreach v_sig in array v_chain_only loop
    if exists (select 1 from unnest(v_functions) as f where split_part(f, ' | ', 1) = v_sig) then
      raise exception 'recon self-check: % is to be dropped, but production has it', v_sig;
    end if;
  end loop;

  -- 1. Bodies: production's pg_get_functiondef text, run where the function is missing or
  --    its md5 is not production's. The SQL-language bodies come last, each after what it
  --    calls (get_owner_storage_usage calls storage_object_owner); PL/pgSQL resolves names
  --    when it runs, not when it is created.
  for r in
    select b.ord, b.sig, b.def
    from (values
      (1, 'calculate_monthly_metrics(uuid)', $recon_body$CREATE OR REPLACE FUNCTION public.calculate_monthly_metrics(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;
  SELECT coalesce(jsonb_agg(
    jsonb_build_object('month', to_char(month_date, 'YYYY-MM'),
      'revenue', 0, 'expenses', coalesce(expenses, 0),
      'net_income', -coalesce(expenses, 0), 'cash_flow', -coalesce(expenses, 0))
    ORDER BY month_date), '[]'::jsonb) INTO v_result
  FROM (SELECT generate_series(date_trunc('month', current_date) - interval '11 months',
      date_trunc('month', current_date), interval '1 month')::date AS month_date) months
  LEFT JOIN LATERAL (
    SELECT sum(e.amount) AS expenses FROM expenses e
    JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
    WHERE mr.owner_user_id = p_user_id AND e.status <> 'inactive'
      AND date_trunc('month', e.expense_date) = months.month_date
  ) exp ON true;
  RETURN v_result;
END;
$function$
$recon_body$),
      (2, 'check_cron_health()', $recon_body$CREATE OR REPLACE FUNCTION public.check_cron_health()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_failed record;
begin
  -- check for failed jobs in the last 25 hours (catches daily jobs)
  for v_failed in
    select j.jobname, d.status, d.return_message, d.start_time
    from cron.job_run_details d
    join cron.job j on j.jobid = d.jobid
    where d.start_time > now() - interval '25 hours'
      and d.status = 'failed'
      -- Report each (job, start_time) failure exactly once. Without this the
      -- hourly schedule re-reports every failure still inside the 25h window.
      -- The lookback is 26h - one hour wider than the scan window - so a
      -- failure at the very edge of the window cannot slip past the guard and
      -- be reported a second time.
      and not exists (
        select 1
        from public.user_errors ue
        where ue.error_code = 'CRON_FAILURE'
          and ue.created_at > now() - interval '26 hours'
          and ue.context ->> 'job' = j.jobname
          -- timestamptz compare, NOT text: jsonb_build_object stores an
          -- ISO-8601 string with microseconds, which never equals
          -- start_time::text. A text compare would silently dedupe nothing.
          and (ue.context ->> 'start_time')::timestamptz = d.start_time
      )
    order by d.start_time desc
  loop
    -- insert error into user_errors for Sentry pickup via existing monitoring
    -- user_id is NULL (system-generated error, not user-triggered)
    insert into public.user_errors (
      error_type, error_code, error_message, context
    ) values (
      'application',
      'CRON_FAILURE',
      format('Cron job "%s" failed: %s', v_failed.jobname, v_failed.return_message),
      jsonb_build_object('job', v_failed.jobname, 'start_time', v_failed.start_time)
    );

    -- fire pg_notify for immediate alerting (external listener can forward to Sentry/Slack)
    perform pg_notify('cron_failure', json_build_object(
      'job', v_failed.jobname,
      'error', v_failed.return_message,
      'time', v_failed.start_time
    )::text);
  end loop;
end;
$function$
$recon_body$),
      (3, 'check_rate_limit(text,integer,integer)', $recon_body$CREATE OR REPLACE FUNCTION public.check_rate_limit(p_bucket_key text, p_max_requests integer, p_window_ms integer)
 RETURNS TABLE(allowed boolean, limit_value integer, remaining integer, reset_at_ms bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET lock_timeout TO '250ms'
AS $function$
declare
  v_window_ms     bigint;
  v_now_ms        bigint;
  v_window_index  bigint;
  v_elapsed_ratio numeric;
  v_prev_count    integer;
  v_prev_weighted integer;
  v_new_count     integer;
  v_reset_ms      bigint;
begin
  if p_bucket_key is null or length(p_bucket_key) = 0 or length(p_bucket_key) > 512 then
    raise exception 'check_rate_limit: p_bucket_key must be 1..512 characters';
  end if;
  if p_max_requests is null or p_max_requests < 1 then
    raise exception 'check_rate_limit: p_max_requests must be >= 1';
  end if;
  if p_window_ms is null or p_window_ms < 1000 then
    raise exception 'check_rate_limit: p_window_ms must be >= 1000';
  end if;

  v_window_ms     := p_window_ms::bigint;
  v_now_ms        := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_window_index  := v_now_ms / v_window_ms;
  v_elapsed_ratio := (v_now_ms % v_window_ms)::numeric / v_window_ms::numeric;
  v_reset_ms      := (v_window_index + 1) * v_window_ms;

  select c.request_count into v_prev_count
  from public.rate_limit_counters c
  where c.bucket_key   = p_bucket_key
    and c.window_index = v_window_index - 1;

  v_prev_weighted := floor((1 - v_elapsed_ratio) * coalesce(v_prev_count, 0))::integer;

  insert into public.rate_limit_counters as c
    (bucket_key, window_index, request_count, expires_at)
  select
    p_bucket_key,
    v_window_index,
    1,
    to_timestamp(((v_window_index + 2) * v_window_ms)::numeric / 1000.0)
  where v_prev_weighted < p_max_requests
  on conflict (bucket_key, window_index) do update
    set request_count = c.request_count + 1
    where c.request_count + v_prev_weighted < p_max_requests
  returning c.request_count into v_new_count;

  if v_new_count is null then
    return query select false, p_max_requests, 0, v_reset_ms;
    return;
  end if;

  return query select
    true,
    p_max_requests,
    greatest(p_max_requests - (v_new_count + v_prev_weighted), 0),
    v_reset_ms;
end;
$function$
$recon_body$),
      (4, 'cleanup_old_notifications()', $recon_body$CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_archived integer := 0;
  v_batch integer;
begin
  -- batch 1: archive read notifications older than 90 days
  with to_archive as (
    select id from public.notifications
    where is_read = true
      and created_at < now() - interval '90 days'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.notifications_archive
    select n.* from public.notifications n
    join to_archive ta on ta.id = n.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  delete from public.notifications
  where is_read = true
    and created_at < now() - interval '90 days'
    and id in (select id from public.notifications_archive);

  -- batch 2: archive unread notifications older than 180 days
  with to_archive as (
    select id from public.notifications
    where (is_read is not true)
      and created_at < now() - interval '180 days'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.notifications_archive
    select n.* from public.notifications n
    join to_archive ta on ta.id = n.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  delete from public.notifications
  where (is_read is not true)
    and created_at < now() - interval '180 days'
    and id in (select id from public.notifications_archive);

  raise notice 'cleanup_old_notifications: archived % rows', v_archived;
  return v_archived;
end;
$function$
$recon_body$),
      (5, 'cleanup_rate_limit_counters()', $recon_body$CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_counters()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_batch integer;
  v_total integer := 0;
  v_iter  integer := 0;
begin
  loop
    v_iter := v_iter + 1;

    with due as (
      select bucket_key, window_index
      from public.rate_limit_counters
      where expires_at < now()
      limit 10000
      for update skip locked
    )
    delete from public.rate_limit_counters c
    using due
    where c.bucket_key   = due.bucket_key
      and c.window_index = due.window_index;

    get diagnostics v_batch = row_count;
    v_total := v_total + v_batch;

    exit when v_batch < 10000 or v_iter >= 50;
  end loop;

  raise notice 'cleanup_rate_limit_counters: deleted % row(s) in % batch(es)', v_total, v_iter;
  return v_total;
end;
$function$
$recon_body$),
      (6, 'cleanup_stripe_sync_history()', $recon_body$CREATE OR REPLACE FUNCTION public.cleanup_stripe_sync_history()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'stripe'
AS $function$
DECLARE
  deleted_obj_runs BIGINT;
  deleted_archive BIGINT;
  deleted_sync_runs BIGINT;
  cutoff TIMESTAMPTZ := now() - interval '7 days';
BEGIN
  -- Use index-friendly DELETE without LIMIT cap — was capped at 50K/day,
  -- inflow is ~935K/day. Now runs hourly so each run handles ~40K rows.
  WITH deleted AS (
    DELETE FROM stripe._sync_obj_runs
    WHERE run_started_at < cutoff AND status IN ('complete', 'error')
    RETURNING 1
  )
  SELECT count(*) INTO deleted_obj_runs FROM deleted;

  -- Archive table — full purge, nothing to retain
  WITH deleted AS (
    DELETE FROM stripe._sync_obj_runs_archive RETURNING 1
  )
  SELECT count(*) INTO deleted_archive FROM deleted;

  -- Closed sync_runs with no remaining child obj_runs
  WITH deleted AS (
    DELETE FROM stripe._sync_runs r
    WHERE r.closed_at IS NOT NULL
      AND r.started_at < cutoff
      AND NOT EXISTS (
        SELECT 1 FROM stripe._sync_obj_runs o
        WHERE o._account_id = r._account_id AND o.run_started_at = r.started_at
      )
    RETURNING 1
  )
  SELECT count(*) INTO deleted_sync_runs FROM deleted;

  IF deleted_obj_runs > 0 OR deleted_archive > 0 OR deleted_sync_runs > 0 THEN
    RAISE LOG 'stripe sync cleanup: deleted % obj_runs, % archive, % sync_runs',
      deleted_obj_runs, deleted_archive, deleted_sync_runs;
  END IF;
END;
$function$
$recon_body$),
      (7, 'enforce_property_plan_limit()', $recon_body$CREATE OR REPLACE FUNCTION public.enforce_property_plan_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_limit  integer;
  v_admin  boolean;
  v_count  integer;
BEGIN
  SELECT properties_limit, is_admin
    INTO v_limit, v_admin
  FROM public.get_user_plan_limits(NEW.owner_user_id);

  IF v_admin OR v_limit < 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.properties
  WHERE owner_user_id = NEW.owner_user_id
    AND status <> 'inactive';

  IF v_count >= v_limit THEN
    RAISE EXCEPTION
      'plan_limit_exceeded: properties (% / % used)', v_count, v_limit
      USING
        ERRCODE = 'P0001',
        HINT    = 'plan_limit_exceeded',
        DETAIL  = format(
          '{"resource":"properties","used":%s,"limit":%s,"upgrade_source":"property_limit_gate"}',
          v_count, v_limit
        );
  END IF;

  RETURN NEW;
END;
$function$
$recon_body$),
      (8, 'enforce_storage_quota()', $recon_body$CREATE OR REPLACE FUNCTION public.enforce_storage_quota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner uuid;
  v_limit_gb integer;
  v_used bigint;
  v_limit_bytes bigint;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if coalesce(
       (select value from public.app_config where key = 'storage_enforcement_enabled'),
       'false'
     ) <> 'true' then
    return new;
  end if;

  if new.bucket_id not in (
       'avatars','property-images','inspection-photos','maintenance-photos','tenant-documents'
     ) then
    return new;
  end if;

  v_owner := coalesce(new.owner, (select auth.uid()));

  v_limit_gb := public.get_owner_storage_limit_gb(v_owner);
  if v_limit_gb < 0 then
    return new;
  end if;

  if exists (
       select 1 from public.users
       where id = v_owner and storage_grandfathered_at is not null
     ) then
    return new;
  end if;

  v_limit_bytes := v_limit_gb::bigint * 1024 * 1024 * 1024;
  v_used := public.get_owner_storage_usage(v_owner);

  if v_used >= v_limit_bytes then
    raise exception
      'plan_limit_exceeded: storage quota reached (% / % bytes used)', v_used, v_limit_bytes
      using
        errcode = 'PLIM1',
        hint = 'plan_limit_exceeded',
        detail = format(
          '{"resource":"storage","used":%s,"limit":%s,"upgrade_source":"storage_quota_gate"}',
          v_used, v_limit_bytes
        );
  end if;

  return new;
end;
$function$
$recon_body$),
      (9, 'generate_rent_charges()', $recon_body$CREATE OR REPLACE FUNCTION public.generate_rent_charges()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_inserted integer;
begin
  with active_periods as (
    select
      l.id            as lease_id,
      l.owner_user_id as owner_user_id,
      l.rent_amount   as rent_amount,
      gs::date        as period_start
    from public.leases l
    join lateral generate_series(
           greatest(date_trunc('month', l.ledger_start_date),
                    date_trunc('month', l.start_date)),
           date_trunc('month', current_date),
           interval '1 month') gs on true
    where l.ledger_start_date is not null
      and l.lease_status in ('active','ended','expired','terminated')
      and l.start_date <= (gs + interval '1 month' - interval '1 day')::date
      and (l.end_date is null or l.end_date >= gs::date)
  ),
  ins as (
    insert into public.rent_charges (lease_id, owner_user_id, type, amount, period_start, due_date, description)
    select
      lease_id,
      owner_user_id,
      'rent',
      rent_amount::numeric(10,2),
      period_start,
      period_start,
      'Monthly rent'
    from active_periods
    on conflict (lease_id, period_start) where type = 'rent' and reverses_id is null do nothing
    returning 1
  )
  select count(*) into v_inserted from ins;

  return v_inserted;
end;
$function$
$recon_body$),
      (10, 'get_esign_usage_current_month()', $recon_body$CREATE OR REPLACE FUNCTION public.get_esign_usage_current_month()
 RETURNS TABLE(used integer, cap integer, unlimited boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner uuid := (select auth.uid());
  v_plan  text;
  v_used  integer;
  v_cap   constant integer := 25;
begin
  if v_owner is null then
    raise exception 'not authenticated'
      using errcode = '42501';
  end if;

  select lower(coalesce(subscription_plan, '')) into v_plan
  from public.users
  where id = v_owner;

  select count(*) into v_used
  from public.esign_events
  where owner_user_id = v_owner
    and event_type = 'send'
    and created_at >= date_trunc('month', now());

  return query select
    v_used,
    v_cap,
    (v_plan in ('max', 'tenantflow_max',
                'price_1tvtaqp3wcr53sdo22vayfhp', 'price_1tvtaup3wcr53sdo5mnmsamf'));
end;
$function$
$recon_body$),
      (11, 'get_gate_conversion_stats(integer)', $recon_body$CREATE OR REPLACE FUNCTION public.get_gate_conversion_stats(p_days integer DEFAULT 30)
 RETURNS TABLE(feature text, gate_hits bigint, distinct_users_hit bigint, upgrades_from_gate bigint, conversion_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'p_days must be between 1 and 365';
  end if;
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  return query
  with hit_counts as (
    select ge.feature, count(*)::bigint as gate_hits, count(distinct ge.user_id)::bigint as distinct_users_hit
    from public.gate_events ge
    where ge.hit_at >= now() - make_interval(days => p_days)
    group by ge.feature
  ),
  source_from_feature as (
    select 'esign'::text as feature, 'esign_gate'::text as source
    union all
    select 'premium_reports'::text as feature, 'reports_gate'::text as source
  ),
  upgrade_counts as (
    select sff.feature, count(distinct u.id)::bigint as upgrades_from_gate
    from source_from_feature sff
    left join public.users u
      on u.subscription_source = sff.source
      and u.subscription_status in ('active', 'trialing')
      and coalesce(u.subscription_updated_at, u.created_at) >= now() - make_interval(days => p_days)
    group by sff.feature
  )
  select
    sff.feature,
    coalesce(hc.gate_hits, 0) as gate_hits,
    coalesce(hc.distinct_users_hit, 0) as distinct_users_hit,
    coalesce(uc.upgrades_from_gate, 0) as upgrades_from_gate,
    case when coalesce(hc.distinct_users_hit, 0) = 0 then null
         else round(coalesce(uc.upgrades_from_gate, 0)::numeric / hc.distinct_users_hit, 4)
    end as conversion_rate
  from source_from_feature sff
  left join hit_counts hc on hc.feature = sff.feature
  left join upgrade_counts uc on uc.feature = sff.feature
  order by sff.feature;
end;
$function$
$recon_body$),
      (12, 'get_invoice_statistics(uuid)', $recon_body$CREATE OR REPLACE FUNCTION public.get_invoice_statistics(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;
  RETURN '[]'::jsonb;
END;
$function$
$recon_body$),
      (13, 'get_lease_ledger(uuid)', $recon_body$CREATE OR REPLACE FUNCTION public.get_lease_ledger(p_lease_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner  uuid := (select auth.uid());
  v_result jsonb;
begin
  if not exists (
    select 1 from public.leases
    where id = p_lease_id and owner_user_id = v_owner
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  with entries as (
    select
      c.id                                       as id,
      'charge'::text                             as kind,
      c.type                                     as type,
      c.amount                                   as amount,
      coalesce(c.period_start, c.created_at::date) as entry_date,
      c.due_date                                 as due_date,
      c.description                              as description,
      null::text                                 as method,
      c.reverses_id                              as reverses_id,
      null::uuid                                 as charge_id,
      coalesce(
        (select sum(rr.amount) from public.rent_receipts rr
          where rr.charge_id = c.id
            and rr.owner_user_id = v_owner),
        0)                                       as receipts_sum,
      c.created_at                               as created_at
    from public.rent_charges c
    where c.lease_id = p_lease_id
      and c.owner_user_id = v_owner
    union all
    select
      r.id                                       as id,
      'receipt'::text                            as kind,
      null::text                                 as type,
      r.amount                                   as amount,
      r.received_date                            as entry_date,
      null::date                                 as due_date,
      r.description                              as description,
      r.method                                   as method,
      r.reverses_id                              as reverses_id,
      r.charge_id                                as charge_id,
      null::numeric                              as receipts_sum,
      r.created_at                               as created_at
    from public.rent_receipts r
    where r.lease_id = p_lease_id
      and r.owner_user_id = v_owner
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',           e.id,
        'kind',         e.kind,
        'type',         e.type,
        'amount',       e.amount,
        'entry_date',   e.entry_date,
        'due_date',     e.due_date,
        'description',  e.description,
        'method',       e.method,
        'reverses_id',  e.reverses_id,
        'charge_id',    e.charge_id,
        'receipts_sum', e.receipts_sum
      )
      order by e.entry_date asc, e.created_at asc
    ),
    '[]'::jsonb
  ) into v_result
  from entries e;

  return v_result;
end;
$function$
$recon_body$),
      (14, 'get_lease_ledger_summary(uuid)', $recon_body$CREATE OR REPLACE FUNCTION public.get_lease_ledger_summary(p_lease_id uuid)
 RETURNS TABLE(charges_total numeric, credits_total numeric, receipts_total numeric, balance numeric, late_count integer, late_amount numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner uuid := (select auth.uid());
begin
  if not exists (
    select 1 from public.leases
    where id = p_lease_id and owner_user_id = v_owner
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  with c as (
    select * from public.rent_charges
    where lease_id = p_lease_id and owner_user_id = v_owner
  ),
  r as (
    select * from public.rent_receipts
    where lease_id = p_lease_id and owner_user_id = v_owner
  )
  select
    coalesce(sum(c.amount) filter (where c.amount > 0), 0),
    coalesce(sum(c.amount) filter (where c.amount < 0), 0),
    coalesce((select sum(amount) from r), 0),
    coalesce(sum(c.amount), 0) - coalesce((select sum(amount) from r), 0),
    coalesce(count(*) filter (
      where c.type in ('rent', 'late_fee', 'manual_charge')
        and c.reverses_id is null
        and not exists (select 1 from c v where v.reverses_id = c.id)
        and c.due_date + interval '5 days' < current_date
        and c.amount > coalesce(
          (select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    )::int, 0),
    coalesce(sum(
      c.amount - coalesce(
        (select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    ) filter (
      where c.type in ('rent', 'late_fee', 'manual_charge')
        and c.reverses_id is null
        and not exists (select 1 from c v where v.reverses_id = c.id)
        and c.due_date + interval '5 days' < current_date
        and c.amount > coalesce(
          (select sum(rr.amount) from r rr where rr.charge_id = c.id), 0)
    ), 0)
  from c;
end;
$function$
$recon_body$),
      (15, 'get_owner_storage_limit_gb(uuid)', $recon_body$CREATE OR REPLACE FUNCTION public.get_owner_storage_limit_gb(p_owner uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan text;
begin
  select lower(coalesce(subscription_plan, '')) into v_plan
  from public.users
  where id = p_owner;

  return case v_plan
    when 'starter'                        then 10
    when 'price_1tvtaap3wcr53sdoymuzn7vf' then 10
    when 'price_1tvtaep3wcr53sdo7pbg6bcw' then 10
    when 'growth'                         then 50
    when 'price_1tvtaip3wcr53sdoqnue1inv' then 50
    when 'price_1tvtamp3wcr53sdon4kufrvn' then 50
    when 'max'                            then -1
    when 'tenantflow_max'                 then -1
    when 'price_1tvtaqp3wcr53sdo22vayfhp' then -1
    when 'price_1tvtaup3wcr53sdo5mnmsamf' then -1
    else 1
  end;
end;
$function$
$recon_body$),
      (16, 'get_storage_usage_summary()', $recon_body$CREATE OR REPLACE FUNCTION public.get_storage_usage_summary()
 RETURNS TABLE(used_bytes bigint, limit_gb integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return query
    select public.get_owner_storage_usage(v_uid),
           public.get_owner_storage_limit_gb(v_uid);
end;
$function$
$recon_body$),
      (17, 'get_subscription_status(text)', $recon_body$CREATE OR REPLACE FUNCTION public.get_subscription_status(p_customer_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_caller_customer_id text;
  v_row record;
begin
  select u.stripe_customer_id
    into v_caller_customer_id
  from public.users u
  where u.id = (select auth.uid());

  if v_caller_customer_id is null or v_caller_customer_id is distinct from p_customer_id then
    raise exception 'Access denied: p_customer_id does not match caller' using errcode = '42501';
  end if;

  select
    subscription_id,
    subscription_status,
    subscription_plan,
    subscription_current_period_end,
    subscription_cancel_at_period_end
  into v_row
  from public.users
  where stripe_customer_id = p_customer_id;

  if v_row is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.subscription_id,
    'status', v_row.subscription_status,
    'price_id', v_row.subscription_plan,
    'current_period_end', v_row.subscription_current_period_end,
    'cancel_at_period_end', coalesce(v_row.subscription_cancel_at_period_end, false)
  );
end;
$function$
$recon_body$),
      (18, 'get_tenant_stats(uuid)', $recon_body$CREATE OR REPLACE FUNCTION public.get_tenant_stats(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  return (
    select jsonb_build_object(
      'total', count(*),
      'active', count(*) filter (where status = 'active'),
      'inactive', count(*) filter (where status = 'inactive')
    )
    from tenants
    where owner_user_id = p_user_id
  );
end;
$function$
$recon_body$),
      (19, 'get_unit_stats(uuid)', $recon_body$CREATE OR REPLACE FUNCTION public.get_unit_stats(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  return (
    select jsonb_build_object(
      'total', count(*) filter (where status != 'inactive'),
      'occupied', count(*) filter (where status = 'occupied'),
      'available', count(*) filter (where status = 'available'),
      'maintenance', count(*) filter (where status = 'maintenance'),
      'totalActualRent',
        coalesce(sum(rent_amount) filter (where status != 'inactive'), 0)
    )
    from units
    where owner_user_id = p_user_id
  );
end;
$function$
$recon_body$),
      (20, 'guard_user_self_update()', $recon_body$CREATE OR REPLACE FUNCTION public.guard_user_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  -- Allowlist of columns the row owner may modify. Must stay in lockstep
  -- with the column-level GRANT UPDATE on public.users.
  allowed_cols constant text[] := array[
    'first_name',
    'last_name',
    'full_name',
    'phone',
    'avatar_url',
    'emergency_contact_name',
    'emergency_contact_phone',
    'emergency_contact_relationship',
    'onboarding_status',
    'updated_at'
  ];
begin
  -- service_role / postgres / supabase_admin bypass.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  -- Strip the allowed columns from a jsonb projection of NEW and OLD;
  -- the remainder must be byte-identical. If anything in the remainder
  -- changed, a privileged column was touched and we reject. This shape
  -- is robust against future schema additions: new columns are
  -- automatically privileged unless they're explicitly added to the
  -- allowlist above (and the matching GRANT).
  if (to_jsonb(new) - allowed_cols) is distinct from (to_jsonb(old) - allowed_cols) then
    raise exception
      'Privileged column on public.users cannot be modified via PostgREST. Use the appropriate RPC or service-role flow.'
      using errcode = '42501';
  end if;

  return new;
end;
$function$
$recon_body$),
      (21, 'handle_property_image_upload()', $recon_body$CREATE OR REPLACE FUNCTION public.handle_property_image_upload()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
DECLARE
  v_property_id uuid;
  v_storage_path text;
  v_next_display_order integer;
BEGIN
  IF NEW.bucket_id != 'property-images' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.metadata IS NOT NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  BEGIN
    v_property_id := (storage.foldername(NEW.name))[1]::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN NEW;
  END;

  IF v_property_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_storage_path := NEW.name;

  SELECT COALESCE(MAX(display_order), -1) + 1
  INTO v_next_display_order
  FROM public.property_images
  WHERE property_id = v_property_id;

  INSERT INTO public.property_images (property_id, image_url, display_order, created_at)
  VALUES (v_property_id, v_storage_path, v_next_display_order, NOW())
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$
$recon_body$),
      (22, 'invoke_send_lease_reminders()', $recon_body$CREATE OR REPLACE FUNCTION public.invoke_send_lease_reminders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_url        text;
  v_secret     text;
  v_sentry     text;
  v_start      timestamptz := clock_timestamp();
  v_request_id bigint;
  v_status     text;
begin
  select value into v_url    from public.app_config where key = 'reminders.drain_url';
  select value into v_secret from public.app_config where key = 'reminders.drain_secret';

  if v_url is null or v_url = '' then
    return;
  end if;

  select net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || coalesce(v_secret, '')
    ),
    timeout_milliseconds := 5000
  ) into v_request_id;

  if coalesce(v_secret, '') <> '' and v_request_id is not null then
    v_status := 'ok';
  else
    v_status := 'error';
  end if;

  select value into v_sentry from public.app_config where key = 'sentry.cron.send_lease_reminders_url';

  if v_sentry is not null and v_sentry <> '' then
    perform net.http_post(
      url     := v_sentry,
      body    := jsonb_build_object(
        'status',      v_status,
        'environment', 'production',
        'duration',    round(extract(epoch from (clock_timestamp() - v_start))::numeric, 3)
      ),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 5000
    );
  end if;
end;
$function$
$recon_body$),
      (23, 'log_security_event_lease_signed()', $recon_body$CREATE OR REPLACE FUNCTION public.log_security_event_lease_signed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if NEW.lease_status = 'active'
     and OLD.lease_status is distinct from 'active' then
    insert into public.security_events (
      event_type, severity, user_id, message, resource_type, resource_id, metadata
    )
    values (
      'lease.signed',
      'info',
      NEW.owner_user_id,
      'Lease activated (all parties signed)',
      'lease',
      NEW.id,
      jsonb_build_object(
        'unit_id',              NEW.unit_id,
        'previous_status',      OLD.lease_status,
        'has_signed_document',  NEW.signed_document_path is not null
      )
    );
  end if;
  return NEW;
end;
$function$
$recon_body$),
      (24, 'meter_esign_send(uuid,uuid)', $recon_body$CREATE OR REPLACE FUNCTION public.meter_esign_send(p_owner uuid, p_lease uuid)
 RETURNS TABLE(allowed boolean, used integer, cap integer, unlimited boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_plan  text;
  v_used  integer;
  v_cap   constant integer := 25;
begin
  perform pg_advisory_xact_lock(hashtextextended('esign:' || p_owner::text, 0));

  select lower(coalesce(subscription_plan, '')) into v_plan
  from public.users
  where id = p_owner;

  if v_plan in ('max', 'tenantflow_max',
                'price_1tvtaqp3wcr53sdo22vayfhp', 'price_1tvtaup3wcr53sdo5mnmsamf') then
    insert into public.esign_events (owner_user_id, lease_id)
    values (p_owner, p_lease);
    return query select true, null::integer, v_cap, true;
    return;
  end if;

  select count(*) into v_used
  from public.esign_events
  where owner_user_id = p_owner
    and event_type = 'send'
    and created_at >= date_trunc('month', now());

  if v_used >= v_cap then
    return query select false, v_used, v_cap, false;
    return;
  end if;

  insert into public.esign_events (owner_user_id, lease_id)
  values (p_owner, p_lease);
  return query select true, v_used + 1, v_cap, false;
end;
$function$
$recon_body$),
      (25, 'notify_owner_lease_esign()', $recon_body$CREATE OR REPLACE FUNCTION public.notify_owner_lease_esign()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.tenant_signed_at is not null
     and (old is null or old.tenant_signed_at is null) then
    perform public.create_notification(
      new.owner_user_id,
      'lease_signed',
      'Tenant signed the lease',
      null,
      'lease',
      new.id,
      '/leases/' || new.id::text
    );
  end if;

  if new.lease_status = 'active'
     and old.lease_status is distinct from 'active' then
    perform public.create_notification(
      new.owner_user_id,
      'lease_executed',
      'Lease fully executed',
      null,
      'lease',
      new.id,
      '/leases/' || new.id::text
    );
  end if;

  return new;
end;
$function$
$recon_body$),
      (26, 'reverse_charge(uuid)', $recon_body$CREATE OR REPLACE FUNCTION public.reverse_charge(p_charge_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner  uuid := (select auth.uid());
  v_charge public.rent_charges;
begin
  select * into v_charge from public.rent_charges where id = p_charge_id;
  if v_charge.id is null then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.leases
    where id = v_charge.lease_id and owner_user_id = v_owner
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  if v_charge.reverses_id is not null then
    return;
  end if;

  if exists (select 1 from public.rent_charges where reverses_id = p_charge_id) then
    return;
  end if;

  insert into public.rent_charges (
    lease_id, owner_user_id, type, amount, period_start, due_date, description, reverses_id
  )
  values (
    v_charge.lease_id, v_charge.owner_user_id, v_charge.type, -v_charge.amount,
    v_charge.period_start, v_charge.due_date,
    'Reversal of ' || coalesce(v_charge.description, 'entry'), p_charge_id
  );

  insert into public.rent_receipts (
    charge_id, lease_id, owner_user_id, amount, method, received_date, description, reverses_id
  )
  select
    rr.charge_id, rr.lease_id, rr.owner_user_id, -rr.amount, rr.method,
    current_date, 'Reversal of receipt', rr.id
  from public.rent_receipts rr
  where rr.charge_id = p_charge_id
    and rr.reverses_id is null
    and not exists (
      select 1 from public.rent_receipts x where x.reverses_id = rr.id
    );
end;
$function$
$recon_body$),
      (27, 'reverse_receipt(uuid)', $recon_body$CREATE OR REPLACE FUNCTION public.reverse_receipt(p_receipt_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner   uuid := (select auth.uid());
  v_receipt public.rent_receipts;
begin
  select * into v_receipt from public.rent_receipts where id = p_receipt_id;
  if v_receipt.id is null then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.leases
    where id = v_receipt.lease_id and owner_user_id = v_owner
  ) then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  if v_receipt.reverses_id is not null then
    return;
  end if;

  if exists (select 1 from public.rent_receipts where reverses_id = p_receipt_id) then
    return;
  end if;

  insert into public.rent_receipts (
    charge_id, lease_id, owner_user_id, amount, method, received_date, description, reverses_id
  )
  values (
    v_receipt.charge_id, v_receipt.lease_id, v_receipt.owner_user_id, -v_receipt.amount,
    v_receipt.method, current_date, 'Reversal of receipt', p_receipt_id
  );
end;
$function$
$recon_body$),
      (28, 'seed_storage_object_for_test(uuid,text,text,bigint)', $recon_body$CREATE OR REPLACE FUNCTION public.seed_storage_object_for_test(p_owner uuid, p_bucket text, p_name text, p_bytes bigint)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
begin
  if p_bytes is null or p_bytes < 0 then
    raise exception 'seed_storage_object_for_test: p_bytes must be >= 0';
  end if;

  insert into storage.objects (bucket_id, name, owner, metadata)
  values (
    p_bucket,
    p_name,
    p_owner,
    jsonb_build_object('size', p_bytes, 'mimetype', 'application/octet-stream')
  )
  returning id into v_id;

  return v_id;
end;
$function$
$recon_body$),
      (29, 'set_trial_on_signup()', $recon_body$CREATE OR REPLACE FUNCTION public.set_trial_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.subscription_status is null then
    new.subscription_status := 'trialing';
    new.trial_ends_at := now() + interval '14 days';
  end if;
  return new;
end;
$function$
$recon_body$),
      (30, 'set_updated_at()', $recon_body$CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  has_updated boolean;
  has__updated boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = TG_TABLE_SCHEMA
      AND table_name = TG_TABLE_NAME
      AND column_name = 'updated_at'
  ) INTO has_updated;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = TG_TABLE_SCHEMA
      AND table_name = TG_TABLE_NAME
      AND column_name = '_updated_at'
  ) INTO has__updated;

  IF has_updated THEN
    NEW.updated_at = now();
  ELSIF has__updated THEN
    NEW._updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$
$recon_body$),
      (31, 'set_updated_at_metadata()', $recon_body$CREATE OR REPLACE FUNCTION public.set_updated_at_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return NEW;
end;
$function$
$recon_body$),
      (32, 'sign_lease_with_token(text,text,text,timestamp with time zone,text)', $recon_body$CREATE OR REPLACE FUNCTION public.sign_lease_with_token(p_token_hash text, p_signature_ip text, p_signature_user_agent text, p_signed_at timestamp with time zone, p_signer_name text DEFAULT NULL::text)
 RETURNS TABLE(success boolean, both_signed boolean, lease_id uuid, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_token record;
  v_lease record;
  v_current_email text;
begin
  select lst.id, lst.lease_id, lst.tenant_email, lst.expires_at, lst.used_at, lst.revoked_at
  into v_token
  from public.lease_signing_tokens lst
  where lst.token_hash = p_token_hash
  for update;

  if v_token.id is null then
    return query select false, false, null::uuid, 'invalid_token'::text;
    return;
  end if;
  if v_token.revoked_at is not null then
    return query select false, false, null::uuid, 'revoked_token'::text;
    return;
  end if;
  if v_token.used_at is not null then
    return query select false, false, null::uuid, 'used_token'::text;
    return;
  end if;
  if v_token.expires_at <= p_signed_at then
    return query select false, false, null::uuid, 'expired_token'::text;
    return;
  end if;

  select l.id, l.owner_user_id, l.lease_status, l.owner_signed_at, l.tenant_signed_at, l.primary_tenant_id
  into v_lease
  from public.leases l
  where l.id = v_token.lease_id
  for update;

  if v_lease.id is null then
    return query select false, false, null::uuid, 'lease_not_found'::text;
    return;
  end if;
  if v_lease.lease_status <> 'pending_signature' then
    return query select false, false, v_lease.id, 'lease_not_pending_signature'::text;
    return;
  end if;
  if v_lease.tenant_signed_at is not null then
    return query select false, false, v_lease.id, 'tenant_already_signed'::text;
    return;
  end if;

  select lower(trim(t.email)) into v_current_email
  from public.tenants t
  where t.id = v_lease.primary_tenant_id;

  if v_current_email is distinct from lower(trim(v_token.tenant_email)) then
    return query select false, false, v_lease.id, 'tenant_changed'::text;
    return;
  end if;

  update public.leases
  set tenant_signed_at            = p_signed_at,
      tenant_signature_ip         = p_signature_ip,
      tenant_signature_user_agent = p_signature_user_agent,
      tenant_signature_method     = 'in_app',
      tenant_signature_name       = p_signer_name,
      tenant_signature_consent_at = p_signed_at
  where id = v_lease.id;

  update public.lease_signing_tokens
  set used_at = p_signed_at
  where id = v_token.id;

  if v_lease.owner_signed_at is not null then
    update public.leases
    set lease_status = 'active'
    where id = v_lease.id and lease_status <> 'active';
    -- notification now emitted by trg_notify_owner_lease_esign (lease_executed).
  end if;
  -- SIGN-03: tenant-first (owner not yet signed) no longer needs an explicit
  -- notify block - trg_notify_owner_lease_esign emits 'lease_signed' on the
  -- tenant_signed_at update above. The email nudge stays best-effort in the
  -- Edge Function.

  return query select true, (v_lease.owner_signed_at is not null), v_lease.id, null::text;
  return;
end;
$function$
$recon_body$),
      (33, 'validate_blog_post()', $recon_body$CREATE OR REPLACE FUNCTION public.validate_blog_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_word_count integer;
  v_h2_count integer;
  v_docuseal_count integer;
  v_banned text;
  v_banlist text[] := ARRAY[
    'rent collection', 'online rent', 'autopay', 'auto-pay', 'tenant portal',
    'automated rent', 'collect rent', 'rent processing', 'pay rent online',
    'online payments', 'online rent payment', 'rent collection software',
    'tenants can pay', 'pay rent through',
    'automated workflow', 'rent tracking', 'mobile app access',
    'record rent', 'paid rent', 'pay rent'
  ];
  v_categories text[] := ARRAY['lease-law', 'tax-prep', 'tenant-screening', 'maintenance', 'software-vault'];
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status IN ('in-review', 'published'))
     OR (TG_OP = 'UPDATE' AND NEW.status IN ('in-review', 'published') AND OLD.status NOT IN ('in-review', 'published'))
  THEN
    -- Gate 1: word count 1,200–3,000
    v_word_count := array_length(regexp_split_to_array(coalesce(NEW.content, ''), '\s+'), 1);
    IF v_word_count IS NULL OR v_word_count < 1200 OR v_word_count > 3000 THEN
      RAISE EXCEPTION 'word_count out of range: % (must be 1200..3000)', v_word_count
        USING ERRCODE = '23514';
    END IF;

    -- ADMIN-02: persist the count the gate just validated. The generated
    -- reading_time column recomputes from this on row finalization.
    NEW.word_count := v_word_count;

    -- Gate 2: H2 count 4–10 (markdown ^## )
    v_h2_count := coalesce(
      (SELECT count(*)::int FROM regexp_matches(coalesce(NEW.content, ''), '^## ', 'gn')),
      0
    );
    IF v_h2_count < 4 OR v_h2_count > 10 THEN
      RAISE EXCEPTION 'h2_count out of range: % (must be 4..10)', v_h2_count
        USING ERRCODE = '23514';
    END IF;

    -- Gate 3: persona phrase — body must contain "landlord" (case-insensitive)
    IF position('landlord' in lower(coalesce(NEW.content, ''))) = 0 THEN
      RAISE EXCEPTION 'persona phrase missing: content must contain "landlord"'
        USING ERRCODE = '23514';
    END IF;

    -- Gate 4: slug pattern — duplicates the CHECK constraint defense-in-depth.
    IF NEW.slug !~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' OR length(NEW.slug) < 3 OR length(NEW.slug) > 120 THEN
      RAISE EXCEPTION 'slug pattern invalid: % (must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$, length 3..120)', NEW.slug
        USING ERRCODE = '23514';
    END IF;

    -- Gate 5: meta_description 50–160 chars
    IF NEW.meta_description IS NULL OR length(NEW.meta_description) < 50 OR length(NEW.meta_description) > 160 THEN
      RAISE EXCEPTION 'meta_description length out of range: % (must be 50..160)',
        coalesce(length(NEW.meta_description)::text, 'NULL')
        USING ERRCODE = '23514';
    END IF;

    -- Gate 6: excerpt 80–200 chars
    IF NEW.excerpt IS NULL OR length(NEW.excerpt) < 80 OR length(NEW.excerpt) > 200 THEN
      RAISE EXCEPTION 'excerpt length out of range: % (must be 80..200)',
        coalesce(length(NEW.excerpt)::text, 'NULL')
        USING ERRCODE = '23514';
    END IF;

    -- Gate 7: category enum
    IF NEW.category IS NULL OR NOT (NEW.category = ANY(v_categories)) THEN
      RAISE EXCEPTION 'category not in enum: % (must be one of %)',
        coalesce(NEW.category, 'NULL'), array_to_string(v_categories, ', ')
        USING ERRCODE = '23514';
    END IF;

    -- Gate 8: banlist — content must not contain any banned phrase (case-insensitive)
    FOREACH v_banned IN ARRAY v_banlist LOOP
      IF position(lower(v_banned) in lower(coalesce(NEW.content, ''))) > 0 THEN
        RAISE EXCEPTION 'banlist hit: % (Phase 4 banlist phrase found in content)', v_banned
          USING ERRCODE = '23514';
      END IF;
    END LOOP;

    -- Gate 9: DocuSeal mention count ≤ 1 (Phase 4 COPY-04 de-amp)
    v_docuseal_count := coalesce(
      (SELECT count(*)::int FROM regexp_matches(coalesce(NEW.content, ''), 'DocuSeal', 'gi')),
      0
    );
    IF v_docuseal_count > 1 THEN
      RAISE EXCEPTION 'DocuSeal mention count too high: % (max 1 per Phase 4 COPY-04)', v_docuseal_count
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
$recon_body$),
      (34, 'storage_object_owner(text,text)', $recon_body$CREATE OR REPLACE FUNCTION public.storage_object_owner(p_bucket text, p_name text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case p_bucket
    when 'avatars' then
      nullif((storage.foldername(p_name))[1], '')::uuid
    when 'property-images' then
      (select p.owner_user_id from public.properties p
        where p.id = nullif((storage.foldername(p_name))[1], '')::uuid)
    when 'inspection-photos' then
      (select i.owner_user_id from public.inspections i
        where i.id = nullif((storage.foldername(p_name))[1], '')::uuid)
    when 'maintenance-photos' then
      (select m.owner_user_id from public.maintenance_requests m
        where m.id = nullif((storage.foldername(p_name))[1], '')::uuid)
    when 'tenant-documents' then
      case (storage.foldername(p_name))[1]
        when 'property' then
          (select p.owner_user_id from public.properties p
            where p.id = nullif((storage.foldername(p_name))[2], '')::uuid)
        when 'lease' then
          (select l.owner_user_id from public.leases l
            where l.id = nullif((storage.foldername(p_name))[2], '')::uuid)
        when 'tenant' then
          (select t.owner_user_id from public.tenants t
            where t.id = nullif((storage.foldername(p_name))[2], '')::uuid)
        when 'maintenance_request' then
          (select m.owner_user_id from public.maintenance_requests m
            where m.id = nullif((storage.foldername(p_name))[2], '')::uuid)
        when 'inspection' then
          (select i.owner_user_id from public.inspections i
            where i.id = nullif((storage.foldername(p_name))[2], '')::uuid)
        else null
      end
    else null
  end;
$function$
$recon_body$),
      (35, 'get_owner_storage_usage(uuid)', $recon_body$CREATE OR REPLACE FUNCTION public.get_owner_storage_usage(p_owner uuid)
 RETURNS bigint
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(sum((o.metadata->>'size')::bigint), 0)
  from storage.objects o
  where o.bucket_id in ('avatars','property-images','inspection-photos','maintenance-photos','tenant-documents')
    and coalesce(o.owner, public.storage_object_owner(o.bucket_id, o.name)) = p_owner;
$function$
$recon_body$),
      (36, 'match_blog_rag_chunks(vector,integer)', $recon_body$CREATE OR REPLACE FUNCTION public.match_blog_rag_chunks(query_embedding vector, match_count integer DEFAULT 6)
 RETURNS TABLE(id uuid, content text, source text, metadata jsonb, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.id,
         c.content,
         c.source,
         c.metadata,
         1 - (c.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.blog_rag_chunks c
  where c.embedding is not null
  order by c.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(greatest(match_count, 1), 50);
$function$
$recon_body$)
    ) as b(ord, sig, def)
    order by b.ord
  loop
    v_want := (select split_part(f, ' | ', 2) from unnest(v_functions) as f
                where split_part(f, ' | ', 1) = r.sig);
    if v_want is null or md5(r.def) <> v_want then
      raise exception 'recon self-check: the body for % has md5 %, not its listing row''s %',
        r.sig, md5(r.def), v_want;
    end if;
    v_body_guards := v_body_guards + 1;
    v_oid := to_regprocedure('public.' || r.sig);
    if v_oid is null or md5(pg_get_functiondef(v_oid)) <> v_want then
      execute r.def;
      v_created := v_created + 1;
      raise notice 'recon: created %', r.sig;
    end if;
  end loop;

  -- 2. ACLs: where a function's ACL text is not production's, revoke EXECUTE from each
  --    grantee production's ACL lacks. A `<default>` row is production's NULL, which no
  --    REVOKE restores: its target is acldefault('f', owner), the default's own entries.
  --    A NULL ACL makes the guard NULL, not true, so production's `<default>` rows (NULL)
  --    are never touched; the replayed chain has no NULL ACL.
  for r in
    select split_part(f, ' | ', 1) as sig, split_part(f, ' | ', 3) as acl
      from unnest(v_functions) as f
  loop
    v_acl_guards := v_acl_guards + 1;
    -- No row (the function is missing) leaves both NULL, so the guard is not true either;
    -- step 4 names the function.
    select p.proacl, acldefault('f', p.proowner)
      into v_acl, v_default
      from pg_proc as p
     where p.oid = to_regprocedure('public.' || r.sig);
    v_target := case when r.acl = '<default>' then v_default else r.acl::aclitem[] end;
    if v_acl::text <> v_target::text then
      v_acl_changed := v_acl_changed + 1;
      for v_grantee in
        select a.grantee
          from aclexplode(v_acl)
               with ordinality as a(grantor, grantee, privilege_type, is_grantable, n)
         where not exists (select 1 from aclexplode(v_target) as t where t.grantee = a.grantee)
         order by a.n
      loop
        execute format('revoke execute on function public.%s from %s', r.sig,
          case when v_grantee = 0 then 'public' else quote_ident(pg_get_userbyid(v_grantee)) end);
        v_revoked := v_revoked + 1;
        raise notice 'recon: revoked EXECUTE on % from %', r.sig,
          case when v_grantee = 0 then 'PUBLIC' else pg_get_userbyid(v_grantee) end;
      end loop;
    end if;
  end loop;

  -- 3. Chain-only functions: dropped where they exist, without CASCADE.
  foreach v_sig in array v_chain_only loop
    v_drop_guards := v_drop_guards + 1;
    if to_regprocedure('public.' || v_sig) is not null then
      execute format('drop function public.%s', v_sig);
      v_dropped := v_dropped + 1;
      raise notice 'recon: dropped %', v_sig;
    end if;
  end loop;

  -- 4. Self-check: the catalog's listing is production's. Every public function that is not
  --    an extension member, as sig | md5 | acl | volatility | security definer, with an ACL
  --    that is NULL or equal to acldefault('f', owner) written `<default>` (production has
  --    no explicit ACL equal to the default, so this writes production's rows as they were
  --    read), plus the 14 pg_stat_monitor rows as written above; C-sorted, joined by
  --    newlines. A function left over, missing or different changes the md5.
  select array_agg(format('%s | %s | %s | %s | %s',
           p.oid::regprocedure,
           md5(pg_get_functiondef(p.oid)),
           case when p.proacl is null or p.proacl::text = acldefault('f', p.proowner)::text
                then '<default>' else p.proacl::text end,
           p.provolatile,
           case when p.prosecdef then 't' else 'f' end))
    into v_actual
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind = 'f'
     and not exists (
       select 1 from pg_depend as d
        where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e');
  select md5(string_agg(l, E'\n' order by l collate "C"))
    into v_md5
    from unnest(v_actual || v_extension_rows) as l;
  if v_md5 is distinct from v_listing_md5 then
    select string_agg(d, E'\n' order by d collate "C")
      into v_diff
      from (
        select 'here, not in production''s listing: ' || l
          from (select unnest(v_actual) except select unnest(v_functions)) as x(l)
        union all
        select 'in production''s listing, not here: ' || l
          from (select unnest(v_functions) except select unnest(v_actual)) as y(l)
      ) as z(d);
    -- With the constants checked, a different md5 means a different row; the coalesce keeps
    -- this the self-check's message if a change to the hashing ever breaks that.
    raise exception 'recon self-check: the catalog''s listing has md5 %, not production''s %',
      v_md5, v_listing_md5
      using detail = coalesce(v_diff, 'every function''s row is production''s; what is hashed is not');
  end if;

  raise notice 'recon: % body guards, % created; % ACL guards, % changed by % revokes; % drop guards, % dropped; the catalog''s listing is production''s (md5 %)',
    v_body_guards, v_created, v_acl_guards, v_acl_changed, v_revoked, v_drop_guards, v_dropped,
    v_md5;
end
$recon$;
