'use client'

import {
	CheckCircle2,
	XCircle,
	AlertTriangle,
	PartyPopper
} from 'lucide-react'
import type { BulkImportResult, ParsedRow } from '#types/api-contracts'
import { cn } from '#lib/utils'
import { ResultErrorList } from './bulk-import-result-error-list'

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

function StatCard({
	tone,
	count,
	label,
	icon
}: {
	tone: 'success' | 'destructive'
	count: number
	label: string
	icon: 'check' | 'x'
}) {
	const active = count > 0
	const Icon = icon === 'check' ? CheckCircle2 : XCircle
	return (
		<div
			className={cn(
				'p-3 rounded-lg flex items-center gap-3',
				active
					? tone === 'success'
						? 'bg-success/10'
						: 'bg-destructive/10'
					: 'bg-muted/50'
			)}
		>
			<div
				className={cn(
					'icon-container-sm',
					active
						? tone === 'success'
							? 'bg-success/20 text-success'
							: 'bg-destructive/20 text-destructive'
						: 'bg-muted text-muted-foreground'
				)}
			>
				<Icon className="size-4" />
			</div>
			<div>
				<p
					className={cn(
						'text-xl font-bold',
						active
							? tone === 'success'
								? 'text-success'
								: 'text-destructive'
							: 'text-muted-foreground'
					)}
				>
					{count}
				</p>
				<p className="text-xs text-muted-foreground">{label}</p>
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
	const showCumulative = retryCount > 0
	const importedCount = showCumulative ? cumulative.imported : result.imported
	const importedLabel = showCumulative
		? `${entityLabel.plural.toLowerCase()} imported (total)`
		: `${result.imported === 1 ? entityLabel.singular : entityLabel.plural} imported`
	const failedLabel = showCumulative
		? `${result.failed === 1 ? 'Row' : 'Rows'} still failing this batch`
		: `${result.failed === 1 ? 'Row' : 'Rows'} failed`
	return (
		<div className="grid grid-cols-2 gap-3">
			<StatCard
				tone="success"
				count={importedCount}
				label={importedLabel}
				icon="check"
			/>
			<StatCard
				tone="destructive"
				count={result.failed}
				label={failedLabel}
				icon="x"
			/>
		</div>
	)
}

