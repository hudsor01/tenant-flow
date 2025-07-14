import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { PageErrorBoundary } from '@/components/error/ErrorBoundary'

// Lazy load the lease generator landing page
const LeaseGeneratorLanding = lazy(() => import('@/pages/LeaseGeneratorLanding'))

export const Route = createFileRoute('/tools/lease-generator')({
	component: () => (
		<PageErrorBoundary>
			<LeaseGeneratorLanding />
		</PageErrorBoundary>
	),
})