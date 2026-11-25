import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { OgCard } from "#lib/seo/og-cards";
import { readOgFonts } from "./og-fonts";

// The one layout for every page's share card (2026-11-24 SEO audit S4): the
// blog cover's blue gradient and ring, with the logo, the card's text and the
// site address. `_shared` is a private folder, so nothing here is a route.
//
// Colors are hsl() literals: satori renders oklch as black, and it has no CSS
// variables to read tokens from. The palette is the blog cover's
// `software-vault` one (`../blog/[slug]/route.tsx`), so a page card and a post
// cover read as one brand.

const PALETTE = {
	from: "hsl(214 100% 57%)",
	to: "hsl(229 69% 47%)",
} as const;

// Every card route is prerendered (`force-static`), so the logo and fonts are
// read at build time, from the repo.

/** The logo mark (295x256). */
let logoSrc: Promise<string> | null = null;
function readLogo(): Promise<string> {
	logoSrc ??= readFile(
		join(process.cwd(), "public/brand/tenantflow-mark.png"),
		"base64",
	).then((data) => `data:image/png;base64,${data}`);
	return logoSrc;
}

export async function ogCardResponse(card: OgCard): Promise<ImageResponse> {
	const [logo, fonts] = await Promise.all([readLogo(), readOgFonts()]);

	return new ImageResponse(
		<div
			style={{
				height: "100%",
				width: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				padding: "64px 72px",
				background: `linear-gradient(135deg, ${PALETTE.from} 0%, ${PALETTE.to} 100%)`,
				color: "white",
				fontFamily: "Geist",
				fontWeight: 500,
				position: "relative",
				overflow: "hidden",
			}}
		>
			<div
				style={{
					position: "absolute",
					bottom: "-62%",
					right: "-14%",
					width: 560,
					height: 560,
					borderRadius: 9999,
					border: "3px solid white",
					opacity: 0.14,
				}}
			/>
			<div style={{ display: "flex", alignItems: "center", gap: 20 }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 88,
						height: 88,
						borderRadius: 20,
						backgroundColor: "white",
					}}
				>
					<img src={logo} width={74} height={64} alt="" />
				</div>
				<div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
					TenantFlow
				</div>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
				<div
					style={{
						display: "flex",
						fontSize: 24,
						fontWeight: 700,
						textTransform: "uppercase",
						letterSpacing: "0.16em",
						opacity: 0.9,
					}}
				>
					{card.eyebrow}
				</div>
				<div
					style={{
						display: "flex",
						fontSize: 64,
						fontWeight: 700,
						lineHeight: 1.12,
						maxWidth: 980,
						textWrap: "balance",
					}}
				>
					{card.headline}
				</div>
				<div
					style={{
						display: "flex",
						fontSize: 30,
						lineHeight: 1.3,
						opacity: 0.9,
						maxWidth: 960,
					}}
				>
					{card.subline}
				</div>
			</div>
			<div style={{ display: "flex", fontSize: 26, opacity: 0.85 }}>
				tenantflow.app
			</div>
		</div>,
		{ width: 1200, height: 630, fonts },
	);
}
