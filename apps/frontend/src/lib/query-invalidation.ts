import type { QueryClient } from '@tanstack/react-query'

/**
 * Invalidation helpers for common mutation side effects
 *
 * Ensures consistent cache invalidation across 50+ mutation hooks.
 * Consolidates duplicate invalidation patterns from CQ-007.
 *
 * Usage:
 * @example
 * onSuccess: (_, { id }) => {
 *   invalidation.resource(queryClient, 'tenants', id)
 * }
 */
export const invalidation = {
	/**
	 * Invalidate all queries for a resource (list + detail + related)
	 *
	 * @param client QueryClient instance
	 * @param resource Resource name (e.g., 'tenants', 'properties', 'leases')
	 * @param id Optional resource ID to invalidate specific detail queries
	 *
	 * @example
	 * // Invalidate all tenant queries after creating a tenant
	 * await invalidation.resource(queryClient, 'tenants')
	 *
	 * @example
	 * // Invalidate specific tenant and dashboard stats after updating
	 * await invalidation.resource(queryClient, 'tenants', tenantId)
	 */
	async resource(
		client: QueryClient,
		resource: string,
		id?: string | number
	): Promise<void> {
		const promises: Promise<void>[] = [
			client.invalidateQueries({ queryKey: [resource] }),
			client.invalidateQueries({ queryKey: ['dashboard', 'stats'] })
		]

		if (id !== undefined) {
			promises.push(client.invalidateQueries({ queryKey: [resource, id] }))
		}

		await Promise.all(promises)
	},

	/**
	 * Invalidate relationship queries (e.g., units when property updated)
	 *
	 * @param client QueryClient instance
	 * @param parentResource Parent resource name
	 * @param parentId Parent resource ID
	 * @param childResources Array of child resource names to invalidate
	 *
	 * @example
	 * // Invalidate units when property is updated
	 * await invalidation.related(
	 *   queryClient,
	 *   'properties',
	 *   propertyId,
	 *   ['units', 'leases']
	 * )
	 */
	async related(
		client: QueryClient,
		parentResource: string,
		parentId: string | number,
		childResources: string[]
	): Promise<void> {
		const promises = childResources.map(child =>
			client.invalidateQueries({
				queryKey: [child],
				predicate: query => {
					// Invalidate child lists that filter by parent ID
					const queryKeyStr = JSON.stringify(query.queryKey)
					return queryKeyStr.includes(String(parentId))
				}
			})
		)

		// Also invalidate parent resource
		promises.push(
			client.invalidateQueries({ queryKey: [parentResource, parentId] })
		)

		await Promise.all(promises)
	},

	/**
	 * Invalidate dashboard and stats after mutations
	 *
	 * Call this after any mutation that affects aggregate statistics.
	 *
	 * @example
	 * // Invalidate dashboard after creating a lease
	 * await invalidation.dashboard(queryClient)
	 */
	async dashboard(client: QueryClient): Promise<void> {
		await Promise.all([
			client.invalidateQueries({ queryKey: ['dashboard'] }),
			client.invalidateQueries({ queryKey: ['stats'] })
		])
	},

	/**
	 * Invalidate multiple resources at once
	 *
	 * Useful for complex operations that touch multiple entities.
	 *
	 * @example
	 * // Invalidate multiple resources after lease creation
	 * await invalidation.multiple(queryClient, ['leases', 'units', 'tenants'])
	 */
	async multiple(
		client: QueryClient,
		resources: string[]
	): Promise<void> {
		const promises = resources.map(resource =>
			client.invalidateQueries({ queryKey: [resource] })
		)

		// Always invalidate dashboard for multiple resource changes
		promises.push(client.invalidateQueries({ queryKey: ['dashboard'] }))

		await Promise.all(promises)
	}
}
