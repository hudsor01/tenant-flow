/**
 * Tenant Maintenance Requests
 *
 * Shows the tenant's maintenance requests:
 * - Active requests
 * - Request history
 * - Status tracking
 */

'use client'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Skeleton } from '#components/ui/skeleton'
import { useTenantMaintenanceRequests } from '#hooks/api/use-lease'
import { Calendar, Plus, Wrench } from 'lucide-react'
import Link from 'next/link'

export default function TenantMaintenancePage() {
	const { data: maintenanceData, isLoading, error } = useTenantMaintenanceRequests()

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffTime = Math.abs(now.getTime() - date.getTime())
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

		if (diffDays === 0) return 'Today'
		if (diffDays === 1) return 'Yesterday'
		if (diffDays < 7) return `${diffDays} days ago`
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'OPEN':
				return 'bg-blue-50 text-blue-700 border-blue-200'
			case 'IN_PROGRESS':
				return 'bg-yellow-50 text-yellow-700 border-yellow-200'
			case 'COMPLETED':
				return 'bg-green-50 text-green-700 border-green-200'
			case 'CANCELED':
				return 'bg-gray-50 text-gray-700 border-gray-200'
			default:
				return ''
		}
	}

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case 'URGENT':
				return 'text-red-600'
			case 'HIGH':
				return 'text-orange-600'
			case 'MEDIUM':
				return 'text-yellow-600'
			case 'LOW':
				return 'text-blue-600'
			default:
				return 'text-muted-foreground'
		}
	}

	const formatStatus = (status: string) => {
		return status.replace('_', ' ')
	}

	const activeRequests =
		maintenanceData?.requests?.filter(
			r => r.status === 'OPEN' || r.status === 'IN_PROGRESS'
		) || []
	const completedRequests =
		maintenanceData?.requests?.filter(
			r => r.status === 'COMPLETED' || r.status === 'CANCELED'
		) || []

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">
						Maintenance Requests
					</h1>
					<p className="text-muted-foreground">
						View and manage your maintenance requests
					</p>
				</div>
				<Link href="/tenant/maintenance/new">
					<Button>
						<Plus className="size-4 mr-2" />
						New Request
					</Button>
				</Link>
			</div>

			{/* Active Requests */}
			<CardLayout
				title="Active Requests"
				description="Requests currently being processed"
			>
				<div className="space-y-3">
					{isLoading && (
						<>
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</>
					)}

					{error && (
						<div className="text-center py-8 bg-destructive/5 rounded-lg border border-destructive/20">
							<p className="text-sm text-destructive">
								Failed to load maintenance requests
							</p>
						</div>
					)}

					{!isLoading && !error && activeRequests.length === 0 && (
						<div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
							<Wrench className="size-12 text-muted-foreground mx-auto mb-3" />
							<p className="text-sm text-muted-foreground">
								No active maintenance requests
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Submit a request if you need help with something
							</p>
						</div>
					)}

					{!isLoading &&
						!error &&
						activeRequests.map(request => (
							<div
								key={request.id}
								className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors"
							>
								<div className="flex items-center gap-4 flex-1">
									<Wrench className="size-5 text-primary" />
									<div className="flex-1">
										<div className="flex items-center gap-3">
											<p className="font-medium">{request.title}</p>
											<span
												className={`text-xs font-semibold ${getPriorityColor(request.priority)}`}
											>
												{request.priority}
											</span>
										</div>
										<p className="text-sm text-muted-foreground mt-1">
											{request.description.length > 100
												? `${request.description.substring(0, 100)}...`
												: request.description}
										</p>
										<div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
											<Calendar className="size-3" />
											<span>Submitted {formatDate(request.createdAt)}</span>
										</div>
									</div>
								</div>
								<Badge
									variant="outline"
									className={getStatusBadge(request.status)}
								>
									{formatStatus(request.status)}
								</Badge>
							</div>
						))}
				</div>
			</CardLayout>

			{/* Recent History */}
			<CardLayout
				title="Request History"
				description="Your past maintenance requests"
			>
				<div className="space-y-3">
					{isLoading && (
						<>
							<Skeleton className="h-16 w-full" />
							<Skeleton className="h-16 w-full" />
						</>
					)}

					{!isLoading && !error && completedRequests.length === 0 && (
						<div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
							<p className="text-sm text-muted-foreground">
								No request history yet
							</p>
						</div>
					)}

					{!isLoading &&
						!error &&
						completedRequests.map(request => (
							<div
								key={request.id}
								className="flex items-center justify-between p-4 border rounded-lg"
							>
								<div className="flex items-center gap-4 flex-1">
									<Wrench className="size-5 text-muted-foreground" />
									<div className="flex-1">
										<div className="flex items-center gap-3">
											<p className="font-medium">{request.title}</p>
										</div>
										<div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
											<Calendar className="size-3" />
											<span>Submitted {formatDate(request.createdAt)}</span>
											{request.completedAt && (
												<>
													<span>•</span>
													<span>
														Completed {formatDate(request.completedAt)}
													</span>
												</>
											)}
										</div>
									</div>
								</div>
								<Badge
									variant="outline"
									className={getStatusBadge(request.status)}
								>
									{formatStatus(request.status)}
								</Badge>
							</div>
						))}
				</div>
			</CardLayout>
		</div>
	)
}
