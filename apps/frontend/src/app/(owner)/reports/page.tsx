'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { Input } from '#components/ui/input'
import { Skeleton } from '#components/ui/skeleton'
import {
	useFinancialReport,
	useMaintenanceReport,
	usePropertyReport,
	useTenantReport
} from '#hooks/api/use-reports'
import { apiRequestRaw } from '#lib/api-request'
import { formatCurrency } from '#lib/formatters/currency'
import { format } from 'date-fns'
import {
	BarChart3,
	Building2,
	Calendar,
	Download,
	FileText,
	Home,
	TriangleAlert,
	Users,
	Wrench
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'

const formatMoney = (value: number) =>
	formatCurrency(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

const formatPercent = (value: number) => `${value.toFixed(1)}%`

// Safe formatters for Recharts Tooltip (handles undefined)
const safeFormatMoney = (value: number | undefined) =>
	formatMoney(value ?? 0)

const safeFormatPercent = (value: number | undefined) =>
	formatPercent(value ?? 0)

function getDefaultDateRange() {
	const today = new Date()
	const start = new Date(today)
	start.setMonth(today.getMonth() - 2)
	start.setDate(1)

	return {
		start: format(start, 'yyyy-MM-dd'),
		end: format(today, 'yyyy-MM-dd')
	}
}

export default function ReportsPage() {
	const defaultRange = useMemo(() => getDefaultDateRange(), [])
	const [startDate, setStartDate] = useState(defaultRange.start)
	const [endDate, setEndDate] = useState(defaultRange.end)
	const [isExporting, setIsExporting] = useState<string | null>(null)

	const { data: financialReport, isLoading: financialLoading } =
		useFinancialReport(startDate, endDate)
	const { data: propertyReport, isLoading: propertyLoading } = usePropertyReport(
		startDate,
		endDate
	)
	const { data: tenantReport, isLoading: tenantLoading } = useTenantReport(
		startDate,
		endDate
	)
	const { data: maintenanceReport, isLoading: maintenanceLoading } =
		useMaintenanceReport(startDate, endDate)

	const hasAnyData =
		financialReport ||
		propertyReport ||
		tenantReport ||
		maintenanceReport

	const handlePdfExport = async (
		reportKey: string,
		title: string,
		payload: unknown
	) => {
		setIsExporting(reportKey)
		try {
			const response = await apiRequestRaw('/api/v1/reports/export/pdf', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title,
					filename: `${reportKey}-${startDate}-${endDate}`,
					payload
				})
			})

			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = `${reportKey}-${startDate}-${endDate}.pdf`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			setTimeout(() => window.URL.revokeObjectURL(url), 100)
			toast.success('Report exported')
		} catch {
			toast.error('Failed to export report')
		} finally {
			setIsExporting(null)
		}
	}

	return (
		<div className="@container/main flex min-h-screen w-full flex-col">
			<div className="border-b bg-background p-6 border-fill-tertiary">
				<div className="mx-auto max-w-400 py-4">
					<div className="flex-between mb-4">
						<div>
							<h1 className="typography-h2">Reports & Analytics</h1>
							<p className="text-muted-foreground mt-1">
								Generate financial, property, tenant, and maintenance reports
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Link href="/reports/analytics">
								<Button variant="outline" size="sm">
									<BarChart3 className="size-4 mr-2" />
									Analytics
								</Button>
							</Link>
							<Link href="/reports/generate">
								<Button size="sm">
									<FileText className="size-4 mr-2" />
									Generate Reports
								</Button>
							</Link>
						</div>
					</div>

					<Card className="mb-6">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Calendar className="size-5" />
								Date Range
							</CardTitle>
							<CardDescription>
								Use a custom window for report generation
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
							<div className="flex flex-col gap-2">
								<label className="text-sm text-muted-foreground" htmlFor="start">
									Start date
								</label>
								<Input
									id="start"
									type="date"
									value={startDate}
									onChange={event => setStartDate(event.target.value)}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<label className="text-sm text-muted-foreground" htmlFor="end">
									End date
								</label>
								<Input
									id="end"
									type="date"
									value={endDate}
									onChange={event => setEndDate(event.target.value)}
								/>
							</div>
							<Button
								variant="outline"
								onClick={() => {
									const range = getDefaultDateRange()
									setStartDate(range.start)
									setEndDate(range.end)
								}}
							>
								Reset to last 90 days
							</Button>
						</CardContent>
					</Card>

					{!hasAnyData ? (
						<Empty>
							<EmptyHeader>
								<EmptyMedia>
									<FileText className="size-12" />
								</EmptyMedia>
								<EmptyTitle>No report data yet</EmptyTitle>
								<EmptyDescription>
									Once payments, leases, and maintenance activity are recorded,
									reports will populate here.
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Link href="/reports/generate">
									<Button>
										<Download className="size-4 mr-2" />
										Generate a report
									</Button>
								</Link>
							</EmptyContent>
						</Empty>
					) : (
						<div className="flex flex-col gap-8">
							<section className="flex flex-col gap-4">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="typography-h4 flex items-center gap-2">
											<Home className="size-5 text-primary" />
											Financial Reports
										</h2>
										<p className="text-muted-foreground">
											Income statements, expenses, cash flow, and rent roll
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										disabled={!financialReport || isExporting === 'financial'}
										onClick={() =>
											handlePdfExport(
												'financial',
												'Financial Report',
												financialReport
											)
										}
									>
										<Download className="size-4 mr-2" />
										Export PDF
									</Button>
								</div>

								{financialLoading ? (
									<Skeleton className="h-72" />
								) : financialReport ? (
									<>
										<div className="grid gap-4 md:grid-cols-4">
											<Card>
												<CardHeader>
													<CardDescription>Total Income</CardDescription>
													<CardTitle className="text-2xl">
														{formatMoney(financialReport.summary.totalIncome)}
													</CardTitle>
												</CardHeader>
											</Card>
											<Card>
												<CardHeader>
													<CardDescription>Total Expenses</CardDescription>
													<CardTitle className="text-2xl">
														{formatMoney(financialReport.summary.totalExpenses)}
													</CardTitle>
												</CardHeader>
											</Card>
											<Card>
												<CardHeader>
													<CardDescription>Net Income</CardDescription>
													<CardTitle className="text-2xl">
														{formatMoney(financialReport.summary.netIncome)}
													</CardTitle>
												</CardHeader>
											</Card>
											<Card>
												<CardHeader>
													<CardDescription>Occupancy</CardDescription>
													<CardTitle className="text-2xl">
														{formatPercent(
															financialReport.summary.rentRollOccupancyRate
														)}
													</CardTitle>
												</CardHeader>
											</Card>
										</div>

										<Card>
											<CardHeader>
												<CardTitle>Income vs Expenses</CardTitle>
												<CardDescription>
													Monthly cash flow overview
												</CardDescription>
											</CardHeader>
											<CardContent className="h-64">
												<ResponsiveContainer width="100%" height="100%">
													<AreaChart data={financialReport.monthly}>
														<defs>
															<linearGradient
																id="incomeGradient"
																x1="0"
																y1="0"
																x2="0"
																y2="1"
															>
																<stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.6} />
																<stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
															</linearGradient>
															<linearGradient
																id="expenseGradient"
																x1="0"
																y1="0"
																x2="0"
																y2="1"
															>
																<stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.6} />
																<stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0} />
															</linearGradient>
														</defs>
														<CartesianGrid strokeDasharray="3 3" />
														<XAxis dataKey="month" />
														<YAxis tickFormatter={value => formatMoney(Number(value))} />
														<Tooltip
															formatter={safeFormatMoney}
														/>
														<Legend />
														<Area
															type="monotone"
															dataKey="income"
															name="Income"
															stroke="var(--chart-1)"
															fill="url(#incomeGradient)"
														/>
														<Area
															type="monotone"
															dataKey="expenses"
															name="Expenses"
															stroke="var(--chart-3)"
															fill="url(#expenseGradient)"
														/>
													</AreaChart>
												</ResponsiveContainer>
											</CardContent>
										</Card>
									</>
								) : null}
							</section>

							<section className="flex flex-col gap-4">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="typography-h4 flex items-center gap-2">
											<Building2 className="size-5 text-primary" />
											Property Reports
										</h2>
										<p className="text-muted-foreground">
											Occupancy rates, vacancy analysis, and property performance
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										disabled={!propertyReport || isExporting === 'properties'}
										onClick={() =>
											handlePdfExport(
												'properties',
												'Property Report',
												propertyReport
											)
										}
									>
										<Download className="size-4 mr-2" />
										Export PDF
									</Button>
								</div>

								{propertyLoading ? (
									<Skeleton className="h-72" />
								) : propertyReport ? (
									<>
										<div className="grid gap-4 md:grid-cols-3">
											<Card>
												<CardHeader>
													<CardDescription>Properties</CardDescription>
													<CardTitle className="text-2xl">
														{propertyReport.summary.totalProperties}
													</CardTitle>
												</CardHeader>
											</Card>
											<Card>
												<CardHeader>
													<CardDescription>Total Units</CardDescription>
													<CardTitle className="text-2xl">
														{propertyReport.summary.totalUnits}
													</CardTitle>
												</CardHeader>
											</Card>
											<Card>
												<CardHeader>
													<CardDescription>Occupancy</CardDescription>
													<CardTitle className="text-2xl">
														{formatPercent(propertyReport.summary.occupancyRate)}
													</CardTitle>
												</CardHeader>
											</Card>
										</div>

										<Card>
											<CardHeader>
												<CardTitle>Occupancy by Property</CardTitle>
											</CardHeader>
											<CardContent className="h-64">
												<ResponsiveContainer width="100%" height="100%">
													<BarChart data={propertyReport.byProperty}>
														<CartesianGrid strokeDasharray="3 3" />
														<XAxis dataKey="propertyName" />
														<YAxis />
														<Tooltip
															formatter={safeFormatPercent}
														/>
														<Bar dataKey="occupancyRate" name="Occupancy" fill="var(--chart-2)" />
													</BarChart>
												</ResponsiveContainer>
											</CardContent>
										</Card>
									</>
								) : null}
							</section>

							<section className="flex flex-col gap-4">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="typography-h4 flex items-center gap-2">
											<Users className="size-5 text-primary" />
											Tenant Reports
										</h2>
										<p className="text-muted-foreground">
											Payment history, lease expirations, and turnover analysis
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										disabled={!tenantReport || isExporting === 'tenants'}
										onClick={() =>
											handlePdfExport('tenants', 'Tenant Report', tenantReport)
										}
									>
										<Download className="size-4 mr-2" />
										Export PDF
									</Button>
								</div>

								{tenantLoading ? (
									<Skeleton className="h-72" />
								) : tenantReport ? (
									<>
										<div className="grid gap-4 md:grid-cols-4">
											<Card>
												<CardHeader>
													<CardDescription>Total Tenants</CardDescription>
													<CardTitle className="text-2xl">
														{tenantReport.summary.totalTenants}
													</CardTitle>
												</CardHeader>
											</Card>
											<Card>
												<CardHeader>
													<CardDescription>Active Leases</CardDescription>
													<CardTitle className="text-2xl">
														{tenantReport.summary.activeLeases}
													</CardTitle>
												</CardHeader>
											</Card>
											<Card>
												<CardHeader>
													<CardDescription>Expiring (90d)</CardDescription>
													<CardTitle className="text-2xl">
														{tenantReport.summary.leasesExpiringNext90}
													</CardTitle>
												</CardHeader>
											</Card>
											<Card>
												<CardHeader>
													<CardDescription>On-time Payments</CardDescription>
													<CardTitle className="text-2xl">
														{formatPercent(tenantReport.summary.onTimePaymentRate)}
													</CardTitle>
												</CardHeader>
											</Card>
										</div>

										<Card>
											<CardHeader>
												<CardTitle>Payment History</CardTitle>
											</CardHeader>
											<CardContent className="h-64">
												<ResponsiveContainer width="100%" height="100%">
													<LineChart data={tenantReport.paymentHistory}>
														<CartesianGrid strokeDasharray="3 3" />
														<XAxis dataKey="month" />
														<YAxis />
														<Tooltip
															formatter={safeFormatPercent}
														/>
														<Line
															type="monotone"
															dataKey="onTimeRate"
															stroke="var(--chart-1)"
															strokeWidth={2}
															name="On-time rate"
														/>
													</LineChart>
												</ResponsiveContainer>
											</CardContent>
										</Card>

										<Card>
											<CardHeader>
												<CardTitle>Upcoming Lease Expirations</CardTitle>
												<CardDescription>
													Next 90 days by property and unit
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-2">
												{tenantReport.leaseExpirations.length === 0 ? (
													<p className="text-muted-foreground text-sm">
														No leases expiring in the next 90 days.
													</p>
												) : (
													tenantReport.leaseExpirations.map(expiration => (
														<div
															key={expiration.leaseId}
															className="flex items-center justify-between rounded border border-border/40 px-3 py-2 text-sm"
														>
															<div>
																<div className="font-medium">
																	{expiration.propertyName}
																</div>
																<div className="text-muted-foreground">
																	{expiration.unitLabel}
																</div>
															</div>
															<span>{expiration.endDate}</span>
														</div>
													))
												)}
											</CardContent>
										</Card>
									</>
								) : null}
							</section>

							<section className="flex flex-col gap-4">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="typography-h4 flex items-center gap-2">
											<Wrench className="size-5 text-primary" />
											Maintenance Reports
										</h2>
										<p className="text-muted-foreground">
											Work order summaries, costs, and vendor performance
										</p>
									</div>
									<Button
										variant="outline"
										size="sm"
										disabled={!maintenanceReport || isExporting === 'maintenance'}
										onClick={() =>
											handlePdfExport(
												'maintenance',
												'Maintenance Report',
												maintenanceReport
											)
										}
									>
										<Download className="size-4 mr-2" />
										Export PDF
									</Button>
								</div>

								{maintenanceLoading ? (
									<Skeleton className="h-72" />
								) : maintenanceReport ? (
									<>
										<div className="grid gap-4 md:grid-cols-3">
											<Card>
												<CardHeader>
													<CardDescription>Total Requests</CardDescription>
													<CardTitle className="text-2xl">
														{maintenanceReport.summary.totalRequests}
													</CardTitle>
												</CardHeader>
											</Card>
											<Card>
												<CardHeader>
													<CardDescription>Open Requests</CardDescription>
													<CardTitle className="text-2xl">
														{maintenanceReport.summary.openRequests}
													</CardTitle>
												</CardHeader>
											</Card>
											<Card>
												<CardHeader>
													<CardDescription>Total Cost</CardDescription>
													<CardTitle className="text-2xl">
														{formatMoney(maintenanceReport.summary.totalCost)}
													</CardTitle>
												</CardHeader>
											</Card>
										</div>

										<div className="grid gap-4 lg:grid-cols-2">
											<Card>
												<CardHeader>
													<CardTitle>Status Breakdown</CardTitle>
												</CardHeader>
												<CardContent className="h-64">
													<ResponsiveContainer width="100%" height="100%">
														<BarChart data={maintenanceReport.byStatus}>
															<CartesianGrid strokeDasharray="3 3" />
															<XAxis dataKey="status" />
															<YAxis />
															<Tooltip />
															<Bar dataKey="count" fill="var(--chart-4)" />
														</BarChart>
													</ResponsiveContainer>
												</CardContent>
											</Card>
											<Card>
												<CardHeader>
													<CardTitle>Monthly Cost</CardTitle>
												</CardHeader>
												<CardContent className="h-64">
													<ResponsiveContainer width="100%" height="100%">
														<LineChart data={maintenanceReport.monthlyCost}>
															<CartesianGrid strokeDasharray="3 3" />
															<XAxis dataKey="month" />
															<YAxis />
															<Tooltip
															formatter={safeFormatMoney}
														/>
															<Line
																type="monotone"
																dataKey="cost"
																stroke="var(--chart-4)"
																strokeWidth={2}
															/>
														</LineChart>
													</ResponsiveContainer>
												</CardContent>
											</Card>
										</div>

										<Card>
											<CardHeader>
												<CardTitle>Vendor Performance</CardTitle>
												<CardDescription>
													Total spend by maintenance vendor
												</CardDescription>
											</CardHeader>
											<CardContent className="space-y-2">
												{maintenanceReport.vendorPerformance.length === 0 ? (
													<div className="flex items-center gap-2 text-sm text-muted-foreground">
														<TriangleAlert className="size-4" />
														No vendor spend recorded in this period.
													</div>
												) : (
													maintenanceReport.vendorPerformance.map(vendor => (
														<div
															key={vendor.vendorName}
															className="flex items-center justify-between rounded border border-border/40 px-3 py-2 text-sm"
														>
															<div>
																<div className="font-medium">{vendor.vendorName}</div>
																<div className="text-muted-foreground">
																	{vendor.jobs} jobs
																</div>
															</div>
															<span>{formatMoney(vendor.totalSpend)}</span>
														</div>
													))
												)}
											</CardContent>
										</Card>
									</>
								) : null}
							</section>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
