'use client'

import {
	ANIMATION_DURATIONS,
	animationClasses,
	badgeClasses,
	cardClasses,
	cn,
	formatCurrency,
	TYPOGRAPHY_SCALE
} from '@/lib/utils'
import type { DashboardFinancialStats } from '@repo/shared'
import {
	APPLE_DURATIONS,
	APPLE_EASINGS,
	APPLE_GRADIENTS,
	APPLE_SHADOWS,
	APPLE_SYSTEM_COLORS
} from '@repo/shared'
import {
	ArrowDownRight,
	ArrowUpRight,
	BarChart3,
	DollarSign,
	Eye,
	EyeOff,
	PieChart,
	Sparkles,
	Target
} from 'lucide-react'
import * as React from 'react'
import { Badge } from 'src/components/ui/badge'
import { Button } from 'src/components/ui/button'
import { Card, CardContent } from 'src/components/ui/card'
import { Progress } from 'src/components/ui/progress'

interface FinancialMetricsCardsProps {
	data?: DashboardFinancialStats
	isLoading?: boolean
	className?: string
}

interface MetricCardProps {
	title: string
	value: string | number
	subtitle?: string
	icon: React.ComponentType<{ className?: string }>
	trend?: {
		value: number
		label: string
		isPositive: boolean
	}
	progress?: number
	color: 'blue' | 'green' | 'purple' | 'orange'
	delay?: number
	insights?: string[]
	target?: number
}

const colorConfig = {
	blue: {
		primary: APPLE_SYSTEM_COLORS.systemBlue,
		gradient: APPLE_GRADIENTS.revenue,
		shadow: APPLE_SHADOWS['shadow-card-apple']
	},
	green: {
		primary: APPLE_SYSTEM_COLORS.systemGreen,
		gradient: APPLE_GRADIENTS.occupancy,
		shadow: APPLE_SHADOWS['shadow-card-elevated']
	},
	purple: {
		primary: APPLE_SYSTEM_COLORS.systemPurple,
		gradient: APPLE_GRADIENTS.satisfaction,
		shadow: APPLE_SHADOWS['shadow-card-interactive']
	},
	orange: {
		primary: APPLE_SYSTEM_COLORS.systemOrange,
		gradient: APPLE_GRADIENTS.maintenance,
		shadow: APPLE_SHADOWS['shadow-button-hover']
	}
}

function MetricCard({
	title,
	value,
	subtitle,
	icon: Icon,
	trend,
	progress,
	color,
	delay = 0,
	insights,
	target
}: MetricCardProps) {
	const [isExpanded, setIsExpanded] = React.useState(false)
	const colors = colorConfig[color]

	const isPositiveChange = trend?.isPositive ?? false
	const changeIcon = isPositiveChange ? ArrowUpRight : ArrowDownRight
	const changeColor = isPositiveChange
		? APPLE_SYSTEM_COLORS.systemGreen
		: APPLE_SYSTEM_COLORS.systemRed

	const handleToggle = () => {
		setIsExpanded(!isExpanded)
	}

	return (
		<Card
			className={cn(
				'relative overflow-hidden cursor-pointer transition-all group',
				'hover:shadow-2xl hover:-translate-y-1 border-2',
				isExpanded && 'shadow-2xl -translate-y-1 ring-2 ring-primary/20'
			)}
			style={{
				animationDelay: `${delay}ms`,
				background: isExpanded ? colors.gradient : undefined,
				transition: `all ${APPLE_DURATIONS['duration-medium']} ${APPLE_EASINGS['ease-out-expo']}`,
				boxShadow: colors.shadow,
				transform: `translateY(${isExpanded ? '-4px' : '0px'})`
			}}
			onClick={handleToggle}
		>
			{/* Ambient glow effect */}
			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
				style={{
					background: `radial-gradient(circle at 50% 50%, ${colors.primary}15, transparent 70%)`
				}}
			/>

			<CardContent className="p-6 relative z-10">
				<div className="flex items-start justify-between mb-4">
					<div className="flex items-center gap-3">
						<div
							className="p-3 rounded-xl transition-all duration-300 group-hover:scale-110"
							style={{
								backgroundColor: `${colors.primary}20`,
								boxShadow: isExpanded
									? APPLE_SHADOWS['shadow-button-hover']
									: 'none'
							}}
						>
							<Icon className="w-5 h-5 transition-colors duration-200" />
						</div>

						<div className="space-y-1">
							<p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
								{title}
							</p>
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-bold">
									{typeof value === 'number' ? formatCurrency(value) : value}
								</span>
								{subtitle && (
									<span className="text-xs text-muted-foreground">
										{subtitle}
									</span>
								)}
							</div>
						</div>
					</div>

					<div className="text-right">
						{trend && (
							<div className="flex items-center gap-1 mb-1">
								{React.createElement(changeIcon, {
									className: 'w-3 h-3',
									style: { color: changeColor }
								})}
								<span
									className="text-sm font-semibold"
									style={{ color: changeColor }}
								>
									{isPositiveChange ? '+' : ''}
									{trend.value}%
								</span>
							</div>
						)}
						{trend && (
							<p className="text-xs text-muted-foreground">{trend.label}</p>
						)}
					</div>
				</div>

				{/* Progress bar */}
				{progress !== undefined && (
					<div className="space-y-2 mb-3">
						<div className="flex justify-between text-xs">
							<span className="text-muted-foreground">Progress</span>
							<span style={{ color: colors.primary }}>
								{progress.toFixed(1)}%
							</span>
						</div>
						<Progress
							value={progress}
							className="h-1.5"
							style={{
								backgroundColor: `${colors.primary}20`
							}}
						/>
					</div>
				)}

				{/* Expand button */}
				<div className="flex items-center justify-between">
					<div className="text-xs text-muted-foreground">
						{isExpanded ? 'Click to collapse' : 'Click for insights'}
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="h-6 px-2 text-xs opacity-70 group-hover:opacity-100 transition-opacity"
					>
						{isExpanded ? (
							<EyeOff className="w-3 h-3" />
						) : (
							<Eye className="w-3 h-3" />
						)}
					</Button>
				</div>

				{/* Expanded insights */}
				{isExpanded && insights && (
					<div
						className="mt-4 space-y-2 p-3 rounded-lg transition-all duration-300"
						style={{
							backgroundColor: 'hsl(var(--background) / 0.7)',
							backdropFilter: 'blur(10px)',
							animation: `slideInFromTop 300ms ${APPLE_EASINGS['ease-out-expo']}`
						}}
					>
						<div className="flex items-center gap-2 mb-2">
							<Sparkles className="w-3 h-3 text-primary" />
							<span className="text-xs font-semibold text-primary">
								Key Insights
							</span>
						</div>
						{insights.map((insight, index) => (
							<div key={index} className="flex items-start gap-2">
								<div className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
								<span className="text-xs text-foreground">{insight}</span>
							</div>
						))}
					</div>
				)}

				{/* Target information */}
				{isExpanded && target && (
					<div
						className="mt-3 p-2 bg-primary/5 rounded-lg transition-all duration-300"
						style={{
							animation: `slideInFromTop 350ms ${APPLE_EASINGS['ease-out-expo']}`
						}}
					>
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground">Target</span>
							<span className="font-bold text-primary">
								{typeof target === 'number' ? formatCurrency(target) : target}
							</span>
						</div>
					</div>
				)}
			</CardContent>

			{/* Hover glow border */}
			<div
				className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
				style={{
					background: `linear-gradient(135deg, transparent, ${colors.primary}10, transparent)`,
					border: `1px solid ${colors.primary}20`
				}}
			/>
		</Card>
	)
}

function MetricCardSkeleton({ delay = 0 }: { delay?: number }) {
	return (
		<Card
			className={cn(
				cardClasses('elevated'),
				'overflow-hidden rounded-2xl border-2',
				animationClasses('pulse')
			)}
			style={{
				animationDelay: `${delay}ms`,
				animation: `fadeIn ${ANIMATION_DURATIONS.default} ease-out ${delay}ms both`
			}}
		>
			<CardContent className="p-6">
				<div className="flex items-start gap-4">
					<div className="size-12 bg-gradient-to-br from-muted to-muted/60 rounded-xl animate-pulse shadow-sm" />
					<div className="space-y-3 flex-1">
						<div className="h-3 bg-gradient-to-r from-muted to-muted/60 rounded-full w-24 animate-pulse" />
						<div className="h-8 bg-gradient-to-r from-muted to-muted/60 rounded-lg w-32 animate-pulse" />
						<div className="h-3 bg-gradient-to-r from-muted to-muted/60 rounded-full w-20 animate-pulse" />
						<div className="space-y-1">
							<div className="h-2 bg-gradient-to-r from-muted to-muted/60 rounded-full w-16 animate-pulse" />
							<div className="h-2 bg-gradient-to-r from-muted/50 to-muted/30 rounded-full w-full animate-pulse" />
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

export function FinancialMetricsCards({
	data,
	isLoading = false,
	className
}: FinancialMetricsCardsProps) {
	if (isLoading) {
		return (
			<div
				className={cn(
					'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6',
					className
				)}
			>
				{[0, 100, 200, 300].map((delay, _index) => (
					<MetricCardSkeleton key={_index} delay={delay} />
				))}
			</div>
		)
	}

	if (!data) {
		return null
	}

	const metrics: MetricCardProps[] = [
		{
			title: 'Total Revenue',
			value: data.totalRevenue,
			subtitle: `${data.activeLeases} active leases`,
			icon: DollarSign,
			color: 'green',
			delay: 0,
			trend: {
				value: 12.5,
				label: 'vs last month',
				isPositive: true
			},
			insights: [
				'Strong holiday season performance',
				'New property onboarded in Q4',
				'Rent increases taking effect'
			],
			target: 70000
		},
		{
			title: 'Monthly Recurring',
			value: data.monthlyRecurring,
			subtitle: 'Predictable income',
			icon: BarChart3,
			color: 'blue',
			delay: 100,
			trend: {
				value: 8.2,
				label: 'vs last month',
				isPositive: true
			},
			insights: [
				'98% payment collection rate',
				'Automatic payment enrollment up',
				'Late fees contributing 6% of total'
			],
			target: 65000
		},
		{
			title: 'Occupancy Rate',
			value: `${data.occupancyRate}%`,
			subtitle: `${data.totalUnits} total units`,
			icon: PieChart,
			color: 'purple',
			delay: 200,
			progress: data.occupancyRate,
			trend: {
				value: 2.1,
				label: 'vs last month',
				isPositive: true
			},
			insights: [
				'Above industry average of 95%',
				'Only 7 vacant units currently',
				'Waitlist for premium units'
			],
			target: 98
		},
		{
			title: 'Net Margin',
			value: '76.5%',
			subtitle: 'Operating efficiency',
			icon: Target,
			color: 'orange',
			delay: 300,
			progress: 76.5,
			trend: {
				value: 3.2,
				label: 'vs last quarter',
				isPositive: true
			},
			insights: [
				'Operating expenses decreased 3%',
				'Maintenance costs under budget',
				'Energy efficiency improvements paying off'
			],
			target: 80
		}
	]

	return (
		<section
			className={cn('space-y-4', className)}
			aria-label="Financial metrics overview"
		>
			<div className="flex items-center justify-between">
				<div>
					<h2
						className="font-semibold tracking-tight text-foreground"
						style={{
							fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize,
							lineHeight: TYPOGRAPHY_SCALE['heading-md'].lineHeight,
							fontWeight: TYPOGRAPHY_SCALE['heading-md'].fontWeight
						}}
					>
						Key Performance Metrics
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						Track your most important financial indicators
					</p>
				</div>
				<Badge
					variant="outline"
					className={cn(
						badgeClasses('outline', 'sm'),
						'animate-pulse bg-primary/5 border-primary/20 text-primary'
					)}
					style={{
						animation: `pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`
					}}
				>
					<div className="size-2 bg-primary rounded-full mr-2 animate-pulse" />
					Live Data
				</Badge>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
				{metrics.map((metric, _index) => (
					<MetricCard key={metric.title} {...metric} />
				))}
			</div>
		</section>
	)
}
