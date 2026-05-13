import { ImageResponse } from '@vercel/og'
import { COMPETITORS } from '#app/compare/[competitor]/compare-data'

// `@vercel/og` requires the edge runtime — it streams the rendered PNG
// directly without spinning up a Node.js process per request. The CDN
// caches each per-competitor PNG for one hour; competitor names are
// stable so the cache key rarely shifts.
export const runtime = 'edge'
export const revalidate = 3600

interface RouteParams {
	params: Promise<{ competitor: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
	const { competitor: slug } = await params
	const data = COMPETITORS[slug]

	if (!data) {
		return new Response('Not found', { status: 404 })
	}

	// Brand colors derived from globals.css `--color-primary` (oklch).
	// `@vercel/og` requires inline CSS values so the canonical token
	// literals are duplicated here. This is the ONE permitted exception
	// to the no-hex/no-inline-color rule (Phase 6 CONTEXT.md § Design Token).
	const bgGradient =
		'linear-gradient(135deg, oklch(0.62 0.18 250) 0%, oklch(0.45 0.20 270) 100%)'

	return new ImageResponse(
		(
			<div
				style={{
					height: '100%',
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'space-between',
					padding: '60px',
					background: bgGradient,
					color: 'oklch(1 0 0)',
					fontFamily: 'sans-serif',
				}}
			>
				<div
					style={{
						fontSize: 24,
						textTransform: 'uppercase',
						letterSpacing: '0.1em',
						opacity: 0.85,
					}}
				>
					Comparison
				</div>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 12,
					}}
				>
					<div
						style={{
							fontSize: 72,
							fontWeight: 900,
							lineHeight: 1.05,
							display: 'flex',
						}}
					>
						TenantFlow vs {data.name}
					</div>
					<div
						style={{
							fontSize: 30,
							fontWeight: 400,
							opacity: 0.85,
							display: 'flex',
						}}
					>
						Feature & pricing comparison
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
			</div>
		),
		{
			width: 1200,
			height: 630,
		},
	)
}
