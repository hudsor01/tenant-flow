-- Create property_images table for multiple images per property
-- Migration: create_property_images_table
-- Date: 2025-10-29

-- Property Images Table
CREATE TABLE IF NOT EXISTS property_images (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "propertyId" TEXT NOT NULL REFERENCES property(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  caption TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "uploadedById" TEXT REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_property_images_property_id ON property_images("propertyId");
CREATE INDEX idx_property_images_display_order ON property_images("propertyId", "displayOrder");
CREATE INDEX idx_property_images_primary ON property_images("propertyId", "isPrimary") WHERE "isPrimary" = true;

-- Enable Row Level Security
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view images for their properties
CREATE POLICY "property_images_owner_select"
  ON property_images FOR SELECT
  TO authenticated
  USING (
    "propertyId" IN (
      SELECT id FROM property WHERE "ownerId" = get_auth_uid()
    )
  );

-- RLS Policy: Users can insert images for their properties
CREATE POLICY "property_images_owner_insert"
  ON property_images FOR INSERT
  TO authenticated
  WITH CHECK (
    "propertyId" IN (
      SELECT id FROM property WHERE "ownerId" = get_auth_uid()
    )
  );

-- RLS Policy: Users can update images for their properties
CREATE POLICY "property_images_owner_update"
  ON property_images FOR UPDATE
  TO authenticated
  USING (
    "propertyId" IN (
      SELECT id FROM property WHERE "ownerId" = get_auth_uid()
    )
  )
  WITH CHECK (
    "propertyId" IN (
      SELECT id FROM property WHERE "ownerId" = get_auth_uid()
    )
  );

-- RLS Policy: Users can delete images for their properties
CREATE POLICY "property_images_owner_delete"
  ON property_images FOR DELETE
  TO authenticated
  USING (
    "propertyId" IN (
      SELECT id FROM property WHERE "ownerId" = get_auth_uid()
    )
  );

-- Function to ensure only one primary image per property
CREATE OR REPLACE FUNCTION ensure_single_primary_image()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting an image as primary, unset all other primary images for this property
  IF NEW."isPrimary" = true THEN
    UPDATE property_images 
    SET "isPrimary" = false 
    WHERE "propertyId" = NEW."propertyId" 
      AND id != NEW.id 
      AND "isPrimary" = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single primary image
CREATE TRIGGER ensure_single_primary_image_trigger
  BEFORE INSERT OR UPDATE ON property_images
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_primary_image();

-- Function to auto-set first image as primary if none exists
CREATE OR REPLACE FUNCTION auto_set_first_image_primary()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is the first image for the property, make it primary
  IF NOT EXISTS (
    SELECT 1 FROM property_images 
    WHERE "propertyId" = NEW."propertyId" 
      AND id != NEW.id
  ) THEN
    NEW."isPrimary" = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_set_first_image_primary_trigger
  BEFORE INSERT ON property_images
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_first_image_primary();

-- Add comments for documentation
COMMENT ON TABLE property_images IS 'Stores multiple images per property with ordering and primary image designation';
COMMENT ON COLUMN property_images."isPrimary" IS 'Only one image per property can be primary. Used as the main thumbnail.';
COMMENT ON COLUMN property_images."displayOrder" IS 'Order in which images are displayed in galleries (lower numbers first)';
