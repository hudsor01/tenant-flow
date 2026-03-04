import { BlurFade } from '#components/ui/blur-fade'
import { formatCents } from '#lib/formatters/currency'

interface Highlight {
	label: string
	value: number
	trend: number | null
}

interface FinancialsHighlightsProps {
	highlights: Highlight[]
}

export function FinancialsHighlights({ highlights }: FinancialsHighlightsProps) {
	if (highlights.length === 0) return null

	return (
		<BlurFade delay={0.4} inView>
			<div className="bg-card border border-border rounded-lg p-6">
				<h3 className="font-medium text-foreground mb-4">
					Financial Highlights
				</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{highlights.map((highlight, index) => (
						<div
							key={index}
							className="text-center p-4 bg-muted/30 rounded-lg"
						>
							<p className="text-2xl font-semibold tabular-nums">
								{typeof highlight.value === 'number' && highlight.value > 1000
									? formatCents(highlight.value)
									: highlight.value}
							</p>
							<p className="text-sm text-muted-foreground mt-1">
								{highlight.label}
							</p>
							{highlight.trend !== null && highlight.trend !== undefined && (
								<p
									className={`text-xs mt-1 ${highlight.trend >= 0 ? 'text-emerald-600' : 'text-destructive'}`}
								>
									{highlight.trend >= 0 ? '+' : ''}
									{highlight.trend.toFixed(1)}%
								</p>
							)}
						</div>
					))}
				</div>
			</div>
		</BlurFade>
	)
}
