import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { ErrorBoundary as PageErrorBoundary } from '@/components/error/ErrorBoundary'
import { MarketingLayout } from '@/components/layout/MarketingLayout'

// Lazy load the landing page with better error handling
const LandingPage = lazy(() => 
  import('@/pages/LandingPage').catch((error) => {
    console.error('Failed to load LandingPage:', error)
    // Return a fallback component instead of crashing
    return {
      default: () => (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">TenantFlow</h1>
            <p className="text-gray-600 mb-8">Professional Property Management Platform</p>
            <div className="text-sm text-red-600">
              Error loading page content. Please refresh the page.
            </div>
          </div>
        </div>
      )
    }
  })
)

export const Route = createFileRoute('/')({
	component: () => {
		console.warn('[Index Route] Rendering home page component')
		
		return (
			<PageErrorBoundary>
				<MarketingLayout transparent={true} showBreadcrumbs={false}>
					<Suspense fallback={
						<div className="min-h-screen bg-gray-50 flex items-center justify-center">
							<div className="text-center">
								<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
								<p className="text-gray-600">Loading TenantFlow...</p>
							</div>
						</div>
					}>
						<LandingPage />
					</Suspense>
				</MarketingLayout>
			</PageErrorBoundary>
		)
	}
})
