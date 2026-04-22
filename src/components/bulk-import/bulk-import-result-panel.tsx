'use client'

import {
	CheckCircle2,
	XCircle,
	AlertTriangle,
	PartyPopper,
	Download,
	RotateCcw
} from 'lucide-react'
import { Button } from '#components/ui/button'
import type { BulkImportResult, ParsedRow } from '#types/api-contracts'
import { cn } from '#lib/utils'
import {
	buildCsvTemplate,
	triggerCsvDownload
} from './parse-csv-with-schema'

interface ResultPanelProps {
	entityLabel: { singular: string; plural: string }
	result: BulkImportResult
	cumulative: { imported: number; failed: number; totalAttempted: number }
	retryCount: number
	parseResult:
		| { rows: ParsedRow<unknown>[]; tooManyRows: boolean; totalRowCount: number }
		| null
	onRetryFailed?: () => void
}

export function BulkImportResultPanel({
	entityLabel,
	result,
	cumulative,
	retryCount,
	parseResult,
	onRetryFailed
}: ResultPanelProps) {
	const isSuccess = result.success && result.imported > 0
	const hasPartialSuccess = result.imported > 0 && result.failed > 0

	const tone = isSuccess && !hasPartialSuccess
		? 'success'
		: hasPartialSuccess
			? 'warning'
			: 'destructive'

	return (
		<div
			className={cn(
				'card-standard p-6 space-y-4',
				tone === 'success' &&
					'bg-linear-to-r from-success/10 to-success/5 border-success/30',
				tone === 'warning' &&
					'bg-linear-to-r from-warning/10 to-warning/5 border-warning/30',
				tone === 'destructive' &&
					'bg-linear-to-r from-destructive/10 to-destructive/5 border-destructive/30'
			)}
		>
			<ResultHeader
				tone={tone}
				entityLabel={entityLabel}
				retryCount={retryCount}
			/>
			<ResultStats
				entityLabel={entityLabel}
				result={result}
				cumulative={cumulative}
				retryCount={retryCount}
			/>
			{result.errors.length > 0 && (
				<ResultErrorList
					errors={result.errors}
					parseResult={parseResult}
					{...(onRetryFailed ? { onRetryFailed } : {})}
				/>
			)}
		</div>
	)
}

function ResultHeader({
	tone,
	entityLabel,
	retryCount
}: {
	tone: 'success' | 'warning' | 'destructive'
	entityLabel: { singular: string; plural: string }
	retryCount: number
}) {
	const plural = entityLabel.plural.toLowerCase()
	return (
		<div className="flex items-start gap-4">
			<div
				className={cn(
					'icon-container-md border',
					tone === 'success' && 'bg-success/10 text-success border-success/20',
					tone === 'warning' && 'bg-warning/10 text-warning border-warning/20',
					tone === 'destructive' &&
						'bg-destructive/10 text-destructive border-destructive/20'
				)}
			>
				{tone === 'success' && <PartyPopper className="size-5" />}
				{tone === 'warning' && <AlertTriangle className="size-5" />}
				{tone === 'destructive' && <XCircle className="size-5" />}
			</div>
			<div className="flex-1">
				<p
					className={cn(
						'text-base font-semibold',
						tone === 'success' && 'text-success',
						tone === 'warning' && 'text-warning',
						tone === 'destructive' && 'text-destructive'
					)}
				>
					{tone === 'success' && (retryCount > 0 ? 'Retry successful!' : 'Import successful!')}
					{tone === 'warning' && 'Partial import completed'}
					{tone === 'destructive' && 'Import failed'}
				</p>
				<p className="text-sm text-muted-foreground mt-1">
					{tone === 'success' && `Your ${plural} have been added.`}
					{tone === 'warning' &&
						`Some ${plural} were imported, but others had errors.`}
					{tone === 'destructive' &&
						`No ${plural} were imported due to errors.`}
				</p>
			</div>
		</div>
	)
}

function ResultStats({
	entityLabel,
	result,
	cumulative,
	retryCount
}: {
	entityLabel: { singular: string; plural: string }
	result: BulkImportResult
	cumulative: { imported: number; failed: number; totalAttempted: number }
	retryCount: number
}) {
	// After a retry, cumulative > result — show both so the user can see
	// "30 imported total (5 this batch), 2 still failing".
	const showCumulative = retryCount > 0
	return (
		<div className="grid grid-cols-2 gap-3">
			<div
				className={cn(
					'p-3 rounded-lg flex items-center gap-3',
					result.imported > 0 ? 'bg-success/10' : 'bg-muted/50'
				)}
			>
				<div
					className={cn(
						'icon-container-sm',
						result.imported > 0
							? 'bg-success/20 text-success'
							: 'bg-muted text-muted-foreground'
					)}
				>
					<CheckCircle2 className="size-4" />
				</div>
				<div>
					<p
						className={cn(
							'text-xl font-bold',
							result.imported > 0 ? 'text-success' : 'text-muted-foreground'
						)}
					>
						{showCumulative ? cumulative.imported : result.imported}
					</p>
					<p className="text-xs text-muted-foreground">
						{showCumulative
							? `${entityLabel.plural.toLowerCase()} imported (total)`
							: `${result.imported === 1 ? entityLabel.singular : entityLabel.plural} imported`}
					</p>
				</div>
			</div>
			<div
				className={cn(
					'p-3 rounded-lg flex items-center gap-3',
					result.failed > 0 ? 'bg-destructive/10' : 'bg-muted/50'
				)}
			>
				<div
					className={cn(
						'icon-container-sm',
						result.failed > 0
							? 'bg-destructive/20 text-destructive'
							: 'bg-muted text-muted-foreground'
					)}
				>
					<XCircle className="size-4" />
				</div>
				<div>
					<p
						className={cn(
							'text-xl font-bold',
							result.failed > 0 ? 'text-destructive' : 'text-muted-foreground'
						)}
					>
						{result.failed}
					</p>
					<p className="text-xs text-muted-foreground">
						{showCumulative
							? `${result.failed === 1 ? 'Row' : 'Rows'} still failing this batch`
							: `${result.failed === 1 ? 'Row' : 'Rows'} failed`}
					</p>
				</div>
			</div>
		</div>
	)
}

function ResultErrorList({
	errors,
	parseResult,
	onRetryFailed
}: {
	errors: Array<{ row: number; error: string }>
	parseResult:
		| { rows: ParsedRow<unknown>[]; tooManyRows: boolean; totalRowCount: number }
		| null
	onRetryFailed?: () => void
}) {
	// Download a CSV that mirrors the original user-supplied headers and
	// includes the failed rows' cells + an `_error` column. Users can fix
	// in Excel and re-upload without having to cross-reference row numbers.
	const downloadFailedRowsCsv = () => {
		if (!parseResult) {
			const header = '"row","error"'
			const body = errors
				.map(e => `"${e.row}","${e.error.replace(/"/g, '""')}"`)
				.join('\n')
			triggerCsvDownload(`${header}\n${body}\n`, 'failed-rows.csv')
			return
		}
		// Derive original headers from the first successfully-read row's data
		// (all rows share the same normalized header set).
		const firstRow = parseResult.rows[0]
		const originalHeaders = firstRow ? Object.keys(firstRow.data) : []
		const headerRow = [...originalHeaders, '_error']
		const errorByLine = new Map(errors.map(e => [e.row, e.error]))
		const dataRows = parseResult.rows
			.filter(r => errorByLine.has(r.row))
			.map(r => {
				const cells = originalHeaders.map(h => r.data[h] ?? '')
				cells.push(errorByLine.get(r.row) ?? '')
				return cells
			})
		triggerCsvDownload(
			buildCsvTemplate(headerRow, dataRows),
			'failed-rows.csv'
		)
	}

	return (
		<div className="space-y-2">
			<p className="text-sm font-semibold">Failed rows</p>
			<div className="card-standard max-h-56 overflow-y-auto">
				<ul className="divide-y divide-border/40 text-xs">
					{errors.map(err => (
						<li
							key={err.row}
							className="px-3 py-2 flex items-start gap-2"
						>
							<span className="font-mono text-muted-foreground shrink-0">
								#{err.row}
							</span>
							<span className="text-destructive">{err.error}</span>
						</li>
					))}
				</ul>
			</div>
			<div className="flex flex-wrap gap-2">
				<Button
					size="sm"
					variant="outline"
					onClick={downloadFailedRowsCsv}
					className="gap-2"
				>
					<Download className="size-3.5" />
					Download failed rows
				</Button>
				{onRetryFailed && (
					<Button
						size="sm"
						variant="outline"
						onClick={onRetryFailed}
						className="gap-2"
					>
						<RotateCcw className="size-3.5" />
						Retry failed rows
					</Button>
				)}
			</div>
		</div>
	)
}
