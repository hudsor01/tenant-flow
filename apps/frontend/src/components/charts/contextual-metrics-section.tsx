'use client'

import { EnhancedMetricsCard } from '@/components/charts/enhanced-metrics-card'
import { MetricsCardSkeleton } from '@/components/charts/metrics-card-skeleton'
import { useContextualMetrics } from '@/hooks/use-contextual-metrics'

interface ContextualMetricsSectionProps {
	isLoading?: boolean
	className?: string
	size?: 'sm' | 'md' | 'lg'
	showLastUpdated?: boolean
}

export function ContextualMetricsSection({
	isLoading = false,
	className,
	size = 'md',
	showLastUpdated = true
}: ContextualMetricsSectionProps) {
	const { metrics, currentPage } = useContextualMetrics()

	const lastUpdated = showLastUpdated ? 'just now' : undefined

	if (isLoading) {
		return (
			<div
				className={`grid grid-cols-1 @xl/main:grid-cols-2 @4xl/main:grid-cols-4 ${className}`}
				style={{ gap: 'var(--dashboard-card-gap)' }}
			>
				{Array.from({ length: 4 }).map((_, index) => (
					<MetricsCardSkeleton key={index} />
				))}
			</div>
		)
	}

	return (
		<div
			className={`grid grid-cols-1 @xl/main:grid-cols-2 @4xl/main:grid-cols-4 ${className}`}
			style={{ gap: 'var(--dashboard-card-gap)' }}
		>
			{metrics?.map((metric, index) => (
				<EnhancedMetricsCard
					key={`${currentPage}-${index}`}
					title={metric.title}
					value={metric.value}
					description={metric.description}
					change={metric.change}
					progress={metric.progress}
					sparkline={metric.sparkline}
					icon={metric.icon}
					colorVariant={metric.colorVariant}
					size={size}
					lastUpdated={lastUpdated}
					className="animate-in fade-in-50 duration-300"
					style={{
						animationDelay: `${index * 100}ms`,
						animationFillMode: 'both'
					}}
				/>
			))}
		</div>
	)
}

export default ContextualMetricsSection