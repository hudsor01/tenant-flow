-- ============================================================================
-- Units Table Migration
-- ============================================================================
-- 
-- Create units table for property management
-- Essential for multi-unit properties and lease management
-- Referenced by maintenance_requests and leases tables
--
-- Author: Claude Code
-- Date: 2025-01-25  
-- ============================================================================

-- Create units table
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    bedrooms INTEGER NOT NULL DEFAULT 1,
    bathrooms DECIMAL(3,1) NOT NULL DEFAULT 1.0,
    square_feet INTEGER NULL,
    monthly_rent DECIMAL(10,2) NULL,
    security_deposit DECIMAL(10,2) NULL,
    description TEXT NULL,
    amenities TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'VACANT' CHECK (status IN ('VACANT', 'OCCUPIED', 'MAINTENANCE', 'RESERVED')),
    last_inspection_date TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate unit numbers within a property
ALTER TABLE public.units ADD CONSTRAINT units_property_unit_unique 
UNIQUE (property_id, unit_number);

-- Create indexes (defined in apps/backend/database/indexes.sql but ensuring they exist)
CREATE INDEX IF NOT EXISTS idx_unit_property_status 
ON public.units (property_id, status);

CREATE INDEX IF NOT EXISTS idx_unit_property_id 
ON public.units (property_id);

-- Enable Row Level Security
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- RLS Policies for multi-tenant security
-- Users can only access units for properties they own
CREATE POLICY "Users can view units for their properties" ON public.units
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.properties p 
            WHERE p.id = units.property_id 
            AND p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create units for their properties" ON public.units
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.properties p 
            WHERE p.id = units.property_id 
            AND p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update units for their properties" ON public.units
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.properties p 
            WHERE p.id = units.property_id 
            AND p.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete units for their properties" ON public.units
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.properties p 
            WHERE p.id = units.property_id 
            AND p.owner_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER units_updated_at_trigger
    BEFORE UPDATE ON public.units
    FOR EACH ROW
    EXECUTE FUNCTION update_units_updated_at();

-- Auto-create a default unit when a property is created (for single family homes)
CREATE OR REPLACE FUNCTION auto_create_default_unit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create default unit for single family properties or if no units specified
    IF NEW.property_type = 'SINGLE_FAMILY' OR NOT EXISTS (
        SELECT 1 FROM public.units WHERE property_id = NEW.id
    ) THEN
        INSERT INTO public.units (
            property_id,
            unit_number,
            bedrooms,
            bathrooms,
            monthly_rent,
            status
        ) VALUES (
            NEW.id,
            CASE 
                WHEN NEW.property_type = 'SINGLE_FAMILY' THEN 'Main House'
                ELSE '1'
            END,
            COALESCE(NEW.bedrooms, 1),
            COALESCE(NEW.bathrooms, 1.0),
            NEW.monthly_rent,
            'VACANT'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create unit when property is created
CREATE TRIGGER properties_auto_create_unit_trigger
    AFTER INSERT ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_default_unit();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT USAGE ON SEQUENCE IF EXISTS units_id_seq TO authenticated;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.units IS 'Individual rental units within properties. Essential for lease management and maintenance tracking.';
COMMENT ON COLUMN public.units.property_id IS 'Foreign key to properties table';
COMMENT ON COLUMN public.units.unit_number IS 'Unit identifier (e.g., "1A", "Main House", "Apt 2")';
COMMENT ON COLUMN public.units.status IS 'Current availability status: VACANT, OCCUPIED, MAINTENANCE, RESERVED';
COMMENT ON COLUMN public.units.monthly_rent IS 'Monthly rent amount for this specific unit';
COMMENT ON COLUMN public.units.amenities IS 'Array of unit-specific amenities';
COMMENT ON COLUMN public.units.last_inspection_date IS 'Date of last unit inspection';

-- ============================================================================
-- Migration completed successfully
-- Units table created with proper relationships, indexes, RLS, and triggers
-- ============================================================================