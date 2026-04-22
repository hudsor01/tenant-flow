import { Loader2 } from 'lucide-react'
import { Progress } from '#components/ui/progress'
import type {
	BulkImportResult,
	ImportProgress,
	ParsedRow
} from '#types/api-contracts'
import { BulkImportResultPanel } from './bulk-import-result-panel'

interface BulkImportConfirmStepProps {
	entityLabel: { singular: string; plural: string }
	isImporting: boolean
	importProgress: ImportProgress | null
	result: BulkImportResult | null
	cumulative: { imported: number; failed: number; totalAttempted: number }
	retryCount: number
	parseResult:
		| { rows: ParsedRow<unknown>[]; tooManyRows: boolean; totalRowCount: number }
		| null
	onRetryFailed?: () => void
}

export function BulkImportConfirmStep({
	entityLabel,
	isImporting,
	importProgress,
	result,
	cumulative,
	retryCount,
	parseResult,
	onRetryFailed
}: BulkImportConfirmStepProps) {
	const singularLower = entityLabel.singular.toLowerCase()
	const pluralLower = entityLabel.plural.toLowerCase()
	const progressPercent = importProgress
		? (importProgress.current / importProgress.total) * 100
		: 0

	// Only the first successful batch auto-closes. Once retryCount > 0 the
	// dialog stays open; surface a subtle hint on the first batch so the
	// user knows a close is coming.
	const willAutoClose =
		result !== null && retryCount === 0 && result.success && result.imported > 0

	return (
		<div className="space-y-5">
			{isImporting && (
				<div
					className="card-standard p-6 space-y-4"
					role="status"
					aria-live="polite"
					aria-atomic="true"
				>
					<div className="flex items-center gap-4">
						<div className="icon-container-md bg-primary/10 text-primary border border-primary/20 animate-pulse">
							<Loader2 className="size-5 animate-spin" />
						</div>
						<div className="flex-1">
							<p className="text-sm font-semibold">Importing {pluralLower}...</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								{importProgress
									? `Importing ${singularLower} ${importProgress.current} of ${importProgress.total}`
									: 'Preparing import...'}
							</p>
						</div>
						{importProgress && (
							<span className="typography-h3 text-primary tabular-nums">
								{importProgress.current}/{importProgress.total}
							</span>
						)}
					</div>

					<div className="space-y-2">
						<Progress
							value={progressPercent}
							variant="default"
							size="lg"
							className="h-3"
						/>
						<div className="flex justify-between text-xs text-muted-foreground">
							{importProgress ? (
								<>
									<span>
										{importProgress.succeeded} succeeded
										{importProgress.failed > 0 &&
											`, ${importProgress.failed} failed`}
									</span>
									<span>{Math.round(progressPercent)}%</span>
								</>
							) : (
								<>
									<span>Processing CSV data</span>
									<span>Starting...</span>
								</>
							)}
						</div>
					</div>
				</div>
			)}

			{result && (
				<div role="status" aria-live="polite">
					<BulkImportResultPanel
						entityLabel={entityLabel}
						result={result}
						cumulative={cumulative}
						retryCount={retryCount}
						parseResult={parseResult}
						{...(onRetryFailed ? { onRetryFailed } : {})}
					/>
					{willAutoClose && (
						<p className="text-xs text-muted-foreground mt-2 text-center">
							Closing automatically…
						</p>
					)}
				</div>
			)}
		</div>
	)
}
