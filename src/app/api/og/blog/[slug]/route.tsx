import { ImageResponse } from "@vercel/og";

// `@vercel/og` requires the edge runtime — it streams the rendered PNG
// directly without spinning up a Node.js process per request. The CDN
// caches each per-slug PNG for one hour (post titles + category labels
// are stable; if a post is renamed, the cache key changes with the slug
// and the next request re-renders).
//
// We hit PostgREST directly with `fetch` instead of @supabase/ssr to keep
// the edge bundle under Vercel's 1 MB plan limit. @supabase/ssr +
// @t3-oss/env-nextjs + zod were pushing this route to 1.05 MB and failing
// to deploy.
export const runtime = "edge";
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

	// Brand colors derived from globals.css `--color-primary` (oklch).
	// `@vercel/og` requires inline CSS values so the canonical token
	// literals are duplicated here. This is the ONE permitted exception
	// to the no-hex/no-inline-color rule (Phase 6 CONTEXT.md § Design Token).
	const bgGradient =
		"linear-gradient(135deg, oklch(0.62 0.18 250) 0%, oklch(0.45 0.20 270) 100%)";

	return new ImageResponse(
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: "60px",
				background: bgGradient,
				color: "oklch(1 0 0)",
				fontFamily: "sans-serif",
			}}
		>
			<div
				style={{
					fontSize: 24,
					textTransform: "uppercase",
					letterSpacing: "0.1em",
					opacity: 0.85,
				}}
			>
				{post.category ?? "TenantFlow Blog"}
			</div>
			<div
				style={{
					fontSize: 64,
					fontWeight: 900,
					lineHeight: 1.15,
					maxWidth: "90%",
					display: "flex",
				}}
			>
				{post.title}
			</div>
			<div
				style={{
					fontSize: 28,
					fontWeight: 700,
					opacity: 0.9,
				}}
			>
				TenantFlow
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
		},
	);
}
