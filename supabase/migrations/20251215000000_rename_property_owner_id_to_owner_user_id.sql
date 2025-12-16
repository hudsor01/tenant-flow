-- Rename property_owner_id to owner_user_id in properties table
-- This migration completes the property ownership migration from property_owners table to direct owner_user_id

-- Rename the column
ALTER TABLE public.properties RENAME COLUMN property_owner_id TO owner_user_id;

-- Update any indexes that reference the old column name (if any)
-- Note: RLS policies and functions have already been updated in previous migrations

-- Add comment to document the change
COMMENT ON COLUMN public.properties.owner_user_id IS 'Direct reference to the user who owns this property (auth.users.id)';