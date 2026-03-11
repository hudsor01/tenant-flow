// Branded HTML email templates for Supabase auth emails.
// Used by the auth-email-send Edge Function (Supabase Auth Hook).
// All templates use inline CSS for email client compatibility.

import { escapeHtml } from './escape-html.ts'

const BRAND_COLOR = '#2563eb'
const BRAND_NAME = 'TenantFlow'
const TAGLINE = 'Property Management Made Simple'

/** Wrap email body content in the shared layout (header, footer, responsive container). */
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
<span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${BRAND_NAME}</span>
</td></tr>
<!-- Body -->
<tr><td style="padding:32px;">
${bodyContent}
</td></tr>
<!-- Footer -->
<tr><td style="padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;">
<p style="margin:0;font-size:13px;color:#71717a;">${BRAND_NAME} &mdash; ${TAGLINE}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

/** CTA button + fallback plain-text URL. */
function ctaBlock(url: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td align="center">
<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:12px 32px;background-color:${BRAND_COLOR};color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a>
</td></tr>
</table>
<p style="font-size:13px;color:#71717a;word-break:break-all;">If the button doesn't work, copy and paste this URL into your browser:<br><a href="${escapeHtml(url)}" style="color:${BRAND_COLOR};">${escapeHtml(url)}</a></p>`
}

export function signupConfirmationEmail(params: {
  confirmUrl: string
  email: string
}): { subject: string; html: string } {
  const safeEmail = escapeHtml(params.email)
  return {
    subject: `Confirm your ${BRAND_NAME} account`,
    html: wrapInLayout(`
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Welcome to ${BRAND_NAME}</h1>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;">Thanks for signing up with <strong>${safeEmail}</strong>.</p>
<p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">Please confirm your email address to get started.</p>
${ctaBlock(params.confirmUrl, 'Confirm Email')}
<p style="font-size:13px;color:#a1a1aa;margin-top:24px;">If you did not create an account, you can safely ignore this email.</p>`),
  }
}

export function passwordResetEmail(params: {
  resetUrl: string
  email: string
}): { subject: string; html: string } {
  const safeEmail = escapeHtml(params.email)
  return {
    subject: `Reset your ${BRAND_NAME} password`,
    html: wrapInLayout(`
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Password Reset</h1>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;">We received a password reset request for <strong>${safeEmail}</strong>.</p>
<p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">Click the button below to choose a new password.</p>
${ctaBlock(params.resetUrl, 'Reset Password')}
<p style="font-size:13px;color:#a1a1aa;margin-top:24px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>`),
  }
}

export function invitationEmail(params: {
  inviteUrl: string
  email: string
  inviterName?: string
}): { subject: string; html: string } {
  const safeEmail = escapeHtml(params.email)
  const inviter = params.inviterName ? escapeHtml(params.inviterName) : 'A property manager'
  return {
    subject: `You're invited to ${BRAND_NAME}`,
    html: wrapInLayout(`
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">You've Been Invited</h1>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;">${inviter} has invited <strong>${safeEmail}</strong> to join ${BRAND_NAME}.</p>
<p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">Click the button below to accept the invitation and create your account.</p>
${ctaBlock(params.inviteUrl, 'Accept Invitation')}
<p style="font-size:13px;color:#a1a1aa;margin-top:24px;">If you were not expecting this invitation, you can safely ignore this email.</p>`),
  }
}

export function magicLinkEmail(params: {
  magicLinkUrl: string
  email: string
}): { subject: string; html: string } {
  const safeEmail = escapeHtml(params.email)
  return {
    subject: `Your ${BRAND_NAME} sign-in link`,
    html: wrapInLayout(`
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Sign In to ${BRAND_NAME}</h1>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;">Use the link below to sign in as <strong>${safeEmail}</strong>.</p>
<p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">This link is single-use and will expire shortly.</p>
${ctaBlock(params.magicLinkUrl, 'Sign In')}
<p style="font-size:13px;color:#a1a1aa;margin-top:24px;">If you did not request this link, you can safely ignore this email.</p>`),
  }
}

export function emailChangeEmail(params: {
  confirmUrl: string
  email: string
  newEmail: string
}): { subject: string; html: string } {
  const safeEmail = escapeHtml(params.email)
  const safeNewEmail = escapeHtml(params.newEmail)
  return {
    subject: `Confirm your new ${BRAND_NAME} email address`,
    html: wrapInLayout(`
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Email Address Change</h1>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;">A request was made to change the email address for your ${BRAND_NAME} account from <strong>${safeEmail}</strong> to <strong>${safeNewEmail}</strong>.</p>
<p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">Click the button below to confirm this change.</p>
${ctaBlock(params.confirmUrl, 'Confirm Email Change')}
<p style="font-size:13px;color:#a1a1aa;margin-top:24px;">If you did not request this change, please secure your account immediately.</p>`),
  }
}

export function tenantInvitationEmail(params: {
  acceptUrl: string
  tenantEmail: string
  ownerName: string
  propertyName?: string
  unitNumber?: string
}): { subject: string; html: string } {
  const safeEmail = escapeHtml(params.tenantEmail)
  const safeOwnerName = escapeHtml(params.ownerName)

  let propertyLine = ''
  if (params.propertyName) {
    const safePropName = escapeHtml(params.propertyName)
    propertyLine = params.unitNumber
      ? `<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;">Property: <strong>${safePropName}</strong> &mdash; Unit <strong>${escapeHtml(params.unitNumber)}</strong></p>`
      : `<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;">Property: <strong>${safePropName}</strong></p>`
  }

  return {
    subject: `You're invited to manage your tenancy on ${BRAND_NAME}`,
    html: wrapInLayout(`
<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">Tenant Invitation</h1>
<p style="margin:0 0 8px;font-size:15px;color:#3f3f46;">${safeOwnerName} has invited you (<strong>${safeEmail}</strong>) to join ${BRAND_NAME} as a tenant.</p>
${propertyLine}
<p style="margin:0 0 24px;font-size:15px;color:#3f3f46;">Click the button below to create your account and get started.</p>
${ctaBlock(params.acceptUrl, 'Accept Invitation')}
<p style="font-size:13px;color:#a1a1aa;margin-top:24px;">This invitation will expire in 7 days. If you were not expecting this, you can safely ignore this email.</p>`),
  }
}
