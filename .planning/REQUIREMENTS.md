# Requirements: TenantFlow v8.0 — Post-Migration Hardening + Payment Infrastructure

**Defined:** 2026-02-25
**Core Value:** A landlord can add a property, invite a tenant, collect rent, and see their financials — without touching a spreadsheet or calling anyone.

## v8.0 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Payments (PAY)

- [ ] **PAY-01**: Tenant can pay rent via Stripe Checkout with destination charge fee split to owner's Express account
- [ ] **PAY-02**: Platform receives configurable application fee on each rent payment
- [ ] **PAY-03**: Tenant receives branded HTML receipt email after successful payment
- [ ] **PAY-04**: Owner receives notification email after tenant payment succeeds
- [ ] **PAY-05**: Email suppression list checked before every Resend email send
- [ ] **PAY-06**: Tenant can enable autopay with saved payment method for recurring monthly rent

### Authentication (AUTH)

- [ ] **AUTH-01**: User can complete password reset via email link with PKCE code exchange
- [ ] **AUTH-02**: User sees email confirmation page after signup with resend option
- [ ] **AUTH-03**: Google OAuth signup correctly sets user_type and routes to proper dashboard

### Security (SEC)

- [ ] **SEC-01**: DocuSeal webhook handler rejects unverified requests (fail-closed)
- [ ] **SEC-02**: DocuSeal Edge Function validates ownership before lease actions
- [ ] **SEC-03**: generate-pdf Edge Function validates ownership before PDF generation
- [ ] **SEC-04**: Stripe webhook notification_type CHECK constraint matches actual values
- [ ] **SEC-05**: undefined owner_user_id guarded in all 6 insert mutations
- [ ] **SEC-06**: PostgREST filter injection sanitized in all 4 search inputs
- [ ] **SEC-07**: CORS wildcard restricted to FRONTEND_URL on browser-facing Edge Functions
- [ ] **SEC-08**: Edge Function dependencies pinned via deno.json import map

### Code Quality (QUAL)

- [ ] **QUAL-01**: Double-toast error handling fixed across 20+ hooks
- [ ] **QUAL-02**: Duplicate payment method hooks consolidated
- [ ] **QUAL-03**: All 31 TODO stubs tracked; 4 runtime-throw stubs fixed
- [ ] **QUAL-04**: 86 getUser() calls replaced with cached auth pattern

### Performance (PERF)

- [ ] **PERF-01**: Batch tenant operations refactored to single queries/RPCs
- [ ] **PERF-02**: 3-step serial tenant portal lookup eliminated
- [ ] **PERF-03**: CSV export unbounded query protected with limit
- [ ] **PERF-04**: Performance metrics (maintenance stats, missing indexes) addressed

### Testing (TEST)

- [ ] **TEST-01**: RLS write-path isolation tests (INSERT/UPDATE/DELETE) for all 7 domains
- [ ] **TEST-02**: RLS tests gate PRs on dedicated integration project
- [ ] **TEST-03**: E2E test intercepts rewritten for PostgREST architecture

### Documentation (DOCS)

- [ ] **DOCS-01**: CLAUDE.md stripped of NestJS content
- [ ] **DOCS-02**: PostgREST/Edge Function patterns added to CLAUDE.md

### CI/CD (CICD)

- [ ] **CICD-01**: Pre-merge blockers resolved (E2E env vars, Vercel ANON_KEY)
- [ ] **CICD-02**: CI/CD pipeline gaps closed (E2E smoke, coverage gates)

## Future Requirements (Deferred)

### Payments

- **PAY-F01**: Tenant payment receipt PDF attachment via StirlingPDF
- **PAY-F02**: Branded email template editor in owner settings
- **PAY-F03**: Stripe SDK version consolidation (stripe@14 → stripe@20 across all Edge Functions)

### Features

- **FEAT-F01**: In-app messaging between landlord and tenant (realtime)
- **FEAT-F02**: Vendor/contractor portal with login and ticket visibility
- **FEAT-F03**: Automated accounting export (QuickBooks/Xero)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first; not in any milestone |
| SMS notifications (Twilio) | Removed in v6.0; email covers needs |
| Magic link auth | Decided on email/password + Google OAuth |
| tRPC/Hono backend | PostgREST + Edge Functions is the complete solution |
| Stripe SDK upgrade to v20 in Edge Functions | Separate hardening task; Deno compatibility unverified |
| GraphQL client library in frontend | pg_graphql accessed via supabase.rpc() only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PAY-01 | TBD | Pending |
| PAY-02 | TBD | Pending |
| PAY-03 | TBD | Pending |
| PAY-04 | TBD | Pending |
| PAY-05 | TBD | Pending |
| PAY-06 | TBD | Pending |
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| AUTH-03 | TBD | Pending |
| SEC-01 | TBD | Pending |
| SEC-02 | TBD | Pending |
| SEC-03 | TBD | Pending |
| SEC-04 | TBD | Pending |
| SEC-05 | TBD | Pending |
| SEC-06 | TBD | Pending |
| SEC-07 | TBD | Pending |
| SEC-08 | TBD | Pending |
| QUAL-01 | TBD | Pending |
| QUAL-02 | TBD | Pending |
| QUAL-03 | TBD | Pending |
| QUAL-04 | TBD | Pending |
| PERF-01 | TBD | Pending |
| PERF-02 | TBD | Pending |
| PERF-03 | TBD | Pending |
| PERF-04 | TBD | Pending |
| TEST-01 | TBD | Pending |
| TEST-02 | TBD | Pending |
| TEST-03 | TBD | Pending |
| DOCS-01 | TBD | Pending |
| DOCS-02 | TBD | Pending |
| CICD-01 | TBD | Pending |
| CICD-02 | TBD | Pending |

**Coverage:**
- v8.0 requirements: 32 total
- Mapped to phases: 0
- Unmapped: 32

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after initial definition*
