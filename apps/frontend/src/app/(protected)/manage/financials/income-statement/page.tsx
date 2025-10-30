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
import {
	Search,
	Download,
	Upload,
	DollarSign,
	TrendingUp,
	TrendingDown
} from 'lucide-react'
import { useState } from 'react'

type FinancialLineItem = {
	name: string
	amount: number
	previous: number
}

type IncomeStatementData = {
	revenue: FinancialLineItem[]
	expenses: FinancialLineItem[]
	other: FinancialLineItem[]
}

const IncomeStatementPage = () => {
	const [period, setPeriod] = useState('monthly')
	const [year, setYear] = useState('2024')
	const [search, setSearch] = useState('')

	// Mock data for immediate rendering
	const data: IncomeStatementData = {
		revenue: [
			{ name: 'Sales', amount: 10000, previous: 9500 },
			{ name: 'Services', amount: 5000, previous: 4800 }
		],
		expenses: [
			{ name: 'Rent', amount: 2000, previous: 1900 },
			{ name: 'Utilities', amount: 500, previous: 450 }
		],
		other: [{ name: 'Interest Income', amount: 100, previous: 80 }]
	}

	const calculateTotal = (items: FinancialLineItem[]) => {
		return items.reduce((sum, item) => sum + item.amount, 0)
	}

	const calculateChange = (current: number, previous: number) => {
		const change = current - previous
		const percentage = previous !== 0 ? (change / previous) * 100 : 0
		return { amount: change, percentage }
	}

	const renderSection = (title: string, items: FinancialLineItem[]) => (
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

	const totalRevenue = calculateTotal(data.revenue)
	const totalExpenses = calculateTotal(data.expenses)
	const totalOther = calculateTotal(data.other)
	const netIncome = totalRevenue - totalExpenses + totalOther

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Income Statement</h1>
					<p className="text-gray-600">
						Revenue, expenses, and net income over a period
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
								<Input
									placeholder="Search..."
									className="w-64"
									value={search}
									onChange={e => setSearch(e.target.value)}
								/>
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
						<CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
						<DollarSign className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							${totalRevenue.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Expenses
						</CardTitle>
						<DollarSign className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">
							${totalExpenses.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Other Items</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							${totalOther.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Net Income</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div
							className={`text-2xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
						>
							{netIncome >= 0 ? '+' : ''}${netIncome.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Current period</p>
					</CardContent>
				</Card>
			</div>

			{/* Income Statement */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Revenue */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<DollarSign className="w-5 h-5 text-green-600" />
							Revenue
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						{renderSection('Revenue Sources', data.revenue)}
						<Separator />
						<div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
							<div className="font-semibold">Total Revenue</div>
							<div className="font-bold text-lg text-green-600">
								${totalRevenue.toLocaleString()}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Expenses & Other */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<DollarSign className="w-5 h-5 text-red-600" />
								Operating Expenses
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							{renderSection('Operating Expenses', data.expenses)}
							<Separator />
							<div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
								<div className="font-semibold">Total Operating Expenses</div>
								<div className="font-bold text-lg text-red-600">
									${totalExpenses.toLocaleString()}
								</div>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<DollarSign className="w-5 h-5 text-yellow-600" />
								Other Items
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							{renderSection('Other Items', data.other)}
							<Separator />
							<div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
								<div className="font-semibold">Total Other Items</div>
								<div className="font-bold text-lg text-yellow-600">
									${totalOther.toLocaleString()}
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Net Income Summary */}
			<Card>
				<CardHeader>
					<CardTitle>Net Income Summary</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="space-y-2">
							<div className="flex justify-between py-2 border-b">
								<span>Total Revenue</span>
								<span className="font-semibold text-green-600">
									${totalRevenue.toLocaleString()}
								</span>
							</div>
							<div className="flex justify-between py-2 border-b">
								<span>Total Operating Expenses</span>
								<span className="font-semibold text-red-600">
									-${totalExpenses.toLocaleString()}
								</span>
							</div>
							<div className="flex justify-between py-2 border-b">
								<span>Other Items</span>
								<span className="font-semibold">
									${totalOther.toLocaleString()}
								</span>
							</div>
						</div>
						<Separator />
						<div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
							<div className="text-lg font-semibold">Net Income</div>
							<div
								className={`text-xl font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}
							>
								{netIncome >= 0 ? '+' : ''}${netIncome.toLocaleString()}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default IncomeStatementPage
