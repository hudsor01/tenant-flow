import { ImageResponse } from "@vercel/og";

// `@vercel/og` requires the edge runtime — it streams the rendered PNG
// directly without spinning up a Node.js process per request. The
// `revalidate` segment option is NOT honoured by route handlers (it
// applies to fetch() cache entries and RSC payloads, not to a Response /
// ImageResponse). Actual caching of the rendered PNG comes from the
// long-lived `Cache-Control` header that `@vercel/og` sets internally on
// `ImageResponse` plus Vercel's edge network defaults. The `revalidate`
// export is kept here as documentation of the intended cache horizon and
// to stay in lockstep with the sibling `/api/og/features/route.tsx`.
export const runtime = "edge";
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
