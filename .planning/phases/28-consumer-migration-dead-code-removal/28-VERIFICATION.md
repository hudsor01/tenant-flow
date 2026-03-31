---
phase: 28-consumer-migration-dead-code-removal
verified: 2026-03-31T07:15:00Z
status: human_needed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 3/5
  gaps_closed:
    - "Owner can see pending invitations on tenant list page with working resend and cancel actions"
    - "Owner can copy an invitation link to clipboard from any pending invitation row"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Navigate to /tenants while logged in as an owner who has sent invitations"
    expected: "Pending invitations appear as rows in the same table as active tenants, with email, Pending/Sent badge, relative timestamp, and a three-dot dropdown menu"
    why_human: "Requires live Supabase data and active invitation records; can't verify table rendering programmatically"
  - test: "Click three-dot menu on an invitation row and select 'Copy Invitation Link'"
    expected: "A success toast 'Invitation link copied to clipboard' appears and the clipboard contains the invitation URL"
    why_human: "Clipboard API requires a real browser environment with HTTPS or localhost"
  - test: "Visit /accept-invite?code=XXX while logged in to the app"
    expected: "Page shows 'Accept Your Invitation' heading with 'You're signed in as {email}' subtext and a single 'Accept Invitation' button — no signup form"
    why_human: "Requires a valid invitation code and active browser session"
---

# Phase 28: Consumer Migration & Dead Code Removal Verification Report

**Phase Goal:** Every invitation creation path in the app uses the unified hook, the legacy modal and its supporting code are deleted, and pending invitations are visible and actionable on the tenant list
**Verified:** 2026-03-31T07:15:00Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (Plan 02 executed in worktree-agent-a544debb)

**Note on worktree context:** The previous verification ran against `gsd/v1.4-tenant-invitation-flow-redesign` (the main development branch) which did not yet contain the Plan 02 commits. This verification runs against `worktree-agent-a544debb` which contains all Plan 02 commits (`feat(28-02): invitation type updates`, `feat(28-02): add InvitationTableRow component with dropdown actions`, `docs(28-02): complete pending invitation rows plan`). All five truths now pass.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Dashboard form, onboarding wizard, and lease wizard all use `useCreateInvitation()` | VERIFIED | All 3 files contain `useCreateInvitation()` call and `handleDuplicateInvitation`; no `useMutation({` remains |
| 2 | No references to `InviteTenantModal`, `isInviteModalOpen`, or `InviteTenantData` exist in src/ outside the intercepting route | VERIFIED | `invite-tenant-modal.tsx` deleted; zero src/ matches for all 3 identifiers outside `@modal/(.)tenants/new/` |
| 3 | Owner can see pending invitations on tenant list with resend and cancel actions | VERIFIED | `invitation-table-row.tsx` exists; `tenant-table.tsx` imports and renders `InvitationTableRow`; `tenants.tsx` passes `invitations` prop; `page.tsx` queries `tenantInvitationQueries.list()` and passes `pendingInvitations` |
| 4 | Owner can copy invitation link to clipboard from any pending invitation row | VERIFIED | `invitation-table-row.tsx` contains `navigator.clipboard.writeText(invitation.invitationUrl)`; `invitation_url` selected in list query and present in `TenantInvitation`, `TenantSectionInvitation`, mapper output |
| 5 | Existing registered user visiting accept-invite is routed to login or one-click accept, not signup form that errors | VERIFIED | `accept-invite/page.tsx` uses `getUser()` on mount, branches on `currentUser`, shows "Accept Invitation" button with "Accepting..." loading state and "You're signed in as {email}" subtext; `invite-signup-form.tsx` has "Log in to accept" link with `encodeURIComponent` and `/login?redirect=` |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/invitation-utils.ts` | Shared `handleDuplicateInvitation()` toast utility | VERIFIED | Exists, exports `handleDuplicateInvitation`, contains `toast.info` and `formatDistanceToNow` |
| `src/components/tenants/invite-tenant-form.tsx` | Dashboard form using unified hook | VERIFIED | Contains `useCreateInvitation`, `handleDuplicateInvitation`; no `useMutation({` |
| `src/components/onboarding/onboarding-step-tenant.tsx` | Onboarding wizard using unified hook | VERIFIED | Contains `useCreateInvitation`, `handleDuplicateInvitation`; no `useMutation({` |
| `src/components/leases/wizard/selection-step-filters.tsx` | Lease wizard using unified hook | VERIFIED | Contains `useCreateInvitation`, `handleDuplicateInvitation`; no `useMutation({` |
| `src/components/tenants/invitation-table-row.tsx` | Invitation row with dropdown actions | VERIFIED | 154-line component; exports `InvitationTableRow`; contains `DropdownMenu`, `Badge`, `ConfirmDialog`, `navigator.clipboard.writeText`, `formatDistanceToNow`, `useResendInvitationMutation`, `useCancelInvitationMutation` |
| `src/components/tenants/tenant-table.tsx` | TenantTable with invitation rows in same tbody | VERIFIED | Imports `InvitationTableRow`; `TenantTableProps` includes `invitations: TenantSectionInvitation[]`; renders `{invitations.map(inv => <InvitationTableRow key=... />)}` inside same `<tbody>` |
| `src/hooks/api/query-keys/tenant-invitation-keys.ts` | List query including `invitation_url` | VERIFIED | `.select()` contains `invitation_url`; `InvitationRow` type has `invitation_url: string`; mapper outputs `invitation_url: row.invitation_url` |
| `src/types/api-contracts.ts` | `TenantInvitation` with `pending`/`cancelled` status and `invitation_url` | VERIFIED | `TenantInvitation.status` is `'pending' \| 'sent' \| 'accepted' \| 'expired' \| 'cancelled'`; `invitation_url: string` field present |
| `src/types/sections/tenants.ts` | `TenantSectionInvitation` with `invitationUrl` | VERIFIED | Interface contains `invitationUrl?: string` |
| `src/app/(auth)/accept-invite/page.tsx` | Session-aware accept page | VERIFIED | Has `getUser()`, `setCurrentUser`, `handleLoggedInAccept`, "Accept Invitation" button, "Accepting..." loading text, "You're signed in as" subtext |
| `src/components/auth/accept-invite/invite-signup-form.tsx` | Signup form with login link | VERIFIED | Has "Log in to accept", `encodeURIComponent`, `/login?redirect=`, `code` prop |
| ~~`src/components/tenants/invite-tenant-modal.tsx`~~ | Legacy modal — must be DELETED | VERIFIED (deleted) | File does not exist |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `invite-tenant-form.tsx` | `use-create-invitation.ts` | `useCreateInvitation()` call | WIRED | Line 47: `const createInvitation = useCreateInvitation()` |
| `onboarding-step-tenant.tsx` | `use-create-invitation.ts` | `useCreateInvitation()` call | WIRED | Line 28: `const createInvitation = useCreateInvitation()` |
| `selection-step-filters.tsx` | `use-create-invitation.ts` | `useCreateInvitation()` call | WIRED | Line 32: `const createInvitation = useCreateInvitation()` |
| `invitation-utils.ts` | sonner toast + date-fns | `handleDuplicateInvitation` | WIRED | Line 16: `toast.info(`, line 14: `formatDistanceToNow(` |
| `tenants/page.tsx` | `tenant-invitation-keys.ts` | `tenantInvitationQueries.list()` | WIRED | Line 46: `const { data: invitationsResponse } = useQuery(tenantInvitationQueries.list())` |
| `tenants/page.tsx` | `Tenants` component | `invitations={pendingInvitations}` | WIRED | Line 181: `invitations={pendingInvitations}`; `pendingInvitations` filtered to `pending\|sent` and mapped with `invitationUrl` |
| `tenants.tsx` | `TenantTable` | `invitations={invitations}` prop | WIRED | Line 180: `invitations={invitations}` passed to `<TenantTable>` |
| `tenant-table.tsx` | `invitation-table-row.tsx` | `InvitationTableRow` in same tbody | WIRED | Lines 206-208: `{invitations.map(inv => <InvitationTableRow key=... invitation={inv} />)}` inside same `<tbody>` |
| `invitation-table-row.tsx` | `use-tenant-invite-mutations.ts` | `useResendInvitationMutation`/`useCancelInvitationMutation` | WIRED | Lines 35-36: both hooks called directly; `resendMutation.mutate(invitation.id)` and `cancelMutation.mutate(invitation.id)` |
| `invitation-table-row.tsx` | `navigator.clipboard` | `handleCopyLink` | WIRED | Line 44: `await navigator.clipboard.writeText(invitation.invitationUrl)` |
| `accept-invite/page.tsx` | `supabase.auth.getUser()` | Session check on page load | WIRED | Lines 53-63: `useEffect` calls `getUser()`, sets `currentUser` |
| `invite-signup-form.tsx` | `/login?redirect=` | Login link with encoded redirect | WIRED | Line 234: `href={/login?redirect=${encodeURIComponent(...)}}` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `src/app/(owner)/tenants/page.tsx` | `pendingInvitations` | `tenantInvitationQueries.list()` → `.from('tenant_invitations').select(...)` | Yes — PostgREST query against DB | FLOWING |
| `src/components/tenants/tenants.tsx` | `invitations` | Received from `page.tsx` as `pendingInvitations` prop | Yes — flows from real query | FLOWING |
| `src/components/tenants/tenant-table.tsx` | `invitations` | Received from `tenants.tsx` | Yes — passed through from real query | FLOWING |
| `src/components/tenants/invitation-table-row.tsx` | `invitation.invitationUrl` | `invitationUrl` field in `TenantSectionInvitation` mapped from `invitation_url` DB column | Yes — selected in query select string | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED (requires running Next.js server and real Supabase session)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| UI-01 | 28-01 | Migrate `invite-tenant-form.tsx` to use `useCreateInvitation()` | SATISFIED | File uses `useCreateInvitation()` at line 47; no `useMutation({` |
| UI-02 | 28-01 | Migrate `onboarding-step-tenant.tsx` to use `useCreateInvitation()` | SATISFIED | File uses `useCreateInvitation()` at line 28; no `useMutation({` |
| UI-03 | 28-01 | Migrate `selection-step-filters.tsx` to use `useCreateInvitation()` | SATISFIED | File uses `useCreateInvitation()` at line 32; no `useMutation({` |
| UI-04 | 28-01 | Delete `InviteTenantModal` and associated Zustand store state and dead types | SATISFIED | `invite-tenant-modal.tsx` deleted; `isInviteModalOpen`, `openInviteModal`, `closeInviteModal`, `InviteTenantData` all absent from src/ |
| UI-05 | 28-02 | User can see pending invitations on tenant list page with resend and cancel actions | SATISFIED | `invitation-table-row.tsx` created; `TenantTable` renders it; `page.tsx` queries `tenant_invitations` and passes `pendingInvitations`; component contains resend and cancel dropdown actions with confirm dialog |
| UI-06 | 28-02 | User can copy invitation link to clipboard from invitation row | SATISFIED | `navigator.clipboard.writeText(invitation.invitationUrl)` in `invitation-table-row.tsx`; `invitation_url` selected in DB query, mapped in query keys, typed in `TenantInvitation` and `TenantSectionInvitation` |
| UI-07 | 28-03 | Existing user visiting accept page is routed to login instead of seeing signup form that errors | SATISFIED | Session-aware page with `getUser()`, one-click accept button, "Log in to accept" link with encoded redirect |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/hooks/api/query-keys/tenant-invitation-keys.ts` | 37-43 | No `.limit()` or `.range()` on list query | Warning | Pre-existing condition (unchanged since Phase 17). Invitation list is expected to be small per owner, but violates CLAUDE.md convention. Not introduced by Phase 28. |
| `src/types/sections/tenants.ts` + `src/app/(owner)/tenants/page.tsx` | 15-16 / 183-184 | `onResendInvitation` and `onCancelInvitation` in `TenantsProps` (required props) but `tenants.tsx` does not use them — `InvitationTableRow` calls mutations directly | Info | Dead prop passing. Does not cause TypeScript errors since props are not destructured. `page.tsx` still passes them satisfying the required type. Does not block goal achievement. |

### Human Verification Required

#### 1. Pending Invitation Rows on Tenant List

**Test:** Navigate to `/tenants` as an owner who has sent at least one pending invitation
**Expected:** Invitation rows appear inline in the same table as active tenants, showing the invitee email, an amber "Pending" or blue "Sent" badge, a relative timestamp ("Sent 2 days ago"), and a three-dot dropdown menu with Resend Invitation, Copy Invitation Link, and Cancel Invitation items
**Why human:** Requires live Supabase data with active invitation records and a browser to confirm visual column alignment, badge colors, and dropdown behavior

#### 2. Clipboard Copy Action

**Test:** Click the three-dot dropdown on an invitation row and select "Copy Invitation Link"
**Expected:** A success toast "Invitation link copied to clipboard" appears and the browser clipboard contains the full accept-invite URL
**Why human:** `navigator.clipboard.writeText()` requires a real browser context (HTTPS or localhost); cannot confirm with source-code analysis alone

#### 3. Accept-Invite Logged-In Flow

**Test:** While logged in as any user, navigate to `/accept-invite?code=<valid-unexpired-code>`
**Expected:** Page shows "Accept Your Invitation" heading, "You're signed in as {email}" subtext, and a single "Accept Invitation" button with no signup form fields visible
**Why human:** Requires a valid unexpired invitation code in the database and an active browser session

### Re-Verification Summary

The two gaps from the previous verification are fully resolved in this worktree:

**Gap 1 (Truth 3 — pending invitations visible)** — CLOSED. `invitation-table-row.tsx` (154 lines) is created with all required patterns. `tenant-table.tsx` has `invitations: TenantSectionInvitation[]` in props and renders `InvitationTableRow` inside the same `<tbody>` after virtualizer rows. `tenants.tsx` destructures `invitations` from `TenantsProps` and passes it to `<TenantTable>`. `page.tsx` calls `tenantInvitationQueries.list()`, filters to `pending|sent`, maps to `TenantSectionInvitation` shape with `invitationUrl`, and passes as `invitations={pendingInvitations}`.

**Gap 2 (Truth 4 — copy invitation link)** — CLOSED. `invitation_url` added to the `.select()` string in `tenant-invitation-keys.ts`, to the `InvitationRow` local type and mapper output. `TenantInvitation.status` expanded to include `pending` and `cancelled`. `TenantSectionInvitation` has `invitationUrl?: string`. `invitation-table-row.tsx` calls `navigator.clipboard.writeText(invitation.invitationUrl)` in `handleCopyLink`.

All 5 truths are verified programmatically. Three behaviors remain for human confirmation (visual rendering, clipboard API, and real browser session flow).

---

_Verified: 2026-03-31T07:15:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes (previous gaps_found at 3/5 → now human_needed at 5/5)_
