/**
 * Tenant Maintenance Requests
 *
 * Shows the tenant's maintenance requests:
 * - Active requests
 * - Request history
 * - Status tracking
 */

'use client'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Skeleton } from '#components/ui/skeleton'
import { TenantMaintenanceCard } from '#components/maintenance/tenant-maintenance-card'
import { useQuery } from '@tanstack/react-query'
import { maintenanceQueries } from '#hooks/api/use-maintenance'
import { useMediaQuery } from '#hooks/use-media-query'
import { formatDate } from '#lib/formatters/date'
import { Plus, Wrench } from 'lucide-react'
import Link from 'next/link'

export default function TenantMaintenancePage() {
	const {
		data: maintenanceData,
		isLoading,
		error
	} = useQuery(maintenanceQueries.tenantPortal())
	const isMobile = useMediaQuery('(max-width: 768px)')

	// DB enum values are lowercase: 'open' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
	const getStatusBadgeClass = (status: string) => {
		switch (status) {
			case 'open':
				return 'badge badge-secondary'
			case 'in_progress':
				return 'badge badge-warning'
			case 'completed':
				return 'badge badge-success'
			case 'cancelled':
				return 'badge badge-outline'
			default:
				return 'badge badge-outline'
		}
	}

	const activeRequests =
		maintenanceData?.requests?.filter(
			r => r.status === 'open' || r.status === 'in_progress'
		) || []
	const completedRequests =
		maintenanceData?.requests?.filter(
			r => r.status === 'completed' || r.status === 'cancelled'
		) || []

	return (
		<div className="space-y-8">
			<div className="flex-between">
				<div>
					<h1 className="typography-h1">Maintenance Requests</h1>
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
						<div className="text-center section-spacing-compact bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
							<Wrench className="size-12 text-muted-foreground mx-auto mb-3" />
							<p className="text-muted">No active maintenance requests</p>
							<p className="text-caption mt-1">
								Submit a request if you need help with something
							</p>
						</div>
					)}

					{!isLoading &&
						!error &&
						(isMobile ? (
							activeRequests.map(request => (
								<TenantMaintenanceCard
									key={request.id}
									request={request}
									layout="stacked"
								/>
							))
						) : (
							<div
								data-testid="maintenance-active-table"
								className="overflow-x-auto"
							>
								<div className="min-w-[720px] space-y-1">
									<div className="grid grid-cols-5 gap-4 p-4 text-muted font-medium border-b">
										<div>Description</div>
										<div>Priority</div>
										<div>Status</div>
										<div>Submitted</div>
										<div className="text-right">Unit</div>
									</div>
									{activeRequests.map(request => (
										<div
											key={request.id}
											data-testid="maintenance-row"
											className="grid grid-cols-5 gap-4 p-4 items-center border-b hover:bg-accent/5 transition-colors"
										>
											<div className="space-y-1">
												<p className="font-medium break-words">
													{request.description}
												</p>
											</div>
											<div className="text-sm font-semibold uppercase text-muted-foreground">
												{request.priority}
											</div>
											<div>
												<span className={getStatusBadgeClass(request.status)}>
													{request.status.replace('_', ' ')}
												</span>
											</div>
											<div className="text-sm text-muted-foreground">
												{formatDate(
													request.created_at || new Date().toISOString(),
													{ relative: true }
												)}
											</div>
											<div className="text-right text-sm text-muted-foreground">
												{request.unit_id || '—'}
											</div>
										</div>
									))}
								</div>
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
						<div className="text-center section-spacing-compact bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
							<p className="text-muted">No request history yet</p>
						</div>
					)}

					{!isLoading &&
						!error &&
						(isMobile ? (
							completedRequests.map(request => (
								<TenantMaintenanceCard
									key={request.id}
									request={request}
									layout="stacked"
								/>
							))
						) : (
							<div
								data-testid="maintenance-history-table"
								className="overflow-x-auto"
							>
								<div className="min-w-[720px] space-y-1">
									<div className="grid grid-cols-5 gap-4 p-4 text-muted font-medium border-b">
										<div>Description</div>
										<div>Priority</div>
										<div>Status</div>
										<div>Submitted</div>
										<div className="text-right">Completed</div>
									</div>

									{completedRequests.map(request => (
										<div
											key={request.id}
											data-testid="maintenance-row"
											className="grid grid-cols-5 gap-4 p-4 items-center border-b"
										>
											<div className="space-y-1">
												<p className="font-medium break-words">
													{request.description}
												</p>
											</div>
											<div className="text-sm font-semibold uppercase text-muted-foreground">
												{request.priority}
											</div>
											<div>
												<span className={getStatusBadgeClass(request.status)}>
													{request.status.replace('_', ' ')}
												</span>
											</div>
											<div className="text-sm text-muted-foreground">
												{formatDate(
													request.created_at || new Date().toISOString(),
													{ relative: true }
												)}
											</div>
											<div className="text-right text-sm text-muted-foreground">
												{request.completed_at
													? formatDate(request.completed_at, { relative: true })
													: '—'}
											</div>
										</div>
									))}
								</div>
							</div>
						))}
				</div>
			</CardLayout>
		</div>
	)
}
