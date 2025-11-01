'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '#components/ui/dialog'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { Separator } from '#components/ui/separator'
import { Skeleton } from '#components/ui/skeleton'
import {
	Search,
	Download,
	Upload,
	FileText,
	DollarSign,
	FileSpreadsheet,
	FileBarChart
} from 'lucide-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { taxDocumentsKeys, useTaxDocuments } from '#hooks/api/use-tax-documents'
import { handleMutationError, handleMutationSuccess } from '#lib/mutation-error-handler'
import type {
	TaxDocumentsData,
	TaxExpenseCategory,
	TaxPropertyDepreciation
} from '@repo/shared/types/financial-statements'
import { useAuth } from '#providers/auth-provider'

interface TaxDocumentsPageProps {
	initialYear?: number
}

const TaxDocumentsPage = ({
	initialYear = new Date().getFullYear()
}: TaxDocumentsPageProps) => {
	const { session } = useAuth()
	const queryClient = useQueryClient()
	const [selectedYear, setSelectedYear] = useState(initialYear.toString())
	const [searchQuery, setSearchQuery] = useState('')
	const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false)

	const {
		data: taxData,
		isLoading,
		error: queryError
	} = useTaxDocuments(parseInt(selectedYear, 10))
	const error = queryError
		? queryError instanceof Error
			? queryError.message
			: 'Failed to load tax documents'
		: null

	const years = Array.from({ length: 5 }, (_, i) =>
		(new Date().getFullYear() - i).toString()
	)

	// Handler for exporting tax documents
	const handleExport = async () => {
		if (!taxData) return
		try {
			const jsonData = JSON.stringify(taxData, null, 2)
			const blob = new Blob([jsonData], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `tax-documents-${selectedYear}.json`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		} catch (error) {
			handleMutationError(error, 'Export tax documents')
		}
	}

	// Handler for importing tax documents
	const handleImport = () => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.json'
		input.onchange = async e => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) return
			try {
				const text = await file.text()
				const data = JSON.parse(text)

				// Validate the data structure
				if (
					typeof data.taxYear !== 'number' ||
					!data.totals ||
					!data.incomeBreakdown
				) {
					throw new Error('Invalid tax data format')
				}

				if (!session?.access_token) {
					throw new Error('Authentication required')
				}

				const parsedData = data as TaxDocumentsData
				
				// Import tax documents via API
				const res = await fetch(
					'/api/v1/financials/tax-documents',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						credentials: 'include',
						body: JSON.stringify(parsedData)
					}
				)
				
				if (!res.ok) {
					throw new Error('Failed to import tax documents')
				}
				
				const importYear =
					typeof parsedData.taxYear === 'number'
						? parsedData.taxYear
						: parseInt(selectedYear, 10)

				await queryClient.invalidateQueries({
					queryKey: taxDocumentsKeys.byYear(importYear)
				})

				// Keep UI in sync with imported year
				setSelectedYear(importYear.toString())

				handleMutationSuccess('Import tax documents', `Imported tax documents for ${importYear}`)
			} catch (error) {
				handleMutationError(error, 'Import tax documents')
			}
		}
		input.click()
	}

	// Handler for generating tax report
	const handleGenerateTaxReport = async () => {
		try {
			if (!session?.user?.id || !session?.access_token) {
				handleMutationError(new Error('Authentication required'), 'Generate tax report')
				return
			}

			const taxYear = parseInt(selectedYear, 10)
			if (Number.isNaN(taxYear)) {
				handleMutationError(new Error('Invalid tax year selected'), 'Generate tax report')
				return
			}

			const startDate = `${taxYear}-01-01`
			const endDate = `${taxYear}-12-31`

			const res = await fetch(
				'/api/v1/reports/generate-tax-preparation',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					credentials: 'include',
					body: JSON.stringify({
						userId: session.user.id,
						startDate,
						endDate
					})
				}
			)

			if (!res.ok) {
				throw new Error('Failed to generate tax report')
			}

			handleMutationSuccess('Generate tax report', `Downloading tax preparation report for ${taxYear}`)
		} catch (error) {
			handleMutationError(error, 'Generate tax report')
		}
	}

	// Handler for viewing detailed breakdown
	const handleViewDetailedBreakdown = () => {
		try {
			setIsBreakdownModalOpen(true)
		} catch (error) {
			handleMutationError(error, 'Open detailed breakdown')
		}
	}

	const renderExpenseCategories = () => {
		if (!taxData?.expenseCategories?.length) return null

		// Filter expense categories based on search query
		const filteredCategories = taxData.expenseCategories.filter(
			(category: TaxExpenseCategory) => {
				if (!searchQuery.trim()) return true

				const query = searchQuery.toLowerCase().trim()
				const categoryName = (category.category || '').toLowerCase()
				const notes = (category.notes || '').toLowerCase()

				return categoryName.includes(query) || notes.includes(query)
			}
		)

		if (filteredCategories.length === 0) {
			return (
				<div className="text-center py-8 text-gray-500">
					No expense categories match your search.
				</div>
			)
		}

		return (
			<div className="space-y-3">
				{filteredCategories.map(
					(category: TaxExpenseCategory, index: number) => (
						<div
							key={category.category || `category-${index}`}
							className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
						>
							<div className="flex-1">
								<div className="font-medium text-gray-900">
									{category.category}
								</div>
								{category.notes && (
									<div className="text-sm text-gray-500">{category.notes}</div>
								)}
							</div>
							<div className="text-right">
								<div className="font-semibold text-gray-900">
									${category.amount.toLocaleString()}
								</div>
								<div
									className={`text-sm ${category.deductible ? 'text-green-600' : 'text-red-600'}`}
								>
									{category.deductible ? 'Deductible' : 'Not Deductible'}
								</div>
							</div>
						</div>
					)
				)}
			</div>
		)
	}

	const renderPropertyDepreciation = () => {
		if (!taxData?.propertyDepreciation?.length) return null

		// Filter property depreciation based on search query
		const filteredProperties = taxData.propertyDepreciation.filter(
			(property: TaxPropertyDepreciation) => {
				if (!searchQuery.trim()) return true

				const query = searchQuery.toLowerCase().trim()
				const propertyName = (property.propertyName || '').toLowerCase()
				const propertyId = (property.propertyId || '').toLowerCase()

				return propertyName.includes(query) || propertyId.includes(query)
			}
		)

		if (filteredProperties.length === 0) {
			return (
				<div className="text-center py-8 text-gray-500">
					No properties match your search.
				</div>
			)
		}

		return (
			<div className="space-y-3">
				{filteredProperties.map(
					(property: TaxPropertyDepreciation, index: number) => (
						<Card
							key={property.propertyId || `property-${index}`}
							className="border border-gray-200"
						>
							<CardContent className="p-4">
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<h4 className="font-semibold text-gray-900">
											{property.propertyName}
										</h4>
										<span className="text-sm text-gray-500">
											ID: {property.propertyId}
										</span>
									</div>

									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<div className="text-gray-500">Property Value</div>
											<div className="font-semibold">
												${property.propertyValue.toLocaleString()}
											</div>
										</div>
										<div>
											<div className="text-gray-500">Annual Depreciation</div>
											<div className="font-semibold text-green-600">
												${property.annualDepreciation.toLocaleString()}
											</div>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<div className="text-gray-500">
												Accumulated Depreciation
											</div>
											<div className="font-semibold">
												${property.accumulatedDepreciation.toLocaleString()}
											</div>
										</div>
										<div>
											<div className="text-gray-500">Remaining Basis</div>
											<div className="font-semibold">
												${property.remainingBasis.toLocaleString()}
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					)
				)}
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="p-6 space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Tax Documents</h1>
						<p className="text-gray-600">
							Tax preparation and filing documents
						</p>
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-10 w-24" />
						<Skeleton className="h-10 w-24" />
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{[1, 2, 3].map(i => (
						<Card key={i}>
							<CardHeader>
								<Skeleton className="h-6 w-32" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-full" />
								<Skeleton className="h-4 w-24 mt-2" />
							</CardContent>
						</Card>
					))}
				</div>

				<div className="space-y-4">
					{[1, 2, 3].map(i => (
						<div key={i}>
							<Skeleton className="h-6 w-48 mb-4" />
							<div className="space-y-2">
								{[1, 2, 3].map(j => (
									<div
										key={j}
										className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
									>
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-6 w-24" />
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		)
	}

	if (error) {
		return (
			<div className="p-6">
				<Card>
					<CardContent className="p-8 text-center">
						<div className="text-red-600 mb-4">
							<FileText className="w-12 h-12 mx-auto" />
						</div>
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							Error Loading Tax Documents
						</h3>
						<p className="text-gray-600 mb-4">{error}</p>
						<Button onClick={() => window.location.reload()}>Try Again</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!taxData) {
		return (
			<div className="p-6">
				<Card>
					<CardContent className="p-8 text-center">
						<div className="text-gray-400 mb-4">
							<FileText className="w-12 h-12 mx-auto" />
						</div>
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							No Tax Data Available
						</h3>
						<p className="text-gray-600">
							No tax documents found for the selected year.
						</p>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Tax Documents</h1>
					<p className="text-gray-600">Tax preparation and filing documents</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={handleExport}>
						<Download className="w-4 h-4 mr-2" />
						Export
					</Button>
					<Button size="sm" onClick={handleImport}>
						<Upload className="w-4 h-4 mr-2" />
						Import
					</Button>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardContent className="p-4">
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center gap-2">
							<Label>Tax Year</Label>
							<Select value={selectedYear} onValueChange={setSelectedYear}>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{years.map(year => (
										<SelectItem key={year} value={year}>
											{year}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-2">
							<Input
								placeholder="Search documents..."
								className="w-64"
								value={searchQuery}
								onChange={e => setSearchQuery(e.target.value)}
							/>
							<Button variant="outline" size="sm">
								<Search className="w-4 h-4" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Income</CardTitle>
						<DollarSign className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							${taxData.totals.totalIncome.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">
							Tax year {taxData.taxYear}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Deductions
						</CardTitle>
						<FileText className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">
							${taxData.totals.totalDeductions.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">
							Tax year {taxData.taxYear}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Net Taxable Income
						</CardTitle>
						<FileBarChart className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${taxData.totals.netTaxableIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
						>
							${Math.abs(taxData.totals.netTaxableIncome).toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">
							Tax year {taxData.taxYear}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Income Breakdown */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileBarChart className="w-5 h-5" />
						Income Breakdown
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="p-4 bg-gray-50 rounded-lg">
							<div className="text-sm text-gray-600">Gross Rental Income</div>
							<div className="text-xl font-bold">
								${taxData.incomeBreakdown.grossRentalIncome.toLocaleString()}
							</div>
						</div>
						<div className="p-4 bg-gray-50 rounded-lg">
							<div className="text-sm text-gray-600">Total Expenses</div>
							<div className="text-xl font-bold text-red-600">
								${taxData.incomeBreakdown.totalExpenses.toLocaleString()}
							</div>
						</div>
						<div className="p-4 bg-gray-50 rounded-lg">
							<div className="text-sm text-gray-600">Net Operating Income</div>
							<div className="text-xl font-bold">
								${taxData.incomeBreakdown.netOperatingIncome.toLocaleString()}
							</div>
						</div>
					</div>

					<Separator />

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="p-4 bg-blue-50 rounded-lg">
							<div className="text-sm text-gray-600">Depreciation</div>
							<div className="text-xl font-bold text-green-600">
								${taxData.incomeBreakdown.depreciation.toLocaleString()}
							</div>
						</div>
						<div className="p-4 bg-blue-50 rounded-lg">
							<div className="text-sm text-gray-600">Mortgage Interest</div>
							<div className="text-xl font-bold">
								${taxData.incomeBreakdown.mortgageInterest.toLocaleString()}
							</div>
						</div>
						<div className="p-4 bg-green-50 rounded-lg">
							<div className="text-sm text-gray-600">Taxable Income</div>
							<div className="text-xl font-bold text-green-600">
								${taxData.incomeBreakdown.taxableIncome.toLocaleString()}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Schedule E */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileSpreadsheet className="w-5 h-5" />
						Schedule E (Supplemental Income and Loss)
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<div className="p-4 bg-gray-50 rounded-lg">
								<div className="text-sm text-gray-600">Gross Rental Income</div>
								<div className="text-lg font-bold">
									$
									{taxData.schedule.scheduleE.grossRentalIncome.toLocaleString()}
								</div>
							</div>
							<div className="p-4 bg-gray-50 rounded-lg">
								<div className="text-sm text-gray-600">Total Expenses</div>
								<div className="text-lg font-bold text-red-600">
									${taxData.schedule.scheduleE.totalExpenses.toLocaleString()}
								</div>
							</div>
							<div className="p-4 bg-gray-50 rounded-lg">
								<div className="text-sm text-gray-600">Depreciation</div>
								<div className="text-lg font-bold text-green-600">
									${taxData.schedule.scheduleE.depreciation.toLocaleString()}
								</div>
							</div>
							<div className="p-4 bg-green-50 rounded-lg">
								<div className="text-sm text-gray-600">Net Income</div>
								<div className="text-lg font-bold text-green-600">
									${taxData.schedule.scheduleE.netIncome.toLocaleString()}
								</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Expense Categories */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileText className="w-5 h-5" />
						Expense Categories
					</CardTitle>
				</CardHeader>
				<CardContent>{renderExpenseCategories()}</CardContent>
			</Card>

			{/* Property Depreciation */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<FileBarChart className="w-5 h-5" />
						Property Depreciation
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{renderPropertyDepreciation()}
				</CardContent>
			</Card>

			{/* Action Buttons */}
			<div className="flex justify-center gap-4">
				<Button size="lg" onClick={handleGenerateTaxReport}>
					<Download className="w-4 h-4 mr-2" />
					Generate Tax Report
				</Button>
				<Button
					variant="outline"
					size="lg"
					onClick={handleViewDetailedBreakdown}
				>
					<FileText className="w-4 h-4 mr-2" />
					View Detailed Breakdown
				</Button>
			</div>

			<Dialog
				open={isBreakdownModalOpen}
				onOpenChange={setIsBreakdownModalOpen}
			>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Detailed Breakdown</DialogTitle>
						<DialogDescription>
							Tax year {taxData.taxYear}. Review income, expense, and deduction
							details.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-6">
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
							<div className="p-4 rounded-lg bg-gray-50">
								<div className="text-sm text-gray-600">Total Income</div>
								<div className="text-xl font-semibold text-green-600">
									${taxData.totals.totalIncome.toLocaleString()}
								</div>
							</div>
							<div className="p-4 rounded-lg bg-gray-50">
								<div className="text-sm text-gray-600">Total Deductions</div>
								<div className="text-xl font-semibold text-red-600">
									${taxData.totals.totalDeductions.toLocaleString()}
								</div>
							</div>
							<div className="p-4 rounded-lg bg-gray-50">
								<div className="text-sm text-gray-600">Net Taxable Income</div>
								<div
									className={`text-xl font-semibold ${taxData.totals.netTaxableIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
								>
									${Math.abs(taxData.totals.netTaxableIncome).toLocaleString()}
								</div>
							</div>
						</div>

						<div className="space-y-3">
							<h4 className="text-sm font-semibold text-gray-900">
								Income Breakdown
							</h4>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="p-3 rounded border border-gray-200">
									<div className="text-sm text-gray-600">
										Gross Rental Income
									</div>
									<div className="text-lg font-semibold">
										$
										{taxData.incomeBreakdown.grossRentalIncome.toLocaleString()}
									</div>
								</div>
								<div className="p-3 rounded border border-gray-200">
									<div className="text-sm text-gray-600">Total Expenses</div>
									<div className="text-lg font-semibold text-red-600">
										${taxData.incomeBreakdown.totalExpenses.toLocaleString()}
									</div>
								</div>
								<div className="p-3 rounded border border-gray-200">
									<div className="text-sm text-gray-600">
										Net Operating Income
									</div>
									<div className="text-lg font-semibold">
										$
										{taxData.incomeBreakdown.netOperatingIncome.toLocaleString()}
									</div>
								</div>
								<div className="p-3 rounded border border-gray-200">
									<div className="text-sm text-gray-600">Taxable Income</div>
									<div className="text-lg font-semibold text-green-600">
										${taxData.incomeBreakdown.taxableIncome.toLocaleString()}
									</div>
								</div>
							</div>
						</div>

						{taxData.expenseCategories?.length ? (
							<div className="space-y-3">
								<h4 className="text-sm font-semibold text-gray-900">
									Top Expense Categories
								</h4>
								<div className="max-h-64 overflow-y-auto space-y-2">
									{taxData.expenseCategories
										.sort((a, b) => b.amount - a.amount)
										.slice(0, 10)
										.map((category, index) => (
											<div
												key={category.category || `expense-${index}`}
												className="flex items-center justify-between rounded border border-gray-100 p-3"
											>
												<div>
													<div className="font-medium text-gray-900">
														{category.category || 'Uncategorized'}
													</div>
													{category.notes && (
														<div className="text-xs text-gray-500">
															{category.notes}
														</div>
													)}
												</div>
												<div className="text-right">
													<div className="font-semibold">
														${category.amount.toLocaleString()}
													</div>
													<div
														className={`text-xs ${category.deductible ? 'text-green-600' : 'text-red-600'}`}
													>
														{category.deductible
															? 'Deductible'
															: 'Not Deductible'}
													</div>
												</div>
											</div>
										))}
								</div>
							</div>
						) : null}
					</div>

					<DialogFooter>
						<Button
							variant="secondary"
							onClick={() => setIsBreakdownModalOpen(false)}
						>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export default TaxDocumentsPage
