/**
 * Normalize HTTP routes to keep Prometheus label cardinality bounded.
 *
 * - Replaces UUIDs with `:id`
 * - Replaces numeric segments with `:id`
 * - Replaces high-entropy segments (emails, tokens, etc.) with `:param`
 */
export function normalizeHttpRoute(route: string): string {
	const path = route.split('?')[0] || route

	const uuidPattern =
		/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi
	let normalized = path.replace(uuidPattern, ':id')

	normalized = normalized.replace(/\/\d+($|\/)/g, '/:id$1')

	const segments = normalized.split('/')
	const result = segments.map((segment, index) => {
		if (segment === '' || segment === ':id' || segment.startsWith('api')) {
			return segment
		}

		if (
			index > 2 &&
			(segment.includes('@') ||
				segment.includes('.') ||
				segment.includes('_') ||
				/^[a-z0-9-]+$/i.test(segment) === false)
		) {
			return ':param'
		}

		return segment
	})

	return result.join('/')
}
