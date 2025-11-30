'use client'

import { type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'

interface StatCardProps {
	title: string
	value: string | number
	description?: string
	icon?: LucideIcon
	badge?: ReactNode
}

export function StatCard({
	title,
	value,
	description,
	icon: Icon,
	badge,
}: StatCardProps) {
	return (
		<div className="stat-card-professional">
			<div className="p-6">
				<div className="flex items-start justify-between mb-4">
					<p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase leading-tight">
						{title}
					</p>
					<div className="flex items-center gap-2">
						{badge}
						{Icon && (
							<div className="icon-bg-primary rounded-full p-2">
								<Icon className="h-4 w-4" />
							</div>
						)}
					</div>
				</div>
				<div className="space-y-2">
					<h3 className="text-responsive-h1 font-bold tracking-tight text-foreground">
						{value}
					</h3>
					{description && (
						<p className="text-sm text-muted-foreground leading-relaxed">
							{description}
						</p>
					)}
				</div>
			</div>
		</div>
	)
}
