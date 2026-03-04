'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardHeader,
	CardDescription,
	CardTitle
} from '#components/ui/card'
import { Skeleton } from '#components/ui/skeleton'
import { Building2, Download } from 'lucide-react'
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts'
import { formatPercent, safeFormatPercent } from '../reports-utils'

interface PropertyReportData {
	summary: {
		totalProperties: number
		totalUnits: number
		occupancyRate: number
	}
	byProperty: Array<{
		propertyName: string
		occupancyRate: number
	}>
}

interface PropertyReportSectionProps {
	data: PropertyReportData | undefined
	isLoading: boolean
	isExporting: boolean
	onExport: () => void
}

export function PropertyReportSection({
	data,
	isLoading,
	isExporting,
	onExport
}: PropertyReportSectionProps) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="typography-h4 flex items-center gap-2">
						<Building2 className="size-5 text-primary" />
						Property Reports
					</h2>
					<p className="text-muted-foreground">
						Occupancy rates, vacancy analysis, and property performance
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
								<CardDescription>Properties</CardDescription>
								<CardTitle className="text-2xl">
									{data.summary.totalProperties}
								</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader>
								<CardDescription>Total Units</CardDescription>
								<CardTitle className="text-2xl">
									{data.summary.totalUnits}
								</CardTitle>
							</CardHeader>
						</Card>
						<Card>
							<CardHeader>
								<CardDescription>Occupancy</CardDescription>
								<CardTitle className="text-2xl">
									{formatPercent(data.summary.occupancyRate)}
								</CardTitle>
							</CardHeader>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Occupancy by Property</CardTitle>
						</CardHeader>
						<CardContent className="h-64">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={data.byProperty}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis dataKey="propertyName" />
									<YAxis />
									<Tooltip formatter={safeFormatPercent} />
									<Bar
										dataKey="occupancyRate"
										name="Occupancy"
										fill="var(--chart-2)"
									/>
								</BarChart>
							</ResponsiveContainer>
						</CardContent>
					</Card>
				</>
			) : null}
		</section>
	)
}
