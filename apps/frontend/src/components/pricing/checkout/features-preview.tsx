'use client'

import { CheckCircle2 } from 'lucide-react'

interface Props {
	features?: string[]
}

export function FeaturesPreview({ features = [] }: Props) {
	if (features.length === 0) return null

	return (
		<div className="space-y-2">
			<p className="ui-label">What's included:</p>
			<div className="grid grid-cols-1 gap-1">
				{features.slice(0, 3).map((feature, index) => (
					<div key={index} className="flex items-center gap-2 body-sm">
						<CheckCircle2 className="h-3 w-3 text-success shrink-0" />
						<span className="text-muted-foreground">{feature}</span>
					</div>
				))}
				{features.length > 3 && (
					<p className="ui-caption text-muted-foreground">
						+{features.length - 3} more features
					</p>
				)}
			</div>
		</div>
	)
}
