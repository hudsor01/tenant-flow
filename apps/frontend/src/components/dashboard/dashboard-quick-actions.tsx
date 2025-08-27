'use client'

import { useTransition } from 'react'
import { logger } from '@/lib/logger/logger'
import { motion } from '@/lib/lazy-motion'
import { cardVariants } from './dashboard-animations'

interface QuickActionProps {
	title: string
	description: string
	icon: React.ComponentType<{ className?: string }>
	onClick: () => void
	color: 'navy' | 'steel' | 'emerald' | 'gold'
}

function QuickAction({
	title,
	description,
	icon: Icon,
	onClick,
	color
}: QuickActionProps) {
	const [isPending, startTransition] = useTransition()

	const colorClasses = {
		navy: 'hover:bg-[#1e3a5f]/20 border-[#4a7ba3]/30 text-[#60a5fa]',
		steel: 'hover:bg-[#475569]/20 border-[#94a3b8]/30 text-[#94a3b8]',
		emerald: 'hover:bg-[#065f46]/20 border-[#10b981]/30 text-[#34d399]',
		gold: 'hover:bg-[#92400e]/20 border-[#f59e0b]/30 text-[#fbbf24]'
	}

	const handleClick = () => {
		startTransition(() => {
			onClick()
		})
	}

	return (
		<motion.button
			onClick={handleClick}
			disabled={isPending}
			whileHover={{ scale: 1.02, y: -2 }}
			whileTap={{ scale: 0.98 }}
			className={`btn-modern card-modern bg-background/80 relative w-full rounded-xl border p-4 backdrop-blur-sm ${colorClasses[color]} var(--transition-normal) group text-left transition-all hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50`}
		>
			<div className="flex items-center space-x-4">
				<div className="bg-primary/10 border-primary/20 group-hover:bg-primary/20 rounded-xl border p-3 transition-all duration-300 group-hover:scale-110">
					<Icon className="text-primary h-5 w-5 transition-colors duration-300" />
				</div>
				<div className="flex-1">
					<h4 className="text-foreground font-semibold transition-colors duration-300">
						{title}
					</h4>
					<p className="text-muted-foreground text-sm transition-colors duration-300">
						{description}
					</p>
				</div>
				<div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-2 opacity-50 transition-all duration-300 group-hover:opacity-100">
					<i className="i-lucide-plus inline-block text-primary h-4 w-4"  />
				</div>
			</div>
		</motion.button>
	)
}

interface QuickActionsPanelProps {
	onAddProperty?: () => void
	onNewTenant?: () => void
	onScheduleMaintenance?: () => void
	onGenerateReport?: () => void
}

const defaultQuickActions = [
	{
		title: 'Add Property',
		description: 'Register a new property to your portfolio',
		icon: 'i-lucide-building-2',
		color: 'navy' as const,
		action: 'onAddProperty' as const
	},
	{
		title: 'New Tenant',
		description: 'Onboard a new tenant to your system',
		icon: 'i-lucide-users',
		color: 'steel' as const,
		action: 'onNewTenant' as const
	},
	{
		title: 'Schedule Maintenance',
		description: 'Create a maintenance request or task',
		icon: 'i-lucide-wrench',
		color: 'emerald' as const,
		action: 'onScheduleMaintenance' as const
	},
	{
		title: 'Generate Report',
		description: 'Create financial or operational reports',
		icon: 'i-lucide-file-text',
		color: 'gold' as const,
		action: 'onGenerateReport' as const
	}
]

export function DashboardQuickActions({
	onAddProperty,
	onNewTenant,
	onScheduleMaintenance,
	onGenerateReport
}: QuickActionsPanelProps) {
	const actionHandlers = {
		onAddProperty:
			onAddProperty ||
			(() =>
				logger.info('Add property clicked', {
					component: 'dashboardquickactions'
				})),
		onNewTenant:
			onNewTenant ||
			(() =>
				logger.info('New tenant clicked', {
					component: 'dashboardquickactions'
				})),
		onScheduleMaintenance:
			onScheduleMaintenance ||
			(() =>
				logger.info('Schedule maintenance clicked', {
					component: 'dashboardquickactions'
				})),
		onGenerateReport:
			onGenerateReport ||
			(() =>
				logger.info('Generate report clicked', {
					component: 'dashboardquickactions'
				}))
	}

	return (
		<motion.div variants={cardVariants} className="lg:col-span-1">
			<div className="card-modern bg-card rounded-xl border p-6 backdrop-blur-sm">
				<h3 className="text-foreground mb-6 flex items-center text-xl font-semibold">
					<div className="bg-primary/10 border-primary/20 mr-3 rounded-xl border p-2">
						<i className="i-lucide-activity inline-block text-primary h-5 w-5"  />
					</div>
					Quick Actions
				</h3>
				<div className="space-y-4">
					{defaultQuickActions.map(action => {
						const IconComponent = () => <i className={`${action.icon} inline-block h-5 w-5`} />
						return (
							<QuickAction
								key={action.title}
								title={action.title}
								description={action.description}
								icon={IconComponent}
								onClick={actionHandlers[action.action]}
								color={action.color}
							/>
						)
					)})}
				</div>
			</div>
		</motion.div>
	)
}
