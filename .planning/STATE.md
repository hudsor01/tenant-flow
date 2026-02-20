# Project State: TenantFlow

## Current Position

Phase: 37 of 37 (Financial Wiring)
Plan: Completed
Status: v5.0 Milestone Complete
Last activity: 2026-02-19 — All phases 33-37 executed and committed

Progress: ██████████ 100%

## Active Milestone

**v5.0 Production Hardening & Revenue Completion**

Phases 33-37. Focus: close the gap between what exists in the codebase and what customers can actually use.

## Accumulated Context

### Key Decisions (carried from v4.0)

- Auth: Supabase session cookie → `Authorization: Bearer` header to NestJS (ADR-0004)
- Per-request Supabase user client via `accessToken` callback (ADR-0004)
- RLS: `owner_user_id = (SELECT auth.uid())` with index on `owner_user_id` (ADR-0005)
- Soft-delete: properties set to `status: 'inactive'`, filter with `.neq('status', 'inactive')`
- Stripe: Platform billing via Stripe Subscriptions; rent collection via Stripe Connect Express
- Property images: direct Supabase Storage upload from frontend, `property_images` table tracks metadata
- E2E auth: `storageState` injects cookies — do NOT call `loginAsOwner()` in tests using the chromium project

### Known Gaps (from smoke test analysis, 2026-02-18)

1. **Stripe Connect** — backend endpoints exist, frontend hooks exist, but `ConnectOnboardingDialog` is misplaced in tenant route and owner has no visible CTA to start Connect onboarding
2. **Subscription enforcement** — Free tier users can access Pro features; plan limits not enforced at API or UI level
3. **Tenant rent payment** — portal is incomplete; tenants cannot pay rent end-to-end
4. **Financial page data** — pages may show empty/placeholder content despite data existing

### Blockers / Concerns Carried Forward

None at milestone start.

## Roadmap Evolution

- Milestone v3.0 created: Backend Architecture Excellence, 8 phases (18-25)
- Milestone v4.0 created: Production-Parity Testing & Observability, 7 phases (26-32)
- Milestone v5.0 created: Production Hardening & Revenue Completion, 5 phases (33-37)

## Session Continuity

Last session: 2026-02-19
Completed: Milestone v5.0 — all 5 phases (33-37) complete
Resume file: None
