---
phase: 36-tenant-onboarding
plan: 01
subsystem: tenant-portal
provides: tenant-onboarding-verified
affects: [37-financial-wiring]
key-files:
  - apps/frontend/src/app/(auth)/accept-invite/page.tsx
  - apps/frontend/src/app/(tenant)/tenant/onboarding/page.tsx
  - apps/frontend/src/app/(tenant)/tenant/payments/new/page.tsx
  - apps/backend/src/modules/tenants/tenant-invitation-token.service.ts
  - apps/backend/src/modules/tenant-portal/payments/payments.controller.ts
  - apps/backend/src/modules/tenants/tenant-platform-invitation.service.ts
key-decisions:
  - TenantAuthGuard uses DB lookup (not JWT claims) — JWT refresh NOT required for portal access
  - acceptToken already sets app_metadata.user_type = 'TENANT' AND verify email in one call
  - accept-invite page calls refreshSession() after acceptance — JWT is fresh before /tenant redirect
  - Pay rent uses payment_method_id (not Stripe Checkout redirect) — tenant must have saved PM first
  - Email system: tenant.platform_invitation.sent event -> notification handler -> BullMQ -> Resend
---

# Phase 36 Plan 01 Summary: Tenant Onboarding Flow

**Invitation flow fully wired, 3 UX gaps fixed and committed (d93a19e6f)**

## Accomplishments

1. Full audit of invitation -> accept -> activate -> portal flow — all steps verified working
2. Email sending confirmed — tenant.platform_invitation.sent event handled by NotificationEventHandlerService -> BullMQ -> Resend
3. TenantAuthGuard confirmed — uses database lookup, not JWT claims — no JWT refresh required
4. 3 bugs fixed and committed

## Files Modified

- apps/backend/src/modules/tenants/tenant-platform-invitation.service.ts — ForbiddenException re-throw fix
- apps/frontend/src/app/(tenant)/tenant/payments/new/page.tsx — payment method link + no-lease state

## Key Findings

| Component | Status | Notes |
|-----------|--------|-------|
| POST /tenants/invite | OK | Email sent via EventEmitter2 -> BullMQ -> Resend |
| GET /invitation/:token | OK | Public endpoint, returns full invitation details |
| POST /invitation/:token/accept | OK | Sets app_metadata.user_type + email_confirm |
| accept-invite/page.tsx | OK | refreshSession() called after acceptance |
| POST /tenants/activate | OK | Public endpoint, idempotent, sets user_type=TENANT |
| TenantAuthGuard | OK | DB lookup not JWT claims |
| GET /amount-due | OK | Calculates base + late fee correctly |
| Empty payment methods | FIXED | Friendly empty state with correct Add PM link |
| No active lease | FIXED | Friendly message instead of generic error |
| Plan limit ForbiddenException | FIXED | Now propagates correctly to frontend |

## Next Step

Phase 36 complete. Ready for Phase 37: Financial Page Wiring.
