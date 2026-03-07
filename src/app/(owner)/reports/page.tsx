'use client'

import { Button } from '#components/ui/button'
import {
	useFinancialReport,
	useMaintenanceReport,
	usePropertyReport,
	useTenantReport
} from '#hooks/api/use-reports'
import { callGeneratePdfFromHtml } from '#hooks/api/use-report-mutations'
import { BarChart3, FileText, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { DateRangeSelector } from '#components/reports/sections/date-range-selector'
import { ChartLoadingSkeleton } from '#components/shared/chart-loading-skeleton'

const FinancialReportSection = dynamic(
	() =>
		import('#components/reports/sections/financial-report-section').then(
			mod => mod.FinancialReportSection
		),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> }
)

const MaintenanceReportSection = dynamic(
	() =>
		import('#components/reports/sections/maintenance-report-section').then(
			mod => mod.MaintenanceReportSection
		),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> }
)

const PropertyReportSection = dynamic(
	() =>
		import('#components/reports/sections/property-report-section').then(
			mod => mod.PropertyReportSection
		),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> }
)

const TenantReportSection = dynamic(
	() =>
		import('#components/reports/sections/tenant-report-section').then(
			mod => mod.TenantReportSection
		),
	{ ssr: false, loading: () => <ChartLoadingSkeleton /> }
)
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle
} from '#components/ui/empty'
import { Download } from 'lucide-react'
import { getDefaultDateRange } from '#components/reports/reports-utils'

/* eslint-disable color-tokens/no-hex-colors -- PDF HTML content uses inline styles intentionally; not rendered by the browser */
function buildReportPdfHtml(
	title: string,
	startDate: string,
	endDate: string,
	payload: unknown
): string {
	const rows = payload !== null && typeof payload === 'object'
		? Object.entries(payload as Record<string, unknown>)
		: []
	const tableRows = rows
		.map(([key, value]) => {
			const displayValue = value === null || value === undefined
				? ''
				: typeof value === 'object'
					? JSON.stringify(value)
					: String(value)
			return `<tr><td style="border:1px solid #ccc;padding:6px 10px;font-weight:500">${key}</td><td style="border:1px solid #ccc;padding:6px 10px">${displayValue}</td></tr>`
		})
		.join('')
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
</head>
<body style="font-family:Arial,sans-serif;margin:32px;color:#222">
  <h1 style="font-size:20px;margin-bottom:4px">${title}</h1>
  <p style="color:#666;font-size:13px;margin-bottom:16px">Period: ${startDate} to ${endDate} &mdash; Generated: ${new Date().toLocaleDateString()}</p>
  <table style="border-collapse:collapse;width:100%;font-size:13px">
    <thead><tr>
      <th style="border:1px solid #ccc;padding:6px 10px;background:#f0f0f0;text-align:left">Metric</th>
      <th style="border:1px solid #ccc;padding:6px 10px;background:#f0f0f0;text-align:left">Value</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`
}
/* eslint-enable color-tokens/no-hex-colors */

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
			const filename = `${reportKey}-${startDate}-${endDate}.pdf`
			const html = buildReportPdfHtml(title, startDate, endDate, payload)
			await callGeneratePdfFromHtml(html, filename)
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
					<Link href="/reports/year-end">
						<Button variant="outline" size="sm">
							<Calendar className="size-4 mr-2" />
							Year-End
						</Button>
					</Link>
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
