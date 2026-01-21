# N8N Integration Guide

This guide explains how to configure TenantFlow to use n8n for email, PDF generation, and scheduled job workflows instead of BullMQ queues and @nestjs/schedule decorators.

## Overview

TenantFlow can operate in two modes:

1. **BullMQ Mode** (default): Uses Redis-backed BullMQ queues for background job processing
2. **N8N Mode**: Uses HTTP webhooks that n8n calls to trigger email/PDF/cron operations

N8N mode offers advantages:
- Visual workflow designer for easy debugging
- Built-in retry logic with configurable backoff
- Centralized logging and monitoring
- Easy integration with external services (Slack alerts, etc.)
- No Redis dependency for these specific workflows
- Easy schedule changes without code deployment

## Environment Variables

Add these to your `.env.local` or environment configuration:

```bash
# Enable n8n mode for emails (optional, default: false)
N8N_EMAIL_MODE=true

# Enable n8n mode for PDF generation (optional, default: false)
N8N_PDF_MODE=true

# Enable n8n mode for cron jobs (optional, default: false)
N8N_CRON_MODE=true

# Shared secret for webhook authentication (required in production)
N8N_WEBHOOK_SECRET=your-secure-random-string-here
```

## Webhook Endpoints

When n8n mode is enabled, the following endpoints become available:

### Email Webhooks

Base URL: `https://your-api.com/api/v1/webhooks/n8n/email`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/payment-success` | POST | Send payment success confirmation |
| `/payment-failed` | POST | Send payment failure notification |
| `/payment-reminder` | POST | Send upcoming payment reminder |
| `/subscription-canceled` | POST | Send subscription cancellation notice |
| `/tenant-invitation` | POST | Send tenant portal invitation |
| `/lease-signature` | POST | Send lease signature request |
| `/contact-form` | POST | Send contact form submission to admin |

### PDF Webhooks

Base URL: `https://your-api.com/api/v1/webhooks/n8n/pdf`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/generate-lease` | POST | Generate lease PDF |

### Cron Job Webhooks

Base URL: `https://your-api.com/api/v1/webhooks/n8n/cron`

| Endpoint | Method | Schedule | Description |
|----------|--------|----------|-------------|
| `/cleanup-events` | POST | Daily at midnight | Clean up old internal events |
| `/payment-reminders` | POST | Daily at 9 AM | Send payment reminder emails |
| `/lease-expiry-check` | POST | Daily at 9 AM | Check for expiring leases |
| `/subscription-retry` | POST | Every 15 minutes | Retry failed Stripe subscriptions |

## Authentication

All webhooks require the `x-n8n-webhook-secret` header with your shared secret:

```
x-n8n-webhook-secret: your-secure-random-string-here
```

## N8N Workflow Examples

### Email Workflow

Create a workflow in n8n with:

1. **Webhook Trigger**: Receives requests from your backend services
2. **Switch Node**: Routes by email type
3. **HTTP Request Node**: Calls the appropriate TenantFlow webhook
4. **Error Handler**: Sends Slack/email alert on failure

Example webhook trigger payload:

```json
{
  "type": "payment-success",
  "data": {
    "customerEmail": "tenant@example.com",
    "amount": 150000,
    "currency": "usd",
    "invoiceUrl": "https://stripe.com/invoice/xxx",
    "invoicePdf": "https://stripe.com/invoice/xxx.pdf"
  }
}
```

### PDF Generation Workflow

1. **Webhook Trigger**: Receives PDF generation request
2. **HTTP Request Node**: Calls `/webhooks/n8n/pdf/generate-lease`
3. **Wait Node**: (optional) Add delay if needed
4. **Error Handler**: Notify on failure with retry

Example payload:

```json
{
  "leaseId": "uuid-here",
  "token": "jwt-auth-token"
}
```

### Cron Job Workflows

Create scheduled workflows in n8n:

#### Daily Jobs (9 AM)

1. **Schedule Trigger**: Cron expression `0 9 * * *`
2. **HTTP Request Node**: POST to `/webhooks/n8n/cron/payment-reminders`
3. **HTTP Request Node**: POST to `/webhooks/n8n/cron/lease-expiry-check`
4. **Error Handler**: Slack/email notification on failure

#### Daily Cleanup (Midnight)

1. **Schedule Trigger**: Cron expression `0 0 * * *`
2. **HTTP Request Node**: POST to `/webhooks/n8n/cron/cleanup-events`
3. **Error Handler**: Log failures

#### Subscription Retry (Every 15 minutes)

1. **Schedule Trigger**: Cron expression `*/15 * * * *`
2. **HTTP Request Node**: POST to `/webhooks/n8n/cron/subscription-retry`
3. **Error Handler**: Alert on repeated failures

**Note:** Cron endpoints don't require a body - just the `x-n8n-webhook-secret` header.

## Payload Schemas

### Payment Success

```typescript
{
  customerEmail: string
  amount: number        // in cents
  currency: string      // e.g., "usd"
  invoiceUrl: string | null
  invoicePdf: string | null
}
```

### Payment Failed

```typescript
{
  customerEmail: string
  amount: number
  currency: string
  attemptCount: number
  invoiceUrl: string | null
  isLastAttempt: boolean
}
```

### Payment Reminder

```typescript
{
  tenantName: string
  tenantEmail: string
  propertyName: string
  unitNumber?: string
  amount: number
  currency: string
  dueDate: string       // ISO date
  daysUntilDue: number
  paymentUrl: string
  autopayEnabled: boolean
}
```

### Subscription Canceled

```typescript
{
  customerEmail: string
  subscriptionId: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null  // ISO date
}
```

### Tenant Invitation

```typescript
{
  tenantEmail: string
  invitationUrl: string
  propertyName?: string
  unitNumber?: string
  ownerName?: string
  expiresAt: string     // ISO date
}
```

### Lease Signature

```typescript
{
  tenantEmail: string
  tenantName: string
  propertyName?: string
  unitNumber?: string
  ownerName?: string
  message?: string
  signUrl: string
}
```

### Contact Form

```typescript
{
  contactFormData: {
    name: string
    email: string
    message: string
    subject?: string
  }
}
```

### Generate Lease PDF

```typescript
{
  leaseId: string
  token: string   // JWT auth token for API access
}
```

## Migration from BullMQ

To switch from BullMQ to n8n mode:

1. Set up your n8n workflows
2. Test webhooks work correctly with sample payloads
3. Add environment variables to enable n8n mode
4. Deploy backend with new configuration
5. Monitor logs for any issues

The BullMQ processors will be automatically disabled when n8n mode is enabled.

## Rollback

To revert to BullMQ/@Cron mode, simply remove or set to `false`:

```bash
N8N_EMAIL_MODE=false
N8N_PDF_MODE=false
N8N_CRON_MODE=false
```

## Security Considerations

1. **Always use HTTPS** for webhook endpoints in production
2. **Use a strong, random secret** for `N8N_WEBHOOK_SECRET`
3. **Limit n8n access** to only necessary internal services
4. **Monitor webhook logs** for unauthorized access attempts
5. **Consider IP whitelisting** if n8n runs on a static IP

## Troubleshooting

### Webhooks not available

- Ensure `N8N_EMAIL_MODE=true` or `N8N_PDF_MODE=true` is set
- Restart the backend service after configuration changes

### 401 Unauthorized

- Verify `x-n8n-webhook-secret` header matches `N8N_WEBHOOK_SECRET` env var
- Check for typos or extra whitespace in the secret

### Emails not sending

- Check Resend/SendGrid API key configuration
- Verify email templates exist
- Check backend logs for detailed error messages

### PDF generation fails

- Ensure lease exists and user has access
- Verify JWT token is valid and not expired
- Check PDF template files are available

## Live n8n Workflows

The following workflows are deployed and active at **n8n.thehudsonfam.com**:

| Workflow ID | Name | Schedule | Endpoints Called |
|-------------|------|----------|------------------|
| `ZVActQMmpq8rUWAV` | TenantFlow - Daily 9AM Jobs | Daily at 9 AM | `/payment-reminders`, `/lease-expiry-check` |
| `cLGFemYo9kNmh4p5` | TenantFlow - Midnight Cleanup | Daily at midnight | `/cleanup-events` |
| `ZzaKdZLVshIVcstj` | TenantFlow - Subscription Retry (15min) | Every 15 minutes | `/subscription-retry` |

### Environment Setup

**n8n Server** - Add to Docker/system environment:
```bash
N8N_WEBHOOK_SECRET=7DuX+kQuSL9A8qu+Ai5Ta2rmSPwrCDylI5TFu4iOkpQ=
```

**TenantFlow Backend** - Add to Railway:
```bash
N8N_WEBHOOK_SECRET=7DuX+kQuSL9A8qu+Ai5Ta2rmSPwrCDylI5TFu4iOkpQ=
N8N_CRON_MODE=true
```

### Workflow Features

All workflows include:
- **Schedule triggers** using native `n8n-nodes-base.scheduleTrigger` (v1.3)
- **HTTP Request nodes** (v4.3) with proper error handling
- **`$env.N8N_WEBHOOK_SECRET`** reads from system environment (NOT enterprise Variables)
- **`onError: continueRegularOutput`** for resilience
- **`alwaysOutputData: true`** for debugging visibility
- **30-60 second timeouts** appropriate for each task

### Testing Workflows

Schedule-based workflows run automatically at their configured times. To manually test:

1. **In n8n UI**: Open the workflow → Click "Execute Workflow" button
2. **Check Executions**: View execution history for success/failure details
3. **Backend Logs**: Verify webhook requests are received and processed

### Customizing Schedules

1. Open the workflow in n8n
2. Click the Schedule Trigger node
3. Adjust the interval/time settings
4. Save (workflow auto-reactivates with new schedule)
