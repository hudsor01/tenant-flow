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
//
// This route doubles as the blog COVER ART system: BlogCard and the post
// hero fall back to it whenever `featured_image` is null (every factory
// post), so each post gets a unique, on-brand, high-res cover with zero
// manual curation — category picks the palette, the slug hash drives the
// composition, the title is the artwork.
export const runtime = "edge";
export const revalidate = 3600;

interface RouteParams {
	params: Promise<{ slug: string }>;
}

interface BlogRow {
	title: string;
	category: string | null;
}

// Brand-derived category palettes (oklch). `@vercel/og` requires inline CSS
// values so canonical token literals are duplicated here — this is the ONE
// permitted exception to the no-hex/no-inline-color rule (Phase 6
// CONTEXT.md § Design Token). software-vault keeps the original brand
// gradient; the other four are hue-shifted siblings at matched lightness/
// chroma so the catalogue reads as one family, never one repeated card.
const CATEGORY_PALETTES: Record<string, { from: string; to: string }> = {
	"software-vault": {
		from: "oklch(0.62 0.18 250)",
		to: "oklch(0.45 0.20 270)",
	},
	"lease-law": {
		from: "oklch(0.55 0.16 285)",
		to: "oklch(0.38 0.16 300)",
	},
	"tax-prep": {
		from: "oklch(0.58 0.14 175)",
		to: "oklch(0.40 0.13 195)",
	},
	"tenant-screening": {
		from: "oklch(0.56 0.17 320)",
		to: "oklch(0.40 0.16 335)",
	},
	maintenance: {
		from: "oklch(0.64 0.14 70)",
		to: "oklch(0.46 0.13 45)",
	},
};
const DEFAULT_PALETTE = CATEGORY_PALETTES["software-vault"] as {
	from: string;
	to: string;
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
	const angle = 115 + (h % 60); // 115-174deg
	const glowX = 55 + (h % 35); // accent glow: right half, varies per slug
	const glowY = (h >> 3) % 70; // 0-69% from top
	const ringX = (h >> 5) % 30; // outline ring: left third
	const ringY = 40 + ((h >> 7) % 50);
	const ringSize = 220 + ((h >> 9) % 160);

	return new ImageResponse(
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: "72px 80px",
				background: `linear-gradient(${angle}deg, ${palette.from} 0%, ${palette.to} 100%)`,
				color: "white",
				fontFamily: "sans-serif",
				position: "relative",
				overflow: "hidden",
			}}
		>
			{/* per-slug accent geometry — soft glow + outline ring */}
			<div
				style={{
					position: "absolute",
					top: `${glowY - 25}%`,
					left: `${glowX}%`,
					width: 560,
					height: 560,
					borderRadius: 9999,
					opacity: 0.22,
					background: "radial-gradient(circle, white 0%, transparent 65%)",
				}}
			/>
			<div
				style={{
					position: "absolute",
					top: `${ringY}%`,
					left: `${ringX - 8}%`,
					width: ringSize,
					height: ringSize,
					borderRadius: 9999,
					border: "3px solid white",
					opacity: 0.18,
				}}
			/>
			<div
				style={{
					position: "absolute",
					bottom: "-18%",
					right: "-6%",
					width: 420,
					height: 420,
					borderRadius: 9999,
					border: "2px solid white",
					opacity: 0.1,
				}}
			/>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 14,
					fontSize: 24,
					textTransform: "uppercase",
					letterSpacing: "0.12em",
					opacity: 0.9,
				}}
			>
				<div
					style={{
						width: 14,
						height: 14,
						borderRadius: 4,
						background: "white",
					}}
				/>
				{post.category ?? "TenantFlow Blog"}
			</div>
			<div
				style={{
					fontSize: 58,
					fontWeight: 800,
					lineHeight: 1.15,
					maxWidth: "84%",
					display: "flex",
				}}
			>
				{post.title}
			</div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					fontSize: 28,
					fontWeight: 700,
					opacity: 0.92,
				}}
			>
				<div style={{ display: "flex" }}>TenantFlow</div>
				<div
					style={{
						display: "flex",
						fontSize: 22,
						fontWeight: 500,
						opacity: 0.75,
					}}
				>
					tenantflow.app/blog
				</div>
			</div>
		</div>,
		{
			width: 1200,
			height: 630,
		},
	);
}
