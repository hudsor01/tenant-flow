-- Stripe Sync Engine Performance Indexes
-- Optimizes queries against stripe.* tables for common analytics operations
-- Following Phase 4 of Stripe Sync Engine Integration Plan

-- Check if stripe schema exists before creating indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'stripe') THEN
    
    -- Customer lookup optimizations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stripe' AND table_name = 'customers') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_customers_email ON stripe.customers (email)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_customers_created ON stripe.customers (created)';
    END IF;

    -- Subscription analytics optimizations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stripe' AND table_name = 'subscriptions') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer ON stripe.subscriptions (customer)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status ON stripe.subscriptions (status)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_created ON stripe.subscriptions (created)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_canceled_at ON stripe.subscriptions (canceled_at) WHERE canceled_at IS NOT NULL';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_current_period ON stripe.subscriptions (current_period_start, current_period_end)';
    END IF;

    -- Invoice revenue analytics optimizations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stripe' AND table_name = 'invoices') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_invoices_customer ON stripe.invoices (customer)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_invoices_status ON stripe.invoices (status)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_invoices_created ON stripe.invoices (created)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_invoices_paid_at ON stripe.invoices (paid_at) WHERE paid_at IS NOT NULL';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_invoices_subscription ON stripe.invoices (subscription) WHERE subscription IS NOT NULL';
    END IF;

    -- Payment method lookups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stripe' AND table_name = 'payment_methods') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_payment_methods_customer ON stripe.payment_methods (customer)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_payment_methods_type ON stripe.payment_methods (type)';
    END IF;

    -- Product and pricing lookups
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stripe' AND table_name = 'prices') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_prices_product ON stripe.prices (product)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_prices_active ON stripe.prices (active) WHERE active = true';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stripe' AND table_name = 'products') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_products_active ON stripe.products (active) WHERE active = true';
    END IF;

    -- Subscription items for MRR calculations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stripe' AND table_name = 'subscription_items') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_subscription_items_subscription ON stripe.subscription_items (subscription)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_subscription_items_price ON stripe.subscription_items (price)';
    END IF;

    -- Charges for payment analytics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stripe' AND table_name = 'charges') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_charges_customer ON stripe.charges (customer)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_charges_paid ON stripe.charges (paid)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_charges_created ON stripe.charges (created)';
    END IF;

    -- Payment intents for conversion analytics
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stripe' AND table_name = 'payment_intents') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_customer ON stripe.payment_intents (customer) WHERE customer IS NOT NULL';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_status ON stripe.payment_intents (status)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_created ON stripe.payment_intents (created)';
    END IF;

    -- Composite indexes for common analytics queries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stripe' AND table_name = 'subscriptions') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_status_created ON stripe.subscriptions (status, created)';
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer_status ON stripe.subscriptions (customer, status)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'stripe' AND table_name = 'invoices') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_stripe_invoices_status_created ON stripe.invoices (status, created)';
    END IF;

    RAISE NOTICE 'Stripe performance indexes created successfully for existing tables';
    
  ELSE
    RAISE NOTICE 'Stripe schema not found - indexes will be created when Stripe Sync Engine is set up';
  END IF;
END
$$;

-- Comments for documentation
COMMENT ON SCHEMA public IS 'Performance indexes for Stripe Sync Engine tables - created conditionally when stripe schema exists';