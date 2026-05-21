import { ImageResponse } from "@vercel/og";

// `@vercel/og` requires the edge runtime — it streams the rendered PNG
// directly without spinning up a Node.js process per request. The CDN
// caches the PNG for one hour; the static features title rarely changes
// so the cache hit rate is high.
export const runtime = "edge";
export const revalidate = 3600;

export function GET() {
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
				Features
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
					Document vault, lease e-signing & maintenance
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
					Everything landlords need to administer rental properties.
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
