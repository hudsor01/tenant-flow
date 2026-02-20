# Phase 24: Admin Client RLS Security Audit - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<vision>
## How This Should Work

A systematic file-by-file review of all 26 production files that use `getAdminClient()`. Each usage gets examined, categorized, and either:
- Documented as legitimate (webhooks, admin operations, cross-user scenarios)
- Converted to user-scoped client with proper token
- Enhanced with ownership verification before admin access

The goal is thorough, methodical coverage — no shortcuts, no assumptions. Every admin client usage should have a clear justification or be fixed.

</vision>

<essential>
## What Must Be Nailed

- **Every admin client usage justified** - Each of the 26 files either has documented legitimate use OR gets converted to user-scoped queries
- **Zero cross-tenant leakage risk** - Eliminate any code path where tenant A could access tenant B's data through admin client bypass

Both outcomes are equally important. A complete audit AND security guarantee.

</essential>

<boundaries>
## What's Out of Scope

No explicit exclusions — the audit should be comprehensive:
- Test files (*.spec.ts) will be examined for patterns but not changed
- Webhook handlers will be audited even if ultimately justified as legitimate
- Admin services will be reviewed to ensure proper authorization

The goal is completeness, not speed. No categories excluded upfront.

</boundaries>

<specifics>
## Specific Ideas

From TODO.md progress notes, several areas have already been addressed:
- TenantOwnershipGuard added at controller level for `/stripe/tenant` endpoints
- Tenant portal controllers converted to user-scoped queries
- Reports services now use user-scoped clients
- Rent payments context + autopay flows updated

The audit should verify these fixes AND address the remaining 26 files.

</specifics>

<notes>
## Additional Context

This addresses SEC-008 from TODO.md (Priority: P1 - High).

**Legitimate Use Cases to Document:**
- Webhook handlers (external callbacks require admin access)
- Auth validation (auth.getUser() needs admin client)
- Cross-user operations (tenant signing owner's lease)
- Admin services (intentional admin functionality)

**Categories Identified:**
- 8 Webhook handlers (likely legitimate)
- 1 Admin service (legitimate)
- 3 Notification/SSE services (likely legitimate)
- 14+ Other services (need review)

Total: 112 production usages across 38 files (26 unique after excluding spec files and legitimate categories).

</notes>

---

*Phase: 24-admin-client-rls-audit*
*Context gathered: 2026-01-20*
