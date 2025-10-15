'use client'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	reportsClient,
	type CreateScheduleParams,
	type ReportType,
	type ScheduledReport
} from '@/lib/api/reports-client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { format } from 'date-fns'
import { Calendar, Clock, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const REPORT_TYPES: { value: ReportType; label: string }[] = [
	{ value: 'executive-monthly', label: 'Executive Monthly' },
	{ value: 'financial-performance', label: 'Financial Performance' },
	{ value: 'property-portfolio', label: 'Property Portfolio' },
	{ value: 'lease-portfolio', label: 'Lease Portfolio' },
	{ value: 'maintenance-operations', label: 'Maintenance Operations' },
	{ value: 'tax-preparation', label: 'Tax Preparation' }
]

const DAYS_OF_WEEK = [
	{ value: 0, label: 'Sunday' },
	{ value: 1, label: 'Monday' },
	{ value: 2, label: 'Tuesday' },
	{ value: 3, label: 'Wednesday' },
	{ value: 4, label: 'Thursday' },
	{ value: 5, label: 'Friday' },
	{ value: 6, label: 'Saturday' }
]

export default function ScheduleReportsPage() {
	const [schedules, setSchedules] = useState<ScheduledReport[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null)
	const [isDeleting, setIsDeleting] = useState(false)
	const logger = useMemo(
		() => createLogger({ component: 'ScheduleReportsPage' }),
		[]
	)

	// Form state
	const [reportType, setReportType] = useState<ReportType>('executive-monthly')
	const [reportName, setReportName] = useState('')
	const [reportFormat, setReportFormat] = useState<'pdf' | 'excel'>('pdf')
	const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
		'weekly'
	)
	const [dayOfWeek, setDayOfWeek] = useState<number>(1)
	const [dayOfMonth, setDayOfMonth] = useState<number>(1)
	const [hour, setHour] = useState<number>(9)
	const [startDate, setStartDate] = useState('')
	const [endDate, setEndDate] = useState('')

	const loadSchedules = useCallback(async () => {
		try {
			setIsLoading(true)
			const data = await reportsClient.listSchedules()
			setSchedules(data)
		} catch (error) {
			logger.error(
				'Failed to load schedules',
				{ action: 'loadSchedules' },
				error
			)
			toast.error(
				error instanceof Error ? error.message : 'Failed to load schedules'
			)
		} finally {
			setIsLoading(false)
		}
	}, [logger])

	useEffect(() => {
		loadSchedules()
		// Set default date range (last 30 days)
		const end = new Date()
		const start = new Date()
		start.setDate(start.getDate() - 30)
		setStartDate(start.toISOString().split('T')[0] || '')
		setEndDate(end.toISOString().split('T')[0] || '')
	}, [loadSchedules])

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()

		if (!reportName.trim()) {
			toast.error('Please enter a report name')
			return
		}

		try {
			setIsSubmitting(true)

			const scheduleParams: CreateScheduleParams = {
				reportType,
				reportName: reportName.trim(),
				format: reportFormat,
				frequency,
				hour,
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
			}

			if (startDate) {
				scheduleParams.startDate = startDate
			}
			if (endDate) {
				scheduleParams.endDate = endDate
			}
			if (frequency === 'weekly' && dayOfWeek !== undefined) {
				scheduleParams.dayOfWeek = dayOfWeek
			}
			if (frequency === 'monthly' && dayOfMonth !== undefined) {
				scheduleParams.dayOfMonth = dayOfMonth
			}

			await reportsClient.createSchedule(scheduleParams)

			toast.success('Schedule created successfully')
			setReportName('')
			loadSchedules()
		} catch (error) {
			logger.error('Failed to create schedule', { reportType }, error)
			toast.error(
				error instanceof Error ? error.message : 'Failed to create schedule'
			)
		} finally {
			setIsSubmitting(false)
		}
	}

	async function handleDelete() {
		if (!deleteScheduleId) return

		try {
			setIsDeleting(true)
			await reportsClient.deleteSchedule(deleteScheduleId)
			toast.success('Schedule deleted successfully')
			setDeleteScheduleId(null)
			loadSchedules()
		} catch (error) {
			logger.error(
				'Failed to delete schedule',
				{ scheduleId: deleteScheduleId ?? 'unknown' },
				error
			)
			toast.error(
				error instanceof Error ? error.message : 'Failed to delete schedule'
			)
		} finally {
			setIsDeleting(false)
		}
	}

	function getReportTypeLabel(reportType: string): string {
		return REPORT_TYPES.find(t => t.value === reportType)?.label || reportType
	}

	function getFrequencyLabel(
		frequency: string,
		dayOfWeek: number | null,
		dayOfMonth: number | null
	): string {
		switch (frequency) {
			case 'daily':
				return 'Daily'
			case 'weekly':
				return `Weekly (${DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || 'Monday'})`
			case 'monthly':
				return `Monthly (Day ${dayOfMonth || 1})`
			default:
				return frequency
		}
	}

	return (
		<div className="@container/main flex min-h-screen w-full flex-col gap-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Schedule Reports</h1>
				<p className="text-muted-foreground">
					Automate report generation with recurring schedules
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Create Schedule</CardTitle>
					<CardDescription>
						Set up automatic report generation on a daily, weekly, or monthly
						basis
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-8">
						{/* Report Configuration Section */}
						<div className="space-y-4">
							<h3 className="text-sm font-medium text-foreground">
								Report Configuration
							</h3>
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="reportType">Report Type</Label>
									<Select
										value={reportType}
										onValueChange={value => setReportType(value as ReportType)}
									>
										<SelectTrigger id="reportType">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{REPORT_TYPES.map(type => (
												<SelectItem key={type.value} value={type.value}>
													{type.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<Label htmlFor="reportName">Report Name</Label>
									<Input
										id="reportName"
										value={reportName}
										onChange={e => setReportName(e.target.value)}
										placeholder="e.g., Monthly Executive Report"
										required
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="format">Format</Label>
									<Select
										value={reportFormat}
										onValueChange={value =>
											setReportFormat(value as 'pdf' | 'excel')
										}
									>
										<SelectTrigger id="format">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="pdf">PDF</SelectItem>
											<SelectItem value="excel">Excel</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						{/* Schedule Configuration Section */}
						<div className="space-y-4 border-t pt-6">
							<h3 className="text-sm font-medium text-foreground">
								Schedule Configuration
							</h3>
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="frequency">Frequency</Label>
									<Select
										value={frequency}
										onValueChange={value =>
											setFrequency(value as 'daily' | 'weekly' | 'monthly')
										}
									>
										<SelectTrigger id="frequency">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="daily">Daily</SelectItem>
											<SelectItem value="weekly">Weekly</SelectItem>
											<SelectItem value="monthly">Monthly</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{frequency === 'weekly' && (
									<div className="space-y-2">
										<Label htmlFor="dayOfWeek">Day of Week</Label>
										<Select
											value={dayOfWeek.toString()}
											onValueChange={value => setDayOfWeek(Number(value))}
										>
											<SelectTrigger id="dayOfWeek">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{DAYS_OF_WEEK.map(day => (
													<SelectItem
														key={day.value}
														value={day.value.toString()}
													>
														{day.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{frequency === 'monthly' && (
									<div className="space-y-2">
										<Label htmlFor="dayOfMonth">Day of Month</Label>
										<Input
											id="dayOfMonth"
											type="number"
											min="1"
											max="31"
											value={dayOfMonth}
											onChange={e => setDayOfMonth(Number(e.target.value))}
										/>
									</div>
								)}

								<div className="space-y-2">
									<Label htmlFor="hour">Execution Time</Label>
									<Input
										id="hour"
										type="number"
										min="0"
										max="23"
										value={hour}
										onChange={e => setHour(Number(e.target.value))}
										placeholder="9"
									/>
									<p className="text-xs text-muted-foreground">
										24-hour format (0-23, e.g., 9 for 9 AM, 14 for 2 PM)
									</p>
								</div>
							</div>
						</div>

						{/* Date Range Section */}
						<div className="space-y-4 border-t pt-6">
							<h3 className="text-sm font-medium text-foreground">
								Report Date Range
							</h3>
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="startDate">Start Date</Label>
									<Input
										id="startDate"
										type="date"
										value={startDate}
										onChange={e => setStartDate(e.target.value)}
										required
									/>
								</div>

								<div className="space-y-2">
									<Label htmlFor="endDate">End Date</Label>
									<Input
										id="endDate"
										type="date"
										value={endDate}
										onChange={e => setEndDate(e.target.value)}
										required
									/>
								</div>
							</div>
							<p className="text-xs text-muted-foreground">
								Date range for report data (defaults to last 30 days)
							</p>
						</div>

						<div className="flex justify-end">
							<Button type="submit" disabled={isSubmitting} size="lg">
								{isSubmitting ? 'Creating Schedule...' : 'Create Schedule'}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Active Schedules</CardTitle>
					<CardDescription>
						{schedules.length}{' '}
						{schedules.length === 1 ? 'schedule' : 'schedules'} configured
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<div className="text-muted-foreground">Loading schedules...</div>
						</div>
					) : schedules.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<Calendar className="mb-4 size-12 text-muted-foreground" />
							<h3 className="mb-2 text-lg font-semibold">No schedules yet</h3>
							<p className="text-sm text-muted-foreground">
								Create your first scheduled report above
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Report Name</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Format</TableHead>
									<TableHead>Frequency</TableHead>
									<TableHead>Next Run</TableHead>
									<TableHead>Last Run</TableHead>
									<TableHead className="text-right">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{schedules.map(schedule => (
									<TableRow key={schedule.id}>
										<TableCell className="font-medium">
											{schedule.reportName}
										</TableCell>
										<TableCell>
											<Badge variant="outline">
												{getReportTypeLabel(schedule.reportType)}
											</Badge>
										</TableCell>
										<TableCell className="uppercase">
											{schedule.format}
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-2 text-sm">
												<Clock className="size-4 text-muted-foreground" />
												{getFrequencyLabel(
													schedule.frequency,
													schedule.dayOfWeek ?? null,
													schedule.dayOfMonth ?? null
												)}
											</div>
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{schedule.nextRunAt
												? format(
														new Date(schedule.nextRunAt),
														'MMM d, yyyy h:mm a'
													)
												: 'Not scheduled'}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{schedule.lastRunAt
												? format(
														new Date(schedule.lastRunAt),
														'MMM d, yyyy h:mm a'
													)
												: 'Never'}
										</TableCell>
										<TableCell className="text-right">
											<Button
												size="sm"
												variant="ghost"
												onClick={() => setDeleteScheduleId(schedule.id)}
											>
												<Trash2 className="mr-2 size-4" />
												Delete
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<AlertDialog
				open={!!deleteScheduleId}
				onOpenChange={() => setDeleteScheduleId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Schedule</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this schedule? This action cannot
							be undone. Future reports will no longer be generated.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
