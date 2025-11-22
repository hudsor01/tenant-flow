To design a Supabase database schema for integrating with Stripe's subscriptions, billing, Connect, and Identity products, you should structure your tables to efficiently map Stripe entities to your application entities:

Core Tables:
customers - Map your users to Stripe customers:
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  stripe_customer_id TEXT UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

subscriptions - Track subscription details:
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  price_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

products - Store product information
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

prices - Track pricing details
CREATE TABLE public.prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_price_id TEXT UNIQUE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  currency TEXT NOT NULL,
  unit_amount INTEGER,
  type TEXT NOT NULL,
  recurring_interval TEXT,
  recurring_interval_count INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


For Connect Integration:
CREATE TABLE public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

Additional Considerations:

CREATE TABLE public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

Create RLS policies to ensure proper access control
Set up webhook handlers to keep your database in sync with Stripe events
Consider creating views for commonly accessed subscription data
Implement functions for handling subscription events (upgrades, cancellations, etc.)
For implementation guidance, see Migrate subscriptions to Stripe Billing and Create subscriptions with Stripe Billing for Connect-specific subscription handling.

To create a schema that supports your platform where subscribers can invite tenants who pay rent through Stripe, you'll need to integrate Stripe Connect, Billing, and Identity products. Here's how to structure your database:

Core Platform Tables:
users - Your platform's users


CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  stripe_customer_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
subscriptions - Platform subscriptions for landlords/property managers


CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  plan_id UUID REFERENCES public.plans(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
plans - Your subscription plans


CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  stripe_price_id TEXT UNIQUE NOT NULL,
  stripe_product_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  interval TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
Landlord-Tenant Relationship Tables:

landlords - Users with Connect accounts to receive payments


CREATE TABLE public.landlords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  identity_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
tenants - Users who pay rent


CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  identity_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

properties - Properties managed by landlords
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID REFERENCES public.landlords(id) NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


units - Individual rental units
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  unit_number TEXT,
  rent_amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


leases - Connect tenants to units with payment details
CREATE TABLE public.leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  unit_id UUID REFERENCES public.units(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount INTEGER NOT NULL,
  rent_currency TEXT NOT NULL DEFAULT 'usd',
  payment_day INTEGER NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

identity_verifications - Track verification status
CREATE TABLE public.identity_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  stripe_verification_session_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

payments - Track rent payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  application_fee_amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

Key Implementation Notes:
Use Stripe Connect to onboard landlords as connected accounts
Use Stripe Identity for tenant and landlord verification
Implement webhook handlers to track verification status, payment successes/failures
Create a trigger to automatically generate monthly payment intents for each active lease
Consider Stripe Radar for fraud prevention on rent payments






CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_customer_id TEXT NOT NULL,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  last_four TEXT,
  bank_name TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.bank_account_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_method_id UUID REFERENCES public.payment_methods(id) NOT NULL,
  stripe_bank_account_id TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  microdeposit_type TEXT,
  microdeposit_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_product_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_price_id TEXT UNIQUE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  unit_amount INTEGER NOT NULL,
  interval TEXT NOT NULL,
  interval_count INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.subscription_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES public.subscriptions(id) NOT NULL,
  stripe_subscription_item_id TEXT UNIQUE NOT NULL,
  price_id UUID REFERENCES public.prices(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL UNIQUE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_type TEXT NOT NULL, -- 'standard', 'express', or 'custom'
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  requirements JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.account_capabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connected_account_id UUID REFERENCES public.connected_accounts(id) NOT NULL,
  capability_name TEXT NOT NULL,
  status TEXT NOT NULL,
  requirements JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connected_account_id, capability_name)
);

CREATE TABLE public.connected_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connected_account_id UUID REFERENCES public.connected_accounts(id) NOT NULL,
  customer_id UUID REFERENCES public.users(id) NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connected_account_id, customer_id)
);

CREATE TABLE public.payment_flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES public.users(id) NOT NULL,
  connected_account_id UUID REFERENCES public.connected_accounts(id) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  application_fee_amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  payment_method_id UUID REFERENCES public.payment_methods(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.mandates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_method_id UUID REFERENCES public.payment_methods(id) NOT NULL,
  stripe_mandate_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  type TEXT NOT NULL,
  payment_method_type TEXT NOT NULL,
  multi_use BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

Important Implementation Notes:

Add index for foreign keys and frequently queried fields
For ACH Direct Debit, ensure you track the mandate and verification status
Store webhook events to audit/reconcile system state
Request the us_bank_account_ach_payments capability for Connect accounts
Create RLS policies to secure access to sensitive payment data

Here's a detailed database schema focused specifically on ACH Direct Debit payment flows and Connect marketplace implementation requirements:

**ACH Direct Debit Core Tables:**

- **bank_accounts** - Store verified bank account details
  ```sql
  CREATE TABLE public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    stripe_bank_account_id TEXT UNIQUE NOT NULL,
    last_four TEXT NOT NULL,
    bank_name TEXT,
    account_holder_name TEXT NOT NULL,
    account_holder_type TEXT NOT NULL, -- 'individual' or 'company'
    account_type TEXT NOT NULL, -- 'checking' or 'savings'
    routing_number TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'unverified', -- 'unverified', 'pending', 'verified', 'failed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **ach_verification_attempts** - Track microdeposit verification attempts
  ```sql
  CREATE TABLE public.ach_verification_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID REFERENCES public.bank_accounts(id) NOT NULL,
    verification_method TEXT NOT NULL DEFAULT 'microdeposit', -- 'microdeposit', 'instant'
    status TEXT NOT NULL, -- 'pending', 'succeeded', 'failed'
    stripe_verification_id TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    attempts_remaining INTEGER DEFAULT 3
  );
  ```

- **ach_mandates** - Store authorization mandates
  ```sql
  CREATE TABLE public.ach_mandates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID REFERENCES public.bank_accounts(id) NOT NULL,
    stripe_mandate_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL, -- 'pending', 'active', 'inactive', 'revoked'
    customer_acceptance JSONB NOT NULL, -- Store IP, timestamp, user agent
    mandate_text TEXT NOT NULL, -- Full mandate text shown to customer
    accepted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Connect Platform ACH Implementation:**

- **connected_accounts** - Stripe Connect accounts
  ```sql
  CREATE TABLE public.connected_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    stripe_account_id TEXT UNIQUE NOT NULL,
    account_type TEXT NOT NULL, -- 'standard', 'express', 'custom'
    charges_enabled BOOLEAN DEFAULT FALSE,
    payouts_enabled BOOLEAN DEFAULT FALSE,
    ach_direct_debit_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **account_capabilities** - Track account capabilities including ACH
  ```sql
  CREATE TABLE public.account_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connected_account_id UUID REFERENCES public.connected_accounts(id) NOT NULL,
    capability TEXT NOT NULL, -- 'us_bank_account_ach_payments', 'transfers', etc.
    status TEXT NOT NULL, -- 'active', 'inactive', 'pending'
    requirements JSONB, -- Store required fields for activation
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(connected_account_id, capability)
  );
  ```

- **connected_bank_accounts** - Bank accounts associated with connected accounts
  ```sql
  CREATE TABLE public.connected_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connected_account_id UUID REFERENCES public.connected_accounts(id) NOT NULL,
    stripe_external_account_id TEXT UNIQUE NOT NULL,
    account_holder_name TEXT NOT NULL,
    account_holder_type TEXT NOT NULL,
    last_four TEXT NOT NULL,
    bank_name TEXT,
    routing_number TEXT NOT NULL,
    default_for_currency BOOLEAN DEFAULT FALSE,
    currency TEXT NOT NULL DEFAULT 'usd',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Payment Flow Tables:**

- **ach_payment_intents** - Track ACH payment intents
  ```sql
  CREATE TABLE public.ach_payment_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.users(id) NOT NULL,
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL, -- 'requires_payment_method', 'requires_confirmation', 'processing', 'requires_action', 'succeeded', 'canceled', 'failed'
    bank_account_id UUID REFERENCES public.bank_accounts(id) NOT NULL,
    mandate_id UUID REFERENCES public.ach_mandates(id) NOT NULL,
    description TEXT,
    connected_account_id UUID REFERENCES public.connected_accounts(id), -- NULL for direct, non-Connect charges
    application_fee_amount INTEGER, -- Only for Connect charges
    transfer_data JSONB, -- For destination charges
    settlement_type TEXT DEFAULT 'standard', -- 'standard' (T+4) or 'faster' (T+2)
    expected_arrival_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **ach_payment_attempts** - Track processing states
  ```sql
  CREATE TABLE public.ach_payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_intent_id UUID REFERENCES public.ach_payment_intents(id) NOT NULL,
    stripe_charge_id TEXT UNIQUE,
    status TEXT NOT NULL, -- 'processing', 'succeeded', 'failed', 'canceled'
    failure_reason TEXT,
    failure_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **ach_payment_notifications** - Track notification emails
  ```sql
  CREATE TABLE public.ach_payment_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_intent_id UUID REFERENCES public.ach_payment_intents(id) NOT NULL,
    notification_type TEXT NOT NULL, -- 'pre_debit', 'success', 'failure'
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
    recipient_email TEXT NOT NULL,
    template_used TEXT NOT NULL,
    sent_by TEXT NOT NULL, -- 'platform', 'stripe'
    stripe_notification_id TEXT
  );
  ```

**Connect ACH Direct Debit Marketplace Tables:**

- **marketplace_customers** - Map platform customers to connected accounts
  ```sql
  CREATE TABLE public.marketplace_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_customer_id UUID REFERENCES public.users(id) NOT NULL,
    connected_account_id UUID REFERENCES public.connected_accounts(id) NOT NULL,
    stripe_customer_id TEXT NOT NULL, -- Customer ID in the connected account
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform_customer_id, connected_account_id)
  );
  ```

- **marketplace_payment_methods** - Payment methods shared with connected accounts
  ```sql
  CREATE TABLE public.marketplace_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bank_account_id UUID REFERENCES public.bank_accounts(id) NOT NULL,
    marketplace_customer_id UUID REFERENCES public.marketplace_customers(id) NOT NULL,
    stripe_payment_method_id TEXT NOT NULL, -- Payment method in connected account
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(bank_account_id, marketplace_customer_id)
  );
  ```

- **ach_settlement_schedules** - Track settlement timing preferences
  ```sql
  CREATE TABLE public.ach_settlement_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connected_account_id UUID REFERENCES public.connected_accounts(id) NOT NULL,
    settlement_type TEXT NOT NULL, -- 'standard' (T+4) or 'faster' (T+2)
    eligible_for_faster_settlement BOOLEAN NOT NULL DEFAULT FALSE,
    faster_settlement_enabled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **webhook_events** - Track all ACH-related webhook events
  ```sql
  CREATE TABLE public.webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    object_id TEXT NOT NULL,
    object_type TEXT NOT NULL,
    account TEXT, -- Connected account ID or NULL for platform
    api_version TEXT NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_errors TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
  );
  ```

**Implementation Recommendations:**

1. **Critical Indexes**:
   ```sql
   CREATE INDEX idx_bank_accounts_user_id ON public.bank_accounts(user_id);
   CREATE INDEX idx_ach_payment_intents_customer_id ON public.ach_payment_intents(customer_id);
   CREATE INDEX idx_ach_payment_intents_status ON public.ach_payment_intents(status);
   CREATE INDEX idx_ach_mandates_bank_account_id ON public.ach_mandates(bank_account_id);
   CREATE INDEX idx_webhook_events_event_type ON public.webhook_events(event_type);
   CREATE INDEX idx_webhook_events_processed ON public.webhook_events(processed);
   ```

2. **Important Constraints**:
   - Add check constraints for valid statuses
   - Add check constraints for amount fields (> 0)

3. For the Connect implementation:
   - Request `us_bank_account_ach_payments` capability for each connected account
   - Monitor `capability.updated` webhook events to track when the capability is approved
   - For Standard and Express accounts, request from the Dashboard
   - For Custom accounts, request through API

See [ACH Direct Debit](https://docs.stripe.com/payments/ach-direct-debit) for more details on payment flows and settlement timings, and [Payment method support for platforms and marketplaces](https://docs.stripe.com/payments/payment-methods/payment-method-connect-support) for specific Connect implementation requirements.



----END-OF-BATCH-1----

Here's an expanded schema to support all those Stripe products, along with considerations for using React.js components and embedded elements:

**Core User and Authentication Tables:**

- **users** - Platform users
  ```sql
  CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    stripe_customer_id TEXT UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Stripe Identity Tables:**

- **identity_verifications** - Track verification sessions
  ```sql
  CREATE TABLE public.identity_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    stripe_verification_session_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL, -- 'requires_input', 'processing', 'verified', 'canceled'
    type TEXT NOT NULL, -- 'document', 'id_number'
    last_error TEXT,
    verification_report_id TEXT,
    client_secret TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **identity_reports** - Store verification results
  ```sql
  CREATE TABLE public.identity_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    verification_id UUID REFERENCES public.identity_verifications(id) NOT NULL,
    stripe_verification_report_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Stripe Radar and Fraud Prevention:**

- **radar_reviews** - Store review outcomes
  ```sql
  CREATE TABLE public.radar_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_review_id TEXT UNIQUE NOT NULL,
    payment_intent_id TEXT,
    user_id UUID REFERENCES public.users(id),
    reason TEXT NOT NULL, -- 'rule', 'manual', 'blocked_payment'
    status TEXT NOT NULL, -- 'open', 'approved', 'disputed', 'refunded', 'lost'
    opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **risk_scores** - Track risk evaluation
  ```sql
  CREATE TABLE public.risk_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    payment_intent_id TEXT,
    score INTEGER,
    risk_level TEXT NOT NULL, -- 'normal', 'elevated', 'highest'
    evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    factors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Stripe Link and Customer Experience:**

- **link_accounts** - Track Link-enabled users
  ```sql
  CREATE TABLE public.link_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    link_consumer_id TEXT,
    email_address TEXT NOT NULL,
    is_link_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
  );
  ```

- **saved_payment_methods** - Store payment methods with Link
  ```sql
  CREATE TABLE public.saved_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    stripe_payment_method_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'card', 'us_bank_account', etc.
    details JSONB NOT NULL, -- Last4, brand, etc.
    is_default BOOLEAN DEFAULT FALSE,
    is_saved_to_link BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Stripe Financial Connections:**

- **financial_connections_sessions** - Track account linking sessions
  ```sql
  CREATE TABLE public.financial_connections_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    stripe_session_id TEXT UNIQUE NOT NULL,
    client_secret TEXT NOT NULL,
    status TEXT NOT NULL, -- 'requires_action', 'succeeded', 'canceled'
    accounts_linked TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **financial_accounts** - Store linked financial accounts
  ```sql
  CREATE TABLE public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    stripe_financial_account_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    institution_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'cash', 'credit', 'investment'
    subcategory TEXT, -- 'checking', 'savings', 'mortgage'
    status TEXT NOT NULL, -- 'active', 'disconnected', 'inactive'
    last_synced_at TIMESTAMP WITH TIME ZONE,
    balance_amount INTEGER,
    balance_currency TEXT DEFAULT 'usd',
    permissions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Stripe Billing and Subscriptions:**

- **billing_products** - Products offered
  ```sql
  CREATE TABLE public.billing_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_product_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    statement_descriptor TEXT,
    tax_code TEXT, -- For Automatic Tax
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **billing_prices** - Product pricing
  ```sql
  CREATE TABLE public.billing_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_price_id TEXT UNIQUE NOT NULL,
    product_id UUID REFERENCES public.billing_products(id) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    unit_amount INTEGER,
    recurring_interval TEXT, -- 'day', 'week', 'month', 'year'
    recurring_interval_count INTEGER,
    usage_type TEXT, -- 'licensed', 'metered'
    billing_scheme TEXT, -- 'per_unit', 'tiered'
    tier_mode TEXT, -- 'graduated', 'volume'
    tiers JSONB,
    tax_behavior TEXT, -- 'inclusive', 'exclusive', 'unspecified'
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **billing_subscriptions** - User subscriptions
  ```sql
  CREATE TABLE public.billing_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL,
    current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancel_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    default_payment_method_id TEXT,
    latest_invoice_id TEXT,
    collection_method TEXT, -- 'charge_automatically', 'send_invoice'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **billing_subscription_items** - Items in subscriptions
  ```sql
  CREATE TABLE public.billing_subscription_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES public.billing_subscriptions(id) NOT NULL,
    stripe_subscription_item_id TEXT UNIQUE NOT NULL,
    price_id UUID REFERENCES public.billing_prices(id) NOT NULL,
    quantity INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Stripe Automatic Tax:**

- **tax_ids** - Store tax identification numbers
  ```sql
  CREATE TABLE public.tax_ids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    stripe_tax_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'eu_vat', 'nz_gst', 'au_abn', etc.
    value TEXT NOT NULL,
    country TEXT,
    verification_status TEXT, -- 'pending', 'verified', 'unverified'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **tax_registrations** - Track tax registrations
  ```sql
  CREATE TABLE public.tax_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connected_account_id UUID REFERENCES public.connected_accounts(id),
    country TEXT NOT NULL,
    jurisdiction TEXT NOT NULL,
    registration_type TEXT NOT NULL, -- 'vat', 'gst', 'sales_tax'
    registration_number TEXT NOT NULL,
    active_from DATE NOT NULL,
    active_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **tax_calculations** - Store tax calculation results
  ```sql
  CREATE TABLE public.tax_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_tax_calculation_id TEXT UNIQUE NOT NULL,
    invoice_id TEXT,
    payment_intent_id TEXT,
    tax_breakdown JSONB NOT NULL,
    tax_date DATE NOT NULL,
    shipping_cost INTEGER,
    customer_details JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Stripe Payments & Checkout:**

- **payment_sessions** - Track checkout sessions
  ```sql
  CREATE TABLE public.payment_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    stripe_checkout_session_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL, -- 'open', 'complete', 'expired'
    mode TEXT NOT NULL, -- 'payment', 'subscription', 'setup'
    client_reference_id TEXT,
    success_url TEXT NOT NULL,
    cancel_url TEXT NOT NULL,
    amount_total INTEGER,
    currency TEXT,
    payment_intent_id TEXT,
    subscription_id TEXT,
    payment_status TEXT, -- 'paid', 'unpaid', 'no_payment_required'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **payment_elements** - Track Payment Element instances
  ```sql
  CREATE TABLE public.payment_elements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    stripe_intent_client_secret TEXT NOT NULL,
    intent_type TEXT NOT NULL, -- 'payment_intent', 'setup_intent'
    stripe_intent_id TEXT NOT NULL,
    status TEXT NOT NULL,
    return_url TEXT,
    appearance_theme TEXT, -- 'stripe', 'night', 'flat', 'none'
    custom_appearance JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Connect Platform and Embedded Components:**

- **connect_account_sessions** - For Connect embedded components
  ```sql
  CREATE TABLE public.connect_account_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) NOT NULL,
    stripe_account_id TEXT NOT NULL,
    client_secret TEXT NOT NULL,
    components TEXT[] NOT NULL, -- Array of enabled components
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **connect_embedded_interactions** - Track component usage
  ```sql
  CREATE TABLE public.connect_embedded_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.connect_account_sessions(id) NOT NULL,
    component TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'viewed', 'completed', 'exited'
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

- **connect_payouts** - Track payouts to connected accounts
  ```sql
  CREATE TABLE public.connect_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connected_account_id UUID REFERENCES public.connected_accounts(id) NOT NULL,
    stripe_payout_id TEXT UNIQUE NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    arrival_date DATE NOT NULL,
    status TEXT NOT NULL, -- 'paid', 'pending', 'in_transit', 'canceled', 'failed'
    type TEXT NOT NULL, -- 'bank_account', 'card', 'fpx'
    method TEXT NOT NULL, -- 'standard', 'instant'
    statement_descriptor TEXT,
    destination TEXT, -- External account ID
    failure_code TEXT,
    failure_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**React Integration Tracking:**

- **ui_component_events** - Track React component interactions
  ```sql
  CREATE TABLE public.ui_component_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    session_id TEXT NOT NULL,
    component_type TEXT NOT NULL, -- 'PaymentElement', 'ExpressCheckout', etc.
    event_name TEXT NOT NULL, -- 'mounted', 'ready', 'focus', 'blur', 'change', 'error', etc.
    event_data JSONB DEFAULT '{}'::jsonb,
    browser TEXT,
    device TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

**Integration Configuration:**

```sql
CREATE TABLE public.integration_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configurations
INSERT INTO public.integration_settings (name, value, description)
VALUES
  ('stripe_elements_appearance', '{"theme": "stripe", "variables": {"colorPrimary": "#0570de"}}', 'Default appearance for Stripe Elements'),
  ('checkout_settings', '{"allow_promotion_codes": true, "billing_address_collection": "auto", "shipping_address_collection": null}', 'Default settings for Checkout Sessions'),
  ('payment_element_settings', '{"layout": "tabs", "paymentMethodOrder": ["card", "apple_pay", "google_pay", "us_bank_account"]}', 'Configuration for Payment Element');
```

**React Integration Key Points:**

1. **Embedded Components Setup:**
   - Use `@stripe/react-stripe-js` for Elements
   - Use `@stripe/connect-js` and `@stripe/react-connect-js` for Connect embedded components

2. **Required Node.js Environment Variables:**
   ```
   STRIPE_SECRET_KEY=sk_test_[your-stripe-secret-key]
   STRIPE_PUBLISHABLE_KEY=pk_test_[your-stripe-publishable-key]
   STRIPE_WEBHOOK_SECRET=whsec_[your-webhook-secret]
   STRIPE_CONNECT_CLIENT_ID=ca_[your-connect-client-id]
   ```

3. **Backend Server Routes:**
   - Create API endpoints for each Stripe product's client-side initialization
   - Create webhook handling for all event types

4. **Frontend React Component Structure:**
   ```
   /components
     /stripe
       /elements
         PaymentForm.tsx
         SubscriptionForm.tsx
         SavedPaymentMethods.tsx
       /checkout
         CheckoutButton.tsx
       /connect
         AccountOnboarding.tsx
         ConnectDashboard.tsx
       /identity
         IdentityVerification.tsx
       /financial-connections
         AccountLinking.tsx
   ```

**Comprehensive Integration Implementation Plan:**

1. **Setup Stripe Node SDK:**
   ```javascript
   import Stripe from 'stripe';

   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
     apiVersion: '2023-10-16', // Use latest stable API version
     appInfo: {
       name: 'YourAppName',
       version: '1.0.0'
     }
   });
   ```

2. **Implement Express/NestJS Middleware for Webhooks:**
   ```javascript
   app.post('/webhooks', express.raw({type: 'application/json'}), async (req, res) => {
     const sig = req.headers['stripe-signature'];
     let event;

     try {
       event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
     } catch (err) {
       return res.status(400).send(`Webhook Error: ${err.message}`);
     }

     // Handle specific events
     switch (event.type) {
       case 'payment_intent.succeeded':
         // Handle payment success
         break;
       case 'identity.verification_session.verified':
         // Handle identity verification
         break;
       // Handle other events
     }

     res.json({received: true});
   });
   ```

3. **Setup React Components for Elements:**
   ```jsx
   import {Elements} from '@stripe/react-stripe-js';
   import {loadStripe} from '@stripe/stripe-js';

   const stripePromise = loadStripe('pk_test_51Rd0qyP3WCR53Sdo4OKIJtbPiEBJHExhH4KAI2DMHTastoC5IPAIZaJZfbg7C5akPEVzQek4NFtdB4Jcg5pcLrB600nVJyHqao');

   function PaymentForm() {
     const options = {
       mode: 'payment',
       amount: 1099,
       currency: 'usd',
       appearance: { /* ... */ },
     };

     return (
       <Elements stripe={stripePromise} options={options}>
         <PaymentElementForm />
       </Elements>
     );
   }
   ```

4. **Setup Connect Embedded Components:**
   ```jsx
   import {StripeConnect, AccountOnboardingElement} from '@stripe/react-connect-js';

   function OnboardingPage() {
     return (
       <StripeConnect publishableKey="pk_test_51Rd0qyP3WCR53Sdo4OKIJtbPiEBJHExhH4KAI2DMHTastoC5IPAIZaJZfbg7C5akPEVzQek4NFtdB4Jcg5pcLrB600nVJyHqao" clientSecret="cas_123">
         <AccountOnboardingElement
           onExit={(result) => {
             if (result.completed) {
               // Handle completion
             }
           }}
         />
       </StripeConnect>
     );
   }
   ```

**Implementation Checklist:**

- [ ] Set up database schema
- [ ] Configure Stripe API keys and webhook endpoints
- [ ] Implement webhook handlers for each product
- [ ] Set up React components for Elements
- [ ] Configure Connect embedded components
- [ ] Implement Identity verification flow
- [ ] Configure Automatic Tax
- [ ] Set up Financial Connections
- [ ] Add Link integration
- [ ] Configure Radar rules
- [ ] Set up Billing subscriptions
- [ ] Implement payment flows
- [ ] Add Connect onboarding
- [ ] Configure payout schedules

See [Stripe Web Elements](https://docs.stripe.com/payments/elements) for guidance on implementing UI components and [Connect embedded components](https://docs.stripe.com/connect/supported-embedded-components?platform=web) for Connect UI integration.

----END-OF-BATCH-2------

# Connected Account Onboarding Optimization

To create a seamless onboarding experience for connected accounts with high conversion and low churn, implement these key components:

## Database Schema

```sql
-- Core onboarding tracking table
CREATE TABLE public.connected_account_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  stripe_account_id TEXT UNIQUE NOT NULL,
  onboarding_status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed', 'rejected'
  completion_percentage INTEGER DEFAULT 0,
  onboarding_started_at TIMESTAMP WITH TIME ZONE,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  last_session_at TIMESTAMP WITH TIME ZONE,
  current_step TEXT,
  requirements_due TEXT[],
  requirements_errors TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track onboarding sessions
CREATE TABLE public.onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connected_account_id UUID REFERENCES public.connected_account_onboarding(id) NOT NULL,
  stripe_account_link_id TEXT UNIQUE,
  type TEXT NOT NULL, -- 'account_onboarding', 'account_update'
  url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  collection_mode TEXT NOT NULL, -- 'currently_due', 'eventually_due'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track onboarding step completion
CREATE TABLE public.onboarding_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connected_account_id UUID REFERENCES public.connected_account_onboarding(id) NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed'
  completed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connected_account_id, step_name)
);

-- Incentive program for onboarding
CREATE TABLE public.onboarding_incentives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connected_account_id UUID REFERENCES public.connected_account_onboarding(id) NOT NULL,
  incentive_type TEXT NOT NULL, -- 'fee_discount', 'cash_bonus', 'free_period'
  amount INTEGER,
  currency TEXT DEFAULT 'usd',
  percentage INTEGER,
  duration TEXT, -- 'one_time', '3_months', 'forever'
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding communications
CREATE TABLE public.onboarding_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connected_account_id UUID REFERENCES public.connected_account_onboarding(id) NOT NULL,
  communication_type TEXT NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  template TEXT NOT NULL,
  status TEXT NOT NULL, -- 'queued', 'sent', 'delivered', 'failed', 'opened'
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Server-Side Implementation

### 1. Account Creation with Pre-filled Information

```javascript
// Create a pre-filled connected account
async function createConnectedAccount(userData) {
  try {
    const account = await stripe.accounts.create({
      type: 'standard', // or 'express' or 'custom'
      country: userData.country,
      email: userData.email,
      business_type: userData.businessType || 'individual',
      // Pre-fill as much information as possible
      individual: {
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone
      },
      business_profile: {
        name: userData.businessName,
        url: userData.websiteUrl,
        mcc: userData.merchantCategoryCode || '5734' // Default to computer software
      },
      capabilities: {
        card_payments: {requested: true},
        transfers: {requested: true},
        us_bank_account_ach_payments: {requested: true}
      },
      metadata: {
        user_id: userData.userId
      }
    });

    // Store in database
    await db.connected_account_onboarding.insert({
      user_id: userData.userId,
      stripe_account_id: account.id,
      onboarding_status: 'not_started'
    });

    return account;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
}
```

### 2. Optimized Account Link Creation

```javascript
// Create account link with proper collection mode
async function createOptimizedAccountLink(accountId, userId) {
  try {
    // Get account to check requirements
    const account = await stripe.accounts.retrieve(accountId);

    // Determine if we should collect all fields or just what's required now
    const hasActivePayments = await hasProcessedPayments(accountId);
    const collectionMode = hasActivePayments ? 'currently_due' : 'eventually_due';

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.BASE_URL}/onboarding/refresh?account_id=${accountId}`,
      return_url: `${process.env.BASE_URL}/onboarding/complete?account_id=${accountId}`,
      type: 'account_onboarding',
      collect: collectionMode,
    });

    // Store session details
    await db.onboarding_sessions.insert({
      connected_account_id: await getOnboardingIdFromStripeId(accountId),
      stripe_account_link_id: accountLink.id,
      type: 'account_onboarding',
      url: accountLink.url,
      expires_at: new Date(Date.now() + 15 * 60000), // 15 minutes
      collection_mode: collectionMode
    });

    // Update tracking
    await db.connected_account_onboarding.update(
      { stripe_account_id: accountId },
      {
        onboarding_status: 'in_progress',
        onboarding_started_at: account.requirements.currently_due.length ? null : new Date(),
        last_session_at: new Date()
      }
    );

    return accountLink;
  } catch (error) {
    console.error('Error creating account link:', error);
    throw error;
  }
}
```

### 3. Webhook Handler for Requirement Updates

```javascript
// Handle account.updated webhook
async function handleAccountUpdated(event) {
  const account = event.data.object;
  const accountId = account.id;

  // Get current onboarding record
  const onboarding = await db.connected_account_onboarding.findOne({
    stripe_account_id: accountId
  });

  if (!onboarding) return;

  // Calculate completion percentage based on requirements
  const totalRequirements = account.requirements.eventually_due.length +
                           account.requirements.currently_due.length +
                           account.requirements.past_due.length;

  const completedRequirements = Math.max(
    0,
    initialRequirementsCount(account.business_type, account.country) - totalRequirements
  );

  const completionPercentage = totalRequirements === 0
    ? 100
    : Math.floor((completedRequirements / initialRequirementsCount(account.business_type, account.country)) * 100);

  // Update onboarding status
  const updates = {
    requirements_due: [
      ...account.requirements.currently_due,
      ...account.requirements.eventually_due,
      ...account.requirements.past_due
    ],
    completion_percentage: completionPercentage,
    updated_at: new Date()
  };

  // Check if onboarding is completed
  if (account.charges_enabled && account.details_submitted) {
    updates.onboarding_status = 'completed';
    updates.onboarding_completed_at = new Date();

    // Trigger completion incentive if eligible
    await triggerCompletionIncentive(onboarding.id);

    // Send welcome message
    await sendOnboardingCommunication(onboarding.id, 'welcome_completed');
  } else if (account.requirements.disabled_reason) {
    updates.onboarding_status = 'rejected';
    updates.requirements_errors = [account.requirements.disabled_reason];

    // Send recovery communication
    await sendOnboardingCommunication(onboarding.id, 'verification_failed');
  }

  await db.connected_account_onboarding.update(
    { id: onboarding.id },
    updates
  );

  // If incomplete, send reminder after 24 hours of inactivity
  if (updates.onboarding_status !== 'completed' && updates.onboarding_status !== 'rejected') {
    scheduleReminder(onboarding.id, '24h');
  }
}
```

## Client-Side Integration

### 1. React Component for Onboarding Flow

```jsx
import { useState, useEffect } from 'react';
import { useStripeConnect } from '@stripe/react-connect-js';

function OnboardingFlow({ userId }) {
  const [onboardingData, setOnboardingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get or create onboarding session
  useEffect(() => {
    async function fetchOnboardingSession() {
      try {
        setLoading(true);
        const response = await fetch('/api/connect/onboarding/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });

        if (!response.ok) throw new Error('Failed to create session');

        const data = await response.json();
        setOnboardingData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOnboardingSession();
  }, [userId]);

  // Handle redirect to Stripe
  const handleContinueOnboarding = () => {
    if (onboardingData?.accountLinkUrl) {
      window.location.href = onboardingData.accountLinkUrl;
    }
  };

  // Show embedded component for custom accounts if available
  if (onboardingData?.accountType === 'custom' && onboardingData?.clientSecret) {
    return (
      <div className="onboarding-container">
        <h2>Complete your account setup</h2>
        <StripeConnect
          publishableKey={process.env.NEXT_PUBLIC_STRIPE_KEY}
          clientSecret={onboardingData.clientSecret}
        >
          <AccountOnboardingElement
            options={{
              elementsOptions: {
                appearance: {
                  theme: 'flat',
                  variables: {
                    colorPrimary: '#5469d4',
                  }
                }
              }
            }}
            onExit={(result) => {
              if (result.completed) {
                window.location.href = '/dashboard';
              } else {
                // Save progress
                fetch('/api/connect/onboarding/progress', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId,
                    progress: result.progress
                  })
                });
              }
            }}
          />
        </StripeConnect>
      </div>
    );
  }

  // Show redirect button for Standard/Express accounts
  return (
    <div className="onboarding-container">
      <h2>Set up your payments account</h2>

      {loading ? (
        <div className="loader">Loading your personalized setup...</div>
      ) : error ? (
        <div className="error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <div className="onboarding-card">
          <div className="progress-indicator">
            <div
              className="progress-bar"
              style={{width: `${onboardingData?.completionPercentage || 0}%`}}
            />
            <span>{onboardingData?.completionPercentage || 0}% Complete</span>
          </div>

          <div className="onboarding-steps">
            {onboardingData?.requiredSteps?.map(step => (
              <div
                key={step.id}
                className={`step ${step.completed ? 'completed' : 'pending'}`}
              >
                <span className="step-icon">
                  {step.completed ? '✓' : step.number}
                </span>
                <span className="step-name">{step.name}</span>
              </div>
            ))}
          </div>

          <button
            className="primary-button"
            onClick={handleContinueOnboarding}
            disabled={loading}
          >
            Continue Setup
          </button>

          {onboardingData?.incentiveOffer && (
            <div className="incentive-banner">
              <span className="incentive-icon">🎁</span>
              <span className="incentive-text">
                {onboardingData.incentiveOffer.description}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## Optimization Strategies

### 1. Multi-Channel Communication System

```javascript
async function sendOnboardingCommunication(onboardingId, templateName) {
  const onboarding = await db.connected_account_onboarding.findOne({
    id: onboardingId
  });

  const user = await db.users.findOne({
    id: onboarding.user_id
  });

  // Determine best channel based on user preferences and engagement data
  const channels = determineOptimalChannels(user);

  for (const channel of channels) {
    const template = await getTemplateContent(templateName, channel);

    // Personalize template
    const content = personalizeTemplate(template, {
      firstName: user.first_name,
      businessName: user.business_name,
      completionPercentage: onboarding.completion_percentage,
      remainingSteps: onboarding.requirements_due.length,
      accountLink: await generateFreshAccountLink(onboarding.stripe_account_id),
      incentiveDetails: await getActiveIncentive(onboardingId)
    });

    // Send through appropriate channel
    switch (channel) {
      case 'email':
        await sendEmail(user.email, content);
        break;
      case 'sms':
        await sendSMS(user.phone, content);
        break;
      case 'push':
        await sendPushNotification(user.device_tokens, content);
        break;
      case 'in_app':
        await createInAppNotification(user.id, content);
        break;
    }

    // Record communication
    await db.onboarding_communications.insert({
      connected_account_id: onboardingId,
      communication_type: channel,
      template: templateName,
      status: 'sent',
      sent_at: new Date(),
      metadata: { content }
    });
  }
}
```

### 2. Progressive Information Collection

```javascript
// Get user trust score to determine collection approach
async function determineCollectionStrategy(userId) {
  // Calculate trust score based on:
  // 1. User activity history
  // 2. Identity verification status
  // 3. Payment history
  // 4. Platform usage metrics
  const trustScore = await calculateUserTrustScore(userId);

  if (trustScore >= 80) {
    // High trust - minimal upfront collection
    return {
      collection_mode: 'currently_due',
      verification_level: 'basic',
      deferred_fields: true
    };
  } else if (trustScore >= 50) {
    // Medium trust - standard collection
    return {
      collection_mode: 'currently_due',
      verification_level: 'standard',
      deferred_fields: false
    };
  } else {
    // Low trust - comprehensive collection
    return {
      collection_mode: 'eventually_due',
      verification_level: 'comprehensive',
      deferred_fields: false
    };
  }
}
```

### 3. Intelligent Retry and Recovery System

```javascript
// Detect stuck onboarding processes and take action
async function recoverStuckOnboarding() {
  // Find accounts stuck in onboarding
  const stuckAccounts = await db.connected_account_onboarding.find({
    onboarding_status: 'in_progress',
    last_session_at: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } // 3 days inactive
  });

  for (const account of stuckAccounts) {
    // Check if we've already sent recovery communications
    const recoveryAttempts = await db.onboarding_communications.count({
      connected_account_id: account.id,
      template: { $like: '%recovery%' }
    });

    if (recoveryAttempts >= 3) continue; // Don't over-communicate

    // Retrieve account details to understand the blocker
    const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);

    // Identify specific blocking requirements
    const blockers = identifyBlockingRequirements(stripeAccount.requirements);

    // Generate personalized recovery message
    const template = determineRecoveryTemplate(blockers, recoveryAttempts);

    // Generate new account link
    const accountLink = await createOptimizedAccountLink(account.stripe_account_id, account.user_id);

    // Send personalized recovery message
    await sendOnboardingCommunication(account.id, template);

    // Update tracking
    await db.connected_account_onboarding.update(
      { id: account.id },
      {
        recovery_attempts: recoveryAttempts + 1,
        last_recovery_at: new Date()
      }
    );
  }
}
```

### 4. Incentive Management System

```javascript
// Create incentive for onboarding completion
async function createOnboardingIncentive(onboardingId, incentiveType) {
  const baseIncentives = {
    fee_discount: { percentage: 50, duration: '3_months' },
    cash_bonus: { amount: 1000, currency: 'usd' },
    free_period: { duration: '2_months' }
  };

  const incentive = baseIncentives[incentiveType];

  // Customize based on account potential
  const accountScore = await calculateAccountPotential(onboardingId);
  if (accountScore >= 80) {
    // High value account - increase incentive
    if (incentiveType === 'fee_discount') {
      incentive.duration = '6_months';
    } else if (incentiveType === 'cash_bonus') {
      incentive.amount = 2500;
    } else if (incentiveType === 'free_period') {
      incentive.duration = '3_months';
    }
  }

  // Create the incentive record
  await db.onboarding_incentives.insert({
    connected_account_id: onboardingId,
    incentive_type: incentiveType,
    ...incentive,
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
  });
}
```

## Best Practices for Conversion Optimization

1. **Pre-fill Every Possible Field**
   - Collect and pass business information you already have
   - Use address validation APIs to ensure addresses pass verification
   - Normalize phone numbers to E.164 format

2. **Implement Smart Onboarding Tracking**
   - Track individual fields completed vs. skipped
   - Measure time spent on each section
   - Identify where users drop off

3. **Provide Real-time Support**
   - Embed chat support directly in onboarding flow
   - Offer document upload assistance
   - Proactively reach out when users spend too long on a section

4. **Use Social Proof and Progress Indicators**
   - Show number of businesses onboarded
   - Display average completion time
   - Highlight benefits gained by completing each section

5. **Create a Multi-stage Recovery Pipeline**
   ```
   24h after abandonment → Email reminder with direct link
   48h after abandonment → SMS with simplified instructions
   72h after abandonment → Incentive offer to complete
   7d after abandonment → Phone call from account manager
   ```

For implementation guidance, see [Financial Accounts for platforms connected account onboarding guide](https://docs.stripe.com/financial-accounts/connect/examples/onboarding-guide) and [Stripe hosted onboarding for Custom accounts](https://docs.stripe.com/connect/custom/hosted-onboarding).

# Connected Account Onboarding for Real Estate SaaS

For a real estate SaaS platform where users are primarily individuals (landlords, property owners) rather than businesses, here's an optimized onboarding approach:

## Database Schema

```sql
-- Core user profiles
CREATE TABLE public.property_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  owner_type TEXT NOT NULL, -- 'individual', 'small_landlord', 'property_manager'
  properties_count INTEGER DEFAULT 0,
  units_count INTEGER DEFAULT 0,
  estimated_annual_rent INTEGER,
  stripe_customer_id TEXT UNIQUE,
  stripe_account_id TEXT UNIQUE,
  tax_id_provided BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simplified onboarding flow
CREATE TABLE public.owner_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_owner_id UUID REFERENCES public.property_owners(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'rejected'
  completion_percentage INTEGER DEFAULT 0,
  identity_verified BOOLEAN DEFAULT FALSE,
  payment_enabled BOOLEAN DEFAULT FALSE,
  bank_account_verified BOOLEAN DEFAULT FALSE,
  onboarding_started_at TIMESTAMP WITH TIME ZONE,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  current_step TEXT,
  next_step TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Onboarding sessions
CREATE TABLE public.owner_onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_owner_id UUID REFERENCES public.property_owners(id) NOT NULL,
  session_type TEXT NOT NULL, -- 'express_onboarding', 'account_update', 'identity_verification'
  stripe_session_id TEXT,
  url TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods for each owner
CREATE TABLE public.owner_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_owner_id UUID REFERENCES public.property_owners(id) NOT NULL,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- 'card', 'bank_account', 'ach_debit'
  last_four TEXT NOT NULL,
  bank_name TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bank accounts for payouts
CREATE TABLE public.owner_bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_owner_id UUID REFERENCES public.property_owners(id) NOT NULL,
  stripe_bank_account_id TEXT UNIQUE NOT NULL,
  last_four TEXT NOT NULL,
  bank_name TEXT,
  account_holder_name TEXT NOT NULL,
  routing_number TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'unverified', -- 'unverified', 'pending', 'verified'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Simplified Connect Onboarding for Real Estate Owners

### 1. Easy Account Creation

```javascript
// Create Express Connect account with minimal friction
async function createLandlordConnectAccount(userData) {
  try {
    // Set reasonable defaults for real estate owners
    const account = await stripe.accounts.create({
      type: 'express', // Express is best for individual landlords
      country: userData.country || 'US',
      email: userData.email,
      capabilities: {
        card_payments: {requested: true},
        transfers: {requested: true},
        us_bank_account_ach_payments: userData.wantsACH ? {requested: true} : undefined
      },
      business_type: 'individual', // Default for most landlords
      business_profile: {
        mcc: '6513', // "Real Estate Agents and Managers - Rentals"
        url: `${process.env.BASE_URL}/landlord/${userData.userId}`,
        product_description: 'Residential property rental'
      },
      individual: {
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'daily' // Most landlords prefer faster access to funds
          }
        }
      },
      metadata: {
        user_id: userData.userId,
        property_owner_id: userData.propertyOwnerId
      }
    });

    // Update our database records
    await db.property_owners.update(
      { id: userData.propertyOwnerId },
      { stripe_account_id: account.id }
    );

    // Create onboarding record
    await db.owner_onboarding.insert({
      property_owner_id: userData.propertyOwnerId,
      status: 'pending',
      current_step: 'account_creation',
      next_step: 'identity_verification'
    });

    return account;
  } catch (error) {
    console.error('Error creating landlord account:', error);
    throw error;
  }
}
```

### 2. Real Estate Specific Express Onboarding

```javascript
// Create account link specifically for real estate owners
async function createLandlordOnboardingLink(propertyOwnerId) {
  try {
    const owner = await db.property_owners.findOne({ id: propertyOwnerId });
    if (!owner || !owner.stripe_account_id) {
      throw new Error('Property owner not found or not connected to Stripe');
    }

    // Create a streamlined Express account link
    const accountLink = await stripe.accountLinks.create({
      account: owner.stripe_account_id,
      refresh_url: `${process.env.BASE_URL}/settings/payments/refresh?owner_id=${propertyOwnerId}`,
      return_url: `${process.env.BASE_URL}/settings/payments/complete?owner_id=${propertyOwnerId}`,
      type: 'account_onboarding',
      collect: 'currently_due', // Only collect what's needed right now to reduce friction
    });

    // Store the session
    await db.owner_onboarding_sessions.insert({
      property_owner_id: propertyOwnerId,
      session_type: 'express_onboarding',
      url: accountLink.url,
      expires_at: new Date(Date.now() + 30 * 60000) // 30 minutes
    });

    // Update status
    await db.owner_onboarding.update(
      { property_owner_id: propertyOwnerId },
      {
        status: 'in_progress',
        onboarding_started_at: new Date(),
        current_step: 'express_onboarding'
      }
    );

    return accountLink;
  } catch (error) {
    console.error('Error creating landlord onboarding link:', error);
    throw error;
  }
}
```

## React Components for Real Estate Platform

### 1. Simple Landlord Onboarding Component

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function LandlordPaymentSetup({ userId, propertyOwnerId }) {
  const [onboardingStatus, setOnboardingStatus] = useState('loading');
  const [onboardingUrl, setOnboardingUrl] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchOnboardingStatus() {
      try {
        const response = await fetch(`/api/landlords/${propertyOwnerId}/onboarding-status`);
        if (!response.ok) throw new Error('Failed to fetch status');

        const data = await response.json();
        setOnboardingStatus(data.status);

        // If onboarding is incomplete, get a fresh link
        if (data.status !== 'completed') {
          const linkResponse = await fetch(`/api/landlords/${propertyOwnerId}/onboarding-link`, {
            method: 'POST'
          });

          if (linkResponse.ok) {
            const linkData = await linkResponse.json();
            setOnboardingUrl(linkData.url);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Unable to set up payment processing. Please try again.');
      }
    }

    fetchOnboardingStatus();
  }, [propertyOwnerId]);

  // Handle clicking the setup button
  const handleSetupPayments = () => {
    if (onboardingUrl) {
      window.location.href = onboardingUrl;
    }
  };

  if (onboardingStatus === 'loading') {
    return <div className="loading-spinner">Setting up your landlord account...</div>;
  }

  if (onboardingStatus === 'completed') {
    return (
      <div className="setup-complete">
        <div className="success-icon">✓</div>
        <h3>Payment Processing Ready!</h3>
        <p>You can now collect rent payments from your tenants.</p>
        <button
          className="primary-button"
          onClick={() => navigate('/dashboard/properties')}
        >
          View My Properties
        </button>
      </div>
    );
  }

  return (
    <div className="onboarding-card">
      <h3>Set Up Rent Collection</h3>

      <div className="onboarding-benefits">
        <div className="benefit-item">
          <div className="benefit-icon">💸</div>
          <div className="benefit-text">Collect rent automatically</div>
        </div>
        <div className="benefit-item">
          <div className="benefit-icon">🏦</div>
          <div className="benefit-text">Fast deposits to your bank account</div>
        </div>
        <div className="benefit-item">
          <div className="benefit-icon">📊</div>
          <div className="benefit-text">Track payments and late fees</div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        className="primary-button"
        onClick={handleSetupPayments}
        disabled={!onboardingUrl}
      >
        Set Up Rent Collection
      </button>

      <div className="security-note">
        <small>Secure verification through Stripe, our trusted payment partner</small>
      </div>
    </div>
  );
}
```

### 2. Bank Account Setup Component

```jsx
import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

function BankAccountSetup({ propertyOwnerId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create the bank account
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/settings/bank-account-success`,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        setError(result.error.message);
      } else {
        // Link was set up without redirect
        await saveBankAccount(result.setupIntent.payment_method);
        setSuccess(true);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveBankAccount = async (paymentMethodId) => {
    const response = await fetch(`/api/landlords/${propertyOwnerId}/bank-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentMethodId })
    });

    if (!response.ok) {
      throw new Error('Failed to save bank account');
    }
  };

  if (success) {
    return (
      <div className="success-message">
        <div className="success-icon">✓</div>
        <h3>Bank Account Connected!</h3>
        <p>Your rent payments will be deposited directly to this account.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bank-account-form">
      <h3>Connect Your Bank Account</h3>
      <p>We'll deposit your rent payments directly to this account.</p>

      <div className="payment-element-container">
        <PaymentElement options={{
          paymentMethodOrder: ['us_bank_account'],
          defaultValues: {
            billingDetails: {
              name: 'Auto-filled from your profile'
            }
          }
        }} />
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="primary-button"
      >
        {loading ? 'Connecting...' : 'Connect Bank Account'}
      </button>

      <div className="security-note">
        <small>Your bank information is securely handled by Stripe.</small>
      </div>
    </form>
  );
}
```

## Real Estate Specific Optimization Strategies

### 1. Property-Based Progressive Onboarding

```javascript
// Progressively enable features based on landlord needs
async function handlePropertyAddition(propertyOwnerId, propertyData) {
  // Get current onboarding status
  const onboarding = await db.owner_onboarding.findOne({ property_owner_id: propertyOwnerId });
  const owner = await db.property_owners.findOne({ id: propertyOwnerId });

  // Create property first
  const property = await db.properties.insert({
    property_owner_id: propertyOwnerId,
    address: propertyData.address,
    units_count: propertyData.units.length,
    // other property fields
  });

  // Update property count
  await db.property_owners.update(
    { id: propertyOwnerId },
    {
      properties_count: owner.properties_count + 1,
      units_count: owner.units_count + propertyData.units.length
    }
  );

  // If first property, prompt for payment setup if not done
  if (owner.properties_count === 0 && onboarding.status !== 'completed') {
    // Create compelling notification to complete onboarding
    await db.notifications.insert({
      user_id: owner.user_id,
      title: 'Set up rent collection for your new property',
      message: 'Your property is ready! Complete payment setup to start collecting rent online.',
      action_url: `/settings/payments?property_id=${property.id}`,
      priority: 'high'
    });

    // Update onboarding next step
    await db.owner_onboarding.update(
      { id: onboarding.id },
      { next_step: 'payment_setup' }
    );
  }

  // If they have tenants ready to add, prompt for bank account
  if (propertyData.units.some(unit => unit.tenant_email) && !onboarding.bank_account_verified) {
    await db.notifications.insert({
      user_id: owner.user_id,
      title: 'Connect your bank account for rent deposits',
      message: 'You have tenants ready to pay rent. Set up your bank account to receive payments.',
      action_url: '/settings/bank-account',
      priority: 'medium'
    });

    await db.owner_onboarding.update(
      { id: onboarding.id },
      { next_step: 'bank_account_verification' }
    );
  }

  return property;
}
```

### 2. Tenant-Initiated Setup Incentive

```javascript
// Create incentive for landlord when tenant wants to pay online
async function createTenantOnboardingRequest(tenantData) {
  // Create tenant record
  const tenant = await db.tenants.insert({
    email: tenantData.email,
    name: tenantData.name,
    phone: tenantData.phone
  });

  // Look up property/owner from invite code or address
  const property = await db.properties.findOne({
    invite_code: tenantData.invite_code
  });

  if (!property) {
    throw new Error('Property not found with this invite code');
  }

  const owner = await db.property_owners.findOne({
    id: property.property_owner_id
  });

  // Check if owner has payment processing set up
  const onboarding = await db.owner_onboarding.findOne({
    property_owner_id: owner.id
  });

  // If landlord hasn't completed onboarding, send special request
  if (!onboarding || onboarding.status !== 'completed') {
    // Create urgent notification
    await db.notifications.insert({
      user_id: owner.user_id,
      title: '🔔 Your tenant wants to pay rent online',
      message: `${tenantData.name} wants to pay their rent electronically. Complete payment setup to enable this feature.`,
      action_url: '/settings/payments?tenant_requested=true',
      priority: 'urgent'
    });

    // Send email with direct link
    await sendEmail({
      to: owner.email,
      subject: `${tenantData.name} wants to pay rent online - Action Required`,
      template: 'tenant-payment-request',
      data: {
        tenantName: tenantData.name,
        propertyAddress: property.address,
        setupLink: `${process.env.BASE_URL}/settings/payments?tenant_requested=true&token=${generateToken(owner.id)}`
      }
    });

    // Create special incentive offer
    await db.incentives.insert({
      property_owner_id: owner.id,
      type: 'fee_waiver',
      description: 'First 3 months with no platform fees',
      triggered_by: 'tenant_request',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
  }

  // Link tenant to property unit
  await db.unit_tenants.insert({
    unit_id: tenantData.unit_id,
    tenant_id: tenant.id,
    status: onboarding?.status === 'completed' ? 'active' : 'pending',
    rent_amount: tenantData.rent_amount,
    lease_start: tenantData.lease_start,
    lease_end: tenantData.lease_end
  });

  return tenant;
}
```

### 3. Real Estate Simplified Dashboard

```jsx
function LandlordPaymentsDashboard({ propertyOwnerId }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      const response = await fetch(`/api/landlords/${propertyOwnerId}/payments-dashboard`);
      const data = await response.json();
      setDashboardData(data);
      setLoading(false);
    }

    fetchDashboardData();
  }, [propertyOwnerId]);

  if (loading) {
    return <div className="loading-spinner">Loading your dashboard...</div>;
  }

  // Show simplified onboarding CTA if not complete
  if (!dashboardData.accountComplete) {
    return (
      <div className="incomplete-setup">
        <h3>Finish setting up rent collection</h3>
        <div className="progress-tracker">
          <div className="progress-bar" style={{width: `${dashboardData.setupPercentage}%`}}></div>
          <span>{dashboardData.setupPercentage}% Complete</span>
        </div>

        <div className="setup-steps">
          {dashboardData.setupSteps.map((step, index) => (
            <div key={index} className={`setup-step ${step.completed ? 'completed' : ''}`}>
              <div className="step-indicator">{step.completed ? '✓' : index + 1}</div>
              <div className="step-details">
                <h4>{step.name}</h4>
                <p>{step.description}</p>
                {!step.completed && (
                  <button
                    className="action-button"
                    onClick={() => window.location.href = step.actionUrl}
                  >
                    {step.actionText}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="incentive-box">
          <h4>🎁 Limited Time Offer</h4>
          <p>Complete setup now and get your first 3 months with no platform fees!</p>
        </div>
      </div>
    );
  }

  // Show active dashboard if complete
  return (
    <div className="payments-dashboard">
      <div className="summary-cards">
        <div className="summary-card">
          <h4>Expected This Month</h4>
          <div className="amount">${dashboardData.expectedRent.toFixed(2)}</div>
          <div className="sub-text">{dashboardData.dueCount} payments due</div>
        </div>

        <div className="summary-card">
          <h4>Collected This Month</h4>
          <div className="amount">${dashboardData.collectedRent.toFixed(2)}</div>
          <div className="sub-text">{dashboardData.paidCount} payments received</div>
        </div>

        <div className="summary-card">
          <h4>Next Deposit</h4>
          <div className="amount">${dashboardData.nextDeposit.amount.toFixed(2)}</div>
          <div className="sub-text">Expected {dashboardData.nextDeposit.date}</div>
        </div>
      </div>

      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {dashboardData.recentActivity.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">{getActivityIcon(activity.type)}</div>
              <div className="activity-details">
                <div className="activity-title">{activity.description}</div>
                <div className="activity-meta">
                  {activity.unitAddress} • {formatDate(activity.date)}
                </div>
              </div>
              <div className="activity-amount">${activity.amount.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="payment-actions">
        <button
          className="primary-button"
          onClick={() => window.location.href = '/payments/reports'}
        >
          Download Reports
        </button>
        <button
          className="secondary-button"
          onClick={() => window.location.href = '/settings/payments'}
        >
          Payment Settings
        </button>
      </div>
    </div>
  );
}
```

## Real Estate Specific Best Practices

1. **Simplify Terminology**
   - Use "Rent Collection" instead of "Payment Processing"
   - Replace "Connect Account" with "Landlord Account"
   - Use familiar real estate terms throughout the flow

2. **Address Common Landlord Concerns**
   - Highlight fast deposit timing (1-2 business days)
   - Emphasize rent reporting features for tenant history
   - Clearly explain fee structure with concrete examples

3. **Show Benefits at Each Step**
   - Automatic late fee calculation and collection
   - Digital rent receipts and payment history
   - Tax preparation reports for year-end

4. **Progressive Requirements**
   - Start with just name and emailSorry, there was an error generating the answer! Please try again.

Click [here](https://docs.stripe.com) to view the Stripe documentation

# Monetization and Payment Flow Setup

To incorporate your revenue streams (platform subscription fees and transaction fees), and set up the proper flow of funds between tenants, property owners, and your platform:

## Database Schema for Fee and Payment Structure

```sql
-- Platform fee configuration table
CREATE TABLE public.platform_fee_configuration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fee_type TEXT NOT NULL, -- 'subscription', 'transaction_percentage', 'transaction_flat'
  amount INTEGER, -- Amount in cents for flat fees
  percentage DECIMAL(5,2), -- Percentage for percentage fees
  currency TEXT NOT NULL DEFAULT 'usd',
  active BOOLEAN DEFAULT TRUE,
  applies_to TEXT NOT NULL, -- 'all', 'property_owners', 'tenants'
  minimum_amount INTEGER, -- Minimum fee amount
  maximum_amount INTEGER, -- Maximum fee amount (cap)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom fee arrangements
CREATE TABLE public.custom_fee_arrangements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  fee_type TEXT NOT NULL,
  amount INTEGER,
  percentage DECIMAL(5,2),
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Revenue tracking table
CREATE TABLE public.platform_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revenue_type TEXT NOT NULL, -- 'subscription_fee', 'transaction_fee', 'application_fee'
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  source_transaction_id TEXT, -- payment_intent_id, subscription_id, etc.
  source_user_id UUID REFERENCES public.users(id),
  status TEXT NOT NULL, -- 'pending', 'paid', 'failed'
  payout_id TEXT, -- Stripe payout ID when included in a payout
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  received_at TIMESTAMP WITH TIME ZONE
);

-- Rent payments tracking
CREATE TABLE public.rent_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.users(id) NOT NULL,
  property_owner_id UUID REFERENCES public.users(id) NOT NULL,
  property_id UUID NOT NULL,
  lease_id UUID NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  application_fee_amount INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL, -- 'scheduled', 'pending', 'succeeded', 'failed', 'refunded'
  payment_method_id TEXT,
  auto_pay BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-pay configuration
CREATE TABLE public.auto_pay_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.users(id) NOT NULL,
  payment_method_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  days_before_due INTEGER DEFAULT 0,
  maximum_amount INTEGER, -- Cap for auto-payments
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Connect Application Fee Implementation

### 1. Platform Subscription Fee Setup

```javascript
// Create a subscription for the property owner
async function createPlatformSubscription(userId, planId) {
  const user = await db.users.findOne({ id: userId });
  const plan = await db.plans.findOne({ id: planId });

  // Create or retrieve Stripe customer
  let stripeCustomerId = user.stripe_customer_id;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.full_name,
      metadata: { user_id: userId }
    });
    stripeCustomerId = customer.id;
    await db.users.update({ id: userId }, { stripe_customer_id: customer.id });
  }

  // Create subscription
  const subscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: plan.stripe_price_id }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      payment_method_types: ['card'],
      save_default_payment_method: 'on_subscription'
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: { user_id: userId, plan_id: planId }
  });

  // Store subscription in database
  await db.subscriptions.insert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    plan_id: planId,
    current_period_start: new Date(subscription.current_period_start * 1000),
    current_period_end: new Date(subscription.current_period_end * 1000)
  });

  // Track as revenue once payment is confirmed
  await trackRevenue({
    revenue_type: 'subscription_fee',
    amount: plan.amount,
    currency: plan.currency,
    source_transaction_id: subscription.id,
    source_user_id: userId,
    status: 'pending'
  });

  return {
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent?.client_secret
  };
}
```

### 2. Rent Payment with Connect Application Fee

```javascript
// Process a rent payment with application fee
async function processRentPayment(tenantId, leaseId, options = {}) {
  const lease = await db.leases.findOne({ id: leaseId });
  const tenant = await db.users.findOne({ id: tenantId });
  const propertyOwner = await db.users.findOne({ id: lease.property_owner_id });
  const propertyOwnerConnectedAccount = await db.connected_accounts.findOne({
    user_id: lease.property_owner_id
  });

  if (!propertyOwnerConnectedAccount) {
    throw new Error('Property owner does not have a connected account');
  }

  // Calculate application fee
  const feeConfig = await calculateApplicationFee({
    amount: lease.rent_amount,
    propertyOwnerId: lease.property_owner_id,
    transactionType: 'rent'
  });

  // Create the payment intent with application fee
  const paymentIntent = await stripe.paymentIntents.create({
    amount: lease.rent_amount,
    currency: lease.currency || 'usd',
    customer: tenant.stripe_customer_id,
    payment_method: options.paymentMethodId,
    off_session: options.offSession || false,
    confirm: options.confirm || false,
    application_fee_amount: feeConfig.feeAmount,
    transfer_data: {
      destination: propertyOwnerConnectedAccount.stripe_account_id,
    },
    metadata: {
      tenant_id: tenantId,
      property_owner_id: lease.property_owner_id,
      lease_id: leaseId,
      property_id: lease.property_id,
      rent_period_start: options.periodStart || lease.current_period_start,
      rent_period_end: options.periodEnd || lease.current_period_end,
      rent_due_date: options.dueDate || lease.payment_due_date
    }
  });

  // Store rent payment record
  await db.rent_payments.insert({
    tenant_id: tenantId,
    property_owner_id: lease.property_owner_id,
    property_id: lease.property_id,
    lease_id: leaseId,
    stripe_payment_intent_id: paymentIntent.id,
    amount: lease.rent_amount,
    currency: lease.currency || 'usd',
    application_fee_amount: feeConfig.feeAmount,
    period_start: new Date(options.periodStart || lease.current_period_start),
    period_end: new Date(options.periodEnd || lease.current_period_end),
    due_date: new Date(options.dueDate || lease.payment_due_date),
    status: paymentIntent.status,
    payment_method_id: options.paymentMethodId || null,
    auto_pay: options.autoPay || false
  });

  // Track application fee as pending revenue
  await trackRevenue({
    revenue_type: 'application_fee',
    amount: feeConfig.feeAmount,
    currency: lease.currency || 'usd',
    source_transaction_id: paymentIntent.id,
    source_user_id: tenantId,
    status: 'pending'
  });

  return paymentIntent;
}
```

### 3. Auto-Pay Configuration

```javascript
// Set up auto-pay for a tenant
async function configureAutoPay(tenantId, paymentMethodId, options = {}) {
  const tenant = await db.users.findOne({ id: tenantId });

  // Ensure the payment method belongs to the tenant
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (paymentMethod.customer !== tenant.stripe_customer_id) {
    throw new Error('Payment method does not belong to this tenant');
  }

  // Store auto-pay configuration
  const autoPay = await db.auto_pay_settings.upsert(
    { tenant_id: tenantId },
    {
      tenant_id: tenantId,
      payment_method_id: paymentMethodId,
      enabled: options.enabled !== undefined ? options.enabled : true,
      days_before_due: options.daysBefore || 0,
      maximum_amount: options.maximumAmount || null,
      updated_at: new Date()
    }
  );

  // Set up off-session capability
  try {
    await stripe.setupIntents.create({
      customer: tenant.stripe_customer_id,
      payment_method: paymentMethodId,
      confirm: true,
      usage: 'off_session',
    });
  } catch (error) {
    // Handle authentication required
    if (error.code === 'authentication_required') {
      return {
        requires_action: true,
        client_secret: error.payment_intent.client_secret
      };
    }
    throw error;
  }

  return {
    enabled: autoPay.enabled,
    paymentMethodId: autoPay.payment_method_id,
    daysBefore: autoPay.days_before_due
  };
}
```

### 4. Fee Calculation Service

```javascript
// Calculate the appropriate application fee
async function calculateApplicationFee({
  amount,
  propertyOwnerId,
  transactionType
}) {
  // Check for custom fee arrangements
  const customFee = await db.custom_fee_arrangements.findOne({
    user_id: propertyOwnerId,
    fee_type: transactionType,
    valid_from: { $lte: new Date() },
    valid_until: { $or: [{ $gte: new Date() }, { $eq: null }] }
  });

  if (customFee) {
    if (customFee.percentage) {
      return {
        feeAmount: Math.round(amount * (customFee.percentage / 100)),
        feePercentage: customFee.percentage,
        isCustom: true
      };
    }
    if (customFee.amount) {
      return {
        feeAmount: customFee.amount,
        flatFee: customFee.amount,
        isCustom: true
      };
    }
  }

  // Get standard fee configuration
  const feeConfig = await db.platform_fee_configuration.findOne({
    fee_type: `transaction_percentage`,
    applies_to: 'property_owners',
    active: true
  });

  if (!feeConfig) {
    // Default fee if no configuration exists
    return {
      feeAmount: Math.round(amount * 0.03), // 3% default
      feePercentage: 3.0,
      isDefault: true
    };
  }

  // Calculate fee based on configuration
  let feeAmount;
  if (feeConfig.percentage) {
    feeAmount = Math.round(amount * (feeConfig.percentage / 100));

    // Apply minimum if set
    if (feeConfig.minimum_amount && feeAmount < feeConfig.minimum_amount) {
      feeAmount = feeConfig.minimum_amount;
    }

    // Apply maximum if set
    if (feeConfig.maximum_amount && feeAmount > feeConfig.maximum_amount) {
      feeAmount = feeConfig.maximum_amount;
    }
  } else {
    feeAmount = feeConfig.amount || 0;
  }

  return {
    feeAmount,
    feePercentage: feeConfig.percentage,
    flatFee: feeConfig.amount,
    isStandard: true
  };
}
```

## Automated Payment Processing System

### 1. Rent Payment Scheduler

```javascript
// Schedule rent payments based on leases
async function scheduleUpcomingRentPayments() {
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setDate(today.getDate() + 30);

  // Find leases with upcoming payments
  const leases = await db.leases.find({
    status: 'active',
    next_payment_date: { $gte: today, $lte: nextMonth }
  });

  for (const lease of leases) {
    // Check if payment already scheduled
    const existingPayment = await db.rent_payments.findOne({
      lease_id: lease.id,
      period_start: lease.next_payment_date,
      status: { $in: ['scheduled', 'pending', 'succeeded'] }
    });

    if (existingPayment) continue;

    // Check for auto-pay
    const autoPay = await db.auto_pay_settings.findOne({
      tenant_id: lease.tenant_id,
      enabled: true
    });

    if (autoPay) {
      // Schedule auto-payment based on days_before_due
      const paymentDate = new Date(lease.next_payment_date);
      paymentDate.setDate(paymentDate.getDate() - autoPay.days_before_due);

      // Create scheduled payment
      await db.rent_payments.insert({
        tenant_id: lease.tenant_id,
        property_owner_id: lease.property_owner_id,
        property_id: lease.property_id,
        lease_id: lease.id,
        amount: lease.rent_amount,
        currency: lease.currency || 'usd',
        application_fee_amount: 0, // Will calculate at processing time
        period_start: lease.next_payment_date,
        period_end: calculatePeriodEnd(lease.next_payment_date, lease.payment_frequency),
        due_date: lease.next_payment_date,
        status: 'scheduled',
        payment_method_id: autoPay.payment_method_id,
        auto_pay: true,
        metadata: {
          scheduled_payment_date: paymentDate
        }
      });
    } else {
      // Create pending manual payment (no auto-pay)
      await db.rent_payments.insert({
        tenant_id: lease.tenant_id,
        property_owner_id: lease.property_owner_id,
        property_id: lease.property_id,
        lease_id: lease.id,
        amount: lease.rent_amount,
        currency: lease.currency || 'usd',
        application_fee_amount: 0, // Will calculate at processing time
        period_start: lease.next_payment_date,
        period_end: calculatePeriodEnd(lease.next_payment_date, lease.payment_frequency),
        due_date: lease.next_payment_date,
        status: 'pending',
        auto_pay: false
      });

      // Send payment reminder to tenant
      await sendPaymentReminder(lease.tenant_id, lease.id);
    }
  }
}
```

### 2. Auto-Pay Processor

```javascript
// Process scheduled auto-payments
async function processScheduledAutoPayments() {
  const today = new Date();

  // Find scheduled payments that should be processed today
  const scheduledPayments = await db.rent_payments.find({
    status: 'scheduled',
    auto_pay: true,
    '$metadata->scheduled_payment_date$': {
      $lte: today.toISOString().split('T')[0]
    }
  });

  for (const payment of scheduledPayments) {
    try {
      // Get latest auto-pay settings to check if still enabled
      const autoPaySettings = await db.auto_pay_settings.findOne({
        tenant_id: payment.tenant_id,
        enabled: true
      });

      if (!autoPaySettings) {
        // Auto-pay disabled since scheduling
        await db.rent_payments.update(
          { id: payment.id },
          {
            status: 'pending',
            auto_pay: false,
            updated_at: new Date()
          }
        );

        // Send payment reminder
        await sendPaymentReminder(payment.tenant_id, payment.lease_id);
        continue;
      }

      // Process the payment
      await processRentPayment(
        payment.tenant_id,
        payment.lease_id,
        {
          paymentMethodId: autoPaySettings.payment_method_id,
          periodStart: payment.period_start,
          periodEnd: payment.period_end,
          dueDate: payment.due_date,
          offSession: true,
          confirm: true,
          autoPay: true
        }
      );
    } catch (error) {
      console.error(`Auto-pay failed for payment ${payment.id}:`, error);

      // Update payment status
      await db.rent_payments.update(
        { id: payment.id },
        {
          status: 'failed',
          updated_at: new Date(),
          metadata: {
            ...payment.metadata,
            error_message: error.message,
            error_code: error.code
          }
        }
      );

      // Notify tenant of failed payment
      await sendPaymentFailureNotification(payment.tenant_id, payment.id, error);
    }
  }
}
```

## Tenant UI Components

### 1. Auto-Pay Toggle Component

```jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

function AutoPaySettings({ tenantId }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [daysBefore, setDaysBefore] = useState(0);
  const stripe = useStripe();
  const elements = useElements();

  // Fetch current auto-pay settings
  const { data: autoPaySettings, isLoading } = useQuery({
    queryKey: ['autoPaySettings', tenantId],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/auto-pay`);
      if (!response.ok) throw new Error('Failed to load auto-pay settings');
      return response.json();
    }
  });

  // Fetch saved payment methods
  const { data: paymentMethods } = useQuery({
    queryKey: ['paymentMethods', tenantId],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${tenantId}/payment-methods`);
      if (!response.ok) throw new Error('Failed to load payment methods');
      return response.json();
    }
  });

  // Update auto-pay settings
  const { mutate: updateAutoPaySettings, isLoading: isSaving } = useMutation({
    mutationFn: async (data) => {
      const response = await fetch(`/api/tenants/${tenantId}/auto-pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update auto-pay settings');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.requires_action) {
        // Handle authentication required
        handleRequiredAction(data.client_secret);
      }
    }
  });

  // Set initial values from fetched settings
  useEffect(() => {
    if (autoPaySettings) {
      setIsEnabled(autoPaySettings.enabled);
      setSelectedPaymentMethod(autoPaySettings.paymentMethodId);
      setDaysBefore(autoPaySettings.daysBefore);
    }
  }, [autoPaySettings]);

  // Handle required authentication
  const handleRequiredAction = async (clientSecret) => {
    if (!stripe) return;

    const { error } = await stripe.confirmCardSetup(clientSecret);
    if (error) {
      console.error('Error confirming setup:', error);
      // Show error to user
    } else {
      // Setup successful
      setIsEnabled(true);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    updateAutoPaySettings({
      enabled: isEnabled,
      paymentMethodId: selectedPaymentMethod,
      daysBefore
    });
  };

  if (isLoading) {
    return <div className="loading">Loading auto-pay settings...</div>;
  }

  return (
    <div className="auto-pay-settings card">
      <h3 className="card-title">Auto-Pay Settings</h3>

      <form onSubmit={handleSubmit}>
        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Enable Auto-Pay</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
            />
          </label>
        </div>

        {isEnabled && (
          <>
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Payment Method</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedPaymentMethod || ''}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                disabled={!paymentMethods?.length}
                required
              >
                <option value="" disabled>Select payment method</option>
                {paymentMethods?.map(method => (
                  <option key={method.id} value={method.id}>
                    {method.card.brand} •••• {method.card.last4} (expires {method.card.exp_month}/{method.card.exp_year})
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="btn btn-outline btn-sm mt-2"
                onClick={() => {/* Open add payment method modal */}}
              >
                Add New Payment Method
              </button>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Pay days before due date</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={daysBefore}
                onChange={(e) => setDaysBefore(Number(e.target.value))}
                required
              >
                <option value="0">On due date</option>
                <option value="1">1 day before</option>
                <option value="3">3 days before</option>
                <option value="5">5 days before</option>
                <option value="7">7 days before</option>
              </select>
              <p className="text-xs text-muted mt-1">
                We'll process your payment automatically on the selected day.
              </p>
            </div>
          </>
        )}

        <div className="mt-6">
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
```

## Revenue Tracking System

```javascript
// Webhook handler for application fee events
async function handleApplicationFeeEvent(event) {
  const fee = event.data.object;

  switch (event.type) {
    case 'application_fee.created':
      // Update revenue tracking for the fee
      await trackRevenue({
        revenue_type: 'application_fee',
        amount: fee.amount,
        currency: fee.currency,
        source_transaction_id: fee.id,
        source_user_id: await getUserIdFromFee(fee),
        status: 'pending'
      });
      break;

    case 'application_fee.paid':
      // Mark fee as received
      await db.platform_revenue.update(
        { source_transaction_id: fee.id },
        {
          status: 'paid',
          received_at: new Date(fee.created * 1000)
        }
      );
      break;

    case 'application_fee.refunded':
      // Mark fee as refunded
      await db.platform_revenue.update(Sorry, there was an error generating the answer! Please try again.

Click [here](https://docs.stripe.com) to view the Stripe documentation


# Connected Account Onboarding Optimization (Continued)

## Advanced Onboarding Strategies

### 5. A/B Testing Framework for Onboarding

```javascript
// Dynamically assign users to different onboarding experiments
async function assignOnboardingExperiment(userId) {
  // Check if user is already in an experiment
  const existingAssignment = await db.experiment_assignments.findOne({
    user_id: userId,
    experiment_type: 'onboarding_flow'
  });

  if (existingAssignment) return existingAssignment.variant;

  // Current active experiments
  const experiments = {
    'onboarding_incentive_timing': ['upfront', 'milestone_based', 'completion_only'],
    'onboarding_ui': ['minimalist', 'guided', 'gamified'],
    'onboarding_requirements': ['progressive', 'all_at_once', 'categorized']
  };

  // Assign variants based on user segments
  const userSegment = await getUserSegment(userId);
  const assignments = {};

  for (const [experiment, variants] of Object.entries(experiments)) {
    // Weighted random assignment based on performance data
    const variantWeights = await getExperimentWeights(experiment, userSegment);
    const variant = weightedRandomSelection(variants, variantWeights);

    assignments[experiment] = variant;

    // Record assignment
    await db.experiment_assignments.insert({
      user_id: userId,
      experiment_name: experiment,
      variant,
      assigned_at: new Date()
    });
  }

  return assignments;
}
```

### 6. Intelligent Document Pre-verification

```javascript
// Pre-verify document quality before submission to Stripe
async function preVerifyDocument(userId, documentType, documentImageBase64) {
  try {
    // 1. Check image quality
    const imageQuality = await analyzeImageQuality(documentImageBase64);
    if (imageQuality.score < 0.7) {
      return {
        status: 'rejected',
        reason: imageQuality.issues.join(', '),
        suggestions: generateImprovementSuggestions(imageQuality.issues)
      };
    }

    // 2. Validate document content using OCR
    const documentData = await extractDocumentData(documentImageBase64, documentType);

    // 3. Compare with existing user data for consistency
    const userData = await db.users.findOne({ id: userId });
    const consistencyCheck = checkDataConsistency(documentData, userData);

    if (!consistencyCheck.consistent) {
      return {
        status: 'warning',
        issues: consistencyCheck.discrepancies,
        suggestions: generateConsistencySuggestions(consistencyCheck.discrepancies)
      };
    }

    // 4. Check for common verification issues
    const potentialIssues = identifyPotentialVerificationIssues(documentData, documentType);
    if (potentialIssues.length > 0) {
      return {
        status: 'warning',
        issues: potentialIssues,
        suggestions: generateIssueSuggestions(potentialIssues)
      };
    }

    // Document appears valid
    return {
      status: 'valid',
      extracted_data: documentData,
      confidence_score: 0.95
    };
  } catch (error) {
    console.error('Error pre-verifying document:', error);
    return {
      status: 'error',
      reason: 'Unable to process document',
      suggestions: ['Ensure the entire document is visible', 'Use better lighting', 'Avoid glare']
    };
  }
}
```

### 7. Dynamic Onboarding UI Based on User Behavior

```jsx
function DynamicOnboardingFlow({ userId, sessionData }) {
  const [userBehavior, setUserBehavior] = useState({
    timeOnPage: 0,
    scrollDepth: 0,
    formInteractions: 0,
    hesitations: []
  });

  // Track user behavior
  useEffect(() => {
    const startTime = Date.now();
    const trackingInterval = setInterval(() => {
      setUserBehavior(prev => ({
        ...prev,
        timeOnPage: Math.floor((Date.now() - startTime) / 1000)
      }));
    }, 1000);

    // Track scroll depth
    const handleScroll = throttle(() => {
      const scrollTop = window.scrollY;
      const docHeight = document.body.offsetHeight;
      const winHeight = window.innerHeight;
      const scrollPercent = scrollTop / (docHeight - winHeight);
      setUserBehavior(prev => ({
        ...prev,
        scrollDepth: Math.max(prev.scrollDepth, Math.round(scrollPercent * 100))
      }));
    }, 500);

    window.addEventListener('scroll', handleScroll);

    return () => {
      clearInterval(trackingInterval);
      window.removeEventListener('scroll', handleScroll);

      // Save behavior data on unmount
      saveBehaviorData(userId, userBehavior);
    };
  }, [userId]);

  // Dynamic help content based on behavior
  const renderHelp = () => {
    if (userBehavior.timeOnPage > 120 && userBehavior.formInteractions < 3) {
      // User spending time but not interacting - offer guided help
      return <GuidedHelpOverlay onboarding={sessionData} />;
    }

    if (userBehavior.hesitations.length > 2) {
      // User showing hesitation on specific fields - show field-specific help
      return <ContextualHelp fields={userBehavior.hesitations} />;
    }

    return null;
  };

  // Decide which layout to show based on user behavior and preferences
  const renderLayout = () => {
    if (sessionData.experimentVariant === 'minimalist') {
      return <MinimalistOnboardingFlow data={sessionData} />;
    } else if (sessionData.experimentVariant === 'guided') {
      return <GuidedOnboardingFlow data={sessionData} />;
    } else if (sessionData.experimentVariant === 'gamified') {
      return <GamifiedOnboardingFlow data={sessionData} />;
    }

    // Default flow with dynamic adjustments
    return (
      <StandardOnboardingFlow
        data={sessionData}
        complexity={determineOptimalComplexity(userBehavior)}
        showProgressBar={userBehavior.timeOnPage < 30}
        showSupportButton={userBehavior.timeOnPage > 60 && userBehavior.formInteractions < 5}
      />
    );
  };

  return (
    <div className="dynamic-onboarding-container">
      {renderLayout()}
      {renderHelp()}
    </div>
  );
}
```

### 8. Custom UX for High-Friction Requirements

```jsx
function BusinessVerificationFlow({ accountId, requirementType }) {
  const [verificationState, setVerificationState] = useState('initial');
  const [documents, setDocuments] = useState([]);
  const [feedback, setFeedback] = useState(null);

  // Different flows based on requirement type
  const renderVerificationFlow = () => {
    switch (requirementType) {
      case 'company.verification.document':
        return <CompanyDocumentVerification
          onFileSelect={handleFileSelect}
          onSubmit={handleSubmit}
          feedback={feedback}
          supportedDocumentTypes={['articles_of_incorporation', 'business_license']}
        />;

      case 'person.verification.document':
        return <PersonalIDVerification
          onFileSelect={handleFileSelect}
          onSubmit={handleSubmit}
          feedback={feedback}
          supportedDocumentTypes={['passport', 'id_card', 'driving_license']}
        />;

      case 'company.tax.id':
        return <TaxIDVerification
          onSubmit={handleTaxIdSubmit}
          feedback={feedback}
          countryOptions={['US', 'CA', 'GB', 'AU']}
        />;

      default:
        return <GenericVerification
          requirementType={requirementType}
          onSubmit={handleGenericSubmit}
          feedback={feedback}
        />;
    }
  };

  // Pre-verify document quality before submission
  const handleFileSelect = async (files) => {
    try {
      setVerificationState('validating');

      const results = await Promise.all(
        Array.from(files).map(async file => {
          const base64 = await fileToBase64(file);
          return {
            file,
            preVerification: await preVerifyDocument(accountId, requirementType, base64)
          };
        })
      );

      // Check if any documents have issues
      const hasIssues = results.some(r => r.preVerification.status !== 'valid');

      if (hasIssues) {
        setFeedback({
          type: 'warning',
          message: 'We detected potential issues with your document that might cause verification to fail.',
          details: results.filter(r => r.preVerification.status !== 'valid').map(r => r.preVerification)
        });
      } else {
        setFeedback({
          type: 'success',
          message: 'Documents look good! Ready to submit.'
        });
      }

      setDocuments(results.map(r => ({
        file: r.file,
        status: r.preVerification.status,
        data: r.preVerification.extracted_data
      })));

      setVerificationState('ready');
    } catch (error) {
      setFeedback({
        type: 'error',
        message: 'There was a problem processing your documents.'
      });
      setVerificationState('error');
    }
  };

  // Submit documents to Stripe
  const handleSubmit = async () => {
    try {
      setVerificationState('submitting');

      // Upload files to your server first
      const uploadPromises = documents.map(async doc => {
        const formData = new FormData();
        formData.append('file', doc.file);
        formData.append('purpose', requirementType);

        const response = await fetch('/api/connect/document-upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Document upload failed');

        return await response.json();
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Submit files to Stripe
      const response = await fetch('/api/connect/verification/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          requirementType,
          fileIds: uploadedFiles.map(f => f.id)
        })
      });

      if (!response.ok) throw new Error('Verification submission failed');

      const result = await response.json();

      setVerificationState('submitted');
      setFeedback({
        type: 'success',
        message: 'Verification submitted successfully! We'll notify you once it's reviewed.'
      });

      // Report completion to parent component
      onRequirementComplete(requirementType);
    } catch (error) {
      setVerificationState('error');
      setFeedback({
        type: 'error',
        message: 'There was a problem submitting your verification.'
      });
    }
  };

  return (
    <div className="verification-flow">
      <h3>Business Verification</h3>

      <ProgressStepper
        steps={['Upload Documents', 'Verify Information', 'Submit']}
        currentStep={
          verificationState === 'initial' ? 0 :
          verificationState === 'validating' || verificationState === 'ready' ? 1 :
          2
        }
      />

      {renderVerificationFlow()}
    </div>
  );
}
```

### 9. Automated Webhook Handling System

```javascript
// Advanced webhook processing system
async function setupConnectWebhookHandlers(app) {
  // Set up Express route
  app.post('/webhooks/stripe/connect', express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_CONNECT_WEBHOOK_SECRET
      );

      // Log event
      await db.webhook_events.insert({
        stripe_event_id: event.id,
        event_type: event.type,
        object_id: event.data.object.id,
        object_type: event.data.object.object,
        account: event.account,
        api_version: event.api_version,
        event_data: event.data,
        processed: false
      });

      // Process synchronously for critical events
      if (['account.updated', 'account.application.authorized'].includes(event.type)) {
        await processConnectWebhook(event);
      } else {
        // Process asynchronously for non-critical events
        processConnectWebhookAsync(event);
      }

      res.json({received: true});
    } catch (err) {
      console.error(`Webhook error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  });
}

// Process Connect webhooks
async function processConnectWebhook(event) {
  try {
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object, event.account);
        break;

      case 'account.application.authorized':
        await handleAccountAuthorized(event.data.object, event.account);
        break;

      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object, event.account);
        break;

      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object, event.account);
        break;

      case 'person.created':
      case 'person.updated':
      case 'person.deleted':
        await handlePersonUpdate(event.data.object, event.type, event.account);
        break;

      // Handle many more event types...
    }

    // Mark as processed
    await db.webhook_events.update(
      { stripe_event_id: event.id },
      { processed: true, processed_at: new Date() }
    );
  } catch (err) {
    console.error(`Error processing webhook ${event.type}:`, err);

    // Record error but don't mark as processed
    await db.webhook_events.update(
      { stripe_event_id: event.id },
      {
        processing_errors: db.raw('array_append(processing_errors, ?)', [err.message])
      }
    );

    // Alert on critical errors
    if (['account.updated', 'capability.updated'].includes(event.type)) {
      await alertOnCriticalWebhookError(event.id, err);
    }
  }
}
```

### 10. Customized Onboarding Requirements Helper

```javascript
// Generate helper content for specific requirements
function generateRequirementHelperContent(requirementKey, countryCode, businessType) {
  // Map of requirement keys to helper content
  const helpers = {
    'company.tax.id': {
      'US': {
        title: 'Federal Employer Identification Number (EIN)',
        description: 'Your 9-digit EIN assigned by the IRS',
        format: 'XX-XXXXXXX',
        example: '12-3456789',
        common_issues: ['Including "EIN" or "FEIN" in the field', 'Using SSN instead of EIN'],
        documents_needed: ['IRS EIN Assignment Letter'],
        how_to_get: 'Apply online at IRS.gov or call 1-800-829-4933',
        resource_link: 'https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online'
      },
      'GB': {
        title: 'VAT Number or UTR',
        description: 'Your VAT registration number or Unique Taxpayer Reference',
        format: 'GB123456789 or 1234567890',
        example: 'GB123456789',
        common_issues: ['Including spaces or dashes', 'Confusing VAT with Company Number'],
        documents_needed: ['VAT Registration Certificate or UTR Letter'],
        how_to_get: 'Register for VAT via HMRC website',
        resource_link: 'https://www.gov.uk/vat-registration'
      }
      // Additional countries...
    },
    'company.verification.document': {
      'US': {
        title: 'Business Verification Document',
        description: 'Official document proving your business registration',
        accepted_documents: [
          'Articles of Incorporation/Organization',
          'Business License',
          'Certificate of Formation',
          'EIN Confirmation Letter (SS-4)'
        ],
        tips: [
          'Ensure document shows business name and address',
          'Document must be issued by government agency',
          'Make sure document is not expired',
          'Submit complete document including all pages'
        ],
        resource_link: 'https://www.sba.gov/business-guide/launch-your-business/register-your-business'
      }
      // Additional countries...
    },
    'person.verification.document': {
      'global': {
        title: 'Identity Verification',
        description: 'Government-issued photo ID for account representative',
        accepted_documents: [
          'Passport',
          'Driver\'s License',
          'National ID Card'
        ],
        tips: [
          'Ensure all 4 corners of ID are visible',
          'Remove from wallet or holder before taking photo',
          'Avoid glare from direct light',
          'Make sure document is not expired'
        ],
        requirement_reason: 'Required by financial regulations to verify account representative identity'
      }
    },
    'person.verification.additional_document': {
      'global': {
        title: 'Secondary ID Verification',
        description: 'Additional proof of identity',
        accepted_documents: [
          'Utility bill (less than 3 months old)',
          'Bank statement (less than 3 months old)',
          'Tax document (from current year)'
        ],
        tips: [
          'Document must show your name and current address',
          'Must be issued within last 3 months',
          'Electronic statements are acceptable if they show full name and address'
        ],
        requirement_reason: 'Required for additional verification when account represents high transaction volume'
      }
    }
    // Many more requirements...
  };

  // Get base content for the requirement
  const baseContent = helpers[requirementKey];
  if (!baseContent) return null;

  // Get country-specific content or fall back to global
  return baseContent[countryCode] || baseContent['global'];
}
```

## Conversion Optimization Enhancements

### 11. Streamlined Re-engagement Workflow

```javascript
// Create a system to re-engage users who abandon onboarding
async function createReengagementCampaign() {
  // Find accounts where onboarding was abandoned
  const abandonedAccounts = await db.connected_account_onboarding.find({
    onboarding_status: 'in_progress',
    last_session_at: {
      $lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24h ago
      $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Within last 30 days
    },
    recovery_attempts: { $lt: 3 }
  });

  // Group by days since last activity for appropriate messaging
  const groupedAccounts = {
    '1_day': [],
    '3_day': [],
    '7_day': [],
    '14_day': [],
    '30_day': []
  };

  for (const account of abandonedAccounts) {
    const daysSinceActivity = daysBetween(account.last_session_at, new Date());

    if (daysSinceActivity <= 1) {
      groupedAccounts['1_day'].push(account);
    } else if (daysSinceActivity <= 3) {
      groupedAccounts['3_day'].push(account);
    } else if (daysSinceActivity <= 7) {
      groupedAccounts['7_day'].push(account);
    } else if (daysSinceActivity <= 14) {
      groupedAccounts['14_day'].push(account);
    } else {
      groupedAccounts['30_day'].push(account);
    }
  }

  // Process each group with appropriate messaging
  await processReengagementGroup(groupedAccounts['1_day'], 'gentle_reminder', false);
  await processReengagementGroup(groupedAccounts['3_day'], 'value_proposition', false);
  await processReengagementGroup(groupedAccounts['7_day'], 'requirements_help', true);
  await processReengagementGroup(groupedAccounts['14_day'], 'incentive_offer', true);
  await processReengagementGroup(groupedAccounts['30_day'], 'final_reminder', true);
}

// Process accounts for reengagement
async function processReengagementGroup(accounts, templateType, includeIncentive) {
  for (const account of abandonedAccounts) {
    // Get account details
    const accountDetails = await stripe.accounts.retrieve(account.stripe_account_id);

    // Generate fresh account link
    const accountLink = await createOptimizedAccountLink(account.stripe_account_id, account.user_id);

    // Determine blocker requirements
    const pendingRequirements = accountDetails.requirements.currently_due;
    const blockerInfo = await generateRequirementSSorry, there was an error generating the answer! Please try again.

Click [here](https://docs.stripe.com) to view the Stripe documentation


## Advanced Onboarding Optimization Techniques

### 5. Intelligent Document Processing System

```javascript
// Pre-validate documents before submission to Stripe
async function validateDocumentBeforeUpload(file, documentType, accountId) {
  // Extract document data using OCR
  const extractedData = await extractDocumentData(file, documentType);

  // Compare with existing account information
  const account = await stripe.accounts.retrieve(accountId);
  const accountData = documentType === 'id_document_front' ? account.individual : account;

  const validationResults = validateDocumentData(extractedData, accountData, documentType);

  if (!validationResults.isValid) {
    // Return specific guidance on document issues
    return {
      valid: false,
      errors: validationResults.errors,
      suggestions: generateDocumentSuggestions(validationResults.errors)
    };
  }

  // Document looks good, proceed with upload
  return {
    valid: true,
    enhancedData: validationResults.enhancedData
  };
}

// Upload pre-validated document
async function uploadValidatedDocument(accountId, documentType, file, validationResult) {
  try {
    // First upload file to Stripe
    const fileUpload = await stripe.files.create({
      purpose: 'identity_document',
      file: {
        data: file.buffer,
        name: `${documentType}-${Date.now()}.jpg`,
        type: 'application/octet-stream',
      },
    }, {
      stripeAccount: accountId
    });

    // Then attach to the proper location on the account
    if (documentType.includes('id_document')) {
      await stripe.accounts.update(accountId, {
        individual: {
          verification: {
            document: {
              [documentType]: { files: [fileUpload.id] }
            }
          }
        }
      });
    } else if (documentType === 'company_license') {
      await stripe.accounts.update(accountId, {
        company: {
          verification: {
            document: { files: [fileUpload.id] }
          }
        }
      });
    }

    // Track document submission
    await db.onboarding_steps.upsert(
      { connected_account_id: await getOnboardingIdFromStripeId(accountId), step_name: `document_${documentType}` },
      {
        status: 'completed',
        completed_at: new Date(),
        data: {
          document_id: fileUpload.id,
          enhanced_data: validationResult.enhancedData
        }
      }
    );

    return fileUpload;
  } catch (error) {
    console.error('Document upload failed:', error);
    throw error;
  }
}
```

### 6. Custom Progressive Onboarding UI

```jsx
// Progressive onboarding component with guided experience
function ProgressiveOnboarding({ userId, accountId }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [savedData, setSavedData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch the personalized onboarding flow
  useEffect(() => {
    async function fetchOnboardingFlow() {
      const response = await fetch(`/api/connect/onboarding-flow/${accountId}`);
      const data = await response.json();

      setOnboardingFlow(data.steps);
      setSavedData(data.savedData || {});
      setCurrentStep(data.lastCompletedStep + 1 || 0);
    }

    fetchOnboardingFlow();
  }, [accountId]);

  // Handle saving data for each step
  const saveStepData = async (stepData) => {
    setIsSubmitting(true);

    try {
      // Save to local state
      const newSavedData = { ...savedData, ...stepData };
      setSavedData(newSavedData);

      // Save to backend
      await fetch(`/api/connect/onboarding-step/${accountId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: onboardingFlow[currentStep].id,
          data: stepData
        })
      });

      // Advance to next step if not the last
      if (currentStep < onboardingFlow.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Complete onboarding
        await fetch(`/api/connect/complete-onboarding/${accountId}`, {
          method: 'POST'
        });

        // Redirect to success page
        window.location.href = '/onboarding/success';
      }
    } catch (error) {
      console.error('Error saving step:', error);
      setError('Failed to save your information. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the current step component
  const renderCurrentStep = () => {
    if (!onboardingFlow || onboardingFlow.length === 0) {
      return <LoadingSkeleton />;
    }

    const StepComponent = stepComponentMap[onboardingFlow[currentStep].type];

    return (
      <StepComponent
        stepData={onboardingFlow[currentStep]}
        savedData={savedData}
        onSave={saveStepData}
        isSubmitting={isSubmitting}
      />
    );
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-progress">
        <ProgressBar
          steps={onboardingFlow?.length || 1}
          currentStep={currentStep}
        />
        <div className="step-indicator">
          Step {currentStep + 1} of {onboardingFlow?.length || '...'}
        </div>
      </div>

      <div className="onboarding-content">
        {renderCurrentStep()}
      </div>

      <div className="onboarding-help">
        <HelpButton accountId={accountId} currentStep={currentStep} />
        <SaveForLaterButton
          onSave={() => saveProgress(accountId, savedData, currentStep)}
        />
      </div>
    </div>
  );
}
```

### 7. Dynamic Capability Management

```javascript
// Progressively enable capabilities based on account status
async function manageCapabilities(accountId) {
  // Get current account
  const account = await stripe.accounts.retrieve(accountId);

  // Get current onboarding record
  const onboarding = await db.connected_account_onboarding.findOne({
    stripe_account_id: accountId
  });

  // Basic capabilities to always request
  const baseCapabilities = {
    card_payments: {requested: true},
    transfers: {requested: true}
  };

  // Advanced capabilities based on business profile
  const advancedCapabilities = {};

  // Add ACH capability if US-based
  if (account.country === 'US') {
    advancedCapabilities.us_bank_account_ach_payments = {requested: true};
  }

  // Add BECS capability for Australian accounts
  if (account.country === 'AU') {
    advancedCapabilities.au_becs_debit_payments = {requested: true};
  }

  // Add SEPA capability for European accounts
  if (['DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'PT', 'AT', 'IE'].includes(account.country)) {
    advancedCapabilities.sepa_debit_payments = {requested: true};
  }

  // Only request advanced capabilities if account has completed basic verification
  const capabilitiesToRequest = account.details_submitted
    ? { ...baseCapabilities, ...advancedCapabilities }
    : baseCapabilities;

  // Update account with capabilities
  try {
    await stripe.accounts.update(accountId, {
      capabilities: capabilitiesToRequest
    });

    // Track capabilities requested
    await db.connected_account_onboarding.update(
      { id: onboarding.id },
      {
        requested_capabilities: Object.keys(capabilitiesToRequest),
        updated_at: new Date()
      }
    );

    return { success: true, capabilities: capabilitiesToRequest };
  } catch (error) {
    console.error('Error requesting capabilities:', error);
    return { success: false, error };
  }
}
```

### 8. Behavioral Analytics System

```javascript
// Track user behavior during onboarding
async function trackOnboardingBehavior(userId, accountId, event, metadata = {}) {
  const sessionId = metadata.sessionId || await getActiveSessionId(userId);

  // Record the event
  await db.onboarding_events.insert({
    user_id: userId,
    connected_account_id: await getOnboardingIdFromStripeId(accountId),
    event_name: event,
    session_id: sessionId,
    page: metadata.page || null,
    field_name: metadata.fieldName || null,
    field_value_length: metadata.fieldValue ? metadata.fieldValue.length : null,
    time_spent: metadata.timeSpent || null,
    device_type: metadata.deviceType || null,
    browser: metadata.browser || null,
    occurred_at: new Date(),
    metadata: metadata
  });

  // Real-time analysis for intervention
  if (event === 'field_abandonment' || event === 'page_exit_without_completion') {
    const shouldIntervene = await analyzeForIntervention(userId, accountId, event, metadata);

    if (shouldIntervene) {
      return {
        intervention_required: true,
        intervention_type: shouldIntervene.type,
        message: shouldIntervene.message
      };
    }
  }

  return { tracked: true };
}

// Analyze events to determine if intervention is needed
async function analyzeForIntervention(userId, accountId, event, metadata) {
  // Get recent events for this user/account
  const recentEvents = await db.onboarding_events.find({
    user_id: userId,
    connected_account_id: await getOnboardingIdFromStripeId(accountId),
    occurred_at: { $gt: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
  });

  // Count field abandonments
  const fieldAbandonments = recentEvents.filter(e => e.event_name === 'field_abandonment').length;

  // If multiple field abandonments, offer help
  if (fieldAbandonments >= 3) {
    return {
      type: 'help_offer',
      message: "It looks like you're having trouble. Would you like help completing this section?"
    };
  }

  // If stuck on document upload
  if (event === 'page_exit_without_completion' && metadata.page === 'document_verification' &&
      metadata.timeSpent > 120000) { // 2+ minutes
    return {
      type: 'document_guidance',
      message: "Need help with document verification? Our support team can guide you through the process."
    };
  }

  // If user is inactive for too long
  if (event === 'user_inactive' && metadata.inactiveTime > 60000) { // 1+ minute
    return {
      type: 'progress_reminder',
      message: "Don't forget to complete your account setup to start accepting payments!"
    };
  }

  return null; // No intervention needed
}
```

### 9. Automated Compliance Resolution

```javascript
// Help resolve common compliance issues
async function suggestComplianceResolutions(accountId) {
  const account = await stripe.accounts.retrieve(accountId);
  const resolutions = [];

  // Check for common issues and provide solutions
  if (account.requirements.currently_due.includes('individual.verification.document')) {
    const docIssues = await analyzeDocumentIssues(accountId);

    resolutions.push({
      issue: 'ID document verification failed',
      suggestions: [
        'Ensure document is not expired',
        'Make sure all four corners are visible',
        'Check that there is no glare on the document',
        'Confirm the name matches your application exactly',
        ...docIssues.specific_suggestions
      ],
      action_url: `/onboarding/fix-document/${accountId}`,
      priority: 'high'
    });
  }

  if (account.requirements.currently_due.includes('individual.address.line1')) {
    resolutions.push({
      issue: 'Address verification needed',
      suggestions: [
        'Use your legal address, not a P.O. box',
        'Enter the address exactly as it appears on your government ID',
        'Include apartment/suite numbers',
        'Ensure city and postal code match'
      ],
      action_url: `/onboarding/fix-address/${accountId}`,
      priority: 'medium'
    });
  }

  if (account.requirements.currently_due.includes('business_profile.url')) {
    resolutions.push({
      issue: 'Business website needed',
      suggestions: [
        'Provide a complete URL including https://',
        'The website should clearly display your business name',
        'Website should describe products/services',
        'If you don\'t have a website, consider creating a simple one with Shopify or Wix'
      ],
      action_url: `/onboarding/add-business-url/${accountId}`,
      priority: 'low'
    });
  }

  // Store suggestions for future reference
  await db.compliance_suggestions.insert({
    connected_account_id: await getOnboardingIdFromStripeId(accountId),
    issues_found: resolutions.length,
    suggestions: resolutions,
    generated_at: new Date()
  });

  return resolutions;
}
```

### 10. Contextual Help System

```javascript
// Provide field-specific help based on context
function ContextualHelpSystem({ fieldName, accountData }) {
  const [showHelp, setShowHelp] = useState(false);
  const helpContent = useHelpContent(fieldName, accountData);

  return (
    <div className="contextual-help">
      <button
        className="help-button"
        onClick={() => setShowHelp(!showHelp)}
        aria-label="Show help for this field"
      >
        <InfoIcon size={16} />
      </button>

      {showHelp && (
        <div className="help-content">
          <h4>{helpContent.title}</h4>
          <p>{helpContent.description}</p>

          {helpContent.examples && (
            <div className="examples">
              <p className="example-label">Examples:</p>
              <ul>
                {helpContent.examples.map((example, i) => (
                  <li key={i}>{example}</li>
                ))}
              </ul>
            </div>
          )}

          {helpContent.common_issues && (
            <div className="common-issues">
              <p className="issues-label">Common issues:</p>
              <ul>
                {helpContent.common_issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {helpContent.support_link && (
            <a href={helpContent.support_link} target="_blank" rel="noopener noreferrer">
              Get more help with this field
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Custom hook to get contextual help content
function useHelpContent(fieldName, accountData) {
  const [content, setContent] = useState({
    title: `About ${formatFieldName(fieldName)}`,
    description: 'Loading help content...'
  });

  useEffect(() => {
    async function fetchHelpContent() {
      try {
        const response = await fetch(`/api/help-content/${fieldName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            account_type: accountData.business_type || 'individual',
            country: accountData.country || 'US',
            context: buildContext(accountData, fieldName)
          })
        });

        if (response.ok) {
          const helpData = await response.json();
          setContent(helpData);
        }
      } catch (error) {
        console.error('Error loading help content:', error);
        setContent({
          title: `About ${formatFieldName(fieldName)}`,
          description: 'Please enter the required information for this field.'
        });
      }
    }

    fetchHelpContent();
  }, [fieldName, accountData]);

  return content;
}
```

## Extended Features for Maximum Conversion

### 1. Smart Retry System with A/B Testing

```javascript
// Implement smart retry logic with A/B testing
async function sendSmartRetryMessage(abandonedAccounts) {
  // Group accounts by abandonment patterns
  const groupedAccounts = await groupAccountsByAbandonmentPattern(abandonedAccounts);

  for (const [pattern, accounts] of Object.entries(groupedAccounts)) {
    // For each pattern, test different messaging approaches
    const approaches = await getRetryApproaches(pattern);

    // Split accounts into segments for testing
    const accountSegments = splitIntoEqualSegments(accounts, approaches.length);

    // Send different approaches to each segment
    for (let i = 0; i < approaches.length; i++) {
      const approach = approaches[i];
      const segment = accountSegments[i];

      for (const account of segment) {
        await sendRetryMessage(account, {
          template: approach.template,
          subject: approach.subject,
          incentive: approach.incentive,
          urgency_level: approach.urgency_level,
          retry_count: account.retry_count + 1,
          test_variant: `${pattern}_approach_${i+1}`
        });
      }
    }
  }

  // Schedule follow-up analysis
  scheduleRetryAnalysis(Date.now() + 72 * 60 * 60 * 1000); // 72 hours later
}

// Analyze which retry approach worked best
async function analyzeRetryEffectiveness() {
  const retryEvents = await db.onboarding_communications.find({
    template: { $like: '%retry%' },
    sent_at: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  });

  // Group by test variant
  const variantPerformance = {};

  for (const event of retryEvents) {
    const variant = event.metadata?.test_variant;
    if (!variant) continue;

    if (!variantPerformance[variant]) {
      variantPerformance[variant] = {
        sent: 0,
        opened: 0,
        clicked: 0,
        completed_onboarding: 0
      };
    }

    variantPerformance[variant].sent++;

    if (event.opened_at) {
      variantPerformance[variant].opened++;
    }

    if (event.clicked_at) {
      variantPerformance[variant].clicked++;
    }

    // Check if onboarding was completed after this communication
    const completedOnboarding = await didCompleteAfterCommunication(
      event.connected_account_id,
      event.sent_at
    );

    if (completedOnboarding) {
      variantPerformance[variant].completed_onboarding++;
    }
  }

  // Calculate successSorry, there was an error generating the answer! Please try again.

Click [here](https://docs.stripe.com) to view the Stripe documentation

Best practices
To maximize the effectiveness of your integration, consider the following strategies:

User focus: Make sure that the onboarding process is intuitive by using the account onboarding component to guide users through account creation and management by breaking the process into simple steps and providing straightforward instructions.
Prompt for compliance: Use the notification banner component to keep users updated on their compliance status and any outstanding requirements. Place the banner prominently in your application, such as on the homepage of your dashboard, to make sure that it’s visible and prompts timely action on necessary documentation or updates.
Responsive design: Make sure that the components you integrate are responsive across devices. Because connected accounts might access your platform from various devices, including mobile phones, make sure the onboarding and management interfaces function well on different screen sizes.
User authentication and security: Implement strong authentication measures during the onboarding and account management processes. Although Stripe authentication protects sensitive account information and the ability to change payout details, other sensitive information relies solely on your product’s authentication and security. You can enhance overall security by using methods such as one-time SMS codes or two-factor authentication.
Feedback mechanisms: Integrate feedback options within your onboarding flow and management components. Enable users to report issues or suggest improvements, allowing you to continuously enhance the platform based on their input.
Proactive engagement: Encourage users to keep their accounts active by sending reminders or alerts about compliance obligations through email or platform notifications. This proactive approach can help prevent account suspensions and reduce frustration on the part of users.

# Property Owner and Tenant Payment Platform Schema

Here's a PostgreSQL schema for a property management platform that onboards property owners as connected accounts and facilitates tenant rent payments:

## Core Database Schema

```sql
-- Users table for all platform users
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('property_owner', 'tenant', 'admin')),
  stripe_customer_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property owners (connected accounts)
CREATE TABLE public.property_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL UNIQUE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  business_name TEXT,
  business_type TEXT NOT NULL,
  tax_id TEXT,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  default_platform_fee_percent NUMERIC(5,2) DEFAULT 3.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Owner onboarding tracking
CREATE TABLE public.owner_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_owner_id UUID REFERENCES public.property_owners(id) NOT NULL UNIQUE,
  onboarding_status TEXT NOT NULL DEFAULT 'not_started',
  current_step TEXT,
  completion_percentage INTEGER DEFAULT 0,
  onboarding_started_at TIMESTAMP WITH TIME ZONE,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  last_session_at TIMESTAMP WITH TIME ZONE,
  requirements_due TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties owned by property owners
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_owner_id UUID REFERENCES public.property_owners(id) NOT NULL,
  name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',
  property_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units within properties
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  unit_number TEXT,
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  square_feet INTEGER,
  rent_amount INTEGER NOT NULL, -- in cents
  rent_currency TEXT NOT NULL DEFAULT 'usd',
  rent_period TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenants
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL UNIQUE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  date_of_birth DATE,
  ssn_last_four TEXT,
  identity_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leases connecting tenants to units
CREATE TABLE public.leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES public.units(id) NOT NULL,
  primary_tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount INTEGER NOT NULL, -- in cents
  rent_currency TEXT NOT NULL DEFAULT 'usd',
  security_deposit INTEGER NOT NULL, -- in cents
  payment_day INTEGER NOT NULL DEFAULT 1,
  late_fee_amount INTEGER,
  late_fee_days INTEGER DEFAULT 5,
  lease_status TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Secondary tenants on lease
CREATE TABLE public.lease_tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  responsibility_percentage INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lease_id, tenant_id)
);

-- Rent payments
CREATE TABLE public.rent_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  payment_method_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE,
  application_fee_amount INTEGER NOT NULL,
  late_fee_amount INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant invitations
CREATE TABLE public.tenant_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  unit_id UUID REFERENCES public.units(id) NOT NULL,
  property_owner_id UUID REFERENCES public.property_owners(id) NOT NULL,
  invitation_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  invitation_url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by_user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  last_four TEXT,
  brand TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  bank_name TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant verification sessions
CREATE TABLE public.tenant_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  stripe_verification_session_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  client_secret TEXT,
  redaction_status TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Connect Account Onboarding Flow

### 1. Property Owner Registration API Endpoint

```javascript
// Register property owner and create Connect account
async function registerPropertyOwner(req, res) {
  const { email, fullName, phone, businessName, businessType } = req.body;

  try {
    // Create user record
    const user = await db.query(
      `INSERT INTO users (email, full_name, phone, user_type)
       VALUES ($1, $2, $3, 'property_owner')
       RETURNING *`,
      [email, fullName, phone]
    );

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: email,
      name: fullName,
      phone: phone,
      metadata: { user_id: user.id }
    });

    // Update user with Stripe customer ID
    await db.query(
      `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
      [customer.id, user.id]
    );

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express', // or 'standard' based on your needs
      country: 'US',
      email: email,
      business_type: businessType,
      business_profile: {
        name: businessName,
        mcc: '6513', // Real Estate Agents and Managers
        url: `${process.env.BASE_URL}/properties`
      },
      capabilities: {
        card_payments: {requested: true},
        transfers: {requested: true},
        us_bank_account_ach_payments: {requested: true}
      },
      tos_acceptance: {
        service_agreement: 'full'
      },
      metadata: {
        user_id: user.id,
        platform: 'property_rental'
      }
    });

    // Create property owner record
    const propertyOwner = await db.query(
      `INSERT INTO property_owners (user_id, stripe_account_id, business_name, business_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.id, account.id, businessName, businessType]
    );

    // Initialize onboarding tracking
    await db.query(
      `INSERT INTO owner_onboarding (property_owner_id, onboarding_status, current_step)
       VALUES ($1, 'started', 'account_creation')
       RETURNING *`,
      [propertyOwner.id]
    );

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.BASE_URL}/onboarding/refresh?account_id=${account.id}`,
      return_url: `${process.env.BASE_URL}/onboarding/complete?account_id=${account.id}`,
      type: 'account_onboarding',
      collect: 'eventually_due'
    });

    res.status(201).json({
      success: true,
      userId: user.id,
      propertyOwnerId: propertyOwner.id,
      accountLink: accountLink.url
    });
  } catch (error) {
    console.error('Property owner registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register property owner',
      error: error.message
    });
  }
}
```

### 2. Onboarding Status Tracking

```javascript
// Handle account.updated webhook for onboarding tracking
async function handleAccountUpdated(event) {
  const account = event.data.object;

  try {
    // Find property owner by Stripe account ID
    const propertyOwner = await db.query(
      `SELECT * FROM property_owners WHERE stripe_account_id = $1`,
      [account.id]
    );

    if (!propertyOwner.rows[0]) return;

    // Update charges/payouts enabled status
    await db.query(
      `UPDATE property_owners
       SET charges_enabled = $1,
           payouts_enabled = $2,
           onboarding_complete = $3,
           updated_at = NOW()
       WHERE stripe_account_id = $4`,
      [
        account.charges_enabled,
        account.payouts_enabled,
        (account.charges_enabled && account.payouts_enabled && account.details_submitted),
        account.id
      ]
    );

    // Calculate onboarding completion percentage
    const totalRequirements = (
      (account.requirements?.eventually_due?.length || 0) +
      (account.requirements?.currently_due?.length || 0) +
      (account.requirements?.past_due?.length || 0)
    );

    const completionPercentage = totalRequirements === 0
      ? 100
      : Math.floor((1 - (totalRequirements / 20)) * 100); // Estimate based on average requirements

    // Update onboarding tracking
    const onboardingStatus = account.charges_enabled && account.payouts_enabled
      ? 'completed'
      : 'in_progress';

    await db.query(
      `UPDATE owner_onboarding
       SET onboarding_status = $1,
           completion_percentage = $2,
           requirements_due = $3,
           onboarding_completed_at = $4,
           last_session_at = NOW(),
           updated_at = NOW()
       WHERE property_owner_id = $5`,
      [
        onboardingStatus,
        completionPercentage,
        JSON.stringify(account.requirements || {}).slice(1, -1).split(','), // Convert to array
        onboardingStatus === 'completed' ? 'NOW()' : null,
        propertyOwner.rows[0].id
      ]
    );

    // Send notifications based on status
    if (onboardingStatus === 'completed') {
      await sendOnboardingCompleteNotification(propertyOwner.rows[0].id);
    } else if (completionPercentage > 50 && completionPercentage < 100) {
      await sendOnboardingProgressNotification(propertyOwner.rows[0].id, completionPercentage);
    }

    console.log(`Updated onboarding status for account ${account.id} to ${onboardingStatus}`);
  } catch (error) {
    console.error('Error handling account.updated webhook:', error);
  }
}
```

### 3. Tenant Invitation System

```javascript
// API endpoint to invite tenant
async function inviteTenant(req, res) {
  const { propertyOwnerId, unitId, email, firstName, lastName } = req.body;

  try {
    // Check if property owner exists and has completed onboarding
    const propertyOwner = await db.query(
      `SELECT po.*, u.email as owner_email
       FROM property_owners po
       JOIN users u ON po.user_id = u.id
       WHERE po.id = $1`,
      [propertyOwnerId]
    );

    if (!propertyOwner.rows[0]) {
      return res.status(404).json({ success: false, message: 'Property owner not found' });
    }

    if (!propertyOwner.rows[0].onboarding_complete) {
      return res.status(400).json({
        success: false,
        message: 'Property owner must complete onboarding before inviting tenants'
      });
    }

    // Check if unit exists and belongs to property owner
    const unit = await db.query(
      `SELECT u.*, p.name as property_name
       FROM units u
       JOIN properties p ON u.property_id = p.id
       WHERE u.id = $1 AND p.property_owner_id = $2`,
      [unitId, propertyOwnerId]
    );

    if (!unit.rows[0]) {
      return res.status(404).json({ success: false, message: 'Unit not found or not owned by this property owner' });
    }

    // Generate unique invitation code
    const invitationCode = crypto.randomBytes(16).toString('hex');

    // Create invitation URL
    const invitationUrl = `${process.env.BASE_URL}/tenant/signup?code=${invitationCode}`;

    // Save invitation
    const invitation = await db.query(
      `INSERT INTO tenant_invitations
       (email, unit_id, property_owner_id, invitation_code, invitation_url, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
       RETURNING *`,
      [email, unitId, propertyOwnerId, invitationCode, invitationUrl]
    );

    // Send invitation email
    await sendTenantInvitationEmail({
      to: email,
      propertyName: unit.rows[0].property_name,
      unitNumber: unit.rows[0].unit_number || 'N/A',
      rentAmount: (unit.rows[0].rent_amount / 100).toFixed(2),
      currency: unit.rows[0].rent_currency.toUpperCase(),
      landlordName: propertyOwner.rows[0].business_name || propertyOwner.rows[0].owner_email,
      invitationUrl: invitationUrl,
      expiresAt: invitation.rows[0].expires_at
    });

    res.status(201).json({
      success: true,
      invitation: {
        id: invitation.rows[0].id,
        email,
        invitationUrl,
        expiresAt: invitation.rows[0].expires_at
      }
    });
  } catch (error) {
    console.error('Error inviting tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to invite tenant',
      error: error.message
    });
  }
}
```

### 4. Tenant Registration and Setup

```javascript
// API endpoint for tenant registration from invitation
async function registerTenant(req, res) {
  const { invitationCode, email, fullName, password, phone } = req.body;

  try {
    // Verify invitation code
    const invitation = await db.query(
      `SELECT i.*, u.rent_amount, u.rent_currency, u.unit_number, p.name as property_name, p.address_line1, p.city, p.state
       FROM tenant_invitations i
       JOIN units u ON i.unit_id = u.id
       JOIN properties p ON u.property_id = p.id
       WHERE i.invitation_code = $1 AND i.status = 'pending' AND i.expires_at > NOW()`,
      [invitationCode]
    );

    if (!invitation.rows[0]) {
      return res.status(400).json({ success: false, message: 'Invalid or expired invitation' });
    }

    // Verify email matches invitation
    if (invitation.rows[0].email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({ success: false, message: 'Email does not match invitation' });
    }

    // Create user account
    const user = await db.query(
      `INSERT INTO users (email, full_name, phone, user_type)
       VALUES ($1, $2, $3, 'tenant')
       RETURNING *`,
      [email, fullName, phone]
    );

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: email,
      name: fullName,
      phone: phone,
      metadata: { user_id: user.rows[0].id, tenant: 'true' }
    });

    // Update user with Stripe customer ID
    await db.query(
      `UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
      [customer.id, user.rows[0].id]
    );

    // Create tenant record
    const tenant = await db.query(
      `INSERT INTO tenants (user_id, stripe_customer_id)
       VALUES ($1, $2)
       RETURNING *`,
      [user.rows[0].id, customer.id]
    );

    // Update invitation status
    await db.query(
      `UPDATE tenant_invitations
       SET status = 'accepted', accepted_at = NOW(), accepted_by_user_id = $1
       WHERE id = $2`,
      [user.rows[0].id, invitation.rows[0].id]
    );

    // Return success with tenant info
    res.status(201).json({
      success: true,
      tenant: {
        id: tenant.rows[0].id,
        userId: user.rows[0].id,
        email,
        fullName
      },
      property: {
        name: invitation.rows[0].property_name,
        address: invitation.rows[0].address_line1,
        city: invitation.rows[0].city,
        state: invitation.rows[0].state,
        unitNumber: invitation.rows[0].unit_number
      },
      rent: {
        amount: invitation.rows[0].rent_amount / 100,
        currency: invitation.rows[0].rent_currency.toUpperCase()
      },
      next: '/tenant/setup-payment'
    });
  } catch (error) {
    console.error('Error registering tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register tenant',
      error: error.message
    });
  }
}
```

### 5. Setup Rent Payment Processing

```javascript
// Create a Payment Intent for rent
async function createRentPayment(req, res) {
  const { leaseId, tenantId } = req.body;

  try {
    // Get lease and associated data
    const lease = await db.query(
      `SELECT l.*, u.property_id, t.user_id as tenant_user_id, t.stripe_customer_id,
              p.property_owner_id, po.stripe_account_id
       FROM leases l
       JOIN units u ON l.unit_id = u.id
       JOIN tenants t ON l.primary_tenant_id = t.id
       JOIN properties p ON u.property_id = p.id
       JOIN property_owners po ON p.property_owner_id = po.id
       WHERE l.id = $1 AND (l.primary_tenant_id = $2 OR EXISTS (
         SELECT 1 FROM lease_tenants lt WHERE lt.lease_id = l.id AND lt.tenant_id = $2
       ))`,
      [leaseId, tenantId]
    );

    if (!lease.rows[0]) {
      return res.status(404).json({ success: false, message: 'Lease not found or not associated with tenant' });
    }

    // Get current date and determine rent period
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Calculate rent period start/end and due date
    const periodStart = new Date(currentYear, currentMonth, 1);
    const periodEnd = new Date(currentYear, currentMonth + 1, 0);
    const dueDate = new Date(currentYear, currentMonth, lease.rows[0].payment_day);

    // Check if payment already exists for this period
    const existingPayment = await db.query(
      `SELECT * FROM rent_payments
       WHERE lease_id = $1 AND period_start = $2 AND period_end = $3`,
      [leaseId, periodStart, periodEnd]
    );

    if (existingPayment.rows[0]) {
      return res.status(400).json({
        success: false,
        message: 'Payment already exists for this period',
        paymentId: existingPayment.rows[0].id
      });
    }

    // Calculate platform fee (e.g., 3% of rent amount)
    const platformFeePercent = lease.rows[0].platform_fee_percent || 3.0;
    const applicationFeeAmount = Math.round(lease.rows[0].rent_amount * (platformFeePercent / 100));

    // Create payment intent on connected account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: lease.rows[0].rent_amount,
      currency: lease.rows[0].rent_currency,
      customer: lease.rows[0].stripe_customer_id,
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: lease.rows[0].stripe_account_id
      },
      metadata: {
        lease_id: leaseId,
        tenant_id: tenantId,
        property_owner_id: lease.rows[0].property_owner_id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        rent_payment: 'true'
      },
      description: `Rent payment for ${periodStart.toLocaleString('default', { month: 'long' })} ${currentYear}`
    });

    // Create rent payment record
    const payment = await db.query(
      `INSERT INTO rent_payments
       (lease_id, tenant_id, stripe_payment_intent_id, amount, currency, status,
        payment_method_type, period_start, period_end, due_date, application_fee_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        leaseId,
        tenantId,
        paymentIntent.id,
        lease.rows[0].rent_amount,
        lease.rowsSorry, there was an error generating the answer! Please try again.

Click [here](https://docs.stripe.com) to view the Stripe documentation

# Tenant-Landlord Payment Flow Implementation

Let's complete the end-to-end flow for property owners (landlords) and tenants, focusing on payment processing, rent collection, late fees, and reporting:

## Additional Database Schema

```sql
-- Lease payment configuration
CREATE TABLE public.lease_payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  rent_due_day INTEGER NOT NULL CHECK (rent_due_day BETWEEN 1 AND 31),
  grace_period_days INTEGER NOT NULL DEFAULT 0,
  late_fee_type TEXT NOT NULL, -- 'fixed', 'percentage', 'daily', 'none'
  late_fee_amount INTEGER,
  late_fee_percentage DECIMAL(5,2),
  daily_late_fee_amount INTEGER,
  daily_late_fee_max INTEGER,
  allow_partial_payments BOOLEAN DEFAULT FALSE,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_methods TEXT[] DEFAULT ARRAY['card', 'us_bank_account'],
  autopay_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rent payments
CREATE TABLE public.rent_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  status TEXT NOT NULL, -- 'pending', 'processing', 'succeeded', 'failed', 'refunded', 'disputed'
  amount INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_method_type TEXT NOT NULL,
  payment_method_details JSONB,
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  application_fee_amount INTEGER NOT NULL,
  landlord_payout_amount INTEGER NOT NULL,
  processing_fee INTEGER,
  late_fee INTEGER DEFAULT 0,
  statement_descriptor TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Late fees
CREATE TABLE public.late_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rent_payment_id UUID REFERENCES public.rent_payments(id) NOT NULL,
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'charged', 'waived'
  days_late INTEGER NOT NULL,
  calculation_method TEXT NOT NULL, -- 'fixed', 'percentage', 'daily'
  calculation_details JSONB NOT NULL,
  charged_at TIMESTAMP WITH TIME ZONE,
  waived_at TIMESTAMP WITH TIME ZONE,
  waived_by UUID REFERENCES auth.users(id),
  waiver_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment schedules (for recurring autopay)
CREATE TABLE public.payment_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  status TEXT NOT NULL, -- 'active', 'paused', 'cancelled'
  payment_method_id TEXT NOT NULL,
  stripe_setup_intent_id TEXT,
  stripe_mandate_id TEXT,
  next_payment_date DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  amount INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant invitations
CREATE TABLE public.tenant_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  unit_id UUID REFERENCES public.units(id) NOT NULL,
  landlord_id UUID REFERENCES public.landlords(id) NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'accepted', 'declined', 'expired'
  token TEXT UNIQUE NOT NULL,
  invitation_message TEXT,
  rent_amount INTEGER NOT NULL,
  lease_start_date DATE NOT NULL,
  lease_end_date DATE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment analytics
CREATE TABLE public.payment_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID REFERENCES public.landlords(id) NOT NULL,
  property_id UUID REFERENCES public.properties(id),
  month DATE NOT NULL,
  total_expected_rent INTEGER NOT NULL,
  total_collected_rent INTEGER NOT NULL DEFAULT 0,
  total_late_fees INTEGER NOT NULL DEFAULT 0,
  on_time_payment_rate DECIMAL(5,2),
  average_days_late DECIMAL(5,2),
  collection_rate DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(landlord_id, property_id, month)
);

-- Reports and documents
CREATE TABLE public.rent_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  report_type TEXT NOT NULL, -- 'payment_history', 'rent_verification', 'tax_statement'
  date_range_start DATE NOT NULL,
  date_range_end DATE NOT NULL,
  document_url TEXT,
  status TEXT NOT NULL, -- 'processing', 'completed', 'failed'
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

## Implementing the End-to-End Flow

### 1. Tenant Invitation and Onboarding

```javascript
// Generate and send tenant invitation
async function inviteTenant(landlordId, propertyId, unitId, tenantEmail, leaseDetails) {
  const landlord = await db.landlords.findOne({ id: landlordId });
  const property = await db.properties.findOne({ id: propertyId });
  const unit = await db.units.findOne({ id: unitId });

  // Validate landlord has active Stripe account
  const stripeAccount = await stripe.accounts.retrieve(landlord.stripe_account_id);
  if (!stripeAccount.charges_enabled) {
    throw new Error('Landlord account not fully activated');
  }

  // Generate unique invitation token
  const token = crypto.randomBytes(32).toString('hex');

  // Create invitation record
  const invitation = await db.tenant_invitations.insert({
    property_id: propertyId,
    unit_id: unitId,
    landlord_id: landlordId,
    email: tenantEmail,
    status: 'pending',
    token: token,
    rent_amount: leaseDetails.rentAmount,
    lease_start_date: leaseDetails.startDate,
    lease_end_date: leaseDetails.endDate,
    invitation_message: leaseDetails.message,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });

  // Generate invitation URL
  const invitationUrl = `${process.env.BASE_URL}/invitation/${token}`;

  // Send invitation email
  await sendEmail(tenantEmail, {
    template: 'tenant-invitation',
    data: {
      landlordName: `${landlord.first_name} ${landlord.last_name}`,
      propertyAddress: property.address,
      unitNumber: unit.unit_number,
      rentAmount: formatCurrency(leaseDetails.rentAmount),
      leaseStart: formatDate(leaseDetails.startDate),
      leaseEnd: formatDate(leaseDetails.endDate),
      message: leaseDetails.message,
      invitationUrl
    }
  });

  return invitation;
}
```

### 2. Tenant Accepts Invitation and Sets Up Payment

```javascript
// Handle tenant accepting invitation
async function acceptTenantInvitation(token, userData) {
  // Find and validate invitation
  const invitation = await db.tenant_invitations.findOne({ token });

  if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expires_at) {
    throw new Error('Invalid or expired invitation');
  }

  // Create or retrieve user account
  let user = await db.users.findOne({ email: invitation.email });

  if (!user) {
    // Register new user
    user = await registerNewUser(invitation.email, userData);
  }

  // Create Stripe customer for tenant
  const stripeCustomer = await stripe.customers.create({
    email: user.email,
    name: `${userData.firstName} ${userData.lastName}`,
    phone: userData.phone,
    metadata: {
      user_id: user.id
    }
  });

  // Create tenant record
  const tenant = await db.tenants.insert({
    user_id: user.id,
    stripe_customer_id: stripeCustomer.id,
    identity_verified: false
  });

  // Retrieve landlord
  const landlord = await db.landlords.findOne({ id: invitation.landlord_id });

  // Create a customer on the connected account
  const connectedCustomer = await stripe.customers.create({
    email: user.email,
    name: `${userData.firstName} ${userData.lastName}`,
    phone: userData.phone,
  }, {
    stripeAccount: landlord.stripe_account_id
  });

  // Record marketplace customer relationship
  await db.marketplace_customers.insert({
    platform_customer_id: user.id,
    connected_account_id: landlord.id,
    stripe_customer_id: connectedCustomer.id
  });

  // Create lease record
  const lease = await db.leases.insert({
    tenant_id: tenant.id,
    unit_id: invitation.unit_id,
    start_date: invitation.lease_start_date,
    end_date: invitation.lease_end_date,
    rent_amount: invitation.rent_amount,
    rent_currency: 'usd',
    payment_day: 1, // Default to 1st of month
    status: 'active'
  });

  // Create default payment settings
  await db.lease_payment_settings.insert({
    lease_id: lease.id,
    rent_due_day: 1,
    grace_period_days: 5,
    late_fee_type: 'fixed',
    late_fee_amount: Math.ceil(invitation.rent_amount * 0.05), // Default to 5%
    currency: 'usd'
  });

  // Update invitation status
  await db.tenant_invitations.update(
    { id: invitation.id },
    { status: 'accepted' }
  );

  // Trigger identity verification if required
  if (invitation.rent_amount >= 1000) {
    await initiateIdentityVerification(tenant.id);
  }

  return {
    tenantId: tenant.id,
    leaseId: lease.id,
    nextStep: 'setup-payment'
  };
}
```

### 3. Setting Up Payment Methods for Tenant

```javascript
// Set up payment method for tenant
async function setupTenantPaymentMethod(tenantId, leaseId, paymentMethodType) {
  const tenant = await db.tenants.findOne({ id: tenantId });
  const lease = await db.leases.findOne({ id: leaseId });
  const unit = await db.units.findOne({ id: lease.unit_id });
  const property = await db.properties.findOne({ id: unit.property_id });
  const landlord = await db.landlords.findOne({ id: property.landlord_id });

  // Create a setup intent for the tenant
  const setupIntent = await stripe.setupIntents.create({
    customer: tenant.stripe_customer_id,
    payment_method_types: [paymentMethodType],
    metadata: {
      tenant_id: tenant.id,
      lease_id: lease.id,
    },
    mandate_data: paymentMethodType === 'us_bank_account' ? {
      customer_acceptance: {
        type: 'online',
        online: {
          ip_address: '{{CLIENT_IP}}',
          user_agent: '{{USER_AGENT}}',
        },
      },
    } : undefined
  });

  // For ACH payments, also create a mandate
  if (paymentMethodType === 'us_bank_account') {
    // Create mandate text
    const mandateText = `I authorize ${property.name} to debit my bank account for rent payments for unit ${unit.unit_number} in the amount of ${formatCurrency(lease.rent_amount)} on the ${lease.payment_day}${getOrdinalSuffix(lease.payment_day)} of each month, plus any applicable late fees or other charges according to my lease agreement. These payments will continue until my lease ends on ${formatDate(lease.end_date)} or I revoke this authorization.`;

    // Store mandate details for later use
    await db.ach_mandates.insert({
      tenant_id: tenant.id,
      lease_id: lease.id,
      mandate_text: mandateText,
      status: 'pending',
      created_at: new Date()
    });
  }

  return {
    setupIntentId: setupIntent.id,
    clientSecret: setupIntent.client_secret
  };
}
```

### 4. Creating Client-Side Payment Elements

```jsx
import { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe('pk_test_51Rd0qyP3WCR53Sdo4OKIJtbPiEBJHExhH4KAI2DMHTastoC5IPAIZaJZfbg7C5akPEVzQek4NFtdB4Jcg5pcLrB600nVJyHqao');

// Payment method setup component
function TenantPaymentSetup({ tenantId, leaseId }) {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('card');

  useEffect(() => {
    // Fetch setup intent from backend
    async function getSetupIntent() {
      try {
        setLoading(true);
        const response = await fetch(`/api/tenants/${tenantId}/payment-setup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leaseId,
            paymentMethodType: selectedMethod
          })
        });

        if (!response.ok) {
          throw new Error('Failed to initialize payment setup');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    getSetupIntent();
  }, [tenantId, leaseId, selectedMethod]);

  if (loading) return <div className="loading-spinner">Setting up payment...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (setupComplete) return <div className="success-message">Payment method saved successfully!</div>;

  const options = {
    clientSecret,
    appearance: {
      theme: 'flat',
      variables: {
        colorPrimary: '#7863f9',
        borderRadius: '6px',
      },
    },
  };

  return (
    <div className="payment-setup-container">
      <div className="payment-method-selector">
        <label className={selectedMethod === 'card' ? 'selected' : ''}>
          <input
            type="radio"
            name="paymentMethod"
            value="card"
            checked={selectedMethod === 'card'}
            onChange={() => setSelectedMethod('card')}
          />
          <span className="method-icon card-icon"></span>
          <span className="method-name">Credit/Debit Card</span>
          <span className="method-description">Convenient but 2.9% + 30¢ fee</span>
        </label>

        <label className={selectedMethod === 'us_bank_account' ? 'selected' : ''}>
          <input
            type="radio"
            name="paymentMethod"
            value="us_bank_account"
            checked={selectedMethod === 'us_bank_account'}
            onChange={() => setSelectedMethod('us_bank_account')}
          />
          <span className="method-icon bank-icon"></span>
          <span className="method-name">Bank Account (ACH)</span>
          <span className="method-description">No fees, takes 3-5 days</span>
        </label>
      </div>

      <Elements stripe={stripePromise} options={options}>
        <PaymentSetupForm
          onComplete={() => setSetupComplete(true)}
          paymentMethodType={selectedMethod}
          tenantId={tenantId}
          leaseId={leaseId}
        />
      </Elements>
    </div>
  );
}

function PaymentSetupForm({ onComplete, paymentMethodType, tenantId, leaseId }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      // Confirm setup
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tenant/payment-confirmed`,
        },
        redirect: 'if_required',
      });

      if (result.error) {
        throw result.error;
      }

      // Save payment method on backend
      const response = await fetch(`/api/tenants/${tenantId}/payment-methods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupIntentId: result.setupIntent.id,
          leaseId: leaseId,
          isDefault: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save payment method');
      }

      // Setup autopay if selected
      if (document.getElementById('enable-autopay')?.checked) {
        await fetch(`/api/tenants/${tenantId}/autopay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leaseId: leaseId,
            enabled: true
          })
        });
      }

      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <PaymentElement />

      {paymentMethodType === 'us_bank_account' && (
        <div className="mandate-notice">
          <p>
            By adding your bank account, you authorize rent payments according to your lease terms.
            Payments will be processed on the due date each month.
          </p>
        </div>
      )}

      <div className="autopay-option">
        <label>
          <input type="checkbox" id="enable-autopay" defaultChecked />
          Enable automatic payments on due date
        </label>
        <p className="autopay-description">
          We'll automatically process your rent payment on the due date each month
        </p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="submit-button"
      >
        {processing ? 'Processing...' : 'Save Payment Method'}
      </button>
    </form>
  );
}
```

### 5. Generating Rent Payments

```javascript
// Generate rent payments for the upcoming month
async function generateMonthlyRentPayments() {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Find active leases with payments due in the next 7 days
  const upcomingPayments = await db.query(`
    SELECT l.id as lease_id, l.tenant_id, l.rent_amount, l.unit_id, l.payment_day,
           lps.rent_due_day, lps.currency, lps.grace_period_days,
           t.stripe_customer_id, t.user_id,
           u.property_id,
           p.landlord_id,
           la.stripe_account_id as landlord_stripe_account
    FROM leases l
    JOIN lease_payment_settings lps ON l.id = lps.lease_id
    JOIN tenants t ON l.tenant_id = t.id
    JOIN units u ON l.unit_id = u.id
    JOIN properties p ON u.property_id = p.id
    JOIN landlords la ON p.landlord_id = la.id
    WHERE l.status = 'active'
      AND lps.rent_due_day BETWEEN $1 AND $2
  `, [
    now.getDate(), // Today
    now.getDate() + 7 // Next 7 days
  ]);

  for (const lease of upcomingPayments) {
    // Calculate due date for this month
    let dueDate = new Date(currentYear, currentMonth, lease.rent_due_day);

    // If due date is in the past, it's for next month
    if (dueDate < now) {
      dueDate = new Date(currentYear, currentMonth + 1, lease.rent_due_day);
    }

    // Check if payment already exists
    const existingPayment = await db.rent_payments.findOne({
      lease_id: lease.lease_id,
      period_start: new Date(dueDate.getFullYear(), dueDate.getMonth(), 1), // First day of month
      period_end: new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0) // Last day of month
    });

    if (existingPayment) continue; // Skip if already generated

    // Calculate period dates (full month)
    const periodStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
    const periodEnd = new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0);

    // Calculate platform fee (e.g., 2%)
    const platformFeePercentage = 0.02;
    const platformFee = Math.round(lease.rent_amount * platformFeePercentage);
    const landlordAmount = lease.rent_amount - platformFee;

    // Check if tenant has autopay enabled
    const autopayEnabled = await db.payment_schedules.findOne({
      lease_id: lease.lease_id,
      tenant_id: lease.tenant_id,
      status: 'active'
    });

    if (autopayEnabled) {
      // For autopay, create a payment intent right away
      const paymentIntent = await stripe.paymentIntents.create({
        amount: lease.rent_amount,
        currency: lease.currency,
        customer: lease.stripe_customer_id,
        payment_method: autopayEnabled.payment_method_id,
        payment_method_types: ['card', 'us_bank_account'],
        off_session: true,
        confirm: true,
        statement_descriptor: `Rent ${periodStart.toLocaleString('default', { month: 'short' })} ${dueDate.getFullYear()}`,
        application_fee_amount: platformFee,
        transfer_data: {
          destination: lease.landlord_stripe_account,
        },
        metadata: {
          lease_id: lease.lease_id,
          tenant_id: lease.tenant_id,
          property_id: lease.property_id,
          period_start: periodStart.toISOString(),Sorry, there was an error generating the answer! Please try again.

Click [here](https://docs.stripe.com) to view the Stripe documentation

# Lease Renewal Management System

Here's a comprehensive schema and implementation for handling lease renewals, including automated reminders and notifications:

## Database Schema for Lease Renewal

```sql
-- Core lease table (extending previous schema)
CREATE TABLE public.leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  unit_id UUID REFERENCES public.units(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount INTEGER NOT NULL,
  rent_currency TEXT NOT NULL DEFAULT 'usd',
  payment_day INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'active', 'ended', 'renewed', 'terminated'
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lease renewal tracking
CREATE TABLE public.lease_renewals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  renewal_type TEXT NOT NULL, -- 'automatic', 'manual', 'modified'
  status TEXT NOT NULL, -- 'pending', 'offered', 'accepted', 'declined', 'expired'
  new_rent_amount INTEGER,
  rent_change_percentage DECIMAL(5,2),
  new_start_date DATE,
  new_end_date DATE,
  renewal_term_months INTEGER,
  landlord_approval_status TEXT, -- 'pending', 'approved', 'rejected'
  landlord_approved_at TIMESTAMP WITH TIME ZONE,
  landlord_approver_id UUID REFERENCES auth.users(id),
  tenant_response_status TEXT, -- 'pending', 'accepted', 'rejected', 'counter_offered'
  tenant_responded_at TIMESTAMP WITH TIME ZONE,
  counter_offer_details JSONB,
  renewal_offered_at TIMESTAMP WITH TIME ZONE,
  renewal_deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New lease created from renewal
CREATE TABLE public.renewal_lease_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_lease_id UUID REFERENCES public.leases(id) NOT NULL,
  renewal_id UUID REFERENCES public.lease_renewals(id) NOT NULL,
  new_lease_id UUID REFERENCES public.leases(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(original_lease_id, new_lease_id)
);

-- Renewal documents and signatures
CREATE TABLE public.lease_renewal_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  renewal_id UUID REFERENCES public.lease_renewals(id) NOT NULL,
  document_type TEXT NOT NULL, -- 'renewal_offer', 'addendum', 'full_lease'
  document_url TEXT NOT NULL,
  landlord_signature_status TEXT NOT NULL, -- 'pending', 'signed'
  landlord_signed_at TIMESTAMP WITH TIME ZONE,
  tenant_signature_status TEXT NOT NULL, -- 'pending', 'signed'
  tenant_signed_at TIMESTAMP WITH TIME ZONE,
  document_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communication reminders for renewal
CREATE TABLE public.lease_renewal_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  renewal_id UUID REFERENCES public.lease_renewals(id) NOT NULL,
  recipient_user_id UUID REFERENCES auth.users(id) NOT NULL,
  recipient_type TEXT NOT NULL, -- 'tenant', 'landlord'
  communication_type TEXT NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  template TEXT NOT NULL, -- 'initial_reminder', 'offer_sent', 'reminder', 'expiry_warning', 'confirmation'
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  action_taken_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL, -- 'scheduled', 'sent', 'delivered', 'opened', 'clicked', 'failed'
  content JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Non-renewal intent
CREATE TABLE public.lease_non_renewals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  initiated_by TEXT NOT NULL, -- 'tenant', 'landlord'
  initiator_user_id UUID REFERENCES auth.users(id) NOT NULL,
  reason TEXT,
  reason_category TEXT, -- 'moving', 'price', 'property_condition', 'other'
  notice_date DATE NOT NULL,
  move_out_date DATE NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'acknowledged', 'canceled', 'completed'
  acknowledgement_date TIMESTAMP WITH TIME ZONE,
  acknowledger_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Server Implementation for Lease Renewal Management

### 1. Automated Renewal Reminder Scheduler

```javascript
const cron = require('node-cron');
const { DateTime } = require('luxon');

// Schedule daily check for leases needing renewal reminders
cron.schedule('0 7 * * *', async () => {
  console.log('Running lease renewal reminder check...');
  await scheduleRenewalReminders();
});

async function scheduleRenewalReminders() {
  const db = getDatabase();

  // Find leases approaching end date (60, 45, 30, 15, and 7 days before end)
  const reminderIntervals = [60, 45, 30, 15, 7];
  const today = DateTime.now().startOf('day');

  for (const days of reminderIntervals) {
    const targetDate = today.plus({ days }).toISODate();

    // Find active leases ending on the target date
    const leasesEndingSoon = await db.query(`
      SELECT l.*, p.landlord_id, t.user_id as tenant_user_id
      FROM leases l
      JOIN properties p ON l.property_id = p.id
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.end_date = $1
      AND l.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM lease_renewals lr
        WHERE lr.lease_id = l.id AND lr.status != 'expired'
      )
    `, [targetDate]);

    for (const lease of leasesEndingSoon) {
      // Check if a reminder for this interval has already been sent
      const existingReminder = await db.lease_renewal_communications.findOne({
        renewal_id: null,
        template: `reminder_${days}_days`,
        recipient_user_id: lease.tenant_user_id
      });

      if (!existingReminder) {
        await sendLeaseEndingReminder(lease, days);
      }

      // For 60-day notification, auto-create renewal opportunity for landlord
      if (days === 60) {
        await createRenewalOpportunity(lease);
      }
    }
  }
}

async function sendLeaseEndingReminder(lease, daysRemaining) {
  const db = getDatabase();
  const tenant = await db.users.findOne({ id: lease.tenant_user_id });
  const property = await db.properties.findOne({ id: lease.property_id });
  const unit = await db.units.findOne({ id: lease.unit_id });
  const landlord = await db.users.findOne({ id: property.landlord_user_id });

  // 1. Send tenant notification
  await db.lease_renewal_communications.insert({
    lease_id: lease.id,
    renewal_id: null,
    recipient_user_id: tenant.id,
    recipient_type: 'tenant',
    communication_type: 'email',
    template: `reminder_${daysRemaining}_days`,
    scheduled_for: new Date(),
    status: 'scheduled',
    content: {
      tenant_name: tenant.first_name,
      property_address: property.address,
      unit_number: unit.unit_number,
      days_remaining: daysRemaining,
      end_date: lease.end_date,
      renewal_link: `${process.env.BASE_URL}/tenant/leases/${lease.id}/renew`
    }
  });

  // 2. Send landlord notification
  await db.lease_renewal_communications.insert({
    lease_id: lease.id,
    renewal_id: null,
    recipient_user_id: landlord.id,
    recipient_type: 'landlord',
    communication_type: 'email',
    template: `landlord_reminder_${daysRemaining}_days`,
    scheduled_for: new Date(),
    status: 'scheduled',
    content: {
      landlord_name: landlord.first_name,
      tenant_name: `${tenant.first_name} ${tenant.last_name}`,
      property_address: property.address,
      unit_number: unit.unit_number,
      days_remaining: daysRemaining,
      end_date: lease.end_date,
      current_rent: lease.rent_amount,
      management_link: `${process.env.BASE_URL}/landlord/properties/${property.id}/units/${unit.id}/leases/${lease.id}/renew`
    }
  });

  // Process scheduled communications
  await processScheduledCommunications();
}

async function createRenewalOpportunity(lease) {
  const db = getDatabase();

  // Calculate suggested new rent (e.g., 3% increase)
  const suggestedIncrease = 1.03;
  const newRentAmount = Math.round(lease.rent_amount * suggestedIncrease);

  // Calculate new lease dates (typically 1 year renewal)
  const endDate = DateTime.fromISO(lease.end_date);
  const newStartDate = endDate.plus({ days: 1 }).toISODate();
  const newEndDate = endDate.plus({ years: 1 }).toISODate();

  // Create renewal record for landlord review
  await db.lease_renewals.insert({
    lease_id: lease.id,
    renewal_type: 'manual',
    status: 'pending',
    new_rent_amount: newRentAmount,
    rent_change_percentage: 3.0,
    new_start_date: newStartDate,
    new_end_date: newEndDate,
    renewal_term_months: 12,
    landlord_approval_status: 'pending',
    tenant_response_status: 'pending',
    renewal_deadline: endDate.minus({ days: 30 }).toISODate() // Typically 30 days before lease end
  });
}
```

### 2. Landlord Renewal Offer Processing

```javascript
async function createRenewalOffer(renewalId, landlordUserId) {
  const db = getDatabase();

  // Get renewal information
  const renewal = await db.lease_renewals.findOne({ id: renewalId });
  if (!renewal) throw new Error('Renewal not found');

  // Get lease details
  const lease = await db.leases.findOne({ id: renewal.lease_id });
  if (!lease) throw new Error('Lease not found');

  // Verify landlord permissions
  const property = await db.properties.findOne({ id: lease.property_id });
  if (property.landlord_user_id !== landlordUserId) {
    throw new Error('Unauthorized access to renewal');
  }

  // Update renewal status
  await db.lease_renewals.update(
    { id: renewalId },
    {
      status: 'offered',
      landlord_approval_status: 'approved',
      landlord_approved_at: new Date(),
      landlord_approver_id: landlordUserId,
      renewal_offered_at: new Date()
    }
  );

  // Create renewal documents
  const documentUrl = await generateRenewalDocument(renewal, lease);

  await db.lease_renewal_documents.insert({
    renewal_id: renewalId,
    document_type: 'renewal_offer',
    document_url: documentUrl,
    landlord_signature_status: 'signed',
    landlord_signed_at: new Date(),
    tenant_signature_status: 'pending'
  });

  // Schedule tenant communications
  await scheduleTenantRenewalCommunications(renewalId);

  return {
    success: true,
    renewal_id: renewalId,
    document_url: documentUrl
  };
}

async function scheduleTenantRenewalCommunications(renewalId) {
  const db = getDatabase();
  const renewal = await db.lease_renewals.findOne({ id: renewalId });
  const lease = await db.leases.findOne({ id: renewal.lease_id });
  const tenant = await db.tenants.findOne({ id: lease.tenant_id });
  const tenantUser = await db.users.findOne({ id: tenant.user_id });

  // Initial offer notification
  await db.lease_renewal_communications.insert({
    renewal_id: renewalId,
    recipient_user_id: tenantUser.id,
    recipient_type: 'tenant',
    communication_type: 'email',
    template: 'renewal_offer',
    scheduled_for: new Date(),
    status: 'scheduled',
    content: {
      tenant_name: tenantUser.first_name,
      property_name: await getPropertyName(lease.property_id),
      current_rent: formatCurrency(lease.rent_amount, lease.rent_currency),
      new_rent: formatCurrency(renewal.new_rent_amount, lease.rent_currency),
      percentage_change: renewal.rent_change_percentage,
      new_start_date: renewal.new_start_date,
      new_end_date: renewal.new_end_date,
      response_deadline: renewal.renewal_deadline,
      days_to_respond: calculateDaysUntil(renewal.renewal_deadline),
      renewal_link: `${process.env.BASE_URL}/tenant/renewals/${renewalId}/review`
    }
  });

  // Schedule reminders at 7, 3, and 1 days before deadline
  const deadline = DateTime.fromISO(renewal.renewal_deadline);
  const reminderDays = [7, 3, 1];

  for (const days of reminderDays) {
    const reminderDate = deadline.minus({ days }).startOf('day');
    // Only schedule if reminder date is in the future
    if (reminderDate > DateTime.now()) {
      await db.lease_renewal_communications.insert({
        renewal_id: renewalId,
        recipient_user_id: tenantUser.id,
        recipient_type: 'tenant',
        communication_type: 'email',
        template: `renewal_reminder_${days}`,
        scheduled_for: reminderDate.toJSDate(),
        status: 'scheduled',
        content: {
          tenant_name: tenantUser.first_name,
          days_remaining: days,
          deadline_date: renewal.renewal_deadline,
          renewal_link: `${process.env.BASE_URL}/tenant/renewals/${renewalId}/review`
        }
      });
    }
  }

  // Process communications
  await processScheduledCommunications();
}
```

### 3. Tenant Renewal Response Handler

```javascript
async function processRenewalResponse(renewalId, tenantUserId, response) {
  const db = getDatabase();

  // Get renewal information
  const renewal = await db.lease_renewals.findOne({ id: renewalId });
  if (!renewal || renewal.status !== 'offered') {
    throw new Error('Invalid renewal or status');
  }

  // Verify tenant permissions
  const lease = await db.leases.findOne({ id: renewal.lease_id });
  const tenant = await db.tenants.findOne({ id: lease.tenant_id });
  if (tenant.user_id !== tenantUserId) {
    throw new Error('Unauthorized access to renewal');
  }

  const now = new Date();

  // Process response based on decision
  if (response.decision === 'accept') {
    // Update renewal
    await db.lease_renewals.update(
      { id: renewalId },
      {
        status: 'accepted',
        tenant_response_status: 'accepted',
        tenant_responded_at: now
      }
    );

    // Sign document
    await db.lease_renewal_documents.update(
      { renewal_id: renewalId, document_type: 'renewal_offer' },
      {
        tenant_signature_status: 'signed',
        tenant_signed_at: now
      }
    );

    // Create new lease based on renewal
    const newLeaseId = await createRenewalLease(renewal, lease);

    // Map renewal to new lease
    await db.renewal_lease_mapping.insert({
      original_lease_id: lease.id,
      renewal_id: renewalId,
      new_lease_id: newLeaseId
    });

    // Update original lease status
    await db.leases.update(
      { id: lease.id },
      { status: 'renewed' }
    );

    // Send confirmation to both parties
    await sendRenewalConfirmations(renewalId, 'accepted');

    return {
      success: true,
      status: 'accepted',
      new_lease_id: newLeaseId
    };
  }
  else if (response.decision === 'decline') {
    // Update renewal
    await db.lease_renewals.update(
      { id: renewalId },
      {
        status: 'declined',
        tenant_response_status: 'rejected',
        tenant_responded_at: now
      }
    );

    // Create non-renewal intent
    await db.lease_non_renewals.insert({
      lease_id: lease.id,
      initiated_by: 'tenant',
      initiator_user_id: tenantUserId,
      reason: response.reason,
      reason_category: response.reason_category,
      notice_date: now,
      move_out_date: lease.end_date,
      status: 'pending'
    });

    // Notify landlord of non-renewal
    await notifyLandlordOfNonRenewal(lease.id, 'tenant_declined');

    return {
      success: true,
      status: 'declined'
    };
  }
  else if (response.decision === 'counter_offer') {
    // Update renewal
    await db.lease_renewals.update(
      { id: renewalId },
      {
        status: 'pending',
        tenant_response_status: 'counter_offered',
        tenant_responded_at: now,
        counter_offer_details: response.counter_offer
      }
    );

    // Notify landlord of counter offer
    await notifyLandlordOfCounterOffer(renewalId);

    return {
      success: true,
      status: 'counter_offered'
    };
  }

  throw new Error('Invalid response decision');
}

async function createRenewalLease(renewal, originalLease) {
  const db = getDatabase();

  // Create new lease record
  const newLease = await db.leases.insert({
    tenant_id: originalLease.tenant_id,
    property_id: originalLease.property_id,
    unit_id: originalLease.unit_id,
    start_date: renewal.new_start_date,
    end_date: renewal.new_end_date,
    rent_amount: renewal.new_rent_amount,
    rent_currency: originalLease.rent_currency,
    payment_day: originalLease.payment_day,
    status: 'active',
    // If using Stripe for payments, we'll handle subscription updates separately
  });

  // If using Stripe subscriptions, handle the transition
  if (originalLease.stripe_subscription_id) {
    await updateStripeSubscriptionForRenewal(
      originalLease.stripe_subscription_id,
      renewal.new_rent_amount,
      new Date(renewal.new_start_date)
    );

    // Update the new lease with the same subscription ID
    await db.leases.update(
      { id: newLease.id },
      { stripe_subscription_id: originalLease.stripe_subscription_id }
    );
  }

  return newLease.id;
}

async function updateStripeSubscriptionForRenewal(subscriptionId, newAmount, newStartDate) {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

  // Retrieve the subscription
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Calculate new price based on the new rent amount
  const unitAmountInCents = newAmount * 100;

  // Create a new price for the updated rent
  const newPrice = await stripe.prices.create({
    unit_amount: unitAmountInCents,
    currency: subscription.currency,
    recurring: {
      interval: 'month',
      interval_count: 1
    },
    product: subscription.items.data[0].price.product,
    metadata: {
      renewal: 'true'
    }
  });

  // Update subscription with the new price
  // Schedule the update to take effect on the renewal start date
  await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPrice.id
      }
    ],
    proration_behavior: 'none',
    metadata: {
      renewed_at: new Date().toISOString(),
      original_amount: subscription.items.data[0].price.unit_amount,
      new_amount: unitAmountInCents
    }
  });
}
```

### 4. Non-Renewal Intent Handler

```javascript
async function submitNonRenewalIntent(leaseId, userId, data) {
  const db = getDatabase();

  // Get lease information
  const lease = await db.leases.findOne({ id: leaseId });
  if (!lease || lease.status !== 'active') {
    throw new Error('Invalid lease or status');
  }

  // Determine if user is tenant or landlord
  const tenant = await db.tenants.findOne({ id: lease.tenant_id });
  const property = await db.properties.findOne({ id: lease.property_id });

  let initiatedBy, initiatorUserId;
  Sorry, there was an error generating the answer! Please try again.

Click [here](https://docs.stripe.com) to view the Stripe documentation



# Property Management Software Integration with Stripe

To fully leverage Stripe in your property management system, here are additional schema components and implementations you might need:

## Additional Database Schema Elements

### Property Financial Management Tables

```sql
-- Property financial details
CREATE TABLE public.property_financials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  stripe_external_account_id TEXT, -- For dedicated property payouts
  default_payment_method_id UUID REFERENCES public.saved_payment_methods(id), -- For property expenses
  bank_account_id UUID REFERENCES public.financial_accounts(id), -- For property-specific banking
  tax_id_number TEXT,
  tax_classification TEXT,
  escrow_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rent schedules
CREATE TABLE public.rent_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES public.units(id) NOT NULL,
  lease_id UUID REFERENCES public.leases(id),
  effective_date DATE NOT NULL,
  end_date DATE,
  rent_amount INTEGER NOT NULL,
  rent_currency TEXT NOT NULL DEFAULT 'usd',
  rent_cycle TEXT NOT NULL DEFAULT 'monthly', -- 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'
  prorated_amount INTEGER,
  due_day INTEGER NOT NULL DEFAULT 1,
  grace_period_days INTEGER DEFAULT 5,
  late_fee_amount INTEGER,
  late_fee_type TEXT, -- 'fixed', 'percentage'
  stripe_price_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security deposits
CREATE TABLE public.security_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- 'pending', 'held', 'partially_refunded', 'fully_refunded'
  stripe_payment_intent_id TEXT,
  stripe_payment_method_id TEXT,
  payment_status TEXT NOT NULL, -- 'unpaid', 'paid', 'refunded'
  held_in_escrow BOOLEAN DEFAULT FALSE,
  escrow_account_id TEXT,
  paid_date DATE,
  refund_date DATE,
  refund_amount INTEGER,
  stripe_refund_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance requests with payment tracking
CREATE TABLE public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES public.units(id) NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL, -- 'open', 'assigned', 'in_progress', 'completed', 'closed'
  priority TEXT NOT NULL, -- 'emergency', 'urgent', 'normal', 'low'
  vendor_id UUID REFERENCES public.vendors(id),
  estimated_cost INTEGER,
  actual_cost INTEGER,
  stripe_payment_intent_id TEXT,
  payment_status TEXT, -- 'unpaid', 'pending', 'paid'
  tenant_responsible BOOLEAN DEFAULT FALSE,
  tenant_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendors for maintenance
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  stripe_connected_account_id TEXT,
  onboarded BOOLEAN DEFAULT FALSE,
  default_payment_method TEXT, -- 'ach', 'card', 'check'
  payment_terms INTEGER DEFAULT 30, -- Net days
  tax_id_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Utility billing
CREATE TABLE public.utility_bills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  utility_type TEXT NOT NULL, -- 'water', 'electricity', 'gas', 'internet', 'cable'
  bill_date DATE NOT NULL,
  total_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_status TEXT NOT NULL, -- 'unpaid', 'processing', 'paid'
  stripe_payment_intent_id TEXT,
  allocation_method TEXT, -- 'equal', 'square_footage', 'percentage', 'submeter'
  allocated_to_tenants BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant utility allocations
CREATE TABLE public.tenant_utility_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  utility_bill_id UUID REFERENCES public.utility_bills(id) NOT NULL,
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_invoice_item_id TEXT,
  stripe_invoice_id TEXT,
  payment_status TEXT NOT NULL, -- 'unbilled', 'billed', 'paid'
  due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Advanced Payment Tracking

```sql
-- Rent invoice tracking
CREATE TABLE public.rent_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  due_date DATE NOT NULL,
  status TEXT NOT NULL, -- 'draft', 'sent', 'paid', 'past_due', 'void'
  stripe_invoice_id TEXT,
  pdf_url TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  subtotal INTEGER NOT NULL,
  tax_amount INTEGER DEFAULT 0,
  late_fees INTEGER DEFAULT 0,
  credits INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  memo TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment plans for tenants struggling with payments
CREATE TABLE public.payment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  original_amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- 'active', 'completed', 'defaulted', 'canceled'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  installment_frequency TEXT NOT NULL, -- 'weekly', 'biweekly', 'monthly'
  installment_amount INTEGER NOT NULL,
  remaining_balance INTEGER NOT NULL,
  next_payment_date DATE NOT NULL,
  stripe_subscription_id TEXT, -- For recurring payments
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Additional fees/charges
CREATE TABLE public.additional_charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  charge_type TEXT NOT NULL, -- 'late_fee', 'pet_fee', 'parking_fee', 'utility', 'damage', 'other'
  description TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  recurring BOOLEAN DEFAULT FALSE,
  frequency TEXT, -- 'one_time', 'monthly', 'annually'
  due_date DATE NOT NULL,
  stripe_invoice_item_id TEXT,
  status TEXT NOT NULL, -- 'pending', 'invoiced', 'paid'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Lease Application and Screening

```sql
-- Rental applications
CREATE TABLE public.rental_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  unit_id UUID REFERENCES public.units(id),
  applicant_id UUID REFERENCES public.users(id) NOT NULL,
  status TEXT NOT NULL, -- 'draft', 'submitted', 'screening', 'approved', 'denied', 'canceled'
  desired_move_in DATE,
  lease_term INTEGER, -- In months
  monthly_income INTEGER,
  application_fee_amount INTEGER,
  application_fee_paid BOOLEAN DEFAULT FALSE,
  stripe_payment_intent_id TEXT,
  credit_check_id UUID,
  background_check_id UUID,
  eviction_check_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application screening services
CREATE TABLE public.screening_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES public.rental_applications(id) NOT NULL,
  report_type TEXT NOT NULL, -- 'credit', 'background', 'eviction', 'income'
  provider TEXT NOT NULL, -- 'experian', 'transunion', 'checkr', etc.
  status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
  score INTEGER,
  recommendation TEXT, -- 'approved', 'conditional', 'denied'
  report_url TEXT,
  report_data JSONB,
  fee_amount INTEGER NOT NULL,
  stripe_payment_intent_id TEXT, -- For payment to screening service
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Owner/Investor Payment Distribution

```sql
-- Property ownership
CREATE TABLE public.property_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  stripe_connected_account_id TEXT, -- For direct payouts
  tax_id_number TEXT,
  tax_form_type TEXT, -- 'w9', 'w8ben', etc.
  ownership_entities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property ownership percentages
CREATE TABLE public.property_ownership (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  owner_id UUID REFERENCES public.property_owners(id) NOT NULL,
  ownership_percentage DECIMAL(5,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_percentage CHECK (ownership_percentage > 0 AND ownership_percentage <= 100)
);

-- Owner distributions
CREATE TABLE public.owner_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  owner_id UUID REFERENCES public.property_owners(id) NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  distribution_date DATE NOT NULL,
  status TEXT NOT NULL, -- 'scheduled', 'processing', 'completed', 'failed'
  distribution_type TEXT NOT NULL, -- 'rent', 'sale', 'refinance', 'other'
  stripe_transfer_id TEXT,
  transaction_fee INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property income statement
CREATE TABLE public.property_financials_monthly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  month DATE NOT NULL,
  income_rent INTEGER DEFAULT 0,
  income_fees INTEGER DEFAULT 0,
  income_other INTEGER DEFAULT 0,
  expense_mortgage INTEGER DEFAULT 0,
  expense_tax INTEGER DEFAULT 0,
  expense_insurance INTEGER DEFAULT 0,
  expense_utilities INTEGER DEFAULT 0,
  expense_repairs INTEGER DEFAULT 0,
  expense_management_fees INTEGER DEFAULT 0,
  net_operating_income INTEGER DEFAULT 0,
  distributed_to_owners INTEGER DEFAULT 0,
  reserve_allocation INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(property_id, month)
);
```

## Implementation Components for Stripe Integration

### 1. Tenant Payment Portal

```javascript
// Create a setup intent for saving payment methods
async function createTenantSetupIntent(tenantId) {
  // Get tenant data
  const tenant = await db.tenants.findOne({
    id: tenantId
  });

  // Create a setup intent
  const setupIntent = await stripe.setupIntents.create({
    customer: tenant.stripe_customer_id,
    payment_method_types: ['card', 'us_bank_account', 'cashapp'],
    usage: 'off_session', // Allow using the payment method later without user
    automatic_payment_methods: {
      enabled: true, // Enable all relevant payment methods
    },
    metadata: {
      tenant_id: tenantId
    }
  });

  return setupIntent;
}

// Create a Payment Element for rent payments
async function createRentPaymentIntent(leaseId, amount, description) {
  // Get lease and tenant data
  const lease = await db.leases.findOne({
    id: leaseId,
    include: [{
      model: db.tenants,
      include: [{
        model: db.users
      }]
    }, {
      model: db.units,
      include: [{
        model: db.properties,
        include: [{
          model: db.landlords
        }]
      }]
    }]
  });

  const tenant = lease.tenant;
  const property = lease.unit.property;
  const landlord = property.landlord;

  // Calculate platform fee
  const applicationFeeAmount = Math.floor(amount * 0.015); // 1.5% platform fee

  // Create a payment intent with the connected account
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: lease.rent_currency,
    customer: tenant.stripe_customer_id,
    description: `Rent payment for ${property.name} - ${lease.unit.unit_number} - ${description}`,
    statement_descriptor: `RENT ${property.name}`.substring(0, 22),
    application_fee_amount: applicationFeeAmount,
    transfer_data: {
      destination: landlord.stripe_account_id,
    },
    metadata: {
      lease_id: leaseId,
      tenant_id: tenant.id,
      property_id: property.id,
      unit_id: lease.unit_id,
      payment_type: 'rent',
      period: description
    },
    automatic_payment_methods: {
      enabled: true,
    }
  });

  // Record the payment attempt
  await db.payments.insert({
    lease_id: leaseId,
    stripe_payment_intent_id: paymentIntent.id,
    amount,
    currency: lease.rent_currency,
    status: paymentIntent.status,
    period_start: new Date(description.split(' - ')[0]),
    period_end: new Date(description.split(' - ')[1]),
    application_fee_amount: applicationFeeAmount
  });

  return paymentIntent;
}
```

### 2. Automated Rent Collection System

```javascript
// Create a subscription for automatic rent collection
async function setupAutomaticRentPayments(leaseId, paymentMethodId) {
  const lease = await db.leases.findOne({
    id: leaseId,
    include: [{
      model: db.tenants,
    }, {
      model: db.units,
      include: [{
        model: db.properties,
        include: [{
          model: db.landlords
        }]
      }]
    }]
  });

  const tenant = lease.tenant;
  const landlord = lease.unit.property.landlord;

  // Create a product if it doesn't exist
  let product = await db.billing_products.findOne({
    where: {
      metadata: {
        property_id: lease.unit.property_id,
        type: 'rent'
      }
    }
  });

  if (!product) {
    const stripeProduct = await stripe.products.create({
      name: `Rent - ${lease.unit.property.name}`,
      type: 'service',
      metadata: {
        property_id: lease.unit.property_id,
        type: 'rent'
      }
    });

    product = await db.billing_products.insert({
      stripe_product_id: stripeProduct.id,
      name: stripeProduct.name,
      metadata: stripeProduct.metadata
    });
  }

  // Create a price for this specific rent amount
  const stripePrice = await stripe.prices.create({
    product: product.stripe_product_id,
    unit_amount: lease.rent_amount,
    currency: lease.rent_currency,
    recurring: {
      interval: 'month',
      interval_count: 1,
    },
    metadata: {
      unit_id: lease.unit_id,
      rent_amount: lease.rent_amount
    }
  });

  // Create rent price in DB
  const price = await db.billing_prices.insert({
    stripe_price_id: stripePrice.id,
    product_id: product.id,
    currency: lease.rent_currency,
    unit_amount: lease.rent_amount,
    recurring_interval: 'month',
    recurring_interval_count: 1,
    metadata: stripePrice.metadata
  });

  // Determine billing cycle anchor based on lease payment day
  const now = new Date();
  let billingCycleAnchor = new Date(now.getFullYear(), now.getMonth(), lease.payment_day);

  if (billingCycleAnchor < now) {
    billingCycleAnchor.setMonth(billingCycleAnchor.getMonth() + 1);
  }

  // Create a subscription
  const subscription = await stripe.subscriptions.create({
    customer: tenant.stripe_customer_id,
    items: [
      {
        price: stripePrice.id,
      },
    ],
    billing_cycle_anchor: Math.floor(billingCycleAnchor.getTime() / 1000),
    proration_behavior: 'none',
    payment_behavior: 'default_incomplete',
    payment_settings: {
      payment_method_types: ['card', 'us_bank_account'],
      save_default_payment_method: 'on_subscription',
      payment_method_options: {
        us_bank_account: {
          financial_connections: { permissions: ['payment_method'] }
        }
      }
    },
    default_payment_method: paymentMethodId,
    application_fee_percent: 1.5,
    transfer_data: {
      destination: landlord.stripe_account_id,
    },
    metadata: {
      lease_id: leaseId,
      unit_id: lease.unit_id,
      property_id: lease.unit.property_id,
      payment_type: 'rent_subscription'
    }
  });

  // Update the lease with subscription details
  await db.leases.update(
    { id: leaseId },
    {
      stripe_subscription_id: subscription.id,
      autopay_enabled: true,
      payment_method_id: paymentMethodId
    }
  );

  return subscription;
}
```

### 3. Security Deposit Management

```javascript
// Create a payment intent for security deposit
async function createSecurityDepositPayment(leaseId) {
  const lease = await db.leases.findOne({
    id: leaseId,
    include: [{
      model: db.tenants
    }, {
      model: db.units,
      include: [{
        model: db.properties,
        include: [{
          model: db.landlords
        }]
      }]
    }]
  });

  // Calculate deposit amount (typically 1-2 months rent)
  const depositAmount = lease.security_deposit_amount;

  // Create a payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: depositAmount,
    currency: lease.rent_currency,
    customer: lease.tenant.stripe_customer_id,
    description: `Security deposit for ${lease.unit.property.name} - ${lease.unit.unit_number}`,
    statement_descriptor: 'SECURITY DEPOSIT',
    metadata: {
      lease_id: leaseId,
      payment_type: 'security_deposit'
    },
    automatic_payment_methods: {
      enabled: true
    },
    transfer_data: {
      destination: lease.unit.property.landlord.stripe_account_id,
    },
    // Optional - hold funds in escrow
    // transfer_group: `deposit-${leaseId}`,
  });

  // Create security deposit record
  await db.security_deposits.insert({
    lease_id: leaseId,
    amount: depositAmount,
    currency: lease.rent_currency,
    status: 'pending',
    stripe_payment_intent_id: paymentIntent.id,
    payment_status: 'unpaid'
  });

  return paymentIntent;
}

// Process security deposit refund
async function processSecurityDepositRefund(leaseId, refundAmount, reason) {
  const deposit = await db.security_deposits.findOne({
    lease_id: leaseId,
    include: [{
      model: db.leases,
      include: [{
        model: db.units,
        include: [{
          model: db.properties,
          include: [{
            model: db.landlords
          }]
        }]
      }]
    }]
  });

  if (deposit.status !== 'held' || deposit.payment_status !== 'paid') {
    throw new Error('Cannot refund deposit that is not paid and held');
  }

  // If refunding partial amount, validate it's not more than original
  if (refundAmount > deposit.amount) {
    throw new Error('Refund amount cannot exceed original deposit amount');
  }

  // Process the refund through Stripe
  const refund = await stripe.refunds.create({
    payment_intent: deposit.stripe_payment_intent_id,
    amount: refundAmount,
    reason: 'requested_by_customer',
    metadata: {
      lease_id: leaseId,
      refund_reason: reason
    }
  });

  // Update the deposit record
  await db.security_deposits.update(
    { id: deposit.id },
    {
      status: refundAmount === deposit.amount ? 'fully_refunded' : 'partially_refunded',
      refund_date: new Date(),
      refund_amount: refundAmount,
      stripe_refund_id: refund.id,
      payment_status: refundAmount === deposit.amount ? 'refunded' : 'paid'
    }
  );

  return refund;
}
```

### 4. Owner/Property Manager Dashboard

```javascript
// Get property financial summary with Stripe data
async function getPropertyFinancialSummary(propertyId, month) {
  const property = await db.properties.findOne({
    id: propertyId,
    include: [{
      model: db.units,
      include: [{
        model: db.leases,
        where: {
          status: 'active'
        },
        required: false
      }]
    }]
  });

  // Calculate total expected rent
  let totalExpectedRent = 0;
  let totalCollectedRent = 0;
  let occupancyRate = 0;

  if (property.units && property.units.length > 0) {
    // Calculate occupancy
    const occupiedUnits = property.units.filter(unit =>
      unit.leases && unit.leases.length > 0 &&
      unit.leases.some(lease => lease.status === 'active')
    ).length;

    occupancyRate = occupiedUnits / property.units.length;

    // CalculateSorry, there was an error generating the answer! Please try again.

Click [here](https://docs.stripe.com) to view the Stripe documentation

# Additional Stripe Integration Components

Here are additional schema designs and code implementations to complete your comprehensive Stripe platform integration:

## Enhanced Schema for Platform Analytics

```sql
-- Track merchant success metrics
CREATE TABLE public.merchant_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connected_account_id UUID REFERENCES public.connected_accounts(id) NOT NULL,
  date DATE NOT NULL,
  gross_volume INTEGER NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  successful_charges_count INTEGER NOT NULL DEFAULT 0,
  failed_charges_count INTEGER NOT NULL DEFAULT 0,
  disputes_count INTEGER NOT NULL DEFAULT 0,
  avg_transaction_amount INTEGER,
  platform_fee_collected INTEGER NOT NULL DEFAULT 0,
  payout_amount INTEGER NOT NULL DEFAULT 0,
  refund_amount INTEGER NOT NULL DEFAULT 0,
  new_customers_count INTEGER NOT NULL DEFAULT 0,
  repeat_customers_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(connected_account_id, date)
);

-- Track platform-level financial metrics
CREATE TABLE public.platform_financials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  total_processing_volume INTEGER NOT NULL DEFAULT 0,
  platform_revenue INTEGER NOT NULL DEFAULT 0,
  stripe_fees INTEGER NOT NULL DEFAULT 0,
  net_revenue INTEGER NOT NULL DEFAULT 0,
  active_merchant_count INTEGER NOT NULL DEFAULT 0,
  new_merchant_count INTEGER NOT NULL DEFAULT 0,
  churn_merchant_count INTEGER NOT NULL DEFAULT 0,
  dispute_loss_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## User-Specific Payment Flow Tracking

```sql
-- Track end-user payment preferences
CREATE TABLE public.customer_payment_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) NOT NULL,
  preferred_payment_method_type TEXT,
  save_payment_method_default BOOLEAN DEFAULT TRUE,
  default_currency TEXT DEFAULT 'usd',
  default_billing_address_id UUID,
  enable_payment_links BOOLEAN DEFAULT TRUE,
  wallet_preferences JSONB DEFAULT '{"apple_pay": true, "google_pay": true, "link": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Track customer engagement with payment UIs
CREATE TABLE public.payment_ui_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id),
  page_url TEXT NOT NULL,
  ui_type TEXT NOT NULL, -- 'payment_element', 'checkout', 'payment_link', 'invoice'
  entry_point TEXT NOT NULL,
  time_to_load_ms INTEGER,
  time_to_submit_ms INTEGER,
  completed BOOLEAN,
  abandoned BOOLEAN DEFAULT FALSE,
  error_codes TEXT[],
  payment_method_types_shown TEXT[],
  payment_method_selected TEXT,
  device_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Advanced Dispute Management Schema

```sql
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_dispute_id TEXT UNIQUE NOT NULL,
  connected_account_id UUID REFERENCES public.connected_accounts(id),
  payment_intent_id TEXT NOT NULL,
  charge_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL, -- 'warning_needs_response', 'warning_under_review', 'warning_closed', 'needs_response', 'under_review', 'won', 'lost'
  reason TEXT NOT NULL, -- 'bank_cannot_process', 'check_returned', 'credit_not_processed', 'customer_initiated', 'debit_not_authorized', 'duplicate', 'fraudulent', 'general', 'incorrect_account_details', 'insufficient_funds', 'product_not_received', 'product_unacceptable', 'subscription_canceled', 'unrecognized'
  evidence_due_by TIMESTAMP WITH TIME ZONE,
  evidence_details JSONB DEFAULT '{}'::jsonb,
  is_inquired BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.dispute_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID REFERENCES public.disputes(id) NOT NULL,
  evidence_type TEXT NOT NULL, -- 'customer_communication', 'customer_signature', 'duplicate_charge_documentation', etc.
  file_id TEXT, -- Stripe File ID
  file_url TEXT,
  text_evidence TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(dispute_id, evidence_type)
);
```

## Enhanced Subscription and Billing Schema

```sql
CREATE TABLE public.subscription_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_schedule_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.users(id) NOT NULL,
  status TEXT NOT NULL, -- 'active', 'canceled', 'completed', 'not_started', 'released'
  current_phase_start TIMESTAMP WITH TIME ZONE,
  current_phase_end TIMESTAMP WITH TIME ZONE,
  default_settings JSONB DEFAULT '{}'::jsonb,
  released_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.subscription_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES public.subscription_schedules(id) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  proration_behavior TEXT NOT NULL DEFAULT 'create_prorations',
  trial BOOLEAN DEFAULT FALSE,
  collection_method TEXT NOT NULL DEFAULT 'charge_automatically',
  default_tax_rates JSONB DEFAULT '[]'::jsonb,
  invoice_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(schedule_id, start_date)
);

CREATE TABLE public.subscription_items_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID REFERENCES public.subscription_phases(id) NOT NULL,
  price_id UUID REFERENCES public.billing_prices(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  tax_rates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription usage records for metered billing
CREATE TABLE public.usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_usage_record_id TEXT UNIQUE NOT NULL,
  subscription_item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  action TEXT NOT NULL DEFAULT 'increment', -- 'increment' or 'set'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Advanced Payment Method Schema

```sql
CREATE TABLE public.payment_method_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_configuration_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  parent_id UUID REFERENCES public.payment_method_configurations(id),
  connected_account_id UUID REFERENCES public.connected_accounts(id),
  active BOOLEAN DEFAULT TRUE,
  acss_debit_settings JSONB DEFAULT '{}'::jsonb,
  affirm_settings JSONB DEFAULT '{}'::jsonb,
  afterpay_clearpay_settings JSONB DEFAULT '{}'::jsonb,
  alipay_settings JSONB DEFAULT '{}'::jsonb,
  apple_pay_settings JSONB DEFAULT '{}'::jsonb,
  blik_settings JSONB DEFAULT '{}'::jsonb,
  card_settings JSONB DEFAULT '{}'::jsonb,
  cartes_bancaires_settings JSONB DEFAULT '{}'::jsonb,
  cashapp_settings JSONB DEFAULT '{}'::jsonb,
  eps_settings JSONB DEFAULT '{}'::jsonb,
  fpx_settings JSONB DEFAULT '{}'::jsonb,
  giropay_settings JSONB DEFAULT '{}'::jsonb,
  google_pay_settings JSONB DEFAULT '{}'::jsonb,
  grab_pay_settings JSONB DEFAULT '{}'::jsonb,
  ideal_settings JSONB DEFAULT '{}'::jsonb,
  jcb_settings JSONB DEFAULT '{}'::jsonb,
  klarna_settings JSONB DEFAULT '{}'::jsonb,
  konbini_settings JSONB DEFAULT '{}'::jsonb,
  link_settings JSONB DEFAULT '{}'::jsonb,
  oxxo_settings JSONB DEFAULT '{}'::jsonb,
  p24_settings JSONB DEFAULT '{}'::jsonb,
  sepa_debit_settings JSONB DEFAULT '{}'::jsonb,
  sofort_settings JSONB DEFAULT '{}'::jsonb,
  us_bank_account_settings JSONB DEFAULT '{}'::jsonb,
  wechat_pay_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Webhook Processors

```javascript
// Implementation of comprehensive webhook handling
const webhookHandlers = {
  'account.updated': async (event) => {
    const account = event.data.object;
    await handleAccountUpdated(account);
  },
  'account.application.deauthorized': async (event) => {
    const account = event.data.object;
    await handleAccountDeauthorized(account);
  },
  'account.external_account.created': async (event) => {
    const externalAccount = event.data.object;
    await handleExternalAccountCreated(externalAccount, event.account);
  },
  'charge.succeeded': async (event) => {
    const charge = event.data.object;
    await handleChargeSucceeded(charge, event.account);
  },
  'charge.failed': async (event) => {
    const charge = event.data.object;
    await handleChargeFailed(charge, event.account);
  },
  'checkout.session.completed': async (event) => {
    const session = event.data.object;
    await handleCheckoutSessionCompleted(session, event.account);
  },
  'customer.subscription.created': async (event) => {
    const subscription = event.data.object;
    await handleSubscriptionCreated(subscription, event.account);
  },
  'customer.subscription.updated': async (event) => {
    const subscription = event.data.object;
    await handleSubscriptionUpdated(subscription, event.account);
  },
  'dispute.created': async (event) => {
    const dispute = event.data.object;
    await handleDisputeCreated(dispute, event.account);
  },
  'identity.verification_session.verified': async (event) => {
    const session = event.data.object;
    await handleIdentityVerified(session);
  },
  'invoice.paid': async (event) => {
    const invoice = event.data.object;
    await handleInvoicePaid(invoice, event.account);
  },
  'invoice.payment_failed': async (event) => {
    const invoice = event.data.object;
    await handleInvoicePaymentFailed(invoice, event.account);
  },
  'payment_intent.succeeded': async (event) => {
    const paymentIntent = event.data.object;
    await handlePaymentIntentSucceeded(paymentIntent, event.account);
  },
  'payment_intent.payment_failed': async (event) => {
    const paymentIntent = event.data.object;
    await handlePaymentIntentFailed(paymentIntent, event.account);
  },
  'payout.created': async (event) => {
    const payout = event.data.object;
    await handlePayoutCreated(payout, event.account);
  },
  'payout.failed': async (event) => {
    const payout = event.data.object;
    await handlePayoutFailed(payout, event.account);
  },
  'tax.calculation.completed': async (event) => {
    const calculation = event.data.object;
    await handleTaxCalculationCompleted(calculation);
  }
};

// Example implementation of webhook handler
async function processWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Log event for auditing and debugging
  await db.webhook_events.insert({
    stripe_event_id: event.id,
    event_type: event.type,
    object_id: event.data.object.id,
    object_type: event.data.object.object,
    account: event.account,
    api_version: event.api_version,
    event_data: event.data,
  });

  // Handle event
  if (webhookHandlers[event.type]) {
    try {
      await webhookHandlers[event.type](event);

      // Mark as processed
      await db.webhook_events.update(
        { stripe_event_id: event.id },
        { processed: true, processed_at: new Date() }
      );
    } catch (error) {
      console.error(`Error processing ${event.type}:`, error);

      // Mark as failed processing
      await db.webhook_events.update(
        { stripe_event_id: event.id },
        {
          processed: false,
          processing_errors: db.raw(`array_append(processing_errors, '${error.message}')`)
        }
      );

      // For critical events, alert the team
      if (isCriticalEvent(event.type)) {
        await alertTeamAboutFailedWebhook(event, error);
      }
    }
  }

  // Return a response to acknowledge receipt of the event
  res.json({received: true});
}
```

## React Components for Payment Experiences

### Custom Payment Form with Multiple Payment Methods

```jsx
import React, { useState, useEffect } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe outside component to avoid recreating on re-renders
const stripePromise = loadStripe('pk_test_51Rd0qyP3WCR53Sdo4OKIJtbPiEBJHExhH4KAI2DMHTastoC5IPAIZaJZfbg7C5akPEVzQek4NFtdB4Jcg5pcLrB600nVJyHqao');

// Container component
export function CheckoutContainer({ amount, currency, customerId }) {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function createPaymentIntent() {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency,
            customerId,
            automatic_payment_methods: { enabled: true }
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create payment intent');
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    createPaymentIntent();
  }, [amount, currency, customerId]);

  if (loading) return <div className="loading-spinner" />;
  if (error) return <div className="error-message">{error}</div>;

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0570de',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'Ideal Sans, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '4px',
      },
    },
  };

  return (
    <div className="payment-container">
      <Elements stripe={stripePromise} options={options}>
        <CheckoutForm />
      </Elements>
    </div>
  );
}

// Form component
function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // Track start time for analytics
      const startTime = Date.now();

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payments/confirm`,
        },
        redirect: 'if_required',
      });

      // Track completion time for analytics
      const completionTime = Date.now() - startTime;
      await trackPaymentAttempt({
        payment_intent_id: paymentIntent?.id,
        success: !error && paymentIntent?.status === 'succeeded',
        error_type: error?.type,
        error_code: error?.code,
        time_to_complete: completionTime,
      });

      if (error) {
        setPaymentError(error.message);
      } else if (paymentIntent.status === 'succeeded') {
        setIsComplete(true);
      } else {
        setPaymentError("Payment requires additional action. Please wait...");
      }
    } catch (err) {
      setPaymentError("An unexpected error occurred.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />

      {paymentError && (
        <div className="error-message">{paymentError}</div>
      )}

      {isComplete ? (
        <div className="success-message">
          <h3>Payment Successful!</h3>
          <p>Thank you for your payment.</p>
          <button
            type="button"
            onClick={() => window.location.href = '/dashboard'}
          >
            Return to Dashboard
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements}
          className="payment-button"
        >
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </button>
      )}
    </form>
  );
}
```

### Connect Express Dashboard Component

```jsx
import React, { useEffect, useState } from 'react';

export function ConnectDashboard({ userId }) {
  const [dashboardLink, setDashboardLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function generateDashboardLink() {
      try {
        const response = await fetch('/api/connect/dashboard-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate dashboard link');
        }

        const data = await response.json();
        setDashboardLink(data.url);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    generateDashboardLink();
  }, [userId]);

  if (isLoading) {
    return <div className="loading">Loading your dashboard...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <h3>Something went wrong</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="connect-dashboard-container">
      <h2>Manage Your Business</h2>
      <p>Access your payments dashboard to view transactions, manage payouts, and update your account.</p>

      <div className="dashboard-actions">
        <a
          href={dashboardLink}
          className="dashboard-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Express Dashboard
        </a>

        <div className="dashboard-features">
          <div className="feature">
            <h4>Transactions</h4>
            <p>View and manage your payment activity</p>
          </div>

          <div className="feature">
            <h4>Payouts</h4>
            <p>Track money going to your bank account</p>
          </div>

          <div className="feature">
            <h4>Settings</h4>
            <p>Update business details and banking information</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Server-Side Implementation for Financial Connections

```javascript
// API endpoint to create a Financial Connections Session
app.post('/api/financial-connections/create-session', async (req, res) => {
  try {
    const { userId, accountHolderType, accountHolderEmail } = req.body;

    // Retrieve the user
    const user = await db.users.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create a Financial Connections Session
    const session = await stripe.financialConnections.sessions.create({
      account_holder: {
        type: accountHolderType || 'customer',
        account_holder_type: 'individual',
        email: accountHolderEmail || user.email
      },
      permissions: ['payment_method', 'balances', 'transactions'],
      prefetch: ['balances', 'transactions'],
      filters: {
        countries: ['US'],
      },
      return_url: `${process.env.BASE_URL}/settings/bank-accounts/complete`,
      expand: ['account_holder']
    });

    // Store session in database
    await db.financial_connections_sessions.insert({
      user_id: userId,
      stripe_session_id: session.id,
      client_secret: session.client_secret,
      status: 'requires_action'
    });

    res.json({
      clientSecret: session.client_secret
    });
  } catch (error) {
    console.error('Error creating Financial Connections session:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to handle the Financial Connections Session completion
app.get('/api/financial-connections/session-complete', async (req, res) => {
  try {
    const { session_id, session_client_secret } = req.query;

    // Retrieve the session from Stripe
    const session = await stripe.financialConnections.sessions.retrieve(session_id);

    // Update our session record
    await db.financial_connections_sessions.update(
      { stripe_session_id: session.id },
      { status: 'succeeded', accounts_linked: session.accounts.data.map(a => a.id) }
    );

    // Store account information
    for (const account of session.accounts.data) {
      // Check if we already have this account
      const existingAccount = await db.financial_accounts.findOne({
        stripe_financial_account_id: account.id
      });

      if (!existingAccount) {
        // Get the user ID from the session
        const sessionRecord = await db.financial_connections_sessions.findOne({
          stripe_session_id: session.id
        });

        await db.financial_accounts.insert({
          user_id: sessionRecord.user_id,
          stripe_financial_Sorry, there was an error generating the answer! Please try again.

Click [here](https://docs.stripe.com) to view the Stripe documentation

Here's a comprehensive NestJS file structure for implementing connected account onboarding with webhooks:

## Core Files Structure

```
src/
├── app.module.ts                         # Main application module
├── main.ts                               # Application entry point (with rawBody)
├── config/
│   ├── configuration.ts                  # Configuration settings
│   └── validation.schema.ts              # Environment validation schema
├── connected-accounts/
│   ├── connected-accounts.module.ts      # Connected accounts module
│   ├── connected-accounts.controller.ts  # REST API endpoints
│   ├── connected-accounts.service.ts     # Core business logic
│   ├── dto/
│   │   ├── create-account.dto.ts         # DTO for account creation
│   │   ├── account-link.dto.ts           # DTO for account links
│   │   └── update-account.dto.ts         # DTO for account updates
│   ├── entities/
│   │   ├── connected-account.entity.ts   # Connected account entity
│   │   ├── onboarding-session.entity.ts  # Onboarding session entity
│   │   ├── onboarding-step.entity.ts     # Onboarding step entity
│   │   └── incentive.entity.ts           # Incentive entity
│   └── interfaces/
│       ├── account-status.interface.ts   # Account status interface
│       └── onboarding-flow.interface.ts  # Onboarding flow interface
├── communication/
│   ├── communication.module.ts           # Communication module
│   ├── communication.service.ts          # Communication service
│   ├── providers/
│   │   ├── email.service.ts              # Email service
│   │   ├── sms.service.ts                # SMS service
│   │   └── push.service.ts               # Push notifications service
│   ├── entities/
│   │   └── communication.entity.ts       # Communication entity
│   └── templates/
│       ├── onboarding-start.template.ts  # Onboarding start template
│       ├── onboarding-reminder.template.ts # Reminder template
│       └── onboarding-complete.template.ts # Completion template
└── webhooks/
    ├── webhooks.module.ts                # Webhooks module
    ├── webhooks.controller.ts            # Webhook endpoint controller
    ├── webhooks.service.ts               # Webhook processing service
    ├── handlers/
    │   ├── account.handler.ts            # Account event handlers
    │   ├── capability.handler.ts         # Capability event handlers
    │   └── person.handler.ts             # Person event handlers
    └── interfaces/
        └── stripe-event.interface.ts     # Stripe event interface
```

## Key Files Implementation

### 1. `main.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  // Create app with rawBody option for webhook signature verification
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser
  });

  // Apply global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Apply custom middleware for handling both rawBody and parsed body
  app.use(
    express.json({
      verify: (req: any, res, buf) => {
        // Store raw body for webhook signature verification
        if (req.originalUrl.includes('/webhooks')) {
          req.rawBody = buf;
        }
      },
    }),
  );

  await app.listen(3000);
}
bootstrap();
```

### 2. `src/webhooks/webhooks.controller.ts`

```typescript
import { Controller, Post, Headers, Req, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { ConfigService } from '@nestjs/config';

// Define request with raw body
interface RawBodyRequest extends Request {
  rawBody: Buffer;
}

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly configService: ConfigService,
  ) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest,
  ) {
    try {
      // Verify the webhook signature
      const event = this.webhooksService.constructEvent(
        request.rawBody,
        signature,
        this.configService.get<string>('STRIPE_WEBHOOK_SECRET'),
      );

      // Process the event
      await this.webhooksService.processEvent(event);

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error.message);
      throw new HttpException(
        `Webhook Error: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
```

### 3. `src/webhooks/webhooks.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { ConnectedAccountsService } from '../connected-accounts/connected-accounts.service';
import { CommunicationService } from '../communication/communication.service';
import { WebhookEvent } from './entities/webhook-event.entity';

@Injectable()
export class WebhooksService {
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly connectedAccountsService: ConnectedAccountsService,
    private readonly communicationService: CommunicationService,
    @InjectRepository(WebhookEvent)
    private webhookEventRepository: Repository<WebhookEvent>,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2023-10-16',
      },
    );
  }

  constructEvent(
    payload: Buffer,
    signature: string,
    secret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      secret,
    );
  }

  async processEvent(event: Stripe.Event): Promise<void> {
    // Store event in database for audit/replay
    await this.storeEvent(event);

    // Process based on event type
    switch (event.type) {
      case 'account.updated':
        await this.handleAccountUpdated(event);
        break;
      case 'account.application.authorized':
        await this.handleAccountAuthorized(event);
        break;
      case 'account.application.deauthorized':
        await this.handleAccountDeauthorized(event);
        break;
      case 'account.external_account.created':
        await this.handleExternalAccountCreated(event);
        break;
      case 'capability.updated':
        await this.handleCapabilityUpdated(event);
        break;
      case 'person.updated':
        await this.handlePersonUpdated(event);
        break;
      // Add additional event types as needed
    }
  }

  private async storeEvent(event: Stripe.Event): Promise<WebhookEvent> {
    const webhookEvent = this.webhookEventRepository.create({
      stripeEventId: event.id,
      eventType: event.type,
      objectId: event.data.object.id,
      objectType: event.data.object.object,
      accountId: event.account || null,
      apiVersion: event.api_version,
      eventData: event.data,
      created: new Date(event.created * 1000),
    });

    return this.webhookEventRepository.save(webhookEvent);
  }

  // Handler implementations
  private async handleAccountUpdated(event: Stripe.Event): Promise<void> {
    const account = event.data.object as Stripe.Account;

    // Update account onboarding status
    await this.connectedAccountsService.updateAccountStatus(account);

    // Check for specific status changes
    if (account.details_submitted && account.charges_enabled) {
      // Account completed onboarding
      await this.connectedAccountsService.markOnboardingComplete(account.id);

      // Send welcome communication
      await this.communicationService.sendOnboardingCompleteCommunication(account.id);
    } else if (account.requirements?.disabled_reason) {
      // Account has issues
      await this.connectedAccountsService.markOnboardingRejected(
        account.id,
        account.requirements?.disabled_reason
      );

      // Send recovery communication
      await this.communicationService.sendVerificationFailedCommunication(account.id);
    }
  }

  private async handleCapabilityUpdated(event: Stripe.Event): Promise<void> {
    const capability = event.data.object as Stripe.Capability;
    const accountId = event.account;

    if (!accountId) return;

    // Update capability status
    await this.connectedAccountsService.updateCapabilityStatus(
      accountId,
      capability.id,
      capability.status,
    );

    // If ACH payments capability is active, send specific communication
    if (capability.id === 'us_bank_account_ach_payments' && capability.status === 'active') {
      await this.communicationService.sendCapabilityActivatedCommunication(
        accountId,
        'ach_payments',
      );
    }
  }

  // Implement other handlers similarly
  private async handlePersonUpdated(event: Stripe.Event): Promise<void> {
    // Implementation for person updates
  }

  private async handleAccountAuthorized(event: Stripe.Event): Promise<void> {
    // Implementation for account authorization
  }

  private async handleAccountDeauthorized(event: Stripe.Event): Promise<void> {
    // Implementation for account deauthorization
  }

  private async handleExternalAccountCreated(event: Stripe.Event): Promise<void> {
    // Implementation for external account creation
  }
}
```

### 4. `src/webhooks/entities/webhook-event.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('webhook_events')
export class WebhookEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stripe_event_id', unique: true })
  stripeEventId: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ name: 'object_id' })
  objectId: string;

  @Column({ name: 'object_type' })
  objectType: string;

  @Column({ name: 'account_id', nullable: true })
  accountId: string;

  @Column({ name: 'api_version' })
  apiVersion: string;

  @Column({ name: 'event_data', type: 'jsonb' })
  eventData: any;

  @Column({ name: 'processed', default: false })
  processed: boolean;

  @Column({ name: 'processing_errors', type: 'simple-array', nullable: true })
  processingErrors: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'processed_at', nullable: true })
  processedAt: Date;

  @Column({ name: 'created', type: 'timestamp' })
  created: Date;
}
```

### 5. `src/connected-accounts/connected-accounts.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { ConnectedAccount } from './entities/connected-account.entity';
import { OnboardingSession } from './entities/onboarding-session.entity';
import { OnboardingStep } from './entities/onboarding-step.entity';
import { Incentive } from './entities/incentive.entity';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class ConnectedAccountsService {
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ConnectedAccount)
    private connectedAccountRepository: Repository<ConnectedAccount>,
    @InjectRepository(OnboardingSession)
    private onboardingSessionRepository: Repository<OnboardingSession>,
    @InjectRepository(OnboardingStep)
    private onboardingStepRepository: Repository<OnboardingStep>,
    @InjectRepository(Incentive)
    private incentiveRepository: Repository<Incentive>,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2023-10-16',
      },
    );
  }

  async createConnectedAccount(createAccountDto: CreateAccountDto): Promise<ConnectedAccount> {
    // Create Stripe Connect account
    const stripeAccount = await this.stripe.accounts.create({
      type: createAccountDto.accountType,
      country: createAccountDto.country,
      email: createAccountDto.email,
      business_type: createAccountDto.businessType,
      individual: createAccountDto.individual,
      business_profile: createAccountDto.businessProfile,
      capabilities: createAccountDto.capabilities,
      metadata: { user_id: createAccountDto.userId },
    });

    // Store in our database
    const connectedAccount = this.connectedAccountRepository.create({
      userId: createAccountDto.userId,
      stripeAccountId: stripeAccount.id,
      accountType: createAccountDto.accountType,
      email: createAccountDto.email,
      country: createAccountDto.country,
      businessType: createAccountDto.businessType,
      onboardingStatus: 'not_started',
      chargesEnabled: stripeAccount.charges_enabled,
      payoutsEnabled: stripeAccount.payouts_enabled,
      detailsSubmitted: stripeAccount.details_submitted,
    });

    return this.connectedAccountRepository.save(connectedAccount);
  }

  async createAccountLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
    const connectedAccount = await this.connectedAccountRepository.findOne({
      where: { stripeAccountId: accountId }
    });

    if (!connectedAccount) {
      throw new NotFoundException(`Connected account with ID ${accountId} not found`);
    }

    // Create account link
    const accountLink = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
      collect: connectedAccount.detailsSubmitted ? 'currently_due' : 'eventually_due',
    });

    // Save session
    const session = this.onboardingSessionRepository.create({
      connectedAccountId: connectedAccount.id,
      type: 'account_onboarding',
      url: accountLink.url,
      expiresAt: new Date(Date.now() + 15 * 60000), // 15 minutes
      collectionMode: connectedAccount.detailsSubmitted ? 'currently_due' : 'eventually_due',
    });

    await this.onboardingSessionRepository.save(session);

    // Update account status
    await this.connectedAccountRepository.update(
      { id: connectedAccount.id },
      {
        onboardingStatus: 'in_progress',
        lastSessionAt: new Date(),
      }
    );

    return accountLink.url;
  }

  async updateAccountStatus(account: Stripe.Account): Promise<void> {
    const connectedAccount = await this.connectedAccountRepository.findOne({
      where: { stripeAccountId: account.id }
    });

    if (!connectedAccount) return;

    // Calculate completion percentage
    const totalRequirements = [
      ...(account.requirements?.currently_due || []),
      ...(account.requirements?.eventually_due || []),
      ...(account.requirements?.past_due || []),
    ].length;

    const totalFields = this.calculateTotalFields(account.business_type);
    const completionPercentage = totalRequirements === 0
      ? 100
      : Math.floor(((totalFields - totalRequirements) / totalFields) * 100);

    // Update account status
    await this.connectedAccountRepository.update(
      { id: connectedAccount.id },
      {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        requirementsDue: [
          ...(account.requirements?.currently_due || []),
          ...(account.requirements?.eventually_due || []),
          ...(account.requirements?.past_due || []),
        ],
        completionPercentage,
        updatedAt: new Date(),
      }
    );
  }

  async markOnboardingComplete(accountId: string): Promise<void> {
    const connectedAccount = await this.connectedAccountRepository.findOne({
      where: { stripeAccountId: accountId }
    });

    if (!connectedAccount) return;

    await this.connectedAccountRepository.update(
      { id: connectedAccount.id },
      {
        onboardingStatus: 'completed',
        onboardingCompletedAt: new Date(),
        completionPercentage: 100,
      }
    );

    // Create incentive if eligible
    await this.createOnboardingIncentive(connectedAccount.id);
  }

  async markOnboardingRejected(accountId: string, reason: string): Promise<void> {
    const connectedAccount = await this.connectedAccountRepository.findOne({
      where: { stripeAccountId: accountId }
    });

    if (!connectedAccount) return;

    await this.connectedAccountRepository.update(
      { id: connectedAccount.id },
      {
        onboardingStatus: 'rejected',
        requirementsErrors: [reason],
      }
    );
  }

  async updateCapabilityStatus(
    accountId: string,
    capabilityId: string,
    status: string,
  ): Promise<void> {
    // Implementation for updating capability status
  }

  private calculateTotalFields(businessType: string): number {
    // Return number of fields based on business type
    switch (businessType) {
      case 'individual':
        return 20;
      case 'company':
        return 30;
      default:
        return 25;
    }
  }

  private async createOnboardingIncentive(connectedAccountId: string): Promise<void> {
    // Create incentive for completed onboarding
    const incentive = this.incentiveRepository.create({
      connectedAccountId,
      incentiveType: 'fee_discount',
      percentage: 50,
      duration: '3_months',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    await this.incentiveRepository.save(incentive);
  }
}
```

### 6. `src/connected-accounts/entities/connected-account.entity.ts`

```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('connected_account_onboarding')
export class ConnectedAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'stripe_account_id', unique: true })
  stripeAccountId: string;

  @Column({ name: 'account_type' })
  accountType: string; // 'standard', 'express', or 'custom'

  @Column()
  email: string;

  @Column()
  country: string;

  @Column({ name: 'business_type' })
  businessType: string;

  @Column({ name: 'onboarding_status', default: 'not_started' })
  onboardingStatus: string; // 'not_started', 'in_progress', 'completed', 'rejected'

  @Column({ name: 'completion_percentage', default: 0 })
  completionPercentage: number;

  @Column({ name: 'charges_enabled', default: false })
  chargesEnabled: boolean;

  @Column({ name: 'payouts_enabled', default: false })
  payoutsEnabled: boolean;

  @Column({ name: 'details_submitted', default: false })
  detailsSubmitted: boolean;

  @Column({ name: 'onboarding_started_at', nullable: true })
  onboardingStartedAt: Date;

  @Column({ name: 'onboarding_completed_at', nullable: true })
  onboardingCompletedAt: Date;

  @Column({ name: 'last_session_at', nullable: true })
  lastSessionAt: Date;

  @Column({ name: 'current_step', nullable: true })
  currentStep: string;

  @Column({ name: 'requirements_due', type: 'simple-array', nullable: true })
  requirementsDue: string[];

  @Column({ name: 'requirements_errors', type: 'simple-array', nullable: true })
  requirementsErrors: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

### 7. `src/webhooks/webhooks.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookEvent } from './entities/webhook-event.entity';
import { ConnectedAccountsModule } from '../connected-accounts/connected-accounts.module';
import { CommunicationModule } from '../communication/communication.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WebhookEvent]),
    ConfigModule,
    ConnectedAccountsModule,
    CommunicationModule,
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
```

### 8. `src/connected-accounts/dto/create-account.dto.ts`

```typescript
import { IsString, IsEmail, IsOptional, IsEnum, IsObject } from 'class-validator';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Define Zod schema for validation
const createAccountSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  accountType: z.enum(['standard', 'express', 'custom']),
  country: z.string().length(2),
  businessType: z.enum(['individual', 'company']),
  individual: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  }).optional(),
  businessProfile: z.object({
    name: z.string().optional(),
    url: z.string().url().optional(),
    mcc: z.string().optional(),
  }).optional(),
  capabilities: z.object({
    card_payments: z.object({ requested: z.boolean() }).optional(),
    transfers: z.object({ requested: z.boolean() }).optional(),
    us_bank_account_ach_payments: z.object({ requested: z.boolean() }).optional(),
  }).optional(),
});

// Create DTO from Zod schema
export class CreateAccountDto extends createZodDto(createAccountSchema) {}
```

### 9. `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConnectedAccountsModule } from './connected-accounts/connected-accounts.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CommunicationModule } from './communication/communication.module';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('database.synchronize'),
        ssl: configService.get<boolean>('database.ssl'),
      }),
    }),
    ScheduleModule.forRoot(),
    ConnectedAccountsModule,
    WebhooksModule,
    CommunicationModule,
  ],
})
export class AppModuleSorry, there was an error generating the answer! Please try again.

Click [here](https://docs.stripe.com) to view the Stripe documentation

# NestJS Implementation for Stripe Connect Onboarding

Here are the core NestJS files you'll need for a comprehensive Stripe Connect implementation with optimized onboarding:

## 1. Module Structure

```typescript
// src/stripe-connect/stripe-connect.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StripeConnectService } from './services/stripe-connect.service';
import { OnboardingService } from './services/onboarding.service';
import { ConnectAccountController } from './controllers/connect-account.controller';
import { OnboardingController } from './controllers/onboarding.controller';
import { WebhookController } from './controllers/webhook.controller';
import { AccountSessionController } from './controllers/account-session.controller';
import { ConnectedAccount } from './entities/connected-account.entity';
import { OnboardingSession } from './entities/onboarding-session.entity';
import { OnboardingStep } from './entities/onboarding-step.entity';
import { Incentive } from './entities/incentive.entity';
import { Communication } from './entities/communication.entity';
import { StripeWebhookService } from './services/stripe-webhook.service';
import { CommunicationService } from './services/communication.service';
import { IncentiveService } from './services/incentive.service';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    TypeOrmModule.forFeature([
      ConnectedAccount,
      OnboardingSession,
      OnboardingStep,
      Incentive,
      Communication
    ]),
  ],
  controllers: [
    ConnectAccountController,
    OnboardingController,
    WebhookController,
    AccountSessionController,
  ],
  providers: [
    StripeConnectService,
    OnboardingService,
    StripeWebhookService,
    CommunicationService,
    IncentiveService,
  ],
  exports: [
    StripeConnectService,
    OnboardingService,
  ],
})
export class StripeConnectModule {}
```

## 2. Core Entities

```typescript
// src/stripe-connect/entities/connected-account.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OnboardingSession } from './onboarding-session.entity';
import { OnboardingStep } from './onboarding-step.entity';
import { Incentive } from './incentive.entity';

export enum OnboardingStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
}

@Entity('connected_accounts')
export class ConnectedAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ unique: true })
  stripe_account_id: string;

  @Column({
    type: 'enum',
    enum: OnboardingStatus,
    default: OnboardingStatus.NOT_STARTED,
  })
  onboarding_status: OnboardingStatus;

  @Column({ default: 0 })
  completion_percentage: number;

  @Column({ nullable: true })
  onboarding_started_at: Date;

  @Column({ nullable: true })
  onboarding_completed_at: Date;

  @Column({ nullable: true })
  last_session_at: Date;

  @Column({ nullable: true })
  current_step: string;

  @Column('text', { array: true, default: '{}' })
  requirements_due: string[];

  @Column('text', { array: true, default: '{}' })
  requirements_errors: string[];

  @Column({ default: false })
  charges_enabled: boolean;

  @Column({ default: false })
  payouts_enabled: boolean;

  @Column({ default: false })
  details_submitted: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => OnboardingSession, session => session.connected_account)
  sessions: OnboardingSession[];

  @OneToMany(() => OnboardingStep, step => step.connected_account)
  steps: OnboardingStep[];

  @OneToMany(() => Incentive, incentive => incentive.connected_account)
  incentives: Incentive[];
}
```

```typescript
// src/stripe-connect/entities/onboarding-session.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ConnectedAccount } from './connected-account.entity';

@Entity('onboarding_sessions')
export class OnboardingSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ConnectedAccount, account => account.sessions)
  @JoinColumn({ name: 'connected_account_id' })
  connected_account: ConnectedAccount;

  @Column({ name: 'connected_account_id' })
  connected_account_id: string;

  @Column({ nullable: true })
  stripe_account_link_id: string;

  @Column()
  type: 'account_onboarding' | 'account_update';

  @Column()
  url: string;

  @Column()
  expires_at: Date;

  @Column({ default: false })
  used: boolean;

  @Column()
  collection_mode: 'currently_due' | 'eventually_due';

  @CreateDateColumn()
  created_at: Date;
}
```

## 3. Core Services

```typescript
// src/stripe-connect/services/stripe-connect.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { ConnectedAccount, OnboardingStatus } from '../entities/connected-account.entity';

@Injectable()
export class StripeConnectService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeConnectService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(ConnectedAccount)
    private connectedAccountRepository: Repository<ConnectedAccount>,
    private eventEmitter: EventEmitter2,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
      appInfo: {
        name: this.configService.get('APP_NAME', 'Stripe Connect Platform'),
        version: '1.0.0',
      },
    });
  }

  async createConnectedAccount(userId: string, data: {
    email: string;
    country: string;
    businessType: 'individual' | 'company';
    firstName?: string;
    lastName?: string;
    businessName?: string;
    phoneNumber?: string;
    website?: string;
    mcc?: string; // Merchant Category Code
  }): Promise<ConnectedAccount> {
    try {
      // Set default MCC if not provided
      const mcc = data.mcc || '5734'; // Default to Computer Software Stores

      // Create Stripe account with as much pre-filled information as possible
      const account = await this.stripe.accounts.create({
        type: 'standard', // or 'express', 'custom'
        country: data.country,
        email: data.email,
        business_type: data.businessType,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
          us_bank_account_ach_payments: { requested: data.country === 'US' },
        },
        ...this.prepareAccountDetails(data),
        metadata: { user_id: userId },
      });

      this.logger.log(`Created Stripe connected account: ${account.id}`);

      // Store the connected account in our database
      const connectedAccount = this.connectedAccountRepository.create({
        userId,
        stripe_account_id: account.id,
        onboarding_status: OnboardingStatus.NOT_STARTED,
      });

      await this.connectedAccountRepository.save(connectedAccount);

      // Emit event for other services
      this.eventEmitter.emit('connect.account.created', {
        accountId: connectedAccount.id,
        stripeAccountId: account.id,
        userId,
      });

      return connectedAccount;
    } catch (error) {
      this.logger.error('Error creating connected account', error);
      throw error;
    }
  }

  async createAccountSession(accountId: string): Promise<{ client_secret: string }> {
    try {
      const account = await this.connectedAccountRepository.findOneOrFail({ where: { id: accountId } });

      // Get the embedded components we want to enable
      const components = await this.getEnabledComponents(account);

      const session = await this.stripe.accountSessions.create({
        account: account.stripe_account_id,
        components: {
          account_onboarding: {enabled: true},
          ...components
        },
      });

      return { client_secret: session.client_secret };
    } catch (error) {
      this.logger.error('Error creating account session', error);
      throw error;
    }
  }

  async retrieveConnectedAccount(accountId: string): Promise<Stripe.Account> {
    const account = await this.connectedAccountRepository.findOneOrFail({
      where: { id: accountId }
    });

    return this.stripe.accounts.retrieve(account.stripe_account_id);
  }

  // Helper methods
  private prepareAccountDetails(data: any): any {
    const details: any = {};

    // Add individual details if available
    if (data.businessType === 'individual' && (data.firstName || data.lastName)) {
      details.individual = {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phoneNumber,
      };
    }

    // Add business profile details
    details.business_profile = {
      name: data.businessName || `${data.firstName} ${data.lastName}`,
      url: data.website,
      mcc: data.mcc,
    };

    return details;
  }

  private async getEnabledComponents(account: ConnectedAccount): Promise<any> {
    // Determine which components should be enabled based on account status
    const components: any = {
      payments: {enabled: true},
      payouts: {enabled: true},
    };

    if (account.charges_enabled) {
      components.dashboard = {enabled: true};
    }

    return components;
  }
}
```

```typescript
// src/stripe-connect/services/onboarding.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { ConnectedAccount, OnboardingStatus } from '../entities/connected-account.entity';
import { OnboardingSession } from '../entities/onboarding-session.entity';
import { OnboardingStep } from '../entities/onboarding-step.entity';
import { IncentiveService } from './incentive.service';
import { CommunicationService } from './communication.service';

@Injectable()
export class OnboardingService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(ConnectedAccount)
    private connectedAccountRepository: Repository<ConnectedAccount>,
    @InjectRepository(OnboardingSession)
    private sessionRepository: Repository<OnboardingSession>,
    @InjectRepository(OnboardingStep)
    private stepRepository: Repository<OnboardingStep>,
    private incentiveService: IncentiveService,
    private communicationService: CommunicationService,
    private eventEmitter: EventEmitter2,
  ) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2023-10-16',
    });
  }

  async createOnboardingLink(accountId: string): Promise<OnboardingSession> {
    try {
      const connectedAccount = await this.connectedAccountRepository.findOneOrFail({
        where: { id: accountId },
      });

      // Determine optimal collection mode
      const collectionMode = await this.determineCollectionMode(connectedAccount);

      // Create account link with Stripe
      const accountLink = await this.stripe.accountLinks.create({
        account: connectedAccount.stripe_account_id,
        refresh_url: `${this.configService.get('FRONTEND_URL')}/connect/onboarding/refresh?account_id=${accountId}`,
        return_url: `${this.configService.get('FRONTEND_URL')}/connect/onboarding/complete?account_id=${accountId}`,
        type: 'account_onboarding',
        collect: collectionMode,
      });

      // Store session data
      const session = this.sessionRepository.create({
        connected_account_id: accountId,
        type: 'account_onboarding',
        url: accountLink.url,
        expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        collection_mode: collectionMode,
      });

      await this.sessionRepository.save(session);

      // Update account status
      await this.connectedAccountRepository.update(accountId, {
        onboarding_status: OnboardingStatus.IN_PROGRESS,
        last_session_at: new Date(),
      });

      // If first session, track onboarding start
      if (!connectedAccount.onboarding_started_at) {
        await this.connectedAccountRepository.update(accountId, {
          onboarding_started_at: new Date(),
        });
      }

      return session;
    } catch (error) {
      this.logger.error('Error creating onboarding link', error);
      throw error;
    }
  }

  async updateOnboardingProgress(accountId: string): Promise<ConnectedAccount> {
    try {
      const connectedAccount = await this.connectedAccountRepository.findOneOrFail({
        where: { id: accountId },
      });

      const stripeAccount = await this.stripe.accounts.retrieve(connectedAccount.stripe_account_id);

      // Calculate completion percentage and update status
      const {
        completionPercentage,
        requirementsDue,
        status
      } = await this.calculateOnboardingProgress(stripeAccount);

      // Update account record
      await this.connectedAccountRepository.update(accountId, {
        onboarding_status: status,
        completion_percentage: completionPercentage,
        requirements_due: requirementsDue,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        ...(status === OnboardingStatus.COMPLETED ? { onboarding_completed_at: new Date() } : {}),
      });

      // If onboarding completed, trigger completed actions
      if (status === OnboardingStatus.COMPLETED &&
          connectedAccount.onboarding_status !== OnboardingStatus.COMPLETED) {
        await this.handleOnboardingCompleted(accountId);
      }

      return this.connectedAccountRepository.findOneOrFail({ where: { id: accountId } });
    } catch (error) {
      this.logger.error('Error updating onboarding progress', error);
      throw error;
    }
  }

  async getOnboardingStatus(accountId: string): Promise<any> {
    const connectedAccount = await this.connectedAccountRepository.findOneOrFail({
      where: { id: accountId },
      relations: ['steps', 'incentives'],
    });

    // Get active incentives
    const activeIncentive = connectedAccount.incentives.find(i => !i.claimed && new Date(i.expires_at) > new Date());

    // Get latest session
    const latestSession = await this.sessionRepository.findOne({
      where: { connected_account_id: accountId },
      order: { created_at: 'DESC' },
    });

    return {
      id: connectedAccount.id,
      status: connectedAccount.onboarding_status,
      completionPercentage: connectedAccount.completion_percentage,
      requirementsDue: connectedAccount.requirements_due,
      stepsCompleted: connectedAccount.steps.filter(s => s.status === 'completed').length,
      totalSteps: connectedAccount.steps.length,
      latestSessionUrl: latestSession?.url,
      latestSessionExpires: latestSession?.expires_at,
      chargesEnabled: connectedAccount.charges_enabled,
      payoutsEnabled: connectedAccount.payouts_enabled,
      startedAt: connectedAccount.onboarding_started_at,
      completedAt: connectedAccount.onboarding_completed_at,
      incentive: activeIncentive ? {
        type: activeIncentive.incentive_type,
        value: activeIncentive.incentive_type === 'fee_discount'
          ? `${activeIncentive.percentage}% for ${activeIncentive.duration}`
          : activeIncentive.incentive_type === 'cash_bonus'
          ? `${activeIncentive.amount / 100} ${activeIncentive.currency.toUpperCase()}`
          : `Free for ${activeIncentive.duration}`,
        expiresAt: activeIncentive.expires_at,
      } : null,
    };
  }

  // Helper methods
  private async determineCollectionMode(account: ConnectedAccount): Promise<'currently_due' | 'eventually_due'> {
    // Check if account has processed payments before
    const hasProcessedPayments = await this.hasProcessedPayments(account.id);

    // For accounts with payments, only collect what's required now
    if (hasProcessedPayments) {
      return 'currently_due';
    }

    // Calculate user's trust score
    const trustScore = await this.calculateUserTrustScore(account.userId);

    // If high trust, collect minimal information
    if (trustScore >= 80) {
      return 'currently_due';
    }

    // For new accounts or low trust, collect everything upfront
    return 'eventually_due';
  }

  private async calculateOnboardingProgress(stripeAccount: Stripe.Account): Promise<{
    completionPercentage: number;
    requirementsDue: string[];
    status: OnboardingStatus;
  }> {
    // Get all requirements
    const allRequirements = [
      ...(stripeAccount.requirements?.currently_due || []),
      ...(stripeAccount.requirements?.eventually_due || []),
      ...(stripeAccount.requirements?.past_due || []),
    ];

    // Determine status based on Stripe account state
    let status = OnboardingStatus.IN_PROGRESS;

    if (stripeAccount.charges_enabled && stripeAccount.details_submitted) {
      status = OnboardingStatus.COMPLETED;
    } else if (stripeAccount.requirements?.disabled_reason) {
      status = OnboardingStatus.REJECTED;
    }

    // Estimate total requirements based on account type
    const totalRequirementCount = this.estimateTotalRequirements(
      stripeAccount.business_type,
      stripeAccount.country
    );

    // Calculate percentage
    const completionPercentage = status === OnboardingStatus.COMPLETED
      ? 100
      : Math.max(
          0,
          Math.min(
            100,
            Math.floor(((totalRequirementCount - allRequirements.length) / totalRequirementCount) * 100)
          )
        );

    return {
      completionPercentage,
      requirementsDue: allRequirements,
      status,
    };
  }

  private async handleOnboardingCompleted(accountId: string): Promise<void> {
    // Create incentive if not already created
    await this.incentiveService.createOnboardingIncentive(accountId, 'fee_discount');

    // Send congratulations message
    await this.communicationService.sendOnboardingCommunication(accountId, 'onboarding_completed');

    // Emit event for other services to react
    this.eventEmitter.emit('connect.onboarding.completed', { accountId });
  }

  private async hasProcessedPayments(accountId: string): Promise<boolean> {
    // Implementation would check payment history
    // For this example, we'll assume a method that checks
    return false;
  }

  private async calculateUserTrustScore(userId: string): Promise<number> {
    // This would be a complex calculation based on user history
    // For this example, return a default score
    return 60;
  }

  private estimateTotalRequirements(businessType: string, country: string): number {
    // Different countries and business types have different requirement counts
    // This is a simplified version
    if (businessType === 'company') {
      return country === 'US' ? 15 : 20;
    } else {
      return country === 'US' ? 10 : 15;
    }
  }
}
```

## 4. Controllers

```typescript
// src/stripe-connect/controllers/connect-account.controller.ts
import { Controller, Post, Body, Get, Param, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StripeConnectService } from '../services/stripe-connect.service';
import { CreateConnectedAccountDto } from '../dto/create-connected-account.dto';
import { User } from '../../decorators/user.decorator';

@Controller('connect/accounts')
@UseGuards(JwtAuthGuard)
export class ConnectAccountController {
  constructor(
    private readonly stripeConnectService: StripeConnectService,
  ) {}

  @Post()
  async createAccount(
    @User('id') userId: string,
    @Body() createAccountDto: CreateConnectedAccountDto,
  ) {
    try {
      const account = await this.stripeConnectService.createConnectedAccount(
        userId,
        {
          email: createAccountDto.email,
          country: createAccountDto.country,
          businessType: createAccountDto.businessType,
          firstName: createAccountDto.firstName,
          lastName: createAccountDto.lastName,
          businessName: createAccountDto.businessName,
          phoneNumber: createAccountDto.phoneNumber,
          website: createAccountDto.website,
          mcc: createAccountDto.mcc,
        }
      );

      return {
        id: account.id,
        stripe_account_id: account.stripe_account_id,
        status: account.onboarding_status,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to create connected account: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id')
  async getAccount(
    @User('id') userId: string,
    @Param('id') accountId: string,
  ) {
    try {
      const stripeAccount = await this.stripeConnectService.retrieveConnectedAccount(accountId);

      return {
        id: accountId,
        stripe_account_id: stripeAccount.id,
        business_type: stripeAccount.business_type,
        country: stripeAccount.country,
        email: stripeAccount.email,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        capabilities: stripeAccount.capabilities,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to retrieve account: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
```

```typescript
// src/stripe-connect/controllers/onboarding.controller.ts
import { Controller, Post, Get, Param, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OnboardingService } from '../services/onboarding.service';
import { User } from '../../decorators/user.decorator';

@Controller('connect/onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingControllerSorry, there was an error generating the answer! Please try again.

Click [here](https://docs.stripe.com) to view the Stripe documentation

The Connect onboarding controller is deliberately streamlined for several reasons:

- **Separation of concerns**: Stripe handles the complex verification processes, KYC requirements, and regulatory compliance, while your controller simply initiates and tracks the process
- **Security best practices**: Keeping sensitive financial information outside your database reduces your compliance burden
- **Reduced maintenance**: Less code to maintain as Stripe updates their requirements and processes

## Integration with Supabase Auth

When integrating Stripe Connect with Supabase authentication:

1. **User Identity Mapping**:
   ```javascript
   // After Supabase authentication
   const { user, session } = await supabase.auth.signIn({...})

   // Create or retrieve Stripe Connect account
   const { data: connectedAccount } = await supabase
     .from('connected_accounts')
     .select('stripe_account_id')
     .eq('user_id', user.id)
     .single();

   if (!connectedAccount) {
     // Create new Stripe Connect account linked to Supabase user
     const account = await stripe.accounts.create({
       // Account details...
       metadata: { supabase_user_id: user.id }
     });

     // Store mapping in your database
     await supabase.from('connected_accounts').insert({
       user_id: user.id,
       stripe_account_id: account.id
     });
   }
   ```

2. **RLS Policies for Security**:
   ```sql
   -- Only allow users to see their own Connect account details
   CREATE POLICY "Users can view their own connected accounts"
     ON public.connected_accounts
     FOR SELECT
     USING (auth.uid() = user_id);

   -- Only platform admins can update certain fields
   CREATE POLICY "Only admins can update status fields"
     ON public.connected_account_onboarding
     FOR UPDATE
     USING (auth.uid() IN (SELECT user_id FROM public.platform_admins));
   ```

3. **JWT Claims for Authorization**:
   ```javascript
   // Custom claims can include Connect account status
   supabase.auth.onAuthStateChange(async (event, session) => {
     if (event === 'SIGNED_IN') {
       // Fetch user's Connect account status
       const { data: accountData } = await supabase
         .from('connected_accounts')
         .select('charges_enabled, payouts_enabled')
         .eq('user_id', session.user.id)
         .single();

       // Use this information in your frontend
       if (accountData?.charges_enabled) {
         // Enable payment features in UI
       }
     }
   });
   ```

## Lease Management Integration

For storing lease information in Supabase while using Stripe Connect for payments:

```sql
-- Link leases to Connect accounts and payments
CREATE TABLE public.leases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_user_id UUID REFERENCES auth.users(id) NOT NULL,
  tenant_user_id UUID REFERENCES auth.users(id) NOT NULL,
  connected_account_id UUID REFERENCES public.connected_accounts(id) NOT NULL,
  property_id UUID REFERENCES public.properties(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount INTEGER NOT NULL,
  payment_day INTEGER NOT NULL,
  stripe_payment_method_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store payments linked to leases
CREATE TABLE public.lease_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lease_id UUID REFERENCES public.leases(id) NOT NULL,
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date TIMESTAMP WITH TIME ZONE,
  application_fee_amount INTEGER,
  transfer_amount INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Streamlined Implementation Approach

1. **User Authentication Flow**:
   - User authenticates with Supabase (email/password, social login, etc.)
   - On successful auth, check if they have a Connect account
   - If not, initiate Connect onboarding at the appropriate point in your UX flow

2. **Onboarding Controller**:
   ```javascript
   async function initiateConnectOnboarding(req, res) {
     try {
       const { user } = await supabase.auth.api.getUserByCookie(req);
       if (!user) return res.status(401).json({ error: 'Unauthorized' });

       // Get or create Connect account
       let { data: connectAccount } = await supabase
         .from('connected_accounts')
         .select('stripe_account_id')
         .eq('user_id', user.id)
         .single();

       if (!connectAccount) {
         // Create new account
         const account = await stripe.accounts.create({
           type: 'express', // or 'standard' or 'custom'
           country: req.body.country || 'US',
           email: user.email,
           capabilities: {
             card_payments: { requested: true },
             transfers: { requested: true },
             // Add other capabilities as needed
           },
           metadata: {
             supabase_user_id: user.id
           }
         });

         // Store in Supabase
         await supabase.from('connected_accounts').insert({
           user_id: user.id,
           stripe_account_id: account.id,
         });

         connectAccount = { stripe_account_id: account.id };
       }

       // Create account link
       const accountLink = await stripe.accountLinks.create({
         account: connectAccount.stripe_account_id,
         refresh_url: `${process.env.BASE_URL}/connect/refresh`,
         return_url: `${process.env.BASE_URL}/connect/return`,
         type: 'account_onboarding',
       });

       // Store session info in Supabase
       await supabase.from('onboarding_sessions').insert({
         user_id: user.id,
         stripe_account_id: connectAccount.stripe_account_id,
         expires_at: new Date(Date.now() + 15 * 60000) // 15 min
       });

       res.json({ url: accountLink.url });
     } catch (error) {
       console.error('Connect onboarding error:', error);
       res.status(500).json({ error: error.message });
     }
   }
   ```

3. **Webhook Integration**:
   ```javascript
   app.post('/webhooks/stripe',
     express.raw({ type: 'application/json' }),
     async (req, res) => {
       const sig = req.headers['stripe-signature'];
       let event;

       try {
         event = stripe.webhooks.constructEvent(
           req.body,
           sig,
           process.env.STRIPE_WEBHOOK_SECRET
         );
       } catch (err) {
         return res.status(400).send(`Webhook Error: ${err.message}`);
       }

       // Handle specific events
       switch (event.type) {
         case 'account.updated': {
           const account = event.data.object;

           // Update account status in Supabase
           const { error } = await supabase
             .from('connected_accounts')
             .update({
               charges_enabled: account.charges_enabled,
               payouts_enabled: account.payouts_enabled,
               details_submitted: account.details_submitted,
               requirements: account.requirements,
               updated_at: new Date()
             })
             .eq('stripe_account_id', account.id);

           if (error) console.error('Supabase update error:', error);
           break;
         }
         // Handle other webhook events
       }

       res.json({ received: true });
     }
   );
   ```

The simplicity of the Connect controller is actually its strength - it delegates complex verification, compliance, and regulatory processes to Stripe while maintaining a clean integration with your Supabase authentication system. This approach gives you the benefits of Stripe's sophisticated payment infrastructure while leveraging Supabase's authentication and database capabilities.

# Stripe Connect + Supabase Auth: Simplified Integration

You're right that combining Stripe Connect with Supabase Auth creates a powerful, simplified system. Here are additional best practices and implementation details:

## Supabase Auth + Stripe Connect Security Model

```sql
-- Enhanced RLS policies for Connect integration
CREATE POLICY "Users can only view their own Connect accounts"
  ON public.connected_accounts
  FOR SELECT USING (auth.uid() = user_id);

-- Platform admins can view all accounts
CREATE POLICY "Admins can view all Connect accounts"
  ON public.connected_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
    )
  );

-- Secure webhooks table for admin-only access
CREATE POLICY "Only admins can view webhook events"
  ON public.webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
    )
  );
```

## Enhanced Supabase + Connect Authentication Flow

```javascript
// client/src/utils/auth.js
import { supabase } from './supabaseClient';

export async function signUpWithConnect({email, password, fullName, businessName}) {
  try {
    // 1. Register with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          business_name: businessName
        }
      }
    });

    if (authError) throw authError;

    // 2. Create user profile record
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName,
        business_name: businessName,
        email
      });

    if (profileError) throw profileError;

    // 3. Initialize Connect account creation (async)
    await fetch('/api/connect/initialize-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`
      },
      body: JSON.stringify({
        businessName,
        email
      })
    });

    return { user: authData.user, session: authData.session };
  } catch (error) {
    console.error('Error in signUpWithConnect:', error);
    throw error;
  }
}

// Hook for retrieving Connect account status
export function useConnectAccountStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConnectStatus() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('connected_accounts')
        .select('charges_enabled, payouts_enabled, details_submitted, requirements')
        .eq('user_id', session.user.id)
        .single();

      if (!error && data) {
        setStatus({
          isActive: data.charges_enabled && data.payouts_enabled,
          detailsSubmitted: data.details_submitted,
          requiresAttention: data.requirements?.currently_due?.length > 0,
          pendingRequirements: data.requirements?.currently_due || []
        });
      }
      setLoading(false);
    }

    fetchConnectStatus();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('connect-status-changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'connected_accounts' },
        fetchConnectStatus
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return { status, loading };
}
```

## Server-Side Integration

```javascript
// server/api/connect/initialize-account.js
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  // Verify JWT token from Supabase
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Check if user already has a Connect account
    const { data: existingAccount } = await supabase
      .from('connected_accounts')
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .single();

    if (existingAccount?.stripe_account_id) {
      return res.status(200).json({
        message: 'Connect account already exists',
        accountId: existingAccount.stripe_account_id
      });
    }

    // Create Connect account with user metadata
    const { businessName, email } = req.body;

    const account = await stripe.accounts.create({
      type: 'express', // or 'standard' or 'custom' based on your needs
      email: email,
      business_type: 'individual', // Default, can be updated later
      business_profile: {
        name: businessName,
        mcc: '5734', // Default to computer software stores
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      metadata: {
        supabase_user_id: user.id
      }
    });

    // Store in database
    const { error: insertError } = await supabase
      .from('connected_accounts')
      .insert({
        user_id: user.id,
        stripe_account_id: account.id,
        email: email,
        business_name: businessName,
        account_type: 'express'
      });

    if (insertError) {
      console.error('Error storing Connect account:', insertError);
      // Attempt to delete the created Stripe account to avoid orphaned accounts
      await stripe.accounts.del(account.id);
      return res.status(500).json({ error: 'Failed to store Connect account' });
    }

    return res.status(201).json({
      message: 'Connect account initialized',
      accountId: account.id
    });
  } catch (error) {
    console.error('Error creating Connect account:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

## Stripe-Recommended Best Practices for Supabase Auth

1. **Use server-side JWT verification**:
   ```javascript
   // Server middleware to verify Supabase JWT
   async function validateSupabaseSession(req, res, next) {
     const token = req.headers.authorization?.split('Bearer ')[1];
     if (!token) return res.status(401).json({ error: 'Missing token' });

     try {
       // Verify JWT using Supabase's JWT library
       const { data: { user }, error } = await supabase.auth.getUser(token);
       if (error || !user) {
         return res.status(401).json({ error: 'Invalid token' });
       }

       req.user = user;
       next();
     } catch (err) {
       return res.status(401).json({ error: 'Session verification failed' });
     }
   }
   ```

2. **Identity linking with idempotency keys**:
   ```javascript
   // When creating Connect accounts, use idempotency keys
   const account = await stripe.accounts.create({
     // Account details...
     metadata: { supabase_user_id: user.id }
   }, {
     idempotencyKey: `connect-account-${user.id}` // Prevents duplicate accounts
   });
   ```

3. **Realtime monitoring with Supabase subscriptions**:
   ```javascript
   // client/src/components/ConnectStatus.jsx
   function ConnectAccountStatus() {
     const [status, setStatus] = useState({});

     useEffect(() => {
       // Initial fetch
       fetchStatus();

       // Subscribe to changes
       const subscription = supabase
         .channel('public:connected_accounts')
         .on('postgres_changes', {
           event: 'UPDATE',
           schema: 'public',
           table: 'connected_accounts',
           filter: `user_id=eq.${user.id}`
         }, payload => {
           updateStatus(payload.new);
         })
         .subscribe();

       return () => {
         supabase.removeChannel(subscription);
       };
     }, []);

     // Component JSX...
   }
   ```

4. **Server-side encrypted storage for sensitive data**:
   ```sql
   -- Store webhook events securely using pgcrypto
   CREATE TABLE public.stripe_webhook_logs (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     event_type TEXT NOT NULL,
     event_id TEXT UNIQUE NOT NULL,
     received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     payload BYTEA NOT NULL -- encrypted payload
   );

   -- Function to encrypt webhook payload
   CREATE OR REPLACE FUNCTION encrypt_webhook_payload(payload JSONB)
   RETURNS BYTEA AS $$
   BEGIN
     RETURN pgp_sym_encrypt(
       payload::TEXT,
       current_setting('app.webhook_encryption_key')
     );
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

5. **Privilege separation with database functions**:
   ```sql
   -- Secure function to initiate Connect onboarding
   CREATE OR REPLACE FUNCTION initiate_connect_onboarding()
   RETURNS TEXT AS $$
   DECLARE
     account_id TEXT;
   BEGIN
     -- Check if user already has an account
     SELECT stripe_account_id INTO account_id
     FROM public.connected_accounts
     WHERE user_id = auth.uid();

     IF account_id IS NOT NULL THEN
       RETURN account_id;
     END IF;

     -- Insert placeholder and trigger external process
     INSERT INTO public.connected_accounts (
       user_id, status, created_at
     ) VALUES (
       auth.uid(), 'initializing', NOW()
     ) RETURNING 'pending' INTO account_id;

     -- Trigger background job via pg_notify
     PERFORM pg_notify(
       'connect_account_creation',
       json_build_object('user_id', auth.uid())::TEXT
     );

     RETURN 'pending';
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

## Advanced Stripe-Supabase Integration Features

1. **Single Sign-On for Connect Express Dashboards**:
   ```javascript
   // Generate branded dashboard login link
   async function generateConnectDashboardLink(userId) {
     const { data: account } = await supabase
       .from('connected_accounts')
       .select('stripe_account_id')
       .eq('user_id', userId)
       .single();

     if (!account) throw new Error('Connect account not found');

     const loginLink = await stripe.accounts.createLoginLink(
       account.stripe_account_id
     );

     return loginLink.url;
   }
   ```

2. **Connect Account Capability Management**:
   ```javascript
   // Request additional capabilities based on user needs
   async function requestCapabilities(userId, capabilities) {
     const { data: account } = await supabase
       .from('connected_accounts')
       .select('stripe_account_id')
       .eq('user_id', userId)
       .single();

     if (!account) throw new Error('Connect account not found');

     // Build capabilities update
     const capabilityUpdates = {};
     capabilities.forEach(cap => {
       capabilityUpdates[cap] = { requested: true };
     });

     await stripe.accounts.update(account.stripe_account_id, {
       capabilities: capabilityUpdates
     });

     // Log capability request
     await supabase.from('account_capability_requests').insert(
       capabilities.map(capability => ({
         user_id: userId,
         stripe_account_id: account.stripe_account_id,
         capability,
         requested_at: new Date()
       }))
     );
   }
   ```

3. **Enhanced Profile Completion Status**:
   ```sql
   -- View to calculate Connect account completion
   CREATE OR REPLACE VIEW public.connect_account_status AS
   SELECT
     ca.user_id,
     ca.stripe_account_id,
     ca.charges_enabled,
     ca.payouts_enabled,
     ca.details_submitted,
     CASE
       WHEN ca.charges_enabled AND ca.payouts_enabled THEN 'active'
       WHEN ca.details_submitted THEN 'pending_verification'
       ELSE 'incomplete'
     END as status,
     CASE
       WHEN ca.charges_enabled AND ca.payouts_enabled THEN 100
       WHEN ca.details_submitted THEN 75
       WHEN ca.requirements->>'currently_due' = '[]' THEN 50
       ELSE 25
     END as completion_percentage
   FROM public.connected_accounts ca;
   ```