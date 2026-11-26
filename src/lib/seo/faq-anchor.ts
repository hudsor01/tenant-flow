/**
 * A FAQ question's or group's fragment id on the page, e.g.
 * "do-my-tenants-create-accounts-or-log-in", so support replies, posts and
 * AI answers can link straight to it (2026-11-24 SEO audit Q12).
 */
export function faqAnchor(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
