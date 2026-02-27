# Phase 60: Receipt Emails - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated receipt and notification emails fire on every successful rent payment. Tenant receives a branded receipt; owner receives a payment notification. Email suppression is respected, webhook reliability is preserved (always returns 200 to Stripe), and all email failures are captured in Sentry. Autopay notification emails are a separate phase (64).

</domain>

<decisions>
## Implementation Decisions

### Email content & design
- Branded HTML emails using React Email components rendered via Resend
- TenantFlow logo/header at top of every email for brand recognition
- Tenant receipt includes: amount paid, property address, unit, payment date, period (month/year), payment method (last 4 digits)
- If late fee was included, receipt shows itemized breakdown: base rent, late fee, total paid
- Owner notification includes: tenant name, amount received, property/unit, payment date — quick heads-up that money came in
- Same "Payment successful" messaging for all receipts regardless of overdue status — no shaming

### Email sender identity
- From: TenantFlow <noreply@tenantflow.com> (or configured Resend domain)
- No reply-to address — transactional emails don't need replies; support link in footer instead

### Email template approach
- Use Resend + React Email (@react-email/components) for type-safe, composable templates
- React Email has integrations with n8n and Next.js that may be useful for future email needs
- Templates should be reusable for future email types (Phase 64 autopay notifications, etc.)

### Delivery timing & reliability
- Email sending happens inside the existing stripe-webhooks Edge Function, after rent_payments insert
- Fire-and-forget: Claude decides retry strategy based on Resend capabilities
- Webhook ALWAYS returns 200 to Stripe regardless of email outcome — payment record is the critical path
- Every single email failure must be captured in Sentry for review — no silent failures
- Target delivery within 60 seconds of payment (Resend sends near-instantly; delay is webhook processing)

### Suppression & opt-out behavior
- Check Resend suppression API before sending — if email is on suppression list, skip + log to Sentry
- Respect existing notification_settings table for email preferences — check before sending
- Missing email address: skip + Sentry warning (edge case — all users have emails from auth signup)

### Claude's Discretion
- Retry strategy (fire-and-forget vs retry-once based on Resend API capabilities)
- React Email component structure and template organization
- Exact email layout, spacing, typography within the branded HTML framework
- Footer content (support link, unsubscribe link if needed, legal text)
- How to resolve property address and payment method last 4 digits from available data

</decisions>

<specifics>
## Specific Ideas

- User specifically called out: "Sentry needs to catch every single error so we can review and fix it" — zero tolerance for silent email failures
- React Email chosen specifically because it integrates with Resend, n8n, and Next.js — future-proof template approach

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 60-receipt-emails*
*Context gathered: 2026-02-27*
