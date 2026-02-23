-- Migration: Add acquisition_cost and acquisition_date to properties table
-- Purpose: Enable accurate depreciation calculations using actual property cost basis
--          instead of the NOI/0.06 cap rate estimate fallback.
-- Affected tables: properties
-- Special considerations: Nullable columns with no backfill needed; existing records
--                         will use the fallback cap rate estimate until owners supply values.

-- Add acquisition cost (purchase price of the property)
alter table public.properties
  add column if not exists acquisition_cost numeric(14, 2);

-- Add acquisition date (when the property was purchased)
alter table public.properties
  add column if not exists acquisition_date date;

-- Comment the columns for documentation
comment on column public.properties.acquisition_cost is
  'Purchase price of the property. Used for depreciation calculations (cost basis / 27.5 years residential).';

comment on column public.properties.acquisition_date is
  'Date the property was acquired. Used to calculate accumulated depreciation. Falls back to created_at if null.';
