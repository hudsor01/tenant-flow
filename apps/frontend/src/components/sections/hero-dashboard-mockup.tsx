'use client'

import { cn } from '#lib/utils'
import {
	Building,
	CreditCard,
	TrendingUp,
	Users,
	Wrench,
	Bell,
	ChevronRight,
	ArrowUpRight,
	ArrowDownRight
} from 'lucide-react'

/**
 * Animated dashboard mockup for hero section
 * Replaces static Unsplash image with interactive, branded content
 */
export function HeroDashboardMockup({ className }: { className?: string }) {
	return (
		<div className={cn('relative', className)}>
			{/* Main dashboard container */}
			<div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border bg-card">
				{/* Mock browser chrome */}
				<div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
					<div className="flex gap-1.5">
						<div className="size-3 rounded-full bg-destructive/60" />
						<div className="size-3 rounded-full bg-warning/60" />
						<div className="size-3 rounded-full bg-success/60" />
					</div>
					<div className="flex-1 flex justify-center">
						<div className="px-4 py-1 rounded-md bg-background/50 text-xs text-muted-foreground font-mono">
							app.tenantflow.com/dashboard
						</div>
					</div>
					<div className="w-12" />
				</div>

				{/* Dashboard content */}
				<div className="p-4 space-y-4 bg-gradient-to-b from-background to-muted/20">
					{/* Header row */}
					<div className="flex-between">
						<div>
							<h3 className="text-sm font-semibold text-foreground">Dashboard</h3>
							<p className="text-xs text-muted-foreground">Welcome back, Sarah</p>
						</div>
						<div className="flex items-center gap-2">
							<div className="relative">
								<Bell className="size-4 text-muted-foreground" />
								<div className="absolute -top-1 -right-1 size-2 bg-primary rounded-full animate-pulse" />
							</div>
							<div className="size-8 rounded-full bg-primary/10 flex-center text-primary text-xs font-medium">
								SC
							</div>
						</div>
					</div>

					{/* Stats row */}
					<div className="grid grid-cols-4 gap-3">
						<StatCard
							label="Properties"
							value="12"
							trend="+2"
							trendUp
							icon={<Building className="size-3.5" />}
						/>
						<StatCard
							label="Tenants"
							value="48"
							trend="+5"
							trendUp
							icon={<Users className="size-3.5" />}
						/>
						<StatCard
							label="Revenue"
							value="$52K"
							trend="+12%"
							trendUp
							icon={<CreditCard className="size-3.5" />}
						/>
						<StatCard
							label="Occupancy"
							value="96%"
							trend="-2%"
							trendUp={false}
							icon={<TrendingUp className="size-3.5" />}
						/>
					</div>

					{/* Two column layout */}
					<div className="grid grid-cols-5 gap-3">
						{/* Revenue chart */}
						<div className="col-span-3 card-standard p-3">
							<div className="flex-between mb-3">
								<span className="text-xs font-medium text-foreground">Monthly Revenue</span>
								<span className="text-xs text-success flex items-center gap-1">
									<ArrowUpRight className="size-3" />
									+18.2%
								</span>
							</div>
							<div className="flex items-end gap-1 h-20">
								{[35, 45, 40, 55, 50, 65, 60, 75, 70, 82, 78, 92].map((height, i) => (
									<div
										key={i}
										className={cn(
											'rounded-sm flex-1 transition-all duration-500',
											i === 11 ? 'bg-primary' : 'bg-primary/40'
										)}
										style={{
											height: `${height}%`,
											animationDelay: `${i * 50}ms`
										}}
									/>
								))}
							</div>
							<div className="flex justify-between mt-2 text-xs text-muted-foreground">
								<span>Jan</span>
								<span>Dec</span>
							</div>
						</div>

						{/* Quick actions */}
						<div className="col-span-2 space-y-2">
							<QuickAction
								icon={<CreditCard className="size-3.5" />}
								label="Collect Rent"
								badge="3 pending"
								badgeColor="warning"
							/>
							<QuickAction
								icon={<Wrench className="size-3.5" />}
								label="Maintenance"
								badge="2 open"
								badgeColor="info"
							/>
							<QuickAction
								icon={<Users className="size-3.5" />}
								label="New Tenant"
							/>
						</div>
					</div>

					{/* Recent activity */}
					<div className="card-standard p-3">
						<div className="flex-between mb-3">
							<span className="text-xs font-medium text-foreground">Recent Activity</span>
							<button type="button" className="text-xs text-primary hover:underline flex items-center">
								View all <ChevronRight className="size-3" />
							</button>
						</div>
						<div className="space-y-2">
							<ActivityItem
								avatar="JM"
								name="John Miller"
								action="paid rent"
								amount="$1,850"
								time="2m ago"
								status="success"
							/>
							<ActivityItem
								avatar="EW"
								name="Emma Wilson"
								action="submitted request"
								amount="HVAC"
								time="15m ago"
								status="warning"
							/>
							<ActivityItem
								avatar="DP"
								name="David Park"
								action="lease renewed"
								amount="12 mo"
								time="1h ago"
								status="info"
							/>
						</div>
					</div>
				</div>
			</div>

			{/* Decorative elements */}
			<div className="absolute -top-4 -right-4 size-24 bg-primary/20 rounded-full blur-3xl" />
			<div className="absolute -bottom-4 -left-4 size-32 bg-primary/10 rounded-full blur-3xl" />
		</div>
	)
}

function StatCard({
	label,
	value,
	trend,
	trendUp,
	icon
}: {
	label: string
	value: string
	trend: string
	trendUp: boolean
	icon: React.ReactNode
}) {
	return (
		<div className="card-standard p-2.5 hover:border-primary/20 transition-colors">
			<div className="flex-between mb-1.5">
				<div className="icon-container-sm bg-primary/10 text-primary">
					{icon}
				</div>
				<span className={cn(
					'text-xs flex items-center gap-0.5',
					trendUp ? 'text-success' : 'text-destructive'
				)}>
					{trendUp ? <ArrowUpRight className="size-2.5" /> : <ArrowDownRight className="size-2.5" />}
					{trend}
				</span>
			</div>
			<div className="text-lg font-bold text-foreground">{value}</div>
			<div className="text-xs text-muted-foreground">{label}</div>
		</div>
	)
}

function QuickAction({
	icon,
	label,
	badge,
	badgeColor
}: {
	icon: React.ReactNode
	label: string
	badge?: string
	badgeColor?: 'warning' | 'info' | 'success'
}) {
	const badgeColors = {
		warning: 'bg-warning/10 text-warning',
		info: 'bg-info/10 text-info',
		success: 'bg-success/10 text-success'
	}

	return (
		<button
			type="button"
			className="w-full card-standard p-2.5 flex-between hover:border-primary/20 hover:bg-primary/5 transition-all group"
		>
			<div className="flex items-center gap-2">
				<div className="icon-container-sm bg-primary/10 text-primary group-hover:scale-105 transition-transform">
					{icon}
				</div>
				<span className="text-xs font-medium text-foreground">{label}</span>
			</div>
			{badge ? (
				<span className={cn('text-xs px-2 py-0.5 rounded-full', badgeColors[badgeColor || 'info'])}>
					{badge}
				</span>
			) : (
				<ChevronRight className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
			)}
		</button>
	)
}

function ActivityItem({
	avatar,
	name,
	action,
	amount,
	time,
	status
}: {
	avatar: string
	name: string
	action: string
	amount: string
	time: string
	status: 'success' | 'warning' | 'info'
}) {
	const statusColors = {
		success: 'bg-success/10 text-success',
		warning: 'bg-warning/10 text-warning',
		info: 'bg-info/10 text-info'
	}

	return (
		<div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
			<div className="size-7 rounded-full bg-primary/10 flex-center text-primary text-xs font-medium">
				{avatar}
			</div>
			<div className="flex-1 min-w-0">
				<div className="text-xs text-foreground">
					<span className="font-medium">{name}</span>
					<span className="text-muted-foreground"> {action}</span>
				</div>
			</div>
			<span className={cn('text-xs px-2 py-0.5 rounded-full', statusColors[status])}>
				{amount}
			</span>
			<span className="text-xs text-muted-foreground">{time}</span>
		</div>
	)
}
