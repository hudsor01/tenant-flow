import { motion, AnimatePresence } from '@/lib/lazy-motion'
import { cardVariants, activityItemVariants } from './dashboard-animations'
import type { ActivityItem, ActivityType } from '@repo/shared'

// Helper type for activities with required type field
type ActivityItemWithType = ActivityItem & {
	type: ActivityType
}

interface DashboardActivityFeedProps {
	activities?: ActivityItemWithType[]
	isLoading?: boolean
}

function ActivityIcon({ type }: { type: string }) {
	switch (type) {
		case 'maintenance_request':
		case 'maintenance':
			return <i className="i-lucide-wrench inline-block h-4 w-4"  />
		case 'tenant_added':
		case 'tenant':
			return <i className="i-lucide-users inline-block h-4 w-4"  />
		case 'lease_created':
		case 'lease':
			return <i className="i-lucide-file-text inline-block h-4 w-4"  />
		case 'payment_received':
			return <i className="i-lucide-checkcircle inline-block h-4 w-4"  />
		default:
			return <i className="i-lucide-calendar inline-block h-4 w-4"  />
	}
}

// Removed - no longer used with new activity structure

function getActivityColorClasses(type: string) {
	switch (type) {
		case 'maintenance_request':
		case 'maintenance':
			return 'bg-emerald-500/20 text-emerald-400'
		case 'tenant_added':
		case 'tenant':
			return 'bg-primary/20 text-blue-400'
		case 'lease_created':
		case 'lease':
			return 'bg-purple-500/20 text-purple-400'
		case 'payment_received':
			return 'bg-green-500/20 text-green-400'
		default:
			return 'bg-gray-500/20 text-gray-400'
	}
}

// Removed - no longer used with new activity structure

export function DashboardActivityFeed({
	activities,
	isLoading
}: DashboardActivityFeedProps) {
	if (isLoading) {
		return (
			<motion.div variants={cardVariants} className="lg:col-span-2">
				<div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
					<h3 className="mb-6 flex items-center text-xl font-semibold text-white">
						<i className="i-lucide-clock inline-block mr-2 h-5 w-5 text-[#60a5fa]"  />
						Recent Activity
					</h3>
					<div className="space-y-4">
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="animate-pulse">
								<div className="flex items-center space-x-4 rounded-lg bg-white/5 p-4">
									<div className="h-10 w-10 rounded-lg bg-white/10" />
									<div className="flex-1 space-y-2">
										<div className="h-4 w-3/4 rounded bg-white/10" />
										<div className="h-3 w-1/2 rounded bg-white/10" />
									</div>
									<div className="h-3 w-16 rounded bg-white/10" />
								</div>
							</div>
						))}
					</div>
				</div>
			</motion.div>
		)
	}

	return (
		<motion.div variants={cardVariants} className="lg:col-span-2">
			<div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
				<h3 className="mb-6 flex items-center text-xl font-semibold text-white">
					<i className="i-lucide-clock inline-block mr-2 h-5 w-5 text-[#60a5fa]"  />
					Recent Activity
				</h3>

				<div className="space-y-4">
					<AnimatePresence>
						{Array.isArray(activities) &&
							activities.map((activity, index) => (
								<motion.div
									key={String(activity.id)}
									custom={index}
									variants={activityItemVariants}
									initial="hidden"
									animate="visible"
									exit="exit"
									className="flex items-center space-x-4 rounded-lg border border-white/10 bg-white/5 p-4"
								>
									<div
										className={`rounded-lg p-2 ${getActivityColorClasses(activity.type)}`}
									>
										<ActivityIcon type={activity.type} />
									</div>
									<div className="flex-1">
										<p className="font-medium text-white">
											{activity.description}
										</p>
										<p className="text-sm text-white/60">
											Activity type:{' '}
											{activity.type.replace('_', ' ')}
										</p>
									</div>
									<div className="text-right">
										<p className="text-xs text-white/40">
											{activity.timestamp
												? new Date(activity.timestamp).toLocaleString()
												: 'No date'}
										</p>
									</div>
								</motion.div>
							))}
					</AnimatePresence>

					{!Array.isArray(activities) || activities.length === 0 ? (
						<div className="py-8 text-center">
							<i className="i-lucide-activity inline-block mx-auto mb-4 h-12 w-12 text-white/20"  />
							<p className="text-white/60">No recent activity</p>
							<p className="text-sm text-white/40">
								Activity will appear here as you manage your
								properties
							</p>
						</div>
					) : null}
				</div>
			</div>
		</motion.div>
	)
}
