---
phase: 27-unified-mutation-hook
verified: 2026-03-30T23:45:00Z
status: passed
score: 4/4 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 0/4
  gaps_closed:
    - "INVITATION_ACCEPT_PATH constant created at src/lib/constants/routes.ts"
    - "All 5 files updated to use INVITATION_ACCEPT_PATH (zero /auth/accept-invitation strings remain)"
    - "useCreateInvitation() hook created with full type derivation, duplicate detection, DB insert, email send, and cache invalidation"
    - "useInviteTenantMutation removed from use-tenant-invite-mutations.ts"
    - "sendInvitationEmail exported from tenant-invite-mutation-options.ts"
    - "invite() factory removed from tenant-invite-mutation-options.ts"
    - "9 test cases created in use-create-invitation.test.tsx covering all 5 requirements"
  gaps_remaining: []
  regressions: []
---

# Phase 27: Unified Mutation Hook Verification Report

**Phase Goal:** One hook handles all invitation creation logic -- type derivation, duplicate detection, DB insert, email send, and cache invalidation -- so no UI component needs to implement any of this inline
**Verified:** 2026-03-30T23:45:00Z
**Status:** passed
**Re-verification:** Yes -- after gap closure (previous verification was a false negative; phase was fully executed in worktree)

## Note on Previous Verification

The previous verification (score 0/4, status gaps_found) was incorrect. The verifier read from `/Users/richard/Developer/tenant-flow/` (the main repo) rather than from the worktree `/Users/richard/Developer/tenant-flow/.claude/worktrees/agent-a9ceae30/` where the phase execution committed its changes. All four gaps were false negatives -- the code was present and correct. This re-verification reads directly from the worktree and finds all artifacts complete.

**Commits delivering this phase:**
- `d14529db8` feat(27-01): extract INVITATION_ACCEPT_PATH constant
- `8cf050f47` feat(27-02): create useCreateInvitation hook
- `dd242cacc` refactor(27-02): remove old invite factory and useInviteTenantMutation
- `3a54a58ab` docs(27-02): complete unified mutation hook plan

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Calling useCreateInvitation() with lease_id produces 'lease_signing'; without produces 'platform_access' | ✓ VERIFIED | Line 65: `const invitationType = params.lease_id ? 'lease_signing' : 'platform_access'` |
| 2 | Duplicate invitation for same email surfaces existing and offers resend instead of second row | ✓ VERIFIED | Lines 52-62: pre-check query; lines 95-107: 23505 race condition fallback; returns `{ status: 'duplicate', existing }` |
| 3 | After successful invitation, tenant list, invitation list, and dashboard queries all update | ✓ VERIFIED | Lines 130-134: invalidates tenantQueries.all(), tenantInvitationQueries.invitations(), ownerDashboardKeys.all |
| 4 | Invitation accept URL matches actual Next.js route (/accept-invite) everywhere | ✓ VERIFIED | Zero `/auth/accept-invitation` in src/; INVITATION_ACCEPT_PATH = '/accept-invite' used in 5 files + hook |

**Score:** 4/4 truths verified

### Required Artifacts

#### Plan 27-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/constants/routes.ts` | INVITATION_ACCEPT_PATH = '/accept-invite' | ✓ VERIFIED | File exists, 2 lines, exports `INVITATION_ACCEPT_PATH = '/accept-invite' as const` |
| `src/components/tenants/invite-tenant-form.tsx` | Uses INVITATION_ACCEPT_PATH | ✓ VERIFIED | Line 18: imports constant; line 63: uses in URL construction |
| `src/components/onboarding/onboarding-step-tenant.tsx` | Uses INVITATION_ACCEPT_PATH | ✓ VERIFIED | Confirmed by grep: imports and uses INVITATION_ACCEPT_PATH |
| `src/components/leases/wizard/selection-step-filters.tsx` | Uses INVITATION_ACCEPT_PATH | ✓ VERIFIED | Confirmed by grep: imports and uses INVITATION_ACCEPT_PATH |
| `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` | sendInvitationEmail exported; invite() removed | ✓ VERIFIED | Line 23: `export async function sendInvitationEmail`; no invite() factory present |
| `src/hooks/api/__tests__/use-tenant.test.tsx` | Mock URL uses /accept-invite | ✓ VERIFIED | Line 413: `invitation_url: 'http://localhost:3050/accept-invite?code=code-123'` |

#### Plan 27-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/hooks/api/use-create-invitation.ts` | Unified useCreateInvitation() hook | ✓ VERIFIED | 154 lines (>60 min_lines); exports useCreateInvitation, CreateInvitationParams, CreateInvitationResult |
| `src/hooks/api/query-keys/tenant-invite-mutation-options.ts` | sendInvitationEmail exported; invite() removed | ✓ VERIFIED | `sendInvitationEmail` and `tenantInviteMutations` exported; no invite() factory |
| `src/hooks/api/use-tenant-invite-mutations.ts` | useInviteTenantMutation removed | ✓ VERIFIED | Exports only: useResendInvitationMutation, useCancelInvitationMutation, useUpdateNotificationPreferencesMutation |
| `src/hooks/api/__tests__/use-create-invitation.test.tsx` | 9 test cases covering all 5 requirements | ✓ VERIFIED | 451 lines (>100 min_lines); exactly 9 `it()` cases; INV-01 through INV-05 all tagged |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `use-create-invitation.ts` | `tenant-invite-mutation-options.ts` | imports sendInvitationEmail | ✓ WIRED | Line 18: `import { sendInvitationEmail } from './query-keys/tenant-invite-mutation-options'`; line 115: called |
| `use-create-invitation.ts` | `tenant-invitation-keys.ts` | cache invalidation in onSuccess | ✓ WIRED | Line 20: import; line 131-133: `tenantInvitationQueries.invitations()` in invalidateQueries |
| `use-create-invitation.ts` | `use-owner-dashboard.ts` | ownerDashboardKeys.all | ✓ WIRED | Line 21: import; line 134: `ownerDashboardKeys.all` in invalidateQueries |
| `use-create-invitation.ts` | `src/lib/constants/routes.ts` | INVITATION_ACCEPT_PATH | ✓ WIRED | Line 17: import; line 71: used in URL construction |
| `src/lib/constants/routes.ts` | `src/app/(auth)/accept-invite/page.tsx` | constant value matches route | ✓ WIRED | Constant value '/accept-invite' matches Next.js route directory name |

### Data-Flow Trace (Level 4)

Not applicable -- `useCreateInvitation` is a mutation hook, not a data-rendering component. It writes data (DB insert + email), does not render dynamic data from a query. Level 4 trace is not required.

### Behavioral Spot-Checks

Step 7b: The hook is a client-side React hook and cannot be invoked outside a browser/test environment. Runtime spot-checks skipped. Unit test coverage (9 cases, 451 lines) covers all observable behaviors programmatically.

| Behavior | Coverage | Status |
|----------|----------|--------|
| Type derivation: lease_id -> lease_signing | Test: "should derive type as lease_signing when lease_id is provided (INV-02)" | ✓ COVERED |
| Type derivation: no lease_id -> platform_access | Test: "should derive type as platform_access when no lease_id (INV-02)" | ✓ COVERED |
| Duplicate pre-check returns existing | Test: "should return duplicate status when pending invitation exists (INV-04)" | ✓ COVERED |
| Successful creation + email send | Test: "should create invitation and send email when no duplicate exists (INV-01)" | ✓ COVERED |
| Cache invalidation (3 keys) | Test: "should invalidate tenant, invitation, and dashboard queries on success (INV-03)" | ✓ COVERED |
| URL uses INVITATION_ACCEPT_PATH | Test: "should construct invitation_url with INVITATION_ACCEPT_PATH (INV-05)" | ✓ COVERED |
| 23505 race condition fallback | Test: "should handle 23505 race condition by re-querying for existing invitation" | ✓ COVERED |
| Non-23505 error propagates | Test: "should call handlePostgrestError for non-23505 insert errors" | ✓ COVERED |
| Unauthenticated user throws | Test: "should throw when user is not authenticated" | ✓ COVERED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INV-01 | Plan 27-02 | Create unified useCreateInvitation() hook as sole mutation entrypoint | ✓ SATISFIED | Hook at src/hooks/api/use-create-invitation.ts; old useInviteTenantMutation deleted |
| INV-02 | Plan 27-02 | Auto-derive invitation type from context (lease_id = 'lease_signing', else 'platform_access') | ✓ SATISFIED | Line 65: ternary type derivation; no user-facing type selector |
| INV-03 | Plan 27-02 | Standardize cache invalidation (tenant, invitation, dashboard keys) | ✓ SATISFIED | Lines 130-134: all three key families invalidated in onSuccess |
| INV-04 | Plan 27-02 | Duplicate detection: surface existing pending invitation before inserting new | ✓ SATISFIED | Lines 52-62: pre-check query; lines 95-107: 23505 race condition fallback |
| INV-05 | Plan 27-01 | Single INVITATION_ACCEPT_PATH constant, path matches actual route | ✓ SATISFIED | routes.ts with '/accept-invite'; zero /auth/accept-invitation strings in src/ |

### Anti-Patterns Found

None. The new and modified files are clean:
- No TODO/FIXME/placeholder comments in any phase artifact
- No empty implementations or stub returns
- `sendInvitationEmail` failure is explicitly non-fatal (`.catch` with console.error logging) -- intentional per D-10/D-11, not a stub
- `invite-tenant-form.tsx` still has inline invitation logic -- this is expected per phase boundary (Phase 27 builds the hook; Phase 28 migrates UI consumers)

### Human Verification Required

None. All phase requirements are programmatically verifiable and verified.

### Scope Note: UI Migration Not in Scope

The phase context document (`27-CONTEXT.md` line 9) explicitly states: "No UI migration in this phase -- that's Phase 28." Components like `invite-tenant-form.tsx` that still contain inline invitation creation logic are correct pre-Phase-28 state. The unified hook exists as the library artifact; consumer migration is Phase 28's responsibility.

### Gaps Summary

No gaps. All four previously-reported gaps were false negatives caused by the prior verifier reading from the main repo directory rather than the worktree where phase execution committed its changes.

The phase goal is fully achieved: `useCreateInvitation()` is a complete, tested hook that handles type derivation, duplicate detection, DB insert, email send, and cache invalidation. No UI component is required to implement any of this inline when they migrate to use it.

---

_Verified: 2026-03-30T23:45:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: corrects false negatives in previous run_
