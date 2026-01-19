'use client'

import { Button } from '#components/ui/button'
import {
	useFinancialReport,
	useMaintenanceReport,
	usePropertyReport,
	useTenantReport
} from '#hooks/api/use-reports'
import { apiRequestRaw } from '#lib/api-request'
import { BarChart3, FileText } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DateRangeSelector } from '#components/reports/sections/date-range-selector'
import { FinancialReportSection } from '#components/reports/sections/financial-report-section'
import { MaintenanceReportSection } from '#components/reports/sections/maintenance-report-section'
import { PropertyReportSection } from '#components/reports/sections/property-report-section'
import { TenantReportSection } from '#components/reports/sections/tenant-report-section'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { Download } from 'lucide-react'
import { getDefaultDateRange } from '#components/reports/reports-utils'

export default function ReportsPage() {
	const defaultRange = useMemo(() => getDefaultDateRange(), [])
	const [startDate, setStartDate] = useState(defaultRange.start)
	const [endDate, setEndDate] = useState(defaultRange.end)
	const [isExporting, setIsExporting] = useState<string | null>(null)

	const { data: financialReport, isLoading: financialLoading } =
		useFinancialReport(startDate, endDate)
	const { data: propertyReport, isLoading: propertyLoading } =
		usePropertyReport(startDate, endDate)
	const { data: tenantReport, isLoading: tenantLoading } = useTenantReport(
		startDate,
		endDate
	)
	const { data: maintenanceReport, isLoading: maintenanceLoading } =
		useMaintenanceReport(startDate, endDate)

	const hasAnyData =
		financialReport || propertyReport || tenantReport || maintenanceReport

	const handlePdfExport = async (
		reportKey: string,
		title: string,
		payload: unknown
	) => {
		setIsExporting(reportKey)
		try {
			const response = await apiRequestRaw('/api/v1/reports/export/pdf', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title,
					filename: `${reportKey}-${startDate}-${endDate}`,
					payload
				})
			})

			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const link = document.createElement('a')
			link.href = url
			link.download = `${reportKey}-${startDate}-${endDate}.pdf`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			setTimeout(() => window.URL.revokeObjectURL(url), 100)
			toast.success('Report exported')
		} catch {
			toast.error('Failed to export report')
		} finally {
			setIsExporting(null)
		}
	}

	const handleResetDateRange = () => {
		const range = getDefaultDateRange()
		setStartDate(range.start)
		setEndDate(range.end)
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">
						Reports & Analytics
					</h1>
					<p className="text-muted-foreground">
						Generate financial, property, tenant, and maintenance reports.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link href="/reports/analytics">
						<Button variant="outline" size="sm">
							<BarChart3 className="size-4 mr-2" />
							Analytics
						</Button>
					</Link>
					<Link href="/reports/generate">
						<Button size="sm">
							<FileText className="size-4 mr-2" />
							Generate Reports
						</Button>
					</Link>
				</div>
			</div>

			<div className="mx-auto max-w-400">
				<DateRangeSelector
					startDate={startDate}
					endDate={endDate}
					onStartDateChange={setStartDate}
					onEndDateChange={setEndDate}
					onReset={handleResetDateRange}
				/>

				{!hasAnyData ? (
					<Empty>
						<EmptyMedia className="bg-primary/10 text-primary size-16 rounded-sm mb-6 [&_svg]:size-8">
							<FileText />
						</EmptyMedia>
						<EmptyHeader>
							<EmptyTitle>No report data yet</EmptyTitle>
							<EmptyDescription>
								Once payments, leases, and maintenance activity are recorded,
								reports will populate here.
							</EmptyDescription>
						</EmptyHeader>
						<div className="flex items-center gap-3 mt-2">
							<Button asChild className="gap-2">
								<Link href="/reports/generate">
									<Download className="size-4" />
									Generate a report
								</Link>
							</Button>
						</div>
					</Empty>
				) : (
					<div className="flex flex-col gap-8">
						<FinancialReportSection
							data={financialReport}
							isLoading={financialLoading}
							isExporting={isExporting === 'financial'}
							onExport={() =>
								handlePdfExport('financial', 'Financial Report', financialReport)
							}
						/>

						<PropertyReportSection
							data={propertyReport}
							isLoading={propertyLoading}
							isExporting={isExporting === 'properties'}
							onExport={() =>
								handlePdfExport('properties', 'Property Report', propertyReport)
							}
						/>

						<TenantReportSection
							data={tenantReport}
							isLoading={tenantLoading}
							isExporting={isExporting === 'tenants'}
							onExport={() =>
								handlePdfExport('tenants', 'Tenant Report', tenantReport)
							}
						/>

						<MaintenanceReportSection
							data={maintenanceReport}
							isLoading={maintenanceLoading}
							isExporting={isExporting === 'maintenance'}
							onExport={() =>
								handlePdfExport(
									'maintenance',
									'Maintenance Report',
									maintenanceReport
								)
							}
						/>
					</div>
				)}
			</div>
		</div>
	)
}
