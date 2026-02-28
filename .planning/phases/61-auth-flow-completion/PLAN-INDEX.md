# Phase 61: Auth Flow Completion - Plan Index

## Plans

| Plan | Title | Status | Dependencies |
|------|-------|--------|-------------|
| 61-01 | Password Reset Flow | pending | none |
| 61-02 | Email Confirmation Flow | pending | none |
| 61-03 | Google OAuth Routing | pending | none |

## Execution Order

Plans 61-01, 61-02, and 61-03 are independent and can be executed in any order.

## Success Criteria

1. User clicks "Forgot Password," receives email, clicks link, lands on reset page, enters new password, and can log in with the new password
2. After signup, user sees an email confirmation page with a "Resend" button; clicking the confirmation link in email activates the account
3. User signing up via Google OAuth is assigned the correct user_type (owner or tenant) and is routed to the matching dashboard on first login
