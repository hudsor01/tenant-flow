'use client'

import * as React from 'react'
import { format } from 'date-fns'
import {
	Receipt,
	Search,
	ChevronLeft,
	ChevronRight,
	TrendingUp,
	TrendingDown,
	Filter,
	X,
	Wrench,
	Building2,
	Calendar,
	DollarSign,
	Download,
	AlertTriangle
} from 'lucide-react'

import { Input } from '#components/ui/input'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import { NumberTicker } from '#components/ui/number-ticker'
import { BorderBeam } from '#components/ui/border-beam'
import {
	Stat,
	StatLabel,
	StatValue,
	StatIndicator,
	StatDescription
} from '#components/ui/stat'
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
import { Button } from '#components/ui/button'
import { useExpenses, type Expense } from '#hooks/api/use-financials'
import { useExpenseSummary } from '#hooks/api/use-financials'
import { formatCents } from '#lib/formatters/currency'

const EXPENSE_CATEGORIES = [
	{ value: 'all', label: 'All Categories' },
	{ value: 'maintenance', label: 'Maintenance' },
	{ value: 'utilities', label: 'Utilities' },
	{ value: 'insurance', label: 'Insurance' },
	{ value: 'taxes', label: 'Taxes' },
	{ value: 'management', label: 'Management' },
	{ value: 'other', label: 'Other' }
]

const categoryIcons: Record<string, React.ElementType> = {
	maintenance: Wrench,
	utilities: Building2,
	insurance: Receipt,
	taxes: DollarSign,
	management: Building2,
	other: Receipt
}

function getCategoryBadge(category: string) {
	const styles: Record<string, string> = {
		maintenance:
			'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
		utilities:
			'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
		insurance:
			'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
		taxes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
		management:
			'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
		other: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
	}

	const defaultStyle =
		'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
	const Icon = categoryIcons[category] ?? Receipt

	return (
		<span
			className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${styles[category] ?? defaultStyle}`}
		>
			<Icon className="w-3 h-3" />
			{category.charAt(0).toUpperCase() + category.slice(1)}
		</span>
	)
}

export default function ExpensesPage() {
	const [searchQuery, setSearchQuery] = React.useState('')
	const [categoryFilter, setCategoryFilter] = React.useState('all')
	const [currentPage, setCurrentPage] = React.useState(1)
	const itemsPerPage = 15

	const { data: expenses, isLoading, error, refetch } = useExpenses()
	const { data: summary, isLoading: summaryLoading } = useExpenseSummary()

	// Filter expenses
	const filteredExpenses = React.useMemo(() => {
		if (!expenses) return []
		return expenses.filter(expense => {
			if (categoryFilter !== 'all' && expense.category !== categoryFilter) {
				return false
			}
			if (searchQuery) {
				const query = searchQuery.toLowerCase()
				if (
					!expense.description?.toLowerCase().includes(query) &&
					!expense.vendor_name?.toLowerCase().includes(query) &&
					!expense.property_name?.toLowerCase().includes(query)
				) {
					return false
				}
			}
			return true
		})
	}, [expenses, categoryFilter, searchQuery])

	// Pagination
	const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)
	const paginatedExpenses = filteredExpenses.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	)

	// Reset page on filter change
	React.useEffect(() => {
		setCurrentPage(1)
	}, [searchQuery, categoryFilter])

	const clearFilters = () => {
		setSearchQuery('')
		setCategoryFilter('all')
	}

	// Stats from summary
	const totalExpenses = summary?.total_amount ?? 0
	const monthlyAvg = summary?.monthly_average ?? 0
	const yoyChange = summary?.year_over_year_change ?? null

	// Calculate maintenance vs other ratio
	const maintenanceTotal = React.useMemo(() => {
		if (!summary?.categories) return 0
		const maintenance = summary.categories.find(
			c => c.category === 'maintenance'
		)
		return maintenance?.amount ?? 0
	}, [summary])

	const maintenancePercent =
		totalExpenses > 0
			? ((maintenanceTotal / totalExpenses) * 100).toFixed(1)
			: '0'

	if (isLoading || summaryLoading) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				{/* Header skeleton */}
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-40 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-10 w-24" />
				</div>
				{/* Stats skeleton */}
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					{[1, 2, 3, 4].map(i => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
				{/* Content skeleton */}
				<Skeleton className="h-12 w-full mb-4 rounded-lg" />
				<div className="space-y-2">
					{[1, 2, 3, 4, 5].map(i => (
						<Skeleton key={i} className="h-14 rounded-lg" />
					))}
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="p-6 lg:p-8 bg-background min-h-full">
				<div className="max-w-md mx-auto text-center py-16">
					<div className="w-16 h-16 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-6">
						<AlertTriangle className="w-8 h-8 text-destructive" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						Failed to Load Expenses
					</h2>
					<p className="text-muted-foreground mb-6">
						{error instanceof Error ? error.message : 'An error occurred'}
					</p>
					<button
						onClick={() => void refetch()}
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						Try Again
					</button>
				</div>
			</div>
		)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<BlurFade delay={0.1} inView>
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<h1 className="typography-h1">Expenses</h1>
						<p className="text-muted-foreground">
							Track maintenance costs and operating expenses.
						</p>
					</div>
					<Button variant="outline">
						<Download className="w-4 h-4 mr-2" />
						Export CSV
					</Button>
				</div>
			</BlurFade>

			{/* Stats */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<BlurFade delay={0.15} inView>
					<Stat className="relative overflow-hidden">
						{totalExpenses > 0 && (
							<BorderBeam
								size={80}
								duration={10}
								colorFrom="var(--color-destructive)"
								colorTo="oklch(from var(--color-destructive) l c h / 0.3)"
							/>
						)}
						<StatLabel>Total Expenses</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-red-600 dark:text-red-400">
							<span className="text-lg">$</span>
							<NumberTicker
								value={Math.floor(totalExpenses / 100)}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="destructive">
							<TrendingDown />
						</StatIndicator>
						<StatDescription>year to date</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.2} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Monthly Average</StatLabel>
						<StatValue className="flex items-baseline gap-0.5">
							<span className="text-lg">$</span>
							<NumberTicker
								value={Math.floor(monthlyAvg / 100)}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="primary">
							<Calendar />
						</StatIndicator>
						<StatDescription>avg per month</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.25} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>Maintenance</StatLabel>
						<StatValue className="flex items-baseline gap-0.5 text-orange-600 dark:text-orange-400">
							<span className="text-lg">$</span>
							<NumberTicker
								value={Math.floor(maintenanceTotal / 100)}
								duration={1500}
							/>
						</StatValue>
						<StatIndicator variant="icon" color="warning">
							<Wrench />
						</StatIndicator>
						<StatDescription>{maintenancePercent}% of total</StatDescription>
					</Stat>
				</BlurFade>

				<BlurFade delay={0.3} inView>
					<Stat className="relative overflow-hidden">
						<StatLabel>YoY Change</StatLabel>
						<StatValue
							className={`flex items-baseline gap-0.5 ${yoyChange !== null && yoyChange > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
						>
							{yoyChange !== null ? (
								<>
									{yoyChange > 0 ? '+' : ''}
									{yoyChange.toFixed(1)}%
								</>
							) : (
								'--'
							)}
						</StatValue>
						<StatIndicator
							variant="icon"
							color={
								yoyChange !== null && yoyChange > 0 ? 'destructive' : 'success'
							}
						>
							{yoyChange !== null && yoyChange > 0 ? (
								<TrendingUp />
							) : (
								<TrendingDown />
							)}
						</StatIndicator>
						<StatDescription>vs last year</StatDescription>
					</Stat>
				</BlurFade>
			</div>

			{/* Category Breakdown */}
			{summary?.categories && summary.categories.length > 0 && (
				<BlurFade delay={0.35} inView>
					<div className="bg-card border border-border rounded-lg p-4 mb-6">
						<h3 className="text-sm font-medium text-foreground mb-3">
							Expense Breakdown
						</h3>
						<div className="flex flex-wrap gap-4">
							{summary.categories.map(cat => (
								<div key={cat.category} className="flex items-center gap-3">
									{getCategoryBadge(cat.category)}
									<span className="text-sm text-muted-foreground">
										{formatCents(cat.amount)} ({cat.percentage.toFixed(1)}%)
									</span>
								</div>
							))}
						</div>
					</div>
				</BlurFade>
			)}

			{/* Table */}
			<BlurFade delay={0.4} inView>
				<div className="bg-card border border-border rounded-lg overflow-hidden">
					{/* Toolbar */}
					<div className="px-4 py-3 border-b border-border flex flex-col sm:flex-row items-start sm:items-center gap-3">
						{/* Search */}
						<div className="relative w-full sm:w-64">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								placeholder="Search expenses..."
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
								className="pl-9 h-9"
							/>
						</div>

						{/* Filters */}
						<div className="flex items-center gap-3 sm:ml-auto w-full sm:w-auto">
							{(searchQuery || categoryFilter !== 'all') && (
								<button
									onClick={clearFilters}
									className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
								>
									<X className="h-3 w-3" />
									Clear
								</button>
							)}
							<Select value={categoryFilter} onValueChange={setCategoryFilter}>
								<SelectTrigger className="w-[150px] h-9">
									<Filter className="w-4 h-4 mr-2" />
									<SelectValue placeholder="Category" />
								</SelectTrigger>
								<SelectContent>
									{EXPENSE_CATEGORIES.map(cat => (
										<SelectItem key={cat.value} value={cat.value}>
											{cat.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<span className="text-sm text-muted-foreground whitespace-nowrap">
								{filteredExpenses.length} expense
								{filteredExpenses.length !== 1 ? 's' : ''}
							</span>
						</div>
					</div>

					{/* Table */}
					<Table>
						<TableHeader className="bg-muted/50">
							<TableRow className="hover:bg-transparent">
								<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Date
								</TableHead>
								<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Description
								</TableHead>
								<TableHead className="hidden md:table-cell text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Property
								</TableHead>
								<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Category
								</TableHead>
								<TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">
									Amount
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{paginatedExpenses.map((expense: Expense) => (
								<TableRow key={expense.id}>
									<TableCell className="text-sm">
										{expense.expense_date
											? format(new Date(expense.expense_date), 'MMM d, yyyy')
											: '--'}
									</TableCell>
									<TableCell>
										<div>
											<p className="font-medium text-foreground text-sm">
												{expense.description || 'Expense'}
											</p>
											{expense.vendor_name && (
												<p className="text-xs text-muted-foreground">
													{expense.vendor_name}
												</p>
											)}
										</div>
									</TableCell>
									<TableCell className="hidden md:table-cell text-sm text-muted-foreground">
										{expense.property_name || '--'}
									</TableCell>
									<TableCell>
										{getCategoryBadge(expense.category ?? 'other')}
									</TableCell>
									<TableCell className="text-right tabular-nums font-medium text-foreground">
										{formatCents(expense.amount ?? 0)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>

					{/* Empty state */}
					{filteredExpenses.length === 0 && (expenses?.length ?? 0) > 0 && (
						<div className="text-center py-12">
							<p className="text-muted-foreground">
								No expenses match your filters
							</p>
							<button
								onClick={clearFilters}
								className="mt-3 text-sm text-primary hover:underline"
							>
								Clear filters
							</button>
						</div>
					)}

					{(expenses?.length ?? 0) === 0 && (
						<div className="text-center py-12">
							<div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6">
								<Receipt className="w-8 h-8 text-primary" />
							</div>
							<h2 className="text-xl font-semibold text-foreground mb-3">
								No expenses yet
							</h2>
							<p className="text-muted-foreground">
								Expenses from maintenance requests will appear here.
							</p>
						</div>
					)}

					{/* Pagination */}
					{filteredExpenses.length > 0 && totalPages > 1 && (
						<div className="px-4 py-3 border-t border-border flex items-center justify-between">
							<span className="text-sm text-muted-foreground">
								Showing {(currentPage - 1) * itemsPerPage + 1}
								{' - '}
								{Math.min(
									currentPage * itemsPerPage,
									filteredExpenses.length
								)}{' '}
								of {filteredExpenses.length}
							</span>
							<div className="flex items-center gap-1">
								<button
									onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
									disabled={currentPage === 1}
									className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
									aria-label="Previous page"
								>
									<ChevronLeft className="w-4 h-4" />
								</button>
								{Array.from(
									{ length: Math.min(totalPages, 5) },
									(_, i) => i + 1
								).map(page => (
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
									onClick={() =>
										setCurrentPage(p => Math.min(totalPages, p + 1))
									}
									disabled={currentPage === totalPages}
									className="p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
									aria-label="Next page"
								>
									<ChevronRight className="w-4 h-4" />
								</button>
							</div>
						</div>
					)}
				</div>
			</BlurFade>
		</div>
	)
}
