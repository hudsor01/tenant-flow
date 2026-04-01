---
status: partial
phase: 28-consumer-migration-dead-code-removal
source: [28-VERIFICATION.md]
started: 2026-03-31T07:15:00Z
updated: 2026-03-31T07:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Pending invitations visible on tenant list
expected: Navigate to /tenants while logged in as an owner who has sent invitations. Pending invitations appear as rows in the same table as active tenants, with email, Pending/Sent badge, relative timestamp, and a three-dot dropdown menu.
result: [pending]

### 2. Copy invitation link to clipboard
expected: Click three-dot menu on an invitation row and select 'Copy Invitation Link'. A success toast 'Invitation link copied to clipboard' appears and the clipboard contains the invitation URL.
result: [pending]

### 3. Accept-invite page for logged-in users
expected: Visit /accept-invite?code=XXX while logged in to the app. Page shows 'Accept Your Invitation' heading with 'You're signed in as {email}' subtext and a single 'Accept Invitation' button — no signup form.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
