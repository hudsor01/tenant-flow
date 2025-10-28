import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { cardClasses, cn } from '#lib/design-system'
import type { MetricsCardProps } from '@repo/shared/types/frontend-ui'
import * as React from 'react'

const colorMap = {
	success: 'metric-success',
	primary: 'metric-primary',
	revenue: 'metric-revenue',
	property: 'metric-primary',
	warning: 'metric-warning',
	info: 'metric-info',
	neutral: 'metric-neutral'
} as const

export const MetricsCard = React.forwardRef<HTMLDivElement, MetricsCardProps>(
	(
		{
			title,
			value,
			description,
			status,
			statusIcon: StatusIcon,
			icon: Icon,
			colorVariant,
			className,
			...props
		},
		ref
	) => {
		const colorToken = colorMap[colorVariant as keyof typeof colorMap]

		return (
			<Card
				ref={ref}
				className={cn(
					cardClasses('interactive'),
					'dashboard-metric-card @container/card transform-gpu will-change-transform touch-manipulation active:scale-[0.99]',
					'border-l-[3px] hover:shadow-md transition-all duration-200 ease-out min-h-30',
					'p-6',
					className
				)}
				style={{
					borderLeftColor: `var(--color-${colorToken})`,
					backgroundColor: `var(--color-${colorToken}-bg)`
				}}
				{...props}
			>
				<CardHeader className="p-0 gap-4">
					<div className="flex items-center justify-between gap-3">
						<CardDescription className="font-medium text-muted-foreground text-sm leading-normal">
							{title}
						</CardDescription>
						{Icon && (
							<div
								className="flex shrink-0 items-center justify-center rounded-lg size-10"
								style={{
									backgroundColor: `var(--color-${colorToken}-bg)`,
									border: `1px solid var(--color-${colorToken}-border)`
								}}
							>
								<Icon className="size-5" />
							</div>
						)}
					</div>
					<CardTitle
						className="tabular-nums @[250px]/card:text-3xl font-semibold text-2xl leading-tight"
						style={{
							color: `var(--color-${colorToken}-text)`
						}}
					>
						{value}
					</CardTitle>
				</CardHeader>
				{(status || description) && (
					<CardFooter className="flex-col items-start p-0 pt-4 gap-2">
						{status && StatusIcon && (
							<div
								className="line-clamp-1 flex font-medium gap-2 text-sm leading-normal"
								style={{
									color: `var(--color-${colorToken})`
								}}
							>
								{status} <StatusIcon className="size-4" aria-hidden="true" />
							</div>
						)}
						{description && (
							<div className="text-muted-foreground text-sm leading-normal">
								{description}
							</div>
						)}
					</CardFooter>
				)}
			</Card>
		)
	}
)
MetricsCard.displayName = 'MetricsCard'
