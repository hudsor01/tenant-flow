import { ImageResponse } from "next/og";

// Runs on the DEFAULT nodejs runtime, deliberately. This route used to pin
// `runtime = "edge"` because the standalone `@vercel/og` required it; it now
// imports the framework's own `next/og`, which runs anywhere. Next 16.3
// deprecated the edge runtime outright -- every build logged "The Edge Runtime
// is deprecated. You can use the nodejs runtime instead." -- so the pin was
// both unnecessary and a warning on every build. No explicit
// `runtime = "nodejs"` export: that is the default, and pinning a default is
// dead config.
//
// LEAVING THE EDGE RUNTIME CHANGED THE CACHING STORY, for the better. On edge
// this route was `f` (Dynamic) -- the build said "Using edge runtime on a page
// currently disables static generation for that page" -- so it re-rendered per
// request and `revalidate` was inert, documentation only. On nodejs the build
// now reports it as `o` (Static) with `Revalidate 1h / Expire 1y`, so the
// export is live: the PNG is prerendered once at build time and served from
// cache. Keep it in lockstep with the sibling `/api/og/features/route.tsx`.
// `ImageResponse` still sets its own long-lived `Cache-Control` on top.
export const revalidate = 3600;

export function GET() {
	// Brand colors as hsl() literals. satori renders oklch as black, so OG
	// routes MUST use hsl (never oklch/hex/rgb). Duplicated inline because
	// satori has no CSS-var context (no --color-primary token available).
	const bgGradient =
		"linear-gradient(135deg, hsl(205 100% 46%) 0%, hsl(233 61% 47%) 100%)";

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
				color: "hsl(0 0% 100%)",
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
				Pricing
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 16,
				}}
			>
				<div
					style={{
						fontSize: 64,
						fontWeight: 900,
						lineHeight: 1.1,
						maxWidth: "90%",
						display: "flex",
					}}
				>
					Property management plans from $19/mo
				</div>
				<div
					style={{
						fontSize: 28,
						fontWeight: 400,
						lineHeight: 1.3,
						opacity: 0.85,
						display: "flex",
					}}
				>
					14-day free trial. No credit card required.
				</div>
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
