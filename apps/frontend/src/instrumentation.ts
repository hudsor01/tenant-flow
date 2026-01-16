/**
 * Next.js Instrumentation
 *
 * Initializes Sentry on the server and edge runtimes.
 * This file is automatically loaded by Next.js.
 */
export async function register() {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		await import('../sentry.server.config')
	}

	if (process.env.NEXT_RUNTIME === 'edge') {
		await import('../sentry.edge.config')
	}
}

export const onRequestError = async (
	error: Error & { digest?: string },
	request: {
		path: string
		method: string
		headers: Record<string, string>
	},
	context: {
		routerKind: 'Pages Router' | 'App Router'
		routePath: string
		routeType: 'render' | 'route' | 'action' | 'middleware'
		renderSource?: 'react-server-components' | 'react-server-components-payload'
		revalidateReason?: 'on-demand' | 'stale'
		renderType?: 'static' | 'dynamic'
	}
) => {
	const { captureRequestError } = await import('@sentry/nextjs')
	captureRequestError(error, request, context)
}
