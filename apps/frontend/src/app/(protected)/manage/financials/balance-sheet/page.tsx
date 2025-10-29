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
	TrendingUp,
	TrendingDown,
	DollarSign,
	CreditCard,
	Building,
	Users
} from 'lucide-react'
import { useState, useEffect } from 'react'

type FinancialLineItem = {
	name: string
	amount: number
	previous: number
}

// Mock data for balance sheet
const mockBalanceSheetData = {
	assets: {
		current: [
			{ name: 'Cash & Cash Equivalents', amount: 125000, previous: 110000 },
			{ name: 'Accounts Receivable', amount: 89000, previous: 95000 },
			{ name: 'Inventory', amount: 45000, previous: 42000 },
			{ name: 'Prepaid Expenses', amount: 12000, previous: 1000 }
		],
		nonCurrent: [
			{ name: 'Property, Plant & Equipment', amount: 450000, previous: 425000 },
			{ name: 'Investments', amount: 75000, previous: 700 },
			{ name: 'Intangible Assets', amount: 25000, previous: 28000 }
		]
	},
	liabilities: {
		current: [
			{ name: 'Accounts Payable', amount: 67000, previous: 62000 },
			{ name: 'Short-term Debt', amount: 35000, previous: 40000 },
			{ name: 'Accrued Expenses', amount: 18000, previous: 15000 }
		],
		nonCurrent: [
			{ name: 'Long-term Debt', amount: 200000, previous: 225000 },
			{ name: 'Deferred Tax Liability', amount: 2500, previous: 22000 }
		]
	},
	equity: [
		{ name: 'Common Stock', amount: 200000, previous: 2000 },
		{ name: 'Retained Earnings', amount: 182000, previous: 158000 }
	]
}

const BalanceSheetPage = () => {
	const [period, setPeriod] = useState('monthly')
	const [year, setYear] = useState('2024')
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		// Simulate loading data
		const timer = setTimeout(() => {
			setIsLoading(false)
		}, 1000)
		return () => clearTimeout(timer)
	}, [])

	const calculateTotal = (items: FinancialLineItem[]) => {
		return items.reduce((sum, item) => sum + item.amount, 0)
	}

	const calculateChange = (current: number, previous: number) => {
		const change = current - previous
		const percentage = previous ? (change / previous) * 100 : 0
		return { amount: change, percentage }
	}

	const renderSection = (
		title: string,
		items: FinancialLineItem[]
	) => (
		<div className="space-y-4">
			<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
			<div className="space-y-2">
				{items.map((item, index) => {
					const change = calculateChange(item.amount, item.previous)
					return (
						<div
							key={index}
							className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
						>
							<div className="flex-1">
								<div className="font-medium text-gray-900">{item.name}</div>
								<div className="text-sm text-gray-500">
									Previous: ${item.previous.toLocaleString()}
								</div>
							</div>
							<div className="text-right">
								<div className="font-semibold text-gray-900">
									${item.amount.toLocaleString()}
								</div>
								<div
									className={`text-sm flex items-center gap-1 ${
										change.amount >= 0 ? 'text-green-600' : 'text-red-600'
									}`}
								>
									{change.amount >= 0 ? (
										<TrendingUp className="w-3 h-3" />
									) : (
										<TrendingDown className="w-3 h-3" />
									)}
									{change.amount >= 0 ? '+' : ''}
									{change.amount.toLocaleString()} (
									{change.percentage.toFixed(1)}%)
								</div>
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)

	if (isLoading) {
		return (
			<div className="p-6 space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold">Balance Sheet</h1>
						<p className="text-gray-600">
							Financial position at a specific point in time
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

	const totalAssets = calculateTotal([
		...mockBalanceSheetData.assets.current,
		...mockBalanceSheetData.assets.nonCurrent
	])
	const totalLiabilities = calculateTotal([
		...mockBalanceSheetData.liabilities.current,
		...mockBalanceSheetData.liabilities.nonCurrent
	])
	const totalEquity = calculateTotal(mockBalanceSheetData.equity)

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Balance Sheet</h1>
					<p className="text-gray-600">
						Financial position at a specific point in time
					</p>
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
							<Label>Period</Label>
							<Select value={period} onValueChange={setPeriod}>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="monthly">Monthly</SelectItem>
									<SelectItem value="quarterly">Quarterly</SelectItem>
									<SelectItem value="yearly">Yearly</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-2">
							<Label>Year</Label>
							<Select value={year} onValueChange={setYear}>
								<SelectTrigger className="w-24">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="2024">2024</SelectItem>
									<SelectItem value="2023">2023</SelectItem>
									<SelectItem value="2022">2022</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-2">
							<Input placeholder="Search..." className="w-64" />
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
						<CardTitle className="text-sm font-medium">Total Assets</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							${totalAssets.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Liabilities
						</CardTitle>
						<CreditCard className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							${totalLiabilities.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Equity</CardTitle>
						<Building className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							${totalEquity.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
			</div>

			{/* Balance Sheet */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Assets */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<DollarSign className="w-5 h-5" />
							Assets
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{renderSection(
							'Current Assets',
							mockBalanceSheetData.assets.current
						)}
						<Separator />
						{renderSection(
							'Non-Current Assets',
							mockBalanceSheetData.assets.nonCurrent
						)}
						<Separator />
						<div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
							<div className="font-semibold">Total Assets</div>
							<div className="font-bold text-lg">
								${totalAssets.toLocaleString()}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Liabilities & Equity */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<CreditCard className="w-5 h-5" />
								Liabilities
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							{renderSection(
								'Current Liabilities',
								mockBalanceSheetData.liabilities.current
							)}
							<Separator />
							{renderSection(
								'Non-Current Liabilities',
								mockBalanceSheetData.liabilities.nonCurrent
							)}
							<Separator />
							<div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
								<div className="font-semibold">Total Liabilities</div>
								<div className="font-bold text-lg">
									${totalLiabilities.toLocaleString()}
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Users className="w-5 h-5" />
								Equity
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							{renderSection(
								"Shareholders' Equity",
								mockBalanceSheetData.equity
							)}
							<Separator />
							<div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
								<div className="font-semibold">Total Equity</div>
								<div className="font-bold text-lg">
									${totalEquity.toLocaleString()}
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Summary */}
			<Card>
				<CardHeader>
					<CardTitle>Financial Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="text-center p-4 bg-gray-50 rounded-lg">
							<div className="text-2xl font-bold text-blue-60">
								${totalAssets.toLocaleString()}
							</div>
							<div className="text-sm text-gray-600">Total Assets</div>
						</div>
						<div className="text-center p-4 bg-gray-50 rounded-lg">
							<div className="text-2xl font-bold text-red-60">
								${totalLiabilities.toLocaleString()}
							</div>
							<div className="text-sm text-gray-60">Total Liabilities</div>
						</div>
						<div className="text-center p-4 bg-gray-50 rounded-lg">
							<div className="text-2xl font-bold text-green-60">
								${totalEquity.toLocaleString()}
							</div>
							<div className="text-sm text-gray-600">Total Equity</div>
						</div>
					</div>
					<div className="mt-4 p-4 bg-blue-50 rounded-lg">
						<div className="text-sm text-gray-600">
							<strong>Balance Sheet Equation:</strong> Assets = Liabilities +
							Equity
						</div>
						<div className="text-sm text-gray-600 mt-1">
							${totalAssets.toLocaleString()} = $
							{totalLiabilities.toLocaleString()} + $
							{totalEquity.toLocaleString()}
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default BalanceSheetPage
