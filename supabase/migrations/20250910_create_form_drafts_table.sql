-- Create form drafts table for React 19 useFormState integration
-- Stores temporary form data with automatic expiration

CREATE TABLE IF NOT EXISTS form_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    form_type TEXT NOT NULL CHECK (form_type IN ('signup', 'login', 'reset')),
    draft_data JSONB NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_form_drafts_session_id ON form_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_form_drafts_expires_at ON form_drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_form_drafts_form_type ON form_drafts(form_type);

-- Automatic cleanup of expired drafts
CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM form_drafts WHERE expires_at < NOW();
END;
$$;

-- Schedule cleanup every hour
SELECT cron.schedule('cleanup-form-drafts', '0 * * * *', 'SELECT cleanup_expired_drafts();');

-- RLS Policies (public access for form drafts as they contain no sensitive data)
ALTER TABLE form_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Form drafts are publicly accessible"
    ON form_drafts
    FOR ALL
    USING (true);

-- Grant permissions
GRANT ALL ON form_drafts TO authenticated;
GRANT ALL ON form_drafts TO anon;