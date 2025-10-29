'use client'

import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Button } from '#components/ui/button'
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
import { useState, useEffect } from 'react'
import { getTaxDocuments } from '#lib/api/financials-client'
import { useAuth } from '#providers/auth-provider'

type ExpenseCategory = {
	category: string
	amount: number
	deductible: boolean
	notes?: string
}

type PropertyDepreciation = {
	propertyId: string
	propertyName: string
	propertyValue: number
	annualDepreciation: number
	accumulatedDepreciation: number
	remainingBasis: number
}

type TaxData = {
	taxYear: number
	totals: {
		totalIncome: number
		totalDeductions: number
		netTaxableIncome: number
	}
	incomeBreakdown: {
		grossRentalIncome: number
		totalExpenses: number
		netOperatingIncome: number
		depreciation: number
		mortgageInterest: number
		taxableIncome: number
	}
	schedule: {
		scheduleE: {
			grossRentalIncome: number
			totalExpenses: number
			depreciation: number
			netIncome: number
		}
	}
	expenseCategories: ExpenseCategory[]
	propertyDepreciation: PropertyDepreciation[]
}

interface TaxDocumentsPageProps {
	initialYear?: number
}

const TaxDocumentsPage = ({
	initialYear = new Date().getFullYear()
}: TaxDocumentsPageProps) => {
	const [selectedYear, setSelectedYear] = useState(initialYear.toString())
	const [isLoading, setIsLoading] = useState(true)
	const [taxData, setTaxData] = useState<TaxData | null>(null)
	const [error, setError] = useState<string | null>(null)
	const { session } = useAuth()

	useEffect(() => {
		const fetchTaxDocuments = async () => {
			if (!session?.access_token) return

			try {
				setIsLoading(true)
				setError(null)

				const data = await getTaxDocuments(session.access_token, parseInt(selectedYear))
				setTaxData(data)
			} catch {
				setError('Failed to load tax documents. Please try again.')
			} finally {
				setIsLoading(false)
			}
		}

		fetchTaxDocuments()
	}, [session, selectedYear])

	const years = Array.from({ length: 5 }, (_, i) =>
		(new Date().getFullYear() - i).toString()
	)

	const renderExpenseCategories = () => {
		if (!taxData?.expenseCategories?.length) return null

		return (
			<div className="space-y-3">
				{taxData.expenseCategories.map((category, index) => (
					<div
						key={index}
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
				))}
			</div>
		)
	}

	const renderPropertyDepreciation = () => {
		if (!taxData?.propertyDepreciation?.length) return null

		return (
			<div className="space-y-3">
				{taxData.propertyDepreciation.map((property, index) => (
					<Card key={index} className="border border-gray-200">
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
				))}
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
					<Button variant="outline" size="sm">
						<Download className="w-4 h-4 mr-2" />
						Export
					</Button>
					<Button size="sm">
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
							<Input placeholder="Search documents..." className="w-64" />
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
				<Button size="lg">
					<Download className="w-4 h-4 mr-2" />
					Generate Tax Report
				</Button>
				<Button variant="outline" size="lg">
					<FileText className="w-4 h-4 mr-2" />
					View Detailed Breakdown
				</Button>
			</div>
		</div>
	)
}

export default TaxDocumentsPage
