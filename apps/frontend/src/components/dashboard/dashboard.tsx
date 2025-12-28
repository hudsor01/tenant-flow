'use client'

import * as React from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
	Building2,
	ChevronLeft,
	ChevronRight,
	FileText,
	LayoutGrid,
	List,
	Search,
	UserPlus,
	Wallet,
	Wrench
} from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Input } from '#components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '#components/ui/table'
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig
} from '#components/ui/chart'

// Types
export interface DashboardMetrics {
	totalRevenue: number
	revenueChange: number
	occupancyRate: number
	occupancyChange: number
	totalProperties: number
	totalUnits: number
	occupiedUnits: number
	activeLeases: number
	expiringLeases: number
	openMaintenanceRequests: number
	collectionRate: number
}

export interface RevenueTrendPoint {
	month: string
	revenue: number
	projected?: number
}

export interface PropertyPerformanceItem {
	id: string
	name: string
	address: string
	totalUnits: number
	occupiedUnits: number
	occupancyRate: number
	monthlyRevenue: number
	openMaintenance: number
}

export interface DashboardProps {
	metrics: DashboardMetrics
	revenueTrend: RevenueTrendPoint[]
	propertyPerformance: PropertyPerformanceItem[]
	onAddProperty?: () => void
	onCreateLease?: () => void
	onInviteTenant?: () => void
	onRecordPayment?: () => void
	onCreateMaintenanceRequest?: () => void
}

// Portfolio overview combines property data with related entities
type PortfolioRow = {
	id: string
	property: string
	address: string
	units: { occupied: number; total: number }
	tenant: string | null
	leaseStatus: 'active' | 'expiring' | 'vacant'
	leaseEnd: string | null
	rent: number
	maintenanceOpen: number
}

const chartConfig = {
	revenue: {
		label: 'Revenue',
		color: 'var(--color-chart-1)'
	}
} satisfies ChartConfig

function formatCurrency(cents: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(cents / 100)
}

const quickActions = [
	{
		title: 'Add Property',
		description: 'Register a new property',
		icon: Building2,
		action: 'addProperty'
	},
	{
		title: 'Create Lease',
		description: 'Draft a new lease agreement',
		icon: FileText,
		action: 'createLease'
	},
	{
		title: 'Invite Tenant',
		description: 'Send tenant invitation',
		icon: UserPlus,
		action: 'inviteTenant'
	},
	{
		title: 'Record Payment',
		description: 'Log a rent payment',
		icon: Wallet,
		action: 'recordPayment'
	},
	{
		title: 'New Request',
		description: 'Create maintenance request',
		icon: Wrench,
		action: 'createRequest'
	}
]

export function Dashboard({
	metrics,
	revenueTrend,
	propertyPerformance,
	onAddProperty,
	onCreateLease,
	onInviteTenant,
	onRecordPayment,
	onCreateMaintenanceRequest
}: DashboardProps) {
	// View & filter state
	const [viewMode, setViewMode] = React.useState<'table' | 'grid'>('table')
	const [searchQuery, setSearchQuery] = React.useState('')
	const [statusFilter, setStatusFilter] = React.useState<string>('all')
	const [sortField, setSortField] = React.useState<string>('property')
	const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>(
		'asc'
	)
	const [currentPage, setCurrentPage] = React.useState(1)
	const itemsPerPage = 10

	// Transform property performance into portfolio overview rows
	const portfolioData: PortfolioRow[] = propertyPerformance.map(prop => ({
		id: prop.id,
		property: prop.name,
		address: prop.address,
		units: { occupied: prop.occupiedUnits, total: prop.totalUnits },
		tenant: prop.occupiedUnits > 0 ? `${prop.occupiedUnits} tenants` : null,
		leaseStatus:
			prop.occupancyRate === 100
				? 'active'
				: prop.occupancyRate >= 80
					? 'expiring'
					: 'vacant',
		leaseEnd: null,
		rent: prop.monthlyRevenue,
		maintenanceOpen: prop.openMaintenance
	}))

	// Filter and sort data
	const filteredData = portfolioData
		.filter(row => {
			// Search filter
			if (searchQuery) {
				const query = searchQuery.toLowerCase()
				if (
					!row.property.toLowerCase().includes(query) &&
					!row.address.toLowerCase().includes(query)
				) {
					return false
				}
			}
			// Status filter
			if (statusFilter !== 'all' && row.leaseStatus !== statusFilter) {
				return false
			}
			return true
		})
		.sort((a, b) => {
			let comparison = 0
			switch (sortField) {
				case 'property':
					comparison = a.property.localeCompare(b.property)
					break
				case 'rent':
					comparison = a.rent - b.rent
					break
				case 'units':
					comparison = a.units.occupied - b.units.occupied
					break
				case 'status':
					comparison = a.leaseStatus.localeCompare(b.leaseStatus)
					break
			}
			return sortDirection === 'asc' ? comparison : -comparison
		})

	// Pagination
	const totalPages = Math.ceil(filteredData.length / itemsPerPage)
	const paginatedData = filteredData.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	)

	// Reset page when filters change
	React.useEffect(() => {
		setCurrentPage(1)
	}, [searchQuery, statusFilter])

	const handleSort = (field: string) => {
		if (sortField === field) {
			setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
		} else {
			setSortField(field)
			setSortDirection('asc')
		}
	}

	const handleAction = (action: string) => {
		switch (action) {
			case 'addProperty':
				onAddProperty?.()
				break
			case 'createLease':
				onCreateLease?.()
				break
			case 'inviteTenant':
				onInviteTenant?.()
				break
			case 'recordPayment':
				onRecordPayment?.()
				break
			case 'createRequest':
				onCreateMaintenanceRequest?.()
				break
		}
	}

	const clearFilters = () => {
		setSearchQuery('')
		setStatusFilter('all')
	}

	const SortIndicator = ({ field }: { field: string }) => {
		if (sortField !== field) return null
		return (
			<span className="ml-1 text-xs">
				{sortDirection === 'asc' ? '↑' : '↓'}
			</span>
		)
	}

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
				<p className="text-sm text-muted-foreground">
					{metrics.occupiedUnits} of {metrics.totalUnits} units occupied ·{' '}
					{formatCurrency(metrics.totalRevenue)} this month
				</p>
			</div>

			{/* Main Content: Chart (75%) + Quick Actions (25%) */}
			<div className="grid gap-6 lg:grid-cols-4">
				{/* Large Area Chart - 75% */}
				<Card className="lg:col-span-3">
					<CardHeader>
						<CardTitle>Revenue Overview</CardTitle>
						<CardDescription>
							Monthly revenue for the past 6 months
						</CardDescription>
					</CardHeader>
					<CardContent>
						<ChartContainer config={chartConfig} className="h-[400px] w-full">
							<AreaChart
								data={revenueTrend.map(point => ({
									month: point.month,
									revenue: point.revenue / 100
								}))}
								margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
							>
								<defs>
									<linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
										<stop
											offset="5%"
											stopColor="var(--color-revenue)"
											stopOpacity={0.8}
										/>
										<stop
											offset="95%"
											stopColor="var(--color-revenue)"
											stopOpacity={0.1}
										/>
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis
									dataKey="month"
									tickLine={false}
									axisLine={false}
									tickMargin={8}
								/>
								<YAxis
									tickLine={false}
									axisLine={false}
									tickMargin={8}
									tickFormatter={value => `$${(value / 1000).toFixed(0)}k`}
								/>
								<ChartTooltip
									cursor={false}
									content={
										<ChartTooltipContent
											labelFormatter={value => value}
											formatter={value => [
												`$${Number(value).toLocaleString()}`,
												'Revenue'
											]}
										/>
									}
								/>
								<Area
									dataKey="revenue"
									type="monotone"
									fill="url(#fillRevenue)"
									stroke="var(--color-revenue)"
									strokeWidth={2}
								/>
							</AreaChart>
						</ChartContainer>
					</CardContent>
				</Card>

				{/* Quick Actions - 25% */}
				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
						<CardDescription>Common tasks</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-3">
						{quickActions.map(action => (
							<button
								key={action.action}
								className="flex h-auto items-center gap-3 p-3 text-left border border-border rounded-lg hover:bg-muted/50 transition-colors"
								onClick={() => handleAction(action.action)}
							>
								<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
									<action.icon className="h-4 w-4" />
								</div>
								<div>
									<div className="text-sm font-medium">{action.title}</div>
									<div className="text-xs text-muted-foreground">
										{action.description}
									</div>
								</div>
							</button>
						))}
					</CardContent>
				</Card>
			</div>

			{/* Portfolio Overview - Standardized Table with Toolbar */}
			<div className="bg-card border border-border rounded-lg overflow-hidden">
				{/* Standardized Toolbar: Search LEFT, Filters + View Toggle RIGHT */}
				<div className="px-4 py-3 border-b border-border flex items-center gap-3">
					{/* LEFT: Search only */}
					<div className="relative w-64">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder="Search properties..."
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className="pl-9 h-9"
						/>
					</div>

					{/* RIGHT: Filters + View Toggle */}
					<div className="flex items-center gap-3 ml-auto">
						{(searchQuery || statusFilter !== 'all') && (
							<button
								onClick={clearFilters}
								className="text-sm text-muted-foreground hover:text-foreground"
							>
								Clear
							</button>
						)}

						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-[140px] h-9">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="expiring">Expiring</SelectItem>
								<SelectItem value="vacant">Vacant</SelectItem>
							</SelectContent>
						</Select>

						<div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
							<button
								onClick={() => setViewMode('grid')}
								className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
									viewMode === 'grid'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<LayoutGrid className="w-4 h-4" />
								Grid
							</button>
							<button
								onClick={() => setViewMode('table')}
								className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
									viewMode === 'table'
										? 'bg-background text-foreground shadow-sm'
										: 'text-muted-foreground hover:text-foreground'
								}`}
							>
								<List className="w-4 h-4" />
								Table
							</button>
						</div>
					</div>
				</div>

				{/* Content */}
				{viewMode === 'table' ? (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead
									className="cursor-pointer hover:bg-muted/50"
									onClick={() => handleSort('property')}
								>
									Property
									<SortIndicator field="property" />
								</TableHead>
								<TableHead
									className="cursor-pointer hover:bg-muted/50"
									onClick={() => handleSort('units')}
								>
									Units
									<SortIndicator field="units" />
								</TableHead>
								<TableHead>Tenants</TableHead>
								<TableHead
									className="cursor-pointer hover:bg-muted/50"
									onClick={() => handleSort('status')}
								>
									Lease Status
									<SortIndicator field="status" />
								</TableHead>
								<TableHead
									className="text-right cursor-pointer hover:bg-muted/50"
									onClick={() => handleSort('rent')}
								>
									Monthly Rent
									<SortIndicator field="rent" />
								</TableHead>
								<TableHead className="text-right">Maintenance</TableHead>
								<TableHead className="w-[100px]">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{paginatedData.map(row => (
								<TableRow key={row.id} className="group">
									<TableCell>
										<div>
											<div className="font-medium">{row.property}</div>
											<div className="text-xs text-muted-foreground">
												{row.address}
											</div>
										</div>
									</TableCell>
									<TableCell>
										<span className="tabular-nums">
											{row.units.occupied}/{row.units.total}
										</span>
										<span className="ml-1 text-xs text-muted-foreground">
											occupied
										</span>
									</TableCell>
									<TableCell>
										{row.tenant ? (
											<span className="text-sm">{row.tenant}</span>
										) : (
											<span className="text-sm text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell>
										<span
											className={
												row.leaseStatus === 'active'
													? 'text-sm font-medium text-foreground'
													: row.leaseStatus === 'expiring'
														? 'text-sm font-medium text-amber-600 dark:text-amber-500'
														: 'text-sm text-muted-foreground'
											}
										>
											{row.leaseStatus === 'active' && 'Active'}
											{row.leaseStatus === 'expiring' && 'Expiring Soon'}
											{row.leaseStatus === 'vacant' && 'Vacant'}
										</span>
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatCurrency(row.rent)}
									</TableCell>
									<TableCell className="text-right">
										{row.maintenanceOpen > 0 ? (
											<span className="text-sm font-medium tabular-nums text-red-600 dark:text-red-500">
												{row.maintenanceOpen} open
											</span>
										) : (
											<span className="text-sm text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
											<button className="p-1.5 text-muted-foreground hover:text-foreground rounded">
												Edit
											</button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				) : (
					/* Grid View */
					<div className="p-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{paginatedData.map(row => (
							<div
								key={row.id}
								className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors"
							>
								<div className="flex items-start justify-between mb-3">
									<div>
										<div className="font-medium">{row.property}</div>
										<div className="text-xs text-muted-foreground">
											{row.address}
										</div>
									</div>
									<span
										className={`text-xs font-medium px-2 py-0.5 rounded ${
											row.leaseStatus === 'active'
												? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
												: row.leaseStatus === 'expiring'
													? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
													: 'bg-muted text-muted-foreground'
										}`}
									>
										{row.leaseStatus === 'active' && 'Active'}
										{row.leaseStatus === 'expiring' && 'Expiring'}
										{row.leaseStatus === 'vacant' && 'Vacant'}
									</span>
								</div>
								<div className="grid grid-cols-2 gap-3 text-sm">
									<div>
										<div className="text-muted-foreground text-xs">Units</div>
										<div className="tabular-nums">
											{row.units.occupied}/{row.units.total}
										</div>
									</div>
									<div>
										<div className="text-muted-foreground text-xs">Rent</div>
										<div className="tabular-nums">
											{formatCurrency(row.rent)}
										</div>
									</div>
									<div>
										<div className="text-muted-foreground text-xs">Tenants</div>
										<div>{row.tenant || '—'}</div>
									</div>
									<div>
										<div className="text-muted-foreground text-xs">
											Maintenance
										</div>
										<div
											className={
												row.maintenanceOpen > 0
													? 'text-red-600 dark:text-red-500'
													: ''
											}
										>
											{row.maintenanceOpen > 0
												? `${row.maintenanceOpen} open`
												: '—'}
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
				)}

				{/* Pagination */}
				{filteredData.length > 0 && totalPages > 1 && (
					<div className="px-4 py-3 border-t border-border flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							Showing {(currentPage - 1) * itemsPerPage + 1}–
							{Math.min(currentPage * itemsPerPage, filteredData.length)} of{' '}
							{filteredData.length}
						</span>
						<div className="flex items-center gap-1">
							<button
								onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
								<button
									key={page}
									onClick={() => setCurrentPage(page)}
									className={`min-w-8 h-8 px-2 text-sm font-medium rounded-md transition-colors ${
										page === currentPage
											? 'bg-primary text-primary-foreground'
											: 'hover:bg-muted text-muted-foreground'
									}`}
								>
									{page}
								</button>
							))}
							<button
								onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}

				{/* No results */}
				{filteredData.length === 0 && portfolioData.length > 0 && (
					<div className="text-center py-12">
						<p className="text-muted-foreground">
							No properties match your filters
						</p>
						<button
							onClick={clearFilters}
							className="mt-3 text-sm text-primary hover:underline"
						>
							Clear filters
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
