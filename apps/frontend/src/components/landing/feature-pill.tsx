import type { ReactNode } from 'react'

interface FeaturePillProps {
	icon: ReactNode
	title: string
	description: string
}

export function FeaturePill({ icon, title, description }: FeaturePillProps) {
	return (
		<div className="flex items-center gap-3 card-standard px-4 py-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200">
			<div className="icon-container-md icon-container-primary">{icon}</div>
			<div>
				<div className="font-semibold text-foreground text-sm">{title}</div>
				<div className="text-muted-foreground text-xs">{description}</div>
			</div>
		</div>
	)
}
