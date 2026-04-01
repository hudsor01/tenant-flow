# Phase 27: Unified Mutation Hook - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 27-unified-mutation-hook
**Areas discussed:** Duplicate detection UX, Hook API shape, Accept URL constant, Email send behavior

---

## Duplicate Detection UX

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-check and offer resend | Query for existing pending/sent invitation before insert. If found, surface it to caller with option to resend. | yes |
| Catch unique index error | Attempt insert, catch the duplicate index violation, then offer resend. | |
| Auto-resend silently | If duplicate detected, automatically resend without asking. | |

**User's choice:** Pre-check and offer resend
**Notes:** Preferred explicit UX over error-recovery or silent behavior.

---

## Hook API Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal params | Caller passes { email, lease_id?, property_id?, unit_id? }. Hook derives type, generates code/URL, handles everything. | yes |
| Extend mutation-options | Keep existing invite(), build wrapper with type derivation and duplicate check on top. | |
| Full replacement | Delete mutation-options invite() entirely, move all logic into hook. | |

**User's choice:** Minimal params
**Notes:** None — straightforward selection.

---

## Accept URL Constant

| Option | Description | Selected |
|--------|-------------|----------|
| /accept-invite | Actual Next.js route. Fix all code to use INVITATION_ACCEPT_PATH constant. | yes |
| /auth/accept-invitation | Rename Next.js route to match existing code. | |

**User's choice:** /accept-invite (canonical)
**Notes:** User asked about nuqs — clarified that accept page reads searchParams server-side (one-time read), nuqs not needed.

---

## Email Send Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Always send | Hook always calls sendInvitationEmail() after insert. Simplest mental model. | yes |
| Optional sendEmail param | Hook accepts { sendEmail?: boolean } defaulting to true. | |
| You decide | Claude determines based on consumer patterns. | |

**User's choice:** Always send
**Notes:** None — straightforward selection.

## Claude's Discretion

- Hook file location
- Error handling patterns
- INVITATION_ACCEPT_PATH constant location

## Deferred Ideas

None — discussion stayed within phase scope.
