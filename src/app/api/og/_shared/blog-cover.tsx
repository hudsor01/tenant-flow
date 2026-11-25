import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { categoryLabel } from "#lib/seo/blog-categories";
import { readOgFonts } from "./og-fonts";

// A blog post's cover and share image, in ONE place. Two callers render it:
// `/api/og/blog/[slug]` on request (the og:image, and the cover for a post
// with no `featured_image`), and `scripts/render-blog-cover.tsx` once at
// publish, which stores the PNG in the `blog-covers` bucket. They used to
// carry two copies of this layout that had to be changed together.
//
// The category picks the palette, the slug's hash varies the gradient angle
// and the ring, the title is the artwork, and the logo badge carries the
// brand. The layout is centered because BlogCard crops 1200x630 to 16:10
// (about 9% off each side).
//
// COLOR FORMAT: hsl() only. satori renders oklch as black, and the design
// token drift guard bans hex and rgb in src/app. Each palette is the exact
// oklch-to-hsl conversion of a globals.css chart token; `to` is the same token
// at L-0.17:
//   software-vault    --chart-1: oklch(0.63 0.22 259)
//   tax-prep          --chart-2: oklch(0.70 0.18 180)
//   maintenance       --chart-3: oklch(0.72 0.16 85)
//   tenant-screening  --chart-4: oklch(0.65 0.18 20)
//   lease-law         --chart-5: oklch(0.55 0.12 250)
//
// There is no radial glow: satori drew its gradient box with a hard edge,
// which showed as a lighter rectangle behind the title.

const CATEGORY_PALETTES: Record<string, { from: string; to: string }> = {
	"software-vault": { from: "hsl(214 100% 57%)", to: "hsl(229 69% 47%)" },
	"tax-prep": { from: "hsl(171 100% 38%)", to: "hsl(176 100% 27%)" },
	maintenance: { from: "hsl(44 100% 41%)", to: "hsl(45 100% 28%)" },
	"tenant-screening": { from: "hsl(356 76% 62%)", to: "hsl(2 70% 39%)" },
	"lease-law": { from: "hsl(209 56% 45%)", to: "hsl(215 71% 29%)" },
};
const DEFAULT_PALETTE = { from: "hsl(214 100% 57%)", to: "hsl(229 69% 47%)" };

/** Deterministic djb2 hash, so two posts in one category still differ. */
function hashSlug(slug: string): number {
	let h = 5381;
	for (let i = 0; i < slug.length; i++) {
		h = (h * 33) ^ slug.charCodeAt(i);
	}
	return Math.abs(h);
}

/** The full logo (936x873), read once per server instance. */
let logoSrc: Promise<string> | null = null;
function readLogo(): Promise<string> {
	logoSrc ??= readFile(
		join(process.cwd(), "public/tenant-flow-logo.png"),
		"base64",
	).then((data) => `data:image/png;base64,${data}`);
	return logoSrc;
}

export async function blogCoverResponse(post: {
	title: string;
	category: string | null;
	slug: string;
}): Promise<ImageResponse> {
	const palette = CATEGORY_PALETTES[post.category ?? ""] ?? DEFAULT_PALETTE;
	const h = hashSlug(post.slug);
	const angle = 120 + (h % 50); // 120-169deg
	const ringRight = -12 + ((h >> 4) % 18); // bottom-right ring offset
	const [logo, fonts] = await Promise.all([readLogo(), readOgFonts()]);

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
				fontFamily: "Geist",
				fontWeight: 500,
				position: "relative",
				overflow: "hidden",
				textAlign: "center",
			}}
		>
			<div
				style={{
					position: "absolute",
					bottom: "-44%",
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
				{post.category ? categoryLabel(post.category) : "TenantFlow Blog"}
			</div>
			<div
				style={{
					display: "flex",
					fontSize: 58,
					fontWeight: 700,
					lineHeight: 1.16,
					maxWidth: 820,
					justifyContent: "center",
					textWrap: "balance",
				}}
			>
				{post.title}
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
		{ width: 1200, height: 630, fonts },
	);
}
