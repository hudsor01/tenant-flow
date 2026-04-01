// Onboarding drip email templates for trial users.
// Used by the trial-drip-email Edge Function.
// Day 1: Welcome + quick setup guide
// Day 3: Feature highlight (rent collection)
// Day 7: Success story / case study
// Day 12: Trial ending + conversion offer

import { escapeHtml } from './escape-html.ts'

const BRAND_COLOR = '#2563eb'
const BRAND_NAME = 'TenantFlow'
const TAGLINE = 'Property Management Made Simple'
const APP_URL = 'https://tenantflow.app'

function wrapInLayout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
<!-- Header -->
<tr><td style="background-color:${BRAND_COLOR};padding:24px 32px;text-align:center;">
<a href="${APP_URL}" style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;text-decoration:none;">${BRAND_NAME}</a>
</td></tr>
<!-- Body -->
<tr><td style="padding:32px;">
${bodyContent}
</td></tr>
<!-- Footer -->
<tr><td style="padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;">
<p style="margin:0 0 8px;font-size:13px;color:#71717a;">${BRAND_NAME} &mdash; ${TAGLINE}</p>
<p style="margin:0;font-size:12px;color:#a1a1aa;"><a href="${APP_URL}/privacy" style="color:#a1a1aa;">Privacy Policy</a> &middot; <a href="${APP_URL}/terms" style="color:#a1a1aa;">Terms</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function ctaBlock(url: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td align="center">
<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:12px 32px;background-color:${BRAND_COLOR};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
</td></tr>
</table>`
}

function featureRow(icon: string, title: string, desc: string): string {
  return `<tr>
<td style="padding:8px 12px 8px 0;vertical-align:top;font-size:20px;">${icon}</td>
<td style="padding:8px 0;">
<strong style="font-size:15px;color:#18181b;">${title}</strong><br>
<span style="font-size:14px;color:#71717a;">${desc}</span>
</td>
</tr>`
}

/** Day 1: Welcome + quick setup guide */
export function day1WelcomeEmail(params: {
  firstName: string
}): { subject: string; html: string } {
  const safeName = escapeHtml(params.firstName)
  return {
    subject: `Welcome to ${BRAND_NAME}, ${safeName}! Here's how to get started`,
    html: wrapInLayout(`
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Welcome to ${BRAND_NAME}, ${safeName}!</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">Your 14-day free trial is active. Here is a quick setup guide to get the most out of ${BRAND_NAME} in under 5 minutes:</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
${featureRow('1.', 'Add your first property', 'Enter your property address and basic details.')}
${featureRow('2.', 'Create units', 'Add units with rent amounts and availability.')}
${featureRow('3.', 'Invite tenants', 'Send tenant invitations directly from TenantFlow.')}
${featureRow('4.', 'Set up rent collection', 'Connect Stripe to start collecting rent online.')}
</table>

${ctaBlock(`${APP_URL}/dashboard`, 'Go to Dashboard')}

<p style="margin:16px 0 0;font-size:14px;color:#71717a;">Need help? Reply to this email or visit our <a href="${APP_URL}/help" style="color:${BRAND_COLOR};">help center</a>.</p>`),
  }
}

/** Day 3: Feature highlight -- rent collection */
export function day3RentCollectionEmail(params: {
  firstName: string
}): { subject: string; html: string } {
  const safeName = escapeHtml(params.firstName)
  return {
    subject: `${safeName}, automate your rent collection with ${BRAND_NAME}`,
    html: wrapInLayout(`
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Stop Chasing Rent Payments</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">${safeName}, did you know that landlords spend an average of 4 hours per month managing rent collection manually? ${BRAND_NAME} automates the entire process.</p>

<div style="background-color:#f0f9ff;border-radius:8px;padding:20px;margin:16px 0;">
<h2 style="margin:0 0 12px;font-size:18px;color:#18181b;">What automated rent collection does for you:</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${featureRow('&#10003;', 'Automatic reminders', 'Tenants get notified before rent is due -- no awkward conversations')}
${featureRow('&#10003;', 'Late fee calculation', 'Late fees are automatically applied based on your lease terms')}
${featureRow('&#10003;', 'Online payments', 'ACH and credit card payments with direct deposit to your account')}
${featureRow('&#10003;', 'Payment tracking', 'See who paid, who is late, and outstanding balances at a glance')}
</table>
</div>

<p style="margin:16px 0;font-size:15px;color:#3f3f46;">Landlords using TenantFlow report collecting rent <strong>5 days faster</strong> on average after switching to automated collection.</p>

${ctaBlock(`${APP_URL}/dashboard`, 'Set Up Rent Collection')}

<p style="margin:16px 0 0;font-size:14px;color:#71717a;">Your trial has 11 days remaining. All features are fully unlocked.</p>`),
  }
}

/** Day 7: Success story / case study */
export function day7SuccessStoryEmail(params: {
  firstName: string
}): { subject: string; html: string } {
  const safeName = escapeHtml(params.firstName)
  return {
    subject: `How one landlord saved 20+ hours/month with ${BRAND_NAME}`,
    html: wrapInLayout(`
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">From Spreadsheets to Streamlined</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">Hey ${safeName}, here is how landlords like you are using ${BRAND_NAME} to simplify their operations:</p>

<div style="background-color:#f0f9ff;border-left:4px solid ${BRAND_COLOR};padding:20px;margin:16px 0;border-radius:0 8px 8px 0;">
<p style="margin:0 0 12px;font-size:15px;color:#3f3f46;font-style:italic;">"I was managing 12 units with spreadsheets and text messages. TenantFlow replaced all of it. Rent comes in automatically, maintenance requests are tracked, and I have real financial data for tax season."</p>
<p style="margin:0;font-size:14px;color:#71717a;font-weight:600;">&mdash; Property owner managing 12 residential units</p>
</div>

<h2 style="margin:24px 0 12px;font-size:18px;color:#18181b;">Results that matter:</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:12px;text-align:center;width:33%;">
<p style="margin:0;font-size:28px;font-weight:700;color:${BRAND_COLOR};">20+</p>
<p style="margin:4px 0 0;font-size:13px;color:#71717a;">Hours saved monthly</p>
</td>
<td style="padding:12px;text-align:center;width:33%;">
<p style="margin:0;font-size:28px;font-weight:700;color:${BRAND_COLOR};">98%</p>
<p style="margin:4px 0 0;font-size:13px;color:#71717a;">On-time rent rate</p>
</td>
<td style="padding:12px;text-align:center;width:33%;">
<p style="margin:0;font-size:28px;font-weight:700;color:${BRAND_COLOR};">$0</p>
<p style="margin:4px 0 0;font-size:13px;color:#71717a;">Lost to manual errors</p>
</td>
</tr>
</table>

${ctaBlock(`${APP_URL}/dashboard`, 'Explore Your Dashboard')}

<p style="margin:16px 0 0;font-size:14px;color:#71717a;">Your trial has 7 days remaining. Make sure you have explored all the features available to you.</p>`),
  }
}

/** Day 12: Trial ending + conversion offer */
export function day12TrialEndingEmail(params: {
  firstName: string
  trialEndsAt: string
}): { subject: string; html: string } {
  const safeName = escapeHtml(params.firstName)
  const safeDate = escapeHtml(params.trialEndsAt)
  return {
    subject: `${safeName}, your ${BRAND_NAME} trial ends in 2 days`,
    html: wrapInLayout(`
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Your Trial Ends ${safeDate}</h1>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;">${safeName}, your 14-day free trial is almost over. To keep managing your properties with ${BRAND_NAME}, choose a plan that fits your portfolio:</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
<tr>
<td style="padding:12px;text-align:center;border:1px solid #e4e4e7;border-radius:8px;width:33%;vertical-align:top;">
<p style="margin:0;font-size:14px;font-weight:600;color:#71717a;">Starter</p>
<p style="margin:8px 0 4px;font-size:28px;font-weight:700;color:#18181b;">$29<span style="font-size:14px;font-weight:400;color:#71717a;">/mo</span></p>
<p style="margin:0;font-size:13px;color:#71717a;">Up to 5 properties</p>
</td>
<td style="padding:0 8px;"></td>
<td style="padding:12px;text-align:center;border:2px solid ${BRAND_COLOR};border-radius:8px;width:33%;vertical-align:top;background-color:#f0f9ff;">
<p style="margin:0;font-size:14px;font-weight:600;color:${BRAND_COLOR};">Growth</p>
<p style="margin:8px 0 4px;font-size:28px;font-weight:700;color:#18181b;">$79<span style="font-size:14px;font-weight:400;color:#71717a;">/mo</span></p>
<p style="margin:0;font-size:13px;color:#71717a;">Up to 20 properties</p>
</td>
<td style="padding:0 8px;"></td>
<td style="padding:12px;text-align:center;border:1px solid #e4e4e7;border-radius:8px;width:33%;vertical-align:top;">
<p style="margin:0;font-size:14px;font-weight:600;color:#71717a;">Max</p>
<p style="margin:8px 0 4px;font-size:28px;font-weight:700;color:#18181b;">$199<span style="font-size:14px;font-weight:400;color:#71717a;">/mo</span></p>
<p style="margin:0;font-size:13px;color:#71717a;">Unlimited properties</p>
</td>
</tr>
</table>

<p style="margin:16px 0;font-size:15px;color:#3f3f46;"><strong>Save up to 17%</strong> with annual billing on any plan. No contracts -- cancel anytime.</p>

${ctaBlock(`${APP_URL}/pricing`, 'Choose Your Plan')}

<div style="background-color:#fef3c7;border-radius:8px;padding:16px;margin:16px 0;">
<p style="margin:0;font-size:14px;color:#92400e;"><strong>What happens after your trial?</strong> Your data and settings are preserved. Choose a plan within 30 days to pick up right where you left off. No data loss, no re-setup.</p>
</div>

<p style="margin:16px 0 0;font-size:14px;color:#71717a;">Questions about which plan is right for you? Reply to this email and we will help you decide.</p>`),
  }
}

/** Map trial day number to the appropriate template function name */
export const DRIP_SCHEDULE = [
  { day: 1, templateKey: 'day1' as const },
  { day: 3, templateKey: 'day3' as const },
  { day: 7, templateKey: 'day7' as const },
  { day: 12, templateKey: 'day12' as const },
] as const
