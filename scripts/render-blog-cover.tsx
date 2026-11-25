/**
 * Render one blog cover PNG (1200x630) once, at publish time, so the cover
 * ships to Supabase Storage as a static CDN file and thumbnails never pay the
 * on-demand satori render. The design is `blogCoverResponse`, the same
 * renderer `/api/og/blog/[slug]` uses for posts without a stored cover.
 */
import { blogCoverResponse } from "#app/api/og/_shared/blog-cover";

export async function renderBlogCoverPng(opts: {
	title: string;
	category: string | null;
	slug: string;
}): Promise<Buffer> {
	const res = await blogCoverResponse(opts);
	return Buffer.from(await res.arrayBuffer());
}
