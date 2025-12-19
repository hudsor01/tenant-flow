-- Migration: Add governing_state validation constraint
-- Purpose: Ensure governing_state column only contains valid US state codes
-- This prevents invalid state codes from being stored in the database

-- Add check constraint to validate governing_state is a valid 2-letter US state code
alter table public.leases
  add constraint leases_governing_state_check
  check (
    governing_state is null or
    governing_state in (
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
      'DC', 'AS', 'GU', 'MP', 'PR', 'VI'
    )
  );

-- Add comment explaining the constraint
comment on constraint leases_governing_state_check on public.leases is
  'Validates that governing_state is a valid US state/territory code (2-letter abbreviation)';
