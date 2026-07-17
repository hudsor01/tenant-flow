/**
 * Shared heading-anchor slugifier for blog posts.
 *
 * Extracted from `markdown-content.tsx` so that both the server-side markdown
 * renderer and the client-side ToC builder can import it without pulling the
 * react-markdown / remark / rehype dependency chain across the client boundary.
 */

/**
 * Builds a deterministic anchor id from heading text — identical to the
 * transform used by `MarkdownContent`'s h2 component, so ToC anchors never
 * drift from the rendered ids.
 */
export function headingId(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-");
}
