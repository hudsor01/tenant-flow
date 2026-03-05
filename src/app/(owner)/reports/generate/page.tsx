'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { handleMutationError } from '#lib/mutation-error-handler'
import { useAuth } from '#providers/auth-provider'

import { format, subMonths } from 'date-fns'
import { Calendar } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ReportCardGrid } from './components/report-card-grid'
import {
	reportCards,
	reportsClient,
	type ReportFormat,
	type ReportType
} from './components/report-types'

export default function GenerateReportsPage() {
	const { user } = useAuth()
	const [selectedPeriod, setSelectedPeriod] = useState('last-month')
	const [generatingReports, setGeneratingReports] = useState<
		Record<string, boolean>
	>({})

	// Calculate date range based on selected period
	const getDateRange = () => {
		const today = new Date()
		let start_date: Date
		const end_date: Date = today

		switch (selectedPeriod) {
			case 'last-month':
				start_date = subMonths(today, 1)
				break
			case 'last-3-months':
				start_date = subMonths(today, 3)
				break
			case 'last-6-months':
				start_date = subMonths(today, 6)
				break
			case 'last-year':
				start_date = subMonths(today, 12)
				break
			default:
				start_date = subMonths(today, 1)
		}

		return {
			start_date: format(start_date, 'yyyy-MM-dd'),
			end_date: format(end_date, 'yyyy-MM-dd')
		}
	}

	const handleGenerateReport = async (
		reportId: ReportType,
		reportFormat: ReportFormat
	) => {
		const reportKey = `${reportId}-${reportFormat}`
		setGeneratingReports(prev => ({ ...prev, [reportKey]: true }))

		try {
			const { start_date, end_date } = getDateRange()
			const user_id = user?.id

			if (!user_id) {
				toast.error('User not authenticated')
				return
			}

			await reportsClient.generateReport(reportId, {
				user_id,
				start_date,
				end_date,
				format: reportFormat
			})

			toast.success('Report generated successfully')
		} catch (error) {
			handleMutationError(error, 'Generate report')
		} finally {
			setGeneratingReports(prev => ({ ...prev, [reportKey]: false }))
		}
	}

	const executiveReports = reportCards.filter(r => r.category === 'executive')
	const financialReports = reportCards.filter(r => r.category === 'financial')
	const operationsReports = reportCards.filter(r => r.category === 'operations')

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">
						Generate Reports
					</h1>
					<p className="text-muted-foreground">
						Create comprehensive reports for your property portfolio.
					</p>
				</div>
			</div>

			{/* Date Range Selector */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="size-5" />
						Report Period
					</CardTitle>
					<CardDescription>
						Select the time period for your reports
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col gap-2">
						<Label htmlFor="period">Time Period</Label>
						<Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
							<SelectTrigger id="period" className="w-full sm:w-70">
								<SelectValue placeholder="Select period" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="last-month">Last Month</SelectItem>
								<SelectItem value="last-3-months">Last 3 Months</SelectItem>
								<SelectItem value="last-6-months">Last 6 Months</SelectItem>
								<SelectItem value="last-year">Last Year</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{/* Report Sections */}
			<div className="space-y-8">
				<ReportCardGrid
					title="Executive Reports"
					description="High-level summaries for leadership and stakeholders"
					reports={executiveReports}
					generatingReports={generatingReports}
					onGenerate={handleGenerateReport}
				/>

				<ReportCardGrid
					title="Financial Reports"
					description="Detailed financial analysis and performance metrics"
					reports={financialReports}
					generatingReports={generatingReports}
					onGenerate={handleGenerateReport}
				/>

				<ReportCardGrid
					title="Operations Reports"
					description="Property and maintenance operations insights"
					reports={operationsReports}
					generatingReports={generatingReports}
					onGenerate={handleGenerateReport}
				/>
			</div>
		</div>
	)
}
