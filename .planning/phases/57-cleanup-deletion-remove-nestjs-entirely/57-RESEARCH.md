# Phase 57: Cleanup & Deletion — Remove NestJS Entirely - Research

**Researched:** 2026-02-22
**Domain:** Monorepo cleanup, infrastructure teardown, migration completion
**Confidence:** HIGH — all findings are from direct codebase inspection

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Deletion sequencing (order):** (1) CI/CD cleanup, (2) monorepo config cleanup, (3) frontend remnants cleanup, (4) delete `apps/backend/`, (5) deploy + verify, (6) cancel Railway project/services
- **Monorepo config before deletion:** `pnpm-workspace.yaml`, `turbo.json` cleaned BEFORE `apps/backend/` is deleted
- **CI/CD before deletion:** GitHub Actions cleanup BEFORE directory deletion — prevents CI failures on the deletion PR
- **Railway cancellation:** AFTER merge + production verified + 5-minute post-deploy Sentry check
- **Frontend remnants:** All `apiRequest`/`apiRequestFormData`/`apiRequestRaw`/`API_BASE_URL` calls confirmed migrated; audit grep required before proceeding; auto-migrate unexpected references inline; do NOT halt
- **`apps/frontend/src/lib/api-client.ts`:** Deleted entirely (NOTE: file is actually `api-config.ts` — see research below)
- **Backend env vars:** Deleted completely — no historical preservation, no comments
- **Risk & Verification:** Full CI suite must pass before merging; check Sentry post-deploy; no new errors
- **Redis/BullMQ:** Queue audit REQUIRED before Railway teardown; Redis NOT canceled until queue migration confirmed
- **Railway offboarding:** Delete project + services only — keep account; audit GitHub Actions secrets for `RAILWAY_*` and document for manual removal; optionally export Railway env var names as audit trail
- **One PR vs staged PRs:** Claude's discretion

### Claude's Discretion

- Optimal deletion sequencing within locked order above
- Whether to use one PR or staged PRs
- Where to migrate BullMQ queues (n8n, pg_cron, or drop — choose most performant after audit)
- Whether to export Railway env var names before teardown

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CLEAN-01 | `apps/backend/` directory deleted from the monorepo | Full backend directory inventory complete; BullMQ queue audit complete; migration targets identified |
| CLEAN-02 | All NestJS backend unit tests (2229+) and integration tests deleted | 97+ `.spec.ts` files identified in `apps/backend/`; distinct from `apps/integration-tests/` (7 RLS tests — KEEP) |
| CLEAN-03 | CI/CD pipeline updated to remove NestJS build, test, and Railway deploy stages | `deploy-backend.yml` fully mapped; `ci-cd.yml` and `rls-security-tests.yml` partially reference backend |
| CLEAN-04 | Railway configuration removed; Railway env vars and `RAILWAY_*` references purged | `RAILWAY_TOKEN` secret in `deploy-backend.yml`; `railway.toml` and `Dockerfile` at root; `docker-compose.yml` has Redis + backend services |
| CLEAN-05 | Frontend `apiRequest`, `apiRequestFormData`, `apiRequestRaw`, `API_BASE_URL`, and backend-related env vars removed; `apps/backend` references in monorepo config cleaned up | 65+ frontend files with backend references fully catalogued with migration paths |
</phase_requirements>

---

## Summary

Phase 57 is a surgical deletion phase — no new capabilities, purely removing dead code and infrastructure. All prior migration phases (51–56) have migrated frontend hooks to Supabase PostgREST, Edge Functions, pg_cron, and n8n. The NestJS backend is no longer serving production traffic.

The main technical complexity is threefold: (1) The frontend still contains a large volume of legacy `apiRequest` callsites that are either dual-path (PostgREST + NestJS fallback via `isPostgrestEnabled()` flag), unmigrated (plain `apiRequest` calls in components and hooks), or infrastructure (the `api-request.ts`, `api-config.ts`, and `postgrest-flag.ts` files themselves). These must be cleanly removed. (2) The SSE provider (`sse-provider.tsx`, `sse-connection.ts`) is tightly coupled to `getApiBaseUrl()` and to the NestJS `/health/ready` and SSE endpoints — it needs complete removal or replacement. (3) The BullMQ queues require a disposition decision: the `emails` queue processes 7 email job types; the `stripe-webhooks` queue processes Stripe webhook events asynchronously. Both have clear migration paths to n8n (already wired) and the existing Stripe Edge Function, respectively.

**Primary recommendation:** Single deletion PR with the 6-step sequence from CONTEXT.md. Use the `isPostgrestEnabled()` pattern removal as the main cleanup signal — once that flag is gone, all remaining `apiRequest` fallback branches are dead code.

---

## Standard Stack

This phase does not introduce new libraries. It removes existing infrastructure.

### What Gets Deleted

| Component | Location | Size/Count |
|-----------|----------|------------|
| NestJS backend | `apps/backend/` | ~26k+ lines, 23 modules |
| Backend unit+integration tests | `apps/backend/**/*.spec.ts` | 97+ `.spec.ts` files |
| Backend integration tests | `apps/backend/test/integration/` | 6 integration spec files |
| Backend security tests | `apps/backend/test/security/` | 2 security spec files |
| Dockerfile (backend-only) | `Dockerfile` (root) | Builds NestJS only |
| Railway config | `railway.toml` | Root of repo |
| Docker Compose backend service | `docker-compose.yml` | `backend:` + `redis:` services |
| Deploy workflow | `.github/workflows/deploy-backend.yml` | Entire file — delete |
| Frontend API infrastructure | `apps/frontend/src/lib/api-request.ts` | 324 lines |
| Frontend API config | `apps/frontend/src/lib/api-config.ts` | 22 lines (NOTE: CONTEXT says `api-client.ts` but the actual file is `api-config.ts`) |
| Frontend PostgREST flag | `apps/frontend/src/lib/postgrest-flag.ts` | 17 lines |
| Frontend reports client | `apps/frontend/src/lib/api/reports-client.ts` | Uses `apiRequestRaw` |
| Frontend SSE provider | `apps/frontend/src/providers/sse-provider.tsx` + `sse-connection.ts` | Connects to NestJS SSE endpoint |

### What Is NOT Deleted

| Component | Location | Reason |
|-----------|----------|--------|
| Integration tests (RLS) | `apps/integration-tests/` | These are Supabase RLS tests, NOT NestJS tests — KEEP |
| `rls-security-tests.yml` | `.github/workflows/rls-security-tests.yml` | Runs `apps/integration-tests/` — update trigger only |
| `apps/frontend/src/lib/api/reports-client.ts` | May have non-NestJS uses | Inspect before deleting |
| Vercel `NEXT_PUBLIC_API_BASE_URL` env var | Vercel dashboard | Must be removed from Vercel project settings (not just code) |

---

## Architecture Patterns

### BullMQ Queue Audit Results (CRITICAL)

Two queues were found in the NestJS backend:

#### Queue 1: `emails`
**File:** `apps/backend/src/modules/email/email.queue.ts`
**Queue name:** `'emails'`
**Concurrency:** 5, Rate limit: 100/min

**Job types and migration targets:**

| Job Type | Description | Migration Target | Confidence |
|----------|-------------|-----------------|------------|
| `payment-success` | Email on successful Stripe payment | **n8n** — already wired for `rent_payments` INSERT via DB webhook (WF-01); add email node to existing workflow | HIGH |
| `payment-failed` | Email on failed Stripe payment | **n8n** — add new workflow triggered by Stripe webhook Edge Function → n8n HTTP; or add to Stripe webhooks EF | HIGH |
| `payment-reminder` | Email reminder before rent due | **n8n** — already wired to `lease_reminders` table via pg_cron + DB webhook (SCHED-02); add email node to `lease-reminder-notification.json` workflow | HIGH |
| `subscription-canceled` | Email on subscription cancellation | **n8n** — add new workflow triggered from Stripe webhook Edge Function | MEDIUM |
| `contact-form` | Email for contact form submissions | **n8n** — `contact-form.tsx` calls `API_BASE_URL/api/v1/contact`; migrate to Edge Function or Supabase Realtime; OR drop (low priority feature) | MEDIUM |
| `tenant-invitation` | Email when tenant is invited | **n8n** — `useResendInvitationMutation` / `useCancelInvitationMutation` in `use-tenant.ts` still on `apiRequest`; migrate to call n8n webhook directly from Edge Function | HIGH |
| `lease-signature` | Email when lease is sent for signing | **n8n** — DocuSeal already handles signing flow via Edge Function (Phase 55); lease signature notification already in Phase 55-02/55-03; this queue entry may be redundant | MEDIUM |

**Key insight:** Most email jobs have been replaced by n8n workflows in Phase 56. The remaining gaps (`payment-failed`, `subscription-canceled`, `contact-form`, `lease-signature`) need job-specific decisions. Since these are email notifications and n8n is already wired, the migration target is n8n with new or extended workflows.

#### Queue 2: `stripe-webhooks`
**File:** `apps/backend/src/modules/billing/webhooks/webhook-queue.processor.ts`
**Queue name:** `'stripe-webhooks'`
**Concurrency:** 10, Rate limit: 200/min

**What it does:** Queues incoming Stripe webhook events for async processing with retry support, DLQ alerting, and Sentry integration.

**Migration target:** This queue's work is already replaced by the `stripe-webhooks` Supabase Edge Function (Phase 54-03). The Edge Function handles Stripe events synchronously (within Stripe's 30-second timeout window). Retry is handled by Stripe's native retry mechanism (3 retries over 72 hours). **This queue can be dropped entirely** — the Edge Function is the replacement.

**Railway Redis:** The `emails` queue and `stripe-webhooks` queue both use the Railway-hosted Redis instance. Once both queues are confirmed replaced (n8n for emails, Stripe retry for webhooks), the Railway Redis service can be canceled along with the Railway project.

---

### Frontend `apiRequest` Call Site Audit (COMPLETE)

#### Infrastructure Files (DELETE entirely)

| File | Action |
|------|--------|
| `apps/frontend/src/lib/api-request.ts` | DELETE — entire file; exports `apiRequest`, `apiRequestFormData`, `apiRequestRaw`, `ApiError`, `isApiError`, `isAbortError` |
| `apps/frontend/src/lib/api-config.ts` | DELETE — entire file; exports `API_BASE_URL`, `getApiBaseUrl()` |
| `apps/frontend/src/lib/postgrest-flag.ts` | DELETE — entire file; exports `isPostgrestEnabled()` |
| `apps/frontend/src/lib/api/reports-client.ts` | DELETE — uses `apiRequestRaw`; report downloads already migrated to client-side CSV/PDF in Phase 53 |

**IMPORTANT NOTE:** CONTEXT.md says delete `apps/frontend/src/lib/api-client.ts` — this file does NOT exist. The actual file to delete is `apps/frontend/src/lib/api-config.ts`. The planner must use this corrected filename.

#### Hooks with Dual-Path (`isPostgrestEnabled()` guard) — Remove NestJS Branch

These hooks have both PostgREST and NestJS paths. The PostgREST path is the correct path. Remove the `isPostgrestEnabled()` check and NestJS fallback branch entirely:

| File | Reference Count | What to Remove |
|------|----------------|----------------|
| `apps/frontend/src/hooks/api/use-profile.ts` | 8 `isPostgrestEnabled` usages, 6 `apiRequest` calls | Remove all NestJS fallback branches; delete `apiRequest` import |
| `apps/frontend/src/hooks/api/use-notifications.ts` | 8 `isPostgrestEnabled`, 8 `apiRequest` calls | NOTE: All 8 calls appear to be in NestJS fallback branches — PostgREST path is already the primary; verify then remove NestJS branches |
| `apps/frontend/src/hooks/api/use-tour-progress.ts` | 4 `isPostgrestEnabled`, 4 `apiRequest` calls | Remove NestJS branches |
| `apps/frontend/src/hooks/api/use-emergency-contact.ts` | 4 `isPostgrestEnabled`, 4 `apiRequest` calls | Remove NestJS branches |
| `apps/frontend/src/hooks/api/use-sessions.ts` | 3 `isPostgrestEnabled`, 3 `apiRequest` calls | Remove NestJS branches; `useRevokeSessionMutation` for non-current sessions always falls back to `apiRequest` for Admin API — this needs a stub or `supabase.auth.admin` call |
| `apps/frontend/src/hooks/api/use-owner-notification-settings.ts` | 3 `isPostgrestEnabled`, 3 `apiRequest` calls | Remove NestJS branches |
| `apps/frontend/src/hooks/api/use-auth.ts` | 3 `isPostgrestEnabled`, 3 `apiRequest` calls | Remove NestJS branches |
| `apps/frontend/src/hooks/api/use-identity-verification.ts` | 2 `isPostgrestEnabled`, 3 `apiRequest` calls | Remove NestJS branches; `useCreateIdentityVerificationSessionMutation` stays NestJS by design (Phase 50-05 decision) — needs stub/throw |

#### Hooks with Remaining `apiRequest` Calls (NOT dual-path)

| File | Calls | Migration Path |
|------|-------|----------------|
| `apps/frontend/src/hooks/api/use-tenant.ts` | 2 calls: `useResendInvitationMutation`, `useCancelInvitationMutation` | Migrate to n8n webhook call or Supabase Edge Function |

#### Component-Level `apiRequest`/`API_BASE_URL` Calls

| File | Calls | Migration Path |
|------|-------|----------------|
| `apps/frontend/src/components/maintenance/detail/add-expense-dialog.tsx` | 1 (`apiRequest` to `/api/v1/maintenance/expenses`) | Migrate to `supabase.from('expenses').insert()` PostgREST |
| `apps/frontend/src/components/maintenance/kanban/maintenance-kanban.client.tsx` | 1 (`apiRequest` DELETE `/api/v1/maintenance/:id`) | Migrate to `supabase.from('maintenance_requests').delete()` |
| `apps/frontend/src/components/maintenance/table/maintenance-table.client.tsx` | 1 (`apiRequest` DELETE `/api/v1/maintenance/:id`) | Migrate to `supabase.from('maintenance_requests').delete()` |
| `apps/frontend/src/components/maintenance/detail/maintenance-details.client.tsx` | 1 (`apiRequest` GET expenses) | Migrate to `supabase.from('expenses').select()` |
| `apps/frontend/src/components/settings/billing-settings.tsx` | 1 (`apiRequest` to billing portal URL) | Migrate to `stripe-billing-portal` Edge Function (Phase 54) |
| `apps/frontend/src/components/settings/sections/billing-history-section.tsx` | 2 references | Inspect and migrate to `stripe-billing-portal` EF |
| `apps/frontend/src/components/settings/sections/subscription-cancel-section.tsx` | 2 references | Migrate to billing Edge Function |
| `apps/frontend/src/components/settings/sections/account-danger-section.tsx` | 2 (`fetch(${API_BASE_URL}/users/me/export` + DELETE) | Stub or migrate: export to client-side, delete to `supabase.auth.admin.deleteUser()` or throw unsupported |
| `apps/frontend/src/components/settings/account-data-section.tsx` | 2 (same pattern as above) | Same as `account-danger-section.tsx` — both implement same export/delete flow; dedup |
| `apps/frontend/src/components/settings/general-settings.tsx` | 2 references | Inspect and migrate |
| `apps/frontend/src/app/(owner)/settings/components/general-settings.tsx` | 2 references | Inspect and migrate |
| `apps/frontend/src/app/(owner)/settings/components/billing-settings.tsx` | 2 references | Inspect and migrate |
| `apps/frontend/src/components/contact/contact-form.tsx` | 1 (`fetch(${API_BASE_URL}/api/v1/contact`) | Drop the form endpoint or redirect to external form; no Supabase table for this |
| `apps/frontend/src/components/properties/bulk-import-stepper.tsx` | 1 (`apiRequestFormData` to `/api/v1/properties/bulk-import`) | Complex CSV import — migrate to PostgREST multi-insert or stubbed with error toast |
| `apps/frontend/src/components/onboarding/use-onboarding.ts` | 1 (`apiRequest` to `/api/v1/billing/onboarding`) | Migrate to billing Edge Function call |
| `apps/frontend/src/components/onboarding/onboarding-step-tenant.tsx` | 2 references | Inspect and migrate |
| `apps/frontend/src/components/pricing/customer-portal.tsx` | 1 (`fetch(${API_BASE_URL}/stripe/create-billing-portal-session`) | Migrate to `stripe-billing-portal` Edge Function |
| `apps/frontend/src/components/connect/connect-requirements.tsx` | 2 references | Likely references `stripe-connect` Edge Function — inspect |
| `apps/frontend/src/components/export/export-buttons.tsx` | 2 references | Check if using `apiRequestRaw` for report exports; migrate to `callExportEdgeFunction` pattern |
| `apps/frontend/src/app/auth/post-checkout/page.tsx` | 1 (`fetch(${API_BASE_URL}/billing/checkout-session/${sessionId}`) | Migrate to `stripe-checkout` Edge Function |
| `apps/frontend/src/app/(tenant)/tenant/payments/new/page.tsx` | 2 (`apiRequest` for payment methods + pay-rent) | Migrate to PostgREST + Stripe Connect Edge Function |
| `apps/frontend/src/app/(tenant)/tenant/settings/page.tsx` | 2 references | Inspect and migrate |
| `apps/frontend/src/app/(tenant)/tenant/onboarding/page.tsx` | 2 references | Inspect and migrate |
| `apps/frontend/src/app/(owner)/properties/page.tsx` | 2 references | Inspect and migrate |
| `apps/frontend/src/app/(owner)/tenants/page.tsx` | 2 references | Inspect and migrate |
| `apps/frontend/src/app/(owner)/documents/templates/components/use-template-pdf.ts` | 2 (`apiRequestRaw` + `apiRequest` for document templates/PDFs) | Migrate to `callGeneratePdfEdgeFunction` pattern (Phase 55-04) |
| `apps/frontend/src/app/(owner)/documents/templates/components/template-definition.ts` | 2 (`apiRequest` to `/documents/templates/:key/definition`) | Migrate to `supabase.from('document_templates').select()` or Edge Function |
| `apps/frontend/src/lib/stripe/stripe-client.ts` | 3 (`fetch(${API_BASE_URL}/api/v1/stripe/...`) | Migrate: `create-checkout-session` → `stripe-checkout` EF; `create-billing-portal` → `stripe-billing-portal` EF; `create-payment-intent` → Stripe Connect EF |

#### SSE Provider (SPECIAL CASE)

The `sse-provider.tsx` / `sse-connection.ts` / `sse-context.ts` trio connects to the NestJS SSE endpoint (`/notifications/sse`) via `getApiBaseUrl()`. This is a NestJS-only feature with no Supabase replacement yet.

**Migration decision:** The SSE provider must be **stripped of NestJS connectivity** in this phase. The provider should be kept as a stub (`SseProvider` renders children without connecting) since removing the context entirely would break all consumers of `useSse()`. All SSE-dispatched cache invalidation will fall back to TanStack Query's normal polling/invalidation — acceptable per REQUIREMENTS.md (polling is acceptable short-term for live updates).

Files to modify:
- `apps/frontend/src/providers/sse-connection.ts` — remove `getApiBaseUrl()` import; `waitForBackendReady` becomes no-op
- `apps/frontend/src/providers/sse-provider.tsx` — remove `getApiBaseUrl()` import; disable connection loop; keep context structure

#### Test Files with `apiRequest` References (MUST UPDATE)

| File | Action |
|------|--------|
| `apps/frontend/src/test/api-test-utils.tsx` | Update: remove `apiRequest` mocking utilities |
| `apps/frontend/src/test/unit-setup.ts` | Update: remove `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` mock if no longer needed |
| `apps/frontend/src/hooks/api/__tests__/use-tenant.test.tsx` | Update: remove `apiRequest` mock |
| `apps/frontend/src/hooks/api/__tests__/use-expenses.test.ts` | Update: remove `apiRequest` mock |
| `apps/frontend/src/hooks/api/__tests__/use-financial-overview.test.ts` | Update: remove `apiRequest` mock |
| `apps/frontend/src/components/maintenance/__tests__/maintenance-details.test.tsx` | Update: replace `apiRequest` mock with Supabase mock |
| `apps/frontend/src/app/(owner)/settings/__tests__/settings-page.test.tsx` | Update: replace `apiRequest` mock |
| `apps/frontend/src/components/tenants/__tests__/invite-tenant-form.property.test.tsx` | Update: replace `apiRequest` mock |
| `apps/frontend/src/components/tenants/__tests__/invite-tenant-form-success.property.test.tsx` | Update: replace `apiRequest` mock |

---

### CI/CD Workflow Audit

#### Files to DELETE entirely

| File | Reason |
|------|--------|
| `.github/workflows/deploy-backend.yml` | Entire deploy pipeline for Railway — entirely backend-specific |

#### Files to UPDATE

| File | Changes Required |
|------|-----------------|
| `.github/workflows/ci-cd.yml` | Line 33: remove `pnpm --filter @repo/backend test:unit &&` from `test-script` — keep only frontend tests |
| `.github/workflows/rls-security-tests.yml` | Line 7: remove `apps/backend/**` trigger path (RLS tests now in `apps/integration-tests/`); Line 62: change `pnpm --filter @repo/backend test:security` to `pnpm --filter @repo/integration-tests test:rls` |

#### GitHub Actions Secrets to Remove Manually

The following secrets exist in the GitHub repo and must be removed manually from GitHub Settings → Secrets and Variables → Actions:

| Secret | Used In | Action |
|--------|---------|--------|
| `RAILWAY_TOKEN` | `deploy-backend.yml` | DELETE from GitHub repo secrets |
| `SENTRY_AUTH_TOKEN` | `deploy-backend.yml` | Keep (also used by frontend Sentry if configured) |
| `SENTRY_ORG` | `deploy-backend.yml` | Keep (shared) |
| `SENTRY_PROJECT` | `deploy-backend.yml` | Check — may need to update to frontend project |

---

### Monorepo Config Cleanup

#### `pnpm-workspace.yaml`

The workspace uses `apps/*` glob — `apps/backend/` is included implicitly, not explicitly. However, the **catalog section** has NestJS packages that exist only for the backend:

```yaml
catalog:
  '@nestjs/common': ^11.1.7       # DELETE
  '@nestjs/core': ^11.1.7         # DELETE
  '@nestjs/platform-express': ^11.1.7  # DELETE
  '@nestjs/swagger': ^11.2.3      # DELETE
  '@nestjs/terminus': ^11.0.0     # DELETE
  '@types/jest': 30.0.0           # KEEP (used by integration-tests)
```

NOTE: `pnpm-workspace.yaml` uses `apps/*` glob. After `apps/backend/` is deleted, pnpm will automatically stop including it. No explicit removal needed for the glob itself. Only the catalog entries above need removing.

#### `turbo.json`

No explicit `apps/backend` or `@repo/backend` references found in `turbo.json`. The tasks are generic (`build`, `test:unit`, etc.). No changes needed.

#### Root `package.json`

Scripts to remove or update:

| Script | Action |
|--------|--------|
| `"dev:backend"` | DELETE |
| `"build:backend"` | DELETE |
| `"test:unit:backend"` | DELETE |
| `"test:unit:watch"` | DELETE |
| `"test:unit:coverage"` | DELETE |
| `"test:integration"` | DELETE |
| `"test:integration:watch"` | DELETE |
| `"validate:clean"` | UPDATE: remove `--filter @repo/backend test:unit` |
| `"validate"` | UPDATE: remove `pnpm test:integration &&` |
| `"test"` | UPDATE: remove `test:integration` from turbo run |
| `"test:all"` | UPDATE: remove `pnpm test:integration &&` |
| `"test:ci"` | UPDATE: remove `test:integration` from turbo run |
| `"stripe:migrate"` | DELETE |
| `"docker:test"` | DELETE (or keep if docker-compose is retained for postgres) |
| `"docker:up"` | UPDATE — remove backend/redis or delete if no longer needed |
| `"docker:down"` | UPDATE — same |

#### `CLAUDE.md` references

`CLAUDE.md` contains backend patterns, ADR references, and backend directory structure that should be cleaned up. However, this is documentation — treat as low priority cleanup after functional deletion is complete.

---

### Root-Level Files to Delete

| File | Reason |
|------|--------|
| `Dockerfile` | Builds NestJS backend only — entirely backend-specific |
| `railway.toml` | Railway deployment config |
| `docker-compose.yml` | Has `backend:` service + `redis:` service; `postgres:` service may be useful for local dev — evaluate whether to keep postgres-only version |
| `.dockerignore` | Backend Docker build only |

**Note on `docker-compose.yml`:** The `postgres` service in docker-compose is used for integration tests and local dev (`DATABASE_URL` env var). After NestJS deletion, the `apps/integration-tests/` Supabase RLS tests connect directly to the hosted Supabase project (not local postgres). The entire `docker-compose.yml` can be deleted unless there's a non-backend use case.

---

### Frontend `env.ts` Cleanup

Lines to remove from `apps/frontend/src/env.ts`:

```typescript
// DELETE this entire client variable:
NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url('NEXT_PUBLIC_API_BASE_URL must be a valid URL'),

// DELETE from runtimeEnv:
NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,

// EVALUATE for deletion:
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY // Used by supabase/proxy.ts — check if still needed
NEXT_PUBLIC_USE_POSTGREST            // Feature flag — DELETE after NestJS removal
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is used in: `env.ts`, `unit-setup.ts`, `tenant/onboarding/page.tsx`, `auth/callback/route.ts`, `app/actions/auth.ts`, `lib/utils.ts`, `lib/supabase/proxy.ts`. It is NOT the JWT anon key — it's the `sb_publishable_*` key that the backend was using. After NestJS removal, this may be safe to remove if `supabase/proxy.ts` is also removed. **Requires verification during implementation.**

Vercel environment variables to remove from Vercel project settings:
- `NEXT_PUBLIC_API_BASE_URL` (required env var, will cause build failure if not removed from `env.ts` first)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (if removed from `env.ts`)
- `NEXT_PUBLIC_USE_POSTGREST` (feature flag — no longer needed)

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Queue migration validation | Custom tracking system | Check n8n workflows in `supabase/n8n-workflows/` — already wired in Phase 56 | Workflows already exist |
| Email job replacement | New email service | n8n workflows with Resend/SMTP nodes — already architected in Phase 56 | n8n is the email delivery layer |
| Stripe webhook retry | Custom retry logic | Stripe's native 3-retry mechanism + Edge Function sync processing | Stripe handles retries |

---

## Common Pitfalls

### Pitfall 1: Deleting `apps/integration-tests/` along with `apps/backend/`
**What goes wrong:** The `apps/integration-tests/` directory contains 7 Supabase RLS tests that are **not** NestJS tests. They test Row Level Security policies directly against the Supabase DB using `@supabase/supabase-js`.
**How to avoid:** Only delete `apps/backend/`. Keep `apps/integration-tests/` intact.
**Warning sign:** `apps/integration-tests/package.json` has NO `@nestjs` dependencies — only `@supabase/supabase-js` and `jest`.

### Pitfall 2: Build fails because `env.ts` still requires `NEXT_PUBLIC_API_BASE_URL`
**What goes wrong:** After deleting `api-config.ts`, the Vercel build fails because `env.ts` still validates `NEXT_PUBLIC_API_BASE_URL` as required, and the env var is gone.
**How to avoid:** Remove `NEXT_PUBLIC_API_BASE_URL` from `env.ts` before or in the same commit as removing `api-config.ts`. Update Vercel env vars before deploying.

### Pitfall 3: TypeScript errors from `ApiError` / `isApiError` imports
**What goes wrong:** `query-error-handler.ts` imports `isApiError` and `isAbortError` from `#lib/api-request`. Deleting `api-request.ts` breaks this file.
**How to avoid:** Update `query-error-handler.ts` to remove `ApiError`-based retry logic (or inline the needed error classification). The `ApiError` class can be simplified since all errors going forward are `PostgrestError`.

### Pitfall 4: SSE context consumers break after removing SSE connection
**What goes wrong:** `useSse()` consumers throughout the app will receive null context or throw.
**How to avoid:** Keep `sse-provider.tsx` as a stub that provides the context with `connectionState: 'idle'` and no-op `subscribe`/`reconnect`. Do NOT delete the context entirely.

### Pitfall 5: `rls-security-tests.yml` runs backend test command after directory deletion
**What goes wrong:** CI runs `pnpm --filter @repo/backend test:security` but `apps/backend/` no longer exists.
**How to avoid:** Update `rls-security-tests.yml` to run `pnpm --filter @repo/integration-tests test:rls` instead, and update the path trigger to `apps/integration-tests/**` instead of `apps/backend/**`.

### Pitfall 6: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` removal breaks auth
**What goes wrong:** The `sb_publishable_*` key was used by the NestJS backend (ADR: `MEMORY.md` documents this is NOT a JWT). If `supabase/proxy.ts` still uses it for auth routing, removing it could break authentication.
**How to avoid:** Audit `apps/frontend/src/lib/supabase/proxy.ts` carefully. If it serves as a browser Supabase client initialization path with the publishable key, it may need to be migrated to the anon key pattern used everywhere else.

### Pitfall 7: `docker-compose.yml` removal breaks local integration test setup
**What goes wrong:** Some developer workflow or CI step may use `docker compose up -d` for a local postgres.
**How to avoid:** Integration tests in `apps/integration-tests/` connect to the hosted Supabase project via env vars (`NEXT_PUBLIC_SUPABASE_URL`), not local docker postgres. Safe to delete docker-compose. Verify by checking `apps/integration-tests/src/setup/supabase-client.ts`.

---

## Code Examples

### Sequence: CI/CD cleanup before directory deletion (locked order)

```bash
# Step 1: Delete deploy-backend.yml entirely
git rm .github/workflows/deploy-backend.yml

# Step 2: Update ci-cd.yml test-script to remove backend filter
# Before: 'pnpm --filter @repo/backend test:unit && pnpm --filter @repo/frontend test:unit'
# After: 'pnpm --filter @repo/frontend test:unit'

# Step 3: Update rls-security-tests.yml
# Change trigger path: apps/backend/** → apps/integration-tests/**
# Change test command: pnpm --filter @repo/backend test:security → pnpm --filter @repo/integration-tests test:rls
```

### Pattern: Removing dual-path from hooks

```typescript
// BEFORE (with isPostgrestEnabled guard)
import { apiRequest } from '#lib/api-request'
import { isPostgrestEnabled } from '#lib/postgrest-flag'

if (isPostgrestEnabled()) {
  return supabase.from('users').select().eq('id', userId)
}
return apiRequest<UserProfile>('/api/v1/users/profile')

// AFTER (PostgREST only)
return supabase.from('users').select().eq('id', userId)
```

### Pattern: Replacing `ApiError` retry logic in query-error-handler.ts

```typescript
// BEFORE
import { isApiError, isAbortError } from '#lib/api-request'
if (isApiError(error)) {
  return !error.isClientError || error.status === 429
}

// AFTER — use PostgrestError classification
import type { PostgrestError } from '@supabase/supabase-js'
function isPostgrestError(error: unknown): error is PostgrestError {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error
}
// 5xx class errors in Postgrest return code starting with 'P' (Postgres errors)
// Network/abort errors are standard DOMException
```

### Pattern: Deleting from root package.json scripts (surgical removal)

```json
// DELETE these entries entirely:
"dev:backend": "pnpm --filter @repo/backend dev",
"build:backend": "turbo run build --filter=@repo/backend",
"test:unit:backend": "pnpm --filter @repo/backend test:unit",
"test:unit:watch": "pnpm --filter @repo/backend test:unit -- --watch",
"test:unit:coverage": "pnpm --filter @repo/backend test:unit --coverage",
"test:integration": "pnpm --filter @repo/backend test:integration",
"test:integration:watch": "pnpm --filter @repo/backend test:integration -- --watch",
"stripe:migrate": "pnpm --filter @repo/backend stripe:migrate",

// UPDATE these entries:
"test": "turbo run test:unit",  // was: test:unit test:integration
"validate": "pnpm db:types && pnpm clean && pnpm build:shared && pnpm typecheck && pnpm lint && pnpm test:unit && echo '✅ ALL VALIDATION PASSED - READY TO COMMIT'",
"validate:clean": "pnpm db:types && pnpm typecheck && pnpm lint && pnpm --filter @repo/frontend test:unit && echo '✅ CLEAN VALIDATION PASSED'",
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| BullMQ `emails` queue | n8n workflows triggered by DB webhooks | n8n already wired (Phase 56); need email nodes |
| BullMQ `stripe-webhooks` queue | Stripe Edge Function (synchronous) | Stripe retry handles retries natively |
| NestJS SSE push notifications | TanStack Query polling | Acceptable per REQUIREMENTS.md |
| Railway-hosted Redis | None needed | Deleted with Railway project |

---

## Open Questions

1. **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` fate**
   - What we know: Used in 6 frontend files including `supabase/proxy.ts` and auth routes
   - What's unclear: Whether `supabase/proxy.ts` is a routing proxy for the publishable key, and whether any auth flow still needs it vs the anon key
   - Recommendation: Read `apps/frontend/src/lib/supabase/proxy.ts` fully during planning; if it's purely NestJS routing, delete it; if it initializes a separate Supabase client, migrate to anon key pattern

2. **`useRevokeSessionMutation` for non-current sessions**
   - What we know: Phase 50-03 decision says non-current sessions always fall back to `apiRequest` (Admin API required); current session revoked via `supabase.auth.signOut()`
   - What's unclear: Whether to stub (throw) or silently ignore non-current session revocation
   - Recommendation: Throw `new Error('Session revocation for non-current sessions requires admin access — feature not yet implemented')` — honest, non-breaking stub

3. **`contact-form.tsx` replacement**
   - What we know: Posts to `API_BASE_URL/api/v1/contact` which queues a `contact-form` email job
   - What's unclear: Whether there's a Supabase table for contact messages or this should route to an external service
   - Recommendation: Stub the form submission with a `toast.info('Contact form temporarily unavailable')` and TODO comment — lowest priority, doesn't affect core product functionality

4. **Whether to use one PR or staged PRs**
   - What we know: The deletion is large (65+ files modified, 1 directory deleted); single PR is harder to review but creates single audit trail
   - What's unclear: Whether CI will have dependency issues during the PR if some files reference deleted modules
   - Recommendation: Use a **single PR** with commits in the locked sequence order: (1) CI/CD, (2) monorepo config, (3) frontend cleanup + migrations, (4) `apps/backend/` deletion. All type-check and lint errors should be zero before final commit.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all files referenced are from live codebase reads
  - `apps/backend/src/modules/email/email.queue.ts` — BullMQ `emails` queue job types
  - `apps/backend/src/modules/billing/webhooks/webhook-queue.processor.ts` — BullMQ `stripe-webhooks` queue
  - `apps/backend/src/health/bullmq.health.ts` — Queue name confirmation (`emails`)
  - `.github/workflows/deploy-backend.yml` — Railway deploy + `RAILWAY_TOKEN` secret
  - `.github/workflows/ci-cd.yml` — Backend test filter reference
  - `.github/workflows/rls-security-tests.yml` — Backend path trigger + test command
  - `pnpm-workspace.yaml` — NestJS catalog entries
  - `package.json` (root) — All backend-referencing scripts
  - `railway.toml` — Railway deployment config
  - `Dockerfile` — NestJS-specific Docker build
  - `docker-compose.yml` — Backend service + Redis service
  - `apps/frontend/src/lib/api-request.ts` — Full `apiRequest` implementation
  - `apps/frontend/src/lib/api-config.ts` — `API_BASE_URL` constant (NOT `api-client.ts`)
  - `apps/frontend/src/lib/postgrest-flag.ts` — `isPostgrestEnabled()` flag
  - `apps/frontend/src/env.ts` — All env var definitions
  - `apps/frontend/src/providers/sse-connection.ts` — SSE backend connection
  - `apps/integration-tests/package.json` — Confirms no NestJS dependencies

---

## Metadata

**Confidence breakdown:**
- BullMQ queue inventory: HIGH — direct file read of all queue/processor files
- Frontend callsite audit: HIGH — grep-verified across 65+ files with counts
- CI/CD audit: HIGH — all 5 workflow files read
- Monorepo config: HIGH — `pnpm-workspace.yaml`, `turbo.json`, root `package.json` all read
- Migration targets for remaining `apiRequest` calls: MEDIUM — based on Phase history and CONTEXT.md decisions; implementation detail may vary
- Railway secrets: HIGH — `RAILWAY_TOKEN` confirmed in `deploy-backend.yml`

**Research date:** 2026-02-22
**Valid until:** N/A — this is a deletion phase with stable findings
