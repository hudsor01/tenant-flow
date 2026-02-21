# Project State: TenantFlow

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-21 — Milestone v7.0 started (Backend Elimination: NestJS → Supabase Direct)

Progress: ░░░░░░░░░░ 0% (0 of N v7.0 phases done)

## Active Milestone

**v7.0 Backend Elimination: NestJS → Supabase Direct — IN PROGRESS**

Eliminate NestJS/Railway entirely. Migrate all frontend API calls to Supabase PostgREST direct. Move Stripe webhooks, PDF, DocuSeal to Edge Functions. Add pg_cron for scheduled jobs. Wire n8n via DB Webhooks. Delete apps/backend/.

### Completed This Milestone

None yet.

### Pending This Milestone

TBD — roadmap being defined.

## Accumulated Context

### Key Decisions (carried forward)

- RLS: `owner_user_id = (SELECT auth.uid())` with index on `owner_user_id` (ADR-0005)
- Soft-delete: properties set to `status: 'inactive'`, filter with `.neq('status', 'inactive')`
- Stripe: Platform billing via Stripe Subscriptions; rent collection via Stripe Connect Express
- Property images: direct Supabase Storage upload from frontend, `property_images` table tracks metadata
- E2E auth: `storageState` injects cookies — do NOT call `loginAsOwner()` in tests using the chromium project
- **NEW**: No NestJS. Frontend uses supabase-js PostgREST directly. Edge Functions for Stripe/PDF/DocuSeal.
- **NEW**: pg_cron for scheduled jobs (late fees, reminders). DB Webhooks → n8n for background workflows.

### Architecture Transition

**From:** Frontend → apiRequest() → NestJS (Railway) → Supabase PostgREST
**To:** Frontend → supabase-js → Supabase PostgREST (RLS enforced)
                                ↳ Edge Functions (Stripe, PDF, DocuSeal)
                                ↳ pg_cron (scheduled jobs)
                                ↳ DB Webhooks → k3s n8n

### Known Gaps

- All frontend hooks using `apiRequest()` need to be migrated to `supabase.from()` calls
- Stripe webhook handler (NestJS) needs to become an Edge Function
- StirlingPDF and DocuSeal calls (NestJS services) need to become Edge Functions
- pg_cron jobs need to be created for late fee calculation and rent reminders
- DB Webhook configurations need to be set up for n8n triggers
- All NestJS backend unit tests (2229+) will be deleted as part of cleanup

## Roadmap Evolution

- Milestone v3.0 created: Backend Architecture Excellence, 8 phases (18-25)
- Milestone v4.0 created: Production-Parity Testing & Observability, 7 phases (26-32)
- Milestone v5.0 created: Production Hardening & Revenue Completion, 5 phases (33-37)
- Milestone v6.0 created: Production Grade Completion, 12 phases (38-49)
- Milestone v6.0 shipped: 2026-02-20 — all 12 phases complete
- Milestone v7.0 started: 2026-02-21 — Backend Elimination: NestJS → Supabase Direct

## Session Continuity

Last session: 2026-02-21
Completed: v6.0 shipped; decided to eliminate NestJS; starting v7.0 milestone definition
Resume file: None
