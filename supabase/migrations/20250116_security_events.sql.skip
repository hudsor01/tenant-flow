-- Create SecurityEvent table for production security monitoring
CREATE TABLE IF NOT EXISTS "SecurityEvent" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    source TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    "resolvedAt" TIMESTAMPTZ,
    "resolvedBy" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
    "resolutionNotes" TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_security_event_timestamp ON "SecurityEvent"(timestamp DESC);
CREATE INDEX idx_security_event_type ON "SecurityEvent"(type);
CREATE INDEX idx_security_event_severity ON "SecurityEvent"(severity);
CREATE INDEX idx_security_event_user ON "SecurityEvent"("userId");
CREATE INDEX idx_security_event_ip ON "SecurityEvent"("ipAddress");
CREATE INDEX idx_security_event_resolved ON "SecurityEvent"(resolved);
CREATE INDEX idx_security_event_metadata ON "SecurityEvent" USING GIN(metadata);

-- Add RLS policies
ALTER TABLE "SecurityEvent" ENABLE ROW LEVEL SECURITY;

-- Policy for service role (full access)
CREATE POLICY "Service role has full access to SecurityEvent"
ON "SecurityEvent"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy for authenticated users to view their own events
CREATE POLICY "Users can view their own security events"
ON "SecurityEvent"
FOR SELECT
TO authenticated
USING ("userId" = (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()));

-- Policy for admin users
CREATE POLICY "Admins can view all security events"
ON "SecurityEvent"
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "User"
        WHERE "supabaseId" = auth.uid()
        AND role = 'ADMIN'
    )
);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_security_event_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_security_event_updated_at_trigger
    BEFORE UPDATE ON "SecurityEvent"
    FOR EACH ROW
    EXECUTE FUNCTION update_security_event_updated_at();

-- Add function to mark events as resolved
CREATE OR REPLACE FUNCTION resolve_security_event(
    event_id UUID,
    notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE "SecurityEvent"
    SET
        resolved = TRUE,
        "resolvedAt" = NOW(),
        "resolvedBy" = (SELECT id FROM "User" WHERE "supabaseId" = auth.uid()),
        "resolutionNotes" = notes
    WHERE id = event_id
    AND resolved = FALSE;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION resolve_security_event TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE "SecurityEvent" IS 'Stores security events for monitoring and auditing purposes';
COMMENT ON COLUMN "SecurityEvent".type IS 'Type of security event (sql_injection, xss, rate_limit, etc.)';
COMMENT ON COLUMN "SecurityEvent".severity IS 'Severity level: low, medium, high, critical';
COMMENT ON COLUMN "SecurityEvent".metadata IS 'Additional context data in JSON format';