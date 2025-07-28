import { createRouter } from '@tanstack/react-router'
import { routeTree } from '../routeTree.gen'
import { queryClient, honoClient } from './clients'
import type { RouterContext } from '../routes/__root'

// Create the router instance with prefetching strategy
export const router = createRouter({
	routeTree,
	context: {
		queryClient,
		honoClient,
	} satisfies RouterContext,
	// Intelligent prefetching configuration
	defaultPreload: 'intent', // Prefetch on hover/focus
	defaultPreloadStaleTime: 10000, // Keep prefetched data for 10 seconds
	defaultPreloadDelay: 100, // Delay 100ms before prefetching
	// Performance optimizations
	defaultPendingComponent: () => (
		<div className="flex items-center justify-center p-8">
			<div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
		</div>
	),
	defaultPendingMinMs: 500, // Show loading for minimum 500ms to prevent flicker
	defaultPendingMs: 1000, // Show loading after 1 second
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}
