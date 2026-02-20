'use client'

import { useState } from 'react'
import { useYearEndSummary, use1099Summary } from '#hooks/api/use-reports'
import { YearEndReportSection } from '#components/reports/sections/year-end-report-section'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'
import { FileText, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '#components/ui/button'
import { toast } from 'sonner'

function buildYearOptions(): number[] {
	const currentYear = new Date().getFullYear()
	const years: number[] = []
	for (let y = currentYear; y >= currentYear - 5; y--) {
		years.push(y)
	}
	return years
}

function downloadCsv(rows: Record<string, unknown>[], filename: string) {
	if (rows.length === 0) {
		toast.error('No data to download')
		return
	}
	const firstRow = rows[0]
	if (!firstRow) return
	const headers = Object.keys(firstRow)
	const csv = [
		headers.join(','),
		...rows.map(row =>
			headers
				.map(h => {
					const val = String(row[h] ?? '')
					return val.includes(',') ? `"${val}"` : val
				})
				.join(',')
		)
	].join('\n')

	const blob = new Blob([csv], { type: 'text/csv' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	setTimeout(() => URL.revokeObjectURL(url), 100)
}

export default function YearEndReportsPage() {
	const years = buildYearOptions()
	const [selectedYear, setSelectedYear] = useState<number>(years[0] ?? new Date().getFullYear())
	const [isExportingYearEnd, setIsExportingYearEnd] = useState(false)
	const [isExporting1099, setIsExporting1099] = useState(false)

	const { data: yearEndResponse, isLoading: isLoadingYearEnd } =
		useYearEndSummary(selectedYear)
	const { data: data1099Response, isLoading: isLoading1099 } =
		use1099Summary(selectedYear)

	const handleDownloadYearEndCsv = () => {
		if (!yearEndResponse) return
		setIsExportingYearEnd(true)
		try {
			const overviewRows = [
				{ section: 'Overview', item: 'Tax Year', value: String(yearEndResponse.year) },
				{
					section: 'Overview',
					item: 'Gross Rental Income',
					value: yearEndResponse.grossRentalIncome.toFixed(2)
				},
				{
					section: 'Overview',
					item: 'Operating Expenses',
					value: yearEndResponse.operatingExpenses.toFixed(2)
				},
				{
					section: 'Overview',
					item: 'Net Income',
					value: yearEndResponse.netIncome.toFixed(2)
				}
			]
			const propertyRows = yearEndResponse.byProperty.map(p => ({
				section: 'By Property',
				item: p.propertyName,
				income: p.income.toFixed(2),
				expenses: p.expenses.toFixed(2),
				net: p.netIncome.toFixed(2),
				value: ''
			}))
			const categoryRows = yearEndResponse.expenseByCategory.map(c => ({
				section: 'Expense Categories',
				item: c.category,
				value: c.amount.toFixed(2),
				income: '',
				expenses: '',
				net: ''
			}))
			downloadCsv(
				[...overviewRows, ...propertyRows, ...categoryRows],
				`year-end-${selectedYear}.csv`
			)
		} finally {
			setIsExportingYearEnd(false)
		}
	}

	const handleDownload1099Csv = () => {
		if (!data1099Response) return
		setIsExporting1099(true)
		try {
			if (data1099Response.recipients.length === 0) {
				downloadCsv(
					[
						{
							message: `No vendors met the $${data1099Response.threshold} 1099-NEC threshold for ${selectedYear}`
						}
					],
					`1099-${selectedYear}.csv`
				)
				return
			}
			const rows = data1099Response.recipients.map(r => ({
				vendor_name: r.vendorName,
				total_paid: r.totalPaid.toFixed(2),
				job_count: String(r.jobCount),
				year: String(selectedYear),
				threshold: String(data1099Response.threshold),
				requires_1099: 'Yes'
			}))
			downloadCsv(rows, `1099-${selectedYear}.csv`)
		} finally {
			setIsExporting1099(false)
		}
	}

	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
				<div className="flex items-center gap-3">
					<Link href="/reports">
						<Button variant="ghost" size="sm" className="gap-1.5 min-h-11">
							<ChevronLeft className="size-4" />
							Reports
						</Button>
					</Link>
					<div>
						<h1 className="text-2xl font-semibold flex items-center gap-2">
							<FileText className="size-6 text-primary" />
							Year-End Reports
						</h1>
						<p className="text-sm text-muted-foreground">
							Annual income, expenses, and 1099-NEC vendor data for tax preparation
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Select
						value={String(selectedYear)}
						onValueChange={v => setSelectedYear(parseInt(v, 10))}
					>
						<SelectTrigger className="w-32 h-11">
							<SelectValue placeholder="Year" />
						</SelectTrigger>
						<SelectContent>
							{years.map(y => (
								<SelectItem key={y} value={String(y)}>
									{y}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="max-w-5xl">
				<YearEndReportSection
					year={selectedYear}
					yearEndData={yearEndResponse}
					data1099={data1099Response}
					isLoadingYearEnd={isLoadingYearEnd}
					isLoading1099={isLoading1099}
					onDownloadYearEndCsv={handleDownloadYearEndCsv}
					onDownload1099Csv={handleDownload1099Csv}
					isExportingYearEnd={isExportingYearEnd}
					isExporting1099={isExporting1099}
				/>
			</div>
		</div>
	)
}
