import { Suspense } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageTracker } from '@/components/analytics/page-tracker'
import type { Metadata } from 'next/types'

export const metadata: Metadata = {
	title: 'Reports | TenantFlow',
	description: 'Analytics and reports for your property portfolio'
}

function ReportsHeader() {
	return (
		<div className="space-y-1">
			<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
				Reports
			</h1>
			<p className="text-muted-foreground">
				Analytics and insights for your property portfolio
			</p>
		</div>
	)
}

function ReportsGrid() {
	const reports = [
		{
			title: 'Financial Summary',
			description: 'Revenue, expenses, and profit analysis',
			icon: 'i-lucide-dollar-sign',
			period: 'Monthly',
			lastGenerated: '2 hours ago',
			color: 'text-green-600',
			bgColor: 'bg-green-50'
		},
		{
			title: 'Occupancy Report',
			description: 'Occupancy rates and vacancy analysis',
			icon: 'i-lucide-building',
			period: 'Weekly',
			lastGenerated: '1 day ago',
			color: 'text-primary',
			bgColor: 'bg-blue-50'
		},
		{
			title: 'Tenant Activity',
			description: 'Tenant communications and interactions',
			icon: 'i-lucide-users',
			period: 'Daily',
			lastGenerated: '4 hours ago',
			color: 'text-purple-600',
			bgColor: 'bg-purple-50'
		},
		{
			title: 'Maintenance Report',
			description: 'Maintenance costs and completion rates',
			icon: 'i-lucide-bar-chart-3',
			period: 'Monthly',
			lastGenerated: '6 hours ago',
			color: 'text-orange-600',
			bgColor: 'bg-orange-50'
		}
	]

	return (
		<div className="grid gap-6 md:grid-cols-2">
			{reports.map(report => {
				return (
					<Card
						key={report.title}
						className="transition-all hover:scale-[1.02] hover:shadow-lg"
					>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div
									className={`rounded-lg p-3 ${report.bgColor}`}
								>
									<i
										className={`${report.icon} h-6 w-6 inline-block ${report.color}`}
									/>
								</div>
								<Badge variant="secondary">
									{report.period}
								</Badge>
							</div>
							<CardTitle className="text-lg">
								{report.title}
							</CardTitle>
							<CardDescription>
								{report.description}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<p className="text-muted-foreground text-sm">
										Last generated: {report.lastGenerated}
									</p>
								</div>
								<div className="flex gap-2">
									<Button size="sm" variant="outline">
										<i className="i-lucide-bar-chart-3 inline-block mr-2 h-4 w-4"  />
										View
									</Button>
									<Button size="sm" variant="outline">
										<i className="i-lucide-download inline-block h-4 w-4"  />
									</Button>
								</div>
							</div>
						</CardContent>
					</Card>
				)
			})}
		</div>
	)
}

function QuickStats() {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<i className="i-lucide-trending-up inline-block h-5 w-5"  />
					Quick Stats
				</CardTitle>
				<CardDescription>Key metrics for this month</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid gap-4 md:grid-cols-4">
					<div className="text-center">
						<div className="text-2xl font-bold text-green-600">
							$12,450
						</div>
						<p className="text-muted-foreground text-sm">
							Total Revenue
						</p>
					</div>
					<div className="text-center">
						<div className="text-primary text-2xl font-bold">
							94%
						</div>
						<p className="text-muted-foreground text-sm">
							Occupancy Rate
						</p>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-purple-600">
							28
						</div>
						<p className="text-muted-foreground text-sm">
							Active Tenants
						</p>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-orange-600">
							$2,100
						</div>
						<p className="text-muted-foreground text-sm">
							Maintenance Costs
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

function RecentReports() {
	const recentReports = [
		{
			name: 'December Financial Summary',
			type: 'Financial',
			date: '2024-01-05',
			size: '2.4 MB'
		},
		{
			name: 'Q4 Occupancy Analysis',
			type: 'Occupancy',
			date: '2024-01-02',
			size: '1.8 MB'
		},
		{
			name: 'Year-End Tax Report',
			type: 'Tax',
			date: '2023-12-31',
			size: '3.1 MB'
		}
	]

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Recent Reports</CardTitle>
						<CardDescription>
							Previously generated reports
						</CardDescription>
					</div>
					<Button size="sm" variant="outline">
						View All
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{recentReports.map((report, index) => (
						<div
							key={index}
							className="flex items-center justify-between rounded-lg border p-3"
						>
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 rounded-lg p-2">
									<i className="i-lucide-file-text inline-block text-primary h-4 w-4"  />
								</div>
								<div className="space-y-1">
									<p className="font-medium">{report.name}</p>
									<div className="text-muted-foreground flex items-center gap-2 text-sm">
										<Badge
											variant="secondary"
											className="text-xs"
										>
											{report.type}
										</Badge>
										<span>•</span>
										<span>{report.date}</span>
										<span>•</span>
										<span>{report.size}</span>
									</div>
								</div>
							</div>
							<Button size="sm" variant="ghost">
								<i className="i-lucide-download inline-block h-4 w-4"  />
							</Button>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

export default function ReportsPage() {
	return (
		<div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
			<PageTracker pageName="reports" />
			<ReportsHeader />

			<Suspense fallback={<Skeleton className="h-32 w-full" />}>
				<QuickStats />
			</Suspense>

			<Suspense
				fallback={
					<div className="grid gap-6 md:grid-cols-2">
						{[...Array(4)].map((_, i) => (
							<Skeleton key={i} className="h-48 w-full" />
						))}
					</div>
				}
			>
				<ReportsGrid />
			</Suspense>

			<Suspense fallback={<Skeleton className="h-64 w-full" />}>
				<RecentReports />
			</Suspense>
		</div>
	)
}
