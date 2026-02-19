---
phase: 35-subscription-enforcement
plan: 01
subsystem: billing
provides: plan-limit-enforcement
affects: [37-financial-wiring]
key-files:
  - supabase/migrations/20260218120000_fix_plan_limits_real_tiers.sql
  - apps/backend/src/modules/properties/properties.service.ts
  - apps/backend/src/modules/tenants/tenant-platform-invitation.service.ts
  - packages/shared/src/config/pricing.ts (reference, not modified)
key-decisions:
  - Plan limits sourced from pricing.ts: FREETRIAL=1/10/5, STARTER=5/25/25, GROWTH=20/100/100, MAX=9999
  - Enforcement at service layer, not guard (guard only checks subscription existence)
  - Default to STARTER limits when no Stripe schema or no active subscription (allows local dev)
  - Frontend upgrade prompt already handled by mutation-error-handler.ts PLAN_LIMIT_EXCEEDED detection
---

# Phase 35 Plan 01 Summary: Subscription Enforcement

**Plan-based property and tenant limits enforced in backend; upgrade prompts handled in frontend.**

## Accomplishments

- Updated `get_user_plan_limits` RPC with real plan tiers derived from Stripe price IDs
- Added property count enforcement in `properties.service.ts` create method
- Added tenant count enforcement in `tenant-platform-invitation.service.ts` inviteToPlatform
- Fixed `mutation-error-handler.ts` already had `PLAN_LIMIT_EXCEEDED` → upgrade toast logic
- Fixed migration idempotency for `20260218035300_fix_property_images_table_rls.sql`
- All 18 properties service unit tests pass

## Files Created/Modified

- `supabase/migrations/20260218120000_fix_plan_limits_real_tiers.sql` — NEW: real plan limits
- `supabase/migrations/20260218035300_fix_property_images_table_rls.sql` — FIXED: idempotent DROP IF EXISTS
- `apps/backend/src/modules/properties/properties.service.ts` — plan limit check before insert
- `apps/backend/src/modules/tenants/tenant-platform-invitation.service.ts` — tenant count check
- `apps/backend/src/modules/properties/properties.service.spec.ts` — mock admin RPC + count query

## Key Findings

### What was already correct
- `handleMutationError` in frontend already handled `PLAN_LIMIT_EXCEEDED` with `/billing/plans` upgrade CTA
- `SubscriptionGuard` correctly provides the coarse-grained subscription check (has subscription or not)
- Tenant invitation mutation already used `handleMutationError`

### What was missing
- `get_user_plan_limits` returned hardcoded 100 properties for all users regardless of plan
- No count enforcement at property or tenant creation — only existence check
- The `subscriptions` table was dropped (`20251224093000`) — Stripe Sync Engine is source of truth

### Plan limit mapping (from pricing.ts)
| Plan | Properties | Units | Tenants | Storage |
|------|-----------|-------|---------|---------|
| FREETRIAL | 1 | 5 | 10 | 1 GB |
| STARTER | 5 | 25 | 25 | 10 GB |
| GROWTH | 20 | 100 | 100 | 50 GB |
| TENANTFLOW_MAX | 9999 | 9999 | 9999 | 100 GB |

Default when no Stripe subscription: STARTER (allows local dev to work)

## Next Step

Phase 35 complete. Ready for Phase 36: Tenant Onboarding Flow.
Update STATE.md: Phase 36, Plan 01, Ready to plan.
