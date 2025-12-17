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
	DollarSign,
	CreditCard,
	Building,
	Users
} from 'lucide-react'
import { useState } from 'react'
import { useBalanceSheet } from '#hooks/api/use-financial-statements'
import type { FinancialLineItem } from '@repo/shared/types/financial-statements'

const BalanceSheetPage = () => {
	const [year, setYear] = useState('2024')
	const [month, setMonth] = useState('12')

	// Calculate as-of date
	const asOfDate = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`
	const { data, isLoading, error } = useBalanceSheet(asOfDate)

	// Transform API data to UI format
	const transformedData = data?.data ? {
		assets: {
			current: [
				{ name: 'Cash', amount: data.data.assets.currentAssets.cash },
				{ name: 'Accounts Receivable', amount: data.data.assets.currentAssets.accountsReceivable },
				{ name: 'Security Deposits', amount: data.data.assets.currentAssets.security_deposits }
			],
			nonCurrent: [
				{ name: 'Property Values', amount: data.data.assets.fixedAssets.propertyValues },
				{ name: 'Accumulated Depreciation', amount: -data.data.assets.fixedAssets.accumulatedDepreciation },
				{ name: 'Net Property Value', amount: data.data.assets.fixedAssets.netPropertyValue }
			]
		},
		liabilities: {
			current: [
				{ name: 'Accounts Payable', amount: data.data.liabilities.currentLiabilities.accountsPayable },
				{ name: 'Security Deposit Liability', amount: data.data.liabilities.currentLiabilities.security_depositLiability },
				{ name: 'Accrued Expenses', amount: data.data.liabilities.currentLiabilities.accruedExpenses }
			],
			nonCurrent: [
				{ name: 'Mortgages Payable', amount: data.data.liabilities.longTermLiabilities.mortgagesPayable }
			]
		},
		equity: [
			{ name: 'Owner Capital', amount: data.data.equity.ownerCapital },
			{ name: 'Retained Earnings', amount: data.data.equity.retainedEarnings },
			{ name: 'Current Period Income', amount: data.data.equity.currentPeriodIncome }
		]
	} : null

	const renderSection = (title: string, items: FinancialLineItem[]) => (
		<div className="space-y-4">
			<h3 className="typography-large text-muted/900">{title}</h3>
			<div className="space-y-2">
				{items.map((item) => {
					return (
						<div
							key={item.name}
							className="flex-between p-3 bg-muted/50 rounded-lg"
						>
							<div className="flex-1">
								<div className="font-medium text-muted/900">{item.name}</div>
							</div>
							<div className="text-right">
								<div className="font-semibold text-muted/900">
									${Math.abs(item.amount).toLocaleString()}
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
				<div className="flex-between">
					<div>
						<h1 className="typography-h2">Balance Sheet</h1>
						<p className="text-muted/600">
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
										className="flex-between p-3 bg-muted/50 rounded-lg"
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
			<div className="p-6 space-y-6">
				<div className="flex-between">
					<div>
						<h1 className="typography-h2">Balance Sheet</h1>
						<p className="text-muted/600">
							Financial position at a specific point in time
						</p>
					</div>
				</div>
				<Card>
					<CardContent className="p-6">
						<div className="text-center">
							<p className="text-destructive">Failed to load balance sheet data. Please try again.</p>
						</div>
					</CardContent>
				</Card>
			</div>
		)
	}

	if (!transformedData) {
		return null
	}

	const totalAssets = data?.data?.assets.totalAssets || 0
	const totalLiabilities = data?.data?.liabilities.totalLiabilities || 0
	const totalEquity = data?.data?.equity.totalEquity || 0

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex-between">
				<div>
					<h1 className="typography-h2">Balance Sheet</h1>
					<p className="text-muted/600">
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
							<Label>As Of Date</Label>
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
							<Select value={month} onValueChange={setMonth}>
								<SelectTrigger className="w-32">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="01">January</SelectItem>
									<SelectItem value="02">February</SelectItem>
									<SelectItem value="03">March</SelectItem>
									<SelectItem value="04">April</SelectItem>
									<SelectItem value="05">May</SelectItem>
									<SelectItem value="06">June</SelectItem>
									<SelectItem value="07">July</SelectItem>
									<SelectItem value="08">August</SelectItem>
									<SelectItem value="09">September</SelectItem>
									<SelectItem value="10">October</SelectItem>
									<SelectItem value="11">November</SelectItem>
									<SelectItem value="12">December</SelectItem>
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
						<CardTitle className="typography-small">Total Assets</CardTitle>
						<DollarSign className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="typography-h3">
							${totalAssets.toLocaleString()}
						</div>
						<p className="text-caption">As of {asOfDate}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="typography-small">
							Total Liabilities
						</CardTitle>
						<CreditCard className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="typography-h3">
							${totalLiabilities.toLocaleString()}
						</div>
						<p className="text-caption">As of {asOfDate}</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="typography-small">Total Equity</CardTitle>
						<Building className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="typography-h3">
							${totalEquity.toLocaleString()}
						</div>
						<p className="text-caption">As of {asOfDate}</p>
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
							transformedData.assets.current
						)}
						<Separator />
						{renderSection(
							'Non-Current Assets',
							transformedData.assets.nonCurrent
						)}
						<Separator />
						<div className="flex-between p-3 bg-blue-50 rounded-lg">
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
								transformedData.liabilities.current
							)}
							<Separator />
							{renderSection(
								'Non-Current Liabilities',
								transformedData.liabilities.nonCurrent
							)}
							<Separator />
							<div className="flex-between p-3 bg-destructive/10 rounded-lg">
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
								"Owner's Equity",
								transformedData.equity
							)}
							<Separator />
							<div className="flex-between p-3 bg-success/10 rounded-lg">
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
						<div className="text-center p-4 bg-muted/50 rounded-lg">
							<div className="typography-h3 text-blue-600">
								${totalAssets.toLocaleString()}
							</div>
							<div className="text-sm text-muted/600">Total Assets</div>
						</div>
						<div className="text-center p-4 bg-muted/50 rounded-lg">
							<div className="typography-h3 text-destructive">
								${totalLiabilities.toLocaleString()}
							</div>
							<div className="text-sm text-muted/600">Total Liabilities</div>
						</div>
						<div className="text-center p-4 bg-muted/50 rounded-lg">
							<div className="typography-h3 text-success">
								${totalEquity.toLocaleString()}
							</div>
							<div className="text-sm text-muted/600">Total Equity</div>
						</div>
					</div>
					<div className="mt-4 p-4 bg-blue-50 rounded-lg">
						<div className="text-sm text-muted/600">
							<strong>Balance Sheet Equation:</strong> Assets = Liabilities +
							Equity
						</div>
						<div className="text-sm text-muted/600 mt-1">
							${totalAssets.toLocaleString()} = $
							{totalLiabilities.toLocaleString()} + $
							{totalEquity.toLocaleString()}
						</div>
						{data?.data?.balanceCheck === false && (
							<div className="mt-2 text-sm text-destructive">
								Warning: Balance sheet equation does not balance
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

export default BalanceSheetPage
