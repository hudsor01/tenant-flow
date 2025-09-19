-- Test data seeding for consistent test environment
-- This file can be run to populate a test database with realistic data

-- Create test organizations
INSERT INTO public.organizations (id, name, owner_id, created_at, updated_at, settings)
VALUES 
  ('org-test-001', 'Acme Property Management', 'user-test-001', now(), now(), '{"features": ["properties", "tenants", "leases"]}'),
  ('org-test-002', 'Blue Sky Realty', 'user-test-002', now(), now(), '{"features": ["properties", "tenants"]}'),
  ('org-test-003', 'Green Valley Properties', 'user-test-003', now(), now(), '{"features": ["properties", "tenants", "leases", "maintenance"]}')
ON CONFLICT (id) DO NOTHING;

-- Create test properties
INSERT INTO public.properties (id, organization_id, name, address, city, state, zip, property_type, units_count, created_at, updated_at)
VALUES 
  ('prop-test-001', 'org-test-001', 'Sunset Apartments', '123 Main St', 'San Francisco', 'CA', '94102', 'apartment', 24, now(), now()),
  ('prop-test-002', 'org-test-001', 'Oak Grove Condos', '456 Oak Ave', 'San Francisco', 'CA', '94103', 'condo', 12, now(), now()),
  ('prop-test-003', 'org-test-002', 'Riverside Townhomes', '789 River Rd', 'Oakland', 'CA', '94601', 'townhouse', 8, now(), now()),
  ('prop-test-004', 'org-test-003', 'Mountain View Studios', '321 Hill St', 'Berkeley', 'CA', '94705', 'studio', 16, now(), now()),
  ('prop-test-005', 'org-test-001', 'Downtown Lofts', '654 Market St', 'San Francisco', 'CA', '94105', 'loft', 6, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create test units
INSERT INTO public.units (id, property_id, unit_number, bedrooms, bathrooms, square_feet, rent_amount, status, created_at, updated_at)
VALUES 
  ('unit-test-001', 'prop-test-001', '101', 1, 1, 650, 2500.00, 'occupied', now(), now()),
  ('unit-test-002', 'prop-test-001', '102', 1, 1, 650, 2500.00, 'vacant', now(), now()),
  ('unit-test-003', 'prop-test-001', '201', 2, 1, 850, 3200.00, 'occupied', now(), now()),
  ('unit-test-004', 'prop-test-001', '202', 2, 1, 850, 3200.00, 'maintenance', now(), now()),
  ('unit-test-005', 'prop-test-002', '1A', 2, 2, 1100, 4000.00, 'occupied', now(), now()),
  ('unit-test-006', 'prop-test-002', '1B', 2, 2, 1100, 4000.00, 'vacant', now(), now()),
  ('unit-test-007', 'prop-test-003', 'TH-1', 3, 2.5, 1400, 3800.00, 'occupied', now(), now()),
  ('unit-test-008', 'prop-test-003', 'TH-2', 3, 2.5, 1400, 3800.00, 'occupied', now(), now()),
  ('unit-test-009', 'prop-test-004', 'S01', 0, 1, 400, 1800.00, 'occupied', now(), now()),
  ('unit-test-010', 'prop-test-004', 'S02', 0, 1, 400, 1800.00, 'vacant', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create test tenants
INSERT INTO public.tenants (id, first_name, last_name, email, phone, date_of_birth, ssn_last_4, emergency_contact_name, emergency_contact_phone, created_at, updated_at)
VALUES 
  ('tenant-test-001', 'John', 'Doe', 'john.doe@email.com', '(555) 123-4567', '1985-06-15', '1234', 'Jane Doe', '(555) 123-4568', now(), now()),
  ('tenant-test-002', 'Jane', 'Smith', 'jane.smith@email.com', '(555) 234-5678', '1990-03-22', '2345', 'Bob Smith', '(555) 234-5679', now(), now()),
  ('tenant-test-003', 'Michael', 'Johnson', 'michael.johnson@email.com', '(555) 345-6789', '1988-11-08', '3456', 'Sarah Johnson', '(555) 345-6790', now(), now()),
  ('tenant-test-004', 'Emily', 'Brown', 'emily.brown@email.com', '(555) 456-7890', '1992-07-30', '4567', 'David Brown', '(555) 456-7891', now(), now()),
  ('tenant-test-005', 'Robert', 'Wilson', 'robert.wilson@email.com', '(555) 567-8901', '1987-02-14', '5678', 'Lisa Wilson', '(555) 567-8902', now(), now()),
  ('tenant-test-006', 'Amanda', 'Davis', 'amanda.davis@email.com', '(555) 678-9012', '1991-09-25', '6789', 'Mark Davis', '(555) 678-9013', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create test leases
INSERT INTO public.leases (id, unit_id, tenant_id, start_date, end_date, rent_amount, security_deposit, status, lease_terms, created_at, updated_at)
VALUES 
  ('lease-test-001', 'unit-test-001', 'tenant-test-001', '2024-01-01', '2024-12-31', 2500.00, 2500.00, 'active', '12-month lease', now(), now()),
  ('lease-test-002', 'unit-test-003', 'tenant-test-002', '2024-02-01', '2025-01-31', 3200.00, 3200.00, 'active', '12-month lease', now(), now()),
  ('lease-test-003', 'unit-test-005', 'tenant-test-003', '2024-03-01', '2025-02-28', 4000.00, 4000.00, 'active', '12-month lease', now(), now()),
  ('lease-test-004', 'unit-test-007', 'tenant-test-004', '2024-01-15', '2025-01-14', 3800.00, 3800.00, 'active', '12-month lease', now(), now()),
  ('lease-test-005', 'unit-test-008', 'tenant-test-005', '2024-04-01', '2025-03-31', 3800.00, 3800.00, 'active', '12-month lease', now(), now()),
  ('lease-test-006', 'unit-test-009', 'tenant-test-006', '2023-12-01', '2024-11-30', 1800.00, 1800.00, 'active', '12-month lease', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create test maintenance requests
INSERT INTO public.maintenance_requests (id, unit_id, tenant_id, title, description, priority, status, reported_date, created_at, updated_at)
VALUES 
  ('maint-test-001', 'unit-test-001', 'tenant-test-001', 'Leaky faucet', 'Kitchen faucet is dripping continuously', 'medium', 'open', now() - interval '2 days', now(), now()),
  ('maint-test-002', 'unit-test-003', 'tenant-test-002', 'Heating not working', 'Heater is not turning on', 'high', 'in_progress', now() - interval '1 day', now(), now()),
  ('maint-test-003', 'unit-test-005', 'tenant-test-003', 'Light bulb replacement', 'Bathroom light bulb is burnt out', 'low', 'completed', now() - interval '5 days', now(), now()),
  ('maint-test-004', 'unit-test-007', 'tenant-test-004', 'Garbage disposal issue', 'Garbage disposal is making loud noises', 'medium', 'open', now() - interval '3 days', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create test subscription records
INSERT INTO public."Subscription" (id, "userId", status, "planType", "stripeCustomerId", "stripeSubscriptionId", "stripePriceId", "currentPeriodStart", "currentPeriodEnd", "cancelAtPeriodEnd", "createdAt", "updatedAt")
VALUES 
  ('sub-test-001', 'user-test-001', 'ACTIVE', 'PROFESSIONAL', 'cus_test001', 'sub_test001', 'price_test001', now(), now() + interval '1 month', false, now(), now()),
  ('sub-test-002', 'user-test-002', 'ACTIVE', 'STARTER', 'cus_test002', 'sub_test002', 'price_test002', now(), now() + interval '1 month', false, now(), now()),
  ('sub-test-003', 'user-test-003', 'ACTIVE', 'ENTERPRISE', 'cus_test003', 'sub_test003', 'price_test003', now(), now() + interval '1 month', false, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create test webhook events
INSERT INTO public.webhook_events (id, event_type, data, processed, created_at)
VALUES 
  ('webhook-test-001', 'customer.subscription.created', '{"id": "sub_test001", "customer": "cus_test001", "status": "active"}'::jsonb, true, now() - interval '1 hour'),
  ('webhook-test-002', 'invoice.payment_succeeded', '{"id": "in_test001", "subscription": "sub_test001", "amount_paid": 2900}'::jsonb, true, now() - interval '2 hours'),
  ('webhook-test-003', 'customer.subscription.updated', '{"id": "sub_test002", "customer": "cus_test002", "status": "active"}'::jsonb, false, now() - interval '30 minutes')
ON CONFLICT (id) DO NOTHING;