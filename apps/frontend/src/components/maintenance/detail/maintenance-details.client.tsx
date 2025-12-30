'use client'

import * as React from 'react'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Input } from '#components/ui/input'
import { Textarea } from '#components/ui/textarea'
import { Skeleton } from '#components/ui/skeleton'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Field, FieldLabel } from '#components/ui/field'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { maintenanceQueries } from '#hooks/api/queries/maintenance-queries'
import { propertyQueries } from '#hooks/api/queries/property-queries'
import { unitQueries } from '#hooks/api/queries/unit-queries'
import { useMaintenanceRequestUpdateMutation } from '#hooks/api/mutations/maintenance-mutations'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { formatCurrency } from '#lib/formatters/currency'
import { apiRequest } from '#lib/api-request'
import {
	AlertTriangle,
	Calendar,
	CheckCircle,
	Clock,
	DollarSign,
	Download,
	Edit2,
	Image as ImageIcon,
	MapPin,
	Plus,
	Trash2,
	Upload,
	User,
	Wrench,
	XCircle
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type {
	MaintenanceStatus,
	MaintenancePriority,
	ExpenseRecord
} from '@repo/shared/types/core'

interface MaintenanceDetailsProps {
	id: string
}

const logger = createLogger({ component: 'MaintenanceDetails' })

// Status configuration
const STATUS_CONFIG: Record<
	MaintenanceStatus,
	{ label: string; className: string; icon: React.ReactNode }
> = {
	open: {
		label: 'Open',
		className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
		icon: <Clock className="size-3.5" />
	},
	in_progress: {
		label: 'In Progress',
		className: 'bg-primary/10 text-primary',
		icon: <AlertTriangle className="size-3.5" />
	},
	completed: {
		label: 'Completed',
		className: 'bg-green-500/10 text-green-600 dark:text-green-400',
		icon: <CheckCircle className="size-3.5" />
	},
	on_hold: {
		label: 'On Hold',
		className: 'bg-muted text-muted-foreground',
		icon: <Clock className="size-3.5" />
	},
	cancelled: {
		label: 'Cancelled',
		className: 'bg-muted text-muted-foreground',
		icon: <XCircle className="size-3.5" />
	}
}

// Priority configuration
const PRIORITY_CONFIG: Record<
	MaintenancePriority,
	{ label: string; className: string }
> = {
	low: { label: 'Low', className: 'bg-muted text-muted-foreground' },
	normal: { label: 'Normal', className: 'bg-primary/10 text-primary' },
	medium: { label: 'Medium', className: 'bg-primary/10 text-primary' },
	high: {
		label: 'High',
		className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
	},
	urgent: { label: 'Urgent', className: 'bg-destructive/10 text-destructive' }
}

// Timeline event type
interface TimelineEvent {
	id: string
	type:
		| 'created'
		| 'status_change'
		| 'scheduled'
		| 'expense_added'
		| 'photo_added'
		| 'completed'
	title: string
	description?: string
	timestamp: string
	user?: string
}

function generateTimeline(request: {
	created_at: string | null
	scheduled_date: string | null
	completed_at: string | null
	status: MaintenanceStatus
}): TimelineEvent[] {
	const events: TimelineEvent[] = []

	if (request.created_at) {
		events.push({
			id: 'created',
			type: 'created',
			title: 'Request Created',
			description: 'Maintenance request was submitted',
			timestamp: request.created_at
		})
	}

	if (request.scheduled_date) {
		events.push({
			id: 'scheduled',
			type: 'scheduled',
			title: 'Work Scheduled',
			description: `Scheduled for ${new Date(request.scheduled_date).toLocaleDateString()}`,
			timestamp: request.scheduled_date
		})
	}

	if (request.status === 'in_progress') {
		events.push({
			id: 'in_progress',
			type: 'status_change',
			title: 'Work Started',
			description: 'Maintenance work has begun',
			timestamp:
				request.scheduled_date ?? request.created_at ?? new Date().toISOString()
		})
	}

	if (request.completed_at) {
		events.push({
			id: 'completed',
			type: 'completed',
			title: 'Request Completed',
			description: 'Maintenance work has been completed',
			timestamp: request.completed_at
		})
	}

	return events.sort(
		(a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
	)
}

// Expense form dialog
function AddExpenseDialog({
	maintenanceId,
	onSuccess
}: {
	maintenanceId: string
	onSuccess: () => void
}) {
	const [open, setOpen] = React.useState(false)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [vendorName, setVendorName] = React.useState('')
	const [amount, setAmount] = React.useState('')
	const [expenseDate, setExpenseDate] = React.useState(
		new Date().toISOString().split('T')[0]
	)
	const [description, setDescription] = React.useState('')

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!amount || parseFloat(amount) <= 0) {
			toast.error('Please enter a valid amount')
			return
		}

		setIsSubmitting(true)
		try {
			await apiRequest('/api/v1/maintenance/expenses', {
				method: 'POST',
				body: JSON.stringify({
					maintenance_request_id: maintenanceId,
					vendor_name: vendorName || null,
					amount: parseFloat(amount),
					expense_date: expenseDate,
					description: description || null
				})
			})
			toast.success('Expense added successfully')
			setOpen(false)
			setVendorName('')
			setAmount('')
			setDescription('')
			onSuccess()
		} catch (error) {
			logger.error('Failed to add expense', { error })
			toast.error('Failed to add expense')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5">
					<Plus className="size-4" />
					Add Expense
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Expense</DialogTitle>
					<DialogDescription>
						Record an expense for this maintenance request.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<Field>
						<FieldLabel htmlFor="vendor">Vendor Name</FieldLabel>
						<Input
							id="vendor"
							placeholder="e.g., ABC Plumbing"
							value={vendorName}
							onChange={e => setVendorName(e.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="amount">Amount *</FieldLabel>
						<div className="relative">
							<DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								id="amount"
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								className="pl-9"
								value={amount}
								onChange={e => setAmount(e.target.value)}
								required
							/>
						</div>
					</Field>
					<Field>
						<FieldLabel htmlFor="expense_date">Date *</FieldLabel>
						<Input
							id="expense_date"
							type="date"
							value={expenseDate}
							onChange={e => setExpenseDate(e.target.value)}
							required
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="description">Description</FieldLabel>
						<Textarea
							id="description"
							placeholder="Brief description of the expense"
							rows={2}
							value={description}
							onChange={e => setDescription(e.target.value)}
						/>
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Adding...' : 'Add Expense'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

// Schedule dialog
function ScheduleDialog({
	maintenanceId,
	currentDate,
	onSuccess
}: {
	maintenanceId: string
	currentDate?: string | null
	onSuccess: () => void
}) {
	const [open, setOpen] = React.useState(false)
	const updateMutation = useMaintenanceRequestUpdateMutation()
	const [scheduledDate, setScheduledDate] = React.useState(
		currentDate ? new Date(currentDate).toISOString().split('T')[0] : ''
	)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!scheduledDate) {
			toast.error('Please select a date')
			return
		}

		try {
			await updateMutation.mutateAsync({
				id: maintenanceId,
				data: { scheduled_date: scheduledDate }
			})
			setOpen(false)
			onSuccess()
		} catch (error) {
			logger.error('Failed to schedule work', { error })
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1.5">
					<Calendar className="size-4" />
					{currentDate ? 'Reschedule' : 'Schedule'}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Schedule Work</DialogTitle>
					<DialogDescription>
						Select a date to schedule this maintenance work.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<Field>
						<FieldLabel htmlFor="schedule_date">Date *</FieldLabel>
						<Input
							id="schedule_date"
							type="date"
							value={scheduledDate}
							onChange={e => setScheduledDate(e.target.value)}
							min={new Date().toISOString().split('T')[0]}
							required
						/>
					</Field>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending ? 'Saving...' : 'Save'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

// Status change dropdown
function StatusSelect({
	currentStatus,
	maintenanceId,
	onSuccess
}: {
	currentStatus: MaintenanceStatus
	maintenanceId: string
	onSuccess: () => void
}) {
	const updateMutation = useMaintenanceRequestUpdateMutation()

	const handleStatusChange = async (newStatus: MaintenanceStatus) => {
		if (newStatus === currentStatus) return

		try {
			await updateMutation.mutateAsync({
				id: maintenanceId,
				data: {
					status: newStatus,
					completed_at:
						newStatus === 'completed' ? new Date().toISOString() : undefined
				}
			})
			onSuccess()
		} catch (error) {
			logger.error('Failed to update status', { error })
		}
	}

	return (
		<Select
			value={currentStatus}
			onValueChange={v => handleStatusChange(v as MaintenanceStatus)}
		>
			<SelectTrigger className="w-40" aria-label="Change status">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="open">Open</SelectItem>
				<SelectItem value="in_progress">In Progress</SelectItem>
				<SelectItem value="on_hold">On Hold</SelectItem>
				<SelectItem value="completed">Completed</SelectItem>
				<SelectItem value="cancelled">Cancelled</SelectItem>
			</SelectContent>
		</Select>
	)
}

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

	// Fetch expenses for this maintenance request
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
		return (
			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2 space-y-6">
					<Skeleton className="h-48" />
					<Skeleton className="h-64" />
				</div>
				<div className="space-y-6">
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
				</div>
			</div>
		)
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

	const statusConfig =
		STATUS_CONFIG[request.status as MaintenanceStatus] ?? STATUS_CONFIG.open
	const priorityConfig =
		PRIORITY_CONFIG[request.priority as MaintenancePriority] ??
		PRIORITY_CONFIG.normal
	const timeline = generateTimeline(request)
	const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)

	return (
		<div className="grid gap-6 lg:grid-cols-3">
			{/* Main Content */}
			<div className="lg:col-span-2 space-y-6">
				{/* Header Card */}
				<Card>
					<CardHeader className="flex-row items-start justify-between gap-4">
						<div className="space-y-2">
							<CardTitle className="flex items-center gap-2 text-xl">
								<Wrench className="size-5 text-primary" />
								{request.title ?? request.description ?? 'Maintenance Request'}
							</CardTitle>
							<div className="flex flex-wrap gap-2">
								<Badge className={`${statusConfig.className} gap-1`}>
									{statusConfig.icon}
									{statusConfig.label}
								</Badge>
								<Badge className={priorityConfig.className}>
									{priorityConfig.label} Priority
								</Badge>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<StatusSelect
								currentStatus={request.status as MaintenanceStatus}
								maintenanceId={request.id}
								onSuccess={handleRefresh}
							/>
							<Button asChild variant="outline" size="sm">
								<Link href={`/maintenance/${request.id}/edit`}>
									<Edit2 className="size-4 mr-1.5" />
									Edit
								</Link>
							</Button>
							<Button variant="outline" size="sm" onClick={handleExport}>
								<Download className="size-4" />
							</Button>
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Description */}
						<section className="space-y-2">
							<h2 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
								Description
							</h2>
							<p className="text-sm leading-relaxed">
								{request.description || 'No description provided.'}
							</p>
						</section>

						{/* Location & Schedule */}
						<section className="grid gap-4 md:grid-cols-2">
							<div className="rounded-lg border bg-muted/30 p-4">
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<MapPin className="size-4" />
									Location
								</div>
								<p className="mt-1 font-medium">
									{property?.name ?? 'Unassigned property'}
								</p>
								{unit && (
									<p className="text-sm text-muted-foreground">
										Unit {unit.unit_number}
									</p>
								)}
							</div>

							<div className="rounded-lg border bg-muted/30 p-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2 text-muted-foreground text-sm">
										<Calendar className="size-4" />
										Scheduled Date
									</div>
									<ScheduleDialog
										maintenanceId={request.id}
										currentDate={request.scheduled_date}
										onSuccess={handleRefresh}
									/>
								</div>
								<p className="mt-1 font-medium">
									{request.scheduled_date
										? new Date(request.scheduled_date).toLocaleDateString(
												'en-US',
												{
													weekday: 'long',
													year: 'numeric',
													month: 'long',
													day: 'numeric'
												}
											)
										: 'Not scheduled'}
								</p>
							</div>
						</section>

						{/* Cost Summary */}
						<section className="grid gap-4 md:grid-cols-3">
							<div className="rounded-lg border bg-muted/30 p-4">
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<DollarSign className="size-4" />
									Estimated Cost
								</div>
								<p className="mt-1 font-medium text-lg">
									{request.estimated_cost
										? formatCurrency(request.estimated_cost)
										: '-'}
								</p>
							</div>
							<div className="rounded-lg border bg-muted/30 p-4">
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<DollarSign className="size-4" />
									Actual Cost
								</div>
								<p className="mt-1 font-medium text-lg">
									{request.actual_cost
										? formatCurrency(request.actual_cost)
										: '-'}
								</p>
							</div>
							<div className="rounded-lg border bg-muted/30 p-4">
								<div className="flex items-center gap-2 text-muted-foreground text-sm">
									<DollarSign className="size-4" />
									Total Expenses
								</div>
								<p className="mt-1 font-medium text-lg">
									{totalExpenses > 0 ? formatCurrency(totalExpenses) : '-'}
								</p>
							</div>
						</section>
					</CardContent>
				</Card>

				{/* Expenses Card */}
				<Card>
					<CardHeader className="flex-row items-center justify-between">
						<div>
							<CardTitle className="text-base">Expenses</CardTitle>
							<CardDescription>
								Track costs associated with this request
							</CardDescription>
						</div>
						<AddExpenseDialog
							maintenanceId={request.id}
							onSuccess={handleRefresh}
						/>
					</CardHeader>
					<CardContent>
						{expenses.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<DollarSign className="size-8 mx-auto mb-2 opacity-50" />
								<p>No expenses recorded yet</p>
							</div>
						) : (
							<div className="space-y-3">
								{expenses.map(expense => (
									<div
										key={expense.id}
										className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
									>
										<div>
											<p className="font-medium">
												{expense.vendor_name || 'Unknown Vendor'}
											</p>
											<p className="text-sm text-muted-foreground">
												{expense.expense_date
													? new Date(expense.expense_date).toLocaleDateString()
													: 'No date'}
											</p>
										</div>
										<p className="font-medium">
											{formatCurrency(expense.amount ?? 0)}
										</p>
									</div>
								))}
								<div className="flex items-center justify-between pt-3 border-t">
									<p className="font-medium">Total</p>
									<p className="font-bold text-lg">
										{formatCurrency(totalExpenses)}
									</p>
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Photos Card */}
				<Card>
					<CardHeader className="flex-row items-center justify-between">
						<div>
							<CardTitle className="text-base">Photos</CardTitle>
							<CardDescription>Document the issue with photos</CardDescription>
						</div>
						<Button
							variant="outline"
							size="sm"
							className="gap-1.5"
							onClick={() => toast.info('Photo upload coming soon')}
						>
							<Upload className="size-4" />
							Upload Photo
						</Button>
					</CardHeader>
					<CardContent>
						<div className="text-center py-8 text-muted-foreground">
							<ImageIcon className="size-8 mx-auto mb-2 opacity-50" />
							<p>No photos uploaded yet</p>
						</div>
					</CardContent>
				</Card>
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

				{/* Timeline */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Timeline</CardTitle>
					</CardHeader>
					<CardContent>
						{timeline.length === 0 ? (
							<p className="text-sm text-muted-foreground">No activity yet</p>
						) : (
							<div className="relative">
								<div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
								<div className="space-y-4">
									{timeline.map(event => (
										<div key={event.id} className="relative pl-8">
											<div
												className={`absolute left-0 size-6 rounded-full flex items-center justify-center ${
													event.type === 'completed'
														? 'bg-green-500/10 text-green-600'
														: 'bg-primary/10 text-primary'
												}`}
											>
												{event.type === 'completed' ? (
													<CheckCircle className="size-3.5" />
												) : event.type === 'scheduled' ? (
													<Calendar className="size-3.5" />
												) : (
													<Clock className="size-3.5" />
												)}
											</div>
											<div>
												<p className="font-medium text-sm">{event.title}</p>
												{event.description && (
													<p className="text-xs text-muted-foreground">
														{event.description}
													</p>
												)}
												<p className="text-xs text-muted-foreground mt-1">
													{new Date(event.timestamp).toLocaleString()}
												</p>
											</div>
										</div>
									))}
								</div>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Quick Actions */}
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Quick Actions</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<Button
							variant="outline"
							className="w-full justify-start gap-2"
							onClick={() => router.push(`/maintenance/${id}/edit`)}
						>
							<Edit2 className="size-4" />
							Edit Request
						</Button>
						<Button
							variant="outline"
							className="w-full justify-start gap-2 text-destructive hover:text-destructive"
							onClick={() => toast.info('Delete functionality coming soon')}
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
