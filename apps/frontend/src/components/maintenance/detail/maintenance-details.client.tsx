'use client'

import { Button } from '#components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { maintenanceQueries } from '#hooks/api/queries/maintenance-queries'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { unitQueries } from '#hooks/api/queries/unit-queries'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { apiRequest } from '#lib/api-request'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ExpenseRecord } from '@repo/shared/types/core'

import { MaintenanceDetailsSkeleton } from './maintenance-details-skeleton'
import { MaintenanceHeaderCard } from './maintenance-header-card'
import { ExpensesCard } from './expenses-card'
import { PhotosCard } from './photos-card'
import { ContactInfoCard } from './contact-info-card'
import { TimelineCard } from './timeline-card'
import { QuickActionsCard } from './quick-actions-card'
import { generateTimeline } from './maintenance-utils'

interface MaintenanceDetailsProps {
	id: string
}

const logger = createLogger({ component: 'MaintenanceDetails' })

export function MaintenanceDetails({ id }: MaintenanceDetailsProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const {
		data: request,
		isLoading,
		isError
	} = useQuery(maintenanceQueries.detail(id))
	const { data: propertiesResponse } = useQuery(propertyQueries.list())
	const { data: unitsResponse } = useQuery(unitQueries.list())

	const { data: expensesData } = useQuery({
		queryKey: ['maintenance', id, 'expenses'],
		queryFn: () =>
			apiRequest<ExpenseRecord[]>(`/api/v1/maintenance/${id}/expenses`),
		enabled: !!id
	})

	const units = unitsResponse?.data ?? []
	const properties = propertiesResponse?.data ?? []
	const expenses = expensesData ?? []

	const unit = units.find(u => u.id === request?.unit_id)
	const property = properties.find(p => p.id === unit?.property_id)

	const handleRefresh = () => {
		queryClient.invalidateQueries({
			queryKey: maintenanceQueries.detail(id).queryKey
		})
		queryClient.invalidateQueries({ queryKey: ['maintenance', id, 'expenses'] })
	}

	const handleExport = () => {
		if (!request) return

		const exportData = {
			id: request.id,
			title: request.title ?? request.description,
			description: request.description,
			status: request.status,
			priority: request.priority,
			property: property?.name ?? 'Unknown',
			unit: unit?.unit_number ?? 'Unknown',
			created_at: request.created_at,
			scheduled_date: request.scheduled_date,
			completed_at: request.completed_at,
			estimated_cost: request.estimated_cost,
			actual_cost: request.actual_cost,
			expenses: expenses.map(e => ({
				vendor: e.vendor_name,
				amount: e.amount,
				date: e.expense_date
			}))
		}

		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: 'application/json'
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `maintenance-${id}.json`
		a.click()
		URL.revokeObjectURL(url)
		toast.success('Export downloaded')
	}

	if (isLoading) {
		return <MaintenanceDetailsSkeleton />
	}

	if (isError || !request) {
		logger.error('Failed to load maintenance request')
		return (
			<Card className="border-destructive/20 bg-destructive/5">
				<CardHeader>
					<CardTitle>Unable to load request</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-destructive">
						Something went wrong while loading this maintenance request.
					</p>
					<Button
						variant="outline"
						className="mt-4"
						onClick={() => router.back()}
					>
						Go Back
					</Button>
				</CardContent>
			</Card>
		)
	}

	const timeline = generateTimeline(request)
	const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)

	return (
		<div className="grid gap-6 lg:grid-cols-3">
			{/* Main Content */}
			<div className="lg:col-span-2 space-y-6">
				<MaintenanceHeaderCard
					request={request}
					property={property}
					unit={unit}
					totalExpenses={totalExpenses}
					onRefresh={handleRefresh}
					onExport={handleExport}
				/>

				<ExpensesCard
					maintenanceId={request.id}
					expenses={expenses}
					onRefresh={handleRefresh}
				/>

				<PhotosCard />
			</div>

			{/* Sidebar */}
			<div className="space-y-6">
				<ContactInfoCard
					requestedBy={request.requested_by}
					assignedTo={request.assigned_to}
				/>

				<TimelineCard timeline={timeline} />

				<QuickActionsCard maintenanceId={request.id} />
			</div>
		</div>
	)
}
