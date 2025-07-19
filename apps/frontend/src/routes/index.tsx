import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { ErrorBoundary as PageErrorBoundary } from '@/components/error/ErrorBoundary'
import { MarketingLayout } from '@/components/layout/MarketingLayout'

// Lazy load the landing page
const LandingPage = lazy(() => import('@/pages/LandingPage'))

export const Route = createFileRoute('/')({
	component: () => (
		<PageErrorBoundary>
			<MarketingLayout transparent={true} showBreadcrumbs={false}>
				<LandingPage />
			</MarketingLayout>
		</PageErrorBoundary>
	)
})
