# Phase 26: Database Stabilization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 26-database-stabilization
**Areas discussed:** Duplicate cleanup, Migration structure, Expiry default scope

---

## Duplicate Cleanup

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-cancel older dupes | For each (email, owner_user_id) with multiple pending/sent rows, keep newest and cancel rest | ✓ |
| Fail-safe: verify first | Query live DB for duplicates before writing migration; skip cleanup if none exist | |
| Cancel all duplicates | Cancel ALL duplicate rows including newest, forcing re-invite | |

**User's choice:** Auto-cancel older dupes (Recommended)
**Notes:** None

### Follow-up: Logging

| Option | Description | Selected |
|--------|-------------|----------|
| RAISE NOTICE only | Log cancelled invitation IDs to migration output | ✓ |
| No logging | Cancel silently, minimal migration | |
| You decide | Claude's discretion | |

**User's choice:** RAISE NOTICE only (Recommended)
**Notes:** None

---

## Migration Structure

| Option | Description | Selected |
|--------|-------------|----------|
| One atomic migration | All 4 fixes in single file. Tightly coupled, single rollback point | ✓ |
| Two migrations | Data fixes separate from constraint additions | |
| Four separate migrations | One per requirement, maximum rollback granularity | |

**User's choice:** One atomic migration (Recommended)
**Notes:** None

### Follow-up: RLS Audit Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Query live DB first | Researcher queries pg_policies for current state, only fix what's wrong | ✓ |
| Defensive recreate | DROP + CREATE all tenant_invitations policies regardless | |
| You decide | Claude's discretion | |

**User's choice:** Query live DB first (Recommended)
**Notes:** None

---

## Expiry Default Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Only expires_at | Keep invitation_code and invitation_url client-generated. Phase 27 hook will own those | ✓ |
| All three server-side | DB defaults for code, URL, and expiry. But URL needs app base URL which DB doesn't have | |
| expires_at + invitation_code | Move two to DB, keep URL client-side | |

**User's choice:** Only expires_at (Recommended)
**Notes:** None

### Follow-up: Code Cleanup Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Fix code in this phase | Remove client-side expires_at from all 3 paths now | ✓ |
| DB default only, code in Phase 27 | Add default but leave client code; risk of override | |
| You decide | Claude's discretion | |

**User's choice:** Fix code in this phase (Recommended)
**Notes:** Prevents DB default from being silently overridden by client-side values

---

## Claude's Discretion

- Migration ordering within single file (backfill -> RLS -> unique index -> default)
- Whether to explicitly wrap in transaction or rely on Supabase migration runner

## Deferred Ideas

None -- discussion stayed within phase scope.
