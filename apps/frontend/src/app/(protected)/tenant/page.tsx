/**
 * Tenant Portal Dashboard
 *
 * Self-service portal for tenants to:
 * - View their lease information
 * - Pay rent
 * - View payment history
 * - Submit maintenance requests
 * - View lease documents
 */

'use client'

import { ErrorFallback } from '#components/error-boundary/error-fallback'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { Skeleton } from '#components/ui/skeleton'
import {
	useCurrentLease,
	useTenantMaintenanceRequests
} from '#hooks/api/use-lease'
import {
	Calendar,
	CreditCard,
	FileText,
	Home,
	Settings,
	Wrench
} from 'lucide-react'
import Link from 'next/link'

export default function TenantDashboardPage() {
	// Modern helpers - assume valid inputs
	const formatDate = (
		date: string | Date,
		options?: Intl.DateTimeFormatOptions
	): string => {
		const dateObj = new Date(date)
		return dateObj.toLocaleDateString('en-US', options)
	}

	const safeStringReplace = (
		str: string,
		search: string,
		replace: string
	): string => {
		return str.replace(search, replace)
	}

	const { data: lease, isLoading } = useCurrentLease()
	const {
		data: maintenanceData,
		isLoading: maintenanceLoading,
		error: maintenanceError
	} = useTenantMaintenanceRequests()

	// Modern currency formatting - assumes valid inputs
	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount)
	}

	// Calculate next payment date (1st of next month)
	const getNextPaymentDate = () => {
		const today = new Date()
		const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
		return nextMonth.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	return (
		<div className="space-y-10">
			{/* Welcome Section */}
			<div className="space-y-3">
				<h1 className="text-4xl font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
					My Tenant Portal
				</h1>
				<p className="text-lg text-muted-foreground max-w-2xl">
					View your lease, make payments, and submit maintenance requests
				</p>
			</div>

			{/* Quick Stats */}
			<div className="grid gap-6 md:grid-cols-3">
				<CardLayout
					title="Current Lease"
					description="Your active lease information"
					className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-linear-to-br from-blue-50/50 to-card dark:from-blue-950/20 dark:to-card border-2 hover:border-blue-200 dark:hover:border-blue-900"
					footer={
						<Link href="/tenant/lease">
							<Button variant="ghost" size="sm" className="w-full">
								View Details
							</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
							<Home className="size-7 text-blue-600 dark:text-blue-400" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Property</p>
							{isLoading || !lease ? (
								<Skeleton className="h-7 w-48" />
							) : (
								<p className="text-xl font-semibold">Active Lease</p>
							)}
						</div>
					</div>
				</CardLayout>

				<CardLayout
					title="Next Payment"
					description="Upcoming rent payment"
					className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-linear-to-br from-green-50/50 to-card dark:from-green-950/20 dark:to-card border-2 hover:border-green-200 dark:hover:border-green-900"
					footer={
						<Link href="/tenant/payments">
							<Button className="w-full">Pay Now</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
							<Calendar className="size-7 text-green-600 dark:text-green-400" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Due Date</p>
							{isLoading || !lease ? (
								<Skeleton className="h-7 w-32" />
							) : (
								<p className="text-xl font-semibold">{getNextPaymentDate()}</p>
							)}
						</div>
					</div>
				</CardLayout>

				<CardLayout
					title="Maintenance"
					description="Active requests"
					className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.02] bg-linear-to-br from-amber-50/50 to-card dark:from-amber-950/20 dark:to-card border-2 hover:border-amber-200 dark:hover:border-amber-900"
					footer={
						<Link href="/tenant/maintenance">
							<Button variant="outline" size="sm" className="w-full">
								View All
							</Button>
						</Link>
					}
				>
					<div className="flex items-center gap-4">
						<div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
							<Wrench className="size-7 text-amber-600 dark:text-amber-400" />
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Open Requests</p>
							{isLoading || maintenanceLoading ? (
								<Skeleton className="h-7 w-12" />
							) : maintenanceError ? (
								<p className="text-xl font-semibold text-destructive">!</p>
							) : (
								<p className="text-xl font-semibold">
									{maintenanceData?.open || 0}
								</p>
							)}
						</div>
					</div>
				</CardLayout>
			</div>

			{/* Quick Actions */}
			<CardLayout
				title="Quick Actions"
				description="Common tasks and shortcuts"
				className="border-2"
			>
				<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
					<Link href="/tenant/payments" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<CreditCard className="size-6 text-primary" />
							</div>
							<span className="font-medium">Pay Rent</span>
						</Button>
					</Link>

					<Link href="/tenant/maintenance/new" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<Wrench className="size-6 text-primary" />
							</div>
							<span className="font-medium">Submit Request</span>
						</Button>
					</Link>

					<Link href="/tenant/documents" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<FileText className="size-6 text-primary" />
							</div>
							<span className="font-medium">View Documents</span>
						</Button>
					</Link>

					<Link href="/tenant/profile" className="group">
						<Button
							variant="outline"
							className="w-full h-auto flex-col gap-3 py-8 border-2 hover:border-primary/40 hover:bg-accent/50 transition-all duration-300 hover:scale-105 hover:shadow-md"
						>
							<div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
								<Settings className="size-6 text-primary" />
							</div>
							<span className="font-medium">My Profile</span>
						</Button>
					</Link>
				</div>
			</CardLayout>

			{/* Recent Activity */}
			<div className="grid gap-6 lg:grid-cols-2">
				<CardLayout
					title="Recent Payments"
					description="Your last 5 rent payments"
					className="border-2"
					footer={
						<Link href="/tenant/payments/history">
							<Button variant="ghost" size="sm">
								View All Payments
							</Button>
						</Link>
					}
				>
					<div className="space-y-4">
						{lease ? (
							<div className="flex items-center justify-between py-3 border-b border-border/50">
								<div>
									<p className="font-medium">Monthly Rent</p>
									<p className="text-sm text-muted-foreground">
										Due: 1st of each month
									</p>
								</div>
								<div className="text-right">
									<p className="font-semibold">
										{formatCurrency(lease.rentAmount)}
									</p>
									<p className="text-xs text-muted-foreground">
										{lease.status === 'ACTIVE' ? 'Active' : lease.status}
									</p>
								</div>
							</div>
						) : (
							<div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
								<p className="text-sm text-muted-foreground">
									No active lease found
								</p>
							</div>
						)}
					</div>
				</CardLayout>

				<CardLayout
					title="Maintenance Requests"
					description="Your recent requests"
					className="border-2"
					footer={
						<Link href="/tenant/maintenance">
							<Button variant="ghost" size="sm">
								View All Requests
							</Button>
						</Link>
					}
				>
					<div className="space-y-4">
						{maintenanceLoading ? (
							<div className="space-y-3">
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-16 w-full" />
							</div>
						) : maintenanceError ? (
							<ErrorFallback
								error={maintenanceError as Error}
								title="Failed to load maintenance requests"
								description="Unable to load your maintenance requests. Please try again."
								onRetry={() => window.location.reload()}
							/>
						) : maintenanceData?.requests &&
						  maintenanceData.requests.length > 0 ? (
							maintenanceData.requests.slice(0, 3).map(request => (
								<div
									key={request.id}
									className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
								>
									<div>
										<p className="font-medium">{request.title}</p>
										<p className="text-sm text-muted-foreground">
											{formatDate(request.createdAt, {
												month: 'short',
												day: 'numeric',
												year: 'numeric'
											})}
										</p>
									</div>
									<div className="text-right">
										<p
											className={`text-xs font-semibold ${
												request.status === 'COMPLETED'
													? 'text-green-600'
													: request.status === 'IN_PROGRESS'
														? 'text-blue-600'
														: request.status === 'CANCELED'
															? 'text-gray-600'
															: 'text-amber-600'
											}`}
										>
											{safeStringReplace(request.status, '_', ' ')}
										</p>
										<p
											className={`text-xs ${
												request.priority === 'URGENT'
													? 'text-red-600'
													: request.priority === 'HIGH'
														? 'text-orange-600'
														: 'text-muted-foreground'
											}`}
										>
											{request.priority}
										</p>
									</div>
								</div>
							))
						) : (
							<div className="text-center py-8 bg-muted/30 rounded-lg border-2 border-dashed border-border/50">
								<p className="text-sm text-muted-foreground">
									No maintenance requests yet
								</p>
							</div>
						)}
					</div>
				</CardLayout>
			</div>
		</div>
	)
}
