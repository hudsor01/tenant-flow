import { motion } from '@/lib/lazy-motion'
import { cardVariants } from './dashboard-animations'
import type { DashboardStats } from '@repo/shared'

interface MetricCardProps {
	title: string
	value: string | number
	subtitle: string
	icon: string
	trend?: { value: number; isPositive: boolean }
	color: 'navy' | 'steel' | 'emerald' | 'gold'
	index: number
}

function MetricCard({
	title,
	value,
	subtitle,
	icon,
	trend,
	color,
	index
}: MetricCardProps) {
	const colorClasses = {
		navy: 'from-[#1e3a5f] to-[#2d5a87] border-[#4a7ba3]/30',
		steel: 'from-[#475569] to-[#64748b] border-[#94a3b8]/30',
		emerald: 'from-[#065f46] to-[#047857] border-[#10b981]/30',
		gold: 'from-[#92400e] to-[#b45309] border-[#f59e0b]/30'
	}

	const iconColors = {
		navy: 'text-[#60a5fa]',
		steel: 'text-[#94a3b8]',
		emerald: 'text-[#34d399]',
		gold: 'text-[#fbbf24]'
	}

	return (
		<motion.div
			custom={index}
			variants={cardVariants}
			initial="hidden"
			animate="visible"
			whileHover="hover"
			className={`relative overflow-hidden rounded-xl border bg-gradient-to-br backdrop-blur-sm ${colorClasses[color]} shadow-lg shadow-black/10 transition-all duration-300 hover:shadow-xl hover:shadow-black/20`}
		>
			{/* Subtle geometric pattern overlay */}
			<div className="absolute inset-0 opacity-5">
				<div className="absolute right-0 top-0 h-32 w-32 -translate-y-16 translate-x-16 rounded-full bg-white/10" />
				<div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-12 translate-y-12 rounded-full bg-white/5" />
			</div>

			<div className="relative p-6">
				<div className="mb-4 flex items-start justify-between">
					<div
						className={`rounded-lg bg-white/10 p-3 ${iconColors[color]}`}
					>
						<i className={`${icon} h-6 w-6`} />
					</div>
					{trend && (
						<div
							className={`flex items-center text-sm font-medium ${
								trend.isPositive
									? 'text-emerald-400'
									: 'text-red-400'
							}`}
						>
							<i className={`i-lucide-trending-up mr-1 h-4 w-4 ${!trend.isPositive ? 'rotate-180' : ''}`} />
							{trend.value}%
						</div>
					)}
				</div>

				<div className="space-y-1">
					<h3 className="text-sm font-medium uppercase tracking-wide text-white/70">
						{title}
					</h3>
					<p className="text-3xl font-bold text-white">{value}</p>
					<p className="text-sm text-white/60">{subtitle}</p>
				</div>
			</div>
		</motion.div>
	)
}

// Using shared DashboardStats interface from @repo/shared

interface DashboardMetricsProps {
	stats: DashboardStats | null
	isLoading?: boolean
}

export function DashboardMetrics({ stats, isLoading }: DashboardMetricsProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="animate-pulse">
						<div className="h-32 rounded-xl bg-white/10" />
					</div>
				))}
			</div>
		)
	}

	return (
		<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
			<MetricCard
				title="Total Properties"
				value={stats?.totalProperties ?? 0}
				subtitle={`${Math.round(stats?.occupancyRate ?? 0)}% occupancy rate`}
				icon="i-lucide-building-2"
				trend={{ value: 12, isPositive: true }}
				color="navy"
				index={0}
			/>
			<MetricCard
				title="Active Tenants"
				value={stats?.totalTenants ?? 0}
				subtitle={`${stats?.totalUnits ?? 0} total units`}
				icon="i-lucide-users"
				trend={{ value: 8, isPositive: true }}
				color="steel"
				index={1}
			/>
			<MetricCard
				title="Maintenance Requests"
				value={stats?.maintenanceRequests ?? 0}
				subtitle="Active requests"
				icon="i-lucide-wrench"
				trend={{ value: 5, isPositive: false }}
				color="emerald"
				index={2}
			/>
			<MetricCard
				title="Monthly Revenue"
				value={`$${(stats?.totalRevenue ?? 0).toLocaleString()}`}
				subtitle="Total revenue"
				icon="i-lucide-dollar-sign"
				trend={{
					value: 5,
					isPositive: true
				}}
				color="gold"
				index={3}
			/>
		</div>
	)
}
