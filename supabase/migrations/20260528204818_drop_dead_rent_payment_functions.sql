-- Drop 4 dead functions whose bodies reference public.rent_payments. The
-- rent_payments table was demolished in
-- 20260418140000_demolish_rent_and_tenant_portal (renamed 20260418183608 in
-- prod history); these 4 functions survived in pg_catalog because LANGUAGE
-- plpgsql function bodies are lazy-validated. They were unambiguously dead:
-- zero callers across src/, tests/, supabase/functions/. The only references
-- in the frontend were the auto-generated entries in src/types/supabase.ts
-- (regenerated as part of this commit).
--
-- Functions dropped:
--
--   public.upsert_rent_payment(uuid,uuid,integer,text,text,text,text,text,
--                              text,text,text,integer)
--     -> Wrote a row to rent_payments. Zero real callers; only ref was the
--        auto-gen type entry.
--
--   public.process_payment_intent_failed(uuid,text,integer,text)
--     -> Webhook handler for failed Stripe rent-payment intents. Zero real
--        callers; only ref was the auto-gen type entry.
--
--   public.notify_n8n_payment_reminder()
--     -> n8n webhook trigger for rent-payment reminders. Zero callers.
--
--   public.notify_n8n_rent_payment()
--     -> n8n webhook trigger for rent-payment notifications. Zero callers.
--
-- Not dropped here (separate concern):
--   The 8 analytics RPCs that reference rent_payments and ARE actively called
--   from the frontend (get_billing_insights, get_financial_overview,
--   get_invoice_statistics, get_revenue_trends_optimized,
--   calculate_monthly_metrics, get_property_performance_analytics/_trends/
--   _with_trends). These need a body rewrite to drop the rent_payments
--   dependency without breaking their callers. That's a feature-touching
--   refactor, not a cleanup -- tracked separately.
--
-- Issue #749 root-cause cleanup, part 2 (part 1: drop dead stripe.* schema
-- in PR #751).

DROP FUNCTION IF EXISTS public.upsert_rent_payment(
    uuid, uuid, integer, text, text, text, text, text, text, text, text, integer
);

DROP FUNCTION IF EXISTS public.process_payment_intent_failed(
    uuid, text, integer, text
);

DROP FUNCTION IF EXISTS public.notify_n8n_payment_reminder();

DROP FUNCTION IF EXISTS public.notify_n8n_rent_payment();
