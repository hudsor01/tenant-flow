// Branded autopay failure email templates.
// Used by stripe-autopay-charge when a PaymentIntent fails.
// Tenant gets "action needed" with a Pay Now CTA on every attempt.
// Owner gets a summary after the final (3rd) failure so they can follow up.

import { escapeHtml } from './escape-html.ts'
import { wrapEmailLayout, BRAND_COLOR, BRAND_NAME } from './email-layout.ts'

const FAIL_SUBJECT = 'Autopay payment failed - action needed'
const OWNER_SUBJECT_PREFIX = 'Autopay exhausted - tenant follow-up required'

function ctaButton(url: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td align="center">
<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:12px 32px;background-color:${BRAND_COLOR};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
</td></tr>
</table>`
}

function statusRow(label: string, value: string, emphasis = false): string {
  const valueStyle = emphasis
    ? 'font-size:15px;color:#b91c1c;font-weight:600;'
    : 'font-size:15px;color:#18181b;'
  return `<tr>
<td style="padding:6px 16px 6px 0;font-size:14px;color:#71717a;">${escapeHtml(label)}</td>
<td style="padding:6px 0;${valueStyle}">${escapeHtml(value)}</td>
</tr>`
}

interface TenantFailureParams {
  tenantFirstName: string
  amount: string
  attemptNumber: number
  maxAttempts: number
  failureReason: string
  nextRetryAt: string | null
  payNowUrl: string
  appUrl: string
}

/**
 * Tenant-facing autopay failure email.
 * Sent on every failed attempt (1, 2, 3).
 */
export function tenantAutopayFailureEmail(params: TenantFailureParams): {
  subject: string
  html: string
} {
  const safeName = escapeHtml(params.tenantFirstName)
  const isFinalAttempt = params.attemptNumber >= params.maxAttempts

  const retryBlock = params.nextRetryAt
    ? `<div style="background-color:#f0f9ff;border-left:4px solid ${BRAND_COLOR};padding:16px;margin:16px 0;border-radius:0 8px 8px 0;">
<p style="margin:0;font-size:14px;color:#3f3f46;">We will retry automatically on <strong>${escapeHtml(
        new Date(params.nextRetryAt).toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        }),
      )}</strong>.</p>
</div>`
    : `<div style="background-color:#fef2f2;border-left:4px solid #b91c1c;padding:16px;margin:16px 0;border-radius:0 8px 8px 0;">
<p style="margin:0;font-size:14px;color:#7f1d1d;">This was the final automatic attempt. No more retries will be made -- please pay manually below.</p>
</div>`

  const body = `
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Autopay payment failed</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">Hi ${safeName}, we tried to process your automatic rent payment and it did not go through.</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e4e4e7;border-radius:8px;padding:8px 16px;">
${statusRow('Amount', params.amount)}
${statusRow('Attempt', `${params.attemptNumber} of ${params.maxAttempts}`, true)}
${statusRow('Reason', params.failureReason)}
</table>

${retryBlock}

${ctaButton(params.payNowUrl, isFinalAttempt ? 'Pay Rent Now' : 'Pay Manually')}

<p style="margin:16px 0 0;font-size:14px;color:#71717a;">Need to update your card? Open the tenant portal and visit <strong>Payment Settings</strong>.</p>`

  return {
    subject: FAIL_SUBJECT,
    html: wrapEmailLayout(body, {
      headerLinkUrl: params.appUrl.startsWith('https://') ? params.appUrl : undefined,
      includeFooterLinks: params.appUrl.startsWith('https://'),
      appUrl: params.appUrl,
    }),
  }
}

interface OwnerFailureParams {
  ownerFirstName: string
  tenantFirstName: string
  propertyInfo: string
  amount: string
  maxAttempts: number
  failureReason: string
  dashboardUrl: string
  appUrl: string
}

/**
 * Owner-facing final-failure email.
 * Sent only after all retry attempts have been exhausted.
 */
export function ownerAutopayFailureEmail(params: OwnerFailureParams): {
  subject: string
  html: string
} {
  const safeOwner = escapeHtml(params.ownerFirstName)
  const safeTenant = escapeHtml(params.tenantFirstName)
  const safeProperty = escapeHtml(params.propertyInfo || 'Unit')

  const body = `
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Autopay exhausted for ${safeTenant}</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">Hi ${safeOwner}, ${BRAND_NAME} attempted ${params.maxAttempts} automatic rent payments for <strong>${safeTenant}</strong> at <strong>${safeProperty}</strong> and all of them failed.</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e4e4e7;border-radius:8px;padding:8px 16px;">
${statusRow('Tenant', params.tenantFirstName)}
${statusRow('Property', params.propertyInfo || 'Unit')}
${statusRow('Amount', params.amount)}
${statusRow('Last failure reason', params.failureReason, true)}
</table>

<div style="background-color:#fef2f2;border-left:4px solid #b91c1c;padding:16px;margin:16px 0;border-radius:0 8px 8px 0;">
<p style="margin:0;font-size:14px;color:#7f1d1d;">The tenant has been notified after every attempt and prompted to pay manually. Automatic retries will not continue -- you may want to reach out directly.</p>
</div>

${ctaButton(params.dashboardUrl, 'Open Dashboard')}

<p style="margin:16px 0 0;font-size:14px;color:#71717a;">You can reset autopay attempts from the rent collection page once the tenant is back on track.</p>`

  return {
    subject: `${OWNER_SUBJECT_PREFIX} (${params.tenantFirstName})`,
    html: wrapEmailLayout(body, {
      headerLinkUrl: params.appUrl.startsWith('https://') ? params.appUrl : undefined,
      includeFooterLinks: params.appUrl.startsWith('https://'),
      appUrl: params.appUrl,
    }),
  }
}
