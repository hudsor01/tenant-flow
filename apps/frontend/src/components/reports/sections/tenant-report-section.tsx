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
import { Download, Users } from 'lucide-react'
import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'
import { formatPercent, safeFormatPercent } from '../reports-utils'

interface TenantReportData {
	summary: {
		totalTenants: number
		activeLeases: number
		leasesExpiringNext90: number
		onTimePaymentRate: number
	}
	paymentHistory: Array<{
		month: string
		onTimeRate: number
	}>
	leaseExpirations: Array<{
		leaseId: string
		propertyName: string
		unitLabel: string
		endDate: string
	}>
}

interface TenantReportSectionProps {
	data: TenantReportData | undefined
	isLoading: boolean
	isExporting: boolean
	onExport: () => void
}

export function TenantReportSection({
	data,
	isLoading,
	isExporting,
	onExport
}: TenantReportSectionProps) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="typography-h4 flex items-center gap-2">
						<Users className="size-5 text-primary" />
						Tenant Reports
					</h2>
					<p className="text-muted-foreground">
						Payment history, lease expirations, and turnover analysis
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
					<div className="grid gap-4 md:grid-cols-4">
						<Card>
							<CardHeader>
								<CardDescription>Total Tenants</CardDescription>
								<CardTitle className="text-2xl">
									{data.summary.totalTenants}
								</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader>
								<CardDescription>Active Leases</CardDescription>
								<CardTitle className="text-2xl">
									{data.summary.activeLeases}
								</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader>
								<CardDescription>Expiring (90d)</CardDescription>
								<CardTitle className="text-2xl">
									{data.summary.leasesExpiringNext90}
								</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader>
								<CardDescription>On-time Payments</CardDescription>
								<CardTitle className="text-2xl">
									{formatPercent(data.summary.onTimePaymentRate)}
								</CardTitle>
							</CardHeader>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Payment History</CardTitle>
						</CardHeader>
						<CardContent className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={data.paymentHistory}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="month" />
									<YAxis />
									<Tooltip formatter={safeFormatPercent} />
									<Line
										type="monotone"
										dataKey="onTimeRate"
										stroke="var(--chart-1)"
										strokeWidth={2}
										name="On-time rate"
									/>
								</LineChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Upcoming Lease Expirations</CardTitle>
							<CardDescription>
								Next 90 days by property and unit
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							{data.leaseExpirations.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									No leases expiring in the next 90 days.
								</p>
							) : (
								data.leaseExpirations.map(expiration => (
									<div
										key={expiration.leaseId}
										className="flex items-center justify-between rounded-sm border border-border px-3 py-2 text-sm"
									>
										<div>
											<div className="font-medium">{expiration.propertyName}</div>
											<div className="text-muted-foreground">
												{expiration.unitLabel}
											</div>
										</div>
										<span>{expiration.endDate}</span>
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
