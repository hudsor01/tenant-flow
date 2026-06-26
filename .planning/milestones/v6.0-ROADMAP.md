# Roadmap: TenantFlow

## Milestones

- ✅ **v1.0 Marketing Surface Honesty** — Phases 1-15 (shipped 2026-05-22) — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v2.0 Dashboard Command Center** — Phases 1-7 (shipped 2026-06-02, 34/34 requirements) — see [milestones/v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md)
- ✅ **v3.0 Security Hardening** — Phases 1-3 (shipped 2026-06-02, 12/12 requirements) — see [milestones/v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md)
- ✅ **v4.0 Hardening & Hygiene** — Phases 1-8 (shipped 2026-06-07, 20/21 requirements; SEO-01 carried to v5.0) — see [milestones/v4.0-ROADMAP.md](milestones/v4.0-ROADMAP.md)
- ✅ **v5.0 AI Blog Content Engine** — Phases 9-14 (shipped 2026-06-10, 9/9 requirements) — see [milestones/v5.0-ROADMAP.md](milestones/v5.0-ROADMAP.md)
- 🔨 **v6.0 Final Canonical Cleanup** — Phases 15-19 (active, started 2026-06-14, 24 requirements) — this file

---

## v6.0 Final Canonical Cleanup

**Goal:** Make the codebase canonical to the current product — remove every orphaned remnant of the demolished offerings (tenant-as-user/portal, rent-payment facilitation, Stripe Connect/payouts, automated screening) and finish the deferred dead-code trim, so no surface promises a feature TenantFlow does not have. The last milestone before the project is considered fully complete.

**Grounded in:** `.planning/repo-audit/v6.0-LEGACY-AUDIT.md`. Sequencing rule: zero-runtime-risk surface/type deletes first, INVESTIGATE resolution next, the one coordinated DB migration last (it must ship lockstep), the opt-in dead-code sweep last of all.

**5 phases** | **24 requirements mapped** | All covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 15 | Connect + Rent-Facilitation Surface & Type Removal | Kill the 3 customer-facing Connect surfaces + all dead Connect/rent contract types | LEGACY-CONNECT-01..04, LEGACY-RENT-01..04 | 4 |
| 16 | Tenant-as-User & Screening Cleanup | Remove tenant-portal/invite-auth schemas+types, relabel "invite"→"add", strip the never-built screening provider | LEGACY-TENANT-01..04, LEGACY-SCREENING-01..02 | 4 |
| 17 | Legacy-Remnant Investigation & Resolution | Resolve the 5 INVESTIGATE open questions against the live DB/RPCs, then remove what's confirmed dead | LEGACY-CONNECT-05..06, LEGACY-TENANT-05 | 4 |
| 18 | Dead-DB Coordinated Cleanup Migration | Drop the one missed column + orphan config rows + RPC key in one lockstep PR; no prod 400s | DEADDB-01..03, LEGACY-RENT-05, LEGACY-TENANT-06 | 4 |
| 19 | Deferred Dead-Code Sweep | Opt-in fallow trim of the ~553 internal SAFE-TRIM exports + `fast-check` dep, behind validate:quick | DEADCODE-01..02 | 4 |

### Phase Details

**Phase 15: Connect + Rent-Facilitation Surface & Type Removal**
Goal: Remove the highest-value cluster — the 3 live customer-facing surfaces that promise demolished features (the `/profile` "receive payments from tenants" Connect card, the `/financials` "Payouts" 404 dead-link, the onboarding "payouts / invite your first tenant" copy) plus every zero-consumer Connect and rent-facilitation contract type. All zero-runtime-risk once `owner_profile` is confirmed to never render.
Requirements: LEGACY-CONNECT-01, LEGACY-CONNECT-02, LEGACY-CONNECT-03, LEGACY-CONNECT-04, LEGACY-RENT-01, LEGACY-RENT-02, LEGACY-RENT-03, LEGACY-RENT-04
Success criteria:
1. `/profile` and `/financials` render with no Connect/payout UI; onboarding copy mentions no payouts or tenant invites; grep for the removed surfaces returns zero
2. `stripeConnect.*` mutation keys, `CreateConnectedPaymentRequest`, all `PayRent*`/late-fee/`TenantPayment` types, `RENT_CHARGE_STATUS`, `sendPaymentReminderSchema`, `TenantSummary`, and the broken `seed.sql` insert are deleted
3. `tsc --noEmit` + `biome check` + `next build` clean; full unit suite green (drift-guard tests updated, not skipped)
4. Two consecutive zero-finding review cycles (perfect-PR gate)

**Phase 16: Tenant-as-User & Screening Cleanup**
Goal: Remove tenant-as-user activation/portal schemas + types, de-duplicate `useCurrentUser`, relabel all "invite/invited" tenant wording to record-create framing (behavior unchanged), and strip the hardcoded TransUnion screening provider while keeping the legitimate landlord rental-application form.
Requirements: LEGACY-TENANT-01, LEGACY-TENANT-02, LEGACY-TENANT-03, LEGACY-TENANT-04, LEGACY-SCREENING-01, LEGACY-SCREENING-02
Success criteria:
1. `activateTenantSchema` + tenant-portal types + the duplicate `useCurrentUser` export are gone; their tests removed/updated
2. No UI label or metadata says "invite/invited tenant"; the lease-wizard still creates tenant records (behavior pinned by test); `provider: "TransUnion SmartMove"` is gone and the screening-authorization copy reads as third-party landlord paperwork
3. `tsc` + lint + `next build` clean; unit suite green
4. Two consecutive zero-finding review cycles

**Phase 17: Legacy-Remnant Investigation & Resolution**
Goal: Resolve the audit's 5 INVESTIGATE open questions against the live database/RPCs with evidence, then remove what is confirmed dead. Introspect the `activate_lease`/lease-sign RPC for `STRIPE_CONNECT_NOT_SETUP`/`STRIPE_VERIFICATION_INCOMPLETE` emission; confirm `get_user_profile()`'s `stripe_connected` source; trace whether `inviteToSignLeaseSchema` backs a DocuSeal send path; confirm `identityVerification` + Identity types have no consumer; map `tenants.user_id` readers ahead of Phase 18.
Requirements: LEGACY-CONNECT-05, LEGACY-CONNECT-06, LEGACY-TENANT-05
Success criteria:
1. Each INVESTIGATE item has a recorded prod-introspection verdict (REMOVE-safe or KEEP-with-reason) before any deletion
2. Lease-signature Connect gating codes removed iff the RPC no longer emits them (else a coordinated RPC+constant change is scheduled into Phase 18); `identityVerification` key + Identity types removed iff zero consumer; `inviteToSignLeaseSchema` kept-or-removed per the DocuSeal trace
3. A documented `tenants.user_id` reader map handed to Phase 18; `tsc` + lint + build + tests green
4. Two consecutive zero-finding review cycles

**Phase 18: Dead-DB Coordinated Cleanup Migration**
Goal: Ship the one and only DB cleanup as a single lockstep PR — drop `properties.stripe_connected_account_id`, delete the 2 orphan `app_config` webhook rows, adjust the `get_user_profile()` jsonb, and (if Phase 17 cleared it) drop `tenants.user_id` — together with `PROPERTY_SELECT_COLUMNS`, the 6 test fixtures, and a regenerated `supabase.ts`, so no deploy window 400s.
Requirements: DEADDB-01, DEADDB-02, DEADDB-03, LEGACY-RENT-05, LEGACY-TENANT-06
Success criteria:
1. New cleanup migration drops the column(s) + config rows + RPC key; `PROPERTY_SELECT_COLUMNS` + fixtures + `supabase.ts` updated in the same PR (no select-after-drop mismatch)
2. Migration reconciled via `mcp__supabase__list_migrations` after apply (prod timestamp drift); no historical migration edited
3. Property list/detail + profile + settings queries verified against prod (no 400s); `rls-security` + `e2e-smoke` + unit suite green
4. Two consecutive zero-finding review cycles

**Phase 19: Deferred Dead-Code Sweep**
Goal: Finish the dead-code trim deferred from PR #841 — remove the `fast-check` unused dev-dep and run an opt-in fallow sweep on the ~553 internal SAFE-TRIM dead exports, gated behind `bun run validate:quick`, without touching the 111 contract types or 28 intentional Zod↔type duplicates.
Requirements: DEADCODE-01, DEADCODE-02
Success criteria:
1. `fast-check` removed (no e2e spec imports it); lockfile + lockfile-verify hook green
2. The ~553 SAFE-TRIM exports trimmed in reviewable batches, each batch `validate:quick`-clean; KEEP-CONTRACT + intentional-duplicate items untouched; confirmed false-positives added to fallow ignore config so `fallow dead-code` runs clean
3. `tsc` + lint + `next build` + full unit suite green
4. Two consecutive zero-finding review cycles

### Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEGACY-CONNECT-01 | 15 | Pending |
| LEGACY-CONNECT-02 | 15 | Pending |
| LEGACY-CONNECT-03 | 15 | Pending |
| LEGACY-CONNECT-04 | 15 | Pending |
| LEGACY-RENT-01 | 15 | Pending |
| LEGACY-RENT-02 | 15 | Pending |
| LEGACY-RENT-03 | 15 | Pending |
| LEGACY-RENT-04 | 15 | Pending |
| LEGACY-TENANT-01 | 16 | Pending |
| LEGACY-TENANT-02 | 16 | Pending |
| LEGACY-TENANT-03 | 16 | Pending |
| LEGACY-TENANT-04 | 16 | Pending |
| LEGACY-SCREENING-01 | 16 | Pending |
| LEGACY-SCREENING-02 | 16 | Pending |
| LEGACY-CONNECT-05 | 17 | Pending |
| LEGACY-CONNECT-06 | 17 | Pending |
| LEGACY-TENANT-05 | 17 | Pending |
| DEADDB-01 | 18 | Pending |
| DEADDB-02 | 18 | Pending |
| DEADDB-03 | 18 | Pending |
| LEGACY-RENT-05 | 18 | Pending |
| LEGACY-TENANT-06 | 18 | Pending |
| DEADCODE-01 | 19 | Pending |
| DEADCODE-02 | 19 | Pending |

**Coverage:** 24 requirements · 24 mapped · 0 unmapped ✓

---
*v6.0 roadmap created 2026-06-14 — 5 phases (15-19), grounded in `.planning/repo-audit/v6.0-LEGACY-AUDIT.md`. Phase numbering continues from v5.0 (ended at 14).*
