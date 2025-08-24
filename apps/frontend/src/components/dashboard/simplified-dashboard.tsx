'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { 
	Building2, 
	Users, 
	FileText, 
	Wrench, 
	AlertTriangle,
	Clock,
	CheckCircle,
	Plus,
	ArrowRight
} from 'lucide-react'
import { useDashboardOverview, useDashboardActivity } from '@/hooks/api/use-dashboard'
import { useProperties } from '@/hooks/api/use-properties'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ActivityItem {
	type?: string
	title?: string
	time?: string
}

// PropertyOverview interface removed - using Property type directly

/**
 * Simplified Dashboard Component
 * Single source of truth for all dashboard data
 * No duplication, just the essentials
 */
export function SimplifiedDashboard() {
	const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardOverview()
	const { data: activity, isLoading: activityLoading } = useDashboardActivity()
	const { data: properties } = useProperties({ limit: 5 })

	if (statsError) {
		return (
			<Alert variant="destructive">
				<AlertTriangle className="h-4 w-4" />
				<AlertDescription>
					Failed to load dashboard. Please refresh the page.
				</AlertDescription>
			</Alert>
		)
	}

	// Key metrics at the top
	const metrics = [
		{
			title: 'Properties',
			value: stats?.properties.totalProperties ?? 0,
			subtitle: `${stats?.properties.occupancyRate ?? 0}% occupied`,
			icon: Building2,
			trend: (stats?.properties?.occupancyRate ?? 0) >= 90 ? 'up' : 'down',
			link: '/properties'
		},
		{
			title: 'Tenants',
			value: stats?.tenants.totalTenants ?? 0,
			subtitle: 'Active tenants',
			icon: Users,
			link: '/tenants'
		},
		{
			title: 'Active Leases',
			value: stats?.leases.totalLeases ?? 0,
			subtitle: `${stats?.leases.activeLeases ?? 0} active`,
			icon: FileText,
			trend: (stats?.leases.expiredLeases ?? 0) > 0 ? 'warning' : null,
			link: '/leases'
		},
		{
			title: 'Maintenance',
			value: stats?.maintenanceRequests.open ?? 0,
			subtitle: `${stats?.maintenanceRequests.inProgress ?? 0} in progress`,
			icon: Wrench,
			trend: (stats?.maintenanceRequests.open ?? 0) > 0 ? 'urgent' : null,
			link: '/maintenance'
		}
	]

	return (
		<div className="space-y-6">
			{/* Metrics Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{statsLoading ? (
					// Loading skeletons
					Array.from({ length: 4 }).map((_, i) => (
						<Card key={i}>
							<CardHeader className="pb-2">
								<Skeleton className="h-4 w-20" />
							</CardHeader>
							<CardContent>
								<Skeleton className="h-8 w-16 mb-1" />
								<Skeleton className="h-3 w-24" />
							</CardContent>
						</Card>
					))
				) : (
					metrics.map((metric) => {
						const Icon = metric.icon
						return (
							<Link key={metric.title} href={metric.link}>
								<Card className="hover:shadow-md transition-shadow cursor-pointer">
									<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
										<CardTitle className="text-sm font-medium">
											{metric.title}
										</CardTitle>
										<Icon className={cn(
											"h-4 w-4",
											metric.trend === 'up' && "text-green-600",
											metric.trend === 'down' && "text-red-600",
											metric.trend === 'warning' && "text-orange-600",
											metric.trend === 'urgent' && "text-red-600",
											!metric.trend && "text-muted-foreground"
										)} />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">{metric.value}</div>
										<p className="text-xs text-muted-foreground">
											{metric.subtitle}
										</p>
									</CardContent>
								</Card>
							</Link>
						)
					})
				)}
			</div>

			{/* Main Content Grid */}
			<div className="grid gap-6 lg:grid-cols-3">
				{/* Recent Activity - 2 columns */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Recent Activity</CardTitle>
					</CardHeader>
					<CardContent>
						{activityLoading ? (
							<div className="space-y-3">
								{[...Array(5)].map((_, i) => (
									<div key={i} className="flex items-center gap-3">
										<Skeleton className="h-8 w-8 rounded-full" />
										<div className="flex-1">
											<Skeleton className="h-4 w-3/4 mb-1" />
											<Skeleton className="h-3 w-1/2" />
										</div>
									</div>
								))}
							</div>
						) : (activity?.length ?? 0) > 0 ? (
							<div className="space-y-3">
								{activity?.slice(0, 5).map((item: ActivityItem, index: number) => (
									<div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
										<div className={cn(
											"p-2 rounded-full",
											item.type === 'lease_signed' && "bg-green-100 text-green-600",
											item.type === 'payment_received' && "bg-blue-100 text-blue-600",
											item.type === 'maintenance_request' && "bg-orange-100 text-orange-600",
											!item.type && "bg-gray-100 text-gray-600"
										)}>
											{item.type === 'lease_signed' && <CheckCircle className="h-4 w-4" />}
											{item.type === 'maintenance_request' && <Wrench className="h-4 w-4" />}
											{!item.type && <Clock className="h-4 w-4" />}
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium truncate">
												{item.title || 'Activity'}
											</p>
											<p className="text-xs text-muted-foreground">
												{item.time || 'Recently'}
											</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-muted-foreground">No recent activity</p>
						)}
					</CardContent>
				</Card>

				{/* Quick Actions - 1 column */}
				<Card>
					<CardHeader>
						<CardTitle>Quick Actions</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						<Link href="/properties/new" className="w-full">
							<Button variant="outline" className="w-full justify-start">
								<Plus className="mr-2 h-4 w-4" />
								Add Property
							</Button>
						</Link>
						<Link href="/tenants/new" className="w-full">
							<Button variant="outline" className="w-full justify-start">
								<Plus className="mr-2 h-4 w-4" />
								Add Tenant
							</Button>
						</Link>
						<Link href="/leases/new" className="w-full">
							<Button variant="outline" className="w-full justify-start">
								<Plus className="mr-2 h-4 w-4" />
								Create Lease
							</Button>
						</Link>
						<Link href="/maintenance/new" className="w-full">
							<Button variant="outline" className="w-full justify-start">
								<Plus className="mr-2 h-4 w-4" />
								Request Maintenance
							</Button>
						</Link>
					</CardContent>
				</Card>
			</div>

			{/* Properties Overview */}
			{properties && properties.length > 0 && (
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle>Properties Overview</CardTitle>
						<Link href="/properties">
							<Button variant="ghost" size="sm">
								View all
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</Link>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{properties.slice(0, 5).map((property) => (
								<div key={property.id} className="flex items-center justify-between">
									<div>
										<p className="font-medium">{property.name}</p>
										<p className="text-sm text-muted-foreground">
											{property.address}
										</p>
									</div>
									<div className="text-right">
										<p className="text-sm font-medium">
											{property.units?.filter(u => u.status === 'OCCUPIED').length ?? 0}/{property.units?.length ?? 0} units
										</p>
										<Progress 
											value={((property.units?.filter(u => u.status === 'OCCUPIED').length ?? 0) / (property.units?.length ?? 1)) * 100} 
											className="w-20 h-2"
										/>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}