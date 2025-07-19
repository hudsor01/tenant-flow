import { createFileRoute } from '@tanstack/react-router'
import { lazy } from 'react'
import { ErrorBoundary as PageErrorBoundary } from '@/components/error/ErrorBoundary'

// Lazy load the state-specific lease generator page
const StateLeaseGenerator = lazy(() => import('@/pages/StateLeaseGenerator'))

// List of valid state slugs
const validStates = [
	'alabama',
	'alaska',
	'arizona',
	'arkansas',
	'california',
	'colorado',
	'connecticut',
	'delaware',
	'florida',
	'georgia',
	'hawaii',
	'idaho',
	'illinois',
	'indiana',
	'iowa',
	'kansas',
	'kentucky',
	'louisiana',
	'maine',
	'maryland',
	'massachusetts',
	'michigan',
	'minnesota',
	'mississippi',
	'missouri',
	'montana',
	'nebraska',
	'nevada',
	'new-hampshire',
	'new-jersey',
	'new-mexico',
	'new-york',
	'north-carolina',
	'north-dakota',
	'ohio',
	'oklahoma',
	'oregon',
	'pennsylvania',
	'rhode-island',
	'south-carolina',
	'south-dakota',
	'tennessee',
	'texas',
	'utah',
	'vermont',
	'virginia',
	'washington',
	'west-virginia',
	'wisconsin',
	'wyoming'
]

export const Route = createFileRoute('/tools/lease-generator/$state')({
	parseParams: params => ({
		state: params.state as string
	}),
	validateSearch: search => search,
	beforeLoad: ({ params }) => {
		// Validate that the state parameter is valid
		if (!validStates.includes(params.state)) {
			throw new Error(`Invalid state: ${params.state}`)
		}
	},
	component: StateLeaseGeneratorRoute
})

function StateLeaseGeneratorRoute() {
	Route.useParams()

	return (
		<PageErrorBoundary>
			<StateLeaseGenerator />
		</PageErrorBoundary>
	)
}
