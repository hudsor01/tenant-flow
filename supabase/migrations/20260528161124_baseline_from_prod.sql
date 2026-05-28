-- Baseline migration captured from prod via Supabase pg-meta query API on 2026-05-28T16:11:24.942Z
-- Issue #749: replaces the existing 244-file migration chain with a single
-- baseline that reflects the actual prod schema.
-- Project ref: bshjmbshupiibfiewpxb

-- ============================================================================
-- SCHEMAS
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS public;
CREATE SCHEMA IF NOT EXISTS stripe;


-- ============================================================================
-- ENUMS — stripped from baseline
-- ============================================================================
-- The original SQL Editor dump captured 9 auth.* enums + 1 storage.* enum.
-- All are Supabase platform-managed (auth.aal_level, auth.factor_type, etc.).
-- Recreating them on a fresh DB conflicts with Supabase's bootstrap migrations,
-- so we leave the auth + storage schemas to the platform and only declare
-- public + stripe DDL below. TenantFlow per CLAUDE.md uses text + CHECK
-- instead of PG enums, so no public enums to declare.
-- ============================================================================
-- SEQUENCES (0 objects)
-- ============================================================================

-- ============================================================================
-- TABLES (52 objects)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.activity (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    activity_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    title text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_config (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.blogs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    slug text NOT NULL,
    content text NOT NULL,
    excerpt text,
    meta_description text,
    featured_image text,
    category text,
    tags text[],
    status text DEFAULT 'published'::text,
    word_count integer,
    reading_time integer GENERATED ALWAYS AS (GREATEST(1, (word_count / 200))) STORED,
    quality_score numeric(3,2),
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    author_user_id uuid,
    canonical_url text
);

CREATE TABLE IF NOT EXISTS public.document_categories (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL,
    slug text NOT NULL,
    label text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    document_type text NOT NULL DEFAULT 'other'::text,
    file_path text NOT NULL,
    storage_url text NOT NULL,
    file_size integer,
    created_at timestamp with time zone DEFAULT now(),
    owner_user_id uuid,
    title text,
    tags text[],
    description text,
    mime_type text,
    search_vector tsvector
);

CREATE TABLE IF NOT EXISTS public.email_deliverability (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    message_id text NOT NULL,
    event_type text NOT NULL,
    recipient_email text NOT NULL,
    template_tag text,
    event_at timestamp with time zone NOT NULL,
    raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    received_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_deliverability_archive (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    message_id text NOT NULL,
    event_type text NOT NULL,
    recipient_email text NOT NULL,
    template_tag text,
    event_at timestamp with time zone NOT NULL,
    raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    received_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_suppressions (
    email text NOT NULL,
    reason text NOT NULL,
    suppressed_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    maintenance_request_id uuid NOT NULL,
    vendor_name text,
    amount integer NOT NULL,
    expense_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text NOT NULL DEFAULT 'active'::text
);

CREATE TABLE IF NOT EXISTS public.gate_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    feature text NOT NULL,
    current_plan text,
    current_status text,
    hit_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspection_photos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    inspection_room_id uuid NOT NULL,
    inspection_id uuid NOT NULL,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    mime_type text NOT NULL DEFAULT 'image/jpeg'::text,
    caption text,
    uploaded_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspection_rooms (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    inspection_id uuid NOT NULL,
    room_name text NOT NULL,
    room_type text NOT NULL DEFAULT 'other'::text,
    condition_rating text NOT NULL DEFAULT 'good'::text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inspections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    lease_id uuid NOT NULL,
    property_id uuid NOT NULL,
    unit_id uuid,
    owner_user_id uuid NOT NULL,
    inspection_type text NOT NULL DEFAULT 'move_in'::text,
    status text NOT NULL DEFAULT 'pending'::text,
    scheduled_date date,
    completed_at timestamp with time zone,
    tenant_reviewed_at timestamp with time zone,
    tenant_signature_data text,
    overall_condition text,
    owner_notes text,
    tenant_notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lease_reminders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    lease_id uuid NOT NULL,
    reminder_type text NOT NULL,
    sent_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lease_tenants (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    lease_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    is_primary boolean DEFAULT false,
    responsibility_percentage integer NOT NULL DEFAULT 100,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leases (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    unit_id uuid NOT NULL,
    primary_tenant_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    rent_amount integer NOT NULL,
    rent_currency text NOT NULL DEFAULT 'usd'::text,
    security_deposit integer NOT NULL,
    payment_day integer NOT NULL DEFAULT 1,
    late_fee_amount integer,
    late_fee_days integer DEFAULT 5,
    lease_status text NOT NULL DEFAULT 'draft'::text,
    grace_period_days integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_signed_at timestamp with time zone,
    owner_signature_ip text,
    tenant_signed_at timestamp with time zone,
    tenant_signature_ip text,
    docuseal_submission_id text,
    sent_for_signature_at timestamp with time zone,
    owner_signature_method text,
    tenant_signature_method text,
    max_occupants integer DEFAULT 2,
    pets_allowed boolean DEFAULT false,
    pet_deposit integer DEFAULT 0,
    pet_rent integer DEFAULT 0,
    utilities_included text[] DEFAULT '{}'::text[],
    tenant_responsible_utilities text[] DEFAULT ARRAY['Electric'::text, 'Gas'::text, 'Water'::text, 'Internet'::text],
    property_rules text,
    property_built_before_1978 boolean DEFAULT false,
    lead_paint_disclosure_acknowledged boolean DEFAULT false,
    governing_state text DEFAULT 'TX'::text,
    owner_user_id uuid NOT NULL,
    docuseal_document_url text
);

CREATE TABLE IF NOT EXISTS public.maintenance_request_photos (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    maintenance_request_id uuid NOT NULL,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    mime_type text NOT NULL DEFAULT 'image/jpeg'::text,
    uploaded_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    unit_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'open'::text,
    priority text NOT NULL DEFAULT 'normal'::text,
    description text NOT NULL,
    requested_by uuid,
    assigned_to uuid,
    estimated_cost integer,
    actual_cost integer,
    scheduled_date date,
    completed_at timestamp with time zone,
    inspector_id uuid,
    inspection_date date,
    inspection_findings text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    title text NOT NULL DEFAULT 'New Maintenance Request'::text,
    owner_user_id uuid NOT NULL,
    vendor_id uuid
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    notification_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    delivery_channel text,
    attempt_count integer DEFAULT 1,
    last_error text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    email boolean NOT NULL DEFAULT true,
    sms boolean NOT NULL DEFAULT false,
    push boolean NOT NULL DEFAULT true,
    in_app boolean NOT NULL DEFAULT true,
    maintenance boolean NOT NULL DEFAULT true,
    leases boolean NOT NULL DEFAULT true,
    general boolean NOT NULL DEFAULT true,
    version integer NOT NULL DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    notification_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    title text NOT NULL,
    message text,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    action_url text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.onboarding_funnel_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL,
    step_name text NOT NULL,
    completed_at timestamp with time zone NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    payment_method_id uuid,
    rent_payment_id uuid NOT NULL,
    stripe_payment_intent_id text NOT NULL,
    status text NOT NULL,
    amount integer NOT NULL,
    failure_reason text,
    retry_count integer DEFAULT 0,
    attempted_at timestamp with time zone DEFAULT now(),
    last_attempted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.processed_internal_events (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    event_name text NOT NULL,
    idempotency_key text NOT NULL,
    payload_hash text NOT NULL,
    status text DEFAULT 'processing'::text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.properties (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    stripe_connected_account_id uuid,
    name text NOT NULL,
    address_line1 text NOT NULL,
    address_line2 text,
    city text NOT NULL,
    state text NOT NULL,
    postal_code text NOT NULL,
    country text NOT NULL DEFAULT 'US'::text,
    property_type text NOT NULL,
    status text NOT NULL DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    date_sold date,
    sale_price numeric(12,2),
    owner_user_id uuid NOT NULL,
    search_vector tsvector,
    acquisition_cost numeric(14,2),
    acquisition_date date
);

CREATE TABLE IF NOT EXISTS public.property_images (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    property_id uuid NOT NULL,
    image_url text NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_runs (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    report_id uuid NOT NULL,
    execution_status text NOT NULL,
    file_path text,
    file_size integer,
    execution_time_ms integer,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reports (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    report_type text NOT NULL,
    title text NOT NULL,
    description text,
    schedule_cron text,
    next_run_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_user_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    event_type text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.security_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    event_type text NOT NULL,
    severity text NOT NULL DEFAULT 'info'::text,
    user_id uuid,
    user_email text,
    ip_address inet,
    user_agent text,
    request_id text,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    resource_type text,
    resource_id uuid,
    tags text[] DEFAULT ARRAY[]::text[]
);

CREATE TABLE IF NOT EXISTS public.security_events_archive (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    event_type text NOT NULL,
    severity text NOT NULL DEFAULT 'info'::text,
    user_id uuid,
    user_email text,
    ip_address inet,
    user_agent text,
    request_id text,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    resource_type text,
    resource_id uuid,
    tags text[] DEFAULT ARRAY[]::text[]
);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
    id text NOT NULL,
    event_type text NOT NULL,
    processed_at timestamp with time zone NOT NULL DEFAULT now(),
    livemode boolean DEFAULT false,
    data jsonb,
    status text DEFAULT 'processing'::text,
    error_message text
);

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events_archive (
    id text NOT NULL,
    event_type text NOT NULL,
    processed_at timestamp with time zone NOT NULL DEFAULT now(),
    livemode boolean DEFAULT false,
    data jsonb,
    status text DEFAULT 'processing'::text,
    error_message text
);

CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid,
    date_of_birth date,
    ssn_last_four text,
    identity_verified boolean DEFAULT false,
    emergency_contact_name text,
    emergency_contact_phone text,
    emergency_contact_relationship text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    first_name text,
    last_name text,
    name text,
    email text,
    phone text,
    status text NOT NULL DEFAULT 'active'::text,
    owner_user_id uuid
);

CREATE TABLE IF NOT EXISTS public.units (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    property_id uuid NOT NULL,
    unit_number text,
    bedrooms integer,
    bathrooms numeric(3,1),
    square_feet integer,
    rent_amount integer NOT NULL,
    rent_currency text NOT NULL DEFAULT 'usd'::text,
    rent_period text NOT NULL DEFAULT 'monthly'::text,
    status text NOT NULL DEFAULT 'available'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_user_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_access_log (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    ip_address text,
    user_agent text,
    endpoint text,
    method text,
    status_code integer,
    accessed_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_errors (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    error_type text NOT NULL,
    error_code text,
    error_message text NOT NULL,
    error_stack text,
    context jsonb DEFAULT '{}'::jsonb,
    user_agent text,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolution_notes text
);

CREATE TABLE IF NOT EXISTS public.user_errors_archive (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    error_type text NOT NULL,
    error_code text,
    error_message text NOT NULL,
    error_stack text,
    context jsonb DEFAULT '{}'::jsonb,
    user_agent text,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolution_notes text
);

CREATE TABLE IF NOT EXISTS public.user_feature_access (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    feature_name text NOT NULL,
    access_level text DEFAULT 'basic'::text,
    granted_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    theme text DEFAULT 'light'::text,
    language text DEFAULT 'en'::text,
    timezone text DEFAULT 'UTC'::text,
    notifications_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_tour_progress (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL,
    tour_key text NOT NULL,
    status text NOT NULL DEFAULT 'not_started'::text,
    current_step integer DEFAULT 0,
    completed_at timestamp with time zone,
    skipped_at timestamp with time zone,
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    email text NOT NULL,
    full_name text NOT NULL,
    phone text,
    stripe_customer_id text,
    status text NOT NULL DEFAULT 'active'::text,
    first_name text,
    last_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    identity_verified_at timestamp with time zone,
    identity_verification_status text,
    identity_verification_session_id text,
    identity_verification_data jsonb,
    identity_verification_error text,
    onboarding_completed_at timestamp with time zone,
    onboarding_status text DEFAULT 'not_started'::text,
    deletion_requested_at timestamp with time zone,
    subscription_status text,
    subscription_id text,
    subscription_plan text,
    subscription_current_period_end timestamp with time zone,
    subscription_cancel_at_period_end boolean DEFAULT false,
    subscription_updated_at timestamp with time zone,
    is_admin boolean NOT NULL DEFAULT false,
    subscription_source text,
    trial_ends_at timestamp with time zone,
    emergency_contact_name text,
    emergency_contact_phone text,
    emergency_contact_relationship text
);

CREATE TABLE IF NOT EXISTS public.vendors (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_user_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    trade text NOT NULL,
    hourly_rate numeric(10,2),
    status text NOT NULL DEFAULT 'active'::text,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_attempts (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    webhook_event_id uuid NOT NULL,
    status text NOT NULL,
    retry_count integer DEFAULT 0,
    failure_reason text,
    last_attempted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_events (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    event_type text NOT NULL,
    webhook_source text NOT NULL DEFAULT 'stripe'::text,
    raw_payload jsonb NOT NULL,
    external_id text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_metrics (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    event_type text NOT NULL,
    date date NOT NULL,
    total_received integer DEFAULT 0,
    total_processed integer DEFAULT 0,
    total_failed integer DEFAULT 0,
    average_latency_ms integer,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe._managed_webhooks (
    id text NOT NULL,
    object text,
    url text NOT NULL,
    enabled_events jsonb NOT NULL,
    description text,
    enabled boolean,
    livemode boolean,
    metadata jsonb,
    secret text NOT NULL,
    status text,
    api_version text,
    created bigint,
    last_synced_at timestamp with time zone,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    account_id text NOT NULL
);

CREATE TABLE IF NOT EXISTS stripe._migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stripe._rate_limits (
    key text NOT NULL,
    count integer NOT NULL DEFAULT 0,
    window_start timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe._sync_obj_runs (
    _account_id text NOT NULL,
    run_started_at timestamp with time zone NOT NULL,
    object text NOT NULL,
    status text NOT NULL DEFAULT 'pending'::text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    processed_count integer NOT NULL DEFAULT 0,
    cursor text,
    page_cursor text,
    created_gte integer NOT NULL DEFAULT 0,
    created_lte integer NOT NULL DEFAULT 0,
    priority integer NOT NULL DEFAULT 0,
    error_message text,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe._sync_runs (
    _account_id text NOT NULL,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    closed_at timestamp with time zone,
    max_concurrent integer NOT NULL DEFAULT 3,
    triggered_by text,
    error_message text,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stripe.accounts (
    _raw_data jsonb NOT NULL,
    id text NOT NULL GENERATED ALWAYS AS ((_raw_data ->> 'id'::text)) STORED,
    api_key_hashes text[] NOT NULL DEFAULT '{}'::text[],
    first_synced_at timestamp with time zone NOT NULL DEFAULT now(),
    _last_synced_at timestamp with time zone NOT NULL DEFAULT now(),
    _updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================================
-- CONSTRAINTS — PK / UNIQUE / CHECK (124 objects)
-- ============================================================================
ALTER TABLE public.activity ADD CONSTRAINT activity_pkey PRIMARY KEY (id);
ALTER TABLE public.app_config ADD CONSTRAINT app_config_pkey PRIMARY KEY (key);
ALTER TABLE public.blogs ADD CONSTRAINT blogs_pkey PRIMARY KEY (id);
ALTER TABLE public.blogs ADD CONSTRAINT blogs_slug_format_check CHECK (((slug ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'::text) AND ((length(slug) >= 3) AND (length(slug) <= 120))));
ALTER TABLE public.blogs ADD CONSTRAINT blogs_slug_key UNIQUE (slug);
ALTER TABLE public.blogs ADD CONSTRAINT blogs_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'in-review'::text, 'published'::text, 'archived'::text])));
ALTER TABLE public.document_categories ADD CONSTRAINT document_categories_label_length CHECK (((length(TRIM(BOTH FROM label)) >= 1) AND (length(TRIM(BOTH FROM label)) <= 80)));
ALTER TABLE public.document_categories ADD CONSTRAINT document_categories_owner_slug_key UNIQUE (owner_user_id, slug);
ALTER TABLE public.document_categories ADD CONSTRAINT document_categories_pkey PRIMARY KEY (id);
ALTER TABLE public.document_categories ADD CONSTRAINT document_categories_slug_format CHECK (((slug ~ '^[a-z0-9_]+$'::text) AND ((length(slug) >= 1) AND (length(slug) <= 50))));
ALTER TABLE public.documents ADD CONSTRAINT documents_pkey PRIMARY KEY (id);
ALTER TABLE public.email_deliverability ADD CONSTRAINT email_deliverability_event_type_check CHECK ((event_type = ANY (ARRAY['email.delivered'::text, 'email.bounced'::text, 'email.opened'::text, 'email.complained'::text, 'email.delivery_delayed'::text])));
ALTER TABLE public.email_deliverability ADD CONSTRAINT email_deliverability_message_event_unique UNIQUE (message_id, event_type);
ALTER TABLE public.email_deliverability ADD CONSTRAINT email_deliverability_pkey PRIMARY KEY (id);
ALTER TABLE public.email_deliverability_archive ADD CONSTRAINT email_deliverability_archive_message_id_event_type_key UNIQUE (message_id, event_type);
ALTER TABLE public.email_deliverability_archive ADD CONSTRAINT email_deliverability_archive_pkey PRIMARY KEY (id);
ALTER TABLE public.email_deliverability_archive ADD CONSTRAINT email_deliverability_event_type_check CHECK ((event_type = ANY (ARRAY['email.delivered'::text, 'email.bounced'::text, 'email.opened'::text, 'email.complained'::text, 'email.delivery_delayed'::text])));
ALTER TABLE public.email_suppressions ADD CONSTRAINT email_suppressions_pkey PRIMARY KEY (email);
ALTER TABLE public.email_suppressions ADD CONSTRAINT email_suppressions_reason_check CHECK ((reason = ANY (ARRAY['bounced'::text, 'complained'::text])));
ALTER TABLE public.expenses ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);
ALTER TABLE public.expenses ADD CONSTRAINT expenses_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));
ALTER TABLE public.gate_events ADD CONSTRAINT gate_events_feature_check CHECK ((feature = ANY (ARRAY['esign'::text, 'premium_reports'::text])));
ALTER TABLE public.gate_events ADD CONSTRAINT gate_events_pkey PRIMARY KEY (id);
ALTER TABLE public.inspection_photos ADD CONSTRAINT inspection_photos_pkey PRIMARY KEY (id);
ALTER TABLE public.inspection_rooms ADD CONSTRAINT inspection_rooms_condition_check CHECK ((condition_rating = ANY (ARRAY['excellent'::text, 'good'::text, 'fair'::text, 'poor'::text, 'damaged'::text])));
ALTER TABLE public.inspection_rooms ADD CONSTRAINT inspection_rooms_pkey PRIMARY KEY (id);
ALTER TABLE public.inspection_rooms ADD CONSTRAINT inspection_rooms_type_check CHECK ((room_type = ANY (ARRAY['bedroom'::text, 'bathroom'::text, 'kitchen'::text, 'living_room'::text, 'dining_room'::text, 'garage'::text, 'outdoor'::text, 'other'::text])));
ALTER TABLE public.inspections ADD CONSTRAINT inspections_pkey PRIMARY KEY (id);
ALTER TABLE public.inspections ADD CONSTRAINT inspections_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'tenant_reviewing'::text, 'finalized'::text])));
ALTER TABLE public.inspections ADD CONSTRAINT inspections_tenant_signature_data_length_check CHECK (((tenant_signature_data IS NULL) OR (length(tenant_signature_data) <= 10000)));
ALTER TABLE public.inspections ADD CONSTRAINT inspections_type_check CHECK ((inspection_type = ANY (ARRAY['move_in'::text, 'move_out'::text])));
ALTER TABLE public.lease_reminders ADD CONSTRAINT lease_reminders_pkey PRIMARY KEY (id);
ALTER TABLE public.lease_reminders ADD CONSTRAINT lease_reminders_reminder_type_check CHECK ((reminder_type = ANY (ARRAY['30_days'::text, '7_days'::text, '1_day'::text])));
ALTER TABLE public.lease_reminders ADD CONSTRAINT lease_reminders_unique_per_lease_type UNIQUE (lease_id, reminder_type);
ALTER TABLE public.lease_tenants ADD CONSTRAINT lease_tenants_lease_id_tenant_id_key UNIQUE (lease_id, tenant_id);
ALTER TABLE public.lease_tenants ADD CONSTRAINT lease_tenants_pkey PRIMARY KEY (id);
ALTER TABLE public.lease_tenants ADD CONSTRAINT lease_tenants_responsibility_percentage_range CHECK (((responsibility_percentage >= 1) AND (responsibility_percentage <= 100)));
ALTER TABLE public.leases ADD CONSTRAINT chk_lead_paint_disclosure_required CHECK (((property_built_before_1978 = false) OR ((property_built_before_1978 = true) AND (lead_paint_disclosure_acknowledged = true))));
ALTER TABLE public.leases ADD CONSTRAINT lead_paint_disclosure_required CHECK (((property_built_before_1978 = false) OR ((property_built_before_1978 = true) AND (lead_paint_disclosure_acknowledged = true))));
ALTER TABLE public.leases ADD CONSTRAINT leases_governing_state_check CHECK (((governing_state IS NULL) OR (governing_state = ANY (ARRAY['AL'::text, 'AK'::text, 'AZ'::text, 'AR'::text, 'CA'::text, 'CO'::text, 'CT'::text, 'DE'::text, 'FL'::text, 'GA'::text, 'HI'::text, 'ID'::text, 'IL'::text, 'IN'::text, 'IA'::text, 'KS'::text, 'KY'::text, 'LA'::text, 'ME'::text, 'MD'::text, 'MA'::text, 'MI'::text, 'MN'::text, 'MS'::text, 'MO'::text, 'MT'::text, 'NE'::text, 'NV'::text, 'NH'::text, 'NJ'::text, 'NM'::text, 'NY'::text, 'NC'::text, 'ND'::text, 'OH'::text, 'OK'::text, 'OR'::text, 'PA'::text, 'RI'::text, 'SC'::text, 'SD'::text, 'TN'::text, 'TX'::text, 'UT'::text, 'VT'::text, 'VA'::text, 'WA'::text, 'WV'::text, 'WI'::text, 'WY'::text, 'DC'::text, 'AS'::text, 'GU'::text, 'MP'::text, 'PR'::text, 'VI'::text]))));
ALTER TABLE public.leases ADD CONSTRAINT leases_lease_status_check CHECK ((lease_status = ANY (ARRAY['draft'::text, 'pending_signature'::text, 'active'::text, 'ended'::text, 'terminated'::text, 'expired'::text])));
ALTER TABLE public.leases ADD CONSTRAINT leases_owner_signature_method_check CHECK (((owner_signature_method IS NULL) OR (owner_signature_method = ANY (ARRAY['in_app'::text, 'docuseal'::text]))));
ALTER TABLE public.leases ADD CONSTRAINT leases_pkey PRIMARY KEY (id);
ALTER TABLE public.leases ADD CONSTRAINT leases_tenant_signature_method_check CHECK (((tenant_signature_method IS NULL) OR (tenant_signature_method = ANY (ARRAY['in_app'::text, 'docuseal'::text]))));
ALTER TABLE public.maintenance_request_photos ADD CONSTRAINT maintenance_request_photos_mime_type_check CHECK ((mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'video/mp4'::text, 'video/quicktime'::text])));
ALTER TABLE public.maintenance_request_photos ADD CONSTRAINT maintenance_request_photos_pkey PRIMARY KEY (id);
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_pkey PRIMARY KEY (id);
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'medium'::text, 'high'::text, 'urgent'::text])));
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_status_check CHECK ((status = ANY (ARRAY['open'::text, 'assigned'::text, 'in_progress'::text, 'needs_reassignment'::text, 'completed'::text, 'cancelled'::text, 'on_hold'::text])));
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_title_not_empty CHECK ((length(TRIM(BOTH FROM title)) > 0));
ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_delivery_channel_check CHECK ((delivery_channel = ANY (ARRAY['email'::text, 'sms'::text, 'in_app'::text, 'push'::text])));
ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'bounced'::text])));
ALTER TABLE public.notification_settings ADD CONSTRAINT notification_settings_pkey PRIMARY KEY (id);
ALTER TABLE public.notification_settings ADD CONSTRAINT notification_settings_user_unique UNIQUE (user_id);
ALTER TABLE public.notifications ADD CONSTRAINT notifications_notification_type_check CHECK ((notification_type = ANY (ARRAY['maintenance'::text, 'lease'::text, 'payment'::text, 'system'::text])));
ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE public.onboarding_funnel_events ADD CONSTRAINT onboarding_funnel_events_owner_step_unique UNIQUE (owner_user_id, step_name);
ALTER TABLE public.onboarding_funnel_events ADD CONSTRAINT onboarding_funnel_events_pkey PRIMARY KEY (id);
ALTER TABLE public.onboarding_funnel_events ADD CONSTRAINT onboarding_funnel_events_step_check CHECK ((step_name = ANY (ARRAY['signup'::text, 'first_property'::text, 'first_tenant'::text])));
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text, 'requires_action'::text])));
ALTER TABLE public.payment_transactions ADD CONSTRAINT payment_transactions_unique_payment_status UNIQUE (rent_payment_id, stripe_payment_intent_id, status);
ALTER TABLE public.processed_internal_events ADD CONSTRAINT processed_internal_events_event_name_idempotency_key_key UNIQUE (event_name, idempotency_key);
ALTER TABLE public.processed_internal_events ADD CONSTRAINT processed_internal_events_pkey PRIMARY KEY (id);
ALTER TABLE public.processed_internal_events ADD CONSTRAINT processed_internal_events_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'processed'::text, 'failed'::text])));
ALTER TABLE public.properties ADD CONSTRAINT properties_pkey PRIMARY KEY (id);
ALTER TABLE public.properties ADD CONSTRAINT properties_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'sold'::text])));
ALTER TABLE public.property_images ADD CONSTRAINT property_images_pkey PRIMARY KEY (id);
ALTER TABLE public.report_runs ADD CONSTRAINT report_runs_execution_status_check CHECK ((execution_status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text])));
ALTER TABLE public.report_runs ADD CONSTRAINT report_runs_pkey PRIMARY KEY (id);
ALTER TABLE public.reports ADD CONSTRAINT reports_pkey PRIMARY KEY (id);
ALTER TABLE public.security_audit_log ADD CONSTRAINT security_audit_log_event_type_check CHECK ((event_type = ANY (ARRAY['login'::text, 'logout'::text, 'password_change'::text, 'password_failed'::text, 'permission_change'::text, 'data_access'::text, 'audit'::text])));
ALTER TABLE public.security_audit_log ADD CONSTRAINT security_audit_log_pkey PRIMARY KEY (id);
ALTER TABLE public.security_events ADD CONSTRAINT security_events_event_type_check CHECK ((event_type = ANY (ARRAY['auth.login'::text, 'auth.logout'::text, 'auth.failed_login'::text, 'auth.password_change'::text, 'auth.password_reset'::text, 'user.created'::text, 'user.updated'::text, 'user.deleted'::text, 'property.created'::text, 'property.updated'::text, 'property.deleted'::text, 'lease.created'::text, 'lease.updated'::text, 'lease.deleted'::text, 'lease.signed'::text, 'payment.created'::text, 'payment.failed'::text, 'subscription.created'::text, 'subscription.canceled'::text, 'admin.action'::text, 'system.error'::text, 'system.warning'::text])));
ALTER TABLE public.security_events ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);
ALTER TABLE public.security_events ADD CONSTRAINT security_events_severity_check CHECK ((severity = ANY (ARRAY['debug'::text, 'info'::text, 'warning'::text, 'error'::text, 'critical'::text])));
ALTER TABLE public.security_events_archive ADD CONSTRAINT security_events_archive_pkey PRIMARY KEY (id);
ALTER TABLE public.security_events_archive ADD CONSTRAINT security_events_event_type_check CHECK ((event_type = ANY (ARRAY['auth.login'::text, 'auth.logout'::text, 'auth.failed_login'::text, 'auth.password_change'::text, 'auth.password_reset'::text, 'user.created'::text, 'user.updated'::text, 'user.deleted'::text, 'property.created'::text, 'property.updated'::text, 'property.deleted'::text, 'lease.created'::text, 'lease.updated'::text, 'lease.deleted'::text, 'lease.signed'::text, 'payment.created'::text, 'payment.failed'::text, 'subscription.created'::text, 'subscription.canceled'::text, 'admin.action'::text, 'system.error'::text, 'system.warning'::text])));
ALTER TABLE public.security_events_archive ADD CONSTRAINT security_events_severity_check CHECK ((severity = ANY (ARRAY['debug'::text, 'info'::text, 'warning'::text, 'error'::text, 'critical'::text])));
ALTER TABLE public.stripe_webhook_events ADD CONSTRAINT stripe_webhook_events_pkey PRIMARY KEY (id);
ALTER TABLE public.stripe_webhook_events ADD CONSTRAINT stripe_webhook_events_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'succeeded'::text, 'failed'::text])));
ALTER TABLE public.stripe_webhook_events_archive ADD CONSTRAINT stripe_webhook_events_archive_pkey PRIMARY KEY (id);
ALTER TABLE public.stripe_webhook_events_archive ADD CONSTRAINT stripe_webhook_events_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'succeeded'::text, 'failed'::text])));
ALTER TABLE public.tenants ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);
ALTER TABLE public.tenants ADD CONSTRAINT tenants_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'pending'::text, 'moved_out'::text])));
ALTER TABLE public.tenants ADD CONSTRAINT tenants_user_id_key UNIQUE (user_id);
ALTER TABLE public.units ADD CONSTRAINT units_pkey PRIMARY KEY (id);
ALTER TABLE public.units ADD CONSTRAINT units_status_check CHECK ((status = ANY (ARRAY['available'::text, 'occupied'::text, 'maintenance'::text, 'reserved'::text])));
ALTER TABLE public.user_access_log ADD CONSTRAINT user_access_log_pkey PRIMARY KEY (id);
ALTER TABLE public.user_errors ADD CONSTRAINT user_errors_pkey PRIMARY KEY (id);
ALTER TABLE public.user_errors ADD CONSTRAINT valid_error_type CHECK ((error_type = ANY (ARRAY['authorization'::text, 'validation'::text, 'application'::text, 'database'::text, 'network'::text, 'timeout'::text])));
ALTER TABLE public.user_errors_archive ADD CONSTRAINT user_errors_archive_pkey PRIMARY KEY (id);
ALTER TABLE public.user_errors_archive ADD CONSTRAINT valid_error_type CHECK ((error_type = ANY (ARRAY['authorization'::text, 'validation'::text, 'application'::text, 'database'::text, 'network'::text, 'timeout'::text])));
ALTER TABLE public.user_feature_access ADD CONSTRAINT user_feature_access_pkey PRIMARY KEY (id);
ALTER TABLE public.user_feature_access ADD CONSTRAINT user_feature_access_user_id_feature_name_key UNIQUE (user_id, feature_name);
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);
ALTER TABLE public.user_tour_progress ADD CONSTRAINT user_tour_progress_pkey PRIMARY KEY (id);
ALTER TABLE public.user_tour_progress ADD CONSTRAINT user_tour_progress_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'skipped'::text])));
ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE public.users ADD CONSTRAINT users_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'suspended'::text])));
ALTER TABLE public.users ADD CONSTRAINT users_stripe_customer_id_key UNIQUE (stripe_customer_id);
ALTER TABLE public.vendors ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);
ALTER TABLE public.vendors ADD CONSTRAINT vendors_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));
ALTER TABLE public.vendors ADD CONSTRAINT vendors_trade_check CHECK ((trade = ANY (ARRAY['plumbing'::text, 'electrical'::text, 'hvac'::text, 'carpentry'::text, 'painting'::text, 'landscaping'::text, 'appliance'::text, 'general'::text, 'other'::text])));
ALTER TABLE public.webhook_attempts ADD CONSTRAINT webhook_attempts_pkey PRIMARY KEY (id);
ALTER TABLE public.webhook_attempts ADD CONSTRAINT webhook_attempts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'succeeded'::text, 'failed'::text])));
ALTER TABLE public.webhook_attempts ADD CONSTRAINT webhook_attempts_unique_event_status UNIQUE (webhook_event_id, status);
ALTER TABLE public.webhook_events ADD CONSTRAINT unique_webhook_source_external_id UNIQUE (webhook_source, external_id);
ALTER TABLE public.webhook_events ADD CONSTRAINT webhook_events_pkey PRIMARY KEY (id);
ALTER TABLE public.webhook_events ADD CONSTRAINT webhook_events_webhook_source_check CHECK ((webhook_source = ANY (ARRAY['stripe'::text, 'auth'::text, 'custom'::text])));
ALTER TABLE public.webhook_metrics ADD CONSTRAINT webhook_metrics_event_type_date_key UNIQUE (event_type, date);
ALTER TABLE public.webhook_metrics ADD CONSTRAINT webhook_metrics_pkey PRIMARY KEY (id);
ALTER TABLE stripe._managed_webhooks ADD CONSTRAINT _managed_webhooks_pkey PRIMARY KEY (id);
ALTER TABLE stripe._managed_webhooks ADD CONSTRAINT managed_webhooks_url_account_unique UNIQUE (url, account_id);
ALTER TABLE stripe._migrations ADD CONSTRAINT _migrations_name_key UNIQUE (name);
ALTER TABLE stripe._migrations ADD CONSTRAINT _migrations_pkey PRIMARY KEY (id);
ALTER TABLE stripe._rate_limits ADD CONSTRAINT _rate_limits_pkey PRIMARY KEY (key);
ALTER TABLE stripe._sync_obj_runs ADD CONSTRAINT _sync_obj_runs_pkey PRIMARY KEY (_account_id, run_started_at, object, created_gte, created_lte);
ALTER TABLE stripe._sync_obj_runs ADD CONSTRAINT _sync_obj_runs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'complete'::text, 'error'::text])));
ALTER TABLE stripe._sync_runs ADD CONSTRAINT _sync_runs_pkey PRIMARY KEY (_account_id, started_at);
ALTER TABLE stripe.accounts ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

-- ============================================================================
-- FOREIGN KEYS (52 objects)
-- ============================================================================
ALTER TABLE public.activity ADD CONSTRAINT activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.blogs ADD CONSTRAINT blogs_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.document_categories ADD CONSTRAINT document_categories_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD CONSTRAINT documents_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_maintenance_request_id_fkey FOREIGN KEY (maintenance_request_id) REFERENCES maintenance_requests(id) ON DELETE CASCADE;
ALTER TABLE public.gate_events ADD CONSTRAINT gate_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.inspection_photos ADD CONSTRAINT inspection_photos_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE;
ALTER TABLE public.inspection_photos ADD CONSTRAINT inspection_photos_inspection_room_id_fkey FOREIGN KEY (inspection_room_id) REFERENCES inspection_rooms(id) ON DELETE CASCADE;
ALTER TABLE public.inspection_photos ADD CONSTRAINT inspection_photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.inspection_rooms ADD CONSTRAINT inspection_rooms_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE public.inspections ADD CONSTRAINT inspections_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL;
ALTER TABLE public.lease_reminders ADD CONSTRAINT lease_reminders_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE;
ALTER TABLE public.lease_tenants ADD CONSTRAINT lease_tenants_lease_id_fkey FOREIGN KEY (lease_id) REFERENCES leases(id) ON DELETE CASCADE;
ALTER TABLE public.lease_tenants ADD CONSTRAINT lease_tenants_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE public.leases ADD CONSTRAINT leases_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.leases ADD CONSTRAINT leases_primary_tenant_id_fkey FOREIGN KEY (primary_tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;
ALTER TABLE public.leases ADD CONSTRAINT leases_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_request_photos ADD CONSTRAINT maintenance_request_photos_maintenance_request_id_fkey FOREIGN KEY (maintenance_request_id) REFERENCES maintenance_requests(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_request_photos ADD CONSTRAINT maintenance_request_photos_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES users(id);
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES users(id);
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE;
ALTER TABLE public.maintenance_requests ADD CONSTRAINT maintenance_requests_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL;
ALTER TABLE public.notification_logs ADD CONSTRAINT notification_logs_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE;
ALTER TABLE public.notification_settings ADD CONSTRAINT notification_settings_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.onboarding_funnel_events ADD CONSTRAINT onboarding_funnel_events_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.properties ADD CONSTRAINT properties_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.property_images ADD CONSTRAINT property_images_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE public.report_runs ADD CONSTRAINT report_runs_report_id_fkey FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE;
ALTER TABLE public.reports ADD CONSTRAINT reports_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.security_audit_log ADD CONSTRAINT security_audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.security_events ADD CONSTRAINT security_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.units ADD CONSTRAINT units_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.units ADD CONSTRAINT units_property_id_fkey FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
ALTER TABLE public.user_access_log ADD CONSTRAINT user_access_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.user_errors ADD CONSTRAINT user_errors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.user_feature_access ADD CONSTRAINT user_feature_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.user_preferences ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.user_tour_progress ADD CONSTRAINT user_tour_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public.vendors ADD CONSTRAINT vendors_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.webhook_attempts ADD CONSTRAINT webhook_attempts_webhook_event_id_fkey FOREIGN KEY (webhook_event_id) REFERENCES webhook_events(id) ON DELETE CASCADE;
ALTER TABLE stripe._managed_webhooks ADD CONSTRAINT fk_managed_webhooks_account FOREIGN KEY (account_id) REFERENCES stripe.accounts(id);
ALTER TABLE stripe._sync_obj_runs ADD CONSTRAINT fk_sync_obj_runs_parent FOREIGN KEY (_account_id, run_started_at) REFERENCES stripe._sync_runs(_account_id, started_at);
ALTER TABLE stripe._sync_runs ADD CONSTRAINT fk_sync_runs_account FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id);

-- ============================================================================
-- INDEXES (100 objects)
-- ============================================================================
CREATE INDEX document_categories_owner_idx ON public.document_categories USING btree (owner_user_id, sort_order);
CREATE INDEX email_deliverability_archive_event_at_idx ON public.email_deliverability_archive USING btree (event_at DESC);
CREATE INDEX email_deliverability_archive_template_tag_event_type_event__idx ON public.email_deliverability_archive USING btree (template_tag, event_type, event_at DESC);
CREATE INDEX idx_activity_user_created_desc ON public.activity USING btree (user_id, created_at DESC);
CREATE INDEX idx_activity_user_id ON public.activity USING btree (user_id);
CREATE INDEX idx_blogs_author_user_id ON public.blogs USING btree (author_user_id);
CREATE INDEX idx_blogs_status ON public.blogs USING btree (status);
CREATE INDEX idx_documents_document_type ON public.documents USING btree (document_type);
CREATE INDEX idx_documents_entity_created_at ON public.documents USING btree (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_documents_entity_type_entity_id ON public.documents USING btree (entity_type, entity_id);
CREATE INDEX idx_documents_owner_user_id ON public.documents USING btree (owner_user_id);
CREATE INDEX idx_documents_search_vector ON public.documents USING gin (search_vector);
CREATE INDEX idx_email_deliverability_event_at ON public.email_deliverability USING btree (event_at DESC);
CREATE INDEX idx_email_deliverability_template_event ON public.email_deliverability USING btree (template_tag, event_type, event_at DESC);
CREATE INDEX idx_expenses_expense_date ON public.expenses USING btree (expense_date);
CREATE INDEX idx_expenses_maintenance_request_id ON public.expenses USING btree (maintenance_request_id);
CREATE INDEX idx_expenses_mr_date ON public.expenses USING btree (maintenance_request_id, expense_date);
CREATE INDEX idx_expenses_status_active ON public.expenses USING btree (id) WHERE (status = 'active'::text);
CREATE INDEX idx_gate_events_feature_hit_at ON public.gate_events USING btree (feature, hit_at DESC);
CREATE INDEX idx_gate_events_user_id ON public.gate_events USING btree (user_id);
CREATE INDEX idx_inspection_photos_uploaded_by ON public.inspection_photos USING btree (uploaded_by);
CREATE INDEX idx_inspections_unit_id ON public.inspections USING btree (unit_id);
CREATE INDEX idx_lease_reminders_lease_id ON public.lease_reminders USING btree (lease_id);
CREATE INDEX idx_lease_tenants_lease_id ON public.lease_tenants USING btree (lease_id);
CREATE INDEX idx_lease_tenants_tenant_id ON public.lease_tenants USING btree (tenant_id);
CREATE INDEX idx_leases_dates ON public.leases USING btree (start_date, end_date);
CREATE INDEX idx_leases_draft ON public.leases USING btree (lease_status) WHERE (lease_status = 'draft'::text);
CREATE INDEX idx_leases_owner_status ON public.leases USING btree (owner_user_id, lease_status);
CREATE INDEX idx_leases_owner_unit ON public.leases USING btree (owner_user_id, unit_id);
CREATE INDEX idx_leases_owner_user_id ON public.leases USING btree (owner_user_id);
CREATE INDEX idx_leases_pending_signature ON public.leases USING btree (lease_status) WHERE (lease_status = 'pending_signature'::text);
CREATE INDEX idx_leases_primary_tenant_id ON public.leases USING btree (primary_tenant_id);
CREATE INDEX idx_leases_unit_id ON public.leases USING btree (unit_id);
CREATE INDEX idx_leases_unit_status ON public.leases USING btree (unit_id, lease_status);
CREATE INDEX idx_maintenance_request_photos_request_id ON public.maintenance_request_photos USING btree (maintenance_request_id);
CREATE INDEX idx_maintenance_request_photos_uploaded_by ON public.maintenance_request_photos USING btree (uploaded_by);
CREATE INDEX idx_maintenance_requests_assigned_to ON public.maintenance_requests USING btree (assigned_to);
CREATE INDEX idx_maintenance_requests_owner_status ON public.maintenance_requests USING btree (owner_user_id, status);
CREATE INDEX idx_maintenance_requests_requested_by ON public.maintenance_requests USING btree (requested_by);
CREATE INDEX idx_maintenance_requests_tenant_id ON public.maintenance_requests USING btree (tenant_id);
CREATE INDEX idx_maintenance_requests_unit_id ON public.maintenance_requests USING btree (unit_id);
CREATE INDEX idx_mr_created_at_desc ON public.maintenance_requests USING btree (created_at DESC);
CREATE INDEX idx_notification_logs_notification_id ON public.notification_logs USING btree (notification_id);
CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, created_at DESC) WHERE (is_read = false);
CREATE INDEX idx_onboarding_funnel_events_owner ON public.onboarding_funnel_events USING btree (owner_user_id, completed_at DESC);
CREATE INDEX idx_onboarding_funnel_events_step_time ON public.onboarding_funnel_events USING btree (step_name, completed_at DESC);
CREATE INDEX idx_payment_transactions_payment_method_id ON public.payment_transactions USING btree (payment_method_id);
CREATE INDEX idx_payment_transactions_rent_payment_id ON public.payment_transactions USING btree (rent_payment_id);
CREATE INDEX idx_payment_transactions_status ON public.payment_transactions USING btree (status);
CREATE INDEX idx_payment_transactions_stripe_payment_intent_id ON public.payment_transactions USING btree (stripe_payment_intent_id);
CREATE INDEX idx_processed_internal_events_created_at ON public.processed_internal_events USING btree (created_at);
CREATE INDEX idx_processed_internal_events_event_name ON public.processed_internal_events USING btree (event_name);
CREATE INDEX idx_properties_owner_created_desc ON public.properties USING btree (owner_user_id, created_at DESC);
CREATE INDEX idx_properties_owner_user_id ON public.properties USING btree (owner_user_id);
CREATE INDEX idx_properties_property_owner_id ON public.properties USING btree (stripe_connected_account_id);
CREATE INDEX idx_property_images_property_id ON public.property_images USING btree (property_id);
CREATE INDEX idx_report_runs_execution_status ON public.report_runs USING btree (execution_status);
CREATE INDEX idx_report_runs_report_id ON public.report_runs USING btree (report_id);
CREATE INDEX idx_report_runs_started_at ON public.report_runs USING btree (started_at);
CREATE INDEX idx_reports_next_run_at ON public.reports USING btree (next_run_at);
CREATE INDEX idx_reports_owner_user_id ON public.reports USING btree (owner_user_id);
CREATE INDEX idx_reports_report_type ON public.reports USING btree (report_type);
CREATE INDEX idx_security_audit_log_user_id ON public.security_audit_log USING btree (user_id);
CREATE INDEX idx_security_events_user_id ON public.security_events USING btree (user_id) WHERE (user_id IS NOT NULL);
CREATE INDEX idx_units_owner_user_id ON public.units USING btree (owner_user_id);
CREATE INDEX idx_units_property_id ON public.units USING btree (property_id);
CREATE INDEX idx_units_property_status ON public.units USING btree (property_id, status);
CREATE INDEX idx_user_access_log_user_id ON public.user_access_log USING btree (user_id);
CREATE INDEX idx_user_errors_user_id ON public.user_errors USING btree (user_id, created_at DESC) WHERE (user_id IS NOT NULL);
CREATE INDEX idx_user_feature_access_feature_name ON public.user_feature_access USING btree (feature_name);
CREATE INDEX idx_user_feature_access_user_id ON public.user_feature_access USING btree (user_id);
CREATE INDEX idx_user_tour_progress_user_id ON public.user_tour_progress USING btree (user_id);
CREATE INDEX idx_users_stripe_customer_id ON public.users USING btree (stripe_customer_id) WHERE (stripe_customer_id IS NOT NULL);
CREATE INDEX idx_users_subscription_source ON public.users USING btree (subscription_source) WHERE (subscription_source IS NOT NULL);
CREATE INDEX idx_users_subscription_status ON public.users USING btree (subscription_status) WHERE (subscription_status IS NOT NULL);
CREATE INDEX idx_users_trial_ends_at ON public.users USING btree (trial_ends_at) WHERE (subscription_status = 'trialing'::text);
CREATE INDEX idx_webhook_attempts_status ON public.webhook_attempts USING btree (status);
CREATE INDEX inspection_photos_inspection_id_idx ON public.inspection_photos USING btree (inspection_id);
CREATE INDEX inspection_photos_inspection_room_id_idx ON public.inspection_photos USING btree (inspection_room_id);
CREATE INDEX inspection_rooms_inspection_id_idx ON public.inspection_rooms USING btree (inspection_id);
CREATE INDEX inspections_lease_id_idx ON public.inspections USING btree (lease_id);
CREATE INDEX inspections_owner_user_id_idx ON public.inspections USING btree (owner_user_id);
CREATE INDEX inspections_property_id_idx ON public.inspections USING btree (property_id);
CREATE INDEX leases_unit_date_overlap_exclusion ON public.leases USING gist (unit_id, daterange(start_date, COALESCE(end_date, '9999-12-31'::date), '[]'::text)) WHERE (lease_status = ANY (ARRAY['active'::text, 'pending_signature'::text]));
CREATE INDEX maintenance_requests_vendor_id_idx ON public.maintenance_requests USING btree (vendor_id);
CREATE INDEX security_events_archive_user_id_idx ON public.security_events_archive USING btree (user_id) WHERE (user_id IS NOT NULL);
CREATE INDEX tenants_email_idx ON public.tenants USING btree (email);
CREATE INDEX tenants_owner_user_id_idx ON public.tenants USING btree (owner_user_id);
CREATE INDEX tenants_status_idx ON public.tenants USING btree (status);
CREATE INDEX user_errors_archive_user_id_created_at_idx ON public.user_errors_archive USING btree (user_id, created_at DESC) WHERE (user_id IS NOT NULL);
CREATE INDEX vendors_owner_user_id_idx ON public.vendors USING btree (owner_user_id);
CREATE INDEX idx_accounts_api_key_hashes ON stripe.accounts USING gin (api_key_hashes);
CREATE INDEX idx_managed_webhooks_enabled ON stripe._managed_webhooks USING btree (enabled);
CREATE INDEX idx_managed_webhooks_status ON stripe._managed_webhooks USING btree (status);
CREATE INDEX idx_sync_obj_runs_priority ON stripe._sync_obj_runs USING btree (_account_id, run_started_at, status, priority);
CREATE INDEX idx_sync_obj_runs_status ON stripe._sync_obj_runs USING btree (_account_id, run_started_at, status);
CREATE INDEX idx_sync_runs_account_status ON stripe._sync_runs USING btree (_account_id, closed_at);
CREATE INDEX one_active_run_per_account_triggered_by ON stripe._sync_runs USING btree (_account_id, COALESCE(triggered_by, 'default'::text)) WHERE (closed_at IS NULL);

-- ============================================================================
-- FUNCTIONS (112 objects)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.acquire_internal_event_lock(p_event_name text, p_idempotency_key text, p_payload_hash text)
 RETURNS TABLE(lock_acquired boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    -- Atomic INSERT with ON CONFLICT DO NOTHING
    -- FOUND will be true only if the INSERT succeeded (no conflict)
    INSERT INTO public.processed_internal_events (event_name, idempotency_key, payload_hash, status, created_at)
    VALUES (p_event_name, p_idempotency_key, p_payload_hash, 'processing', now())
    ON CONFLICT (event_name, idempotency_key) DO NOTHING;

    RETURN QUERY SELECT FOUND AS lock_acquired;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.acquire_webhook_event_lock_with_id(p_webhook_source text, p_external_id text, p_event_type text, p_raw_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(lock_acquired boolean, webhook_event_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lock_acquired BOOLEAN;
  v_event_id UUID;
BEGIN
  -- Try to insert, get the ID whether inserted or existing
  INSERT INTO webhook_events (webhook_source, external_id, event_type, raw_payload, processed_at)
  VALUES (p_webhook_source, p_external_id, p_event_type, p_raw_payload, NOW())
  ON CONFLICT (webhook_source, external_id) DO UPDATE
  SET id = webhook_events.id  -- No-op to get RETURNING to work
  RETURNING id INTO v_event_id;

  -- Check if this was an insert (xmax = 0) or update
  v_lock_acquired := (SELECT xmax = 0 FROM webhook_events WHERE id = v_event_id);

  RETURN QUERY SELECT v_lock_acquired, v_event_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.anonymize_deleted_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_has_active_leases boolean;
begin
  if not exists (select 1 from public.users where id = p_user_id) then
    raise exception 'user % not found', p_user_id;
  end if;

  select exists(
    select 1 from public.leases
    where owner_user_id = p_user_id and lease_status = 'active'
  ) into v_has_active_leases;

  if v_has_active_leases then
    raise exception 'Cannot delete account with active leases. Please end all leases first.';
  end if;

  update public.properties set status = 'inactive' where owner_user_id = p_user_id;
  update public.activity set description = '[deleted user activity]' where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;
  delete from public.user_preferences where user_id = p_user_id;
  delete from public.notification_settings where user_id = p_user_id;

  update public.users
  set full_name = '[deleted user]',
      email = '[deleted-' || p_user_id::text || ']',
      first_name = null,
      last_name = null,
      phone = null,
      avatar_url = null,
      status = 'inactive'
  where id = p_user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assert_can_create_lease(p_unit_id uuid, p_primary_tenant_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_owner_user_id uuid;
  v_tenant_user_id uuid;
  v_tenant_email text;
  v_invitation_id uuid;
  v_invitation_accepted_at timestamptz;
BEGIN
  v_owner_user_id := public.get_current_owner_user_id();
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_unit_id IS NULL THEN
    RAISE EXCEPTION 'unit_id is required';
  END IF;

  IF p_primary_tenant_id IS NULL THEN
    RAISE EXCEPTION 'primary_tenant_id is required';
  END IF;

  -- Prevent data leaks: only operate on units owned by caller.
  IF NOT EXISTS (
    SELECT 1
    FROM public.units u
    WHERE u.id = p_unit_id
      AND u.owner_user_id = v_owner_user_id
  ) THEN
    RAISE EXCEPTION 'Unit not found or access denied';
  END IF;

  SELECT t.user_id
    INTO v_tenant_user_id
  FROM public.tenants t
  WHERE t.id = p_primary_tenant_id;

  IF v_tenant_user_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  SELECT u.email
    INTO v_tenant_email
  FROM public.users u
  WHERE u.id = v_tenant_user_id;

  SELECT ti.id, ti.accepted_at
    INTO v_invitation_id, v_invitation_accepted_at
  FROM public.tenant_invitations ti
  WHERE ti.owner_user_id = v_owner_user_id
    AND ti.unit_id = p_unit_id
    AND (
      -- Accepted invitation (preferred)
      (ti.accepted_by_user_id IS NOT NULL AND ti.accepted_by_user_id = v_tenant_user_id)
      -- Pending invitation (match by email)
      OR (v_tenant_email IS NOT NULL AND ti.email = v_tenant_email)
    )
  ORDER BY ti.created_at DESC
  LIMIT 1;

  IF v_invitation_id IS NULL THEN
    RAISE EXCEPTION 'Tenant must be invited to this property before a lease can be created';
  END IF;

  IF v_invitation_accepted_at IS NULL THEN
    RAISE EXCEPTION 'Tenant invitation not accepted (pending)';
  END IF;

  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.audit_for_all_policies(p_role text)
 RETURNS TABLE(schemaname text, tablename text, policyname text, roles text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT
    pp.schemaname::text,
    pp.tablename::text,
    pp.policyname::text,
    pp.roles::text[]
  FROM pg_catalog.pg_policies pp
  WHERE pp.cmd = 'ALL'
    AND pp.schemaname IN ('public', 'storage')
    AND pp.roles::text[] @> ARRAY[p_role];
$function$
;

CREATE OR REPLACE FUNCTION public.bulk_import_create_lease(p_unit_id uuid, p_primary_tenant_id uuid, p_start_date date, p_end_date date, p_rent_amount numeric, p_security_deposit numeric, p_payment_day integer, p_rent_currency text DEFAULT 'USD'::text, p_lease_status text DEFAULT 'draft'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner_id uuid := auth.uid();
  v_lease_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_unit_id is null then
    raise exception 'Unit ID is required';
  end if;

  if p_primary_tenant_id is null then
    raise exception 'Tenant ID is required';
  end if;

  if p_start_date is null then
    raise exception 'Start date is required';
  end if;

  if p_end_date is null then
    raise exception 'End date is required';
  end if;

  if p_payment_day is null then
    raise exception 'Payment day is required';
  end if;

  if p_payment_day < 1 or p_payment_day > 31 then
    raise exception 'Payment day must be between 1 and 31';
  end if;

  if p_rent_amount is null or p_rent_amount <= 0 then
    raise exception 'Rent amount must be greater than 0';
  end if;

  if p_security_deposit is null or p_security_deposit < 0 then
    raise exception 'Security deposit cannot be negative';
  end if;

  if p_end_date < p_start_date then
    raise exception 'End date must be on or after start date';
  end if;

  if char_length(p_rent_currency) <> 3 then
    raise exception 'Rent currency must be a 3-letter ISO code';
  end if;

  if p_lease_status not in ('draft', 'pending_signature', 'active') then
    raise exception 'Lease status must be draft, pending_signature, or active';
  end if;

  if not exists (
    select 1 from public.units u
    join public.properties p on p.id = u.property_id
    where u.id = p_unit_id
      and p.owner_user_id = v_owner_id
  ) then
    raise exception 'Unit % is not yours or does not exist', p_unit_id;
  end if;

  if not exists (
    select 1 from public.tenants
    where id = p_primary_tenant_id
      and owner_user_id = v_owner_id
  ) then
    raise exception 'Tenant % is not yours or does not exist', p_primary_tenant_id;
  end if;

  if exists (
    select 1 from public.leases l
    where l.unit_id = p_unit_id
      and l.lease_status in ('draft', 'pending_signature', 'active')
      and l.start_date <= p_end_date
      and l.end_date >= p_start_date
  ) then
    raise exception 'Unit % already has an active or pending lease overlapping % to %',
      p_unit_id, p_start_date, p_end_date;
  end if;

  insert into public.leases (
    unit_id, primary_tenant_id, start_date, end_date, rent_amount,
    rent_currency, security_deposit, payment_day, lease_status, owner_user_id
  ) values (
    p_unit_id, p_primary_tenant_id, p_start_date, p_end_date, p_rent_amount,
    upper(p_rent_currency), p_security_deposit, p_payment_day, p_lease_status, v_owner_id
  )
  returning id into v_lease_id;

  insert into public.lease_tenants (lease_id, tenant_id, is_primary, responsibility_percentage)
  values (v_lease_id, p_primary_tenant_id, true, 100);

  return v_lease_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_maintenance_metrics(p_user_id uuid DEFAULT NULL::uuid, user_id uuid DEFAULT NULL::uuid, user_id_param uuid DEFAULT NULL::uuid, uid uuid DEFAULT NULL::uuid)
 RETURNS TABLE(total_cost bigint, avg_cost numeric, total_requests bigint, emergency_count bigint, high_priority_count bigint, normal_priority_count bigint, low_priority_count bigint, completed_count bigint, open_count bigint, in_progress_count bigint, avg_resolution_hours numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, user_id, user_id_param, uid);

  -- SECURITY: Verify caller owns the requested data
  IF v_user_id IS NOT NULL AND v_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT
      0::bigint, 0::numeric, 0::bigint, 0::bigint, 0::bigint,
      0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::numeric;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(COALESCE(mr.actual_cost, mr.estimated_cost, 0)), 0)::bigint AS total_cost,
    COALESCE(AVG(COALESCE(mr.actual_cost, mr.estimated_cost, 0)), 0)::numeric AS avg_cost,
    COUNT(*)::bigint AS total_requests,
    COUNT(*) FILTER (WHERE mr.priority = 'urgent')::bigint AS emergency_count,
    COUNT(*) FILTER (WHERE mr.priority = 'high')::bigint AS high_priority_count,
    COUNT(*) FILTER (WHERE mr.priority = 'normal')::bigint AS normal_priority_count,
    COUNT(*) FILTER (WHERE mr.priority = 'low')::bigint AS low_priority_count,
    COUNT(*) FILTER (WHERE mr.status = 'completed')::bigint AS completed_count,
    COUNT(*) FILTER (WHERE mr.status = 'open')::bigint AS open_count,
    COUNT(*) FILTER (WHERE mr.status = 'in_progress')::bigint AS in_progress_count,
    COALESCE(
      AVG(
        EXTRACT(EPOCH FROM (mr.completed_at - mr.created_at)) / 3600
      ) FILTER (WHERE mr.completed_at IS NOT NULL),
      0
    )::numeric AS avg_resolution_hours
  FROM maintenance_requests mr
  WHERE mr.owner_user_id = v_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_monthly_metrics(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'month', to_char(month_date, 'YYYY-MM'),
      'revenue', coalesce(revenue, 0),
      'expenses', coalesce(expenses, 0),
      'net_income', coalesce(revenue, 0) - coalesce(expenses, 0),
      'cash_flow', coalesce(revenue, 0) - coalesce(expenses, 0)
    )
    order by month_date
  ), '[]'::jsonb) into v_result
  from (
    select
      generate_series(
        date_trunc('month', current_date) - interval '11 months',
        date_trunc('month', current_date),
        interval '1 month'
      )::date as month_date
  ) months
  left join lateral (
    select sum(rp.amount) as revenue
    from rent_payments rp
    join leases l on rp.lease_id = l.id
    where l.owner_user_id = p_user_id
      and rp.status = 'succeeded'
      and date_trunc('month', rp.paid_date) = months.month_date
  ) rev on true
  left join lateral (
    select sum(e.amount) as expenses
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    where mr.owner_user_id = p_user_id
      and e.status <> 'inactive'
      and date_trunc('month', e.expense_date) = months.month_date
  ) exp on true;

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.users
  set deletion_requested_at = null
  where id = v_user_id;

  if not found then
    raise exception 'user not found';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_cron_health()
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
;

CREATE OR REPLACE FUNCTION public.check_stripe_sync_status()
 RETURNS TABLE(table_name text, row_count bigint, latest_created_at timestamp with time zone, latest_synced_at timestamp with time zone, staleness_hours numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'stripe'
AS $function$
begin
  return query
  select 'subscriptions'::text,
    (select count(*) from stripe.subscriptions),
    (select to_timestamp(max(created)) from stripe.subscriptions),
    (select max(last_synced_at) from stripe.subscriptions),
    extract(epoch from now() - (select max(last_synced_at) from stripe.subscriptions)) / 3600
  union all
  select 'invoices'::text,
    (select count(*) from stripe.invoices),
    (select to_timestamp(max(created)) from stripe.invoices),
    (select max(last_synced_at) from stripe.invoices),
    extract(epoch from now() - (select max(last_synced_at) from stripe.invoices)) / 3600
  union all
  select 'charges'::text,
    (select count(*) from stripe.charges),
    (select to_timestamp(max(created)) from stripe.charges),
    (select max(last_synced_at) from stripe.charges),
    extract(epoch from now() - (select max(last_synced_at) from stripe.charges)) / 3600
  union all
  select 'customers'::text,
    (select count(*) from stripe.customers),
    (select to_timestamp(max(created)) from stripe.customers),
    (select max(last_synced_at) from stripe.customers),
    extract(epoch from now() - (select max(last_synced_at) from stripe.customers)) / 3600
  union all
  select 'products'::text,
    (select count(*) from stripe.products),
    (select to_timestamp(max(created)) from stripe.products),
    (select max(last_synced_at) from stripe.products),
    extract(epoch from now() - (select max(last_synced_at) from stripe.products)) / 3600
  union all
  select 'prices'::text,
    (select count(*) from stripe.prices),
    (select to_timestamp(max(created)) from stripe.prices),
    (select max(last_synced_at) from stripe.prices),
    extract(epoch from now() - (select max(last_synced_at) from stripe.prices)) / 3600;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_user_feature_access(p_user_id text, p_feature text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stripe_customer_id text;
  v_price_id           text;
  v_plan_tier          text;
BEGIN
  IF p_user_id != (SELECT auth.uid())::text THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'stripe')
     AND to_regclass('stripe.customers') IS NOT NULL
     AND to_regclass('stripe.subscriptions') IS NOT NULL
  THEN
    SELECT id INTO v_stripe_customer_id
    FROM stripe.customers
    WHERE (metadata->>'user_id')::uuid = p_user_id::uuid
    LIMIT 1;

    IF v_stripe_customer_id IS NOT NULL THEN
      SELECT si.price INTO v_price_id
      FROM stripe.subscriptions s
      JOIN stripe.subscription_items si ON si.subscription = s.id
      WHERE s.customer = v_stripe_customer_id
        AND s.status IN ('active', 'trialing')
      ORDER BY s.created DESC
      LIMIT 1;
    END IF;
  END IF;

  v_plan_tier := CASE v_price_id
    WHEN 'price_1RgguDP3WCR53Sdo1lJmjlD5' THEN 'FREETRIAL'
    WHEN 'price_1TVTaAP3WCR53SdoYMUZN7Vf' THEN 'STARTER'
    WHEN 'price_1TVTaEP3WCR53Sdo7pbg6BCW' THEN 'STARTER'
    WHEN 'price_1TVTaIP3WCR53SdoqnUe1Inv' THEN 'GROWTH'
    WHEN 'price_1TVTaMP3WCR53SdoN4kufrVn' THEN 'GROWTH'
    WHEN 'price_1TVTaQP3WCR53Sdo22VAYfhp' THEN 'TENANTFLOW_MAX'
    WHEN 'price_1TVTaUP3WCR53Sdo5mnmSAmF' THEN 'TENANTFLOW_MAX'
    ELSE 'FREETRIAL'
  END;

  RETURN CASE p_feature
    WHEN 'basic_properties'  THEN true
    WHEN 'maintenance'       THEN true
    WHEN 'financial_reports' THEN true
    WHEN 'api_access'        THEN v_plan_tier IN ('GROWTH', 'TENANTFLOW_MAX')
    WHEN 'white_label'       THEN v_plan_tier = 'TENANTFLOW_MAX'
    ELSE true
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_cron_job_run_details()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  deleted_count integer;
begin
  delete from cron.job_run_details
  where start_time < now() - interval '7 days';

  get diagnostics deleted_count = row_count;

  raise notice 'cleanup_cron_job_run_details: deleted % row(s)', deleted_count;
  return deleted_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_email_deliverability()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_archived integer := 0;
begin
  -- archive rows older than 90 days
  with to_archive as (
    select id from public.email_deliverability
    where event_at < now() - interval '90 days'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.email_deliverability_archive
    select ed.* from public.email_deliverability ed
    join to_archive ta on ta.id = ed.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_archived from archived;

  -- delete only successfully archived rows
  delete from public.email_deliverability
  where event_at < now() - interval '90 days'
    and id in (select id from public.email_deliverability_archive);

  raise notice 'cleanup_old_email_deliverability: archived % rows', v_archived;
  return v_archived;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_errors()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_archived integer := 0;
begin
  -- archive errors older than 90 days (both resolved and unresolved)
  with to_archive as (
    select id from public.user_errors
    where created_at < now() - interval '90 days'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.user_errors_archive
    select ue.* from public.user_errors ue
    join to_archive ta on ta.id = ue.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_archived from archived;

  -- delete only successfully archived rows
  delete from public.user_errors
  where created_at < now() - interval '90 days'
    and id in (select id from public.user_errors_archive);

  raise notice 'cleanup_old_errors: archived % rows', v_archived;
  return v_archived;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_internal_events(days_to_keep integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.processed_internal_events
  WHERE created_at < now() - (days_to_keep || ' days')::interval;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_security_events()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_archived integer := 0;
  v_batch integer;
begin
  -- batch 1: archive debug/info events older than 30 days
  with to_archive as (
    select id from public.security_events
    where created_at < now() - interval '30 days'
      and severity in ('debug', 'info')
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.security_events_archive
    select se.* from public.security_events se
    join to_archive ta on ta.id = se.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  -- delete archived debug/info rows
  delete from public.security_events
  where created_at < now() - interval '30 days'
    and severity in ('debug', 'info')
    and id in (select id from public.security_events_archive);

  -- batch 2: archive warning events older than 90 days
  with to_archive as (
    select id from public.security_events
    where created_at < now() - interval '90 days'
      and severity = 'warning'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.security_events_archive
    select se.* from public.security_events se
    join to_archive ta on ta.id = se.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  delete from public.security_events
  where created_at < now() - interval '90 days'
    and severity = 'warning'
    and id in (select id from public.security_events_archive);

  -- batch 3: archive error/critical events older than 1 year
  with to_archive as (
    select id from public.security_events
    where created_at < now() - interval '1 year'
      and severity in ('error', 'critical')
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.security_events_archive
    select se.* from public.security_events se
    join to_archive ta on ta.id = se.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  delete from public.security_events
  where created_at < now() - interval '1 year'
    and severity in ('error', 'critical')
    and id in (select id from public.security_events_archive);

  raise notice 'cleanup_old_security_events: archived % rows', v_archived;
  return v_archived;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_archived integer := 0;
  v_batch integer;
begin
  -- batch 1: archive succeeded events older than 90 days
  with to_archive as (
    select id from public.stripe_webhook_events
    where processed_at < now() - interval '90 days'
      and status = 'succeeded'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.stripe_webhook_events_archive
    select swe.* from public.stripe_webhook_events swe
    join to_archive ta on ta.id = swe.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  delete from public.stripe_webhook_events
  where processed_at < now() - interval '90 days'
    and status = 'succeeded'
    and id in (select id from public.stripe_webhook_events_archive);

  -- batch 2: archive failed events older than 180 days
  with to_archive as (
    select id from public.stripe_webhook_events
    where processed_at < now() - interval '180 days'
      and status = 'failed'
    limit 10000
    for update skip locked
  ),
  archived as (
    insert into public.stripe_webhook_events_archive
    select swe.* from public.stripe_webhook_events swe
    join to_archive ta on ta.id = swe.id
    on conflict (id) do nothing
    returning 1
  )
  select count(*) into v_batch from archived;
  v_archived := v_archived + v_batch;

  delete from public.stripe_webhook_events
  where processed_at < now() - interval '180 days'
    and status = 'failed'
    and id in (select id from public.stripe_webhook_events_archive);

  raise notice 'cleanup_old_webhook_events: archived % rows', v_archived;
  return v_archived;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_orphan_documents()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from public.documents d
  where (
    d.entity_type = 'property'
    and not exists (select 1 from public.properties p where p.id = d.entity_id)
  )
  or (
    d.entity_type = 'lease'
    and not exists (select 1 from public.leases l where l.id = d.entity_id)
  )
  or (
    d.entity_type = 'tenant'
    and not exists (select 1 from public.tenants t where t.id = d.entity_id)
  )
  or (
    d.entity_type = 'maintenance_request'
    and not exists (select 1 from public.maintenance_requests m where m.id = d.entity_id)
  )
  or (
    d.entity_type = 'inspection'
    and not exists (select 1 from public.inspections i where i.id = d.entity_id)
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_pg_net_http_responses()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  deleted_count integer;
begin
  delete from net._http_response
  where created < now() - interval '7 days';

  get diagnostics deleted_count = row_count;

  raise notice 'cleanup_pg_net_http_responses: deleted % row(s)', deleted_count;
  return deleted_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_stripe_sync_history()
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
;

CREATE OR REPLACE FUNCTION public.confirm_lease_subscription(p_lease_id uuid, p_subscription_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Only update if still pending (idempotent - safe for webhook retries)
  update leases
  set
    stripe_subscription_id = p_subscription_id,
    stripe_subscription_status = 'active',
    subscription_failure_reason = null,
    updated_at = now()
  where id = p_lease_id
    and stripe_subscription_status = 'pending';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return event;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.documents_refresh_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.search_vector := to_tsvector(
    'english',
    coalesce(new.title, '') || ' ' ||
    coalesce(new.description, '') || ' ' ||
    coalesce(array_to_string(new.tags, ' '), '')
  );
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_property_plan_limit()
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
;

CREATE OR REPLACE FUNCTION public.enforce_unit_plan_limit()
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
  SELECT units_limit, is_admin
    INTO v_limit, v_admin
  FROM public.get_user_plan_limits(NEW.owner_user_id);

  IF v_admin OR v_limit < 0 THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.units
  WHERE owner_user_id = NEW.owner_user_id;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION
      'plan_limit_exceeded: units (% / % used)', v_count, v_limit
      USING
        ERRCODE = 'P0001',
        HINT    = 'plan_limit_exceeded',
        DETAIL  = format(
          '{"resource":"units","used":%s,"limit":%s,"upgrade_source":"unit_limit_gate"}',
          v_count, v_limit
        );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_public_user_for_auth()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  resolved_email text;
  resolved_full_name text;
begin
  resolved_email := coalesce(nullif(new.email, ''), new.raw_user_meta_data ->> 'email', 'unknown@example.com');
  resolved_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    resolved_email,
    'Unknown User'
  );

  insert into public.users as u (id, email, full_name)
  values (new.id, resolved_email, resolved_full_name)
  on conflict (id) do update
    set email = coalesce(excluded.email, u.email),
        full_name = coalesce(nullif(excluded.full_name, ''), u.full_name),
        updated_at = now();

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_leases()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lease record;
  v_expired_count integer := 0;
begin
  for v_lease in
    select id, owner_user_id
    from public.leases
    where lease_status = 'active'
      and end_date < current_date
    for update skip locked
  loop
    -- update lease status to expired
    update public.leases
    set lease_status = 'expired', updated_at = now()
    where id = v_lease.id;

    -- insert notification for the property owner
    -- notification_type 'lease' is a valid CHECK constraint value
    insert into public.notifications (user_id, notification_type, entity_type, entity_id, title, message)
    values (
      v_lease.owner_user_id,
      'lease',
      'lease',
      v_lease.id,
      'Lease Expired',
      'A lease has expired and needs attention.'
    );

    v_expired_count := v_expired_count + 1;
  end loop;

  raise notice 'expire_leases: expired % leases', v_expired_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.expire_trials()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  expired_count integer;
begin
  update public.users
  set subscription_status = 'expired',
      subscription_updated_at = now()
  where subscription_status = 'trialing'
    and trial_ends_at is not null
    and trial_ends_at < now();

  get diagnostics expired_count = row_count;
  raise notice 'expire_trials: expired % trial(s)', expired_count;
  return expired_count;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_record_first_property_funnel_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  begin
    insert into public.onboarding_funnel_events
      (owner_user_id, step_name, completed_at, metadata)
    values
      (new.owner_user_id,
       'first_property',
       coalesce(new.created_at, now()),
       jsonb_build_object('property_id', new.id))
    on conflict (owner_user_id, step_name) do nothing;
  exception when others then
    raise warning 'fn_record_first_property_funnel_event failed for property %: % / %',
      new.id, sqlstate, sqlerrm;
  end;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_record_first_tenant_funnel_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  begin
    insert into public.onboarding_funnel_events
      (owner_user_id, step_name, completed_at, metadata)
    values
      (new.owner_user_id,
       'first_tenant',
       coalesce(new.created_at, now()),
       jsonb_build_object('invitation_id', new.id))
    on conflict (owner_user_id, step_name) do nothing;
  exception when others then
    raise warning 'fn_record_first_tenant_funnel_event failed for invitation %: % / %',
      new.id, sqlstate, sqlerrm;
  end;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_record_signup_funnel_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  begin
    insert into public.onboarding_funnel_events (owner_user_id, step_name, completed_at)
    values (new.id, 'signup', coalesce(new.created_at, now()))
    on conflict (owner_user_id, step_name) do nothing;
  exception when others then
    raise warning 'fn_record_signup_funnel_event failed for user %: % / %',
      new.id, sqlstate, sqlerrm;
  end;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_billing_insights(owner_id_param uuid, start_date_param timestamp without time zone DEFAULT NULL::timestamp without time zone, end_date_param timestamp without time zone DEFAULT NULL::timestamp without time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_mrr numeric;
  v_total_revenue numeric;
  v_active_leases integer;
  v_expired_leases integer;
  v_unpaid_total numeric;
  v_unpaid_count integer;
  v_late_fee_total numeric;
  v_tenant_count integer;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF owner_id_param != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT coalesce(sum(rent_amount), 0) INTO v_mrr
  FROM leases
  WHERE owner_user_id = owner_id_param
    AND lease_status = 'active';

  v_total_revenue := v_mrr * 12;

  SELECT
    count(*) FILTER (WHERE lease_status = 'active'),
    count(*) FILTER (WHERE lease_status IN ('ended', 'terminated'))
  INTO v_active_leases, v_expired_leases
  FROM leases
  WHERE owner_user_id = owner_id_param;

  SELECT
    coalesce(sum(rp.amount), 0),
    count(*)::integer
  INTO v_unpaid_total, v_unpaid_count
  FROM rent_payments rp
  JOIN leases l ON rp.lease_id = l.id
  WHERE l.owner_user_id = owner_id_param
    AND rp.status IN ('pending', 'processing', 'failed');

  SELECT coalesce(sum(rp.amount), 0) INTO v_late_fee_total
  FROM rent_payments rp
  JOIN leases l ON rp.lease_id = l.id
  WHERE l.owner_user_id = owner_id_param
    AND rp.status NOT IN ('succeeded', 'refunded')
    AND rp.due_date < current_date;

  SELECT count(DISTINCT l.primary_tenant_id) INTO v_tenant_count
  FROM leases l
  WHERE l.owner_user_id = owner_id_param
    AND l.lease_status = 'active';

  v_result := jsonb_build_object(
    'totalRevenue', v_total_revenue,
    'mrr', v_mrr,
    'churnRate', CASE
      WHEN (v_active_leases + v_expired_leases) > 0
      THEN round((v_expired_leases::decimal / (v_active_leases + v_expired_leases)::decimal) * 100, 2)
      ELSE 0
    END,
    'unpaidTotal', v_unpaid_total,
    'unpaidCount', v_unpaid_count,
    'lateFeeTotal', v_late_fee_total,
    'tenantCount', v_tenant_count
  );

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_blog_categories()
 RETURNS TABLE(name text, slug text, post_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    b.category as name,
    lower(replace(b.category, ' ', '-')) as slug,
    count(*)::bigint as post_count
  from blogs b
  where b.status = 'published'
    and b.category is not null
  group by b.category
  order by count(*) desc;
$function$
;

CREATE OR REPLACE FUNCTION public.get_common_errors(hours_back integer DEFAULT 24, limit_count integer DEFAULT 20)
 RETURNS TABLE(error_message text, error_type text, occurrences bigint, affected_users bigint, last_occurrence timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SEC-02: Restrict to admin users only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    ue.error_message,
    ue.error_type,
    COUNT(*) as occurrences,
    COUNT(DISTINCT ue.user_id) as affected_users,
    MAX(ue.created_at) as last_occurrence
  FROM public.user_errors ue
  WHERE ue.created_at >= NOW() - (hours_back || ' hours')::interval
  GROUP BY ue.error_message, ue.error_type
  ORDER BY occurrences DESC
  LIMIT limit_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_owner_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select (select auth.uid())
$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_data_v2(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  with
  owner_properties as (
    select id, name, address_line1, property_type
    from properties
    where owner_user_id = p_user_id
      and status != 'inactive'
  ),

  all_units as (
    select u.id, u.property_id, u.status, u.rent_amount
    from units u
    where u.property_id in (select id from owner_properties)
  ),

  all_leases as (
    select l.id, l.unit_id, l.primary_tenant_id, l.rent_amount,
           l.start_date, l.end_date, l.lease_status
    from leases l
    join all_units au on au.id = l.unit_id
    where l.owner_user_id = p_user_id
  ),

  active_leases as (
    select * from all_leases where lease_status = 'active'
  ),

  all_maintenance as (
    select id, status, priority, created_at, completed_at
    from maintenance_requests
    where owner_user_id = p_user_id
  ),

  unit_agg as (
    select
      count(*)::int                                          as total_units,
      count(*) filter (where status = 'occupied')::int       as occupied_units,
      count(*) filter (where status = 'available')::int      as vacant_units,
      count(*) filter (where status = 'maintenance')::int    as maintenance_units,
      coalesce(avg(rent_amount), 0)                          as avg_rent,
      coalesce(sum(rent_amount), 0)                          as total_potential_rent,
      coalesce(sum(rent_amount) filter (where status = 'occupied'), 0) as total_actual_rent
    from all_units
  ),

  property_unit_counts as (
    select
      property_id,
      count(*) filter (where status = 'occupied')::int as occ,
      count(*)::int as tot
    from all_units
    group by property_id
  ),

  property_agg as (
    select
      count(op.id)::int as total_props,
      count(*) filter (where coalesce(puc.occ, 0) > 0)::int as occupied_props,
      count(*) filter (where coalesce(puc.occ, 0) = 0)::int as vacant_props,
      coalesce(
        round(
          (sum(coalesce(puc.occ, 0))::decimal /
           nullif(sum(coalesce(puc.tot, 0))::decimal, 0)) * 100, 2),
        0
      ) as occupancy_rate
    from owner_properties op
    left join property_unit_counts puc on puc.property_id = op.id
  ),

  lease_agg as (
    select
      (select count(*)::int from all_leases)                            as total_leases,
      count(*)::int                                                     as active_leases_count,
      (select count(*)::int from all_leases
       where lease_status in ('ended', 'terminated'))                   as expired_leases,
      count(*) filter (where end_date <= current_date + interval '30 days')::int as expiring_soon,
      coalesce(sum(rent_amount), 0)                                     as monthly_revenue
    from active_leases
  ),

  tenant_active_ids as (
    select distinct primary_tenant_id as tenant_id from active_leases
  ),

  tenant_agg as (
    select
      count(t.id)::int                                                      as total_tenants,
      count(tai.tenant_id)::int                                             as active_tenants,
      count(t.id)::int - count(tai.tenant_id)::int                         as inactive_tenants,
      count(*) filter (where t.created_at >= date_trunc('month', current_date))::int as new_this_month
    from tenants t
    left join tenant_active_ids tai on tai.tenant_id = t.id
    where exists (
      select 1 from all_leases l2
      where l2.primary_tenant_id = t.id
    )
  ),

  maintenance_agg as (
    select
      count(*)::int                                                                as total,
      count(*) filter (where status = 'open')::int                                as open_count,
      count(*) filter (where status = 'in_progress')::int                         as in_progress,
      count(*) filter (where status = 'completed')::int                           as completed,
      count(*) filter (where status = 'completed' and date(completed_at) = current_date)::int as completed_today,
      coalesce(
        avg(extract(epoch from (completed_at - created_at)) / 86400)
        filter (where completed_at is not null), 0
      )                                                                            as avg_resolution_days,
      count(*) filter (where priority = 'low')::int                               as priority_low,
      count(*) filter (where priority = 'normal')::int                            as priority_normal,
      count(*) filter (where priority = 'high')::int                              as priority_high,
      count(*) filter (where priority = 'urgent')::int                            as priority_urgent
    from all_maintenance
  ),

  trend_occupancy as (
    select
      coalesce(
        round(
          (select count(distinct l.unit_id)::numeric
           from all_leases l
           where l.lease_status = 'active'
             and l.start_date <= current_date
             and (l.end_date is null or l.end_date >= current_date)
          ) / nullif(count(*)::numeric, 0) * 100, 2
        ), 0
      ) as current_val,
      coalesce(
        round(
          (select count(distinct l.unit_id)::numeric
           from all_leases l
           where l.lease_status = 'active'
             and l.start_date <= current_date - interval '30 days'
             and (l.end_date is null or l.end_date >= current_date - interval '30 days')
          ) / nullif(count(*)::numeric, 0) * 100, 2
        ), 0
      ) as previous_val
    from all_units
  ),

  trend_revenue as (
    select
      coalesce(sum(rent_amount), 0) as current_val,
      coalesce((
        select sum(l.rent_amount)
        from all_leases l
        where l.lease_status = 'active'
          and l.start_date <= current_date - interval '30 days'
          and (l.end_date is null or l.end_date >= current_date - interval '30 days')
      ), 0) as previous_val
    from active_leases
  ),

  trend_tenants as (
    select
      (select count(distinct al.primary_tenant_id)::numeric from active_leases al) as current_val,
      coalesce((
        select count(distinct l.primary_tenant_id)::numeric
        from all_leases l
        where l.lease_status = 'active'
          and l.start_date <= current_date - interval '30 days'
          and (l.end_date is null or l.end_date >= current_date - interval '30 days')
      ), 0) as previous_val
  ),

  trend_maintenance as (
    select
      count(*) filter (where status not in ('completed', 'cancelled'))::numeric as current_val,
      coalesce((
        select count(*)::numeric
        from all_maintenance
        where created_at <= current_date - interval '30 days'
          and status != 'cancelled'
          and (status != 'completed' or completed_at > current_date - interval '30 days')
      ), 0) as previous_val
    from all_maintenance
  ),

  date_series as (
    select d::date as series_date
    from generate_series(current_date - 29, current_date, '1 day'::interval) d
  ),

  month_series as (
    select date_trunc('month', d)::date as month_start
    from generate_series(
      date_trunc('month', current_date) - interval '5 months',
      date_trunc('month', current_date),
      '1 month'::interval
    ) d
  ),

  total_unit_count as (
    select count(*)::numeric as cnt from all_units
  ),

  ts_occupancy as (
    select jsonb_agg(
      jsonb_build_object('date', occ.date, 'value', occ.rate)
      order by occ.date
    ) as data
    from (
      select
        to_char(ds.series_date, 'YYYY-MM-DD') as date,
        case when tuc.cnt > 0
          then coalesce(
            round(count(distinct l.unit_id)::numeric / tuc.cnt * 100, 2), 0
          )
          else 0
        end as rate
      from date_series ds
      cross join total_unit_count tuc
      left join all_leases l
        on l.lease_status = 'active'
        and l.start_date <= ds.series_date
        and (l.end_date is null or l.end_date >= ds.series_date)
      group by ds.series_date, tuc.cnt
    ) occ
  ),

  ts_revenue as (
    select jsonb_agg(
      jsonb_build_object('date', rev.date, 'value', rev.value)
      order by rev.date
    ) as data
    from (
      select
        to_char(ds.series_date, 'YYYY-MM-DD') as date,
        coalesce(sum(l.rent_amount), 0)::numeric as value
      from date_series ds
      left join all_leases l
        on l.lease_status = 'active'
        and l.start_date <= ds.series_date
        and (l.end_date is null or l.end_date >= ds.series_date)
      group by ds.series_date
    ) rev
  ),

  ts_revenue_6mo as (
    select jsonb_agg(
      jsonb_build_object('month', to_char(rev.month_start, 'YYYY-MM'),
                         'value', rev.value)
      order by rev.month_start
    ) as data
    from (
      select
        ms.month_start,
        coalesce(sum(l.rent_amount), 0)::numeric as value
      from month_series ms
      left join all_leases l
        on l.lease_status = 'active'
        and l.start_date <= (ms.month_start + interval '1 month' - interval '1 day')
        and (l.end_date is null or l.end_date >= ms.month_start)
      group by ms.month_start
    ) rev
  ),

  perf_unit_counts as (
    select
      property_id,
      count(*) as total_units,
      count(*) filter (where status = 'occupied') as occupied_units,
      count(*) filter (where status = 'available') as vacant_units
    from all_units
    group by property_id
  ),

  perf_lease_revenues as (
    select
      u.property_id,
      coalesce(sum(l.rent_amount), 0) as monthly_revenue
    from all_units u
    left join active_leases l on l.unit_id = u.id
    group by u.property_id
  ),

  perf_potential_revenues as (
    select
      property_id,
      coalesce(sum(rent_amount), 0) as potential_revenue
    from all_units
    group by property_id
  ),

  perf_open_maintenance as (
    select
      u.property_id,
      count(*) filter (where am.status in ('open', 'in_progress'))::int as open_maintenance
    from all_maintenance am
    join maintenance_requests mr on mr.id = am.id
    join all_units u on u.id = mr.unit_id
    group by u.property_id
  ),

  property_perf as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'property_name', op.name,
          'property_id', op.id,
          'total_units', coalesce(puc.total_units, 0),
          'occupied_units', coalesce(puc.occupied_units, 0),
          'vacant_units', coalesce(puc.vacant_units, 0),
          'occupancy_rate', case
            when coalesce(puc.total_units, 0) > 0
            then round((puc.occupied_units::numeric / puc.total_units::numeric) * 100, 2)
            else 0
          end,
          'annual_revenue', coalesce(plr.monthly_revenue, 0) * 12,
          'monthly_revenue', coalesce(plr.monthly_revenue, 0),
          'potential_revenue', coalesce(ppr.potential_revenue, 0),
          'open_maintenance', coalesce(pom.open_maintenance, 0),
          'address', op.address_line1,
          'property_type', op.property_type,
          'status', case
            when coalesce(puc.total_units, 0) = 0 then 'NO_UNITS'
            when coalesce(puc.occupied_units, 0) = 0 then 'vacant'
            when puc.occupied_units = puc.total_units then 'FULL'
            else 'PARTIAL'
          end
        ) order by op.name
      ),
      '[]'::jsonb
    ) as data
    from owner_properties op
    left join perf_unit_counts puc on puc.property_id = op.id
    left join perf_lease_revenues plr on plr.property_id = op.id
    left join perf_potential_revenues ppr on ppr.property_id = op.id
    left join perf_open_maintenance pom on pom.property_id = op.id
  ),

  recent_activities as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', a.id::text,
          'title', a.title,
          'description', a.description,
          'activity_type', a.activity_type,
          'entity_type', a.entity_type,
          'entity_id', a.entity_id::text,
          'user_id', a.user_id::text,
          'created_at', a.created_at
        ) order by a.created_at desc
      ),
      '[]'::jsonb
    ) as data
    from (
      select id, title, description, activity_type, entity_type, entity_id, user_id, created_at
      from activity
      where user_id = p_user_id
      order by created_at desc
      limit 10
    ) a
  )

  select jsonb_build_object(
    'stats', jsonb_build_object(
      'properties', jsonb_build_object(
        'total',           pa.total_props,
        'occupied',        pa.occupied_props,
        'vacant',          pa.vacant_props,
        'occupancyRate',   pa.occupancy_rate,
        'totalMonthlyRent', ua.total_actual_rent,
        'averageRent',     ua.avg_rent
      ),
      'tenants', jsonb_build_object(
        'total',         ta.total_tenants,
        'active',        ta.active_tenants,
        'inactive',      ta.inactive_tenants,
        'newThisMonth',  ta.new_this_month
      ),
      'units', jsonb_build_object(
        'total',              ua.total_units,
        'occupied',           ua.occupied_units,
        'vacant',             ua.total_units - ua.occupied_units,
        'maintenance',        ua.maintenance_units,
        'available',          ua.vacant_units,
        'averageRent',        ua.avg_rent,
        'occupancyRate',      case when ua.total_units > 0
                                then round((ua.occupied_units::decimal / ua.total_units::decimal) * 100, 2)
                                else 0 end,
        'occupancyChange',    tocc.current_val - tocc.previous_val,
        'totalPotentialRent', ua.total_potential_rent,
        'totalActualRent',    ua.total_actual_rent
      ),
      'leases', jsonb_build_object(
        'total',        la.total_leases,
        'active',       la.active_leases_count,
        'expired',      la.expired_leases,
        'expiringSoon', la.expiring_soon
      ),
      'maintenance', jsonb_build_object(
        'total',           ma.total,
        'open',            ma.open_count,
        'inProgress',      ma.in_progress,
        'completed',       ma.completed,
        'completedToday',  ma.completed_today,
        'avgResolutionTime', ma.avg_resolution_days,
        'byPriority', jsonb_build_object(
          'low',    ma.priority_low,
          'normal', ma.priority_normal,
          'high',   ma.priority_high,
          'urgent', ma.priority_urgent
        )
      ),
      'revenue', jsonb_build_object(
        'monthly', la.monthly_revenue,
        'yearly',  la.monthly_revenue * 12,
        'growth',  case
          when trev.previous_val > 0
          then round(((trev.current_val - trev.previous_val) / trev.previous_val) * 100, 2)
          else 0
        end
      )
    ),
    'trends', jsonb_build_object(
      'occupancy_rate', jsonb_build_object(
        'current', tocc.current_val,
        'previous', tocc.previous_val,
        'change', tocc.current_val - tocc.previous_val,
        'percentChange', case
          when tocc.previous_val > 0
          then round(((tocc.current_val - tocc.previous_val) / tocc.previous_val) * 100, 2)
          else 0
        end,
        'trend', case
          when tocc.current_val > tocc.previous_val then 'up'
          when tocc.current_val < tocc.previous_val then 'down'
          else 'stable'
        end
      ),
      'monthly_revenue', jsonb_build_object(
        'current', trev.current_val,
        'previous', trev.previous_val,
        'change', trev.current_val - trev.previous_val,
        'percentChange', case
          when trev.previous_val > 0
          then round(((trev.current_val - trev.previous_val) / trev.previous_val) * 100, 2)
          else 0
        end,
        'trend', case
          when trev.current_val > trev.previous_val then 'up'
          when trev.current_val < trev.previous_val then 'down'
          else 'stable'
        end
      ),
      'active_tenants', jsonb_build_object(
        'current', tten.current_val,
        'previous', tten.previous_val,
        'change', tten.current_val - tten.previous_val,
        'percentChange', case
          when tten.previous_val > 0
          then round(((tten.current_val - tten.previous_val) / tten.previous_val) * 100, 2)
          else 0
        end,
        'trend', case
          when tten.current_val > tten.previous_val then 'up'
          when tten.current_val < tten.previous_val then 'down'
          else 'stable'
        end
      ),
      'open_maintenance', jsonb_build_object(
        'current', tmnt.current_val,
        'previous', tmnt.previous_val,
        'change', tmnt.current_val - tmnt.previous_val,
        'percentChange', case
          when tmnt.previous_val > 0
          then round(((tmnt.current_val - tmnt.previous_val) / tmnt.previous_val) * 100, 2)
          else 0
        end,
        'trend', case
          when tmnt.current_val > tmnt.previous_val then 'up'
          when tmnt.current_val < tmnt.previous_val then 'down'
          else 'stable'
        end
      )
    ),
    'time_series', jsonb_build_object(
      'occupancy_rate', coalesce(tso.data, '[]'::jsonb),
      'monthly_revenue', coalesce(tsr.data, '[]'::jsonb),
      'monthly_revenue_6mo', coalesce(ts6.data, '[]'::jsonb)
    ),
    'property_performance', pp.data,
    'activities', ra.data
  ) into v_result
  from property_agg pa
  cross join unit_agg ua
  cross join tenant_agg ta
  cross join lease_agg la
  cross join maintenance_agg ma
  cross join trend_occupancy tocc
  cross join trend_revenue trev
  cross join trend_tenants tten
  cross join trend_maintenance tmnt
  cross join ts_occupancy tso
  cross join ts_revenue tsr
  cross join ts_revenue_6mo ts6
  cross join property_perf pp
  cross join recent_activities ra;

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  WITH
  owner_properties AS (
    SELECT id
    FROM properties
    WHERE owner_user_id = p_user_id
      AND status != 'inactive'
  ),

  unit_agg AS (
    SELECT
      COUNT(*)::int                                         AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int   AS occupied_units,
      COUNT(*) FILTER (WHERE u.status = 'available')::int  AS vacant_units,
      COUNT(*) FILTER (WHERE u.status = 'maintenance')::int AS maintenance_units,
      COALESCE(AVG(u.rent_amount), 0)                      AS avg_rent,
      COALESCE(SUM(u.rent_amount), 0)                      AS total_potential_rent,
      COALESCE(SUM(u.rent_amount) FILTER (WHERE u.status = 'occupied'), 0) AS total_actual_rent
    FROM units u
    WHERE u.property_id IN (SELECT id FROM owner_properties)
  ),

  property_unit_counts AS (
    SELECT
      u.property_id,
      COUNT(*) FILTER (WHERE u.status = 'occupied')::int AS occ,
      COUNT(*)::int AS tot
    FROM units u
    WHERE u.property_id IN (SELECT id FROM owner_properties)
    GROUP BY u.property_id
  ),
  property_agg AS (
    SELECT
      COUNT(op.id)::int                                                   AS total_props,
      COUNT(*) FILTER (WHERE COALESCE(puc.occ, 0) > 0)::int              AS occupied_props,
      COUNT(*) FILTER (WHERE COALESCE(puc.occ, 0) = 0)::int              AS vacant_props,
      COALESCE(
        ROUND(
          (SUM(COALESCE(puc.occ, 0))::decimal /
           NULLIF(SUM(COALESCE(puc.tot, 0))::decimal, 0)) * 100, 2),
        0
      )                                                                   AS occupancy_rate,
      COALESCE(SUM(ua.total_actual_rent), 0)                             AS monthly_rent,
      COALESCE(SUM(ua.avg_rent), 0)                                      AS avg_rent
    FROM owner_properties op
    LEFT JOIN property_unit_counts puc ON puc.property_id = op.id
    CROSS JOIN unit_agg ua
  ),

  active_leases AS (
    SELECT
      l.id,
      l.primary_tenant_id,
      l.rent_amount,
      l.end_date
    FROM leases l
    WHERE l.owner_user_id = p_user_id
      AND l.lease_status = 'active'
  ),
  lease_agg AS (
    SELECT
      (SELECT COUNT(*)::int FROM leases WHERE owner_user_id = p_user_id)               AS total_leases,
      COUNT(*)::int                                                                      AS active_leases,
      (SELECT COUNT(*)::int FROM leases
       WHERE owner_user_id = p_user_id
         AND lease_status IN ('ended', 'terminated'))                                    AS expired_leases,
      COUNT(*) FILTER (WHERE end_date <= CURRENT_DATE + INTERVAL '30 days')::int         AS expiring_soon,
      COALESCE(SUM(rent_amount), 0)                                                      AS monthly_revenue
    FROM active_leases
  ),

  tenant_active_ids AS (
    SELECT DISTINCT primary_tenant_id AS tenant_id
    FROM active_leases
  ),
  tenant_agg AS (
    SELECT
      COUNT(t.id)::int                                                     AS total_tenants,
      COUNT(tai.tenant_id)::int                                            AS active_tenants,
      COUNT(t.id)::int - COUNT(tai.tenant_id)::int                        AS inactive_tenants,
      COUNT(*) FILTER (WHERE t.created_at >= DATE_TRUNC('month', CURRENT_DATE))::int AS new_this_month
    FROM tenants t
    LEFT JOIN tenant_active_ids tai ON tai.tenant_id = t.id
    WHERE EXISTS (
      SELECT 1 FROM leases l2
      JOIN units u2 ON u2.id = l2.unit_id
      WHERE u2.property_id IN (SELECT id FROM owner_properties)
        AND l2.primary_tenant_id = t.id
    )
  ),

  maintenance_agg AS (
    SELECT
      COUNT(*)::int                                                               AS total,
      COUNT(*) FILTER (WHERE status = 'open')::int                               AS open_count,
      COUNT(*) FILTER (WHERE status = 'in_progress')::int                        AS in_progress,
      COUNT(*) FILTER (WHERE status = 'completed')::int                          AS completed,
      COUNT(*) FILTER (WHERE status = 'completed' AND DATE(completed_at) = CURRENT_DATE)::int AS completed_today,
      COALESCE(
        AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)
        FILTER (WHERE completed_at IS NOT NULL), 0
      )                                                                           AS avg_resolution_days,
      COUNT(*) FILTER (WHERE priority = 'low')::int                              AS priority_low,
      COUNT(*) FILTER (WHERE priority = 'normal')::int                           AS priority_normal,
      COUNT(*) FILTER (WHERE priority = 'high')::int                             AS priority_high,
      COUNT(*) FILTER (WHERE priority = 'urgent')::int                           AS priority_urgent
    FROM maintenance_requests
    WHERE owner_user_id = p_user_id
  )

  SELECT json_build_object(
    'properties', json_build_object(
      'total',           pa.total_props,
      'occupied',        pa.occupied_props,
      'vacant',          pa.vacant_props,
      'occupancyRate',   pa.occupancy_rate,
      'totalMonthlyRent', (SELECT total_actual_rent FROM unit_agg),
      'averageRent',     (SELECT avg_rent FROM unit_agg)
    ),
    'tenants', json_build_object(
      'total',         ta.total_tenants,
      'active',        ta.active_tenants,
      'inactive',      ta.inactive_tenants,
      'newThisMonth',  ta.new_this_month
    ),
    'units', json_build_object(
      'total',              ua.total_units,
      'occupied',           ua.occupied_units,
      'vacant',             ua.vacant_units,
      'maintenance',        ua.maintenance_units,
      'available',          ua.vacant_units,
      'averageRent',        ua.avg_rent,
      'occupancyRate',      CASE WHEN ua.total_units > 0
                              THEN ROUND((ua.occupied_units::decimal / ua.total_units::decimal) * 100, 2)
                              ELSE 0 END,
      'occupancyChange',    0,
      'totalPotentialRent', ua.total_potential_rent,
      'totalActualRent',    ua.total_actual_rent
    ),
    'leases', json_build_object(
      'total',        la.total_leases,
      'active',       la.active_leases,
      'expired',      la.expired_leases,
      'expiringSoon', la.expiring_soon
    ),
    'maintenance', json_build_object(
      'total',           ma.total,
      'open',            ma.open_count,
      'inProgress',      ma.in_progress,
      'completed',       ma.completed,
      'completedToday',  ma.completed_today,
      'avgResolutionTime', ma.avg_resolution_days,
      'byPriority', json_build_object(
        'low',    ma.priority_low,
        'normal', ma.priority_normal,
        'high',   ma.priority_high,
        'urgent', ma.priority_urgent
      )
    ),
    'revenue', json_build_object(
      'monthly', la.monthly_revenue,
      'yearly',  la.monthly_revenue * 12,
      'growth',  0
    )
  ) INTO v_result
  FROM property_agg pa
  CROSS JOIN unit_agg ua
  CROSS JOIN tenant_agg ta
  CROSS JOIN lease_agg la
  CROSS JOIN maintenance_agg ma;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_dashboard_time_series(p_user_id uuid, p_metric_name text, p_days integer DEFAULT 30)
 RETURNS TABLE(date text, value numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_date date;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  FOR v_date IN
    SELECT generate_series(current_date - (p_days - 1), current_date, '1 day'::interval)::date
  LOOP
    date := to_char(v_date, 'YYYY-MM-DD');

    CASE p_metric_name
      WHEN 'occupancy_rate' THEN
        SELECT coalesce(
          round(
            count(*) FILTER (WHERE u.status = 'occupied')::numeric /
            nullif(count(*)::numeric, 0) * 100, 2
          ), 0
        ) INTO value
        FROM units u
        WHERE u.property_id IN (SELECT id FROM properties WHERE owner_user_id = p_user_id);

      WHEN 'monthly_revenue' THEN
        SELECT coalesce(sum(rent_amount), 0) INTO value
        FROM leases
        WHERE owner_user_id = p_user_id
          AND lease_status = 'active'
          AND start_date <= v_date
          AND (end_date IS NULL OR end_date >= v_date);

      WHEN 'open_maintenance' THEN
        SELECT count(*)::numeric INTO value
        FROM maintenance_requests
        WHERE owner_user_id = p_user_id
          AND date(created_at) <= v_date
          AND (status != 'completed' OR date(completed_at) > v_date);

      ELSE
        value := 0;
    END CASE;

    RETURN NEXT;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_deliverability_stats(p_days integer DEFAULT 30)
 RETURNS TABLE(template_tag text, sent_count bigint, delivered_count bigint, bounced_count bigint, complained_count bigint, opened_count bigint, bounce_rate numeric, complaint_rate numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- D3: p_days range guard (cheap validation runs before is_admin check)
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'p_days must be between 1 and 365';
  end if;

  -- Admin guard (T-44-04 mitigation)
  if not is_admin() then
    raise exception 'Unauthorized';
  end if;

  -- Per-template aggregates over the trailing p_days window.
  -- sent_count = count(distinct message_id) — deduplicates across event types
  -- and approximates "attempted sends" without adding email.sent to the CHECK
  -- constraint (see 44-RESEARCH.md line 577 note).
  --
  -- bounce_rate / complaint_rate use nullif(sent_count, 0) so a zero-denominator
  -- returns NULL from the division, which we coalesce to 0 — never errors,
  -- never leaks NULL to the UI.
  return query
  select
    ed.template_tag,
    count(distinct ed.message_id) as sent_count,
    count(*) filter (where ed.event_type = 'email.delivered') as delivered_count,
    count(*) filter (where ed.event_type = 'email.bounced') as bounced_count,
    count(*) filter (where ed.event_type = 'email.complained') as complained_count,
    count(*) filter (where ed.event_type = 'email.opened') as opened_count,
    coalesce(
      round(
        (count(*) filter (where ed.event_type = 'email.bounced')::numeric
          / nullif(count(distinct ed.message_id), 0)) * 100,
        2
      ),
      0
    ) as bounce_rate,
    coalesce(
      round(
        (count(*) filter (where ed.event_type = 'email.complained')::numeric
          / nullif(count(distinct ed.message_id), 0)) * 100,
        2
      ),
      0
    ) as complaint_rate
  from public.email_deliverability ed
  where ed.event_at >= now() - make_interval(days => p_days)
  group by ed.template_tag
  order by sent_count desc;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_error_prone_users(hours_back integer DEFAULT 24, min_errors integer DEFAULT 5)
 RETURNS TABLE(user_id uuid, error_count bigint, error_types text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SEC-02: Restrict to admin users only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    ue.user_id,
    COUNT(*) as error_count,
    array_agg(DISTINCT ue.error_type) as error_types
  FROM public.user_errors ue
  WHERE ue.created_at >= NOW() - (hours_back || ' hours')::interval
    AND ue.user_id IS NOT NULL
  GROUP BY ue.user_id
  HAVING COUNT(*) >= min_errors
  ORDER BY error_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_error_summary(hours_back integer DEFAULT 24)
 RETURNS TABLE(error_type text, error_count bigint, unique_users bigint, last_occurrence timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SEC-02: Restrict to admin users only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    ue.error_type,
    COUNT(*) as error_count,
    COUNT(DISTINCT ue.user_id) as unique_users,
    MAX(ue.created_at) as last_occurrence
  FROM public.user_errors ue
  WHERE ue.created_at >= NOW() - (hours_back || ' hours')::interval
  GROUP BY ue.error_type
  ORDER BY error_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_expense_summary(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
  v_categories jsonb;
  v_monthly jsonb;
  v_total_amount numeric;
  v_monthly_avg numeric;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  -- category breakdown for current year
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'category', category,
      'amount', total,
      'percentage', round((total / nullif(sum(total) over(), 0) * 100)::numeric, 2)
    )
  ), '[]'::jsonb) into v_categories
  from (
    select
      coalesce(mr.category, 'Other') as category,
      sum(e.amount) as total
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    where mr.owner_user_id = p_user_id
      and e.status <> 'inactive'
      and e.expense_date >= date_trunc('year', current_date)
    group by mr.category
  ) cat;

  -- monthly totals for last 12 months
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'month', to_char(month_date, 'YYYY-MM'),
      'amount', coalesce(monthly_total, 0)
    )
    order by month_date
  ), '[]'::jsonb) into v_monthly
  from (
    select
      generate_series(
        date_trunc('month', current_date) - interval '11 months',
        date_trunc('month', current_date),
        interval '1 month'
      )::date as month_date
  ) months
  left join (
    select
      date_trunc('month', e.expense_date)::date as expense_month,
      sum(e.amount) as monthly_total
    from expenses e
    join maintenance_requests mr on mr.id = e.maintenance_request_id
    where mr.owner_user_id = p_user_id
      and e.status <> 'inactive'
      and e.expense_date >= date_trunc('month', current_date) - interval '11 months'
    group by date_trunc('month', e.expense_date)
  ) exp on months.month_date = exp.expense_month;

  -- YTD total
  select coalesce(sum(e.amount), 0) into v_total_amount
  from expenses e
  join maintenance_requests mr on mr.id = e.maintenance_request_id
  where mr.owner_user_id = p_user_id
    and e.status <> 'inactive'
    and e.expense_date >= date_trunc('year', current_date);

  -- Month-weighted average over the trailing-12-month series we already
  -- built. Each calendar month contributes exactly once (including months
  -- with zero spend), matching what the user sees in the chart.
  select coalesce(avg((m->>'amount')::numeric), 0) into v_monthly_avg
  from jsonb_array_elements(v_monthly) m;

  v_result := jsonb_build_object(
    'categories', v_categories,
    'monthly_totals', v_monthly,
    'total_amount', v_total_amount,
    'monthly_average', round(v_monthly_avg::numeric, 2),
    'year_over_year_change', null
  );

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_financial_overview(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_revenue    numeric;
  v_total_expenses   numeric;
  v_net_income       numeric;
  v_accounts_receivable numeric;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT coalesce(sum(rent_amount) * 12, 0) INTO v_total_revenue
  FROM leases
  WHERE owner_user_id = p_user_id
    AND lease_status = 'active';

  SELECT coalesce(sum(e.amount), 0) INTO v_total_expenses
  FROM expenses e
  JOIN maintenance_requests mr ON mr.id = e.maintenance_request_id
  JOIN units u ON u.id = mr.unit_id
  JOIN properties p ON p.id = u.property_id
  WHERE p.owner_user_id = p_user_id
    AND e.status <> 'inactive'
    AND e.expense_date >= date_trunc('year', current_date);

  v_net_income := v_total_revenue - v_total_expenses;

  SELECT coalesce(sum(rp.amount), 0) INTO v_accounts_receivable
  FROM rent_payments rp
  JOIN leases l ON rp.lease_id = l.id
  WHERE l.owner_user_id = p_user_id
    AND rp.status IN ('pending', 'processing');

  RETURN jsonb_build_object(
    'overview', jsonb_build_object(
      'total_revenue',        v_total_revenue,
      'total_expenses',       v_total_expenses,
      'net_income',           v_net_income,
      'accounts_receivable',  v_accounts_receivable,
      'accounts_payable',     0
    ),
    'highlights', jsonb_build_array(
      jsonb_build_object(
        'label', 'Monthly Revenue',
        'value', v_total_revenue / 12,
        'trend', null
      ),
      jsonb_build_object(
        'label', 'Operating Margin',
        'value', CASE
          WHEN v_total_revenue > 0
          THEN round((v_net_income / v_total_revenue * 100)::numeric, 1)
          ELSE 0
        END,
        'trend', null
      ),
      jsonb_build_object(
        'label', 'Cash Position',
        'value', v_net_income,
        'trend', null
      )
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_funnel_stats(p_from timestamp with time zone DEFAULT (now() - '30 days'::interval), p_to timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
  v_cohort_label text;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  if p_from > p_to then
    raise exception 'Invalid window: p_from (%) must be <= p_to (%)', p_from, p_to;
  end if;
  if p_to > now() then
    raise exception 'Invalid window: p_to (%) cannot be in the future', p_to;
  end if;

  v_cohort_label := format(
    'owners who signed up between %s and %s',
    to_char(p_from, 'YYYY-MM-DD HH24:MI UTC'),
    to_char(p_to,   'YYYY-MM-DD HH24:MI UTC')
  );

  with cohort as (
    select owner_user_id, completed_at as signup_at
    from public.onboarding_funnel_events
    where step_name = 'signup'
      and completed_at between p_from and p_to
  ),
  step_times as (
    select
      c.owner_user_id,
      c.signup_at,
      (select completed_at from public.onboarding_funnel_events
         where owner_user_id = c.owner_user_id and step_name = 'first_property'
         limit 1) as first_property_at,
      (select completed_at from public.onboarding_funnel_events
         where owner_user_id = c.owner_user_id and step_name = 'first_tenant'
         limit 1) as first_tenant_at
    from cohort c
  ),
  counts as (
    select
      count(*)::bigint                                                as signup_count,
      count(*) filter (where first_property_at is not null)::bigint   as first_property_count,
      count(*) filter (where first_tenant_at is not null)::bigint     as first_tenant_count
    from step_times
  ),
  medians as (
    select
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_property_at - signup_at)) / 86400.0
      ) filter (where first_property_at is not null) as median_days_signup_to_property,
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_tenant_at - signup_at)) / 86400.0
      ) filter (where first_tenant_at is not null)   as median_days_signup_to_tenant,
      percentile_cont(0.5) within group (order by
        extract(epoch from (first_tenant_at - first_property_at)) / 86400.0
      ) filter (where first_tenant_at is not null and first_property_at is not null)
        as median_days_property_to_tenant
    from step_times
  )
  select jsonb_build_object(
    'from', p_from,
    'to',   p_to,
    'cohort_label', v_cohort_label,
    'medians_computed_at', now(),
    'steps', jsonb_build_array(
      jsonb_build_object(
        'step', 'signup',
        'step_order', 1,
        'count', c.signup_count,
        'conversion_rate_from_prior',   1.0,
        'conversion_rate_from_signup',  1.0,
        'median_days_from_prior',       null,
        'median_days_from_signup',      0.0
      ),
      jsonb_build_object(
        'step', 'first_property',
        'step_order', 2,
        'count', c.first_property_count,
        'conversion_rate_from_prior',
          round(c.first_property_count::numeric / nullif(c.signup_count, 0), 4),
        'conversion_rate_from_signup',
          round(c.first_property_count::numeric / nullif(c.signup_count, 0), 4),
        'median_days_from_prior',  m.median_days_signup_to_property,
        'median_days_from_signup', m.median_days_signup_to_property
      ),
      jsonb_build_object(
        'step', 'first_tenant',
        'step_order', 3,
        'count', c.first_tenant_count,
        'conversion_rate_from_prior',
          round(c.first_tenant_count::numeric / nullif(c.first_property_count, 0), 4),
        'conversion_rate_from_signup',
          round(c.first_tenant_count::numeric / nullif(c.signup_count, 0), 4),
        'median_days_from_prior',  m.median_days_property_to_tenant,
        'median_days_from_signup', m.median_days_signup_to_tenant
      )
    )
  )
  into v_result
  from counts c, medians m;

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_gate_conversion_stats(p_days integer DEFAULT 30)
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
;

CREATE OR REPLACE FUNCTION public.get_invoice_statistics(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  -- SECURITY: Verify caller owns the requested data
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'status', status,
      'count', status_count,
      'amount', total_amount
    )
  ), '[]'::jsonb) into v_result
  from (
    select
      rp.status,
      count(*) as status_count,
      sum(rp.amount) as total_amount
    from rent_payments rp
    join leases l on rp.lease_id = l.id
    where l.owner_user_id = p_user_id
      and rp.due_date >= date_trunc('year', current_date)
    group by rp.status
  ) stats;

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_lead_paint_compliance_report()
 RETURNS TABLE(total_pre_1978_leases bigint, compliant_leases bigint, non_compliant_leases bigint, compliance_percentage numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE property_built_before_1978 = true) as total_pre_1978_leases,
    COUNT(*) FILTER (WHERE property_built_before_1978 = true AND lead_paint_disclosure_acknowledged = true) as compliant_leases,
    COUNT(*) FILTER (WHERE property_built_before_1978 = true AND (lead_paint_disclosure_acknowledged = false OR lead_paint_disclosure_acknowledged IS NULL)) as non_compliant_leases,
    ROUND(
      COUNT(*) FILTER (WHERE property_built_before_1978 = true AND lead_paint_disclosure_acknowledged = true)::numeric /
      NULLIF(COUNT(*) FILTER (WHERE property_built_before_1978 = true), 0) * 100,
      2
    ) as compliance_percentage
  FROM public.leases;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_lease_stats(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
  v_active_count integer;
  v_total_rent numeric;
  v_total_deposits numeric;
  v_avg_rent numeric;
begin
  -- SEC-01: Validate caller identity
  if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  -- Counts (single table scan with FILTER)
  select
    jsonb_build_object(
      'totalLeases', count(*) filter (where lease_status != 'inactive'),
      'activeLeases', count(*) filter (where lease_status = 'active'),
      'expiredLeases', count(*) filter (where lease_status = 'ended'),
      'terminatedLeases', count(*) filter (where lease_status = 'terminated'),
      'expiringLeases', count(*) filter (
        where lease_status = 'active'
        and end_date <= (now() + interval '30 days')
        and end_date >= now()
      )
    )
  into v_result
  from leases
  where owner_user_id = p_user_id;

  -- Rent aggregates (only active leases)
  select
    count(*),
    coalesce(sum(rent_amount), 0),
    coalesce(sum(security_deposit), 0)
  into v_active_count, v_total_rent, v_total_deposits
  from leases
  where owner_user_id = p_user_id
    and lease_status = 'active';

  v_avg_rent := case when v_active_count > 0
    then v_total_rent / v_active_count
    else 0
  end;

  -- Merge aggregates into result
  v_result := v_result || jsonb_build_object(
    'totalMonthlyRent', v_total_rent,
    'averageRent', v_avg_rent,
    'total_security_deposits', v_total_deposits
  );

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_maintenance_analytics(user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_result jsonb;
  v_total_requests integer;
  v_completed_requests integer;
  v_open_requests integer;
  v_avg_resolution_hours numeric;
  v_by_status jsonb;
  v_by_priority jsonb;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  v_user_id := user_id;

  SELECT count(*) INTO v_total_requests
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id;

  SELECT count(*) INTO v_completed_requests
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id
    AND status = 'completed';

  SELECT count(*) INTO v_open_requests
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id
    AND status = 'open';

  SELECT coalesce(
    extract(epoch FROM avg(completed_at - created_at) FILTER (WHERE completed_at IS NOT NULL)) / 3600,
    0
  ) INTO v_avg_resolution_hours
  FROM maintenance_requests
  WHERE owner_user_id = v_user_id;

  SELECT coalesce(
    jsonb_agg(jsonb_build_object('status', s, 'count', c)),
    '[]'::jsonb
  ) INTO v_by_status
  FROM (
    SELECT status AS s, count(*) AS c
    FROM maintenance_requests
    WHERE owner_user_id = v_user_id
    GROUP BY status
  ) sub;

  SELECT coalesce(
    jsonb_agg(jsonb_build_object('priority', pr, 'count', c)),
    '[]'::jsonb
  ) INTO v_by_priority
  FROM (
    SELECT priority AS pr, count(*) AS c
    FROM maintenance_requests
    WHERE owner_user_id = v_user_id
    GROUP BY priority
  ) sub;

  v_result := jsonb_build_object(
    'total_requests', v_total_requests,
    'open_requests', v_open_requests,
    'avg_resolution_hours', v_avg_resolution_hours,
    'total_cost', 0,
    'average_cost', 0,
    'avgResolutionTime', v_avg_resolution_hours / 24,
    'completionRate', CASE
      WHEN v_total_requests > 0
      THEN round((v_completed_requests::decimal / v_total_requests::decimal) * 100, 2)
      ELSE 0
    END,
    'priorityBreakdown', (
      SELECT jsonb_build_object(
        'low',    coalesce(sum(CASE WHEN priority = 'low'    THEN 1 ELSE 0 END), 0),
        'normal', coalesce(sum(CASE WHEN priority = 'normal' THEN 1 ELSE 0 END), 0),
        'high',   coalesce(sum(CASE WHEN priority = 'high'   THEN 1 ELSE 0 END), 0),
        'urgent', coalesce(sum(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END), 0)
      )
      FROM maintenance_requests WHERE owner_user_id = v_user_id
    ),
    'by_status', v_by_status,
    'by_priority', v_by_priority,
    'monthly_cost', '[]'::jsonb,
    'vendor_performance', '[]'::jsonb,
    'trendsOverTime', '[]'::jsonb
  );

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_maintenance_stats(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- SEC-01: Validate caller identity
  if p_user_id != (select auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  return (
    select jsonb_build_object(
      'open', count(*) filter (where status = 'open'),
      'assigned', count(*) filter (where status = 'assigned'),
      'in_progress', count(*) filter (where status = 'in_progress'),
      'needs_reassignment', count(*) filter (where status = 'needs_reassignment'),
      'completed', count(*) filter (where status = 'completed'),
      'cancelled', count(*) filter (where status = 'cancelled'),
      'on_hold', count(*) filter (where status = 'on_hold'),
      'total', count(*)
    )
    from maintenance_requests
    where owner_user_id = p_user_id
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_metric_trend(p_user_id uuid, p_metric_name text, p_period text DEFAULT 'month'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_value  numeric;
  v_previous_value numeric;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  CASE p_metric_name
    WHEN 'occupancy_rate' THEN
      SELECT coalesce(
        round(
          count(*) FILTER (WHERE u.status = 'occupied')::numeric /
          nullif(count(*)::numeric, 0) * 100, 2
        ), 0
      ) INTO v_current_value
      FROM units u
      WHERE u.property_id IN (SELECT id FROM properties WHERE owner_user_id = p_user_id);
      v_previous_value := v_current_value;

    WHEN 'monthly_revenue' THEN
      SELECT coalesce(sum(rent_amount), 0) INTO v_current_value
      FROM leases
      WHERE owner_user_id = p_user_id
        AND lease_status = 'active';
      v_previous_value := v_current_value;

    WHEN 'active_tenants' THEN
      SELECT count(*)::numeric INTO v_current_value
      FROM tenants t
      WHERE EXISTS (
        SELECT 1 FROM leases l
        WHERE l.primary_tenant_id = t.id
          AND l.owner_user_id = p_user_id
          AND l.lease_status = 'active'
      );
      v_previous_value := v_current_value;

    WHEN 'open_maintenance' THEN
      SELECT count(*)::numeric INTO v_current_value
      FROM maintenance_requests
      WHERE owner_user_id = p_user_id
        AND status NOT IN ('completed', 'cancelled');
      v_previous_value := v_current_value;

    ELSE
      v_current_value  := 0;
      v_previous_value := 0;
  END CASE;

  RETURN jsonb_build_object(
    'current_value',     v_current_value,
    'previous_value',    v_previous_value,
    'change',            v_current_value - v_previous_value,
    'change_percentage', CASE
      WHEN v_previous_value > 0
      THEN round(((v_current_value - v_previous_value) / v_previous_value) * 100, 2)
      ELSE 0
    END,
    'trend', CASE
      WHEN v_current_value > v_previous_value THEN 'up'
      WHEN v_current_value < v_previous_value THEN 'down'
      ELSE 'stable'
    END
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_occupancy_trends_optimized(p_owner_id uuid, p_months integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_owner_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  WITH
  unit_snapshot AS (
    SELECT
      COUNT(*)                                              AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied')        AS occupied_units
    FROM units u
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = p_owner_id
  ),
  months AS (
    SELECT
      gs AS month_offset,
      (CURRENT_DATE - (gs || ' months')::interval)::date AS month_date
    FROM generate_series(0, p_months - 1) gs
  ),
  historical_occupancy AS (
    SELECT
      m.month_date,
      COUNT(DISTINCT l.unit_id) AS occupied_units
    FROM months m
    JOIN leases l ON
      l.lease_status IN ('active', 'ended')
      AND l.start_date <= (m.month_date + interval '1 month' - interval '1 day')
      AND (l.end_date IS NULL OR l.end_date >= m.month_date)
    JOIN units u ON u.id = l.unit_id
    JOIN properties p ON p.id = u.property_id
    WHERE p.owner_user_id = p_owner_id
      AND m.month_offset > 0
    GROUP BY m.month_date
  ),
  monthly_occupancy AS (
    SELECT
      m.month_date,
      TO_CHAR(m.month_date, 'YYYY-MM') AS month,
      CASE
        WHEN m.month_offset = 0 THEN us.occupied_units
        ELSE COALESCE(ho.occupied_units, 0)
      END AS occupied_units,
      us.total_units
    FROM months m
    CROSS JOIN unit_snapshot us
    LEFT JOIN historical_occupancy ho ON ho.month_date = m.month_date
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'month', mo.month,
        'occupancy_rate', CASE
          WHEN mo.total_units > 0
          THEN ROUND((mo.occupied_units::numeric / mo.total_units::numeric) * 100, 2)
          ELSE 0
        END,
        'total_units',    mo.total_units,
        'occupied_units', mo.occupied_units
      ) ORDER BY mo.month_date DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM monthly_occupancy mo;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_owner_lease_tenant_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select distinct lt.id
  from public.lease_tenants lt
  join public.leases l on l.id = lt.lease_id
  where l.owner_user_id = (select auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.get_property_performance_analytics(p_user_id uuid, p_property_id uuid DEFAULT NULL::uuid, p_timeframe text DEFAULT '30d'::text, p_limit integer DEFAULT NULL::integer)
 RETURNS TABLE(property_id uuid, property_name text, occupancy_rate numeric, total_revenue bigint, total_expenses bigint, net_income bigint, timeframe text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_days integer;
  v_start_date date;
BEGIN
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  v_days := CASE p_timeframe
    WHEN '7d' THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN '180d' THEN 180
    WHEN '365d' THEN 365
    ELSE 30
  END;

  v_start_date := CURRENT_DATE - v_days;

  RETURN QUERY
  WITH property_units AS (
    SELECT
      p.id AS prop_id,
      p.name AS prop_name,
      u.id AS unit_id,
      u.status AS unit_status
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
  ),
  property_occupancy AS (
    SELECT
      pu.prop_id,
      pu.prop_name,
      COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE pu.unit_status = 'occupied')::numeric /
           NULLIF(COUNT(*)::numeric, 0)) * 100,
          2
        ),
        0
      ) AS occ_rate
    FROM property_units pu
    GROUP BY pu.prop_id, pu.prop_name
  ),
  property_revenue AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id AND l.owner_user_id = p_user_id
    LEFT JOIN rent_payments rp ON rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  ),
  property_expenses AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(e.amount), 0)::bigint AS expenses
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN maintenance_requests mr ON mr.unit_id = u.id AND mr.owner_user_id = p_user_id
    LEFT JOIN expenses e ON e.maintenance_request_id = mr.id
      AND e.status <> 'inactive'
      AND e.expense_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    AND (p_property_id IS NULL OR p.id = p_property_id)
    GROUP BY p.id
  )
  SELECT
    po.prop_id AS property_id,
    po.prop_name AS property_name,
    po.occ_rate AS occupancy_rate,
    COALESCE(pr.revenue, 0) AS total_revenue,
    COALESCE(pe.expenses, 0) AS total_expenses,
    (COALESCE(pr.revenue, 0) - COALESCE(pe.expenses, 0))::bigint AS net_income,
    p_timeframe AS timeframe
  FROM property_occupancy po
  LEFT JOIN property_revenue pr ON pr.prop_id = po.prop_id
  LEFT JOIN property_expenses pe ON pe.prop_id = po.prop_id
  ORDER BY po.prop_name
  LIMIT COALESCE(p_limit, 100);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_property_performance_cached(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  WITH
  owner_properties AS (
    SELECT p.id, p.name
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  ),
  unit_counts AS (
    SELECT
      u.property_id,
      COUNT(*) AS total_units,
      COUNT(*) FILTER (WHERE u.status = 'occupied') AS occupied_units,
      COUNT(*) FILTER (WHERE u.status = 'available') AS vacant_units
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    GROUP BY u.property_id
  ),
  lease_revenues AS (
    SELECT
      u.property_id,
      COALESCE(SUM(l.rent_amount), 0) AS monthly_revenue
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    LEFT JOIN leases l ON l.unit_id = u.id AND l.lease_status = 'active'
    GROUP BY u.property_id
  ),
  potential_revenues AS (
    SELECT
      u.property_id,
      COALESCE(SUM(u.rent_amount), 0) AS potential_revenue
    FROM units u
    JOIN owner_properties op ON op.id = u.property_id
    GROUP BY u.property_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'property_name', op.name,
        'property_id', op.id,
        'total_units', COALESCE(uc.total_units, 0),
        'occupied_units', COALESCE(uc.occupied_units, 0),
        'vacant_units', COALESCE(uc.vacant_units, 0),
        'occupancy_rate', CASE
          WHEN COALESCE(uc.total_units, 0) > 0
          THEN ROUND((uc.occupied_units::numeric / uc.total_units::numeric) * 100, 2)
          ELSE 0
        END,
        'annual_revenue', COALESCE(lr.monthly_revenue, 0) * 12,
        'monthly_revenue', COALESCE(lr.monthly_revenue, 0),
        'potential_revenue', COALESCE(pr.potential_revenue, 0)
      ) ORDER BY op.name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM owner_properties op
  LEFT JOIN unit_counts uc ON uc.property_id = op.id
  LEFT JOIN lease_revenues lr ON lr.property_id = op.id
  LEFT JOIN potential_revenues pr ON pr.property_id = op.id;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_property_performance_trends(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_current_month_start date;
  v_previous_month_start date;
  v_previous_month_end date;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  v_current_month_start := date_trunc('month', CURRENT_DATE)::date;
  v_previous_month_start := (v_current_month_start - interval '1 month')::date;
  v_previous_month_end := (v_current_month_start - interval '1 day')::date;

  WITH
  owner_properties AS (
    SELECT p.id, p.name
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  ),
  current_payments AS (
    SELECT
      p.id AS property_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM owner_properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_current_month_start
    GROUP BY p.id
  ),
  previous_payments AS (
    SELECT
      p.id AS property_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM owner_properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_previous_month_start
      AND rp.paid_date <= v_previous_month_end
    GROUP BY p.id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'property_id', op.id,
        'current_month_revenue', COALESCE(cp.revenue, 0),
        'previous_month_revenue', COALESCE(pp.revenue, 0),
        'trend', CASE
          WHEN COALESCE(cp.revenue, 0) > COALESCE(pp.revenue, 0) THEN 'up'
          WHEN COALESCE(cp.revenue, 0) < COALESCE(pp.revenue, 0) THEN 'down'
          ELSE 'stable'
        END,
        'trend_percentage', CASE
          WHEN COALESCE(pp.revenue, 0) > 0
          THEN ROUND(((COALESCE(cp.revenue, 0) - pp.revenue)::numeric / pp.revenue::numeric) * 100, 2)
          WHEN COALESCE(cp.revenue, 0) > 0 THEN 100.00
          ELSE 0.00
        END
      ) ORDER BY op.name
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM owner_properties op
  LEFT JOIN current_payments cp ON cp.property_id = op.id
  LEFT JOIN previous_payments pp ON pp.property_id = op.id;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_property_performance_with_trends(p_user_id uuid, p_timeframe text DEFAULT '30d'::text, p_limit integer DEFAULT 100)
 RETURNS TABLE(property_id uuid, property_name text, occupancy_rate numeric, total_revenue bigint, previous_revenue bigint, trend_percentage numeric, timeframe text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_days integer;
  v_start_date date;
  v_prev_start_date date;
  v_prev_end_date date;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  v_days := CASE p_timeframe
    WHEN '7d' THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN '180d' THEN 180
    WHEN '365d' THEN 365
    ELSE 30
  END;

  v_start_date := CURRENT_DATE - v_days;
  v_prev_end_date := v_start_date - interval '1 day';
  v_prev_start_date := v_prev_end_date - v_days;

  RETURN QUERY
  WITH
  owner_properties AS (
    SELECT p.id AS prop_id, p.name AS prop_name
    FROM properties p
    WHERE p.owner_user_id = p_user_id
  ),
  property_occupancy AS (
    SELECT
      op.prop_id,
      op.prop_name,
      COALESCE(
        ROUND(
          (COUNT(*) FILTER (WHERE u.status = 'occupied')::numeric /
           NULLIF(COUNT(*)::numeric, 0)) * 100,
          2
        ),
        0
      ) AS occ_rate
    FROM owner_properties op
    LEFT JOIN units u ON u.property_id = op.prop_id
    GROUP BY op.prop_id, op.prop_name
  ),
  current_revenue AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_start_date
    WHERE p.owner_user_id = p_user_id
    GROUP BY p.id
  ),
  previous_revenue AS (
    SELECT
      p.id AS prop_id,
      COALESCE(SUM(rp.amount), 0)::bigint AS revenue
    FROM properties p
    LEFT JOIN units u ON u.property_id = p.id
    LEFT JOIN leases l ON l.unit_id = u.id
    LEFT JOIN rent_payments rp ON
      rp.lease_id = l.id
      AND rp.status = 'succeeded'
      AND rp.paid_date >= v_prev_start_date
      AND rp.paid_date < v_start_date
    WHERE p.owner_user_id = p_user_id
    GROUP BY p.id
  )
  SELECT
    po.prop_id AS property_id,
    po.prop_name AS property_name,
    po.occ_rate AS occupancy_rate,
    COALESCE(cr.revenue, 0) AS total_revenue,
    COALESCE(pr.revenue, 0) AS previous_revenue,
    CASE
      WHEN COALESCE(pr.revenue, 0) > 0
      THEN ROUND(((COALESCE(cr.revenue, 0) - pr.revenue)::numeric / pr.revenue::numeric) * 100, 2)
      WHEN COALESCE(cr.revenue, 0) > 0 THEN 100.00
      ELSE 0.00
    END AS trend_percentage,
    p_timeframe AS timeframe
  FROM property_occupancy po
  LEFT JOIN current_revenue cr ON cr.prop_id = po.prop_id
  LEFT JOIN previous_revenue pr ON pr.prop_id = po.prop_id
  ORDER BY po.prop_name
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_revenue_trends_optimized(p_user_id uuid, p_months integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  WITH
  months AS (
    SELECT
      (current_date - (gs || ' months')::interval)::date AS month_start,
      ((current_date - (gs || ' months')::interval) + interval '1 month' - interval '1 day')::date AS month_end
    FROM generate_series(0, p_months - 1) gs
  ),
  monthly_expected AS (
    SELECT
      m.month_start,
      coalesce(sum(l.rent_amount), 0)::bigint AS expected_revenue
    FROM months m
    LEFT JOIN leases l ON
      l.owner_user_id = p_user_id
      AND l.lease_status IN ('active', 'ended')
      AND l.start_date <= m.month_end
      AND (l.end_date IS NULL OR l.end_date >= m.month_start)
    GROUP BY m.month_start
  ),
  monthly_collections AS (
    SELECT
      m.month_start,
      coalesce(sum(rp.amount), 0)::bigint AS collected
    FROM months m
    LEFT JOIN rent_payments rp ON
      rp.status = 'succeeded'
      AND rp.paid_date >= m.month_start
      AND rp.paid_date < (m.month_start + interval '1 month')
    LEFT JOIN leases l ON l.id = rp.lease_id AND l.owner_user_id = p_user_id
    WHERE l.id IS NOT NULL
    GROUP BY m.month_start
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'month',       to_char(m.month_start, 'YYYY-MM'),
        'revenue',     coalesce(me.expected_revenue, 0),
        'collections', coalesce(mc.collected, 0),
        'outstanding', greatest(0, coalesce(me.expected_revenue, 0) - coalesce(mc.collected, 0))
      )
      ORDER BY m.month_start DESC
    ),
    '[]'::jsonb
  ) INTO v_result
  FROM months m
  LEFT JOIN monthly_expected me ON me.month_start = m.month_start
  LEFT JOIN monthly_collections mc ON mc.month_start = m.month_start;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_slow_rls_queries(min_avg_time_ms numeric DEFAULT 100)
 RETURNS TABLE(query_preview text, calls bigint, mean_time_ms numeric, max_time_ms numeric, total_time_ms numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    substring(query, 1, 100) as query_preview,
    calls,
    round(mean_exec_time::numeric, 2) as mean_time_ms,
    round(max_exec_time::numeric, 2) as max_time_ms,
    round(total_exec_time::numeric, 2) as total_time_ms
  FROM pg_stat_statements
  WHERE (query LIKE '%get_current_%' OR query LIKE '%auth.uid%')
    AND mean_exec_time >= min_avg_time_ms
  ORDER BY mean_exec_time DESC
  LIMIT 50;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_stripe_customer_by_user_id(p_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'stripe'
AS $function$
DECLARE
  v_customer_id text;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'stripe') THEN
    RETURN NULL;
  END IF;

  IF to_regclass('stripe.customers') IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_customer_id
  FROM stripe.customers
  WHERE (metadata->>'user_id')::uuid = p_user_id
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    SELECT c.id INTO v_customer_id
    FROM stripe.customers c
    INNER JOIN auth.users u ON u.id = p_user_id
    WHERE c.email = u.email
    LIMIT 1;
  END IF;

  RETURN v_customer_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_subscription_status(p_customer_id text)
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
;

CREATE OR REPLACE FUNCTION public.get_tenant_lease_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT DISTINCT lt.lease_id
  FROM public.lease_tenants lt
  WHERE lt.tenant_id = public.get_current_tenant_id();
$function$
;

CREATE OR REPLACE FUNCTION public.get_tenant_property_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT DISTINCT u.property_id
  FROM public.lease_tenants lt
  JOIN public.leases l ON l.id = lt.lease_id
  JOIN public.units u ON u.id = l.unit_id
  WHERE lt.tenant_id = public.get_current_tenant_id();
$function$
;

CREATE OR REPLACE FUNCTION public.get_tenants_by_owner(p_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  -- only returns results if the caller is the same user requesting their own data
  -- auth.uid() returns the authenticated user's id from the jwt
  select distinct t.id
  from tenants t
  inner join lease_tenants lt on lt.tenant_id = t.id
  inner join leases l on l.id = lt.lease_id
  inner join units u on u.id = l.unit_id
  inner join properties p on p.id = u.property_id
  where p.owner_user_id = p_user_id
    and p_user_id = (select auth.uid());  -- authorization: only allow querying your own data
$function$
;

CREATE OR REPLACE FUNCTION public.get_tenants_with_lease_by_owner(p_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select distinct t.id
  from tenants t
  inner join lease_tenants lt on lt.tenant_id = t.id
  inner join leases l on l.id = lt.lease_id
  inner join units u on u.id = l.unit_id
  inner join properties p on p.id = u.property_id
  where p.owner_user_id = p_user_id
    and p_user_id = (select auth.uid())  -- Authorization: only allow querying your own data
    and l.lease_status = 'active';
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_dashboard_activities(p_user_id text, p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
 RETURNS TABLE(id text, title text, description text, activity_type text, entity_type text, entity_id text, user_id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY: Verify caller owns the requested data (text param, cast for comparison)
  IF p_user_id != (SELECT auth.uid())::text THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  RETURN QUERY
  SELECT
    a.id::text,
    a.title,
    a.description,
    a.activity_type,
    a.entity_type,
    a.entity_id::text,
    a.user_id::text,
    a.created_at
  FROM activity a
  WHERE a.user_id = p_user_id::uuid
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_id_by_stripe_customer(p_stripe_customer_id text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid;
  v_customer_email text;
begin
  -- Check if stripe schema exists
  if not exists (select 1 from pg_namespace where nspname = 'stripe') then
    return null;
  end if;

  -- Check if customers table exists
  if to_regclass('stripe.customers') is null then
    return null;
  end if;

  -- First try to get user_id from metadata
  select (metadata->>'user_id')::uuid into v_user_id
  from stripe.customers
  where id = p_stripe_customer_id;

  if v_user_id is not null then
    return v_user_id;
  end if;

  -- Fall back to email matching
  select email into v_customer_email
  from stripe.customers
  where id = p_stripe_customer_id;

  if v_customer_email is not null then
    select id into v_user_id
    from auth.users
    where email = lower(v_customer_email)
    limit 1;
  end if;

  return v_user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_invoices(p_limit integer DEFAULT 50)
 RETURNS TABLE(invoice_id text, amount_due numeric, amount_paid numeric, status text, created_at timestamp with time zone, invoice_pdf text, hosted_invoice_url text, customer_email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_stripe_customer_id text;
BEGIN
  -- Guard: caller must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the user's stripe_customer_id
  SELECT u.stripe_customer_id INTO v_stripe_customer_id
  FROM public.users u
  WHERE u.id = v_user_id;

  IF v_stripe_customer_id IS NULL THEN
    RETURN; -- No Stripe customer, return empty set
  END IF;

  -- Query stripe.invoices for this customer
  -- Amounts in stripe.invoices are in cents (bigint) — convert to dollars
  -- Dates are Unix timestamps (integer) — convert to timestamptz
  RETURN QUERY
  SELECT
    i.id AS invoice_id,
    (i.amount_due / 100.0)::numeric AS amount_due,
    (i.amount_paid / 100.0)::numeric AS amount_paid,
    i.status::text AS status,
    to_timestamp(i.created)::timestamptz AS created_at,
    i.invoice_pdf,
    i.hosted_invoice_url,
    i.customer_email
  FROM stripe.invoices i
  WHERE i.customer = v_stripe_customer_id
  ORDER BY i.created DESC
  LIMIT GREATEST(1, LEAST(p_limit, 100));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_plan_limits(p_user_id uuid)
 RETURNS TABLE(properties_limit integer, units_limit integer, is_admin boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plan         text;
  v_admin        boolean;
  v_props_limit  integer;
  v_units_limit  integer;
BEGIN
  SELECT u.subscription_plan, u.is_admin
    INTO v_plan, v_admin
  FROM public.users u
  WHERE u.id = p_user_id;

  v_plan := LOWER(COALESCE(v_plan, ''));

  CASE
    WHEN v_plan = 'starter'
      OR v_plan = 'price_1tvtaap3wcr53sdoymuzn7vf'
      OR v_plan = 'price_1tvtaep3wcr53sdo7pbg6bcw' THEN
      v_props_limit := 5;
      v_units_limit := 25;
    WHEN v_plan = 'growth'
      OR v_plan = 'price_1tvtaip3wcr53sdoqnue1inv'
      OR v_plan = 'price_1tvtamp3wcr53sdon4kufrvn' THEN
      v_props_limit := 20;
      v_units_limit := 100;
    WHEN v_plan = 'max'
      OR v_plan = 'tenantflow_max'
      OR v_plan = 'price_1tvtaqp3wcr53sdo22vayfhp'
      OR v_plan = 'price_1tvtaup3wcr53sdo5mnmsamf' THEN
      v_props_limit := -1;
      v_units_limit := -1;
    ELSE
      v_props_limit := 1;
      v_units_limit := 5;
  END CASE;

  RETURN QUERY SELECT v_props_limit, v_units_limit, COALESCE(v_admin, false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_result jsonb;
begin
  if p_user_id != (select auth.uid()) then
    raise exception 'Access denied: cannot request data for another user';
  end if;

  select jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'first_name', u.first_name,
    'last_name', u.last_name,
    'full_name', u.full_name,
    'phone', u.phone,
    'avatar_url', u.avatar_url,
    'is_admin', u.is_admin,
    'status', u.status,
    'created_at', u.created_at,
    'updated_at', u.updated_at,
    'owner_profile', jsonb_build_object(
      'stripe_connected', false,
      'properties_count', (
        select count(*) from public.properties pr
        where pr.owner_user_id = p_user_id
      ),
      'units_count', (
        select count(*) from public.units un
        join public.properties pr on pr.id = un.property_id
        where pr.owner_user_id = p_user_id
      )
    )
  ) into v_result
  from public.users u
  where u.id = p_user_id;

  return v_result;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_sessions(p_user_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, user_agent text, ip inet)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'auth', 'public'
AS $function$
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.created_at,
    s.updated_at,
    s.user_agent,
    s.ip
  FROM auth.sessions s
  WHERE s.user_id = p_user_id
  ORDER BY s.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.guard_user_self_update()
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
;

CREATE OR REPLACE FUNCTION public.handle_new_user_seed_categories()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
    perform public.seed_default_document_categories(NEW.id);
    return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_property_image_upload()
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
;

CREATE OR REPLACE FUNCTION public.health_check()
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object('ok', true, 'timestamp', NOW());
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (select is_admin from public.users where id = auth.uid()),
    false
  )
$function$
;

-- ledger_aggregation() intentionally OMITTED from baseline.
-- The function was LANGUAGE sql with a static reference to public.rent_payments,
-- which was CASCADE-dropped in 20260418183608_demolish_rent_and_tenant_portal.
-- Postgres tolerated the orphaned function in pg_catalog post-drop, but eager
-- body validation on chain-replay (`check_function_bodies = on`) fails on the
-- missing relation. Dropped from prod via MCP in this same commit cycle.
-- Issue #749.

CREATE OR REPLACE FUNCTION public.link_stripe_customer_to_user(p_stripe_customer_id text, p_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid;
  v_current_metadata jsonb;
begin
  -- Check if stripe schema exists
  if not exists (select 1 from pg_namespace where nspname = 'stripe') then
    return null;
  end if;

  -- Check if customers table exists
  if to_regclass('stripe.customers') is null then
    return null;
  end if;

  -- Find the user by email
  select id into v_user_id
  from auth.users
  where email = lower(p_email)
  limit 1;

  if v_user_id is null then
    return null;
  end if;

  -- Get current metadata
  select metadata into v_current_metadata
  from stripe.customers
  where id = p_stripe_customer_id;

  -- Update the customer's metadata with user_id
  update stripe.customers
  set metadata = coalesce(v_current_metadata, '{}'::jsonb) || jsonb_build_object('user_id', v_user_id::text)
  where id = p_stripe_customer_id;

  return v_user_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.log_lease_signature_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log owner signature
  IF NEW.owner_signed_at IS NOT NULL AND (OLD IS NULL OR OLD.owner_signed_at IS NULL) THEN
    INSERT INTO activity (user_id, activity_type, entity_type, entity_id, description, created_at)
    VALUES (
      NEW.owner_user_id,
      'lease_signed',
      'lease',
      NEW.id,
      'Owner signed lease agreement',
      NOW()
    );
  END IF;

  -- Log tenant signature
  IF NEW.tenant_signed_at IS NOT NULL AND (OLD IS NULL OR OLD.tenant_signed_at IS NULL) THEN
    INSERT INTO activity (user_id, activity_type, entity_type, entity_id, description, created_at)
    SELECT
      t.user_id,
      'lease_signed',
      'lease',
      NEW.id,
      'Tenant signed lease agreement',
      NOW()
    FROM tenants t
    WHERE t.id = NEW.primary_tenant_id;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event_lease_signed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Fires on the canonical activation transition. Source path is irrelevant —
  -- whether activation came from the docuseal-webhook, sign_lease_and_check_activation,
  -- or activate_lease_with_pending_subscription, this captures it once.
  IF NEW.lease_status = 'active'
     AND OLD.lease_status IS DISTINCT FROM 'active' THEN
    INSERT INTO public.security_events (
      event_type, severity, user_id, message, resource_type, resource_id, metadata
    )
    VALUES (
      'lease.signed',
      'info',
      NEW.owner_user_id,
      'Lease activated (all parties signed)',
      'lease',
      NEW.id,
      jsonb_build_object(
        'unit_id',                   NEW.unit_id,
        'previous_status',           OLD.lease_status,
        'docuseal_submission_id',    NEW.docuseal_submission_id,
        'has_signed_document_url',   NEW.docuseal_document_url IS NOT NULL
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event_property_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.security_events (
    event_type, severity, user_id, message, resource_type, resource_id, metadata
  )
  VALUES (
    'property.created',
    'info',
    NEW.owner_user_id,
    'Property created',
    'property',
    NEW.id,
    jsonb_build_object(
      'name',          NEW.name,
      'property_type', NEW.property_type,
      'address_line1', NEW.address_line1,
      'city',          NEW.city,
      'state',         NEW.state
    )
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event_property_deleted()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'inactive' AND OLD.status IS DISTINCT FROM 'inactive' THEN
    INSERT INTO public.security_events (
      event_type, severity, user_id, message, resource_type, resource_id, metadata
    )
    VALUES (
      'property.deleted',
      'warning',
      NEW.owner_user_id,
      'Property soft-deleted',
      'property',
      NEW.id,
      jsonb_build_object(
        'name',            NEW.name,
        'previous_status', OLD.status
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_security_event_user_anonymized()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- All four conditions must hold, AND-style:
  --   (a) status flipped to inactive (set by anonymize_deleted_user)
  --   (b) full_name rewritten to the anonymization sentinel
  --   (c) email rewritten to the anonymization prefix
  --   (d) row was not already anonymized (avoid duplicate events on
  --       repeated UPDATEs of the same anonymized row)
  IF NEW.status = 'inactive'
     AND OLD.status IS DISTINCT FROM 'inactive'
     AND NEW.full_name = '[deleted user]'
     AND NEW.email LIKE '[deleted-%'
     AND COALESCE(OLD.full_name, '') <> '[deleted user]' THEN
    INSERT INTO public.security_events (
      event_type, severity, user_id, message, resource_type, resource_id, metadata
    )
    VALUES (
      'user.deleted',
      'critical',
      NEW.id,
      'User account anonymized (GDPR)',
      'user',
      NEW.id,
      jsonb_build_object(
        'deletion_requested_at', OLD.deletion_requested_at,
        'anonymized_at',         NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.log_user_error(p_error_type text, p_error_code text DEFAULT NULL::text, p_error_message text DEFAULT NULL::text, p_error_stack text DEFAULT NULL::text, p_context jsonb DEFAULT '{}'::jsonb, p_user_agent text DEFAULT NULL::text, p_ip_address inet DEFAULT NULL::inet)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  error_id uuid;
  recent_error_count integer;
BEGIN
  -- SEC-12: Rate limit to prevent fake alert flooding (10 per minute per user)
  SELECT count(*) INTO recent_error_count
  FROM public.user_errors
  WHERE user_id = (SELECT auth.uid())
    AND created_at > now() - interval '1 minute';

  IF recent_error_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded: too many errors logged';
  END IF;

  INSERT INTO public.user_errors (
    user_id,
    error_type,
    error_code,
    error_message,
    error_stack,
    context,
    user_agent,
    ip_address
  ) VALUES (
    auth.uid(),
    p_error_type,
    p_error_code,
    COALESCE(p_error_message, 'Unknown error'),
    p_error_stack,
    p_context,
    p_user_agent,
    p_ip_address
  ) RETURNING id INTO error_id;

  RETURN error_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_critical_error()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  recent_count     integer;
  v_webhook_url    text;
  v_webhook_secret text;
  v_payload        jsonb;
  v_admin_emails   text[];
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.user_errors
  WHERE error_message = NEW.error_message
    AND created_at >= NOW() - INTERVAL '5 minutes';

  IF NEW.error_type = 'authorization' OR recent_count > 10 THEN
    v_payload := jsonb_build_object(
      'error_id',      NEW.id,
      'user_id',       NEW.user_id,
      'error_type',    NEW.error_type,
      'error_message', NEW.error_message,
      'error_count',   recent_count,
      'created_at',    NEW.created_at
    );

    PERFORM pg_notify('critical_error', v_payload::text);

    SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.critical_error_url';
    SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

    IF v_webhook_url IS NOT NULL AND v_webhook_url <> ''
       AND v_webhook_secret IS NOT NULL AND v_webhook_secret <> '' THEN
      -- Critical errors fan out to every active admin.
      SELECT array_agg(email) INTO v_admin_emails
      FROM public.users
      WHERE is_admin = true
        AND status <> 'inactive'
        AND email IS NOT NULL;

      PERFORM net.http_post(
        url     := v_webhook_url,
        body    := jsonb_build_object(
          'type',         'critical_error',
          'table',        'user_errors',
          'admin_emails', COALESCE(v_admin_emails, ARRAY[]::text[]),
          'record',       v_payload
        ),
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || v_webhook_secret
        ),
        timeout_milliseconds := 5000
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_n8n_lease_reminder()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_webhook_url    text;
  v_webhook_secret text;
  v_owner_id       uuid;
  v_owner_email    text;
  v_owner_name     text;
BEGIN
  SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.lease_reminder_url';
  SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  IF v_webhook_url IS NULL OR v_webhook_url = ''
     OR v_webhook_secret IS NULL OR v_webhook_secret = '' THEN
    RETURN NEW;
  END IF;

  SELECT owner_user_id INTO v_owner_id FROM public.leases WHERE id = NEW.lease_id;

  IF v_owner_id IS NOT NULL THEN
    SELECT email, full_name INTO v_owner_email, v_owner_name
    FROM public.users WHERE id = v_owner_id;
  END IF;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',          'INSERT',
      'table',         'lease_reminders',
      'owner_email',   v_owner_email,
      'owner_name',    v_owner_name,
      'owner_user_id', v_owner_id,
      'record',        row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_webhook_secret
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_n8n_maintenance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_webhook_url    text;
  v_webhook_secret text;
  v_event_type     text;
  v_owner_email    text;
  v_owner_name     text;
BEGIN
  SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.maintenance_url';
  SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  IF v_webhook_url IS NULL OR v_webhook_url = ''
     OR v_webhook_secret IS NULL OR v_webhook_secret = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_event_type := TG_OP;

  SELECT email, full_name INTO v_owner_email, v_owner_name
  FROM public.users WHERE id = NEW.owner_user_id;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',         v_event_type,
      'table',        'maintenance_requests',
      'owner_email',  v_owner_email,
      'owner_name',   v_owner_name,
      'record',       row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_webhook_secret
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_n8n_payment_reminder()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_webhook_url    text;
  v_webhook_secret text;
  v_owner_id       uuid;
  v_owner_email    text;
  v_owner_name     text;
BEGIN
  SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.payment_reminder_url';
  SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  IF v_webhook_url IS NULL OR v_webhook_url = ''
     OR v_webhook_secret IS NULL OR v_webhook_secret = '' THEN
    RETURN NEW;
  END IF;

  -- payment_reminders -> rent_payments -> leases -> owner_user_id
  SELECT l.owner_user_id INTO v_owner_id
  FROM public.rent_payments rp
  JOIN public.leases l ON l.id = rp.lease_id
  WHERE rp.id = NEW.rent_payment_id;

  IF v_owner_id IS NOT NULL THEN
    SELECT email, full_name INTO v_owner_email, v_owner_name
    FROM public.users WHERE id = v_owner_id;
  END IF;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',          'INSERT',
      'table',         'payment_reminders',
      'owner_email',   v_owner_email,
      'owner_name',    v_owner_name,
      'owner_user_id', v_owner_id,
      'record',        row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_webhook_secret
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_n8n_rent_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_webhook_url    text;
  v_webhook_secret text;
  v_owner_id       uuid;
  v_owner_email    text;
  v_owner_name     text;
BEGIN
  SELECT value INTO v_webhook_url    FROM public.app_config WHERE key = 'n8n.webhook.rent_payment_url';
  SELECT value INTO v_webhook_secret FROM public.app_config WHERE key = 'n8n.webhook.secret';

  IF v_webhook_url IS NULL OR v_webhook_url = ''
     OR v_webhook_secret IS NULL OR v_webhook_secret = '' THEN
    RETURN NEW;
  END IF;

  SELECT owner_user_id INTO v_owner_id FROM public.leases WHERE id = NEW.lease_id;

  IF v_owner_id IS NOT NULL THEN
    SELECT email, full_name INTO v_owner_email, v_owner_name
    FROM public.users WHERE id = v_owner_id;
  END IF;

  PERFORM net.http_post(
    url     := v_webhook_url,
    body    := jsonb_build_object(
      'type',          'INSERT',
      'table',         'rent_payments',
      'owner_email',   v_owner_email,
      'owner_name',    v_owner_name,
      'owner_user_id', v_owner_id,
      'record',        row_to_json(NEW)::jsonb
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_webhook_secret
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_account_deletions()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user record;
  v_processed integer := 0;
  v_failed integer := 0;
begin
  for v_user in
    select id
    from public.users
    where deletion_requested_at is not null
      and deletion_requested_at < now() - interval '30 days'
      and status != 'inactive'
    for update skip locked
  loop
    begin
      perform public.anonymize_deleted_user(v_user.id);
      v_processed := v_processed + 1;
    exception when others then
      -- log failure but continue processing other users
      raise warning 'process_account_deletions: failed to anonymize user %: %', v_user.id, sqlerrm;
      v_failed := v_failed + 1;
    end;
  end loop;

  raise notice 'process_account_deletions: processed %, failed %', v_processed, v_failed;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.process_payment_intent_failed(p_rent_payment_id uuid, p_payment_intent_id text, p_amount integer, p_failure_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Update rent_payments status to failed
  update rent_payments
  set
    status = 'failed',
    updated_at = now()
  where id = p_rent_payment_id;

  -- Insert payment transaction record (idempotent via ON CONFLICT)
  -- Uses existing unique constraint: payment_transactions_unique_payment_status
  insert into payment_transactions (
    rent_payment_id,
    stripe_payment_intent_id,
    status,
    amount,
    failure_reason,
    attempted_at
  ) values (
    p_rent_payment_id,
    p_payment_intent_id,
    'failed',
    p_amount,
    p_failure_reason,
    now()
  )
  on conflict (rent_payment_id, stripe_payment_intent_id, status) do nothing;

  -- If any operation fails, entire transaction rolls back automatically (implicit in plpgsql)
end;
$function$
;

CREATE OR REPLACE FUNCTION public.process_subscription_status_change(p_subscription_id text, p_new_status text, p_subscription_failure_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lease_id uuid;
begin
  -- Find lease by subscription ID
  select id into v_lease_id
  from leases
  where stripe_subscription_id = p_subscription_id;

  -- If not found, exit silently (webhook may arrive before lease exists)
  if v_lease_id is null then
    return;
  end if;

  -- Update lease status
  update leases
  set
    lease_status = p_new_status,
    subscription_failure_reason = p_subscription_failure_reason,
    updated_at = now()
  where id = v_lease_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.queue_lease_reminders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lease record;
  v_days_until_expiry integer;
begin
  for v_lease in
    select id, end_date
    from public.leases
    where
      lease_status = 'active'
      and end_date >= current_date
      and end_date <= (current_date + interval '30 days')
  loop
    v_days_until_expiry := v_lease.end_date - current_date;

    -- check each threshold independently so multiple reminders can be queued
    -- if more than one threshold matches in the same function run

    -- 30-day reminder: queue when lease expires in exactly 30 days
    if v_days_until_expiry = 30 then
      insert into public.lease_reminders (lease_id, reminder_type)
      values (v_lease.id, '30_days')
      on conflict (lease_id, reminder_type) do nothing;
    end if;

    -- 7-day reminder: queue when lease expires in exactly 7 days
    if v_days_until_expiry = 7 then
      insert into public.lease_reminders (lease_id, reminder_type)
      values (v_lease.id, '7_days')
      on conflict (lease_id, reminder_type) do nothing;
    end if;

    -- 1-day reminder: queue when lease expires in exactly 1 day
    if v_days_until_expiry = 1 then
      insert into public.lease_reminders (lease_id, reminder_type)
      values (v_lease.id, '1_day')
      on conflict (lease_id, reminder_type) do nothing;
    end if;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reassign_document_category(p_from_id uuid, p_to_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_owner_id uuid := auth.uid();
    v_from_slug text;
    v_to_slug text;
    v_is_default boolean;
begin
    if v_owner_id is null then
        raise exception 'Not authenticated' using errcode = '42501';
    end if;
    if p_from_id is null or p_to_id is null then
        raise exception 'p_from_id and p_to_id are required' using errcode = '22023';
    end if;
    if p_from_id = p_to_id then
        raise exception 'Cannot reassign a category to itself' using errcode = '22023';
    end if;

    -- Lock the source row.
    select slug, is_default into v_from_slug, v_is_default
    from public.document_categories
    where id = p_from_id and owner_user_id = v_owner_id
    for update;
    if v_from_slug is null then
        raise exception 'Source category not found or not owned by caller' using errcode = '42501';
    end if;
    if v_is_default then
        raise exception 'Default categories cannot be deleted' using errcode = '42501';
    end if;

    -- Lock the target too — without this lock a concurrent reassign
    -- could delete the target between this read and the mass-rewrite
    -- below, leaving the per-row validate_document_category trigger
    -- to reject every UPDATE with 23514 against a now-missing slug.
    select slug into v_to_slug
    from public.document_categories
    where id = p_to_id and owner_user_id = v_owner_id
    for update;
    if v_to_slug is null then
        raise exception 'Target category not found or not owned by caller' using errcode = '42501';
    end if;

    update public.documents
    set document_type = v_to_slug
    where owner_user_id = v_owner_id
      and document_type = v_from_slug;

    delete from public.document_categories
    where id = p_from_id and owner_user_id = v_owner_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reorder_document_categories(p_orders jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_owner_id uuid := auth.uid();
    v_count int;
begin
    if v_owner_id is null then
        raise exception 'Not authenticated' using errcode = '42501';
    end if;
    if p_orders is null or jsonb_typeof(p_orders) <> 'array' then
        raise exception 'p_orders must be a JSON array of {id, sort_order}' using errcode = '22023';
    end if;

    -- Per-element shape validation. Each entry must carry a non-null
    -- string id (UUID format enforced by the JSONB cast inside the
    -- ownership join below) AND a numeric sort_order. Catching this
    -- here surfaces a clear 22023 to callers instead of a generic
    -- cast/null-violation 500 leaking out of the UPDATE.
    if exists (
        select 1
        from jsonb_array_elements(p_orders) e
        where (e->>'id') is null
           or (e->>'sort_order') is null
           or jsonb_typeof(e->'sort_order') <> 'number'
    ) then
        raise exception 'Each entry must have id (uuid) and sort_order (number)' using errcode = '22023';
    end if;

    select count(*) into v_count
    from jsonb_array_elements(p_orders) e
    join public.document_categories c
      on c.id = (e->>'id')::uuid
     and c.owner_user_id = v_owner_id;
    if v_count <> jsonb_array_length(p_orders) then
        raise exception 'One or more categories not found or not owned by caller' using errcode = '42501';
    end if;

    update public.document_categories c
    set sort_order = e.sort_order::int
    from jsonb_to_recordset(p_orders) as e(id uuid, sort_order int)
    where c.id = e.id and c.owner_user_id = v_owner_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.request_account_deletion()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  update public.users
  set deletion_requested_at = now()
  where id = v_user_id;

  if not found then
    raise exception 'user not found';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.require_stripe_schema()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return exists (
    select 1 from pg_namespace where nspname = 'stripe'
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.revoke_user_session(p_user_id uuid, p_session_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'auth', 'public'
AS $function$
DECLARE
  v_session_user_id uuid;
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  SELECT s.user_id INTO v_session_user_id
  FROM auth.sessions s
  WHERE s.id = p_session_id;

  IF v_session_user_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_session_user_id != p_user_id THEN
    RAISE EXCEPTION 'Access denied: session belongs to another user';
  END IF;

  DELETE FROM auth.sessions
  WHERE id = p_session_id
    AND user_id = p_user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_documents(p_query text DEFAULT NULL::text, p_entity_type text DEFAULT NULL::text, p_categories text[] DEFAULT NULL::text[], p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, entity_type text, entity_id uuid, document_type text, mime_type text, file_path text, storage_url text, file_size integer, title text, tags text[], description text, owner_user_id uuid, created_at timestamp with time zone, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner_id uuid := auth.uid();
  v_ts_query tsquery;
  v_has_query boolean;
  v_total bigint;
begin
  if v_owner_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 200 then
    raise exception 'Limit must be between 1 and 200';
  end if;

  if p_offset is null or p_offset < 0 then
    raise exception 'Offset must be >= 0';
  end if;

  -- Date bounds sanity check — caller-supplied from > to is meaningless;
  -- raise rather than silently returning zero rows so the UI surfaces it.
  if p_from is not null and p_to is not null and p_from > p_to then
    raise exception 'p_from must be <= p_to';
  end if;

  v_has_query := p_query is not null and length(trim(p_query)) > 0;
  if v_has_query then
    v_ts_query := plainto_tsquery('english', p_query);
  end if;

  -- Count the full matching set before applying limit/offset.
  -- Empty p_categories array is treated as "no category filter" (same
  -- semantics as null) so the UI can pass [] without surprises.
  select count(*) into v_total
  from public.documents d
  where d.owner_user_id = v_owner_id
    and (p_entity_type is null or d.entity_type = p_entity_type)
    and (
      p_categories is null
      or array_length(p_categories, 1) is null
      or d.document_type = any(p_categories)
    )
    and (p_from is null or d.created_at >= p_from)
    and (p_to is null or d.created_at <= p_to)
    and (not v_has_query or d.search_vector @@ v_ts_query);

  return query
  select
    d.id, d.entity_type, d.entity_id, d.document_type, d.mime_type,
    d.file_path, d.storage_url, d.file_size, d.title, d.tags,
    d.description, d.owner_user_id, d.created_at, v_total as total_count
  from public.documents d
  where d.owner_user_id = v_owner_id
    and (p_entity_type is null or d.entity_type = p_entity_type)
    and (
      p_categories is null
      or array_length(p_categories, 1) is null
      or d.document_type = any(p_categories)
    )
    and (p_from is null or d.created_at >= p_from)
    and (p_to is null or d.created_at <= p_to)
    and (not v_has_query or d.search_vector @@ v_ts_query)
  order by
    case when v_has_query then ts_rank(d.search_vector, v_ts_query) else 0 end desc,
    d.created_at desc
  limit p_limit
  offset p_offset;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.search_properties(p_user_id uuid, p_search_term text, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, name text, address_line1 text, city text, state text, rank real)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- SECURITY: Verify caller owns the requested data
  IF p_user_id != (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: cannot request data for another user';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.address_line1,
    p.city,
    p.state,
    ts_rank(p.search_vector, plainto_tsquery('english', p_search_term)) AS rank
  FROM properties p
  WHERE p.owner_user_id = p_user_id
    AND p.search_vector @@ plainto_tsquery('english', p_search_term)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.seed_default_document_categories(p_owner_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
    insert into public.document_categories (owner_user_id, slug, label, sort_order, is_default)
    values
        (p_owner_user_id, 'lease', 'Lease', 10, true),
        (p_owner_user_id, 'receipt', 'Receipt', 20, true),
        (p_owner_user_id, 'tax_return', 'Tax return', 30, true),
        (p_owner_user_id, 'inspection_report', 'Inspection report', 40, true),
        (p_owner_user_id, 'maintenance_invoice', 'Maintenance invoice', 50, true),
        (p_owner_user_id, 'insurance', 'Insurance', 60, true),
        (p_owner_user_id, 'other', 'Other', 70, true)
    on conflict (owner_user_id, slug) do nothing;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_trial_on_signup()
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
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
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
;

CREATE OR REPLACE FUNCTION public.set_updated_at_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return NEW;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sign_lease_and_check_activation(p_lease_id uuid, p_signer_type text, p_signature_ip text, p_signed_at timestamp with time zone, p_signature_method text DEFAULT 'in_app'::text)
 RETURNS TABLE(success boolean, both_signed boolean, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_lease record;
begin
  -- Step 1: Lock the lease row to prevent concurrent modifications
  select
    id,
    lease_status,
    owner_signed_at,
    tenant_signed_at
  into v_lease
  from public.leases
  where id = p_lease_id
  for update;

  -- Step 2: Validate lease exists
  if v_lease.id is null then
    return query select false, false, 'Lease not found'::text;
    return;
  end if;

  -- Step 3: Validate lease status
  if p_signer_type = 'tenant' and v_lease.lease_status != 'pending_signature' then
    return query select false, false, 'Lease must be pending signature for tenant to sign'::text;
    return;
  end if;

  if p_signer_type = 'owner' and v_lease.lease_status not in ('draft', 'pending_signature') then
    return query select false, false, 'Lease cannot be signed in its current status'::text;
    return;
  end if;

  -- Step 4: Check if already signed (prevent double signing)
  if p_signer_type = 'owner' and v_lease.owner_signed_at is not null then
    return query select false, false, 'Owner has already signed this lease'::text;
    return;
  end if;

  if p_signer_type = 'tenant' and v_lease.tenant_signed_at is not null then
    return query select false, false, 'Tenant has already signed this lease'::text;
    return;
  end if;

  -- Step 5: Record the signature atomically
  if p_signer_type = 'owner' then
    update public.leases
    set
      owner_signed_at = p_signed_at,
      owner_signature_ip = p_signature_ip,
      owner_signature_method = p_signature_method
    where id = p_lease_id;

    -- Return whether both are now signed (tenant was already signed)
    return query select true, (v_lease.tenant_signed_at is not null), null::text;
  else
    update public.leases
    set
      tenant_signed_at = p_signed_at,
      tenant_signature_ip = p_signature_ip,
      tenant_signature_method = p_signature_method
    where id = p_lease_id;

    -- Return whether both are now signed (owner was already signed)
    return query select true, (v_lease.owner_signed_at is not null), null::text;
  end if;

  return;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_unit_status_from_lease()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- When lease becomes active, mark unit as occupied
  if new.lease_status = 'active' and (old is null or old.lease_status != 'active') then
    update public.units set status = 'occupied' where id = new.unit_id;
  end if;

  -- When lease ends or terminates, mark unit as available (if no other active lease)
  if new.lease_status in ('ended', 'terminated') and old.lease_status = 'active' then
    -- Check if there's another active lease for this unit
    if not exists (
      select 1 from public.leases
      where unit_id = new.unit_id
      and id != new.id
      and lease_status = 'active'
    ) then
      update public.units set status = 'available' where id = new.unit_id;
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_property_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  NEW.search_vector := to_tsvector('english',
    COALESCE(NEW.name, '') || ' ' ||
    COALESCE(NEW.address_line1, '') || ' ' ||
    COALESCE(NEW.address_line2, '') || ' ' ||
    COALESCE(NEW.city, '') || ' ' ||
    COALESCE(NEW.state, '') || ' ' ||
    COALESCE(NEW.postal_code, '')
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.upsert_rent_payment(p_lease_id uuid, p_tenant_id uuid, p_amount integer, p_currency text, p_status text, p_due_date text, p_paid_date text DEFAULT NULL::text, p_period_start text DEFAULT NULL::text, p_period_end text DEFAULT NULL::text, p_payment_method_type text DEFAULT NULL::text, p_stripe_payment_intent_id text DEFAULT NULL::text, p_application_fee_amount integer DEFAULT NULL::integer)
 RETURNS TABLE(id uuid, was_inserted boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_existing_id uuid;
  v_new_id uuid;
  v_was_inserted boolean;
begin
  -- Check if payment already exists by stripe_payment_intent_id (unique constraint)
  select rp.id into v_existing_id
  from rent_payments rp
  where rp.stripe_payment_intent_id = p_stripe_payment_intent_id;

  if v_existing_id is not null then
    -- Payment already exists, return existing ID
    id := v_existing_id;
    was_inserted := false;
    return next;
    return;
  end if;

  -- Insert new payment (no enum cast needed - column is now text)
  insert into rent_payments (
    lease_id,
    tenant_id,
    amount,
    currency,
    status,
    due_date,
    paid_date,
    period_start,
    period_end,
    payment_method_type,
    stripe_payment_intent_id,
    application_fee_amount
  ) values (
    p_lease_id,
    p_tenant_id,
    p_amount,
    p_currency,
    p_status,
    p_due_date::date,
    p_paid_date::timestamptz,
    p_period_start::date,
    p_period_end::date,
    p_payment_method_type,
    p_stripe_payment_intent_id,
    p_application_fee_amount
  )
  returning rent_payments.id into v_new_id;

  id := v_new_id;
  was_inserted := true;
  return next;

exception
  when unique_violation then
    -- Race condition: another process inserted the same payment
    -- Return the existing payment ID
    select rp.id into v_existing_id
    from rent_payments rp
    where rp.stripe_payment_intent_id = p_stripe_payment_intent_id;

    id := v_existing_id;
    was_inserted := false;
    return next;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.user_is_tenant()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  claim_text text;
BEGIN
  claim_text := NULLIF(auth.jwt() ->> 'tenant_id', '');

  IF claim_text IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Validate UUID format without raising
  PERFORM claim_text::uuid;
  RETURN TRUE;

EXCEPTION WHEN others THEN
  RETURN FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_blog_post()
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
    v_word_count := array_length(regexp_split_to_array(coalesce(NEW.content, ''), '\s+'), 1);
    IF v_word_count IS NULL OR v_word_count < 1200 OR v_word_count > 3000 THEN
      RAISE EXCEPTION 'word_count out of range: % (must be 1200..3000)', v_word_count
        USING ERRCODE = '23514';
    END IF;

    v_h2_count := coalesce(
      (SELECT count(*)::int FROM regexp_matches(coalesce(NEW.content, ''), '^## ', 'gn')),
      0
    );
    IF v_h2_count < 4 OR v_h2_count > 10 THEN
      RAISE EXCEPTION 'h2_count out of range: % (must be 4..10)', v_h2_count
        USING ERRCODE = '23514';
    END IF;

    IF position('landlord' in lower(coalesce(NEW.content, ''))) = 0 THEN
      RAISE EXCEPTION 'persona phrase missing: content must contain "landlord"'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.slug !~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$' OR length(NEW.slug) < 3 OR length(NEW.slug) > 120 THEN
      RAISE EXCEPTION 'slug pattern invalid: % (must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$, length 3..120)', NEW.slug
        USING ERRCODE = '23514';
    END IF;

    IF NEW.meta_description IS NULL OR length(NEW.meta_description) < 50 OR length(NEW.meta_description) > 160 THEN
      RAISE EXCEPTION 'meta_description length out of range: % (must be 50..160)',
        coalesce(length(NEW.meta_description)::text, 'NULL')
        USING ERRCODE = '23514';
    END IF;

    IF NEW.excerpt IS NULL OR length(NEW.excerpt) < 80 OR length(NEW.excerpt) > 200 THEN
      RAISE EXCEPTION 'excerpt length out of range: % (must be 80..200)',
        coalesce(length(NEW.excerpt)::text, 'NULL')
        USING ERRCODE = '23514';
    END IF;

    IF NEW.category IS NULL OR NOT (NEW.category = ANY(v_categories)) THEN
      RAISE EXCEPTION 'category not in enum: % (must be one of %)',
        coalesce(NEW.category, 'NULL'), array_to_string(v_categories, ', ')
        USING ERRCODE = '23514';
    END IF;

    FOREACH v_banned IN ARRAY v_banlist LOOP
      IF position(lower(v_banned) in lower(coalesce(NEW.content, ''))) > 0 THEN
        RAISE EXCEPTION 'banlist hit: % (Phase 4 banlist phrase found in content)', v_banned
          USING ERRCODE = '23514';
      END IF;
    END LOOP;

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
;

CREATE OR REPLACE FUNCTION public.validate_document_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
    if NEW.document_type is null or NEW.owner_user_id is null then
        return NEW;
    end if;
    if not exists (
        select 1 from public.document_categories
        where owner_user_id = NEW.owner_user_id
          and slug = NEW.document_type
    ) then
        raise exception 'document_type % is not a valid category for owner %', NEW.document_type, NEW.owner_user_id
            using
                errcode = '23514',
                detail = 'Slugs must be lowercase-snake_case (matching ^[a-z0-9_]+$, 1-50 chars) AND exist in document_categories for this owner. Add the category via Phase-66 settings, or use one of the seven seeded defaults.';
    end if;
    return NEW;
end;
$function$
;

-- ============================================================================
-- TRIGGERS (34 objects)
-- ============================================================================
CREATE TRIGGER trg_app_config_updated_at BEFORE UPDATE ON public.app_config FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER validate_blog_post_trigger BEFORE INSERT OR UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION validate_blog_post();
CREATE TRIGGER set_updated_at_document_categories BEFORE UPDATE ON public.document_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER documents_search_vector_trigger BEFORE INSERT OR UPDATE OF title, description, tags ON public.documents FOR EACH ROW EXECUTE FUNCTION documents_refresh_search_vector();
CREATE TRIGGER documents_validate_document_category BEFORE INSERT OR UPDATE OF document_type, owner_user_id ON public.documents FOR EACH ROW EXECUTE FUNCTION validate_document_category();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inspection_photos FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_inspection_rooms_updated_at BEFORE UPDATE ON public.inspection_rooms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_inspections_updated_at BEFORE UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_lease_reminders_notify_n8n AFTER INSERT ON public.lease_reminders FOR EACH ROW EXECUTE FUNCTION notify_n8n_lease_reminder();
CREATE TRIGGER sync_unit_status_on_lease_change AFTER INSERT OR UPDATE OF lease_status ON public.leases FOR EACH ROW EXECUTE FUNCTION sync_unit_status_from_lease();
CREATE TRIGGER trg_security_lease_signed AFTER UPDATE OF lease_status ON public.leases FOR EACH ROW EXECUTE FUNCTION log_security_event_lease_signed();
CREATE TRIGGER trg_maintenance_notify_n8n AFTER INSERT OR UPDATE ON public.maintenance_requests FOR EACH ROW EXECUTE FUNCTION notify_n8n_maintenance();
CREATE TRIGGER set_notification_settings_updated_at BEFORE UPDATE ON public.notification_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER properties_search_vector_trigger BEFORE INSERT OR UPDATE OF name, address_line1, address_line2, city, state, postal_code ON public.properties FOR EACH ROW EXECUTE FUNCTION update_property_search_vector();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_enforce_property_plan_limit BEFORE INSERT ON public.properties FOR EACH ROW EXECUTE FUNCTION enforce_property_plan_limit();
CREATE TRIGGER trg_funnel_first_property AFTER INSERT ON public.properties FOR EACH ROW EXECUTE FUNCTION fn_record_first_property_funnel_event();
CREATE TRIGGER trg_security_property_created AFTER INSERT ON public.properties FOR EACH ROW EXECUTE FUNCTION log_security_event_property_created();
CREATE TRIGGER trg_security_property_deleted AFTER UPDATE OF status ON public.properties FOR EACH ROW EXECUTE FUNCTION log_security_event_property_deleted();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.units FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_enforce_unit_plan_limit BEFORE INSERT ON public.units FOR EACH ROW EXECUTE FUNCTION enforce_unit_plan_limit();
CREATE TRIGGER critical_error_notification AFTER INSERT ON public.user_errors FOR EACH ROW EXECUTE FUNCTION notify_critical_error();
CREATE TRIGGER seed_default_categories_on_user_insert AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION handle_new_user_seed_categories();
CREATE TRIGGER trg_funnel_signup AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION fn_record_signup_funnel_event();
CREATE TRIGGER trg_security_user_anonymized AFTER UPDATE OF status, full_name, email ON public.users FOR EACH ROW EXECUTE FUNCTION log_security_event_user_anonymized();
CREATE TRIGGER trial_on_signup BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION set_trial_on_signup();
CREATE TRIGGER users_guard_self_update BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION guard_user_self_update();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe._managed_webhooks FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at_metadata();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe._sync_obj_runs FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at_metadata();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe._sync_runs FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at_metadata();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.accounts FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

-- ============================================================================
-- RLS ENABLE — MUST come before policies (54 objects)
-- ============================================================================
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_deliverability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_deliverability_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_request_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_internal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_events_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_errors_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tour_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (129 objects)
-- ============================================================================
CREATE POLICY activity_delete_own ON public.activity
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY activity_insert_own ON public.activity
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY activity_select_own ON public.activity
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY activity_update_own ON public.activity
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY blogs_delete_admin ON public.blogs
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (( SELECT is_admin() AS is_admin));

CREATE POLICY blogs_insert_admin ON public.blogs
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (( SELECT is_admin() AS is_admin));

CREATE POLICY blogs_select_published ON public.blogs
  AS PERMISSIVE
  FOR SELECT
  TO anon, authenticated
  USING ((status = 'published'::text));

CREATE POLICY blogs_update_admin ON public.blogs
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (( SELECT is_admin() AS is_admin))
  WITH CHECK (( SELECT is_admin() AS is_admin));

CREATE POLICY "owners delete own categories" ON public.document_categories
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "owners insert own categories" ON public.document_categories
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "owners select own categories" ON public.document_categories
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "owners update own categories" ON public.document_categories
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY documents_delete_owner ON public.documents
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY documents_insert_owner ON public.documents
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY documents_select ON public.documents
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY documents_update_owner ON public.documents
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY email_deliverability_admin_select ON public.email_deliverability
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (( SELECT is_admin() AS is_admin));

CREATE POLICY email_deliverability_archive_delete_service_role ON public.email_deliverability_archive
  AS PERMISSIVE
  FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY email_deliverability_archive_insert_service_role ON public.email_deliverability_archive
  AS PERMISSIVE
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY email_deliverability_archive_select_service_role ON public.email_deliverability_archive
  AS PERMISSIVE
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY expenses_delete_owner ON public.expenses
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((maintenance_request_id IN ( SELECT maintenance_requests.id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = get_current_owner_user_id()))));

CREATE POLICY expenses_insert_owner ON public.expenses
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((maintenance_request_id IN ( SELECT maintenance_requests.id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = get_current_owner_user_id()))));

CREATE POLICY expenses_select_owner ON public.expenses
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((maintenance_request_id IN ( SELECT maintenance_requests.id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = get_current_owner_user_id()))));

CREATE POLICY expenses_update_owner ON public.expenses
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((maintenance_request_id IN ( SELECT maintenance_requests.id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = get_current_owner_user_id()))))
  WITH CHECK ((maintenance_request_id IN ( SELECT maintenance_requests.id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = get_current_owner_user_id()))));

CREATE POLICY "admins can read gate_events" ON public.gate_events
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Owners can delete inspection photos" ON public.inspection_photos
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((inspection_id IN ( SELECT inspections.id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Owners can insert inspection photos" ON public.inspection_photos
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((inspection_id IN ( SELECT inspections.id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY inspection_photos_select ON public.inspection_photos
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((inspection_id IN ( SELECT inspections.id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Owners can create inspection rooms" ON public.inspection_rooms
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((inspection_id IN ( SELECT inspections.id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Owners can delete inspection rooms" ON public.inspection_rooms
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((inspection_id IN ( SELECT inspections.id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Owners can update inspection rooms" ON public.inspection_rooms
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((inspection_id IN ( SELECT inspections.id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid)))))
  WITH CHECK ((inspection_id IN ( SELECT inspections.id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY inspection_rooms_select ON public.inspection_rooms
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((inspection_id IN ( SELECT inspections.id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY "Owners can create inspections" ON public.inspections
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = owner_user_id));

CREATE POLICY "Owners can delete their inspections" ON public.inspections
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = owner_user_id));

CREATE POLICY inspections_select ON public.inspections
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY inspections_update ON public.inspections
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "Property owners can view lease reminder history" ON public.lease_reminders
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((lease_id IN ( SELECT leases.id
   FROM leases
  WHERE (leases.owner_user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY lease_tenants_delete_owner ON public.lease_tenants
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM leases l
  WHERE ((l.id = lease_tenants.lease_id) AND (l.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY lease_tenants_insert_owner ON public.lease_tenants
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM leases l
  WHERE ((l.id = lease_tenants.lease_id) AND (l.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY lease_tenants_select_owner ON public.lease_tenants
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM leases l
  WHERE ((l.id = lease_tenants.lease_id) AND (l.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY lease_tenants_update_owner ON public.lease_tenants
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM leases l
  WHERE ((l.id = lease_tenants.lease_id) AND (l.owner_user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM leases l
  WHERE ((l.id = lease_tenants.lease_id) AND (l.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY leases_delete_owner ON public.leases
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)));

CREATE POLICY leases_insert_owner ON public.leases
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)) AND (unit_id IN ( SELECT u.id
   FROM units u
  WHERE (u.owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id))))));

CREATE POLICY leases_select ON public.leases
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY leases_update_owner ON public.leases
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)))
  WITH CHECK ((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)));

CREATE POLICY owner_delete_maintenance_photos ON public.maintenance_request_photos
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM maintenance_requests mr
  WHERE ((mr.id = maintenance_request_photos.maintenance_request_id) AND (mr.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY owner_insert_maintenance_photos ON public.maintenance_request_photos
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM maintenance_requests mr
  WHERE ((mr.id = maintenance_request_photos.maintenance_request_id) AND (mr.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY owner_select_maintenance_photos ON public.maintenance_request_photos
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM maintenance_requests mr
  WHERE ((mr.id = maintenance_request_photos.maintenance_request_id) AND (mr.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY maintenance_requests_delete_owner ON public.maintenance_requests
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)));

CREATE POLICY maintenance_requests_insert_owner ON public.maintenance_requests
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)) AND (unit_id IN ( SELECT u.id
   FROM units u
  WHERE (u.owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id))))));

CREATE POLICY maintenance_requests_select ON public.maintenance_requests
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY maintenance_requests_update_owner ON public.maintenance_requests
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)))
  WITH CHECK ((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)));

CREATE POLICY notification_logs_select_own ON public.notification_logs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((notification_id IN ( SELECT notifications.id
   FROM notifications
  WHERE (notifications.user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY notification_settings_delete_own ON public.notification_settings
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY notification_settings_insert_own ON public.notification_settings
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY notification_settings_select_own ON public.notification_settings
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY notification_settings_update_own ON public.notification_settings
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY notifications_select ON public.notifications
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY notifications_update ON public.notifications
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY onboarding_funnel_events_admin_select ON public.onboarding_funnel_events
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (( SELECT is_admin() AS is_admin));

CREATE POLICY properties_delete_owner ON public.properties
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)));

CREATE POLICY properties_insert_owner ON public.properties
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)));

CREATE POLICY properties_select ON public.properties
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY properties_update_owner ON public.properties
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)))
  WITH CHECK ((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)));

CREATE POLICY property_images_delete_owner ON public.property_images
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((property_id IN ( SELECT properties.id
   FROM properties
  WHERE ((properties.owner_user_id = ( SELECT auth.uid() AS uid)) AND (properties.status <> 'inactive'::text)))));

CREATE POLICY property_images_insert_owner ON public.property_images
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((property_id IN ( SELECT properties.id
   FROM properties
  WHERE ((properties.owner_user_id = ( SELECT auth.uid() AS uid)) AND (properties.status <> 'inactive'::text)))));

CREATE POLICY property_images_select ON public.property_images
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((property_id IN ( SELECT properties.id
   FROM properties
  WHERE (properties.owner_user_id = ( SELECT auth.uid() AS uid)))));

CREATE POLICY property_images_update_owner ON public.property_images
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((property_id IN ( SELECT properties.id
   FROM properties
  WHERE ((properties.owner_user_id = ( SELECT auth.uid() AS uid)) AND (properties.status <> 'inactive'::text)))))
  WITH CHECK ((property_id IN ( SELECT properties.id
   FROM properties
  WHERE ((properties.owner_user_id = ( SELECT auth.uid() AS uid)) AND (properties.status <> 'inactive'::text)))));

CREATE POLICY report_runs_select_owner ON public.report_runs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((report_id IN ( SELECT reports.id
   FROM reports
  WHERE (reports.owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)))));

CREATE POLICY reports_delete_owner ON public.reports
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((owner_user_id = get_current_owner_user_id()));

CREATE POLICY reports_insert_owner ON public.reports
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((owner_user_id = get_current_owner_user_id()));

CREATE POLICY reports_select_owner ON public.reports
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((owner_user_id = get_current_owner_user_id()));

CREATE POLICY reports_update_owner ON public.reports
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((owner_user_id = get_current_owner_user_id()))
  WITH CHECK ((owner_user_id = get_current_owner_user_id()));

CREATE POLICY security_events_archive_delete_service_role ON public.security_events_archive
  AS PERMISSIVE
  FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY security_events_archive_insert_service_role ON public.security_events_archive
  AS PERMISSIVE
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY security_events_archive_select_service_role ON public.security_events_archive
  AS PERMISSIVE
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY stripe_webhook_events_archive_delete_service_role ON public.stripe_webhook_events_archive
  AS PERMISSIVE
  FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY stripe_webhook_events_archive_insert_service_role ON public.stripe_webhook_events_archive
  AS PERMISSIVE
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY stripe_webhook_events_archive_select_service_role ON public.stripe_webhook_events_archive
  AS PERMISSIVE
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY tenants_delete ON public.tenants
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY tenants_insert ON public.tenants
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY tenants_select ON public.tenants
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY tenants_update ON public.tenants
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((owner_user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((owner_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY units_delete_owner ON public.units
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)) AND (property_id IN ( SELECT properties.id
   FROM properties
  WHERE (properties.owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id))))));

CREATE POLICY units_insert_owner ON public.units
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)) AND (property_id IN ( SELECT properties.id
   FROM properties
  WHERE (properties.owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id))))));

CREATE POLICY units_select ON public.units
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)));

CREATE POLICY units_update_owner ON public.units
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)) AND (property_id IN ( SELECT properties.id
   FROM properties
  WHERE (properties.owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id))))))
  WITH CHECK (((owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id)) AND (property_id IN ( SELECT properties.id
   FROM properties
  WHERE (properties.owner_user_id = ( SELECT get_current_owner_user_id() AS get_current_owner_user_id))))));

CREATE POLICY user_errors_select_own ON public.user_errors
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY user_errors_archive_delete_service_role ON public.user_errors_archive
  AS PERMISSIVE
  FOR DELETE
  TO service_role
  USING (true);

CREATE POLICY user_errors_archive_insert_service_role ON public.user_errors_archive
  AS PERMISSIVE
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY user_errors_archive_select_service_role ON public.user_errors_archive
  AS PERMISSIVE
  FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY user_feature_access_select_own ON public.user_feature_access
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_preferences_delete_own ON public.user_preferences
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_preferences_insert_own ON public.user_preferences
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_preferences_select_own ON public.user_preferences
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_preferences_update_own ON public.user_preferences
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY user_tour_progress_delete_own ON public.user_tour_progress
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_tour_progress_insert_own ON public.user_tour_progress
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_tour_progress_select_own ON public.user_tour_progress
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY user_tour_progress_update_own ON public.user_tour_progress
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((user_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY users_auth_admin_select ON public.users
  AS PERMISSIVE
  FOR SELECT
  TO supabase_auth_admin
  USING (true);

CREATE POLICY users_delete_own_record ON public.users
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY users_insert_own_record ON public.users
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY users_select_own ON public.users
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY users_update_own_record ON public.users
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY "Owners can create vendors" ON public.vendors
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK ((( SELECT auth.uid() AS uid) = owner_user_id));

CREATE POLICY "Owners can delete their own vendors" ON public.vendors
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = owner_user_id));

CREATE POLICY "Owners can update their own vendors" ON public.vendors
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = owner_user_id))
  WITH CHECK ((( SELECT auth.uid() AS uid) = owner_user_id));

CREATE POLICY "Owners can view their own vendors" ON public.vendors
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((( SELECT auth.uid() AS uid) = owner_user_id));

CREATE POLICY "Allow authenticated users to delete their own CSV files" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'bulk-imports'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "Allow authenticated users to read their own CSV files" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'bulk-imports'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "Allow authenticated users to upload CSV to their folder" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'bulk-imports'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (storage.extension(name) = 'csv'::text)));

CREATE POLICY "Owners can delete inspection photo objects" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'inspection-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (inspections.id)::text AS id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Owners can upload inspection photos" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'inspection-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (inspections.id)::text AS id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Owners can view inspection photo objects" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'inspection-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (inspections.id)::text AS id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Owners delete maintenance photos" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'maintenance-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (maintenance_requests.id)::text AS id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Owners delete tenant documents" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'tenant-documents'::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND ((((storage.foldername(name))[1] = 'property'::text) AND ((storage.foldername(name))[2] IN ( SELECT (properties.id)::text AS id
   FROM properties
  WHERE (properties.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'lease'::text) AND ((storage.foldername(name))[2] IN ( SELECT (leases.id)::text AS id
   FROM leases
  WHERE (leases.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'tenant'::text) AND ((storage.foldername(name))[2] IN ( SELECT (tenants.id)::text AS id
   FROM tenants
  WHERE (tenants.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'maintenance_request'::text) AND ((storage.foldername(name))[2] IN ( SELECT (maintenance_requests.id)::text AS id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'inspection'::text) AND ((storage.foldername(name))[2] IN ( SELECT (inspections.id)::text AS id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "Owners update tenant documents" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'tenant-documents'::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND ((((storage.foldername(name))[1] = 'property'::text) AND ((storage.foldername(name))[2] IN ( SELECT (properties.id)::text AS id
   FROM properties
  WHERE (properties.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'lease'::text) AND ((storage.foldername(name))[2] IN ( SELECT (leases.id)::text AS id
   FROM leases
  WHERE (leases.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'tenant'::text) AND ((storage.foldername(name))[2] IN ( SELECT (tenants.id)::text AS id
   FROM tenants
  WHERE (tenants.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'maintenance_request'::text) AND ((storage.foldername(name))[2] IN ( SELECT (maintenance_requests.id)::text AS id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'inspection'::text) AND ((storage.foldername(name))[2] IN ( SELECT (inspections.id)::text AS id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid))))))))
  WITH CHECK (((bucket_id = 'tenant-documents'::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND ((((storage.foldername(name))[1] = 'property'::text) AND ((storage.foldername(name))[2] IN ( SELECT (properties.id)::text AS id
   FROM properties
  WHERE (properties.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'lease'::text) AND ((storage.foldername(name))[2] IN ( SELECT (leases.id)::text AS id
   FROM leases
  WHERE (leases.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'tenant'::text) AND ((storage.foldername(name))[2] IN ( SELECT (tenants.id)::text AS id
   FROM tenants
  WHERE (tenants.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'maintenance_request'::text) AND ((storage.foldername(name))[2] IN ( SELECT (maintenance_requests.id)::text AS id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'inspection'::text) AND ((storage.foldername(name))[2] IN ( SELECT (inspections.id)::text AS id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "Owners upload maintenance photos" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'maintenance-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (maintenance_requests.id)::text AS id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Owners upload tenant documents" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'tenant-documents'::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND ((((storage.foldername(name))[1] = 'property'::text) AND ((storage.foldername(name))[2] IN ( SELECT (properties.id)::text AS id
   FROM properties
  WHERE (properties.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'lease'::text) AND ((storage.foldername(name))[2] IN ( SELECT (leases.id)::text AS id
   FROM leases
  WHERE (leases.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'tenant'::text) AND ((storage.foldername(name))[2] IN ( SELECT (tenants.id)::text AS id
   FROM tenants
  WHERE (tenants.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'maintenance_request'::text) AND ((storage.foldername(name))[2] IN ( SELECT (maintenance_requests.id)::text AS id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'inspection'::text) AND ((storage.foldername(name))[2] IN ( SELECT (inspections.id)::text AS id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "Owners view maintenance photos" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'maintenance-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (maintenance_requests.id)::text AS id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Owners view tenant documents" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'tenant-documents'::text) AND (array_length(storage.foldername(name), 1) = 2) AND ((storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'::text) AND ((((storage.foldername(name))[1] = 'property'::text) AND ((storage.foldername(name))[2] IN ( SELECT (properties.id)::text AS id
   FROM properties
  WHERE (properties.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'lease'::text) AND ((storage.foldername(name))[2] IN ( SELECT (leases.id)::text AS id
   FROM leases
  WHERE (leases.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'tenant'::text) AND ((storage.foldername(name))[2] IN ( SELECT (tenants.id)::text AS id
   FROM tenants
  WHERE (tenants.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'maintenance_request'::text) AND ((storage.foldername(name))[2] IN ( SELECT (maintenance_requests.id)::text AS id
   FROM maintenance_requests
  WHERE (maintenance_requests.owner_user_id = ( SELECT auth.uid() AS uid))))) OR (((storage.foldername(name))[1] = 'inspection'::text) AND ((storage.foldername(name))[2] IN ( SELECT (inspections.id)::text AS id
   FROM inspections
  WHERE (inspections.owner_user_id = ( SELECT auth.uid() AS uid))))))));

CREATE POLICY "Property owners can delete images" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'property-images'::text) AND (((storage.foldername(name))[1])::uuid IN ( SELECT p.id
   FROM properties p
  WHERE ((p.owner_user_id = ( SELECT auth.uid() AS uid)) AND (p.status <> 'inactive'::text))))));

CREATE POLICY "Property owners can update images" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'property-images'::text) AND (((storage.foldername(name))[1])::uuid IN ( SELECT p.id
   FROM properties p
  WHERE ((p.owner_user_id = ( SELECT auth.uid() AS uid)) AND (p.status <> 'inactive'::text))))))
  WITH CHECK (((bucket_id = 'property-images'::text) AND (((storage.foldername(name))[1])::uuid IN ( SELECT p.id
   FROM properties p
  WHERE ((p.owner_user_id = ( SELECT auth.uid() AS uid)) AND (p.status <> 'inactive'::text))))));

CREATE POLICY "Property owners can upload images" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'property-images'::text) AND (((storage.foldername(name))[1])::uuid IN ( SELECT p.id
   FROM properties p
  WHERE ((p.owner_user_id = ( SELECT auth.uid() AS uid)) AND (p.status <> 'inactive'::text))))));

CREATE POLICY "Tenants can view inspection photo objects for their leases" ON storage.objects
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (((bucket_id = 'inspection-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (i.id)::text AS id
   FROM ((inspections i
     JOIN leases l ON ((l.id = i.lease_id)))
     JOIN tenants t ON ((t.id = l.primary_tenant_id)))
  WHERE (t.user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "Users can update their own avatar" ON storage.objects
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)))
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));

-- ============================================================================
-- GRANTS (109 objects)
-- ============================================================================
GRANT SELECT, UPDATE, INSERT, DELETE ON public.activity TO authenticated;
GRANT INSERT, REFERENCES, DELETE, UPDATE, SELECT, TRUNCATE, TRIGGER ON public.activity TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT SELECT, INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE ON public.app_config TO service_role;
GRANT SELECT, UPDATE, INSERT ON public.blogs TO anon;
GRANT SELECT, UPDATE, INSERT, DELETE ON public.blogs TO authenticated;
GRANT UPDATE, INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE, SELECT ON public.blogs TO service_role;
GRANT INSERT, DELETE, UPDATE, SELECT ON public.document_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.document_categories TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.documents TO service_role;
GRANT UPDATE, INSERT, DELETE, SELECT ON public.email_deliverability TO authenticated;
GRANT TRUNCATE, DELETE, UPDATE, SELECT, INSERT, TRIGGER, REFERENCES ON public.email_deliverability TO service_role;
GRANT SELECT, DELETE, UPDATE, INSERT ON public.email_deliverability_archive TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.email_deliverability_archive TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.email_suppressions TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.email_suppressions TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.expenses TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.gate_events TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.gate_events TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.inspection_photos TO authenticated;
GRANT UPDATE, INSERT, SELECT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.inspection_photos TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.inspection_rooms TO authenticated;
GRANT TRIGGER, INSERT, TRUNCATE, REFERENCES, SELECT, UPDATE, DELETE ON public.inspection_rooms TO service_role;
GRANT DELETE, UPDATE, SELECT, INSERT ON public.inspections TO authenticated;
GRANT DELETE, TRUNCATE, TRIGGER, REFERENCES, UPDATE, SELECT, INSERT ON public.inspections TO service_role;
GRANT DELETE, INSERT, UPDATE, SELECT ON public.lease_reminders TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.lease_reminders TO service_role;
GRANT DELETE, UPDATE, SELECT, INSERT ON public.lease_tenants TO authenticated;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.lease_tenants TO service_role;
GRANT SELECT, UPDATE, DELETE, INSERT ON public.leases TO authenticated;
GRANT REFERENCES, INSERT, TRIGGER, SELECT, UPDATE, DELETE, TRUNCATE ON public.leases TO service_role;
GRANT UPDATE, INSERT, SELECT, DELETE ON public.maintenance_request_photos TO authenticated;
GRANT REFERENCES, INSERT, TRIGGER, SELECT, UPDATE, DELETE, TRUNCATE ON public.maintenance_request_photos TO service_role;
GRANT INSERT, UPDATE, SELECT, DELETE ON public.maintenance_requests TO authenticated;
GRANT SELECT, TRIGGER, TRUNCATE, DELETE, UPDATE, REFERENCES, INSERT ON public.maintenance_requests TO service_role;
GRANT SELECT ON public.notification_logs TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.notification_logs TO service_role;
GRANT DELETE, UPDATE, SELECT, INSERT ON public.notification_settings TO authenticated;
GRANT TRIGGER, SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.notification_settings TO service_role;
GRANT DELETE, SELECT, UPDATE, INSERT ON public.notifications TO authenticated;
GRANT TRUNCATE, INSERT, SELECT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.notifications TO service_role;
GRANT DELETE, SELECT, INSERT, UPDATE ON public.onboarding_funnel_events TO authenticated;
GRANT UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, INSERT, SELECT ON public.onboarding_funnel_events TO service_role;
GRANT UPDATE, DELETE, INSERT, SELECT ON public.payment_transactions TO authenticated;
GRANT TRUNCATE, DELETE, INSERT, SELECT, UPDATE, REFERENCES, TRIGGER ON public.payment_transactions TO service_role;
GRANT INSERT, SELECT, DELETE, UPDATE ON public.processed_internal_events TO authenticated;
GRANT DELETE, TRIGGER, REFERENCES, TRUNCATE, UPDATE, SELECT, INSERT ON public.processed_internal_events TO service_role;
GRANT UPDATE, DELETE, SELECT, INSERT ON public.properties TO authenticated;
GRANT UPDATE, DELETE, TRIGGER, REFERENCES, TRUNCATE, INSERT, SELECT ON public.properties TO service_role;
GRANT DELETE, UPDATE, SELECT, INSERT ON public.property_images TO authenticated;
GRANT SELECT, INSERT, REFERENCES, TRIGGER, TRUNCATE, DELETE, UPDATE ON public.property_images TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.report_runs TO authenticated;
GRANT TRIGGER, UPDATE, DELETE, TRUNCATE, REFERENCES, SELECT, INSERT ON public.report_runs TO service_role;
GRANT INSERT, SELECT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT DELETE, INSERT, SELECT, UPDATE, TRIGGER, REFERENCES, TRUNCATE ON public.reports TO service_role;
GRANT UPDATE, TRUNCATE, REFERENCES, TRIGGER, INSERT, SELECT, DELETE ON public.security_audit_log TO service_role;
GRANT SELECT, DELETE, UPDATE, INSERT ON public.security_events TO authenticated;
GRANT TRUNCATE, TRIGGER, REFERENCES, DELETE, UPDATE, SELECT, INSERT ON public.security_events TO service_role;
GRANT UPDATE, DELETE, INSERT, SELECT ON public.security_events_archive TO authenticated;
GRANT DELETE, TRUNCATE, TRIGGER, REFERENCES, INSERT, SELECT, UPDATE ON public.security_events_archive TO service_role;
GRANT UPDATE, INSERT, DELETE, SELECT ON public.stripe_webhook_events TO authenticated;
GRANT TRUNCATE, DELETE, UPDATE, SELECT, INSERT, TRIGGER, REFERENCES ON public.stripe_webhook_events TO service_role;
GRANT UPDATE, INSERT, SELECT, DELETE ON public.stripe_webhook_events_archive TO authenticated;
GRANT UPDATE, SELECT, INSERT, TRIGGER, REFERENCES, TRUNCATE, DELETE ON public.stripe_webhook_events_archive TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.tenants TO authenticated;
GRANT UPDATE, TRIGGER, REFERENCES, TRUNCATE, DELETE, SELECT, INSERT ON public.tenants TO service_role;
GRANT UPDATE, DELETE, SELECT, INSERT ON public.units TO authenticated;
GRANT TRIGGER, REFERENCES, UPDATE, TRUNCATE, DELETE, SELECT, INSERT ON public.units TO service_role;
GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, SELECT ON public.user_access_log TO service_role;
GRANT DELETE, INSERT, SELECT, UPDATE ON public.user_errors TO authenticated;
GRANT TRUNCATE, REFERENCES, DELETE, INSERT, SELECT, UPDATE, TRIGGER ON public.user_errors TO service_role;
GRANT UPDATE, INSERT, SELECT, DELETE ON public.user_errors_archive TO authenticated;
GRANT DELETE, TRIGGER, REFERENCES, TRUNCATE, UPDATE, SELECT, INSERT ON public.user_errors_archive TO service_role;
GRANT SELECT ON public.user_feature_access TO authenticated;
GRANT DELETE, TRIGGER, REFERENCES, TRUNCATE, INSERT, SELECT, UPDATE ON public.user_feature_access TO service_role;
GRANT DELETE, UPDATE, SELECT, INSERT ON public.user_preferences TO authenticated;
GRANT TRUNCATE, UPDATE, SELECT, INSERT, TRIGGER, REFERENCES, DELETE ON public.user_preferences TO service_role;
GRANT INSERT, DELETE, UPDATE, SELECT ON public.user_tour_progress TO authenticated;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.user_tour_progress TO service_role;
GRANT SELECT ON public.users TO authenticated;
GRANT SELECT, TRUNCATE, DELETE, UPDATE, INSERT, TRIGGER, REFERENCES ON public.users TO service_role;
GRANT UPDATE, SELECT, INSERT, DELETE ON public.vendors TO authenticated;
GRANT SELECT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON public.vendors TO service_role;
GRANT REFERENCES, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, TRIGGER ON public.webhook_attempts TO service_role;
GRANT DELETE, TRUNCATE, REFERENCES, TRIGGER, INSERT, SELECT, UPDATE ON public.webhook_events TO service_role;
GRANT SELECT, TRUNCATE, REFERENCES, TRIGGER, DELETE, UPDATE, INSERT ON public.webhook_metrics TO service_role;
GRANT DELETE, TRIGGER, REFERENCES, TRUNCATE, UPDATE, SELECT, INSERT ON storage.buckets TO anon;
GRANT TRIGGER, DELETE, TRUNCATE, UPDATE, SELECT, INSERT, REFERENCES ON storage.buckets TO authenticated;
GRANT REFERENCES, INSERT, SELECT, UPDATE, TRIGGER, DELETE, TRUNCATE ON storage.buckets TO service_role;
GRANT TRIGGER, INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES ON storage.buckets_analytics TO anon;
GRANT TRUNCATE, DELETE, TRIGGER, REFERENCES, INSERT, SELECT, UPDATE ON storage.buckets_analytics TO authenticated;
GRANT UPDATE, INSERT, TRUNCATE, DELETE, SELECT, TRIGGER, REFERENCES ON storage.buckets_analytics TO service_role;
GRANT SELECT ON storage.buckets_vectors TO anon;
GRANT SELECT ON storage.buckets_vectors TO authenticated;
GRANT SELECT ON storage.buckets_vectors TO service_role;
GRANT INSERT, DELETE, TRIGGER, REFERENCES, TRUNCATE, SELECT, UPDATE ON storage.objects TO anon;
GRANT TRIGGER, DELETE, UPDATE, SELECT, INSERT, REFERENCES, TRUNCATE ON storage.objects TO authenticated;
GRANT INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON storage.objects TO service_role;
GRANT SELECT ON storage.s3_multipart_uploads TO anon;
GRANT SELECT ON storage.s3_multipart_uploads TO authenticated;
GRANT REFERENCES, TRUNCATE, DELETE, UPDATE, TRIGGER, INSERT, SELECT ON storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON storage.s3_multipart_uploads_parts TO anon;
GRANT SELECT ON storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT, TRIGGER, REFERENCES, TRUNCATE, DELETE, UPDATE, INSERT ON storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON storage.vector_indexes TO anon;
GRANT SELECT ON storage.vector_indexes TO authenticated;
GRANT SELECT ON storage.vector_indexes TO service_role;

-- ============================================================================
-- CRON JOBS (12 objects)
-- ============================================================================
SELECT cron.schedule('check-cron-health', '0 * * * *', 'select public.check_cron_health()');
SELECT cron.schedule('cleanup-cron-history', '0 3 * * *', 'select public.cleanup_cron_job_run_details();');
SELECT cron.schedule('cleanup-email-deliverability', '0 4 * * *', 'select public.cleanup_old_email_deliverability()');
SELECT cron.schedule('cleanup-errors', '15 3 * * *', 'select public.cleanup_old_errors()');
SELECT cron.schedule('cleanup-orphan-documents', '0 4 * * *', 'select public.cleanup_orphan_documents();');
SELECT cron.schedule('cleanup-pg-net-responses', '0 3 * * *', 'select public.cleanup_pg_net_http_responses();');
SELECT cron.schedule('cleanup-security-events', '0 3 * * *', 'select public.cleanup_old_security_events()');
SELECT cron.schedule('cleanup-webhook-events', '30 3 * * *', 'select public.cleanup_old_webhook_events()');
SELECT cron.schedule('expire-leases', '0 23 * * *', 'select public.expire_leases()');
SELECT cron.schedule('expire-trials', '0 3 * * *', 'select public.expire_trials();');
SELECT cron.schedule('process-account-deletions', '45 3 * * *', 'select public.process_account_deletions()');
SELECT cron.schedule('queue-lease-reminders', '0 6 * * *', 'select public.queue_lease_reminders()');
