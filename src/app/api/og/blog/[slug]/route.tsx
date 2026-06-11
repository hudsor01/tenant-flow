import { ImageResponse } from "@vercel/og";

// `@vercel/og` requires the edge runtime — it streams the rendered PNG
// directly without spinning up a Node.js process per request. The CDN
// caches each per-slug PNG for one hour (post titles + category labels
// are stable; if a post is renamed, the cache key changes with the slug
// and the next request re-renders).
//
// We hit PostgREST directly with `fetch` instead of @supabase/ssr to keep
// the edge bundle under Vercel's 1 MB plan limit.
//
// This route doubles as the blog COVER ART system: BlogCard and the post
// hero fall back to it whenever `featured_image` is null (every factory
// post), so each post gets a unique, on-brand, high-res cover with zero
// manual curation — category picks the palette, the slug hash drives the
// composition, the title is the artwork.
//
// COLOR FORMAT: hsl() ONLY. satori does NOT support oklch — it silently
// renders oklch gradients as BLACK (shipped that once; never again), and
// the design-token drift guard bans hex/rgb in src/app. This design was
// pixel-verified locally via an ImageResponse harness before deploying.
// Layout is CENTER-SAFE: BlogCard crops 1200x630 to 16:10 with
// object-cover (~9% trimmed each side), so all text stays within the
// central ~64% width.
export const runtime = "edge";
export const revalidate = 3600;

interface RouteParams {
	params: Promise<{ slug: string }>;
}

interface BlogRow {
	title: string;
	category: string | null;
}

// Brand-family category palettes (hsl; satori-safe, drift-guard-allowed).
// software-vault ~ the brand blue-violet; the others are hue-shifted
// siblings at matched saturation/lightness so the catalogue reads as one
// family without ever repeating a card.
const CATEGORY_PALETTES: Record<
	string,
	{ from: string; to: string; glow: string }
> = {
	"software-vault": {
		from: "hsl(228 72% 56%)",
		to: "hsl(262 68% 38%)",
		glow: "hsl(210 90% 70%)",
	},
	"lease-law": {
		from: "hsl(248 62% 54%)",
		to: "hsl(270 65% 34%)",
		glow: "hsl(235 85% 72%)",
	},
	"tax-prep": {
		from: "hsl(168 58% 42%)",
		to: "hsl(192 64% 26%)",
		glow: "hsl(155 70% 62%)",
	},
	"tenant-screening": {
		from: "hsl(316 58% 50%)",
		to: "hsl(338 64% 32%)",
		glow: "hsl(300 75% 68%)",
	},
	maintenance: {
		from: "hsl(34 88% 54%)",
		to: "hsl(16 78% 38%)",
		glow: "hsl(45 95% 65%)",
	},
};
const DEFAULT_PALETTE = CATEGORY_PALETTES["software-vault"] as {
	from: string;
	to: string;
	glow: string;
};

// Deterministic djb2 hash — per-slug composition variety (gradient angle +
// accent geometry) so two posts in the same category still get distinct art.
function hashSlug(slug: string): number {
	let h = 5381;
	for (let i = 0; i < slug.length; i++) {
		h = (h * 33) ^ slug.charCodeAt(i);
	}
	return Math.abs(h);
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

	const palette = CATEGORY_PALETTES[post.category ?? ""] ?? DEFAULT_PALETTE;
	const h = hashSlug(slug);
	const angle = 120 + (h % 50); // 120-169deg
	const glowX = 18 + (h % 64); // glow drifts across the top per slug
	const ringRight = -12 + ((h >> 4) % 18); // bottom-right ring offset

	return new ImageResponse(
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				background: `linear-gradient(${angle}deg, ${palette.from} 0%, ${palette.to} 100%)`,
				color: "white",
				fontFamily: "sans-serif",
				position: "relative",
				overflow: "hidden",
				textAlign: "center",
			}}
		>
			<div
				style={{
					position: "absolute",
					top: "-30%",
					left: `${glowX}%`,
					width: 700,
					height: 700,
					borderRadius: 9999,
					background: `radial-gradient(circle, ${palette.glow} 0%, transparent 60%)`,
					opacity: 0.45,
				}}
			/>
			<div
				style={{
					position: "absolute",
					bottom: "-32%",
					right: `${ringRight}%`,
					width: 520,
					height: 520,
					borderRadius: 9999,
					border: "3px solid white",
					opacity: 0.14,
				}}
			/>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 12,
					fontSize: 22,
					fontWeight: 700,
					textTransform: "uppercase",
					letterSpacing: "0.18em",
					opacity: 0.92,
					marginBottom: 34,
				}}
			>
				<div
					style={{
						width: 10,
						height: 10,
						borderRadius: 9999,
						background: "white",
					}}
				/>
				{post.category ?? "TenantFlow Blog"}
			</div>
			<div
				style={{
					display: "flex",
					fontSize: 60,
					fontWeight: 800,
					lineHeight: 1.18,
					maxWidth: 760,
					justifyContent: "center",
				}}
			>
				{post.title}
			</div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 10,
					marginTop: 38,
					fontSize: 26,
					fontWeight: 700,
					opacity: 0.95,
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
