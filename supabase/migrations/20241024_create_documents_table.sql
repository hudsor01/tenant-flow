-- Documents table for lease agreements and future receipt scans with 7-year retention
-- Migration: create_documents_table_with_retention
-- Date: 2025-10-24

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Entity linkage
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lease', 'receipt')),
  entity_id UUID NOT NULL,

  -- File metadata
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_size BIGINT NOT NULL,
  compressed_size BIGINT NOT NULL,
  compression_ratio DECIMAL(5,2),
  mime_type TEXT NOT NULL,

  -- 7-year retention policy
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  retention_until TIMESTAMPTZ NOT NULL,
  soft_deleted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_entity
  ON documents(user_id, entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_documents_retention
  ON documents(retention_until)
  WHERE soft_deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_soft_deleted
  ON documents(soft_deleted_at)
  WHERE soft_deleted_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own documents
CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can upload documents
CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (user_id = auth.uid() AND entity_type IN ('lease', 'receipt'));

-- RLS Policy: Users can soft-delete their own documents
CREATE POLICY "Users can soft-delete documents"
  ON documents FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE documents IS 'Stores compressed lease agreements and receipts with 7-year retention policy';
COMMENT ON COLUMN documents.retention_until IS 'Document must be retained until this date for compliance (7 years from upload)';
COMMENT ON COLUMN documents.soft_deleted_at IS 'User-initiated soft delete - file remains in storage until retention period expires';
