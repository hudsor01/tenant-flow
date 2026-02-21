'use client'

import { Wrench, Plus } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'

interface MaintenanceListEmptyProps {
	onCreate?: (() => void) | undefined
}

export function MaintenanceListEmpty({ onCreate }: MaintenanceListEmptyProps) {
	return (
		<div className="p-6 lg:p-8 bg-background min-h-full">
			<BlurFade delay={0.1} inView>
				<div className="max-w-md mx-auto text-center py-16">
					<div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-6">
						<Wrench className="w-8 h-8 text-primary" />
					</div>
					<h2 className="text-xl font-semibold text-foreground mb-3">
						No maintenance requests
					</h2>
					<p className="text-muted-foreground mb-6">
						Maintenance requests from tenants will appear here.
					</p>
					<button
						onClick={onCreate}
						className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors"
					>
						<Plus className="w-5 h-5" />
						Create Request
					</button>
				</div>
			</BlurFade>
		</div>
	)
}
