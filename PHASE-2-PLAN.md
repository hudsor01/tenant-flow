# Phase 2 Implementation Plan

**Date**: 2025-02-15
**Status**: In Progress
**Branch**: `claude/tenantflow-remediation-roadmap-011CUozGzgcgZiJWHdZYoQYc`

## Overview

Phase 2 focuses on completing frontend implementation gaps and adding RLS boundary tests to ensure security isolation.

---

## Priority 1: Profile & Settings Mutations

### Task 2.1: Emergency Contact Backend Implementation

**Status**: 🔄 Not Started

**Scope**:
1. Create `tenant_emergency_contact` table migration
2. Add RLS policies (tenant can CRUD their own emergency contact)
3. Create backend endpoints (GET, POST, PUT, DELETE)
4. Create frontend hooks (`useEmergencyContact`, `useUpdateEmergencyContact`)
5. Wire up frontend UI to hooks

**Files to Create**:
- `supabase/migrations/YYYYMMDD_create_tenant_emergency_contact.sql`
- `apps/backend/src/modules/tenants/dto/emergency-contact.dto.ts`
- `apps/backend/src/modules/tenants/tenants.controller.ts` (add endpoints)
- `apps/backend/src/modules/tenants/tenants.service.ts` (add methods)
- `apps/frontend/src/hooks/api/use-emergency-contact.ts`

**Files to Modify**:
- `apps/frontend/src/app/(protected)/tenant/profile/page.tsx`

**Acceptance Criteria**:
- [ ] Migration applied successfully
- [ ] RLS policies prevent cross-user access
- [ ] Backend endpoints tested
- [ ] Frontend can add/edit/delete emergency contact
- [ ] Data persists and displays correctly

---

### Task 2.2: Notification Preferences Backend Implementation

**Status**: 🔄 Not Started

**Scope**:
1. Add `notification_preferences` JSONB column to `tenant` table
2. Create backend endpoints (GET, PUT)
3. Create frontend hooks (`useNotificationPreferences`, `useUpdateNotificationPreferences`)
4. Wire up toggle switches to hooks

**Files to Create**:
- `supabase/migrations/YYYYMMDD_add_notification_preferences.sql`
- `apps/backend/src/modules/tenants/dto/notification-preferences.dto.ts`
- `apps/frontend/src/hooks/api/use-notification-preferences.ts`

**Files to Modify**:
- `apps/backend/src/modules/tenants/tenants.controller.ts`
- `apps/backend/src/modules/tenants/tenants.service.ts`
- `apps/frontend/src/app/(protected)/tenant/profile/page.tsx`

**Acceptance Criteria**:
- [ ] Migration applied successfully
- [ ] Backend endpoints tested
- [ ] Toggle switches save preferences
- [ ] Preferences persist and load correctly
- [ ] Default preferences applied for new users

---

### Task 2.3: Password Change Flow

**Status**: 🔄 Not Started

**Scope**:
1. Create password change dialog component
2. Use Supabase `updateUser()` with password field
3. Add validation (current password, new password, confirm password)
4. Integrate with profile page

**Files to Create**:
- `apps/frontend/src/components/auth/change-password-dialog.tsx`

**Files to Modify**:
- `apps/frontend/src/app/(protected)/tenant/profile/page.tsx`
- `apps/frontend/src/hooks/api/use-supabase-auth.ts` (add `useChangePassword` hook)

**Acceptance Criteria**:
- [ ] Dialog opens from "Change Password" button
- [ ] Validates password requirements
- [ ] Updates password via Supabase
- [ ] Shows success/error messages
- [ ] Closes dialog on success

---

## Priority 2: Payment Status Tracking

### Task 2.4: Real Payment Status from Backend

**Status**: 🔄 Not Started

**Scope**:
1. Audit backend rent_payment status tracking
2. Create endpoint to get current payment status for tenant
3. Replace date-based logic with real backend data
4. Add proper status badges (PAID, DUE, OVERDUE, PENDING)

**Files to Create**:
- `apps/backend/src/modules/rent-payments/dto/payment-status.dto.ts`

**Files to Modify**:
- `apps/backend/src/modules/rent-payments/rent-payments.controller.ts`
- `apps/backend/src/modules/rent-payments/rent-payments.service.ts`
- `apps/frontend/src/hooks/api/use-rent-payments.ts`
- `apps/frontend/src/app/(protected)/tenant/payments/page.tsx`

**Acceptance Criteria**:
- [ ] Backend returns accurate payment status
- [ ] Frontend displays correct status
- [ ] Overdue payments clearly marked
- [ ] Paid payments show as up-to-date
- [ ] Status updates in real-time

---

## Priority 3: RLS Boundary Tests

### Task 2.5: Frontend Integration RLS Tests

**Status**: 🔄 Not Started

**Scope**:
1. Create test utilities for multi-user authentication
2. Implement cross-user isolation tests
3. Implement role-based access tests
4. Test payment method isolation (PCI requirement)

**Files to Create**:
- `apps/frontend/tests/integration/rls/payment-isolation.test.tsx`
- `apps/frontend/tests/integration/rls/tenant-isolation.test.tsx`
- `apps/frontend/tests/integration/rls/role-based-access.test.tsx`
- `apps/frontend/tests/integration/utils/multi-user-auth.ts`

**Test Cases**:
```typescript
describe('RLS: Payment Isolation', () => {
  it('prevents tenant A from viewing tenant B payments')
  it('prevents tenant from viewing landlord payment methods')
  it('allows landlord to view their properties payments')
})

describe('RLS: Tenant Isolation', () => {
  it('prevents tenant A from viewing tenant B profile')
  it('prevents tenant A from accessing tenant B documents')
  it('prevents tenant A from viewing tenant B lease')
})

describe('RLS: Role-Based Access', () => {
  it('prevents tenant from accessing landlord dashboard')
  it('prevents tenant from viewing other properties')
  it('allows landlord to view all their tenants')
})
```

**Acceptance Criteria**:
- [ ] Multi-user test utilities created
- [ ] At least 10 boundary tests passing
- [ ] All critical RLS policies tested
- [ ] Test results documented

---

## Implementation Order

**Week 1 - Core Mutations**:
1. Task 2.3: Password Change (Fastest, no DB changes)
2. Task 2.2: Notification Preferences (Simple JSONB column)
3. Task 2.1: Emergency Contact (New table + full CRUD)

**Week 2 - Status & Testing**:
4. Task 2.4: Real Payment Status Tracking
5. Task 2.5: RLS Boundary Tests

---

## Success Metrics

**Phase 2 Complete When**:
- ✅ All profile mutations functional
- ✅ Emergency contacts fully implemented
- ✅ Notification preferences functional
- ✅ Password change working
- ✅ Real payment status tracking
- ✅ RLS boundary tests passing (>10 tests)
- ✅ All unit tests passing
- ✅ Integration tests passing
- ✅ Documentation updated

---

## Risk Assessment

**Low Risk**:
- Password change (Supabase native)
- Notification preferences (JSONB column)

**Medium Risk**:
- Emergency contact (new table, CRUD, RLS)
- Payment status tracking (existing data, query optimization)

**Low Risk but Time-Consuming**:
- RLS boundary tests (test infrastructure setup)

---

## Current Status

**Phase 1**: ✅ Complete
- RLS policies for payments
- RPC security fixes
- Testing infrastructure
- Tenant portal lease data

**Phase 2**: 🔄 In Progress
- Starting with Task 2.3 (Password Change)
- Will proceed systematically through all tasks

---

## Next Steps

1. Start with Task 2.3 (Password Change) - Fastest win
2. Commit and push after each task completion
3. Run tests after each implementation
4. Update this document with progress
