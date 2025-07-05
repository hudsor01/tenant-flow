import React from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
	icon?: React.ReactNode
	title: string
	description: string
	action?: {
		label: string
		onClick: () => void
		variant?: 'default' | 'outline' | 'secondary'
	}
	className?: string
	size?: 'sm' | 'md' | 'lg'
}

export const EmptyState: React.FC<EmptyStateProps> = ({
	icon,
	title,
	description,
	action,
	className,
	size = 'md'
}) => {
	const sizeClasses = {
		sm: 'py-8 px-6',
		md: 'py-12 px-8',
		lg: 'py-16 px-10'
	}

	const iconSizes = {
		sm: 'w-12 h-12',
		md: 'w-16 h-16',
		lg: 'w-20 h-20'
	}

	const titleSizes = {
		sm: 'text-lg',
		md: 'text-xl',
		lg: 'text-2xl'
	}

	return (
		<Card
			className={cn(
				'border-muted-foreground/25 border-2 border-dashed',
				className
			)}
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className={cn('text-center', sizeClasses[size])}
			>
				{/* Icon */}
				{icon && (
					<motion.div
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.2, duration: 0.4 }}
						className={cn(
							'bg-muted/50 mx-auto mb-4 flex items-center justify-center rounded-full',
							iconSizes[size]
						)}
					>
						<div className="text-muted-foreground">{icon}</div>
					</motion.div>
				)}

				{/* Title */}
				<motion.h3
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className={cn(
						'text-foreground mb-2 font-semibold',
						titleSizes[size]
					)}
				>
					{title}
				</motion.h3>

				{/* Description */}
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
					className="text-muted-foreground mx-auto mb-6 max-w-md leading-relaxed"
				>
					{description}
				</motion.p>

				{/* Action Button */}
				{action && (
					<motion.div
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.5 }}
					>
						<Button
							onClick={action.onClick}
							variant={action.variant || 'default'}
							size={size === 'lg' ? 'lg' : 'default'}
						>
							{action.label}
						</Button>
					</motion.div>
				)}
			</motion.div>
		</Card>
	)
}

// Specific empty states for common use cases
export const FinancialDataEmptyState: React.FC<{
	onAddPayment?: () => void
}> = ({ onAddPayment }) => (
	<EmptyState
		icon={
			<svg
				className="h-8 w-8"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM13 8.5h.01M9 8.5h.01"
				/>
			</svg>
		}
		title="No Financial Data Yet"
		description="Start by recording your first payment or setting up property rent amounts to see financial analytics and insights."
		action={
			onAddPayment
				? {
						label: 'Record First Payment',
						onClick: onAddPayment
					}
				: undefined
		}
	/>
)

export const AnalyticsEmptyState: React.FC<{
	onSetupProperties?: () => void
}> = ({ onSetupProperties }) => (
	<EmptyState
		icon={
			<svg
				className="h-8 w-8"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				/>
			</svg>
		}
		title="Building Your Analytics"
		description="Once you have payment data and property information, you'll see detailed charts and insights about your financial performance here."
		action={
			onSetupProperties
				? {
						label: 'Setup Properties',
						onClick: onSetupProperties,
						variant: 'outline'
					}
				: undefined
		}
	/>
)

export const InsightsEmptyState: React.FC<{ onLearnMore?: () => void }> = ({
	onLearnMore
}) => (
	<EmptyState
		icon={
			<svg
				className="h-8 w-8"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
				/>
			</svg>
		}
		title="Insights Coming Soon"
		description="As your financial data grows, we'll provide intelligent insights and recommendations to optimize your property management."
		action={
			onLearnMore
				? {
						label: 'Learn More',
						onClick: onLearnMore,
						variant: 'outline'
					}
				: undefined
		}
	/>
)

export const ReportsEmptyState: React.FC<{ onGenerateReport?: () => void }> = ({
	onGenerateReport
}) => (
	<EmptyState
		icon={
			<svg
				className="h-8 w-8"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={1.5}
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				/>
			</svg>
		}
		title="No Reports Generated"
		description="Create comprehensive financial reports to track performance, prepare for tax season, and analyze trends over time."
		action={
			onGenerateReport
				? {
						label: 'Generate Report',
						onClick: onGenerateReport
					}
				: undefined
		}
	/>
)

export default EmptyState
