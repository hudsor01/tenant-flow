-- Create maintenance_requests table
-- This table stores maintenance requests for properties/units

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    category VARCHAR(20) DEFAULT 'general' CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliances', 'general', 'emergency')),
    
    -- References
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL, -- References auth.users(id) but not enforced via FK due to Supabase auth
    assigned_to UUID, -- References auth.users(id) for maintenance staff
    
    -- Cost tracking
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Additional fields
    notes TEXT,
    images TEXT[], -- Array of image URLs
    
    -- Constraints
    CONSTRAINT maintenance_requests_cost_check CHECK (
        (estimated_cost IS NULL OR estimated_cost >= 0) AND
        (actual_cost IS NULL OR actual_cost >= 0)
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_owner_id ON maintenance_requests(owner_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_unit_id ON maintenance_requests(unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_id ON maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_priority ON maintenance_requests(priority);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_to ON maintenance_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_at ON maintenance_requests(created_at);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_maintenance_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintenance_requests_updated_at
    BEFORE UPDATE ON maintenance_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_requests_updated_at();

-- Row Level Security (RLS)
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see maintenance requests for their organization
CREATE POLICY "maintenance_requests_select_policy"
    ON maintenance_requests
    FOR SELECT
    USING (
        owner_id = auth.uid()
        OR 
        assigned_to = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = maintenance_requests.property_id
            AND p.owner_id = auth.uid()
        )
    );

-- Policy: Users can only create maintenance requests for their own properties
CREATE POLICY "maintenance_requests_insert_policy"
    ON maintenance_requests
    FOR INSERT
    WITH CHECK (
        owner_id = auth.uid()
        AND
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = maintenance_requests.property_id
            AND p.owner_id = auth.uid()
        )
    );

-- Policy: Users can only update their own maintenance requests or assigned ones
CREATE POLICY "maintenance_requests_update_policy"
    ON maintenance_requests
    FOR UPDATE
    USING (
        owner_id = auth.uid()
        OR 
        assigned_to = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = maintenance_requests.property_id
            AND p.owner_id = auth.uid()
        )
    );

-- Policy: Users can only delete their own maintenance requests
CREATE POLICY "maintenance_requests_delete_policy"
    ON maintenance_requests
    FOR DELETE
    USING (
        owner_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM properties p
            WHERE p.id = maintenance_requests.property_id
            AND p.owner_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON maintenance_requests TO authenticated;
GRANT SELECT ON maintenance_requests TO anon;