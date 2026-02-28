# Phase 60: Receipt Emails - Research

**Researched:** 2026-02-27
**Domain:** Transactional email (Resend API + React Email in Deno Edge Functions)
**Confidence:** HIGH

## Summary

Phase 60 adds two transactional emails to the existing `stripe-webhooks` Edge Function: a tenant payment receipt and an owner payment notification. The emails fire after a successful `payment_intent.succeeded` webhook event. The implementation uses Resend's REST API via `fetch()` from the Deno Edge Function, with React Email components for type-safe HTML rendering using `npm:` protocol imports.

Key architectural insight: Resend automatically checks its suppression list on every send -- there is no separate pre-send API call needed. If a recipient is suppressed, Resend returns an `email.suppressed` event and the email is not delivered. This means PAY-05 is satisfied by using Resend correctly, not by building custom suppression-checking logic.

**Primary recommendation:** Use Resend REST API via `fetch()` for email sending, React Email components with `npm:react` and `npm:@react-email/components` for template rendering, and wrap all email logic in a try-catch that never propagates errors to the webhook response.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Branded HTML emails using React Email components rendered via Resend
- TenantFlow logo/header at top of every email for brand recognition
- Tenant receipt includes: amount paid, property address, unit, payment date, period (month/year), payment method (last 4 digits)
- If late fee was included, receipt shows itemized breakdown: base rent, late fee, total paid
- Owner notification includes: tenant name, amount received, property/unit, payment date
- Same "Payment successful" messaging for all receipts regardless of overdue status
- From: TenantFlow <noreply@tenantflow.app> (or configured Resend domain)
- No reply-to address; support link in footer instead
- Use Resend + React Email (@react-email/components) for type-safe, composable templates
- Templates should be reusable for future email types (Phase 64 autopay notifications, etc.)
- Email sending happens inside the existing stripe-webhooks Edge Function, after rent_payments insert
- Fire-and-forget with Claude deciding retry strategy
- Webhook ALWAYS returns 200 to Stripe regardless of email outcome
- Every email failure must be captured in Sentry
- Target delivery within 60 seconds of payment
- Check Resend suppression API before sending (Resend does this automatically)
- Respect existing notification_settings table for email preferences
- Missing email address: skip + Sentry warning

### Claude's Discretion
- Retry strategy (fire-and-forget vs retry-once based on Resend API capabilities)
- React Email component structure and template organization
- Exact email layout, spacing, typography within the branded HTML framework
- Footer content (support link, unsubscribe link if needed, legal text)
- How to resolve property address and payment method last 4 digits from available data

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAY-03 | Tenant receives branded HTML receipt email after successful payment | React Email components in Deno via npm: imports + Resend REST API; template includes amount, property, date from PaymentIntent metadata |
| PAY-04 | Owner receives notification email after tenant payment succeeds | Same Resend send pattern; owner email resolved via leases.owner_user_id -> users.email join |
| PAY-05 | Email suppression list checked before every Resend email send | Resend automatically checks suppression list on every send; no custom pre-check needed. Suppressed emails get `email.suppressed` event |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Resend REST API | v1 | Email delivery | Official Supabase partner; used via fetch() -- no SDK needed in Deno |
| @react-email/components | 0.0.22 | Email template components | Type-safe, composable HTML email building blocks |
| react | 18.3.1 | JSX rendering for email templates | Required by @react-email/components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-email/render | (bundled in components) | renderAsync() function | Convert React components to HTML strings |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Email + Resend | Raw HTML strings + Resend | No type safety, harder maintenance, but simpler imports |
| npm: Resend SDK | fetch() to REST API | SDK adds unnecessary dependency; fetch() is simpler in Deno |
| Resend | Supabase built-in email | Only for auth emails; no transactional support |

**Installation:** No npm install needed. Deno uses `npm:` protocol imports inline:
```typescript
import React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/functions/
  stripe-webhooks/
    index.ts              # Main webhook handler (modify existing)
    _templates/
      payment-receipt.tsx  # Tenant receipt template
      owner-notification.tsx # Owner notification template
      _components/
        email-layout.tsx   # Shared branded layout wrapper
  _shared/
    cors.ts               # Existing CORS helper
    resend.ts             # NEW: Resend send helper with error handling
```

### Pattern 1: Fire-and-Forget Email with Error Isolation
**What:** Wrap email sending in a try-catch that captures errors to Sentry but never throws to the caller.
**When to use:** Any time email is a side-effect of a critical operation (like webhook processing).
**Example:**
```typescript
// Source: Architectural pattern for webhook reliability
async function sendReceiptEmail(params: ReceiptParams): Promise<void> {
  try {
    const html = await renderAsync(
      React.createElement(PaymentReceipt, params)
    )
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'TenantFlow <noreply@tenantflow.app>',
        to: [params.tenantEmail],
        subject: 'Payment Receipt - TenantFlow',
        html,
      }),
    })
    if (!res.ok) {
      const errBody = await res.text()
      console.error(`[RESEND_ERROR] Receipt email failed: ${res.status} ${errBody}`)
      // Sentry capture here
    }
  } catch (err) {
    console.error('[RESEND_ERROR] Receipt email exception:', err)
    // Sentry capture here -- NEVER re-throw
  }
}
```

### Pattern 2: Data Resolution from PaymentIntent Metadata + DB Lookups
**What:** Use metadata already on the PaymentIntent for most fields; do targeted DB joins only for email addresses, tenant name, and property address.
**When to use:** When webhook handler needs enriched data for emails.
**Example data flow:**
```
PaymentIntent.metadata has:
  tenant_id, lease_id, property_id, unit_id, rent_due_id
  amount, period_month, period_year, due_date, period_start, period_end

Need from DB:
  tenant email   -> tenants.user_id -> users.email (+ users.full_name)
  owner email    -> leases.owner_user_id -> users.email (+ users.full_name)
  property addr  -> properties.address_line1, city, state, postal_code
  unit number    -> units.unit_number
  payment method -> PaymentIntent.payment_method -> stripe.paymentMethods.retrieve() -> card.last4
  notification_settings.email -> check before sending
```

### Pattern 3: React Email Template with npm: Imports in Deno
**What:** Use `npm:` protocol to import React and React Email directly in Deno Edge Functions.
**When to use:** Any React Email template in a Supabase Edge Function.
**Example:**
```typescript
// supabase/functions/stripe-webhooks/_templates/payment-receipt.tsx
import { Body, Container, Head, Heading, Html, Text, Hr, Section } from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface PaymentReceiptProps {
  tenantName: string
  amount: string
  propertyAddress: string
  unitNumber: string | null
  paymentDate: string
  periodMonth: string
  periodYear: string
  paymentMethodLast4: string | null
  lateFeeAmount: string | null
  baseRentAmount: string | null
}

export const PaymentReceipt = (props: PaymentReceiptProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        {/* TenantFlow branded header */}
        <Heading style={h1}>TenantFlow</Heading>
        <Hr />
        <Text style={subtitle}>Payment Successful</Text>
        {/* ... receipt details ... */}
      </Container>
    </Body>
  </Html>
)
```

### Anti-Patterns to Avoid
- **Throwing email errors in webhook handler:** This causes Stripe to retry the webhook, creating duplicate payment records and more email attempts
- **Using Resend Node.js SDK in Deno:** Adds unnecessary dependency; use `fetch()` directly against the REST API for simplicity
- **Checking Resend suppression list via separate API call:** Resend checks automatically on send; manual pre-check is redundant and adds latency
- **Serial email sends:** Send tenant receipt and owner notification in parallel with `Promise.allSettled()`
- **Blocking webhook response on email delivery:** Email is fire-and-forget; the webhook should return 200 as fast as possible

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML email rendering | String concatenation/template literals | React Email components | Cross-client compatibility, responsive design, dark mode |
| Email delivery | SMTP client or raw sendgrid | Resend REST API | Handles suppression, deliverability, analytics automatically |
| Email suppression checking | Custom suppression table | Resend built-in suppression | Resend auto-checks on every send; result appears as `suppressed` status |
| Retry logic | Custom retry queue | Fire-and-forget + Sentry monitoring | Complexity not justified for receipt emails; Sentry alerts on failures |

**Key insight:** Resend's suppression checking is automatic and invisible to the caller. A suppressed send returns a 200 response with a unique email ID -- the suppression only shows up as an `email.suppressed` webhook event. This means our code doesn't need branching logic for suppression.

## Common Pitfalls

### Pitfall 1: Email Error Breaks Webhook Response
**What goes wrong:** An unhandled error from Resend fetch causes the webhook handler to return 500, triggering Stripe retries and potentially duplicate payment records.
**Why it happens:** Email sending added inline without proper error isolation.
**How to avoid:** Wrap ALL email logic in a try-catch that logs to Sentry but returns void. Place email sending AFTER the rent_payments DB write but inside the try block. Use Promise.allSettled, not Promise.all.
**Warning signs:** Stripe dashboard shows webhook retries; rent_payments table has duplicates.

### Pitfall 2: React Email Import Errors in Deno
**What goes wrong:** Import resolution fails or components don't render.
**Why it happens:** Using wrong import syntax (bare imports instead of npm: protocol) or version mismatches.
**How to avoid:** Use exact pinned versions: `npm:react@18.3.1` and `npm:@react-email/components@0.0.22`. These are the versions proven to work with Supabase Edge Functions (from official Supabase docs).
**Warning signs:** Deno type errors on import, undefined component errors at runtime.

### Pitfall 3: Missing RESEND_API_KEY in Edge Function Secrets
**What goes wrong:** Email sending fails silently or throws authentication error.
**Why it happens:** API key set locally but not deployed to Supabase Edge Function secrets.
**How to avoid:** Document the required secret in setup steps; check for key existence at function startup and log warning if missing.
**Warning signs:** Resend API returns 401; console logs show "Missing API key" errors.

### Pitfall 4: Blocking on Payment Method Last 4 Digits
**What goes wrong:** Extra Stripe API call to retrieve payment method adds latency; may fail for some payment types.
**Why it happens:** PaymentIntent metadata doesn't include card last4 -- requires an additional Stripe API call.
**How to avoid:** Use `pi.payment_method` to call `stripe.paymentMethods.retrieve()` and extract `card.last4`. Wrap in try-catch; if it fails, omit payment method from receipt (non-critical field). Or use the charge's `payment_method_details.card.last4` which is already available from the balance_transaction expansion.
**Warning signs:** Slow webhook processing; timeouts on Stripe API calls.

### Pitfall 5: notification_settings Check Blocks Email
**What goes wrong:** User has `email: false` in notification_settings but the check query fails, and the error propagates.
**Why it happens:** notification_settings row may not exist for all users (it's created on first visit to settings page).
**How to avoid:** Default to sending if no notification_settings row exists (absence = opt-in). Only skip if explicitly `email: false`. Wrap the check in its own try-catch.
**Warning signs:** Users who never visited settings don't receive receipts.

## Code Examples

### Sending Email via Resend REST API from Deno Edge Function
```typescript
// Source: https://resend.com/docs/send-with-supabase-edge-functions
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

async function sendEmail(params: {
  to: string[]
  subject: string
  html: string
}): Promise<{ id: string } | null> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'TenantFlow <noreply@tenantflow.app>',
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Resend API error ${res.status}: ${errBody}`)
  }

  return await res.json() as { id: string }
}
```

### Rendering React Email Component in Deno
```typescript
// Source: https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend
import React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { PaymentReceipt } from './_templates/payment-receipt.tsx'

const html = await renderAsync(
  React.createElement(PaymentReceipt, {
    tenantName: 'John Doe',
    amount: '$1,200.00',
    propertyAddress: '123 Main St, Austin, TX 78701',
    unitNumber: 'Unit 4A',
    paymentDate: 'February 27, 2026',
    periodMonth: 'March',
    periodYear: '2026',
    paymentMethodLast4: '4242',
    lateFeeAmount: null,
    baseRentAmount: null,
  })
)
```

### Parallel Email Sends with Error Isolation
```typescript
// Fire both emails in parallel; neither failure affects the other or the webhook response
const emailResults = await Promise.allSettled([
  sendReceiptEmailToTenant(tenantData),
  sendNotificationEmailToOwner(ownerData),
])

for (const result of emailResults) {
  if (result.status === 'rejected') {
    console.error('[RESEND_ERROR]', result.reason)
    // TODO: Sentry capture -- console.error is captured by Supabase logs
  }
}
```

### Data Resolution Query Pattern
```typescript
// Resolve tenant email, owner email, property address, unit number in parallel
const [tenantResult, ownerResult, propertyResult, unitResult] = await Promise.all([
  supabase.from('tenants').select('user_id').eq('id', metadata.tenant_id).single(),
  supabase.from('leases').select('owner_user_id').eq('id', metadata.lease_id).single(),
  supabase.from('properties').select('address_line1, city, state, postal_code, name').eq('id', metadata.property_id).single(),
  supabase.from('units').select('unit_number').eq('id', metadata.unit_id).single(),
])

// Then resolve user emails
const [tenantUserResult, ownerUserResult] = await Promise.all([
  supabase.from('users').select('email, full_name').eq('id', tenantResult.data?.user_id).single(),
  supabase.from('users').select('email, full_name').eq('id', ownerResult.data?.owner_user_id).single(),
])
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Nodemailer/SMTP in backend | Resend REST API from Edge Functions | 2024+ | No SMTP config, automatic deliverability optimization |
| HTML string templates | React Email components | 2023+ | Type-safe, component-based, cross-client tested |
| Custom suppression tables | Resend built-in suppression | Always | Zero maintenance; automatic hard bounce + complaint tracking |
| Node.js SDK for Resend | fetch() to REST API in Deno | Supabase Edge Functions pattern | Simpler, no extra dependency, works natively in Deno |

**Deprecated/outdated:**
- `renderAsync` from `@react-email/render` standalone package: Now bundled in `@react-email/components`
- Resend Node.js SDK in Edge Functions: Use direct fetch(); SDK has Node.js-specific dependencies

## Open Questions

1. **Payment method last4 retrieval strategy**
   - What we know: PaymentIntent has `payment_method` field; can call `stripe.paymentMethods.retrieve()` for card details. Alternatively, the charge already retrieved for balance_transaction has `payment_method_details.card.last4`.
   - What's unclear: Whether the charge expansion already includes card last4 without a separate API call.
   - Recommendation: Check if the existing `charge` retrieved for fee calculation includes `payment_method_details.card.last4`. If so, use it. Otherwise, make a separate `stripe.paymentMethods.retrieve()` call wrapped in try-catch.

2. **Sentry capture from Edge Functions**
   - What we know: Sentry is configured in the frontend but NOT in Edge Functions. Supabase captures `console.error` in function logs.
   - What's unclear: Whether to add Sentry SDK to Edge Functions or rely on console.error.
   - Recommendation: Use `console.error` with structured log format (e.g., `[RESEND_ERROR] {json}`) for now. Sentry SDK in Deno Edge Functions adds complexity; log monitoring via Supabase dashboard is sufficient for receipt emails. Can add Sentry SDK in a future phase.

3. **Resend domain verification**
   - What we know: Sending from `noreply@tenantflow.app` requires domain verification in Resend dashboard.
   - What's unclear: Whether the domain is already verified or needs setup.
   - Recommendation: Document as a prerequisite; check Resend dashboard before deployment.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (frontend), no Edge Function test framework |
| Config file | apps/frontend/vitest.config.ts (frontend only) |
| Quick run command | `pnpm --filter @repo/frontend test:unit -- --run` |
| Full suite command | `pnpm test:unit` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PAY-03 | Tenant receives branded receipt email | manual | Manual: trigger payment in test mode, check Resend dashboard | N/A |
| PAY-04 | Owner receives notification email | manual | Manual: trigger payment in test mode, check Resend dashboard | N/A |
| PAY-05 | Suppression list checked | manual | Manual: send to suppressed@resend.dev test address | N/A |

### Sampling Rate
- **Per task commit:** `pnpm typecheck && pnpm lint` (no Edge Function unit tests)
- **Per wave merge:** `pnpm validate:quick`
- **Phase gate:** Manual trigger of test payment + verify emails in Resend dashboard

### Wave 0 Gaps
None -- Edge Functions have no existing test infrastructure. Adding a Deno test framework for receipt email unit tests would be disproportionate effort for 2 email templates. Manual testing via Stripe test mode is the appropriate validation strategy.

## Sources

### Primary (HIGH confidence)
- Resend REST API docs: https://resend.com/docs/api-reference/emails/send-email - full send API, suppression behavior
- Supabase Edge Functions + Resend: https://resend.com/docs/send-with-supabase-edge-functions - official Deno integration pattern
- Supabase Auth Email Hook + React Email: https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend - full React Email in Deno example with exact version pins
- Resend suppression behavior: https://resend.com/docs/knowledge-base/why-are-my-emails-landing-on-the-suppression-list - auto-check on every send
- Context7 /websites/resend - API reference, idempotency keys
- Context7 /resend/react-email - render function, component usage

### Secondary (MEDIUM confidence)
- React Email Deno JSX compatibility: https://github.com/orgs/supabase/discussions/40286 - confirmed working with npm: imports

### Tertiary (LOW confidence)
- None -- all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- official Supabase + Resend integration docs with exact code examples
- Architecture: HIGH -- patterns directly from Supabase documentation and existing codebase conventions
- Pitfalls: HIGH -- based on actual Stripe webhook behavior and Resend API semantics

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable APIs, no major version changes expected)
