'use client'

import { Card, CardContent } from '#components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#components/ui/tabs'
import { useQuery } from '@tanstack/react-query'
import { leaseQueries } from '#hooks/api/use-lease'
import { tenantQueries } from '#hooks/api/use-tenant'
import { useUnitList } from '#hooks/api/use-unit'
import { useCancelSignatureRequest } from '#hooks/api/use-lease'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { AlertTriangle } from 'lucide-react'

import { LeaseDetailsSkeleton } from './lease-details-skeleton'
import { LeaseHeader } from './lease-header'
import { LeaseMetricsCards } from './lease-metrics-cards'
import { LeaseDetailsTab } from './lease-details-tab'
import { LeaseTimelineTab } from './lease-timeline-tab'
import { LeaseTermsTab } from './lease-terms-tab'
import { LeaseSidebar } from './lease-sidebar'
import { generateTimelineEvents } from './lease-detail-utils'

interface LeaseDetailsProps {
	id: string
}

const logger = createLogger({ component: 'LeaseDetails' })

export function LeaseDetails({ id }: LeaseDetailsProps) {
	const { data: lease, isLoading, isError, error } = useQuery(leaseQueries.detail(id))
	const cancelSignature = useCancelSignatureRequest()

	const { data: tenantsResponse } = useQuery(tenantQueries.list())
	const { data: units } = useUnitList()

	const tenant = tenantsResponse?.data?.find(
		t => t.id === lease?.primary_tenant_id
	)
	const unit = units?.find(u => u.id === lease?.unit_id)

	if (isLoading) {
		return <LeaseDetailsSkeleton />
	}

	if (isError || !lease) {
		logger.error('Failed to load lease details', { action: 'loadLeaseDetails', error })

		// Determine error message based on error type
		const is404 = error && 'status' in error && error.status === 404
		const errorMessage = is404
			? 'This lease does not exist or you do not have permission to view it.'
			: 'Something went wrong while loading this lease. Please refresh and try again.'

		return (
			<Card className="border-destructive/50 bg-destructive/10">
				<CardContent className="p-6 text-center">
					<AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-3" />
					<h3 className="text-lg font-semibold text-destructive mb-2">
						Unable to load lease
					</h3>
					<p className="text-muted-foreground">{errorMessage}</p>
				</CardContent>
			</Card>
		)
	}

	const handleCancelSignature = async () => {
		await cancelSignature.mutateAsync(lease.id)
	}

	const timelineEvents = generateTimelineEvents(lease)

	return (
		<div className="space-y-6">
			{/* Header with status and actions */}
			<LeaseHeader
				lease={lease}
				tenant={tenant}
				onCancelSignature={handleCancelSignature}
				isCancelling={cancelSignature.isPending}
			/>

			{/* Main content grid */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Left column - Main details */}
				<div className="lg:col-span-2 space-y-6">
					{/* Key metrics */}
					<LeaseMetricsCards
						rentAmount={lease.rent_amount}
						securityDeposit={lease.security_deposit}
						paymentDay={lease.payment_day}
						gracePeriodDays={lease.grace_period_days}
					/>

					{/* Tabbed content */}
					<Tabs defaultValue="details" className="w-full">
						<TabsList className="grid w-full grid-cols-3">
							<TabsTrigger value="details">Details</TabsTrigger>
							<TabsTrigger value="timeline">Timeline</TabsTrigger>
							<TabsTrigger value="terms">Terms</TabsTrigger>
						</TabsList>

						<TabsContent value="details" className="mt-4">
							<LeaseDetailsTab lease={lease} tenant={tenant} unit={unit} />
						</TabsContent>

						<TabsContent value="timeline" className="mt-4">
							<LeaseTimelineTab events={timelineEvents} />
						</TabsContent>

						<TabsContent value="terms" className="mt-4">
							<LeaseTermsTab lease={lease} />
						</TabsContent>
					</Tabs>
				</div>

				{/* Right column - Sidebar */}
				<LeaseSidebar lease={lease} unit={unit} />
			</div>
		</div>
	)
}
