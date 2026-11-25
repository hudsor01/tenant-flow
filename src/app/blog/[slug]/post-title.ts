/** Google shows about this many characters of a `<title>`. */
const MAX_TITLE_LENGTH = 60;
const BRAND_SUFFIX = " | TenantFlow";

/**
 * A post's `<title>` (2026-11-24 SEO audit PT-3): its search title
 * (`blogs.seo_title`), or its H1 when it has none, with " | TenantFlow" only
 * when the text doesn't already name the brand and the whole still fits in
 * 60 characters. Every title used to get " | TenantFlow Blog" on top of an H1
 * that already said "TenantFlow", 76 to 100 characters in all.
 */
export function postDocumentTitle(post: {
	seo_title: string | null;
	title: string;
}): string {
	const text = post.seo_title ?? post.title;
	if (/\bTenantFlow\b/i.test(text)) return text;
	const branded = `${text}${BRAND_SUFFIX}`;
	return branded.length <= MAX_TITLE_LENGTH ? branded : text;
}
