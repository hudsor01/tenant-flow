-- Migration: Add lease details columns for unified lease creation wizard
-- These columns support the full lease agreement details including occupancy,
-- pets, utilities, and federal/state disclosure requirements.

-- Add lease details columns (idempotent with IF NOT EXISTS)
ALTER TABLE public.leases
ADD COLUMN IF NOT EXISTS max_occupants INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pet_deposit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pet_rent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS utilities_included TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tenant_responsible_utilities TEXT[] DEFAULT ARRAY['Electric', 'Gas', 'Water', 'Internet'],
ADD COLUMN IF NOT EXISTS property_rules TEXT,
ADD COLUMN IF NOT EXISTS property_built_before_1978 BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lead_paint_disclosure_acknowledged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS governing_state TEXT DEFAULT 'TX';

-- Add comments for documentation
COMMENT ON COLUMN public.leases.max_occupants IS 'Maximum number of occupants allowed in the unit';
COMMENT ON COLUMN public.leases.pets_allowed IS 'Whether pets are permitted in the unit';
COMMENT ON COLUMN public.leases.pet_deposit IS 'Pet deposit amount in cents';
COMMENT ON COLUMN public.leases.pet_rent IS 'Monthly pet rent amount in cents';
COMMENT ON COLUMN public.leases.utilities_included IS 'Array of utilities included in rent';
COMMENT ON COLUMN public.leases.tenant_responsible_utilities IS 'Array of utilities tenant is responsible for';
COMMENT ON COLUMN public.leases.property_rules IS 'Additional property rules and restrictions';
COMMENT ON COLUMN public.leases.property_built_before_1978 IS 'Whether property was built before 1978 (lead paint disclosure required)';
COMMENT ON COLUMN public.leases.lead_paint_disclosure_acknowledged IS 'Whether tenant acknowledged lead paint disclosure';
COMMENT ON COLUMN public.leases.governing_state IS 'State whose laws govern this lease (e.g., TX, CA, NY)';
