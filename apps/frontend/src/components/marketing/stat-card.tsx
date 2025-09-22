import { cn } from '@/lib/design-system'
import * as React from 'react'

export interface StatCardProps extends React.ComponentProps<'div'> {
	label: React.ReactNode
	value: React.ReactNode
	hint?: React.ReactNode
	accent?: 'primary' | 'accent' | 'muted'
}

export function StatCard({
	className,
	label,
	value,
	hint,
	accent = 'primary',
	...props
}: StatCardProps) {
	const dot = {
		primary: 'bg-primary',
		accent: 'bg-accent',
		muted: 'bg-primary/60'
	}[accent]

	return (
		<div
			className={cn(
				'card-elevated rounded-2xl p-6 text-center',
				className
			)}
			{...props}
		>
			<div className="flex items-center justify-center gap-2 mb-2 text-muted-foreground">
				<span className={cn('w-2 h-2 rounded-full', dot)} />
				<span className="text-sm font-medium">{label}</span>
			</div>
			<div className="text-2xl font-bold text-foreground">{value}</div>
			{hint && <div className="text-xs mt-1 text-muted-foreground">{hint}</div>}
		</div>
	)
}

StatCard.displayName = 'StatCard'

export default StatCard
