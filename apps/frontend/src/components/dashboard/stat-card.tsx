'use client'

import { type LucideIcon } from 'lucide-react'
import { type ReactNode } from 'react'

interface StatCardProps {
	title: string
	value: string | number
	description?: string
	badge?: ReactNode
	icon?: LucideIcon
	trend?: 'up' | 'down' | null
	variant?: 'default' | 'success' | 'warning' | 'info'
}

export function StatCard({
	title,
	value,
	description,
	badge,
	icon: Icon,
	trend: _trend,
	variant: _variant = 'default',
}: StatCardProps) {
	return (
		<div className="dashboard-widget-card">
			<div className="relative p-6">
				<div className="flex items-center justify-between mb-4">
					<p className="text-sm font-bold text-muted-foreground tracking-wide uppercase">
						{title}
					</p>
					{badge && <div className="flex items-center gap-2">{badge}</div>}
				</div>
				<div className="space-y-3">
					<h3 className="text-4xl font-black tracking-tight text-foreground transition-colors group-hover:text-muted-foreground">
						{value}
					</h3>
					{description && (
						<p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
							{Icon && <Icon className="h-4 w-4" />}
							<span>{description}</span>
						</p>
					)}
				</div>
			</div>
		</div>
	)
}
