# Domain Pitfalls: Tenant Invitation Flow Consolidation

**Domain:** Multi-path invitation consolidation in existing SaaS (property management)
**Researched:** 2026-03-30
**Confidence:** HIGH (pitfalls derived from direct codebase analysis + industry patterns)

## Critical Pitfalls

Mistakes that cause data loss, security breaches, or require rewrites.

### Pitfall 1: CHECK Constraint Violation from Inconsistent Type Values

**What goes wrong:** The `invite-tenant-form.tsx` (dashboard path) inserts `type: 'portal_access'` on line 78, but the DB CHECK constraint (`tenant_invitations_type_check`) only allows `'platform_access'` and `'lease_signing'`. The string `'portal_access'` violates the constraint and the insert fails silently or throws an unhandled PostgREST error.

**Why it happens:** Four separate code paths were written independently. Each path hardcodes its own `type` value without referencing a shared constant or the DB constraint definition. Nobody tested the dashboard invite path end-to-end against the live DB after the CHECK constraint was added.

**Consequences:** Dashboard invitations fail at the database level. The owner sees a generic error toast. No invitation record is created, no email is sent, and the owner thinks the system is broken. This is a **production bug right now**.

**Prevention:**
- Define a single `INVITATION_TYPES` constant (e.g., in `src/lib/constants/`) derived from the Zod schema `invitationTypeSchema`, which already matches the DB CHECK constraint
- All insertion code must reference this constant, never hardcode strings
- Add a unit test that asserts every insertion path uses a value from the allowed set
- The unified flow eliminates this class of bug entirely -- one insertion function, one type assignment

**Detection:** Any invitation sent from the dashboard `/tenants/new` page fails. Check Sentry for PostgREST errors with `check_violation` or `23514` error code on `tenant_invitations`.

**Phase to address:** Phase 1 (DB + shared mutation). This is a fix-first item before any UI consolidation.

---

### Pitfall 2: RLS Policy Column Mismatch (property_owner_id vs owner_user_id)

**What goes wrong:** The `tenant_invitations` RLS INSERT/UPDATE/DELETE policies still reference the old column `property_owner_id` (from base schema migration `20251101000000`), but the live DB column was renamed to `owner_user_id`. The frontend `invite-tenant-form.tsx` uses an authenticated Supabase client (not service_role), meaning the insert goes through RLS. The RLS policy evaluates `property_owner_id = get_current_property_owner_id()`, but the column name is `owner_user_id`.

**Why it happens:** The column rename migration ran on the live DB but the RLS policies were never updated for `tenant_invitations` specifically. Other tables (leases, properties) had their policies fixed in later migrations, but `tenant_invitations` was missed. The frontend code appears to work because the `tenant-invite-mutation-options.ts` (lease wizard path) uses service_role via the Edge Function, bypassing RLS entirely.

**Consequences:** Two scenarios:
1. If PostgreSQL resolves the policy against the actual column name and the policy references a non-existent column, the policy silently fails (allows nothing), meaning **direct PostgREST inserts from authenticated clients are blocked**. The dashboard invite form would fail.
2. If an alias or compatibility shim exists, it works by accident but is fragile.

**Prevention:**
- Audit ALL RLS policies on `tenant_invitations` during Phase 1 migration
- Rewrite policies to use `owner_user_id = (select auth.uid())` (direct comparison, no function call overhead)
- Drop the stale `get_current_property_owner_id()` dependency from these policies
- Add RLS integration tests specifically for tenant invitation CRUD (insert, select, update, delete) from an authenticated owner

**Detection:** Run `SELECT polname, polqual, polwithcheck FROM pg_policy WHERE polrelid = 'public.tenant_invitations'::regclass;` and check for references to `property_owner_id`.

**Phase to address:** Phase 1 (DB migration). Must be fixed before the unified mutation can safely use an authenticated client.

---

### Pitfall 3: Race Condition -- Duplicate Invitations for Same Email

**What goes wrong:** There is no UNIQUE constraint on `(email, owner_user_id, status)` for active invitations. Two rapid clicks, two browser tabs, or two API calls can create multiple `sent` invitations for the same email to the same owner. The tenant receives multiple emails with different invitation codes, causing confusion about which link to click. If they use an older link, the newer invitation remains dangling.

**Why it happens:** The table has `UNIQUE(invitation_code)` but no uniqueness constraint on the business-level combination of email + owner + active status. The current code generates `invitation_code` via `crypto.randomUUID()` client-side, so each insert gets a unique code regardless of duplicates.

**Consequences:**
- Tenant receives multiple invitation emails (spam, confusion)
- Owner sees duplicate pending invitations in their list
- If an owner resends, the old invitation is not cancelled -- both remain active
- The `tenant-invitation-accept` Edge Function marks ONE invitation as accepted but leaves duplicates in `sent` status forever

**Prevention:**
- Add a partial unique index: `CREATE UNIQUE INDEX idx_tenant_invitations_active_email ON tenant_invitations(email, owner_user_id) WHERE status IN ('pending', 'sent')`
- The unified mutation should check for existing active invitations before inserting (upsert or explicit check)
- On resend, update the existing record (new code, new expiry) rather than creating a new one
- The `cancel` mutation should cancel ALL active invitations for an email, not just one by ID

**Detection:** Query `SELECT email, owner_user_id, COUNT(*) FROM tenant_invitations WHERE status IN ('pending', 'sent') GROUP BY email, owner_user_id HAVING COUNT(*) > 1`.

**Phase to address:** Phase 1 (DB migration -- add partial unique index) + Phase 2 (unified mutation -- upsert logic).

---

### Pitfall 4: Existing Invitations Break During Type Constraint Migration

**What goes wrong:** If the consolidation adds a new `type` value (e.g., unifying to a single type) or removes existing values from the CHECK constraint, any existing rows with the old type value will violate the new constraint. The migration fails and rolls back.

**Why it happens:** `ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)` scans all existing rows by default. If any row has a type value not in the new allowed set, the entire migration fails.

**Consequences:** Migration fails in production. If not caught in staging, it blocks the entire deployment.

**Prevention:**
- **Step 1:** Backfill existing rows to the new type values BEFORE modifying the constraint
- **Step 2:** Add the new constraint with `NOT VALID` (skips existing row scan)
- **Step 3:** Run `VALIDATE CONSTRAINT` in a separate statement (acquires ShareUpdateExclusive lock, allows concurrent operations)
- Write an idempotent migration: `UPDATE tenant_invitations SET type = 'platform_access' WHERE type NOT IN ('platform_access', 'lease_signing')` before dropping/recreating the constraint
- Test migration against a production snapshot, not just empty dev DB

**Detection:** Migration test with seeded data that includes edge-case type values.

**Phase to address:** Phase 1 (DB migration). Must be the first operation in any migration that touches type constraints.

---

### Pitfall 5: Onboarding Invite Creates Orphaned Invitations Without Property Context

**What goes wrong:** The onboarding wizard (`onboarding-step-tenant.tsx`) creates invitations with `property_id: null` and `unit_id: null`. The tenant receives a generic "join the platform" email with no property context. After accepting, the tenant has no association to any property or unit. The owner must then manually create a lease and assign the tenant. But the invitation list shows this tenant with blank property/unit columns, making it look broken.

**Why it happens:** The onboarding flow has no property picker because the property may not exist yet (or was just created in a previous wizard step). The invitation is sent before the owner completes onboarding. There is no mechanism to retroactively update the invitation with property context once the owner finishes onboarding.

**Consequences:**
- Tenant receives a vague invitation email ("You've been invited to TenantFlow") with no property name
- Owner dashboard shows invitation with empty property/unit -- looks like a bug
- If the owner abandons onboarding after step 2 (tenant invite) but before step 3 (lease), the tenant is invited to... nothing

**Prevention:**
- The unified flow should make property context required when the calling context has a property (lease wizard, dashboard with property selected)
- For onboarding context, pass the property ID from the just-created property step to the tenant step
- Display a clear "Platform invitation (no property assigned yet)" state instead of empty columns
- Consider deferring the invitation email until property context is available

**Detection:** Query `SELECT COUNT(*) FROM tenant_invitations WHERE property_id IS NULL AND status = 'sent'` -- these are contextless invitations.

**Phase to address:** Phase 2 (unified component) + Phase 3 (onboarding integration).

---

### Pitfall 6: Invitation Code Enumeration via Validate Endpoint

**What goes wrong:** The `tenant-invitation-validate` Edge Function returns different HTTP status codes for different failure modes: 404 for invalid/used codes, 410 for expired codes. An attacker can enumerate valid-but-expired invitation codes by checking for 410 responses, then use timing to distinguish "code exists but expired" from "code never existed." The rate limit (10 req/min) slows but does not prevent a determined attacker.

**Why it happens:** The validate endpoint is intentionally unauthenticated (the invitation code IS the authentication). Different HTTP status codes for different failure states is helpful UX but leaks information about which codes have been used.

**Consequences:**
- Attacker learns which invitation codes existed (even if expired/used)
- Combined with email enumeration (200 response includes email address), an attacker can map email-to-invitation relationships
- Not an immediate data breach, but violates OWASP's guidance on consistent error responses for authentication endpoints

**Prevention:**
- Return 404 for ALL failure modes (invalid, used, expired) -- the client already handles this gracefully
- Move expiry checking to the accept step only (validate returns "valid" or "not found," nothing else)
- Rate limit should be per-IP AND per-code (prevent an attacker from trying many codes from one IP)
- Invitation codes should be cryptographically random (UUID v4 is acceptable -- 122 bits of entropy)
- Add Sentry alerting on sustained 404 patterns from a single IP against the validate endpoint

**Detection:** Monitor `tenant-invitation-validate` Edge Function logs for high 404 rates from single IPs.

**Phase to address:** Phase 2 (Edge Function hardening). Can be addressed alongside the unified mutation work.

## Moderate Pitfalls

### Pitfall 7: Four Email Send Implementations with Inconsistent Error Handling

**What goes wrong:** The invitation email send logic is duplicated in four places:
1. `invite-tenant-form.tsx` (lines 85-106) -- inline fetch, `.catch()` swallows error
2. `onboarding-step-tenant.tsx` (lines 65-82) -- identical inline fetch, `.catch()` swallows error
3. `selection-step-filters.tsx` (lines 66-81) -- identical inline fetch, `.catch()` swallows error
4. `tenant-invite-mutation-options.ts` (lines 24-53) -- extracted `sendInvitationEmail()` helper, logs error but does not surface to user

None of these inform the user that the invitation record was created but the email failed to send. The tenant never receives the email, the owner thinks it was sent, and the invitation sits in `sent` status with no email actually delivered.

**Prevention:**
- Extract to single `sendInvitationEmail()` function (already exists in `tenant-invite-mutation-options.ts` -- make all paths use it)
- Return a result type: `{ emailSent: boolean; error?: string }`
- On email failure, show a warning toast: "Invitation created but email delivery failed. You can resend from the tenant list."
- Consider updating invitation status to `pending` (not `sent`) if the email fails, so the owner knows to resend

**Phase to address:** Phase 2 (unified mutation). All paths converge to one function.

---

### Pitfall 8: Cache Invalidation Inconsistency Across Paths

**What goes wrong:** The four invitation paths invalidate different query keys on success:
- `invite-tenant-form.tsx`: invalidates `tenantQueries.all()`
- `onboarding-step-tenant.tsx`: invalidates `tenantQueries.lists()` only
- `selection-step-filters.tsx`: invalidates both `tenantQueries.lists()` and `tenantInvitationQueries.invitations()`
- `use-tenant-invite-mutations.ts`: invalidates `tenantQueries.lists()`, `tenantInvitationQueries.invitations()`, AND `leaseQueries.lists()`

After sending an invitation from the dashboard form, the tenant list may update but the invitation list does not refresh. After sending from the onboarding wizard, neither the invitation list nor the lease list refreshes.

**Prevention:**
- The unified mutation hook must invalidate ALL related query keys: `tenantQueries.lists()`, `tenantInvitationQueries.invitations()`, and `ownerDashboardKeys.all` (per CLAUDE.md convention)
- Create a single `invalidateInvitationRelatedQueries()` helper to ensure consistency
- Add a unit test that verifies the mutation's `onSuccess` calls `invalidateQueries` for all required keys

**Phase to address:** Phase 2 (unified mutation hook).

---

### Pitfall 9: Type Dropdown Exposes Internal Metadata to Users

**What goes wrong:** The `invite-tenant-modal.tsx` renders a `<select>` dropdown with options "Platform Access Only" and "Lease Signing." These are internal system concepts that a property owner should never need to choose between. Owners do not think in terms of "platform access" vs "lease signing" -- they think "I want to invite a tenant."

**Why it happens:** The `type` column was designed for backend routing logic (does the invitation link to a lease or not?), but it was surfaced as a user-facing form field without UX review.

**Consequences:**
- Owner confusion: "What does Platform Access mean?"
- Wrong selection: Owner picks "Lease Signing" without a lease context, then the invitation has `type: 'lease_signing'` with `lease_id: null` -- semantically broken
- Form complexity: An extra field that provides no user value

**Prevention:**
- Remove the type dropdown entirely from the UI
- Auto-set type based on calling context: lease wizard sets `lease_signing`, everything else sets `platform_access`
- The unified component receives context as a prop, not as a user selection
- If a type dropdown is ever needed (admin view), it should be in an admin-only settings panel, not the invite form

**Phase to address:** Phase 2 (unified component design). This is a core UX requirement of the milestone.

---

### Pitfall 10: Email Deliverability Degradation After Consolidation

**What goes wrong:** Consolidating invitation paths may increase email send volume from a single domain/sender, pushing past Resend's rate limits or triggering spam filters. If invitation emails and marketing emails (newsletter) share the same Resend API key and sender domain, deliverability issues in one stream affect the other.

**Why it happens:** Invitation consolidation may lead to more resend operations (retry logic, bulk invites if added later). The current architecture sends from a single Resend configuration without stream separation.

**Consequences:**
- Invitation emails land in spam folders
- Resend rate limits cause silent failures (the Edge Function logs the error but the owner sees "Invitation sent")
- If the domain gets blacklisted, ALL transactional emails (auth, receipts, invitations) are affected

**Prevention:**
- Verify SPF, DKIM, and DMARC are configured for the sending domain (table-stakes requirement per Google/Microsoft 2025 sender policies)
- Use Resend tags (already partially implemented: `category: 'tenant-invitation'`) to separate invitation traffic from other email types
- Add monitoring: alert if the Edge Function returns non-200 from Resend more than N times in an hour
- Consider adding an `email_sent_at` column to `tenant_invitations` to track actual delivery vs assumed delivery
- Rate limit invitation creation per owner (e.g., max 50 invitations per hour) to prevent abuse

**Phase to address:** Phase 2 (Edge Function consolidation) + operational monitoring.

---

### Pitfall 11: Invitation Expiry Edge Cases with Timezone Handling

**What goes wrong:** Invitation expiry is calculated with `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()` client-side in multiple places. This uses the client's clock, which may be wrong. The `tenant-invitation-validate` Edge Function compares `new Date(invitation.expires_at) < new Date()` using the Edge Function's server clock. Clock skew between client and server can cause invitations to expire early or late.

**Why it happens:** Expiry is calculated client-side rather than server-side. There is no server-side `NOW() + INTERVAL '7 days'` default on the column.

**Consequences:**
- A client with a clock 1 hour ahead creates an invitation that expires 1 hour early from the server's perspective
- Edge case: an invitation created at 23:59 UTC on a client with clock skew might appear valid for 6 days instead of 7

**Prevention:**
- Move expiry calculation to the database: `DEFAULT NOW() + INTERVAL '7 days'` on the `expires_at` column, or calculate server-side in the mutation
- If client-side calculation must stay, use the Supabase server time (`SELECT NOW()`) as the reference
- The unified mutation should calculate expiry in one place, not four
- Validate endpoint should use `expires_at < NOW()` in the SQL query (not JavaScript date comparison) for consistency

**Phase to address:** Phase 1 (DB migration -- add default) + Phase 2 (unified mutation).

## Minor Pitfalls

### Pitfall 12: Invitation URL Inconsistency (`accept-invitation` vs `accept-invite`)

**What goes wrong:** The invitation forms generate URLs with `/auth/accept-invitation?code=...` but the actual Next.js page route is at `/accept-invite/` (based on `src/app/(auth)/accept-invite/page.tsx`). If these paths do not match, tenants clicking the email link land on a 404.

**Prevention:**
- Use a single `INVITATION_ACCEPT_PATH` constant for URL construction
- Add an E2E test that generates an invitation, extracts the URL, and navigates to it
- If both paths exist (redirect from old to new), document the redirect in proxy.ts

**Phase to address:** Phase 2 (unified mutation). Verify the actual route and use it consistently.

---

### Pitfall 13: No Handling for Existing Tenant Accepting a New Invitation

**What goes wrong:** The `tenant-invitation-accept` Edge Function creates a tenant record via upsert (`onConflict: 'user_id', ignoreDuplicates: false`). If a tenant already exists and accepts a new invitation (e.g., a tenant moving to a new property with the same owner), the upsert succeeds but the existing tenant record is not updated with the new property/unit context. The new invitation's `lease_id` association works, but any prior property/unit from the old invitation persists.

**Prevention:**
- When an existing tenant accepts a new invitation, update the tenant's property/unit associations based on the new invitation's context
- Consider whether the `tenants` table should have property/unit context at all, or whether this should only live in `lease_tenants`
- Log when an upsert hits an existing tenant so the system knows it is a re-invitation scenario

**Phase to address:** Phase 2 (Edge Function update).

---

### Pitfall 14: Accessibility Gaps in Invitation Forms

**What goes wrong:** The `invite-tenant-modal.tsx` uses raw `<button>`, `<input>`, `<select>`, and `<label>` elements without proper `aria-` attributes. The close button (line 94-99) has no `aria-label`. The modal backdrop click-to-close has no keyboard equivalent (Escape key). The form does not announce submission success/failure to screen readers.

**Prevention:**
- Replace the custom modal with the shadcn `Dialog` component (already in the project's UI library)
- Ensure all interactive elements have `aria-label` where visible text is insufficient
- Add Escape key handler for modal dismissal
- Use `aria-live` regions or toast announcements for form submission feedback
- The unified component should be built with shadcn primitives from the start, avoiding a second accessibility pass

**Phase to address:** Phase 3 (unified component implementation). Build accessible from day one.

---

### Pitfall 15: Query Key Leak -- Invitation List Shows All Statuses

**What goes wrong:** The `tenantInvitationQueries.list()` query fetches ALL invitations without filtering by status. This includes `cancelled` and `expired` invitations mixed with `sent` and `accepted` ones. The UI must filter client-side, which wastes bandwidth and creates inconsistent displays if the filter logic differs between views.

**Prevention:**
- Add status filter to the PostgREST query: `.in('status', ['pending', 'sent', 'accepted'])`
- Provide separate query options for "active invitations" and "all invitations (admin view)"
- Ensure the unified component clearly shows expired/cancelled states rather than hiding them

**Phase to address:** Phase 2 (query optimization alongside mutation consolidation).

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| DB migration (Phase 1) | CHECK constraint change breaks existing rows | Backfill data BEFORE altering constraint; use NOT VALID + VALIDATE |
| DB migration (Phase 1) | RLS policies reference old column name | Audit and rewrite ALL tenant_invitations policies to use owner_user_id |
| DB migration (Phase 1) | Missing unique index allows duplicate active invitations | Add partial unique index on (email, owner_user_id) WHERE status IN ('pending', 'sent') |
| Unified mutation (Phase 2) | Cache invalidation misses some query keys | Create shared invalidation helper; test all key invalidations |
| Unified mutation (Phase 2) | Email send failure not surfaced to user | Return result type from sendInvitationEmail; show warning toast on failure |
| Unified component (Phase 3) | Type dropdown reappears due to incomplete cleanup | Delete invite-tenant-modal.tsx entirely; grep for all type dropdown references |
| Onboarding integration (Phase 3) | Invitation created without property context | Pass property ID from previous wizard step; make it required when available |
| Edge Function update (Phase 2) | Validate endpoint leaks invitation existence info | Return 404 for all failure modes; move expiry check to accept step |
| Testing (all phases) | New code paths not covered by RLS integration tests | Add tenant_invitations to RLS test suite: insert, select, update from owner and non-owner |

## Sources

- Codebase analysis: `invite-tenant-form.tsx`, `onboarding-step-tenant.tsx`, `selection-step-filters.tsx`, `tenant-invite-mutation-options.ts` (4 code paths examined)
- DB schema: `supabase/migrations/20251128100000_separate_tenant_invitation_from_lease.sql`, `supabase/migrations/20251101000000_base_schema.sql`
- Generated types: `src/types/supabase.ts` (confirms `owner_user_id` is the live column name)
- RLS policies: `supabase/migrations/20251225182240_fix_rls_policy_security_and_performance.sql`, `supabase/migrations/20260303140000_phase3_rls_function_audit.sql`
- Edge Functions: `tenant-invitation-validate/index.ts`, `tenant-invitation-accept/index.ts`, `send-tenant-invitation/index.ts`
- [Breaking Invite Limits with Race Condition](https://medium.com/@moatymohamed897/breaking-invite-limits-with-race-condition-196c9995f5fd) -- race condition exploitation in invitation systems
- [Stop Duplicate Records: Fix Race Conditions Using Unique Database Indexes](https://medium.com/@itsvinayc/race-conditions-in-web-apps-and-how-a-unique-index-can-save-you-736d682dabfb) -- partial unique index pattern
- [Exploiting a Race Condition in an Organization Invitation Feature](https://medium.com/@n0apol0giz3/outrunning-the-limits-exploiting-a-race-condition-in-an-organization-invitation-feature-cf4106263d57) -- real-world invitation race condition exploit
- [Breaking the Invite: 3 Easy-to-Find Vulnerabilities in Invite Users Functionality](https://medium.com/@basetm307/breaking-the-invite-3-easy-to-find-vulnerabilities-in-invite-users-function-735c3b75d130) -- invitation enumeration and brute force
- [OWASP Top 10 2025: A07 Authentication Failures](https://owasp.org/Top10/2025/A07_2025-Authentication_Failures/) -- consistent error responses, rate limiting
- [PostgreSQL Database Migrations: Zero-Downtime Patterns](https://oneuptime.com/blog/post/2026-02-02-postgresql-database-migrations/view) -- NOT VALID + VALIDATE constraint pattern
- [Backward Compatibility and Making Changes with Less Risk](https://hackmd.io/@pyYYTG05Sl6tmFXiz2DuWw/BymSCGgJB) -- migration backward compatibility
- [Mastering Email Deliverability: The Ultimate 2026 Guide](https://www.mailmunch.com/blog/mastering-email-deliverability) -- SPF/DKIM/DMARC requirements
- [How to Onboard Invited Users to Your SaaS Product](https://userpilot.com/blog/onboard-invited-users-saas/) -- invited user onboarding patterns
- [Designing an Intuitive User Flow for Inviting Teammates](https://pageflows.com/blog/invite-teammates-user-flow/) -- invitation UX best practices
