import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { cardClasses, cn } from '@/lib/design-system'
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
					'border-l-[3px] hover:shadow-md transition-all duration-200 ease-out',
					className
				)}
				style={{
					borderLeftColor: `var(--color-${colorToken})`,
					backgroundColor: `var(--color-${colorToken}-bg)`,
					minHeight: '120px',
					padding: 'var(--spacing-6)'
				}}
				{...props}
			>
				<CardHeader
					style={{
						padding: '0',
						gap: 'var(--spacing-4)'
					}}
				>
					<div
						className="flex items-center justify-between"
						style={{ gap: 'var(--spacing-3)' }}
					>
						<CardDescription
							className="font-medium"
							style={{
								color: 'var(--color-label-secondary)',
								fontSize: 'var(--font-body)',
								lineHeight: 'var(--line-height-body)'
							}}
						>
							{title}
						</CardDescription>
						{Icon && (
							<div
								className="flex shrink-0 items-center justify-center rounded-lg"
								style={{
									backgroundColor: `var(--color-${colorToken}-bg)`,
									border: `1px solid var(--color-${colorToken}-border)`,
									width: '40px',
									height: '40px'
								}}
							>
								<Icon className="h-5 w-5" />
							</div>
						)}
					</div>
					<CardTitle
						className="tabular-nums @[250px]/card:text-3xl font-semibold"
						style={{
							color: `var(--color-${colorToken}-text)`,
							fontSize: 'var(--font-large-title)',
							lineHeight: 'var(--line-height-large-title)'
						}}
					>
						{value}
					</CardTitle>
				</CardHeader>
				{(status || description) && (
					<CardFooter
						className="flex-col items-start"
						style={{
							padding: '0',
							paddingTop: 'var(--spacing-4)',
							gap: 'var(--spacing-2)'
						}}
					>
						{status && StatusIcon && (
							<div
								className="line-clamp-1 flex font-medium"
								style={{
									color: `var(--color-${colorToken})`,
									gap: 'var(--spacing-2)',
									fontSize: 'var(--font-body)',
									lineHeight: 'var(--line-height-body)'
								}}
							>
								{status} <StatusIcon className="h-4 w-4" aria-hidden="true" />
							</div>
						)}
						{description && (
							<div
								style={{
									color: 'var(--color-label-secondary)',
									fontSize: 'var(--font-body)',
									lineHeight: 'var(--line-height-body)'
								}}
							>
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
