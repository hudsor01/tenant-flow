'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, AlertTriangle } from 'lucide-react'
import { Skeleton } from '#components/ui/skeleton'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import { useExpenses, useExpenseSummary } from '#hooks/api/use-financials'
import { ExpenseStats } from './_components/expense-stats'
import { ExpenseCategoryBreakdown } from './_components/expense-category-breakdown'
import { ExpenseTable } from './_components/expense-table'

export default function ExpensesPage() {
	const [searchQuery, setSearchQuery] = useState('')
	const [categoryFilter, setCategoryFilter] = useState('all')
	const [currentPage, setCurrentPage] = useState(1)
	const itemsPerPage = 15

	const { data: expenses, isLoading, error, refetch } = useExpenses()
	const { data: summary, isLoading: summaryLoading } = useExpenseSummary()

	const filteredExpenses = useMemo(() => {
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

	const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)
	const paginatedExpenses = filteredExpenses.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	)

	useEffect(() => {
		setCurrentPage(1)
	}, [searchQuery, categoryFilter])

	const clearFilters = () => {
		setSearchQuery('')
		setCategoryFilter('all')
	}

	const totalExpenses = summary?.total_amount ?? 0
	const monthlyAvg = summary?.monthly_average ?? 0
	const yoyChange = summary?.year_over_year_change ?? null

	const maintenanceTotal = useMemo(() => {
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
				<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
					<div>
						<Skeleton className="h-8 w-40 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-10 w-24" />
				</div>
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					{[1, 2, 3, 4].map(i => (
						<Skeleton key={i} className="h-24 rounded-lg" />
					))}
				</div>
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

			<ExpenseStats
				totalExpenses={totalExpenses}
				monthlyAvg={monthlyAvg}
				maintenanceTotal={maintenanceTotal}
				maintenancePercent={maintenancePercent}
				yoyChange={yoyChange}
			/>

			{summary?.categories && (
				<ExpenseCategoryBreakdown categories={summary.categories} />
			)}

			<ExpenseTable
				expenses={expenses ?? []}
				filteredExpenses={filteredExpenses}
				paginatedExpenses={paginatedExpenses}
				searchQuery={searchQuery}
				categoryFilter={categoryFilter}
				currentPage={currentPage}
				totalPages={totalPages}
				itemsPerPage={itemsPerPage}
				onSearchChange={setSearchQuery}
				onCategoryChange={setCategoryFilter}
				onPageChange={setCurrentPage}
				onClearFilters={clearFilters}
			/>
		</div>
	)
}
