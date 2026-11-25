import { blogCoverResponse } from "../../_shared/blog-cover";

// A published post's cover and share image, drawn by `blogCoverResponse`
// (the same renderer `scripts/render-blog-cover.tsx` stores at publish).
// BlogCard and the post hero fall back to it when `featured_image` is null.
//
// Runs on the DEFAULT nodejs runtime, deliberately. This route used to pin
// `runtime = "edge"` because the standalone `@vercel/og` required it; it now
// imports the framework's own `next/og`, which runs anywhere. Next 16.3
// deprecated the edge runtime outright -- every build logged "The Edge Runtime
// is deprecated. You can use the nodejs runtime instead." -- so the pin was
// both unnecessary and a warning on every build. No explicit
// `runtime = "nodejs"` export: that is the default, and pinning a default is
// dead config.
//
// It renders on request; the build traces the logo and the two font files it
// reads from disk into its function (the paths are literals).
//
// The CDN caches each per-slug PNG for one hour (post titles + category labels
// are stable; if a post is renamed, the cache key changes with the slug and the
// next request re-renders).
//
// PostgREST is still called directly with `fetch` rather than via
// @supabase/ssr. The original reason was Vercel's 1 MB edge-bundle limit, which
// no longer applies off the edge runtime; it stays because one cookie-less
// fetch is all this route needs and swapping it would be an unrelated change.
export const revalidate = 3600;

interface RouteParams {
	params: Promise<{ slug: string }>;
}

interface BlogRow {
	title: string;
	category: string | null;
}

export async function GET(_req: Request, { params }: RouteParams) {
	const { slug } = await params;
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	if (!supabaseUrl || !supabaseKey) {
		return new Response("Supabase env missing", { status: 500 });
	}

	const encodedSlug = encodeURIComponent(slug);
	const url =
		`${supabaseUrl}/rest/v1/blogs` +
		`?select=title,category` +
		`&slug=eq.${encodedSlug}` +
		`&status=eq.published` +
		`&limit=1`;
	const res = await fetch(url, {
		headers: {
			apikey: supabaseKey,
			Authorization: `Bearer ${supabaseKey}`,
		},
		// Cache at the edge for the same hour the route revalidates.
		next: { revalidate: 3600 },
	});

	if (!res.ok) {
		return new Response("Not found", { status: 404 });
	}

	const rows = (await res.json()) as BlogRow[];
	const post = rows[0];
	if (!post) {
		return new Response("Not found", { status: 404 });
	}

	return blogCoverResponse({ ...post, slug });
}
