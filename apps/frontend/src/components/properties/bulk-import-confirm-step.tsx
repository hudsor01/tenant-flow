'use client'

import {
	CheckCircle2,
	XCircle,
	Loader2,
	Building2,
	AlertTriangle,
	PartyPopper
} from 'lucide-react'
import { Progress } from '#components/ui/progress'
import type { BulkImportResult } from '@repo/shared/types/bulk-import'
import { cn } from '#lib/utils'

interface BulkImportConfirmStepProps {
	isImporting: boolean
	uploadProgress: number
	result: BulkImportResult | null
}

export function BulkImportConfirmStep({
	isImporting,
	uploadProgress,
	result
}: BulkImportConfirmStepProps) {
	// Show ready state when not importing and no result yet
	const showReadyState = !isImporting && !result

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
								Please wait while we process your file
							</p>
						</div>
						<span className="text-2xl font-bold text-primary tabular-nums">
							{uploadProgress}%
						</span>
					</div>

					<div className="space-y-2">
						<Progress
							value={uploadProgress}
							variant="default"
							size="lg"
							className="h-3"
						/>
						<div className="flex justify-between text-xs text-muted-foreground">
							<span>Processing CSV data</span>
							<span>
								{uploadProgress < 100 ? 'In progress...' : 'Finalizing...'}
							</span>
						</div>
					</div>

					{/* Progress Steps */}
					<div className="grid grid-cols-3 gap-2 pt-2">
						<ProgressStep
							label="Upload"
							isComplete={uploadProgress >= 30}
							isActive={uploadProgress < 30}
						/>
						<ProgressStep
							label="Validate"
							isComplete={uploadProgress >= 70}
							isActive={uploadProgress >= 30 && uploadProgress < 70}
						/>
						<ProgressStep
							label="Import"
							isComplete={uploadProgress >= 100}
							isActive={uploadProgress >= 70 && uploadProgress < 100}
						/>
					</div>
				</div>
			)}

			{/* Ready State */}
			{showReadyState && (
				<div className="card-standard p-8 text-center bg-linear-to-b from-primary/5 to-transparent">
					<div className="icon-container-lg bg-primary/10 text-primary border border-primary/20 mx-auto mb-4">
						<Building2 className="size-7" />
					</div>
					<p className="text-lg font-semibold">Ready to import</p>
					<p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
						Click the button below to add your properties to your portfolio
					</p>
				</div>
			)}

			{/* Result Panel */}
			{result && <BulkImportResultPanel result={result} />}
		</div>
	)
}

function ProgressStep({
	label,
	isComplete,
	isActive
}: {
	label: string
	isComplete: boolean
	isActive: boolean
}) {
	return (
		<div
			className={cn(
				'flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors',
				isComplete && 'bg-success/10',
				isActive && 'bg-primary/10'
			)}
		>
			<div
				className={cn(
					'size-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
					isComplete && 'bg-success text-success-foreground',
					isActive && 'bg-primary text-primary-foreground animate-pulse',
					!isComplete && !isActive && 'bg-muted text-muted-foreground'
				)}
			>
				{isComplete ? (
					<CheckCircle2 className="size-4" />
				) : isActive ? (
					<Loader2 className="size-3.5 animate-spin" />
				) : (
					<span className="size-2 rounded-full bg-current" />
				)}
			</div>
			<span
				className={cn(
					'text-xs font-medium',
					isComplete && 'text-success',
					isActive && 'text-primary',
					!isComplete && !isActive && 'text-muted-foreground'
				)}
			>
				{label}
			</span>
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
