import { ArrowDownCircle } from 'lucide-react'

interface CashFlowErrorProps {
	error: Error | null
	onRetry: () => void
}

export function CashFlowError({ error, onRetry }: CashFlowErrorProps) {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<div className="max-w-md mx-auto text-center py-16">
				<div className="w-16 h-16 rounded-lg bg-destructive/10 flex items-center justify-center mx-auto mb-6">
					<ArrowDownCircle className="w-8 h-8 text-destructive" />
				</div>
				<h2 className="text-xl font-semibold text-foreground mb-3">
					Failed to Load Cash Flow
				</h2>
				<p className="text-muted-foreground mb-6">
					{error instanceof Error ? error.message : 'An error occurred'}
				</p>
				<button
					onClick={onRetry}
					className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
				>
					Try Again
				</button>
			</div>
		</div>
	)
}
