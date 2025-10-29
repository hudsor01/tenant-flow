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
	ArrowUp,
	ArrowDown
} from 'lucide-react'
import { useState, useEffect } from 'react'

type FinancialLineItem = {
	name: string
	amount: number
	previous: number
}

// Mock data for cash flow statement
const mockCashFlowData = {
	operating: [
		{ name: 'Net Income', amount: 125000, previous: 110000 },
		{ name: 'Depreciation', amount: 2500, previous: 22000 },
		{ name: 'Accounts Receivable Change', amount: -8000, previous: -5000 },
		{ name: 'Accounts Payable Change', amount: 12000, previous: 800 },
		{ name: 'Accrued Expenses Change', amount: 5000, previous: 3000 }
	],
	investing: [
		{ name: 'Property & Equipment', amount: -75000, previous: -50000 },
		{ name: 'Investment Purchases', amount: -25000, previous: -15000 },
		{ name: 'Asset Sales', amount: 15000, previous: 8000 }
	],
	financing: [
		{ name: 'Long-term Debt', amount: 50000, previous: 30000 },
		{ name: 'Dividends Paid', amount: -35000, previous: -30000 },
		{ name: 'Stock Issuance', amount: 25000, previous: 20000 }
	]
}

const CashFlowPage = () => {
	const [period, setPeriod] = useState('monthly')
	const [year, setYear] = useState('2024')
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		// Simulate loading data
		const timer = setTimeout(() => {
			setIsLoading(false)
		}, 100)
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
			<h3 className="text-lg font-semibold text-gray-90">{title}</h3>
			<div className="space-y-2">
				{items.map((item, index) => {
					const change = calculateChange(item.amount, item.previous)
					const isPositive = item.amount >= 0
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
								<div
									className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}
								>
									{isPositive ? '+' : ''}${item.amount.toLocaleString()}
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
						<h1 className="text-3xl font-bold">Cash Flow Statement</h1>
						<p className="text-gray-600">
							Cash inflows and outflows over a period
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

	const operatingTotal = calculateTotal(mockCashFlowData.operating)
	const investingTotal = calculateTotal(mockCashFlowData.investing)
	const financingTotal = calculateTotal(mockCashFlowData.financing)
	const netCashFlow = operatingTotal + investingTotal + financingTotal

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Cash Flow Statement</h1>
					<p className="text-gray-600">
						Cash inflows and outflows over a period
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
			<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Operating Cash Flow
						</CardTitle>
						<ArrowUp className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							${operatingTotal.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Investing Cash Flow
						</CardTitle>
						<ArrowDown className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">
							${investingTotal.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Financing Cash Flow
						</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							${financingTotal.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}
						>
							{netCashFlow >= 0 ? '+' : ''}${netCashFlow.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
			</div>

			{/* Cash Flow Statement */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Operating Activities */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ArrowUp className="w-5 h-5 text-green-600" />
							Operating Activities
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{renderSection(
							'Operating Activities',
							mockCashFlowData.operating
						)}
						<Separator />
						<div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
							<div className="font-semibold">Net Operating Cash Flow</div>
							<div className="font-bold text-lg text-green-60">
								+${operatingTotal.toLocaleString()}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Investing Activities */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ArrowDown className="w-5 h-5 text-red-600" />
							Investing Activities
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{renderSection(
							'Investing Activities',
							mockCashFlowData.investing
						)}
						<Separator />
						<div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
							<div className="font-semibold">Net Investing Cash Flow</div>
							<div className="font-bold text-lg text-red-60">
								${investingTotal.toLocaleString()}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Financing Activities */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<DollarSign className="w-5 h-5 text-blue-600" />
							Financing Activities
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{renderSection(
							'Financing Activities',
							mockCashFlowData.financing
						)}
						<Separator />
						<div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
							<div className="font-semibold">Net Financing Cash Flow</div>
							<div className="font-bold text-lg">
								${financingTotal.toLocaleString()}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Net Cash Flow Summary */}
			<Card>
				<CardHeader>
					<CardTitle>Net Cash Flow Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
							<div className="text-lg font-semibold">Net Cash Flow</div>
							<div
								className={`text-xl font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}
							>
								{netCashFlow >= 0 ? '+' : ''}${netCashFlow.toLocaleString()}
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
							<div className="text-center p-4 bg-green-50 rounded-lg">
								<div className="text-2xl font-bold text-green-600">
									+${operatingTotal.toLocaleString()}
								</div>
								<div className="text-sm text-gray-600">Operating</div>
							</div>
							<div className="text-center p-4 bg-red-50 rounded-lg">
								<div className="text-2xl font-bold text-red-600">
									${investingTotal.toLocaleString()}
								</div>
								<div className="text-sm text-gray-600">Investing</div>
							</div>
							<div className="text-center p-4 bg-blue-50 rounded-lg">
								<div className="text-2xl font-bold">
									${financingTotal.toLocaleString()}
								</div>
								<div className="text-sm text-gray-60">Financing</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default CashFlowPage
