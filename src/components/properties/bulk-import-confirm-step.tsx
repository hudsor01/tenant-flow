import {
	CheckCircle2,
	XCircle,
	Loader2,
	AlertTriangle,
	PartyPopper
} from 'lucide-react'
import { Progress } from '#components/ui/progress'
import type { BulkImportResult, ImportProgress } from '#types/api-contracts'
import { cn } from '#lib/utils'

interface BulkImportConfirmStepProps {
	isImporting: boolean
	importProgress: ImportProgress | null
	result: BulkImportResult | null
}

export function BulkImportConfirmStep({
	isImporting,
	importProgress,
	result
}: BulkImportConfirmStepProps) {
	const progressPercent = importProgress
		? (importProgress.current / importProgress.total) * 100
		: 0

	return (
		<div className="space-y-5">
			{/* Importing State */}
			{isImporting && (
				<div className="card-standard p-6 space-y-4">
					<div className="flex items-center gap-4">
						<div className="icon-container-md bg-primary/10 text-primary border border-primary/20 animate-pulse">
							<Loader2 className="size-5 animate-spin" />
						</div>
						<div className="flex-1">
							<p className="text-sm font-semibold">Importing properties...</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								{importProgress
									? `Importing property ${importProgress.current} of ${importProgress.total}`
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
										{importProgress.failed > 0 && `, ${importProgress.failed} failed`}
									</span>
									<span>
										{Math.round(progressPercent)}%
									</span>
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

			{/* Result Panel */}
			{result && <BulkImportResultPanel result={result} />}
		</div>
	)
}

function BulkImportResultPanel({
	result
}: {
	result: BulkImportResult | null
}) {
	if (!result) return null

	const isSuccess = result.success && result.imported > 0
	const hasPartialSuccess = result.imported > 0 && result.failed > 0
	const isFailure =
		!result.success || (result.imported === 0 && result.failed > 0)

	return (
		<div
			className={cn(
				'card-standard p-6 space-y-4',
				isSuccess &&
					!hasPartialSuccess &&
					'bg-linear-to-r from-success/10 to-success/5 border-success/30',
				hasPartialSuccess &&
					'bg-linear-to-r from-warning/10 to-warning/5 border-warning/30',
				isFailure &&
					!hasPartialSuccess &&
					'bg-linear-to-r from-destructive/10 to-destructive/5 border-destructive/30'
			)}
		>
			{/* Header */}
			<div className="flex items-start gap-4">
				<div
					className={cn(
						'icon-container-md border',
						isSuccess &&
							!hasPartialSuccess &&
							'bg-success/10 text-success border-success/20',
						hasPartialSuccess && 'bg-warning/10 text-warning border-warning/20',
						isFailure &&
							!hasPartialSuccess &&
							'bg-destructive/10 text-destructive border-destructive/20'
					)}
				>
					{isSuccess && !hasPartialSuccess && (
						<PartyPopper className="size-5" />
					)}
					{hasPartialSuccess && <AlertTriangle className="size-5" />}
					{isFailure && !hasPartialSuccess && <XCircle className="size-5" />}
				</div>
				<div className="flex-1">
					<p
						className={cn(
							'text-base font-semibold',
							isSuccess && !hasPartialSuccess && 'text-success',
							hasPartialSuccess && 'text-warning',
							isFailure && !hasPartialSuccess && 'text-destructive'
						)}
					>
						{isSuccess && !hasPartialSuccess && 'Import successful!'}
						{hasPartialSuccess && 'Partial import completed'}
						{isFailure && !hasPartialSuccess && 'Import failed'}
					</p>
					<p className="text-sm text-muted-foreground mt-1">
						{isSuccess &&
							!hasPartialSuccess &&
							'Your properties have been added to your portfolio.'}
						{hasPartialSuccess &&
							'Some properties were imported, but others had errors.'}
						{isFailure &&
							!hasPartialSuccess &&
							'No properties were imported due to errors.'}
					</p>
				</div>
			</div>

			{/* Stats */}
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
							{result.imported}
						</p>
						<p className="text-xs text-muted-foreground">
							{result.imported === 1 ? 'Property' : 'Properties'} imported
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
							{result.failed === 1 ? 'Row' : 'Rows'} failed
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
