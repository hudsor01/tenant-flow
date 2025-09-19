import { ANIMATION_DURATIONS, cardClasses, cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import * as React from 'react'
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from 'src/components/ui/card'

interface MetricsCardProps extends React.ComponentProps<'div'> {
	title: string
	value: string | number
	description?: string
	status?: string
	statusIcon?: LucideIcon
	icon: LucideIcon
	colorVariant:
		| 'success'
		| 'primary'
		| 'revenue'
		| 'property'
		| 'warning'
		| 'info'
	trend?: 'up' | 'down' | 'stable'
}

const colorMap = {
	success: 'chart-1',
	primary: 'chart-2',
	revenue: 'chart-3',
	property: 'chart-4',
	warning: 'chart-10',
	info: 'chart-1'
} as const

export const MetricsCard = React.forwardRef<HTMLDivElement, MetricsCardProps>(
	(
		{
			title,
			value,
			description,
			status,
			statusIcon: StatusIcon,
			icon: _Icon,
			colorVariant,
			className,
			...props
		},
		ref
	) => {
		const chartColor = colorMap[colorVariant]

		return (
			<Card
				ref={ref}
				className={cn(
					cardClasses('interactive'),
					'dashboard-metric-card @container/card border-l-4 transform-gpu will-change-transform touch-manipulation active:scale-[0.99]',
					className
				)}
				style={{
					borderLeftColor: `var(--${chartColor})`,
					transition: `all ${ANIMATION_DURATIONS.default} ease-out`
				}}
				{...props}
			>
				<CardHeader>
					<CardDescription>{title}</CardDescription>
					<CardTitle
						className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl"
						style={{ color: `var(--${chartColor})` }}
					>
						{value}
					</CardTitle>
				</CardHeader>
				{(status || description) && (
					<CardFooter className="flex-col items-start gap-1.5 text-sm">
						{status && StatusIcon && (
							<div
								className="line-clamp-1 flex gap-2 font-medium"
								style={{ color: `var(--${chartColor})` }}
							>
								{status} <StatusIcon className="size-4" />
							</div>
						)}
						{description && (
							<div className="text-muted-foreground">{description}</div>
						)}
					</CardFooter>
				)}
			</Card>
		)
	}
)
MetricsCard.displayName = 'MetricsCard'
