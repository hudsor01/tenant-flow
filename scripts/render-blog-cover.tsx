/**
 * Render one blog cover PNG (1200x630) — the SAME pixel-verified design as
 * /api/og/blog/[slug]/route.tsx, but executed ONCE at publish time so the
 * cover ships to Supabase Storage as a static CDN file. Thumbnails then never
 * pay the on-demand satori render again (the edge route stays as the fallback
 * for rows without a stored cover, and for social-card URLs already indexed).
 *
 * Palettes are exact oklch->hsl conversions of the official globals.css chart
 * tokens (satori does NOT support oklch — renders it black). The logo is read
 * from public/tenant-flow-logo.png on disk.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

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

function hashSlug(slug: string): number {
	let h = 5381;
	for (let i = 0; i < slug.length; i++) {
		h = (h * 33) ^ slug.charCodeAt(i);
	}
	return Math.abs(h);
}

let logoCache: string | null = null;
function logoDataUri(): string {
	if (!logoCache) {
		const buf = readFileSync(
			join(process.cwd(), "public/tenant-flow-logo.png"),
		);
		logoCache = `data:image/png;base64,${buf.toString("base64")}`;
	}
	return logoCache;
}

export async function renderBlogCoverPng(opts: {
	title: string;
	category: string | null;
	slug: string;
}): Promise<Buffer> {
	const { title, category, slug } = opts;
	const palette = CATEGORY_PALETTES[category ?? ""] ?? DEFAULT_PALETTE;
	const h = hashSlug(slug);
	const angle = 120 + (h % 50);
	const glowX = 18 + (h % 64);
	const ringRight = -12 + ((h >> 4) % 18);
	const logo = logoDataUri();

	const res = new ImageResponse(
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
				{category ?? "TenantFlow Blog"}
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
				{title}
			</div>
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
		</div>,
		{ width: 1200, height: 630 },
	);
	return Buffer.from(await res.arrayBuffer());
}
