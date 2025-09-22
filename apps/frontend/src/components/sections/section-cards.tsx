import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'
import { useSpring } from '@react-spring/core'
import { animated } from '@react-spring/web'
import type { DashboardStats } from '@repo/shared'
import { Minus, TrendingUp } from 'lucide-react'
import * as React from 'react'

interface SectionCardsProps extends React.ComponentProps<'div'> {
	data?: DashboardStats
}

interface AnimatedMetricCardProps {
	title: string
	value: number
	formatValue: (value: number) => string
	borderColor: string
	textColor: string
	trend: string
	description: string
	icon: React.ReactNode
	delay?: number
}

const AnimatedMetricCard = React.memo(
	({
		title,
		value,
		formatValue,
		borderColor,
		textColor,
		trend,
		description,
		icon,
		delay = 0
	}: AnimatedMetricCardProps) => {
		const valueSpring = useSpring({
			number: value,
			from: { number: 0 },
			config: { mass: 1, tension: 120, friction: 14 },
			delay
		})

		const cardSpring = useSpring({
			opacity: 1,
			transform: 'translateY(0px) scale(1)',
			from: { opacity: 0, transform: 'translateY(20px) scale(0.95)' },
			config: { mass: 1, tension: 120, friction: 14 },
			delay
		})

		const [hovered, setHovered] = React.useState(false)
		const hoverSpring = useSpring({
			transform: hovered
				? 'translateY(-2px) scale(1.02)'
				: 'translateY(0px) scale(1)',
			config: { mass: 1, tension: 180, friction: 12 }
		})

		return (
			<animated.div
				style={cardSpring}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
			>
				<animated.div style={hoverSpring}>
					<Card
						className={cn(
							'dashboard-metric-card @container/card border-l-4 touch-manipulation',
							borderColor
						)}
					>
						<CardHeader>
							<CardDescription>{title}</CardDescription>
							<CardTitle
								className={cn(
									'text-2xl font-semibold tabular-nums @[250px]/card:text-3xl',
									textColor
								)}
							>
								<animated.span>
									{valueSpring.number.to(formatValue)}
								</animated.span>
							</CardTitle>
						</CardHeader>
						<CardFooter className="flex-col items-start gap-1.5 text-sm">
							<div
								className={cn('line-clamp-1 flex gap-2 font-medium', textColor)}
							>
								{trend} {icon}
							</div>
							<div className="text-muted-foreground">{description}</div>
						</CardFooter>
					</Card>
				</animated.div>
			</animated.div>
		)
	}
)

export const SectionCards = React.forwardRef<HTMLDivElement, SectionCardsProps>(
	({ data, className, ...props }, ref) => {
		// Fallback values for loading state - NO CALCULATIONS, pure presentation
		const revenue = data?.revenue?.monthly ?? 0
		const occupancyRate = data?.properties?.occupancyRate ?? 0
		const growth = data?.revenue?.growth ?? 0

		// Container animation
		const containerSpring = useSpring({
			opacity: 1,
			from: { opacity: 0 },
			config: { mass: 1, tension: 120, friction: 14 }
		})

		return (
			<animated.div
				ref={ref}
				style={containerSpring}
				className={cn(
					'dashboard-cards-container *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs px-4 lg:px-6 touch-manipulation',
					className
				)}
				{...props}
			>
				{/* Monthly Revenue - Green (Profitable) */}
				<AnimatedMetricCard
					title="Monthly Revenue"
					value={revenue}
					formatValue={formatCurrency}
					borderColor="border-l-success"
					textColor="text-success"
					trend="Strong revenue growth"
					description="Rent collections up from last month"
					icon={<TrendingUp className="size-4" />}
					delay={0}
				/>

				{/* Occupancy Rate - Info (Performance Metric) */}
				<AnimatedMetricCard
					title="Occupancy Rate"
					value={occupancyRate}
					formatValue={val => `${val.toFixed(1)}%`}
					borderColor="border-l-info"
					textColor="text-info"
					trend="Stable occupancy rate"
					description="Minor decrease from last month"
					icon={<Minus className="size-4" />}
					delay={100}
				/>

				{/* Revenue Growth - Info (Performance Metric) */}
				<AnimatedMetricCard
					title="Revenue Growth"
					value={growth}
					formatValue={val => `${val.toFixed(1)}%`}
					borderColor="border-l-info"
					textColor="text-info"
					trend="Month over month growth"
					description="Revenue growth compared to last month"
					icon={<TrendingUp className="size-4" />}
					delay={200}
				/>
			</animated.div>
		)
	}
)
SectionCards.displayName = 'SectionCards'
