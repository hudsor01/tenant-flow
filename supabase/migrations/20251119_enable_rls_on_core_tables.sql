-- Enable RLS on Core Tables
-- This migration resolves security advisor errors where RLS policies exist but RLS was not enabled

-- Enable RLS on leases table (has policies but RLS disabled)
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;

-- Enable RLS on properties table (has policies but RLS disabled)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Enable RLS on maintenance_requests table (has policies but RLS disabled)
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
