# Phase 28: Consumer Migration & Dead Code Removal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 28-consumer-migration-dead-code-removal
**Areas discussed:** Pending invitations display, Invitation row actions, Duplicate handling UX, Accept flow for existing users

---

## Pending Invitations Display

### Q1: How should pending invitations appear on the tenant list page?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline rows | Pending invitations appear as rows in same table with status badges | ✓ |
| Separate section above | Collapsible card above main tenant table | |
| Tab filter | Tabs: All Tenants / Pending Invitations | |

**User's choice:** Inline rows
**Notes:** Email shown as name until they register. Sorted by status then date.

### Q2: How should pending invitation rows be visually differentiated?

| Option | Description | Selected |
|--------|-------------|----------|
| Status badge only | Same row styling, colored badge in Status column (amber/blue) | ✓ |
| Muted row + badge | Reduced opacity row plus status badge | |
| Left border accent + badge | Colored left border plus status badge | |

**User's choice:** Status badge only
**Notes:** None

### Q3: What data should display for a pending invitation row?

| Option | Description | Selected |
|--------|-------------|----------|
| Email + status + sent date | Email in Name, Pending/Sent badge, "Sent X ago" timestamp | ✓ |
| Email + status + expiry countdown | Same but "Expires in X days" instead | |
| Email + status + both dates | Both sent date and expiry date | |

**User's choice:** Email + status + sent date
**Notes:** None

### Q4: Data source for invitation rows?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate query, merge client-side | Keep tenant query as-is, add invitation query, merge in component | ✓ |
| You decide | Claude picks approach | |

**User's choice:** Separate query, merge client-side
**Notes:** Uses existing tenantInvitationQueries factory, no DB changes.

---

## Invitation Row Actions

### Q1: How should actions appear on pending invitation rows?

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown menu | Three-dot menu with Resend, Copy Link, Cancel (Cancel separated with divider) | ✓ |
| Inline icon buttons | Small icon buttons directly visible in row | |
| Primary + overflow | Visible Resend button + three-dot overflow for rest | |

**User's choice:** Dropdown menu
**Notes:** Consistent with other entity row patterns in the app.

### Q2: Should Cancel require confirmation?

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation dialog | Small confirm dialog with Cancel/Confirm buttons | ✓ |
| Immediate + undo toast | Cancel immediately, show toast with Undo button | |
| You decide | Claude picks based on existing patterns | |

**User's choice:** Confirmation dialog
**Notes:** Standard pattern for destructive actions.

---

## Duplicate Handling UX

### Q1: What should the UI do when useCreateInvitation() returns duplicate?

| Option | Description | Selected |
|--------|-------------|----------|
| Toast with resend action | Info toast with "already invited" message + Resend button | ✓ |
| Inline form error + resend link | Error below email field with resend link | |
| Auto-resend silently | Automatically resend, show success toast | |

**User's choice:** Toast with resend action
**Notes:** Same behavior across all 3 consumers. Resend calls resend() from mutation-options.

---

## Accept Flow for Existing Users

### Q1: How should the accept page handle an already-registered user?

| Option | Description | Selected |
|--------|-------------|----------|
| Check session first | Check for active session on load; if logged in, show Accept button | ✓ |
| Detect + redirect to login | Edge Function checks if email exists, redirects to login | |
| Show both options on form | Signup form + "Already have an account? Log in" link | |

**User's choice:** Check session first
**Notes:** Logged-in users get one-click accept. No password re-entry.

### Q2: Add login link below signup form for not-logged-in users?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add login link | "Already have an account? Log in to accept" with redirect param | ✓ |
| No, signup form is enough | Rely on existing "already registered" fallback | |

**User's choice:** Yes, add login link
**Notes:** Links to /login with redirect back to /accept-invite?code=XXX.

### Q3: Login page redirect support?

| Option | Description | Selected |
|--------|-------------|----------|
| You decide | Claude checks login page and implements redirect if needed | ✓ |
| I know it does | Login page handles redirect params | |
| I know it doesn't | Redirect needs to be added | |

**User's choice:** You decide
**Notes:** Claude's discretion.

---

## Claude's Discretion

- Migration ordering across the 3 consumers
- Shared duplicate toast utility vs inline per consumer
- Login page redirect implementation details
- Test update strategy

## Deferred Ideas

None -- discussion stayed within phase scope.
