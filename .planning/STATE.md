---
gsd_state_version: 1.0
milestone: v6.0
milestone_name: Final Canonical Cleanup
status: verifying
last_updated: "2026-06-19T00:00:00.000Z"
last_activity: 2026-06-19
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 0
  completed_plans: 0
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md

**Core value (v6.0):** The codebase is canonical to the current product — every surface, type, and DB object maps to what TenantFlow actually does (landlord-only; tenants are records, not users; billing is the landlord Stripe subscription). No surface promises a demolished feature. The last milestone before the project is considered fully complete.
**Current focus:** v6.0 findings RESOLVED. A 2026-06-19 verification pass confirmed every audit finding (Connect UI/types, rent-facilitation types, tenant-as-user schemas, screening provider, dead DB column/RPC/config, `tenants.user_id`) was already implemented — folded into PR #841 + the e-sign rebuild + migrations `20260616040851`/`20260616161248`. The exhaustive re-sweep surfaced 4 residuals the audit missed (broken RLS pgTAP test, stale `SCHEMA.md`, unindexed `lease_signing_tokens.created_by` FK, stale test wording) — fixed on branch `chore/v6.0-canonical-cleanup`.

## Current Position

Phase: All audit findings resolved (phases 15-18 work shipped in prior PRs; phase 19 fallow trim deferred/opt-in)
Plan: —
Status: Verifying — canonical-cleanup PR open
Last activity: 2026-06-19 — Verified the full v6.0 legacy audit is already implemented; fixed 4 missed residuals (RLS test, SCHEMA.md, FK index, test wording). Remaining: opt-in fallow trim (~415 exports, mostly KEEP-CONTRACT) is explicitly deferred.

## Roadmap Summary (v6.0)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 15. Connect + Rent-Facilitation Surface & Type Removal | Kill the 3 customer-facing Connect surfaces + all dead Connect/rent contract types | LEGACY-CONNECT-01..04, LEGACY-RENT-01..04 |
| 16. Tenant-as-User & Screening Cleanup | Remove tenant-portal/invite-auth schemas+types, relabel "invite"→"add", strip never-built screening provider | LEGACY-TENANT-01..04, LEGACY-SCREENING-01..02 |
| 17. Legacy-Remnant Investigation & Resolution | Resolve 5 INVESTIGATE open questions against live DB/RPCs, then remove what's confirmed dead | LEGACY-CONNECT-05..06, LEGACY-TENANT-05 |
| 18. Dead-DB Coordinated Cleanup Migration | Drop the 1 missed column + orphan config rows + RPC key in one lockstep PR; no prod 400s | DEADDB-01..03, LEGACY-RENT-05, LEGACY-TENANT-06 |
| 19. Deferred Dead-Code Sweep | Opt-in fallow trim of ~553 internal SAFE-TRIM exports + `fast-check` dep | DEADCODE-01..02 |

## Blockers

None. 5 INVESTIGATE items (lease-activation Connect gating RPC, `get_user_profile` `stripe_connected` source, `tenants.user_id` readers, `InviteToSignLease` DocuSeal-vs-login, `identityVerification` consumers) are scheduled into Phase 17 for prod introspection before any dependent removal — they gate, but do not block, the milestone.

## Roadmap Evolution

- 2026-05-22: v1.0 "Marketing Surface Honesty" archived (15 phases).
- 2026-06-02: v2.0 "Dashboard Command Center" shipped + archived (7 phases, 34/34).
- 2026-06-02: v3.0 "Security Hardening" shipped + archived (3 phases, 12/12).
- 2026-06-07: v4.0 "Hardening & Hygiene" shipped + archived (8 phases, 20/21).
- 2026-06-10: v5.0 "AI Blog Content Engine" shipped + archived (6 phases 9-14, 9/9).
- 2026-06-14: v6.0 "Final Canonical Cleanup" roadmap created (5 phases 15-19, 24 requirements). Heavy demolition already shipped (`20260418140000_demolish_rent_and_tenant_portal.sql`); this milestone removes the orphaned application-layer fog + finishes the PR #841 deferred dead-code trim. Grounded in a 7-finder forensic audit (`.planning/repo-audit/v6.0-LEGACY-AUDIT.md`). Two cleanup PRs precede it: #840 (blog-factory kill-switch), #841 (106 dead files + chart cycle).

## Next Action

**v6.0 audit findings are resolved.** The product-boundary cleanup (Connect surfaces, rent/Connect/tenant-portal types, screening provider, dead DB column/RPC/`tenants.user_id`/app_config rows) was already implemented and verified against prod + the codebase on 2026-06-19; the 4 missed residuals are fixed in the open `chore/v6.0-canonical-cleanup` PR.

Optional remaining work (was Phase 19, explicitly deferred/opt-in): the fallow dead-code trim — currently ~415 unused exports/types, but ~111 are intentional KEEP-CONTRACT surface and many are framework/Deno false-positives, so a blind `fallow fix` is unsafe. Run as a separate, gated, per-item sweep if desired; otherwise close the milestone via `/gsd-complete-milestone v6.0`.

## Overrides

(none active)

---
*Last updated: 2026-06-14 — v6.0 "Final Canonical Cleanup" started; forensic legacy audit + REQUIREMENTS + ROADMAP authored. Integer phase numbers continue across milestones (15-19). Trust `git log main` + `gh pr list --state merged` + `.planning/ROADMAP.md` as source of truth over this cache.*
