// The one layout and set of building blocks for every email TenantFlow sends:
// the auth emails (auth-email-templates.ts) and the lease emails. Inline styles
// and tables only, because email clients drop <style> blocks and most of CSS
// layout.

import { escapeHtml } from "./escape-html.ts";

export const BRAND_NAME = "TenantFlow";
export const TAGLINE = "Property management software for independent landlords";
const SUPPORT_EMAIL = "support@tenantflow.app";

/** The cropped logo mark (public/email/tenantflow-mark.png), 120px for a 32px slot. */
const LOGO_URL = "https://tenantflow.app/email/tenantflow-mark.png";

/**
 * The light-theme tokens from src/app/globals.css, converted from oklch to hex
 * because email clients cannot parse oklch(). Change them together.
 */
const COLOR = {
	primary: "#0064ef", // --primary oklch(0.54 0.23 257)
	primaryForeground: "#f4f9ff", // --primary-foreground oklch(0.98 0.01 255)
	foreground: "#0e171f", // --foreground oklch(0.2 0.02 245)
	mutedForeground: "#575f66", // --muted-foreground oklch(0.48 0.015 245)
	background: "#f9fafb", // --background oklch(0.985 0.002 240)
	border: "#d2d8de", // --border oklch(0.88 0.01 245)
	card: "#ffffff",
} as const;

/** Roboto is the site font; mail clients without it fall back to the system stack. */
const FONT =
	"Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

/** The largest heading in an email. `text` is plain text and is escaped here. */
export function emailHeading(text: string): string {
	return `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:22px;line-height:30px;font-weight:700;color:${COLOR.foreground};">${escapeHtml(text)}</h1>`;
}

/** A body paragraph. `html` must already be escaped by the caller. */
export function emailText(html: string): string {
	return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:24px;color:${COLOR.foreground};">${html}</p>`;
}

/** Secondary text: expiry notes, "if this wasn't you". `html` must already be escaped. */
export function emailNote(html: string): string {
	return `<p style="margin:0 0 12px;font-family:${FONT};font-size:13px;line-height:20px;color:${COLOR.mutedForeground};">${html}</p>`;
}

/** Emphasis inside a paragraph; `text` is escaped here. */
export function emailStrong(text: string): string {
	return `<strong style="font-weight:700;color:${COLOR.foreground};">${escapeHtml(text)}</strong>`;
}

/** A mailto link to support, for use inside escaped paragraph html. */
export function supportLink(): string {
	return `<a href="mailto:${SUPPORT_EMAIL}" style="color:${COLOR.primary};text-decoration:underline;">${SUPPORT_EMAIL}</a>`;
}

/**
 * The primary call to action: a table-based button, which renders in every
 * major client including Outlook. `url` and `label` are escaped here.
 */
export function emailButton(url: string, label: string): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td style="border-radius:8px;background-color:${COLOR.primary};">
<a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:15px;line-height:20px;font-weight:700;color:${COLOR.primaryForeground};text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a>
</td></tr>
</table>`;
}

/** The plain URL under a button, for clients that block or break buttons. */
export function emailLinkFallback(url: string): string {
	const safeUrl = escapeHtml(url);
	return emailNote(
		`Button not working? Copy this link into your browser:<br><a href="${safeUrl}" style="color:${COLOR.primary};text-decoration:underline;word-break:break-all;">${safeUrl}</a>`,
	);
}

/** A one-time code set apart for copying. `code` is escaped here. */
export function emailCode(code: string): string {
	return `<p style="margin:4px 0 24px;"><span style="display:inline-block;padding:12px 20px;font-family:'SF Mono',Menlo,Consolas,'Courier New',monospace;font-size:28px;line-height:32px;font-weight:700;letter-spacing:6px;color:${COLOR.foreground};background-color:${COLOR.background};border:1px solid ${COLOR.border};border-radius:8px;">${escapeHtml(code)}</span></p>`;
}

/** A quoted block, such as a personal message from the owner. `text` is escaped here. */
export function emailQuote(text: string): string {
	return `<p style="margin:0 0 16px;padding:12px 16px;font-family:${FONT};font-size:14px;line-height:22px;color:${COLOR.foreground};background-color:${COLOR.background};border:1px solid ${COLOR.border};border-radius:8px;">${escapeHtml(text)}</p>`;
}

/** A thin rule between the main content and the notes. */
export function emailDivider(): string {
	return `<hr style="margin:24px 0 16px;border:0;border-top:1px solid ${COLOR.border};">`;
}

interface EmailLayoutOptions {
	/** The inbox preview line shown after the subject. Plain text; escaped here. */
	preheader?: string;
	/** The document title. Plain text; escaped here. */
	title?: string;
}

/**
 * Wrap body content in the branded layout: logo and name on the page
 * background, the content in a white card, and a footer with the tagline and
 * support address. `bodyContent` must already be escaped (use the helpers above).
 */
export function wrapEmailLayout(
	bodyContent: string,
	options: EmailLayoutOptions = {},
): string {
	const preheader = options.preheader
		? `<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(options.preheader)}</div>\n`
		: "";
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(options.title ?? BRAND_NAME)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.background};-webkit-text-size-adjust:100%;">
${preheader}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLOR.background};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;padding-right:10px;"><img src="${LOGO_URL}" width="32" height="32" alt="" style="display:block;border:0;border-radius:8px;"></td>
<td style="vertical-align:middle;font-family:${FONT};font-size:20px;line-height:28px;font-weight:700;color:${COLOR.foreground};">${BRAND_NAME}</td>
</tr></table>
</td></tr>
<tr><td style="padding:32px;background-color:${COLOR.card};border:1px solid ${COLOR.border};border-radius:12px;">
${bodyContent}
</td></tr>
<tr><td style="padding:24px 4px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${COLOR.mutedForeground};">
<p style="margin:0 0 4px;">${BRAND_NAME} &middot; ${TAGLINE}</p>
<p style="margin:0;">Questions? Email <a href="mailto:${SUPPORT_EMAIL}" style="color:${COLOR.mutedForeground};text-decoration:underline;">${SUPPORT_EMAIL}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
