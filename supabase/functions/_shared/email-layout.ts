// Shared email layout wrapper for all branded email templates.
// Used by auth-email-templates.ts and drip-email-templates.ts.

export const BRAND_COLOR = '#2563eb'
export const BRAND_NAME = 'TenantFlow'
export const TAGLINE = 'Property Management Made Simple'

interface EmailLayoutOptions {
  /** If provided, header brand name links to this URL. If omitted, header is plain text. */
  headerLinkUrl?: string
  /** If true, includes Privacy Policy and Terms links in footer. Default: false. */
  includeFooterLinks?: boolean
  /** App URL for footer links. Required when includeFooterLinks is true. */
  appUrl?: string
}

/**
 * Wrap email body content in the branded layout (header, footer, responsive container).
 * Supports two modes:
 *   - Auth emails: plain text header, minimal footer (no options needed)
 *   - Drip emails: linked header, footer with Privacy/Terms links (pass options)
 */
export function wrapEmailLayout(bodyContent: string, options?: EmailLayoutOptions): string {
  const linkUrl = options?.headerLinkUrl
  const safeLink = linkUrl?.startsWith('https://') ? linkUrl : undefined
  const headerContent = safeLink
    ? `<a href="${safeLink}" style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;text-decoration:none;">${BRAND_NAME}</a>`
    : `<span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">${BRAND_NAME}</span>`

  const appUrl = options?.appUrl
  const safeAppUrl = appUrl?.startsWith('https://') ? appUrl : undefined
  const footerLinks = options?.includeFooterLinks && safeAppUrl
    ? `\n<p style="margin:0;font-size:12px;color:#a1a1aa;"><a href="${safeAppUrl}/privacy" style="color:#a1a1aa;">Privacy Policy</a> &middot; <a href="${safeAppUrl}/terms" style="color:#a1a1aa;">Terms</a></p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
<!-- Header -->
<tr><td style="background-color:${BRAND_COLOR};padding:24px 32px;text-align:center;">
${headerContent}
</td></tr>
<!-- Body -->
<tr><td style="padding:32px;">
${bodyContent}
</td></tr>
<!-- Footer -->
<tr><td style="padding:16px 32px;text-align:center;border-top:1px solid #e4e4e7;">
<p style="margin:0 0 ${options?.includeFooterLinks ? '8px' : '0'};font-size:13px;color:#71717a;">${BRAND_NAME} &mdash; ${TAGLINE}</p>${footerLinks}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
