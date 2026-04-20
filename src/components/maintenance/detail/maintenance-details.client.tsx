'use client'

import { Button } from '#components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { maintenanceQueries } from '#hooks/api/query-keys/maintenance-keys'
import { propertyQueries } from '#hooks/api/query-keys/property-keys'
import { unitQueries } from '#hooks/api/query-keys/unit-keys'
import { createClient } from '#lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useDeleteMaintenanceRequest } from '#hooks/api/use-maintenance'
import { callGeneratePdfFromHtml } from '#hooks/api/use-report-mutations'
import { formatCurrency } from '#lib/utils/currency'
import { buildWorkOrderHtml } from './work-order-template'
import type { ExpenseRecord } from '#types/core'
import { useState } from 'react'

import { User, Edit2, Trash2, Printer, Loader2 } from 'lucide-react'

import { MaintenanceHeaderCard } from './maintenance-header-card'
import { ExpensesCard } from './expenses-card'
import { PhotosCard } from './photos-card'
import { TimelineCard } from './timeline-card'
import { generateTimeline } from './maintenance-utils'

interface MaintenanceDetailsProps {
	id: string
}

export function MaintenanceDetails({ id }: MaintenanceDetailsProps) {
	const router = useRouter()
	const queryClient = useQueryClient()
	const deleteMutation = useDeleteMaintenanceRequest()
	const { data: request } = useSuspenseQuery(maintenanceQueries.detail(id))
	const { data: propertiesResponse } = useSuspenseQuery(propertyQueries.list())
	const { data: unitsResponse } = useSuspenseQuery(unitQueries.list())

	const { data: expensesData } = useQuery({
		queryKey: [...maintenanceQueries.all(), id, 'expenses'],
		queryFn: async () => {
			const supabase = createClient()
			const { data, error } = await supabase
				.from('expenses')
				.select('id, amount, expense_date, vendor_name, maintenance_request_id')
				.eq('maintenance_request_id', id)
			if (error) throw error
			return (data ?? []) as ExpenseRecord[]
		},
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
		queryClient.invalidateQueries({ queryKey: [...maintenanceQueries.all(), id, 'expenses'] })
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

	const timeline = generateTimeline(request)
	const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)

	const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
	const handleDownloadWorkOrder = async () => {
		if (!request) return
		setIsGeneratingPdf(true)
		try {
			const html = buildWorkOrderHtml({
				request,
				propertyName: property?.name ?? null,
				unitNumber: unit?.unit_number ?? null,
				expenses: expenses.map(e => ({
					vendor_name: e.vendor_name ?? 'Vendor',
					amount: formatCurrency(e.amount ?? 0),
					expense_date: e.expense_date ?? ''
				})),
				totalExpenses: formatCurrency(totalExpenses)
			})
			await callGeneratePdfFromHtml(
				html,
				`work-order-${request.id.slice(0, 8)}.pdf`
			)
			toast.success('Work order PDF downloaded')
		} catch (err) {
			toast.error('Failed to generate work order', {
				description:
					err instanceof Error ? err.message : 'Please try again.'
			})
		} finally {
			setIsGeneratingPdf(false)
		}
	}

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

				<PhotosCard requestId={id} />
			</div>

			{/* Sidebar */}
			<div className="space-y-6">
				{/* Contact Information */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Contact Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						{request.requested_by && (
							<div className="flex items-start gap-3">
								<div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
									<User className="size-4 text-primary" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Requested by</p>
									<p className="font-medium text-sm">{request.requested_by}</p>
								</div>
							</div>
						)}
						{request.assigned_to && (
							<div className="flex items-start gap-3">
								<div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
									<User className="size-4 text-primary" />
								</div>
								<div>
									<p className="text-sm text-muted-foreground">Assigned to</p>
									<p className="font-medium text-sm">{request.assigned_to}</p>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				<TimelineCard timeline={timeline} />

				{/* Quick Actions */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Quick Actions</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button
							variant="outline"
							className="w-full justify-start gap-2"
							onClick={() => router.push(`/maintenance/${request.id}/edit`)}
						>
							<Edit2 className="size-4" />
							Edit Request
						</Button>
						<Button
							variant="outline"
							className="w-full justify-start gap-2"
							onClick={handleDownloadWorkOrder}
							disabled={isGeneratingPdf}
						>
							{isGeneratingPdf ? (
								<>
									<Loader2 className="size-4 animate-spin" />
									Generating...
								</>
							) : (
								<>
									<Printer className="size-4" />
									Print work order
								</>
							)}
						</Button>
						<Button
							variant="outline"
							className="w-full justify-start gap-2 text-destructive hover:text-destructive"
							disabled={deleteMutation.isPending}
							onClick={async () => {
								if (!confirm('Are you sure you want to delete this maintenance request? This cannot be undone.')) return
								await deleteMutation.mutateAsync(id)
								router.push('/maintenance')
							}}
						>
							<Trash2 className="size-4" />
							Delete Request
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
