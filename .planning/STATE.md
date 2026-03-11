---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Stub Elimination
status: executing
stopped_at: Completed 23-02-PLAN.md
last_updated: "2026-03-11T22:22:22Z"
last_activity: 2026-03-11 -- Completed 23-02 (PDF preview/export wiring)
progress:
  total_phases: 5
  completed_phases: 3
  total_plans: 6
  completed_plans: 6
  percent: 95
---

# Project State: TenantFlow

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-11)

**Core value:** A landlord can add a property, invite a tenant, collect rent, and see their financials -- without touching a spreadsheet or calling anyone.
**Current focus:** v1.3 Stub Elimination -- Phase 23 (Document Templates)

## Current Position

Milestone: v1.3 Stub Elimination
Phase: 23 of 25 (Document Templates) -- COMPLETE
Plan: 2 of 2
Status: Phase Complete
Last activity: 2026-03-11 -- Completed 23-02 (PDF preview/export wiring)

Progress: [█████████░] 95%

## Shipped Milestones

| Version | Name | Phases | Plans | Shipped |
|---------|------|--------|-------|---------|
| v1.0 | Production Hardening | 10 | 60 | 2026-03-07 |
| v1.1 | Blog Redesign & CI | 5 | 8 | 2026-03-08 |
| v1.2 | Production Polish & Code Consolidation | 5 | 18 | 2026-03-11 |

## Accumulated Context

### Decisions

- Edge Functions use `validateEnv()` from `_shared/env.ts`, `errorResponse()` from `_shared/errors.ts`, `rateLimit()` from `_shared/rate-limit.ts`
- Archive-then-delete pattern for all data retention
- GDPR anonymization uses 30-day grace period with `request_account_deletion()` / `cancel_account_deletion()` RPCs
- Email sent via Resend through Edge Functions (auth-email-send pattern)
- Supabase Storage for file uploads (property images pattern exists)
- DocuSeal/StirlingPDF accessible from Edge Functions via internal k3s URLs
- Authenticated Edge Functions (JWT required) do not need IP-based rate limiting -- only unauthenticated endpoints get rateLimit()
- tenantInvitationEmail is distinct from invitationEmail -- former for owner tenant invites, latter for Supabase Auth invites
- [Phase 21]: Non-fatal Edge Function email pattern: await fetch(...).catch() preserves DB record if email fails
- [Phase 22]: Service role client for data export queries (bypass RLS for complete data, JWT still validated first)
- [Phase 22]: Pre-fetch ID pattern for parallel .in() queries (lease IDs, maintenance IDs fetched before main batch)
- [Phase 22]: authKeys.deletionStatus() extends auth query key factory for GDPR deletion status (shared across owner + tenant)
- [Phase 22]: Edge Function blob download pattern: fetch -> blob -> createObjectURL -> programmatic anchor click
- [Phase 23]: PostgREST upsert with onConflict for owner-scoped template definitions (jsonb custom_fields)
- [Phase 23]: buildTemplateHtml pure function with local escapeHtml + inline CSS for StirlingPDF isolation
- [Phase 23]: Preview uses direct fetch + blob URL for iframe; export reuses callGeneratePdfFromHtml pattern

### Stubs to Eliminate (v1.3 scope)

1. ~~Email invitation sending (Phase 21)~~ ✓
2. ~~GDPR data export (Phase 22)~~ ✓
3. ~~Self-service account deletion (Phase 22)~~ ✓
4. ~~PDF template preview/export (Phase 23)~~ ✓
5. ~~Template definition saving (Phase 23)~~ ✓
6. Bulk property import (Phase 24)
7. Maintenance photo upload (Phase 25)
8. Stripe Dashboard access (Phase 25)

## Session Continuity

Last session: 2026-03-11T22:22:22Z
Stopped at: Completed 23-02-PLAN.md (Phase 23 complete)
Resume file: None
