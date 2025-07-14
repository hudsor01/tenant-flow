import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { PageErrorBoundary } from '@/components/error/ErrorBoundary'

// Lazy load the landing page
const LandingPage = lazy(() => import('@/pages/LandingPage'))

export const Route = createFileRoute('/')({
	component: () => (
		<PageErrorBoundary>
			<LandingPage />
		</PageErrorBoundary>
	),
})