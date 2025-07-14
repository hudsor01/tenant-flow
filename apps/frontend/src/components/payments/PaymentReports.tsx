import React, { useState } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/utils/currency'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
	FileText,
	Download,
	Filter,
	DollarSign,
	TrendingUp,
	Building,
	Receipt,
	AlertTriangle,
	CheckCircle,
	Clock,
	Target
} from 'lucide-react'
import { usePayments } from '@/hooks/usePayments'
import { useProperties } from '@/hooks/useProperties'
import { motion } from 'framer-motion'
import {
	format,
	startOfMonth,
	endOfMonth,
	subMonths,
	isWithinInterval
} from 'date-fns'
import type { PaymentType, PaymentStatus } from '@/types/entities'

interface PaymentReportsProps {
	propertyId?: string
	className?: string
}

interface ReportFilters {
	dateRange: 'current-month' | 'last-month' | 'quarter' | 'year' | 'all-time'
	paymentType: PaymentType | 'all'
	propertyId: string | 'all'
	status: PaymentStatus | 'ALL'
}

export default function PaymentReports({
	propertyId,
	className
}: PaymentReportsProps) {
	const [filters, setFilters] = useState<ReportFilters>({
		dateRange: 'current-month',
		paymentType: 'all',
		propertyId: propertyId || 'all',
		status: 'ALL'
	})

	const { data: payments = [], loading: paymentsLoading } = usePayments()
	const { data: properties = [] } = useProperties()

	// Filter payments based on current filters
	const filteredPayments = payments.filter(payment => {
		// Date range filter
		const paymentDate = new Date(payment.date)
		const now = new Date()
		let dateMatch = true

		switch (filters.dateRange) {
			case 'current-month':
				dateMatch = isWithinInterval(paymentDate, {
					start: startOfMonth(now),
					end: endOfMonth(now)
				})
				break
			case 'last-month': {
				const lastMonth = subMonths(now, 1)
				dateMatch = isWithinInterval(paymentDate, {
					start: startOfMonth(lastMonth),
					end: endOfMonth(lastMonth)
				})
				break
			}
			case 'quarter': {
				const quarterStart = new Date(
					now.getFullYear(),
					Math.floor(now.getMonth() / 3) * 3,
					1
				)
				dateMatch = paymentDate >= quarterStart
				break
			}
			case 'year':
				dateMatch = paymentDate.getFullYear() === now.getFullYear()
				break
			case 'all-time':
			default:
				dateMatch = true
		}

		// Payment type filter
		const typeMatch =
			filters.paymentType === 'all' ||
			payment.type === filters.paymentType

		// Property filter
		const lease = Array.isArray(payment.lease)
			? payment.lease[0]
			: payment.lease
		const unit = Array.isArray(lease?.unit) ? lease.unit[0] : lease?.unit
		const property = Array.isArray(unit?.property)
			? unit.property[0]
			: unit?.property
		const propertyMatch =
			filters.propertyId === 'all' || property?.id === filters.propertyId

		// Status filter
		const statusMatch =
			filters.status === 'ALL' || payment.status === filters.status

		return dateMatch && typeMatch && propertyMatch && statusMatch
	})

	// Calculate summary statistics for filtered data
	const summary = {
		totalAmount: filteredPayments.reduce((sum, p) => sum + p.amount, 0),
		totalCount: filteredPayments.length,
		averageAmount:
			filteredPayments.length > 0
				? filteredPayments.reduce((sum, p) => sum + p.amount, 0) /
					filteredPayments.length
				: 0,
		paymentsByType: filteredPayments.reduce(
			(acc, p) => {
				acc[p.type] = (acc[p.type] || 0) + 1
				return acc
			},
			{} as Record<string, number>
		),
		paymentsByProperty: filteredPayments.reduce(
			(acc, p) => {
				const lease = Array.isArray(p.lease) ? p.lease[0] : p.lease
				const unit = Array.isArray(lease?.unit)
					? lease.unit[0]
					: lease?.unit
				const property = Array.isArray(unit?.property)
					? unit.property[0]
					: unit?.property
				const propertyName = property?.name || 'Unknown'
				acc[propertyName] = (acc[propertyName] || 0) + p.amount
				return acc
			},
			{} as Record<string, number>
		)
	}

	const handleExportCSV = () => {
		const headers = [
			'Date',
			'Property',
			'Unit',
			'Tenant',
			'Type',
			'Amount',
			'Status',
			'Notes'
		]
		const csvData = filteredPayments.map(payment => {
			const lease = Array.isArray(payment.lease)
				? payment.lease[0]
				: payment.lease
			const unit = Array.isArray(lease?.unit)
				? lease.unit[0]
				: lease?.unit
			const property = Array.isArray(unit?.property)
				? unit.property[0]
				: unit?.property
			const tenant = Array.isArray(lease?.tenant)
				? lease.tenant[0]
				: lease?.tenant

			return [
				format(new Date(payment.date), 'yyyy-MM-dd'),
				property?.name || 'N/A',
				unit?.unitNumber || 'N/A',
				tenant?.name || 'N/A',
				payment.type,
				payment.amount,
				payment.status,
				payment.notes || ''
			]
		})

		const csvContent = [headers, ...csvData]
			.map(row => row.map(cell => `"${cell}"`).join(','))
			.join('\n')

		const blob = new Blob([csvContent], { type: 'text/csv' })
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = `payment-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
		link.click()
		window.URL.revokeObjectURL(url)
	}

	const getPaymentTypeIcon = (type: PaymentType) => {
		switch (type) {
			case 'RENT':
				return <Building className="h-4 w-4" />
			case 'DEPOSIT':
				return <Target className="h-4 w-4" />
			case 'LATE_FEE':
				return <AlertTriangle className="h-4 w-4" />
			default:
				return <Receipt className="h-4 w-4" />
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status.toLowerCase()) {
			case 'completed':
				return <CheckCircle className="h-4 w-4 text-green-600" />
			case 'pending':
				return <Clock className="h-4 w-4 text-yellow-600" />
			default:
				return <AlertTriangle className="h-4 w-4 text-red-600" />
		}
	}

	if (paymentsLoading) {
		return (
			<Card className={className}>
				<CardContent className="flex h-64 items-center justify-center">
					<div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Payment Reports
						</CardTitle>
						<CardDescription>
							Generate detailed payment reports with filtering and
							export options
						</CardDescription>
					</div>
					<Button
						onClick={handleExportCSV}
						variant="outline"
						size="sm"
					>
						<Download className="mr-2 h-4 w-4" />
						Export CSV
					</Button>
				</div>
			</CardHeader>

			<CardContent className="space-y-6">
				{/* Filters */}
				<div className="bg-muted/50 flex flex-wrap gap-4 rounded-lg p-4">
					<div className="flex items-center gap-2">
						<Filter className="text-muted-foreground h-4 w-4" />
						<span className="text-sm font-medium">Filters:</span>
					</div>

					<Select
						value={filters.dateRange}
						onValueChange={(
							value:
								| 'current-month'
								| 'last-month'
								| 'quarter'
								| 'year'
								| 'all-time'
						) =>
							setFilters(prev => ({ ...prev, dateRange: value }))
						}
					>
						<SelectTrigger className="w-40">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="current-month">
								Current Month
							</SelectItem>
							<SelectItem value="last-month">
								Last Month
							</SelectItem>
							<SelectItem value="quarter">
								This Quarter
							</SelectItem>
							<SelectItem value="year">This Year</SelectItem>
							<SelectItem value="all-time">All Time</SelectItem>
						</SelectContent>
					</Select>

					<Select
						value={filters.paymentType}
						onValueChange={(value: PaymentType | 'all') =>
							setFilters(prev => ({
								...prev,
								paymentType: value
							}))
						}
					>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							<SelectItem value="RENT">Rent</SelectItem>
							<SelectItem value="DEPOSIT">Deposit</SelectItem>
							<SelectItem value="LATE_FEE">Late Fee</SelectItem>
							<SelectItem value="MAINTENANCE">
								Maintenance
							</SelectItem>
							<SelectItem value="OTHER">Other</SelectItem>
						</SelectContent>
					</Select>

					{!propertyId && (
						<Select
							value={filters.propertyId}
							onValueChange={(value: string) =>
								setFilters(prev => ({
									...prev,
									propertyId: value
								}))
							}
						>
							<SelectTrigger className="w-48">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">
									All Properties
								</SelectItem>
								{properties.map(property => (
									<SelectItem
										key={property.id}
										value={property.id}
									>
										{property.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}

					<Select
						value={filters.status}
						onValueChange={(value: PaymentStatus | 'ALL') =>
							setFilters(prev => ({ ...prev, status: value }))
						}
					>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">All Status</SelectItem>
							<SelectItem value="COMPLETED">Completed</SelectItem>
							<SelectItem value="PENDING">Pending</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Summary Cards */}
				<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
					>
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2">
									<DollarSign className="h-5 w-5 text-green-600" />
									<div>
										<p className="text-muted-foreground text-sm">
											Total Amount
										</p>
										<p className="text-2xl font-bold">
											{formatCurrency(
												summary.totalAmount
											)}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
					>
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2">
									<Receipt className="h-5 w-5 text-blue-600" />
									<div>
										<p className="text-muted-foreground text-sm">
											Total Payments
										</p>
										<p className="text-2xl font-bold">
											{summary.totalCount}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
					>
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2">
									<TrendingUp className="h-5 w-5 text-purple-600" />
									<div>
										<p className="text-muted-foreground text-sm">
											Average Amount
										</p>
										<p className="text-2xl font-bold">
											{formatCurrency(
												summary.averageAmount,
												{ maximumFractionDigits: 0 }
											)}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
					>
						<Card>
							<CardContent className="p-4">
								<div className="flex items-center gap-2">
									<Building className="h-5 w-5 text-orange-600" />
									<div>
										<p className="text-muted-foreground text-sm">
											Properties
										</p>
										<p className="text-2xl font-bold">
											{
												Object.keys(
													summary.paymentsByProperty
												).length
											}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				</div>

				{/* Detailed Reports */}
				<Tabs defaultValue="payments" className="space-y-4">
					<TabsList>
						<TabsTrigger value="payments">
							Payment Details
						</TabsTrigger>
						<TabsTrigger value="summary">
							Summary by Type
						</TabsTrigger>
						<TabsTrigger value="properties">
							By Property
						</TabsTrigger>
					</TabsList>

					{/* Payment Details Tab */}
					<TabsContent value="payments">
						<Card>
							<CardHeader>
								<CardTitle>Payment Details</CardTitle>
								<CardDescription>
									Showing {filteredPayments.length} payments
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Date</TableHead>
											<TableHead>Property/Unit</TableHead>
											<TableHead>Tenant</TableHead>
											<TableHead>Type</TableHead>
											<TableHead className="text-right">
												Amount
											</TableHead>
											<TableHead>Status</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filteredPayments
											.slice(0, 50)
											.map(payment => {
												const lease = Array.isArray(
													payment.lease
												)
													? payment.lease[0]
													: payment.lease
												const unit = Array.isArray(
													lease?.unit
												)
													? lease.unit[0]
													: lease?.unit
												const property = Array.isArray(
													unit?.property
												)
													? unit.property[0]
													: unit?.property
												const tenant = Array.isArray(
													lease?.tenant
												)
													? lease.tenant[0]
													: lease?.tenant

												return (
													<TableRow key={payment.id}>
														<TableCell>
															{format(
																new Date(
																	payment.date
																),
																'MMM d, yyyy'
															)}
														</TableCell>
														<TableCell>
															<div>
																<div className="font-medium">
																	{property?.name ||
																		'N/A'}
																</div>
																<div className="text-muted-foreground text-sm">
																	Unit{' '}
																	{unit?.unitNumber ||
																		'N/A'}
																</div>
															</div>
														</TableCell>
														<TableCell>
															{tenant?.name ||
																'N/A'}
														</TableCell>
														<TableCell>
															<Badge
																variant="outline"
																className="flex w-fit items-center gap-1"
															>
																{getPaymentTypeIcon(
																	payment.type as PaymentType
																)}
																{payment.type.replace(
																	'_',
																	' '
																)}
															</Badge>
														</TableCell>
														<TableCell className="text-right font-medium">
															{formatCurrency(
																payment.amount
															)}
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-1">
																{getStatusIcon(
																	payment.status
																)}
																<span className="text-sm">
																	{
																		payment.status
																	}
																</span>
															</div>
														</TableCell>
													</TableRow>
												)
											})}
									</TableBody>
								</Table>
								{filteredPayments.length > 50 && (
									<div className="text-muted-foreground py-4 text-center text-sm">
										Showing first 50 of{' '}
										{filteredPayments.length} payments.
										Export CSV for full data.
									</div>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* Summary by Type Tab */}
					<TabsContent value="summary">
						<Card>
							<CardHeader>
								<CardTitle>Summary by Payment Type</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{Object.entries(summary.paymentsByType).map(
										([type, count]: [string, number]) => {
											const amount = filteredPayments
												.filter(p => p.type === type)
												.reduce(
													(sum, p) => sum + p.amount,
													0
												)

											return (
												<div
													key={type}
													className="flex items-center justify-between rounded-lg border p-4"
												>
													<div className="flex items-center gap-3">
														{getPaymentTypeIcon(
															type as PaymentType
														)}
														<div>
															<div className="font-medium">
																{type.replace(
																	'_',
																	' '
																)}
															</div>
															<div className="text-muted-foreground text-sm">
																{count} payments
															</div>
														</div>
													</div>
													<div className="text-right">
														<div className="font-bold">
															{formatCurrency(
																amount
															)}
														</div>
														<div className="text-muted-foreground text-sm">
															{(
																(amount /
																	summary.totalAmount) *
																100
															).toFixed(1)}
															%
														</div>
													</div>
												</div>
											)
										}
									)}
								</div>
							</CardContent>
						</Card>
					</TabsContent>

					{/* By Property Tab */}
					<TabsContent value="properties">
						<Card>
							<CardHeader>
								<CardTitle>Summary by Property</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{Object.entries(
										summary.paymentsByProperty
									).map(
										([propertyName, amount]: [
											string,
											number
										]) => {
											const count =
												filteredPayments.filter(p => {
													const lease = Array.isArray(
														p.lease
													)
														? p.lease[0]
														: p.lease
													const unit = Array.isArray(
														lease?.unit
													)
														? lease.unit[0]
														: lease?.unit
													const property =
														Array.isArray(
															unit?.property
														)
															? unit.property[0]
															: unit?.property
													return (
														property?.name ===
														propertyName
													)
												}).length

											return (
												<div
													key={propertyName}
													className="flex items-center justify-between rounded-lg border p-4"
												>
													<div className="flex items-center gap-3">
														<Building className="text-muted-foreground h-5 w-5" />
														<div>
															<div className="font-medium">
																{propertyName}
															</div>
															<div className="text-muted-foreground text-sm">
																{count} payments
															</div>
														</div>
													</div>
													<div className="text-right">
														<div className="font-bold">
															{formatCurrency(
																amount
															)}
														</div>
														<div className="text-muted-foreground text-sm">
															{(
																(amount /
																	summary.totalAmount) *
																100
															).toFixed(1)}
															%
														</div>
													</div>
												</div>
											)
										}
									)}
								</div>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	)
}
