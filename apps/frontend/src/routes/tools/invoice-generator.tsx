import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { ErrorBoundary as PageErrorBoundary } from '@/components/error/ErrorBoundary'

// Lazy load the invoice generator landing page
const InvoiceGeneratorLanding = lazy(() => import('@/pages/InvoiceGeneratorLanding'))

export const Route = createFileRoute('/tools/invoice-generator')({
	component: () => (
		<PageErrorBoundary>
			<InvoiceGeneratorLanding />
		</PageErrorBoundary>
	),
})