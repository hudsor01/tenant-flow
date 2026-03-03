'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { Download, TriangleAlert, Wrench } from 'lucide-react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'
import { formatMoney, safeFormatMoney } from '../reports-utils'

interface MaintenanceReportData {
	summary: {
		totalRequests: number
		openRequests: number
		totalCost: number
	}
	byStatus: Array<{
		status: string
		count: number
	}>
	monthlyCost: Array<{
		month: string
		cost: number
	}>
	vendorPerformance: Array<{
		vendorName: string
		jobs: number
		totalSpend: number
	}>
}

interface MaintenanceReportSectionProps {
	data: MaintenanceReportData | undefined
	isLoading: boolean
	isExporting: boolean
	onExport: () => void
}

export function MaintenanceReportSection({
	data,
	isLoading,
	isExporting,
	onExport
}: MaintenanceReportSectionProps) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="typography-h4 flex items-center gap-2">
						<Wrench className="size-5 text-primary" />
						Maintenance Reports
					</h2>
					<p className="text-muted-foreground">
						Work order summaries, costs, and vendor performance
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					disabled={!data || isExporting}
					onClick={onExport}
				>
					<Download className="size-4 mr-2" />
					Export PDF
				</Button>
			</div>

			{isLoading ? (
				<Skeleton className="h-72" />
			) : data ? (
				<>
					<div className="grid gap-4 md:grid-cols-3">
						<Card>
							<CardHeader>
								<CardDescription>Total Requests</CardDescription>
								<CardTitle className="text-2xl">
									{data.summary.totalRequests}
								</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader>
								<CardDescription>Open Requests</CardDescription>
								<CardTitle className="text-2xl">
									{data.summary.openRequests}
								</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader>
								<CardDescription>Total Cost</CardDescription>
								<CardTitle className="text-2xl">
									{formatMoney(data.summary.totalCost)}
								</CardTitle>
							</CardHeader>
						</Card>
					</div>

					<div className="grid gap-4 lg:grid-cols-2">
						<Card>
							<CardHeader>
								<CardTitle>Status Breakdown</CardTitle>
							</CardHeader>
							<CardContent className="h-64">
								<ResponsiveContainer width="100%" height="100%">
									<BarChart data={data.byStatus}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="status" />
										<YAxis />
										<Tooltip />
										<Bar dataKey="count" fill="var(--chart-4)" />
									</BarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Monthly Cost</CardTitle>
							</CardHeader>
							<CardContent className="h-64">
								<ResponsiveContainer width="100%" height="100%">
									<LineChart data={data.monthlyCost}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="month" />
										<YAxis />
										<Tooltip formatter={safeFormatMoney} />
										<Line
											type="monotone"
											dataKey="cost"
											stroke="var(--chart-4)"
											strokeWidth={2}
										/>
									</LineChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Vendor Performance</CardTitle>
							<CardDescription>Total spend by maintenance vendor</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							{data.vendorPerformance.length === 0 ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<TriangleAlert className="size-4" />
									No vendor spend recorded in this period.
								</div>
							) : (
								data.vendorPerformance.map(vendor => (
									<div
										key={vendor.vendorName}
										className="flex items-center justify-between rounded-sm border border-border px-3 py-2 text-sm"
									>
										<div>
											<div className="font-medium">{vendor.vendorName}</div>
											<div className="text-muted-foreground">
												{vendor.jobs} jobs
											</div>
										</div>
										<span>{formatMoney(vendor.totalSpend)}</span>
									</div>
								))
							)}
						</CardContent>
					</Card>
				</>
			) : null}
		</section>
	)
}
