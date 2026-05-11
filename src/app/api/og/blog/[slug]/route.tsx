import { ImageResponse } from '@vercel/og'
import { createClient } from '#lib/supabase/server'

// `@vercel/og` requires the edge runtime — it streams the rendered PNG
// directly without spinning up a Node.js process per request. The CDN
// caches each per-slug PNG for one hour (post titles + category labels
// are stable; if a post is renamed, the cache key changes with the slug
// and the next request re-renders).
export const runtime = 'edge'
export const revalidate = 3600

interface RouteParams {
	params: Promise<{ slug: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
	const { slug } = await params
	const supabase = await createClient()

	const { data: post, error } = await supabase
		.from('blogs')
		.select('title, category')
		.eq('slug', slug)
		.eq('status', 'published')
		.single()

	if (error || !post) {
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
					{post.category ?? 'TenantFlow Blog'}
				</div>
				<div
					style={{
						fontSize: 64,
						fontWeight: 900,
						lineHeight: 1.15,
						maxWidth: '90%',
						display: 'flex',
					}}
				>
					{post.title}
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
		}
	)
}
