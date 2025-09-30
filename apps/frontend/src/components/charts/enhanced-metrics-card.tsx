'use client'

import * as React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cardClasses, cn } from '@/lib/utils'
import type {
	SparklineData,
	EnhancedMetricsCardProps
} from '@repo/shared/types/frontend'

const colorMap = {
	success: 'metric-success',
	primary: 'metric-primary',
	revenue: 'metric-revenue',
	property: 'metric-primary',
	warning: 'metric-warning',
	info: 'metric-info',
	neutral: 'metric-neutral'
} as const

const trendIcons = {
	up: TrendingUp,
	down: TrendingDown,
	neutral: Minus
} as const

const trendColors = {
	up: 'text-[var(--color-system-green-85)]',
	down: 'text-[var(--color-system-red-85)]',
	neutral: 'text-[var(--color-label-tertiary)]'
} as const

const SimpleSpark = ({ data, className }: { data: SparklineData[], className?: string }) => {
	if (!data || data.length < 2) return null

	const maxValue = Math.max(...data.map(d => d.value))
	const minValue = Math.min(...data.map(d => d.value))
	const range = maxValue - minValue || 1

	const points = data.map((item, index) => {
		const x = (index / (data.length - 1)) * 100
		const y = 100 - ((item.value - minValue) / range) * 100
		return `${x},${y}`
	}).join(' ')

	return (
		<div className={cn("h-8 w-16", className)}>
			<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
				<polyline
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					points={points}
					className="opacity-80"
				/>
			</svg>
		</div>
	)
}

export const EnhancedMetricsCard = React.forwardRef<HTMLDivElement, EnhancedMetricsCardProps>(
	(
		{
			title,
			value,
			description,
			change,
			progress,
			sparkline,
			icon: Icon,
			colorVariant,
			showTrendIcon = true,
			lastUpdated,
			interactive = true,
			size = 'md',
			className,
			...props
		},
		ref
	) => {
		const colorToken = colorMap[colorVariant]
		const TrendIcon = change?.trend ? trendIcons[change.trend] : null
		const trendColorClass = change?.trend ? trendColors[change.trend] : ''

		return (
			<Card
				ref={ref}
				className={cn(
					cardClasses(interactive ? 'interactive' : 'default'),
					'dashboard-metric-card @container/card transform-gpu will-change-transform',
					interactive && 'touch-manipulation hover:shadow-lg active:scale-[0.99] cursor-pointer',
					'border-l-[3px] transition-all duration-300 ease-out',
					'group relative overflow-hidden',
					className
				)}
				style={{
					borderLeftColor: `var(--color-${colorToken})`,
					backgroundColor: `var(--color-${colorToken}-bg)`,
					...{ padding: 'var(--spacing-6)' }
				}}
				{...props}
			>
				{/* Background pattern for visual interest */}
				<div
					className="absolute inset-0 opacity-[0.02] pointer-events-none"
					style={{
						backgroundImage: `radial-gradient(circle at 50% 50%, var(--color-${colorToken}) 1px, transparent 1px)`,
						backgroundSize: '24px 24px'
					}}
				/>

				<CardHeader className="pb-2 space-y-0">
					<div className="flex items-center justify-between">
						<CardDescription
							className="font-medium tracking-tight"
							style={{
								color: 'var(--color-label-secondary)',
								fontSize: 'var(--font-body)'
							}}
						>
							{title}
						</CardDescription>
						<div className="flex items-center gap-2">
							{sparkline && (
								<SimpleSpark
									data={sparkline}
									className={cn("opacity-60", `text-${colorToken}`)}
								/>
							)}
							{Icon && (
								<div
									className="flex shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110"
									style={{
										backgroundColor: `var(--color-${colorToken}-bg)`,
										border: `1px solid var(--color-${colorToken}-border)`,
										width: size === 'lg' ? '48px' : '40px',
										height: size === 'lg' ? '48px' : '40px'
									}}
								>
									<Icon className={cn(
										size === 'lg' ? 'h-6 w-6' : 'h-5 w-5',
										`text-${colorToken}`
									)} />
								</div>
							)}
						</div>
					</div>
				</CardHeader>

				<CardContent className="pb-2">
					<CardTitle
						className={cn(
							"tabular-nums font-bold tracking-tight transition-colors",
							size === 'lg' ? '@[250px]/card:text-4xl text-3xl' : '@[250px]/card:text-3xl text-2xl'
						)}
						style={{
							color: `var(--color-${colorToken}-text)`,
							fontSize: size === 'lg' ? 'var(--font-display)' : 'var(--font-large-title)'
						}}
					>
						{value}
					</CardTitle>

					{progress && (
						<div className="mt-3 space-y-2">
							<Progress
								value={(progress.current / progress.target) * 100}
								className="h-2"
								style={{ backgroundColor: `var(--color-${colorToken}-bg)` }}
							/>
							<div className="flex justify-between text-xs text-muted-foreground">
								<span>{progress.current.toLocaleString()}</span>
								<span>{progress.target.toLocaleString()} {progress.label || 'target'}</span>
							</div>
						</div>
					)}
				</CardContent>

				<CardFooter className="pt-2 pb-0 flex-col items-start space-y-2">
					{change && (
						<div className="flex items-center gap-2">
							{showTrendIcon && TrendIcon && (
								<TrendIcon className={cn("h-4 w-4", trendColorClass)} />
							)}
							<span
								className={cn("text-sm font-medium", trendColorClass)}
							>
								{change.value}
							</span>
							{change.period && (
								<span className="text-xs text-muted-foreground">
									{change.period}
								</span>
							)}
						</div>
					)}

					{description && (
						<p
							className="text-xs leading-relaxed"
							style={{
								color: 'var(--color-label-secondary)'
							}}
						>
							{description}
						</p>
					)}

					{lastUpdated && (
						<p className="text-xs text-muted-foreground opacity-60">
							Updated {lastUpdated}
						</p>
					)}
				</CardFooter>
			</Card>
		)
	}
)

EnhancedMetricsCard.displayName = 'EnhancedMetricsCard'

export default EnhancedMetricsCard