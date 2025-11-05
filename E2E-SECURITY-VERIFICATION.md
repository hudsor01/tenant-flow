# End-to-End Security Verification Guide

**Date**: 2025-11-05
**Task**: Phase 3, Task 3.6
**Purpose**: Manual security testing of complete user flows to verify RLS policies and application-layer security

---

## Overview

This document provides **step-by-step manual security tests** to verify:
1. Tenant-to-tenant data isolation
2. Tenant-to-landlord privilege escalation prevention
3. Payment security (service role enforcement)
4. Emergency contact isolation
5. Property/unit ownership boundaries

**Prerequisites**:
- Backend running: `doppler run -- pnpm --filter @repo/backend dev`
- Frontend running: `pnpm --filter @repo/frontend dev`
- Test users created in database
- Browser DevTools open (Network tab + Console)

---

## Test Users

**Required Test Accounts**:

| Email | Role | Purpose |
|-------|------|---------|
| `landlord-a@test.com` | LANDLORD | Property owner A |
| `landlord-b@test.com` | LANDLORD | Property owner B |
| `tenant-a@test.com` | TENANT | Tenant in landlord A's property |
| `tenant-b@test.com` | TENANT | Tenant in landlord B's property |

**Setup Commands** (if users don't exist):
```sql
-- Run via: doppler run -- psql $DIRECT_URL

-- Create test users (if not exists)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role)
VALUES
  ('a1b2c3d4-landlord-a', 'landlord-a@test.com', crypt('password123', gen_salt('bf')), now(), 'authenticated'),
  ('a1b2c3d4-landlord-b', 'landlord-b@test.com', crypt('password123', gen_salt('bf')), now(), 'authenticated'),
  ('a1b2c3d4-tenant-a', 'tenant-a@test.com', crypt('password123', gen_salt('bf')), now(), 'authenticated'),
  ('a1b2c3d4-tenant-b', 'tenant-b@test.com', crypt('password123', gen_salt('bf')), now(), 'authenticated')
ON CONFLICT (email) DO NOTHING;

-- Assign roles
INSERT INTO public.users (id, email, role)
VALUES
  ('a1b2c3d4-landlord-a', 'landlord-a@test.com', 'LANDLORD'),
  ('a1b2c3d4-landlord-b', 'landlord-b@test.com', 'LANDLORD'),
  ('a1b2c3d4-tenant-a', 'tenant-a@test.com', 'TENANT'),
  ('a1b2c3d4-tenant-b', 'tenant-b@test.com', 'TENANT')
ON CONFLICT (id) DO NOTHING;
```

---

## Test Scenario 1: Tenant-to-Tenant Data Isolation

**Objective**: Verify Tenant A cannot access Tenant B's profile, lease, or payments

### 1.1 - Profile Access Isolation

**Steps**:
1. Login as Tenant A (`tenant-a@test.com`)
2. Navigate to: `https://localhost:3000/tenant/profile`
3. Open DevTools → Network tab
4. Manually construct API request to fetch Tenant B's profile:
   ```javascript
   // In browser console
   const tenantBId = 'TENANT_B_USER_ID_HERE' // Get from database

   fetch('https://api.tenantflow.app/api/v1/tenants', {
     method: 'GET',
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`,
       'Content-Type': 'application/json'
     }
   })
   .then(r => r.json())
   .then(console.log)
   ```

**Expected Result**:
- ❌ Response: `[]` (empty array) OR `403 Forbidden`
- ✅ RLS policy blocks cross-tenant queries
- ✅ Only Tenant A's own profile returned (if endpoint is /tenants/{id})

**Failure Indicators**:
- 🚨 Tenant B's data visible in response
- 🚨 Status code `200` with Tenant B's profile

---

### 1.2 - Lease Access Isolation

**Steps**:
1. Login as Tenant A
2. Get Tenant B's lease ID from database:
   ```sql
   SELECT id FROM lease WHERE tenantId = 'TENANT_B_ID' LIMIT 1;
   ```
3. Attempt to access Tenant B's lease:
   ```javascript
   const tenantBLeaseId = 'LEASE_ID_HERE'

   fetch(`https://api.tenantflow.app/api/v1/tenant-portal/lease?leaseId=${tenantBLeaseId}`, {
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`
     }
   })
   .then(r => r.json())
   .then(console.log)
   ```

**Expected Result**:
- ❌ Response: `403 Forbidden` OR `404 Not Found`
- ✅ RLS blocks lease access

**Failure Indicators**:
- 🚨 Tenant B's lease data returned
- 🚨 Status code `200`

---

### 1.3 - Payment History Isolation

**Steps**:
1. Login as Tenant A
2. Attempt to query rent_payment table directly (via Supabase client if exposed):
   ```javascript
   // If frontend has Supabase client exposed
   const { data, error } = await supabase
     .from('rent_payment')
     .select('*')
     .eq('tenantId', 'TENANT_B_USER_ID')

   console.log('Payments:', data)
   console.log('Error:', error)
   ```

**Expected Result**:
- ❌ Response: `[]` (empty) - RLS filters out Tenant B's payments
- ✅ No payments returned

**Failure Indicators**:
- 🚨 Tenant B's payments visible
- 🚨 `data.length > 0`

---

### 1.4 - Emergency Contact Isolation

**Steps**:
1. Login as Tenant A
2. Get Tenant B's tenant record ID:
   ```sql
   SELECT id FROM tenant WHERE auth_user_id = 'TENANT_B_AUTH_ID' LIMIT 1;
   ```
3. Attempt to read Tenant B's emergency contact:
   ```javascript
   const { data, error } = await supabase
     .from('tenant_emergency_contact')
     .select('*')
     .eq('tenant_id', 'TENANT_B_TENANT_ID')

   console.log('Emergency contacts:', data)
   ```

**Expected Result**:
- ❌ Response: `[]` (empty)
- ✅ RLS blocks cross-tenant emergency contact access

**Failure Indicators**:
- 🚨 Tenant B's emergency contact returned
- 🚨 `data.length > 0`

---

## Test Scenario 2: Tenant → Landlord Privilege Escalation

**Objective**: Verify tenant cannot access landlord dashboard or property management features

### 2.1 - Dashboard Access Prevention

**Steps**:
1. Login as Tenant A
2. Manually navigate to landlord routes:
   - `https://localhost:3000/manage/properties`
   - `https://localhost:3000/manage/tenants`
   - `https://localhost:3000/manage/maintenance`
3. Check Network tab for API responses

**Expected Result**:
- ❌ UI: Redirect to tenant dashboard OR 403 error page
- ❌ API: `403 Forbidden` responses
- ✅ `@Roles('LANDLORD')` guard blocks access

**Failure Indicators**:
- 🚨 Landlord dashboard renders
- 🚨 Property list API returns data
- 🚨 Status code `200`

---

### 2.2 - Property Management Prevention

**Steps**:
1. Login as Tenant A
2. Attempt to query property table:
   ```javascript
   fetch('https://api.tenantflow.app/api/v1/properties', {
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`
     }
   })
   .then(r => r.json())
   .then(console.log)
   ```

**Expected Result**:
- ❌ Response: `403 Forbidden` OR `[]` (empty)
- ✅ RLS policy restricts property access to owners

**Failure Indicators**:
- 🚨 Properties visible in response
- 🚨 Status code `200` with data

---

### 2.3 - Tenant Management Prevention

**Steps**:
1. Login as Tenant A
2. Attempt to access tenant management API:
   ```javascript
   fetch('https://api.tenantflow.app/api/v1/tenants', {
     method: 'GET',
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`
     }
   })
   .then(r => r.json())
   .then(console.log)
   ```

**Expected Result**:
- ❌ Response: `403 Forbidden` OR only own tenant record
- ✅ Cannot see other tenants

**Failure Indicators**:
- 🚨 Multiple tenants visible
- 🚨 Tenant B's data accessible

---

## Test Scenario 3: Payment Security

**Objective**: Verify authenticated users CANNOT directly insert/update payments (service_role only)

### 3.1 - Direct Payment Insert Prevention

**Steps**:
1. Login as Tenant A
2. Obtain Supabase access token from localStorage:
   ```javascript
   const token = localStorage.getItem('sb-access-token')
   console.log('Token:', token)
   ```
3. Attempt direct payment insert via Supabase client:
   ```javascript
   const { data, error } = await supabase
     .from('rent_payment')
     .insert({
       tenantId: 'TENANT_A_USER_ID',
       landlordId: 'LANDLORD_A_ID',
       leaseId: 'LEASE_ID',
       amount: 100000, // $1000.00
       status: 'succeeded',
       paymentType: 'one_time',
       paidAt: new Date().toISOString()
     })

   console.log('Insert result:', data)
   console.log('Insert error:', error)
   ```

**Expected Result**:
- ❌ Error: `new row violates row-level security policy` OR similar RLS error
- ❌ Error code: `42501` (insufficient privilege)
- ✅ Payment NOT created
- ✅ RLS policy blocks INSERT (service_role only)

**Failure Indicators**:
- 🚨 Payment created successfully
- 🚨 `data` contains inserted payment
- 🚨 No error returned
- 🚨🚨🚨 **CRITICAL SECURITY VULNERABILITY**

---

### 3.2 - Direct Payment Update Prevention

**Steps**:
1. Login as Tenant A
2. Get existing payment ID:
   ```sql
   SELECT id FROM rent_payment WHERE tenantId = 'TENANT_A_USER_ID' LIMIT 1;
   ```
3. Attempt direct payment update:
   ```javascript
   const { data, error } = await supabase
     .from('rent_payment')
     .update({ amount: 1 }) // Change $1000 to $0.01
     .eq('id', 'PAYMENT_ID_HERE')

   console.log('Update result:', data)
   console.log('Update error:', error)
   ```

**Expected Result**:
- ❌ Error: RLS policy violation
- ✅ Payment NOT modified
- ✅ RLS policy blocks UPDATE (service_role only)

**Failure Indicators**:
- 🚨 Payment amount changed
- 🚨 `data` contains updated payment
- 🚨🚨🚨 **CRITICAL SECURITY VULNERABILITY**

---

### 3.3 - Backend Payment Creation (Positive Test)

**Objective**: Verify backend CAN create payments via service role

**Steps**:
1. Login as Tenant A
2. Use legitimate payment API endpoint:
   ```javascript
   fetch('https://api.tenantflow.app/api/v1/rent-payments/create', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       tenantId: 'TENANT_A_ID',
       leaseId: 'LEASE_ID',
       amount: 100000,
       paymentMethodId: 'pm_test_xxx'
     })
   })
   .then(r => r.json())
   .then(console.log)
   ```

**Expected Result**:
- ✅ Status: `200 OK` or `201 Created`
- ✅ Payment created successfully
- ✅ Backend uses service role (`getAdminClient()`)
- ✅ Response contains payment details

**Failure Indicators**:
- 🚨 Error: `403 Forbidden`
- 🚨 Payment not created
- 🚨 Backend misconfigured

---

### 3.4 - Stripe Webhook Payment Creation (Positive Test)

**Objective**: Verify webhooks can create payments

**Prerequisites**:
- Stripe CLI installed: `brew install stripe/stripe-cli/stripe`
- Stripe webhook forwarding: `stripe listen --forward-to localhost:3001/webhooks/stripe-sync`

**Steps**:
1. Trigger test webhook:
   ```bash
   stripe trigger checkout.session.completed \
     --add checkout_session:metadata.leaseId=LEASE_ID \
     --add checkout_session:metadata.tenantId=TENANT_ID
   ```
2. Check backend logs for webhook processing
3. Query database for payment record:
   ```sql
   SELECT * FROM rent_payment
   WHERE stripePaymentIntentId LIKE 'pi_%'
   ORDER BY createdAt DESC LIMIT 1;
   ```

**Expected Result**:
- ✅ Webhook received (logs show "Processing checkout.session.completed")
- ✅ Payment inserted in database
- ✅ Service role used (`getAdminClient()`)

**Failure Indicators**:
- 🚨 Webhook fails
- 🚨 Payment not created
- 🚨 RLS error in backend logs

---

## Test Scenario 4: Emergency Contact Isolation

**Objective**: Verify tenants can only CRUD their own emergency contacts

### 4.1 - Own Emergency Contact CRUD (Positive Test)

**Steps**:
1. Login as Tenant A
2. Create emergency contact:
   ```javascript
   const { data, error } = await supabase
     .from('tenant_emergency_contact')
     .insert({
       tenant_id: 'TENANT_A_TENANT_ID',
       contact_name: 'John Emergency',
       relationship: 'Father',
       phone_number: '+1234567890'
     })
     .select()

   console.log('Created:', data)
   ```
3. Update emergency contact:
   ```javascript
   const { data, error } = await supabase
     .from('tenant_emergency_contact')
     .update({ phone_number: '+0987654321' })
     .eq('id', 'CONTACT_ID')
     .select()

   console.log('Updated:', data)
   ```
4. Delete emergency contact:
   ```javascript
   const { error } = await supabase
     .from('tenant_emergency_contact')
     .delete()
     .eq('id', 'CONTACT_ID')

   console.log('Deleted:', !error)
   ```

**Expected Result**:
- ✅ CREATE: Success
- ✅ UPDATE: Success
- ✅ DELETE: Success
- ✅ RLS allows operations on own contacts

**Failure Indicators**:
- 🚨 Any operation fails with RLS error
- 🚨 Tenant cannot manage own contacts

---

### 4.2 - Cross-Tenant Emergency Contact Prevention

**Steps**:
1. Login as Tenant A
2. Attempt to create contact for Tenant B:
   ```javascript
   const { data, error } = await supabase
     .from('tenant_emergency_contact')
     .insert({
       tenant_id: 'TENANT_B_TENANT_ID', // Different tenant!
       contact_name: 'Hacked Contact',
       relationship: 'None',
       phone_number: '+1111111111'
     })

   console.log('Error:', error)
   ```

**Expected Result**:
- ❌ Error: RLS policy violation
- ✅ Contact NOT created

**Failure Indicators**:
- 🚨 Contact created successfully
- 🚨🚨 **SECURITY VULNERABILITY**

---

## Test Scenario 5: Property/Unit Ownership Boundaries

**Objective**: Verify landlords can only access their own properties and units

### 5.1 - Landlord A → Landlord B Property Prevention

**Steps**:
1. Login as Landlord A
2. Get Landlord B's property ID:
   ```sql
   SELECT id FROM property WHERE ownerId = 'LANDLORD_B_USER_ID' LIMIT 1;
   ```
3. Attempt to access Landlord B's property:
   ```javascript
   fetch(`https://api.tenantflow.app/api/v1/properties/${LANDLORD_B_PROPERTY_ID}`, {
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`
     }
   })
   .then(r => r.json())
   .then(console.log)
   ```

**Expected Result**:
- ❌ Response: `403 Forbidden` OR `404 Not Found`
- ✅ RLS blocks access

**Failure Indicators**:
- 🚨 Landlord B's property data returned
- 🚨 Status code `200`
- 🚨🚨 **SECURITY VULNERABILITY**

---

### 5.2 - Landlord A Cannot Create Unit in Landlord B Property

**Steps**:
1. Login as Landlord A
2. Attempt to create unit in Landlord B's property:
   ```javascript
   const { data, error } = await supabase
     .from('unit')
     .insert({
       propertyId: 'LANDLORD_B_PROPERTY_ID',
       unitNumber: 'HACKED-101',
       bedrooms: 2,
       bathrooms: 1,
       status: 'AVAILABLE'
     })

   console.log('Error:', error)
   ```

**Expected Result**:
- ❌ Error: RLS policy violation
- ✅ Unit NOT created

**Failure Indicators**:
- 🚨 Unit created successfully
- 🚨🚨 **SECURITY VULNERABILITY**

---

## Test Scenario 6: Role-Based Access Control (RBAC)

**Objective**: Verify guards properly enforce role restrictions

### 6.1 - Tenant Cannot Access Landlord API

**Steps**:
1. Login as Tenant A
2. Get JWT token:
   ```javascript
   const token = localStorage.getItem('sb-access-token')
   ```
3. Attempt to access landlord-only endpoint:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://api.tenantflow.app/api/v1/properties
   ```

**Expected Result**:
- ❌ Status: `403 Forbidden`
- ❌ Error: `Insufficient permissions` OR `Access denied`
- ✅ `@Roles('LANDLORD')` guard blocks access

**Failure Indicators**:
- 🚨 Status: `200 OK`
- 🚨 Properties returned
- 🚨🚨 **RBAC BYPASS**

---

### 6.2 - Landlord Cannot Access Tenant Portal API

**Steps**:
1. Login as Landlord A
2. Attempt to access tenant-only endpoint:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" \
     https://api.tenantflow.app/api/v1/tenant-portal/dashboard
   ```

**Expected Result**:
- ❌ Status: `403 Forbidden`
- ✅ `@Roles('TENANT')` guard blocks access

**Failure Indicators**:
- 🚨 Status: `200 OK`
- 🚨 Tenant dashboard data returned

---

## Verification Checklist

Use this checklist to track test completion:

### Tenant Isolation
- [ ] 1.1 - Profile access isolation ✅
- [ ] 1.2 - Lease access isolation ✅
- [ ] 1.3 - Payment history isolation ✅
- [ ] 1.4 - Emergency contact isolation ✅

### Privilege Escalation Prevention
- [ ] 2.1 - Dashboard access prevention ✅
- [ ] 2.2 - Property management prevention ✅
- [ ] 2.3 - Tenant management prevention ✅

### Payment Security
- [ ] 3.1 - Direct payment INSERT prevention (CRITICAL) ✅
- [ ] 3.2 - Direct payment UPDATE prevention (CRITICAL) ✅
- [ ] 3.3 - Backend payment creation (positive test) ✅
- [ ] 3.4 - Webhook payment creation (positive test) ✅

### Emergency Contact Security
- [ ] 4.1 - Own contact CRUD (positive test) ✅
- [ ] 4.2 - Cross-tenant contact prevention ✅

### Property Ownership
- [ ] 5.1 - Cross-landlord property access prevention ✅
- [ ] 5.2 - Cross-landlord unit creation prevention ✅

### RBAC
- [ ] 6.1 - Tenant → Landlord API prevention ✅
- [ ] 6.2 - Landlord → Tenant API prevention ✅

---

## Test Results Template

**Date**: _____________
**Tester**: _____________
**Environment**: [ ] Local [ ] Staging [ ] Production

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | Profile isolation | [ ] PASS [ ] FAIL |  |
| 1.2 | Lease isolation | [ ] PASS [ ] FAIL |  |
| 1.3 | Payment isolation | [ ] PASS [ ] FAIL |  |
| 1.4 | Emergency contact isolation | [ ] PASS [ ] FAIL |  |
| 2.1 | Dashboard access prevention | [ ] PASS [ ] FAIL |  |
| 2.2 | Property mgmt prevention | [ ] PASS [ ] FAIL |  |
| 2.3 | Tenant mgmt prevention | [ ] PASS [ ] FAIL |  |
| 3.1 | Payment INSERT prevention | [ ] PASS [ ] FAIL | **CRITICAL** |
| 3.2 | Payment UPDATE prevention | [ ] PASS [ ] FAIL | **CRITICAL** |
| 3.3 | Backend payment creation | [ ] PASS [ ] FAIL |  |
| 3.4 | Webhook payment creation | [ ] PASS [ ] FAIL |  |
| 4.1 | Own contact CRUD | [ ] PASS [ ] FAIL |  |
| 4.2 | Cross-tenant contact prevention | [ ] PASS [ ] FAIL |  |
| 5.1 | Cross-landlord property access | [ ] PASS [ ] FAIL |  |
| 5.2 | Cross-landlord unit creation | [ ] PASS [ ] FAIL |  |
| 6.1 | Tenant → Landlord RBAC | [ ] PASS [ ] FAIL |  |
| 6.2 | Landlord → Tenant RBAC | [ ] PASS [ ] FAIL |  |

**Summary**:
- Total Tests: 17
- Passed: _____ / 17
- Failed: _____ / 17
- Critical Failures: _____ / 2

**Sign-off**: _____________
**Date**: _____________

---

## Automated Test Execution

For automated verification, run integration tests:

```bash
# Backend RLS integration tests
cd apps/backend
pnpm test:integration rls/

# Expected output:
# ✓ Payment isolation tests (15 tests)
# ✓ Tenant isolation tests (13 tests)
# ✓ Property isolation tests (18 tests)
# Total: 46+ tests passing
```

---

## Incident Response

If any test **FAILS**:

1. **Immediate Actions**:
   - Document the failure with screenshots
   - Note exact steps to reproduce
   - Check backend logs for errors

2. **Critical Failures (Payment INSERT/UPDATE)**:
   - 🚨 **STOP DEPLOYMENT IMMEDIATELY**
   - Escalate to security team
   - Rollback recent changes
   - Review RLS policies

3. **Non-Critical Failures**:
   - File GitHub issue with test details
   - Assign to relevant team member
   - Track in Phase 3 documentation

---

## Next Steps

After completing all tests:

1. ✅ Fill out test results template
2. ✅ Document any failures or anomalies
3. ✅ Update Phase 3 status document
4. ✅ Create production deployment checklist
5. ✅ Schedule security review meeting

---

**End of Security Verification Guide**
