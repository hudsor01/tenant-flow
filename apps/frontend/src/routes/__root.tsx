import { createRootRoute, Outlet } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { Suspense, useMemo } from 'react'
import { Toaster } from 'sonner'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { AuthProvider } from '@/contexts/NestJSAuthProvider'
import { MemorySafeWrapper } from '@/components/common/MemorySafeWrapper'
import { PageTracker } from '@/components/common/PageTracker'
import { ErrorBoundary } from '@/components/error/ErrorBoundary'
import { trpc, createTRPCClient, queryClient } from '@/lib/clients'
// import { useBackgroundSync } from '@/lib/background-sync' // Unused import

// Global loading component
const GlobalLoading = () => (
	<div className="flex min-h-screen items-center justify-center">
		<div className="text-center">
			<div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
			<p className="text-gray-600">Loading TenantFlow...</p>
			<p className="mt-2 text-sm text-gray-400">
				If this takes too long, check the browser console for errors.
			</p>
		</div>
	</div>
)

// Router context interface
export interface RouterContext {
	queryClient: QueryClient
}

export const Route = createRootRoute({
	component: RootComponent
})

function RootComponent() {
	// Temporarily disable background sync to isolate router issues
	// useBackgroundSync(true)

	// Create TRPC client once at the root level
	const trpcClient = useMemo(() => createTRPCClient(), [])

	return (
		<trpc.Provider client={trpcClient} queryClient={queryClient}>
			<AuthProvider>
				<ErrorBoundary>
					<MemorySafeWrapper>
						<PageTracker />
						<Suspense fallback={<GlobalLoading />}>
							<Outlet />
						</Suspense>
						<Toaster />
						<Analytics />
						<SpeedInsights />
					</MemorySafeWrapper>
				</ErrorBoundary>
			</AuthProvider>
		</trpc.Provider>
	)
}
