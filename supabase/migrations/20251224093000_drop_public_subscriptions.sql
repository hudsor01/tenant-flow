-- Remove redundant public.subscriptions; Stripe Sync Engine is source of truth

DROP TABLE IF EXISTS "public"."subscriptions" CASCADE;
