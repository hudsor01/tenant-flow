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
// composition, the title is the artwork, and the real logo (white badge,
// bottom center) carries the brand.
//
// COLOR FORMAT: hsl() ONLY. satori does NOT support oklch — it silently
// renders oklch gradients as BLACK (shipped that once; never again), and
// the design-token drift guard bans hex/rgb in src/app. Every palette
// below is the EXACT oklch->hsl conversion of an official globals.css
// chart token (OKLab math, not eyeballed). Pixel-verified locally via an
// ImageResponse harness before deploying. Layout is CENTER-SAFE: BlogCard
// crops 1200x630 to 16:10 with object-cover (~9% trimmed each side).
export const runtime = "edge";
export const revalidate = 3600;

interface RouteParams {
	params: Promise<{ slug: string }>;
}

interface BlogRow {
	title: string;
	category: string | null;
}

// Official brand palette — exact conversions from src/app/globals.css:
//   software-vault    --color-chart-1: oklch(0.63 0.22 259)
//   tax-prep          --color-chart-2: oklch(0.70 0.18 180)
//   maintenance       --color-chart-3: oklch(0.72 0.16 85)
//   tenant-screening  --color-chart-4: oklch(0.65 0.18 20)
//   lease-law         --color-chart-5: oklch(0.55 0.12 250)
// `to` = same token at L-0.17 (darker companion); `glow` = L+0.14 sibling.
const CATEGORY_PALETTES: Record<
	string,
	{ from: string; to: string; glow: string }
> = {
	"software-vault": {
		from: "hsl(214 100% 57%)",
		to: "hsl(229 69% 47%)",
		glow: "hsl(206 100% 66%)",
	},
	"tax-prep": {
		from: "hsl(171 100% 38%)",
		to: "hsl(176 100% 27%)",
		glow: "hsl(169 83% 53%)",
	},
	maintenance: {
		from: "hsl(44 100% 41%)",
		to: "hsl(45 100% 28%)",
		glow: "hsl(39 100% 69%)",
	},
	"tenant-screening": {
		from: "hsl(356 76% 62%)",
		to: "hsl(2 70% 39%)",
		glow: "hsl(353 100% 78%)",
	},
	"lease-law": {
		from: "hsl(209 56% 45%)",
		to: "hsl(215 71% 29%)",
		glow: "hsl(207 59% 61%)",
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

// The real logo (public/tenant-flow-logo.png, 936x873) inlined as a data
// URI for satori. Fetched once per edge isolate from this deployment's own
// origin and cached; FAIL-OPEN to null (the badge is simply omitted) so a
// blip can never break cover rendering.
let logoDataUri: string | null = null;
let logoFetched = false;
async function getLogo(origin: string): Promise<string | null> {
	if (logoFetched) return logoDataUri;
	try {
		const res = await fetch(`${origin}/tenant-flow-logo.png`);
		if (res.ok) {
			const bytes = new Uint8Array(await res.arrayBuffer());
			let bin = "";
			for (let i = 0; i < bytes.length; i += 0x8000) {
				bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
			}
			logoDataUri = `data:image/png;base64,${btoa(bin)}`;
		}
	} catch {
		logoDataUri = null;
	}
	logoFetched = true;
	return logoDataUri;
}

export async function GET(req: Request, { params }: RouteParams) {
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
	const logo = await getLogo(new URL(req.url).origin);

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
					opacity: 0.4,
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
					marginBottom: 30,
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
					fontSize: 58,
					fontWeight: 800,
					lineHeight: 1.16,
					maxWidth: 760,
					justifyContent: "center",
				}}
			>
				{post.title}
			</div>
			{logo ? (
				<div
					style={{
						display: "flex",
						alignItems: "center",
						marginTop: 34,
						backgroundColor: "white",
						borderRadius: 18,
						padding: "2px 12px",
					}}
				>
					<img src={logo} width={154} height={144} alt="" />
				</div>
			) : (
				<div
					style={{
						display: "flex",
						marginTop: 38,
						fontSize: 26,
						fontWeight: 700,
						opacity: 0.95,
					}}
				>
					TenantFlow
				</div>
			)}
		</div>,
		{
			width: 1200,
			height: 630,
		},
	);
}
