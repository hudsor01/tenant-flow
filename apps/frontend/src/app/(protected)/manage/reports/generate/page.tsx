'use client'

import { Button } from '#components/ui/button'
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
import {
	reportsClient,
	type ReportFormat,
	type ReportType
} from '#lib/api/reports-client'
import { handleMutationError } from '#lib/mutation-error-handler'
import { useAuth } from '#providers/auth-provider'
import { format, subMonths } from 'date-fns'
import {
	Building2,
	Calendar,
	Download,
	FileSpreadsheet,
	FileText,
	TrendingUp,
	Wrench
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface ReportCard {
	id: ReportType
	title: string
	description: string
	icon: typeof FileText
	formats: ReportFormat[]
	category: 'executive' | 'financial' | 'operations'
}

const reportCards: ReportCard[] = [
	{
		id: 'executive-monthly',
		title: 'Executive Monthly Report',
		description:
			'Comprehensive monthly summary for leadership with key metrics and trends',
		icon: FileText,
		formats: ['pdf', 'excel'],
		category: 'executive'
	},
	{
		id: 'financial-performance',
		title: 'Financial Performance',
		description:
			'Detailed P&L, NOI by property, and expense breakdown with monthly trends',
		icon: TrendingUp,
		formats: ['pdf', 'excel'],
		category: 'financial'
	},
	{
		id: 'property-portfolio',
		title: 'Property Portfolio',
		description:
			'Portfolio analysis with property rankings, occupancy metrics, and vacancy analysis',
		icon: Building2,
		formats: ['pdf', 'excel'],
		category: 'operations'
	},
	{
		id: 'lease-portfolio',
		title: 'Lease Portfolio',
		description:
			'Lease analytics including profitability scores, lifecycle trends, and status breakdown',
		icon: FileText,
		formats: ['pdf', 'excel'],
		category: 'financial'
	},
	{
		id: 'maintenance-operations',
		title: 'Maintenance Operations',
		description:
			'Operations metrics with response times, cost breakdown, and urgency analysis',
		icon: Wrench,
		formats: ['pdf', 'excel'],
		category: 'operations'
	},
	{
		id: 'tax-preparation',
		title: 'Tax Preparation',
		description:
			'Tax-ready report with Schedule E codes and depreciation calculations (Excel only)',
		icon: FileSpreadsheet,
		formats: ['excel'],
		category: 'financial'
	}
]

export default function GenerateReportsPage() {
	const { user } = useAuth()
	const [selectedPeriod, setSelectedPeriod] = useState('last-month')
	const [generatingReports, setGeneratingReports] = useState<
		Record<string, boolean>
	>({})

	// Calculate date range based on selected period
	const getDateRange = () => {
		const today = new Date()
		let startDate: Date
		const endDate: Date = today

		switch (selectedPeriod) {
			case 'last-month':
				startDate = subMonths(today, 1)
				break
			case 'last-3-months':
				startDate = subMonths(today, 3)
				break
			case 'last-6-months':
				startDate = subMonths(today, 6)
				break
			case 'last-year':
				startDate = subMonths(today, 12)
				break
			default:
				startDate = subMonths(today, 1)
		}

		return {
			startDate: format(startDate, 'yyyy-MM-dd'),
			endDate: format(endDate, 'yyyy-MM-dd')
		}
	}

	const handleGenerateReport = async (
		reportId: ReportType,
		format: ReportFormat
	) => {
		const reportKey = `${reportId}-${format}`
		setGeneratingReports(prev => ({ ...prev, [reportKey]: true }))

		try {
			const { startDate, endDate } = getDateRange()
			const userId = user?.id

			if (!userId) {
				toast.error('User not authenticated')
				return
			}

			await reportsClient.generateReport(reportId, {
				userId,
				startDate,
				endDate,
				format
			})

			toast.success('Report generated successfully')
		} catch (error) {
			handleMutationError(error, 'Generate report')
		} finally{
			setGeneratingReports(prev => ({ ...prev, [reportKey]: false }))
		}
	}

	return (
		<div className="@container/main flex min-h-screen w-full flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h1 className="text-3xl font-bold tracking-tight">Generate Reports</h1>
				<p className="text-muted-foreground">
					Create comprehensive reports for your property portfolio
				</p>
			</div>

			{/* Date Range Selector */}
			<Card>
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

			{/* Executive Reports */}
			<div className="flex flex-col gap-4">
				<div>
					<h2 className="text-xl font-semibold">Executive Reports</h2>
					<p className="text-sm text-muted-foreground">
						High-level summaries for leadership and stakeholders
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{reportCards
						.filter(report => report.category === 'executive')
						.map(report => {
							const Icon = report.icon
							return (
								<Card key={report.id} className="flex flex-col">
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Icon className="size-5" />
											{report.title}
										</CardTitle>
										<CardDescription>{report.description}</CardDescription>
									</CardHeader>
									<CardContent className="flex-1 flex flex-col gap-3">
										<div className="flex-1" />
										<div className="flex gap-2">
											{report.formats.map(format => {
												const reportKey = `${report.id}-${format}`
												const isGenerating = generatingReports[reportKey]
												return (
													<Button
														key={format}
														variant={format === 'pdf' ? 'default' : 'outline'}
														size="sm"
														onClick={() =>
															handleGenerateReport(report.id, format)
														}
														disabled={isGenerating}
														className="flex-1"
													>
														<Download className="mr-2 size-4" />
														{isGenerating
															? 'Generating...'
															: format.toUpperCase()}
													</Button>
												)
											})}
										</div>
									</CardContent>
								</Card>
							)
						})}
				</div>
			</div>

			{/* Financial Reports */}
			<div className="flex flex-col gap-4">
				<div>
					<h2 className="text-xl font-semibold">Financial Reports</h2>
					<p className="text-sm text-muted-foreground">
						Detailed financial analysis and performance metrics
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{reportCards
						.filter(report => report.category === 'financial')
						.map(report => {
							const Icon = report.icon
							return (
								<Card key={report.id} className="flex flex-col">
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Icon className="size-5" />
											{report.title}
										</CardTitle>
										<CardDescription>{report.description}</CardDescription>
									</CardHeader>
									<CardContent className="flex-1 flex flex-col gap-3">
										<div className="flex-1" />
										<div className="flex gap-2">
											{report.formats.map(format => {
												const reportKey = `${report.id}-${format}`
												const isGenerating = generatingReports[reportKey]
												return (
													<Button
														key={format}
														variant={format === 'pdf' ? 'default' : 'outline'}
														size="sm"
														onClick={() =>
															handleGenerateReport(report.id, format)
														}
														disabled={isGenerating}
														className="flex-1"
													>
														<Download className="mr-2 size-4" />
														{isGenerating
															? 'Generating...'
															: format.toUpperCase()}
													</Button>
												)
											})}
										</div>
									</CardContent>
								</Card>
							)
						})}
				</div>
			</div>

			{/* Operations Reports */}
			<div className="flex flex-col gap-4">
				<div>
					<h2 className="text-xl font-semibold">Operations Reports</h2>
					<p className="text-sm text-muted-foreground">
						Property and maintenance operations insights
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{reportCards
						.filter(report => report.category === 'operations')
						.map(report => {
							const Icon = report.icon
							return (
								<Card key={report.id} className="flex flex-col">
									<CardHeader>
										<CardTitle className="flex items-center gap-2">
											<Icon className="size-5" />
											{report.title}
										</CardTitle>
										<CardDescription>{report.description}</CardDescription>
									</CardHeader>
									<CardContent className="flex-1 flex flex-col gap-3">
										<div className="flex-1" />
										<div className="flex gap-2">
											{report.formats.map(format => {
												const reportKey = `${report.id}-${format}`
												const isGenerating = generatingReports[reportKey]
												return (
													<Button
														key={format}
														variant={format === 'pdf' ? 'default' : 'outline'}
														size="sm"
														onClick={() =>
															handleGenerateReport(report.id, format)
														}
														disabled={isGenerating}
														className="flex-1"
													>
														<Download className="mr-2 size-4" />
														{isGenerating
															? 'Generating...'
															: format.toUpperCase()}
													</Button>
												)
											})}
										</div>
									</CardContent>
								</Card>
							)
						})}
				</div>
			</div>
		</div>
	)
}
