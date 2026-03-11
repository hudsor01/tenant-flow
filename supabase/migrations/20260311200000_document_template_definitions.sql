-- Document template definitions
-- Stores custom field configurations per owner per template type.
-- Each owner can save one set of custom fields per template_key.

CREATE TABLE public.document_template_definitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT document_template_definitions_owner_template_unique
    UNIQUE (owner_user_id, template_key),

  CONSTRAINT document_template_definitions_template_key_check
    CHECK (template_key IN ('lease', 'maintenance-request', 'property-inspection', 'rental-application', 'tenant-notice'))
);

-- Index for RLS performance (owner lookups)
CREATE INDEX idx_document_template_definitions_owner
  ON public.document_template_definitions (owner_user_id);

-- Reuse existing trigger function for updated_at
CREATE TRIGGER set_document_template_definitions_updated_at
  BEFORE UPDATE ON public.document_template_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS
ALTER TABLE public.document_template_definitions ENABLE ROW LEVEL SECURITY;

-- RLS policies: one per operation per role
CREATE POLICY "Owners can view own template definitions"
  ON public.document_template_definitions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = owner_user_id);

CREATE POLICY "Owners can insert own template definitions"
  ON public.document_template_definitions
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = owner_user_id);

CREATE POLICY "Owners can update own template definitions"
  ON public.document_template_definitions
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = owner_user_id)
  WITH CHECK ((select auth.uid()) = owner_user_id);

CREATE POLICY "Owners can delete own template definitions"
  ON public.document_template_definitions
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = owner_user_id);
