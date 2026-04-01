# Feature Landscape: Tenant Invitation Flow Redesign

**Domain:** Property management SaaS -- tenant invitation and onboarding
**Researched:** 2026-03-30
**Mode:** Ecosystem research (features focus)

## Existing System Analysis

TenantFlow currently has **4 duplicated invitation code paths** that each independently create `tenant_invitations` records and call the `send-tenant-invitation` Edge Function:

| Code Path | File | Form Library | Type Set | Property Context |
|-----------|------|-------------|----------|-----------------|
| Onboarding wizard | `onboarding-step-tenant.tsx` | Raw `useState` | Hardcoded `platform_access` | None |
| Invite form page | `invite-tenant-form.tsx` | TanStack Form | Hardcoded `portal_access` (BUG: fails CHECK) | Optional picker |
| Invite modal (old) | `invite-tenant-modal.tsx` | Raw `useState` | User-facing dropdown | None |
| Mutation factory | `tenant-invite-mutation-options.ts` | N/A (API layer) | `lease_signing` from lease context | From lease FK |

**Already working well:**
- `tenant_invitations` DB schema with proper statuses (pending/sent/accepted/expired/cancelled)
- `send-tenant-invitation` Edge Function with branded Resend email, JWT auth, owner authorization
- Accept flow: validate code (Edge Function) --> signup form (pre-filled email) --> accept (Edge Function) --> redirect to tenant portal
- Existing user detection: if `signUp` returns "already registered", attempts `signInWithPassword` then accepts
- Resend mutation (extends expiry 7 days, re-sends email)
- Cancel mutation (sets status to `cancelled`)
- Invitation list query with joined lease/unit/property data
- 7-day expiration with server-side enforcement
- Single-use invitation codes (UUID)

**Broken or missing:**
- `invite-tenant-form.tsx` inserts `type: 'portal_access'` which violates the CHECK constraint (`platform_access` or `lease_signing` only)
- Accept flow does not branch on invitation `type` -- same flow regardless
- User-facing invitation type dropdown in modal is confusing (tenants don't know what "platform access" vs "lease signing" means)
- No unified component -- each path has its own mutation logic, form fields, and email-send call
- No pending invitation visibility on the tenants list page (invitations are queried separately but not surfaced alongside tenant records)
- Onboarding wizard does not store first_name/last_name on the invitation record
- No duplicate email detection before sending (can create multiple invitations to same email)

---

## Table Stakes

Features users expect. Missing = product feels incomplete or broken compared to Buildium, AppFolio, TurboTenant, DoorLoop, Stessa, and Avail.

| Feature | Why Expected | Complexity | Exists in TenantFlow | Notes |
|---------|-------------|------------|---------------------|-------|
| **One-click invite from tenant list** | Every competitor (DoorLoop, TurboTenant, RentRedi) has this. Owners expect to click "Invite Tenant" and fill out a simple form | Low | YES (modal + form page via intercepting route) | Works but duplicated logic |
| **Email with accept link** | Universal pattern. AppFolio, Stessa, DoorLoop all send branded emails with a single CTA button | Low | YES | Edge Function + Resend template working |
| **Pre-filled signup form** | Email address should be locked/pre-filled on accept page. Every competitor does this. Reduces friction and prevents email mismatch | Low | YES | Email pre-filled and disabled when invitation data loads |
| **Invitation status visibility** | Owner must see which invitations are pending, accepted, expired, or cancelled. DoorLoop shows status in tenant list. TurboTenant shows "Pending Portal" badge | Med | PARTIAL | `tenantInvitationQueries.list()` exists but status is not prominently surfaced on the tenants page |
| **Resend expired/pending invitations** | Every platform supports this. TurboTenant: "Re-Send Invite" button. DoorLoop: "Send Portal Invitation" link. RentRedi: resend from tenant profile | Low | YES | Mutation extends expiry 7 days and re-sends email |
| **Cancel pending invitations** | Owners need to revoke invitations. Standard across DoorLoop, RentRedi | Low | YES | Mutation sets status to `cancelled` |
| **Invitation expiration** | Time-limited invitations are security table stakes. 7 days is the industry standard (TurboTenant, DoorLoop). Some use 48 hours (Rent Perfect) | Low | YES | 7-day expiry, server-validated |
| **Existing user handling** | If invited email already has an account, route to login instead of signup. SaaS best practice (Slack, Notion, Linear all do this). Dead-end "already registered" errors kill conversion | Med | PARTIAL | Catches `signUp` error and falls back to `signInWithPassword`, but UX is clunky -- user sees signup form first, then gets an error-then-retry flow rather than being routed to login proactively |
| **Context-aware invitations** | Invitation should carry property/unit context when sent from a property or lease context. Stessa ties invitations to leases. TurboTenant auto-invites when adding tenant to lease | Med | PARTIAL | DB supports `property_id`, `unit_id`, `lease_id` FKs but the form doesn't auto-populate from context |
| **Single invitation entry point** | One component that works everywhere (dashboard, onboarding, lease wizard). Not 4 separate implementations with divergent behavior | Med | NO | This is the core of the v1.4 redesign |
| **Suppress duplicate invitations** | Warn or block when inviting an email that already has a pending/active invitation. AppFolio prevents duplicate portal setups | Low | NO | Can currently create unlimited invitations to same email |

**Confidence:** HIGH -- based on DoorLoop, TurboTenant, RentRedi, Stessa, AppFolio documentation and help center articles cross-referenced across multiple sources.

---

## Differentiators

Features that set TenantFlow apart. Not expected, but valued when present. Build only if cost is justified.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **"Invite Now or Later" toggle** | TurboTenant lets owners uncheck "Send invitation to tenant portal" when adding a tenant, deferring the email. Useful when owner is still setting up the property. Creates invitation record in `pending` status, sends email when owner clicks "Send" later | Low | TurboTenant is the only competitor that does this well. Low cost, high value for onboarding owners |
| **Pending invitation cards on tenant list** | Instead of just a badge, show pending invitations as first-class cards/rows in the tenant list with actions (resend, cancel, view details). DoorLoop does this with a "Pending" status column | Med | Surfaces invitation status without requiring a separate "Invitations" tab |
| **Smart accept flow branching** | If invitation type is `lease_signing`, after account creation redirect to lease review/signing page instead of generic tenant dashboard. If `platform_access`, redirect to tenant portal with a welcome tour | Med | DB already has `type` column. Accept flow currently ignores it. Branching adds real value by giving tenants the right next step |
| **Copy invitation link** | Let owner copy the invitation URL to send via text, WhatsApp, or other channels. Slack and Notion both offer "copy invite link" alongside email. Airtable does this with generate/cancel semantics | Low | `invitation_url` is already stored in DB. Just expose it in the UI with a copy button |
| **Invitation activity log** | Show timeline of invitation events: sent, opened, resent, expired, accepted. Useful for owners tracking unresponsive tenants | Med | Would require adding `sent_count`, `last_sent_at`, and possibly email open tracking (Resend supports this via webhooks) |
| **Bulk invite** | DoorLoop supports bulk invitations: invite all tenants, all tenants at a property, or selected tenants at once. Useful for owners onboarding an existing portfolio | High | Only valuable for landlords with many existing tenants migrating to TenantFlow. Not needed for single-property owners |

**Confidence:** MEDIUM -- differentiation value is subjective. Based on competitive analysis of what top-tier platforms offer but smaller platforms skip.

---

## Anti-Features

Features to explicitly NOT build. Adds complexity, confuses users, or solves problems that don't exist.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **User-facing invitation type dropdown** | Tenants and owners don't understand "Platform Access" vs "Lease Signing." This is internal metadata. Exposing it creates a support burden and decision paralysis for owners | Auto-set type based on context: `lease_signing` when inviting from lease wizard (lease_id present), `platform_access` everywhere else. Remove the dropdown entirely |
| **Magic link authentication for accept flow** | Magic links are vulnerable to email scanner pre-clicks (enterprise email filters click all links, consuming single-use tokens). Current UUID code + signup form is more robust. Supabase magic link has a 5-minute default expiry which is too short for tenant invitation context | Keep invitation code (UUID) + signup form. The code validates the invitation; auth is handled separately by Supabase signUp/signIn |
| **Shareable invite links (open access)** | Generic join links (like Slack workspace links) are a security risk for property management. An unauthorized person could create a tenant account and potentially see property/lease data. This is appropriate for team collaboration tools but not for financial/property data | Keep invitation links single-use and tied to a specific email address. Owner must specify who to invite |
| **In-app notification of invitation** | Tenants don't have accounts yet when invited, so in-app notifications are impossible. Building a pre-auth notification system adds massive complexity for zero value | Email is sufficient. If email doesn't arrive, owner can resend or copy the link |
| **Invitation approval workflow** | Some enterprise SaaS has admin approval for invitations. In property management, the owner IS the admin. Adding an approval step between owner sending and tenant receiving is pure friction | Owner sends, tenant receives. No intermediary |
| **SMS invitations** | SMS delivery adds Twilio dependency, costs money per message, and requires phone number validation. Email works fine for this use case. PROJECT.md explicitly lists Twilio SMS as out of scope | Keep email-only. Copy-link feature covers SMS use case (owner can paste link into a text message manually) |
| **Custom invitation email templates per owner** | Tempting but premature. Adds a template editor, preview system, and variable injection layer. No competitor smaller than Buildium offers this | Use the single branded template that already works. Owner name and property name are already personalized via template variables |
| **Invitation analytics dashboard** | Tracking open rates, click rates, acceptance rates across invitations is enterprise-grade analytics. Overkill for indie landlords | Simple status (sent/accepted/expired/cancelled) with timestamps is sufficient |

**Confidence:** HIGH -- anti-features identified from competitive analysis showing which features add friction without value, and from PROJECT.md explicit out-of-scope decisions.

---

## Feature Dependencies

```
Unified invitation component ──> Context-aware auto-type setting
                              ──> Fix CHECK constraint bug ('portal_access' -> 'platform_access')
                              ──> Property/unit picker (reuse existing InviteTenantPropertyFields)

Duplicate email detection ──> tenant_invitations table query (already indexed on email)

Pending invitation cards ──> tenantInvitationQueries.list() (already exists)
                         ──> Status badge component (new, small)

Smart accept flow branching ──> invitation.type field (already in DB)
                            ──> Accept Edge Function returns type in response
                            ──> Accept page reads type and routes accordingly

Copy invitation link ──> invitation_url column (already stored in DB)
                     ──> Clipboard API (browser-native, no library needed)

"Invite Now or Later" toggle ──> status: 'pending' (already in CHECK constraint)
                              ──> Separate "send email" action from "create invitation"
                              ──> sendInvitationEmail() helper already exists standalone
```

---

## MVP Recommendation

Prioritize these for v1.4 in this order:

### Must Ship (Table Stakes)

1. **Unified invitation component** -- one `<InviteTenantFlow />` component used by onboarding wizard, tenant list modal/page, and (future) lease wizard. Uses TanStack Form. Replaces all 4 existing code paths.

2. **Fix CHECK constraint bug** -- change `'portal_access'` to `'platform_access'` in the form. Immediate data integrity fix.

3. **Auto-set invitation type from context** -- remove user-facing dropdown. Set `platform_access` by default, `lease_signing` when `lease_id` is provided.

4. **Duplicate email guard** -- before inserting, check if a pending/sent invitation already exists for that email under this owner. Show warning with option to resend existing instead.

5. **Pending invitations on tenant list** -- surface pending invitations as a section or inline rows on the tenants page with resend/cancel actions.

### Should Ship (Low-Cost Differentiators)

6. **Copy invitation link button** -- expose `invitation_url` in the invitation detail/row with a copy-to-clipboard button. Near-zero effort, real value.

7. **Existing user routing on accept** -- before showing signup form, check if email is already registered. If yes, show "Sign in to accept" instead of "Create account." Prevents the error-then-fallback flow.

### Defer

- **Smart accept flow branching** (type-based routing): Valuable but the lease-signing flow itself is not yet fully built. Defer until lease signing workflow is complete.
- **Bulk invite**: Only valuable at scale. Defer to a future milestone when portfolio import features mature.
- **Invitation activity log**: Nice but not blocking. Can add incrementally.
- **"Invite Now or Later" toggle**: Useful but adds state complexity. Consider for a polish pass.

---

## Competitive Landscape Summary

| Platform | Invite Method | Status Tracking | Resend | Bulk | Existing User Handling |
|----------|--------------|-----------------|--------|------|----------------------|
| **DoorLoop** | Email with accept link | Status column in tenant list | Yes (re-invite button) | Yes (all, by property, selected) | Not documented |
| **TurboTenant** | Auto on lease add (opt-out checkbox) | "Pending Portal" badge | Yes (from tenant profile) | No | Not documented |
| **AppFolio** | Automatic email on tenant creation | Activation status visible | "Request activation" for tenant | No | Not documented |
| **Stessa** | Email on lease setup | Portal status per tenant | Not documented | No | Must use invited email |
| **Avail** | Tenant-initiated or landlord-initiated | Dashboard status | Not documented | No | Account matching by email |
| **RentRedi** | Email invitation | Status tracking | Yes (resend button) | No | Not documented |
| **Buildium** | Portal invitation during setup | Resident Center status | Yes | Per-property | Not documented |

**Key insight:** No property management platform in this tier handles existing-user detection gracefully. This is where SaaS best practices from Slack/Notion/Linear should inform TenantFlow's approach -- it's a genuine differentiator in the PM space.

---

## Sources

### Property Management Platforms
- [DoorLoop: Invite Tenants to Portal](https://support.doorloop.com/en/articles/6082689-invite-tenants-to-your-tenant-portal) -- single and bulk invite workflow, status tracking -- HIGH confidence
- [DoorLoop: Bulk Invite](https://support.doorloop.com/en/articles/6295305-bulk-invite-multiple-tenants-to-the-tenant-portal) -- bulk invitation patterns -- HIGH confidence
- [DoorLoop: Re-invite Tenants](https://support.doorloop.com/en/articles/6295640-how-do-i-re-invite-tenants-to-the-tenant-portal) -- resend flow -- HIGH confidence
- [TurboTenant: Landlord Guide to Tenant Portal](https://support.turbotenant.com/en/articles/4664501-landlord-guide-to-the-tenant-portal) -- auto-invite on lease add, opt-out checkbox, resend -- HIGH confidence
- [TurboTenant: How to Add a Tenant](https://support.turbotenant.com/en/articles/4004088-how-do-i-add-a-tenant) -- tenant creation flow -- HIGH confidence
- [Stessa: Resident Portal Log In](https://support.stessa.com/en/articles/10414591-resident-portal-log-in-pay-rent) -- invitation email on lease setup -- MEDIUM confidence
- [Stessa: Managing Leases & Tenants](https://support.stessa.com/en/articles/2423532-managing-leases-tenants-in-stessa) -- lease-tenant linking -- MEDIUM confidence
- [AppFolio: Online Portal Help](https://www.appfolio.com/help/online-portal) -- activation link flow, MFA setup -- MEDIUM confidence
- [RentRedi: How to Resend a Tenant Invite](https://help.rentredi.com/en/articles/6085060-how-to-resend-a-tenant-invite) -- resend mechanics -- HIGH confidence
- [Buildium: Property Management Onboarding](https://www.buildium.com/features/onboarding/) -- portal invitation during setup -- MEDIUM confidence
- [Avail: Tenant Portal Features](https://www.avail.com/tenants/features) -- portal capabilities -- MEDIUM confidence

### SaaS Invitation Patterns
- [PageFlows: Invite Teammates User Flow](https://pageflows.com/resources/invite-teammates-user-flow/) -- SaaS invitation UX patterns, edge cases -- MEDIUM confidence
- [UserPilot: Onboard Invited Users](https://userpilot.com/blog/onboard-invited-users-saas/) -- role-aware onboarding for invited users -- MEDIUM confidence
- [SaaSFrame: Invitation Email Examples](https://www.saasframe.io/categories/invitation-emails) -- 29 UI design examples -- MEDIUM confidence
- [Sequenzy: Team Invitation Emails](https://www.sequenzy.com/blog/how-to-create-team-invitation-emails-saas) -- email content best practices -- MEDIUM confidence
- [BayTech: Magic Links UX/Security](https://www.baytechconsulting.com/blog/magic-links-ux-security-and-growth-impacts-for-saas-platforms-2025) -- magic link vulnerabilities, enterprise scanner issues -- HIGH confidence
- [Postmark: User Invitation Email Best Practices](https://postmarkapp.com/guides/user-invitation-email-best-practices) -- email design guidance -- MEDIUM confidence

### Existing Codebase (Direct Analysis)
- `src/components/tenants/invite-tenant-form.tsx` -- TanStack Form path with `portal_access` bug
- `src/components/tenants/invite-tenant-modal.tsx` -- old modal with user-facing type dropdown
- `src/components/onboarding/onboarding-step-tenant.tsx` -- onboarding wizard with raw useState
- `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` -- mutation factories (invite, resend, cancel)
- `src/app/(auth)/accept-invite/page.tsx` -- accept flow with existing user fallback
- `supabase/functions/send-tenant-invitation/index.ts` -- branded email via Resend
- `supabase/migrations/20251128100000_separate_tenant_invitation_from_lease.sql` -- schema with type CHECK constraint
