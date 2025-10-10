-- Migration: Add pausedAt column to RentSubscription
-- Date: 2025-10-09
-- Purpose: Ensure webhook handler can set pausedAt when subscriptions hit retry limit.

DO $$
BEGIN
    -- Add snake_case column name commonly used in DB schemas if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'RentSubscription'
          AND column_name = 'pausedAt'
    ) THEN
        ALTER TABLE public."RentSubscription"
        ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMPTZ;
        COMMENT ON COLUMN public."RentSubscription"."pausedAt" IS 'Timestamp when a subscription was paused due to retry/failure handling';
    END IF;
    -- Also add snake_case variant for compatibility with generated code or other migrations that may use paused_at
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'RentSubscription'
          AND column_name = 'paused_at'
    ) THEN
        ALTER TABLE public."RentSubscription"
        ADD COLUMN IF NOT EXISTS "paused_at" TIMESTAMPTZ;
        COMMENT ON COLUMN public."RentSubscription"."paused_at" IS 'Timestamp when a subscription was paused due to retry/failure handling (snake_case)';
    END IF;
END$$;

-- Ensure both columns stay in sync when updates occur: create a trigger that copies between columns if both exist.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'sync_rent_subscription_paused_columns'
    ) THEN
        CREATE OR REPLACE FUNCTION sync_rent_subscription_paused_columns()
        RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
                IF (TG_NEW."pausedAt" IS NOT NULL AND TG_NEW."paused_at" IS NULL) THEN
                    NEW."paused_at" := NEW."pausedAt";
                ELSIF (TG_NEW."paused_at" IS NOT NULL AND TG_NEW."pausedAt" IS NULL) THEN
                    NEW."pausedAt" := NEW."paused_at";
                END IF;
            END IF;
            RETURN NEW;
        END;
        $$;

        -- Attach trigger if not exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger WHERE tgname = 'tr_sync_rent_subscription_paused_columns'
        ) THEN
            CREATE TRIGGER tr_sync_rent_subscription_paused_columns
            BEFORE INSERT OR UPDATE ON public."RentSubscription"
            FOR EACH ROW EXECUTE FUNCTION sync_rent_subscription_paused_columns();
        END IF;
    END IF;
END$$;
