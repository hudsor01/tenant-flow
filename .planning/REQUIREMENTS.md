# Requirements: TenantFlow v6.0 — Final Canonical Cleanup

**Defined:** 2026-06-14
**Core Value:** The codebase is canonical to the current product and current paid offering — every surface, type, and DB object maps to what TenantFlow actually does (landlord-only property management; tenants are records, not users; billing is the landlord Stripe *subscription*). No surface promises a demolished feature. This is the last milestone before the project is considered fully complete.

**Grounded in:** `.planning/repo-audit/v6.0-LEGACY-AUDIT.md` (7-finder forensic audit, 2026-06-14). The heavy demolition already shipped (`20260418140000_demolish_rent_and_tenant_portal.sql` + follow-ups) — prod has **0 surviving facilitation tables/functions/triggers/cron**. What remains is orphaned application-layer fog: dead UI, dead types, stale copy, and exactly one missed DB column.

## v1 Requirements

### LEGACY-CONNECT — Stripe Connect / payouts / marketplace removal

- [ ] **LEGACY-CONNECT-01**: The `/profile` page renders no "Payment Settings / receive payments from tenants" Connect card (remove `PaymentSettingsSection` + its profile-page/profile-card wiring + the `OwnerProfile.stripe_connected` / `UserProfileOwnerData.stripe_connected` / `UserProfile.owner_profile` contract fields)
- [ ] **LEGACY-CONNECT-02**: The `/financials` page shows no "Payouts" quick-link to the non-existent `/financials/payouts` route
- [ ] **LEGACY-CONNECT-03**: Onboarding welcome copy no longer mentions "connecting Stripe for payouts" or "inviting your first tenant"
- [ ] **LEGACY-CONNECT-04**: Connect/marketplace types + mutation keys are gone — `stripeConnect.createAccount`/`dashboardLink` keys, `CreateConnectedPaymentRequest`, and the broken `seed.sql` `stripe_connected_accounts` insert
- [ ] **LEGACY-CONNECT-05**: Lease activation references no demolished Stripe Connect gating (`STRIPE_CONNECT_NOT_SETUP` / `STRIPE_VERIFICATION_INCOMPLETE`) — removed only after verifying the activate/sign RPC no longer emits those SQLSTATE codes (INVESTIGATE, Phase 17)
- [ ] **LEGACY-CONNECT-06**: Stripe Identity (Connect KYC) remnants resolved — `identityVerification.start` mutation key + `src/types/stripe.ts` Identity types removed after confirming zero hook/UI consumer (INVESTIGATE, Phase 17)

### LEGACY-RENT — rent-payment facilitation type/config removal

- [ ] **LEGACY-RENT-01**: All rent-payment facilitation contract types removed (`PayRentRequest`, `PayRentResponse`, `AmountDueResponse`, `FailedPaymentAttempt`, `TenantPayment`, `TenantPaymentRecord`, `TenantPaymentHistoryResponse`, `LateFeeConfig`, `ApiOverduePayment`, `ProcessLateFeesResult`, `ApplyLateFeeResult`, `SendPaymentReminderRequest`, `SendPaymentReminderResponse`)
- [ ] **LEGACY-RENT-02**: `RENT_CHARGE_STATUS` constant + `RentChargeStatus` type removed
- [ ] **LEGACY-RENT-03**: `sendPaymentReminderSchema` (tenant payment reminder) removed
- [ ] **LEGACY-RENT-04**: `TenantStats.currentPayments`/`latePayments` counters + the unconsumed `TenantSummary` interface removed; the dead `if (table === "rent_payments")` test-mock arm removed
- [ ] **LEGACY-RENT-05**: Orphan `app_config` rows `n8n.webhook.rent_payment_url` + `n8n.webhook.payment_reminder_url` deleted (new migration — folds into Phase 18)

### LEGACY-TENANT — tenant-as-user / portal / invite-auth removal

- [ ] **LEGACY-TENANT-01**: Tenant-as-user activation removed — `activateTenantSchema` (and the dead `authuser_id` / "public invitation acceptance" framing) + its tests
- [ ] **LEGACY-TENANT-02**: Tenant-portal view types removed (`TenantMaintenanceRequest`, `TenantMaintenanceStats`, `TenantLease`, `TenantDocument`, `TenantSettings`, `TenantProfile`)
- [ ] **LEGACY-TENANT-03**: The duplicate `useCurrentUser` export in `use-auth.ts` removed (canonical is `#hooks/use-current-user`; the duplicate has 0 importers)
- [ ] **LEGACY-TENANT-04**: Stale "invite/invited" tenant wording relabeled to record-create framing — funnel-chart "Invited Tenant" → "Added Tenant"; lease-wizard "Invite New Tenant" / `InlineTenantInvite` → "Add Tenant" / `InlineTenantCreate` (behavior unchanged — it is a plain record insert); `tenants/layout.tsx` metadata drops "invitations"; `addTenantRequestSchema` stale `InviteWithLeaseDto` comment dropped
- [ ] **LEGACY-TENANT-05**: `inviteToSignLeaseSchema` / `InviteToSignLease` resolved — kept if it backs a real DocuSeal e-sign "invite recipient to sign" send path, removed (with tests) if not (INVESTIGATE, Phase 17)
- [ ] **LEGACY-TENANT-06**: `tenants.user_id` DB column dropped after stripping it from the 6 `tenants.ts` schema references and confirming no RLS policy / RPC joins on it (DB — folds into Phase 18)

### LEGACY-SCREENING — never-built automated screening removal

- [ ] **LEGACY-SCREENING-01**: Hardcoded `provider: "TransUnion SmartMove"` removed from the rental-application PDF payload (the integration was never built)
- [ ] **LEGACY-SCREENING-02**: "third-party screening provider" authorization copy reworded to clearly third-party / landlord paperwork; the legitimate `backgroundCheck` consent checkbox + printable rental-application form are kept

### DEADDB — dead database object + lockstep readers (final phase)

- [ ] **DEADDB-01**: `public.properties.stripe_connected_account_id` column dropped via a new cleanup migration (0 non-null rows, no FK/index/RLS/RPC reader; the 2026-04-18 demolish dropped the `leases` twin but missed this one)
- [ ] **DEADDB-02**: `PROPERTY_SELECT_COLUMNS`, the 6 pinning test fixtures, and a regenerated `supabase.ts` (`bun run db:types`) all updated in the **same PR** as the column drop — no partial-deploy 400s on property list/detail queries
- [ ] **DEADDB-03**: `get_user_profile()` RPC's `stripe_connected` jsonb key removed/adjusted in the same migration (after confirming whether it is hardcoded `false` or derives from the dropped column)

### DEADCODE — deferred fallow dead-code sweep (opt-in, last)

- [ ] **DEADCODE-01**: `fast-check` unused dev-dependency removed after confirming no e2e spec imports it
- [ ] **DEADCODE-02**: The ~553 internal SAFE-TRIM dead exports trimmed via an opt-in fallow sweep gated behind `bun run validate:quick`; confirmed false-positives added to fallow ignore config so the next `fallow dead-code` run is clean

## v2 Requirements

None. v6.0 is the final cleanup — there is no deferred follow-on scope after it.

## Out of Scope

| Feature | Reason |
|---------|--------|
| 111 KEEP-CONTRACT type-surface items (`api-contracts.ts`/`core.ts`/`relations.ts`/generated `supabase.ts`) | Unused *today* but part of the contract API surface — trimming risks future-RPC breakage. Not dead code. |
| 28 of 29 fallow "duplicate exports" | Intentional Zod-schema ↔ inferred-type / constant ↔ derived-type co-location, not real duplication. |
| Deps `sharp`, `babel-plugin-react-compiler`, `lighthouse`/`@lhci/cli`, `@sentry/deno`, `@upstash/ratelimit`, `@upstash/redis`, `@zip.js/zip.js` | Verified fallow false-positives: Next image opt, the enabled React Compiler, `bunx lhci` CLI, and import-map-resolved Deno Edge-Function imports. |
| `public/sw.js`, `scripts/*.ts` owner CLIs, `supabase/functions/tests/*-test.ts` | Runtime / CLI / Deno-test entry points static analysis can't see. |
| Re-introducing any demolished feature (tenant portal/auth, rent-payment facilitation, Stripe Connect/payouts, automated screening) | Pre-pivot decisions, never re-add (PROJECT.md Out-of-Scope). This milestone removes their *remnants*, it does not revive them. |
| The blog/n8n factory | Paused via PR #840 kill-switch (`~/.tenantflow-blog-factory.off`). Not touched by this milestone. |
| Lease-document rent clauses, the `application_fee` lease term, `stripe.*` FDW payouts/transfers tables, demolition-documenting copy + guard tests | KEEP — legitimate current-product surfaces and correct guardrails (see audit §4). |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEGACY-CONNECT-01 | Phase 15 | Pending |
| LEGACY-CONNECT-02 | Phase 15 | Pending |
| LEGACY-CONNECT-03 | Phase 15 | Pending |
| LEGACY-CONNECT-04 | Phase 15 | Pending |
| LEGACY-RENT-01 | Phase 15 | Pending |
| LEGACY-RENT-02 | Phase 15 | Pending |
| LEGACY-RENT-03 | Phase 15 | Pending |
| LEGACY-RENT-04 | Phase 15 | Pending |
| LEGACY-TENANT-01 | Phase 16 | Pending |
| LEGACY-TENANT-02 | Phase 16 | Pending |
| LEGACY-TENANT-03 | Phase 16 | Pending |
| LEGACY-TENANT-04 | Phase 16 | Pending |
| LEGACY-SCREENING-01 | Phase 16 | Pending |
| LEGACY-SCREENING-02 | Phase 16 | Pending |
| LEGACY-CONNECT-05 | Phase 17 | Pending |
| LEGACY-CONNECT-06 | Phase 17 | Pending |
| LEGACY-TENANT-05 | Phase 17 | Pending |
| DEADDB-01 | Phase 18 | Pending |
| DEADDB-02 | Phase 18 | Pending |
| DEADDB-03 | Phase 18 | Pending |
| LEGACY-RENT-05 | Phase 18 | Pending |
| LEGACY-TENANT-06 | Phase 18 | Pending |
| DEADCODE-01 | Phase 19 | Pending |
| DEADCODE-02 | Phase 19 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-14 — v6.0 Final Canonical Cleanup, grounded in `.planning/repo-audit/v6.0-LEGACY-AUDIT.md`*
